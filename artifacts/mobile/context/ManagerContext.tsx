import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getAuthRedirectUrl } from "@/lib/authRedirect";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

/** Access level granted to a manager */
export type ManagerPermission = "read" | "edit" | "full";

export const MANAGER_PERMISSIONS: {
  value: ManagerPermission;
  label: string;
  description: string;
}[] = [
  {
    value: "read",
    label: "Read only",
    description: "View expenses, analytics, and bills — cannot change anything",
  },
  {
    value: "edit",
    label: "View & Edit",
    description: "Add, edit, and delete expenses on your behalf",
  },
  {
    value: "full",
    label: "Full access",
    description: "Edit expenses plus change monthly budget",
  },
];

export function permissionLabel(permission: ManagerPermission): string {
  return (
    MANAGER_PERMISSIONS.find((p) => p.value === permission)?.label ?? "Read only"
  );
}

export interface ManagerGrant {
  id: string;
  ownerUserId: string;
  ownerEmail: string;
  managerEmail: string;
  managerUserId: string | null;
  status: "pending" | "active";
  permission: ManagerPermission;
  createdAt: string;
}

export interface GrantAccessResult {
  error: string | null;
  /** True when a magic-link / invite email was queued by Supabase Auth */
  emailSent: boolean;
}

interface ManagerContextValue {
  /** Grants this user (as owner) has given to managers */
  myGrants: ManagerGrant[];
  /** Accounts this user can manage (as manager) */
  managerOf: ManagerGrant[];
  /** The owner user_id being viewed in manager mode; null = own data */
  viewingAs: string | null;
  viewingAsEmail: string | null;
  /** Active grant for the account currently being viewed (manager mode) */
  activeGrant: ManagerGrant | null;
  /** True when viewing someone else's account */
  isManagerMode: boolean;
  /** Can add / edit / delete expenses for the viewed account */
  canEdit: boolean;
  /** Can change monthly budget for the viewed account */
  canManageBudget: boolean;
  isLoadingGrants: boolean;
  setViewingAs: (ownerUserId: string | null, ownerEmail: string | null) => void;
  grantAccess: (
    managerEmail: string,
    permission?: ManagerPermission
  ) => Promise<GrantAccessResult>;
  updatePermission: (
    grantId: string,
    permission: ManagerPermission
  ) => Promise<string | null>;
  revokeAccess: (grantId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const ManagerContext = createContext<ManagerContextValue | null>(null);

function viewingKey(userId: string) {
  return `@exptrack_viewing_as_${userId}`;
}
function exitedKey(userId: string) {
  return `@exptrack_manager_exited_${userId}`;
}

function normalizePermission(value: unknown): ManagerPermission {
  if (value === "edit" || value === "full" || value === "read") return value;
  return "read";
}

function mapRow(r: Record<string, unknown>): ManagerGrant {
  return {
    id: r.id as string,
    ownerUserId: r.owner_user_id as string,
    ownerEmail: r.owner_email as string,
    managerEmail: r.manager_email as string,
    managerUserId: (r.manager_user_id as string | null) ?? null,
    status: r.status as "pending" | "active",
    permission: normalizePermission(r.permission),
    createdAt: r.created_at as string,
  };
}

export function ManagerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [myGrants, setMyGrants] = useState<ManagerGrant[]>([]);
  const [managerOf, setManagerOf] = useState<ManagerGrant[]>([]);
  const [viewingAs, setViewingAsId] = useState<string | null>(null);
  const [viewingAsEmail, setViewingAsEmailState] = useState<string | null>(null);
  const [isLoadingGrants, setIsLoadingGrants] = useState(false);
  const autoOpenedRef = useRef(false);

  const setViewingAs = useCallback(
    (ownerUserId: string | null, ownerEmail: string | null) => {
      setViewingAsId(ownerUserId);
      setViewingAsEmailState(ownerEmail);
      if (!user) return;
      void (async () => {
        try {
          if (ownerUserId) {
            await AsyncStorage.setItem(
              viewingKey(user.id),
              JSON.stringify({ ownerUserId, ownerEmail })
            );
            await AsyncStorage.removeItem(exitedKey(user.id));
          } else {
            await AsyncStorage.removeItem(viewingKey(user.id));
            await AsyncStorage.setItem(exitedKey(user.id), "1");
          }
        } catch {
          /* ignore storage errors */
        }
      })();
    },
    [user]
  );

  const applyAutoView = useCallback(
    async (grants: ManagerGrant[]) => {
      if (!user || grants.length === 0) return;
      if (autoOpenedRef.current) return;

      try {
        const exited = await AsyncStorage.getItem(exitedKey(user.id));
        if (exited === "1") {
          autoOpenedRef.current = true;
          return;
        }

        const raw = await AsyncStorage.getItem(viewingKey(user.id));
        if (raw) {
          const saved = JSON.parse(raw) as {
            ownerUserId?: string;
            ownerEmail?: string | null;
          };
          const match = grants.find((g) => g.ownerUserId === saved.ownerUserId);
          if (match) {
            setViewingAsId(match.ownerUserId);
            setViewingAsEmailState(match.ownerEmail);
            autoOpenedRef.current = true;
            return;
          }
        }
      } catch {
        /* fall through to first grant */
      }

      // Default: open the first shared account so managers see expenses immediately
      const first = grants[0];
      setViewingAsId(first.ownerUserId);
      setViewingAsEmailState(first.ownerEmail);
      try {
        await AsyncStorage.setItem(
          viewingKey(user.id),
          JSON.stringify({
            ownerUserId: first.ownerUserId,
            ownerEmail: first.ownerEmail,
          })
        );
      } catch {
        /* ignore */
      }
      autoOpenedRef.current = true;
    },
    [user]
  );

  const reload = useCallback(async () => {
    if (!user) return;
    setIsLoadingGrants(true);
    try {
      // Load grants where I'm the owner
      const { data: ownerRows, error: ownerErr } = await supabase
        .from("manager_access")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!ownerErr && ownerRows) {
        setMyGrants(ownerRows.map(mapRow));
      }

      // Load active grants where I'm the manager
      const { data: managerRows, error: manErr } = await supabase
        .from("manager_access")
        .select("*")
        .eq("manager_user_id", user.id)
        .eq("status", "active");

      // Also look for pending grants matching my email (not yet linked to my user_id)
      const email = (user.email ?? "").trim().toLowerCase();
      const { data: pendingRows } = await supabase
        .from("manager_access")
        .select("*")
        .eq("manager_email", email)
        .is("manager_user_id", null);

      let grants: ManagerGrant[] = [];

      // Activate any pending grants for my email
      if (pendingRows && pendingRows.length > 0) {
        await supabase
          .from("manager_access")
          .update({ manager_user_id: user.id, status: "active" })
          .eq("manager_email", email)
          .is("manager_user_id", null);

        const { data: refreshed } = await supabase
          .from("manager_access")
          .select("*")
          .eq("manager_user_id", user.id)
          .eq("status", "active");

        grants = (refreshed ?? []).map(mapRow);
        setManagerOf(grants);
      } else if (!manErr && managerRows) {
        grants = managerRows.map(mapRow);
        setManagerOf(grants);
      }

      await applyAutoView(grants);
    } catch {
      // manager_access table may not exist yet — silently skip
    } finally {
      setIsLoadingGrants(false);
    }
  }, [user, applyAutoView]);

  useEffect(() => {
    if (!user) {
      setMyGrants([]);
      setManagerOf([]);
      setViewingAsId(null);
      setViewingAsEmailState(null);
      autoOpenedRef.current = false;
      return;
    }
    autoOpenedRef.current = false;
    reload();
  }, [user?.id]);

  const grantAccess = useCallback(
    async (
      managerEmail: string,
      permission: ManagerPermission = "read"
    ): Promise<GrantAccessResult> => {
      if (!user) return { error: "Not signed in", emailSent: false };
      const email = managerEmail.trim().toLowerCase();
      if (!email) return { error: "Please enter an email address", emailSent: false };
      if (email === (user.email ?? "").trim().toLowerCase()) {
        return { error: "You cannot grant access to yourself", emailSent: false };
      }

      const { error } = await supabase.from("manager_access").insert({
        owner_user_id: user.id,
        owner_email: (user.email ?? "").trim().toLowerCase(),
        manager_email: email,
        status: "pending",
        permission,
      });

      if (error) {
        if (error.code === "23505") {
          return { error: "Access already granted to this email", emailSent: false };
        }
        if (error.message?.toLowerCase().includes("permission")) {
          const { error: fallbackErr } = await supabase
            .from("manager_access")
            .insert({
              owner_user_id: user.id,
              owner_email: (user.email ?? "").trim().toLowerCase(),
              manager_email: email,
              status: "pending",
            });
          if (fallbackErr) {
            if (fallbackErr.code === "23505") {
              return {
                error: "Access already granted to this email",
                emailSent: false,
              };
            }
            return { error: fallbackErr.message, emailSent: false };
          }
        } else {
          return { error: error.message, emailSent: false };
        }
      }

      // Send magic-link invite via Supabase Auth email (no separate mailer needed)
      let emailSent = false;
      try {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: getAuthRedirectUrl("/"),
          },
        });
        emailSent = !otpErr;
      } catch {
        emailSent = false;
      }

      await reload();
      return { error: null, emailSent };
    },
    [user, reload]
  );

  const updatePermission = useCallback(
    async (
      grantId: string,
      permission: ManagerPermission
    ): Promise<string | null> => {
      if (!user) return "Not signed in";
      const { error } = await supabase
        .from("manager_access")
        .update({ permission })
        .eq("id", grantId)
        .eq("owner_user_id", user.id);

      if (error) return error.message;
      await reload();
      return null;
    },
    [user, reload]
  );

  const revokeAccess = useCallback(
    async (grantId: string) => {
      if (!user) return;
      await supabase
        .from("manager_access")
        .delete()
        .eq("id", grantId)
        .eq("owner_user_id", user.id);

      const grant = myGrants.find((g) => g.id === grantId);
      if (grant && viewingAs === grant.ownerUserId) {
        setViewingAs(null, null);
      }

      await reload();
    },
    [user, myGrants, viewingAs, reload, setViewingAs]
  );

  const activeGrant = useMemo(() => {
    if (!viewingAs) return null;
    return managerOf.find((g) => g.ownerUserId === viewingAs) ?? null;
  }, [viewingAs, managerOf]);

  const isManagerMode = viewingAs !== null;
  const canEdit =
    !isManagerMode ||
    activeGrant?.permission === "edit" ||
    activeGrant?.permission === "full";
  const canManageBudget = !isManagerMode || activeGrant?.permission === "full";

  return (
    <ManagerContext.Provider
      value={{
        myGrants,
        managerOf,
        viewingAs,
        viewingAsEmail,
        activeGrant,
        isManagerMode,
        canEdit,
        canManageBudget,
        isLoadingGrants,
        setViewingAs,
        grantAccess,
        updatePermission,
        revokeAccess,
        reload,
      }}
    >
      {children}
    </ManagerContext.Provider>
  );
}

export function useManager() {
  const ctx = useContext(ManagerContext);
  if (!ctx) throw new Error("useManager must be used within ManagerProvider");
  return ctx;
}
