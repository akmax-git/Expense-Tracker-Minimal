import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  ) => Promise<string | null>;
  updatePermission: (
    grantId: string,
    permission: ManagerPermission
  ) => Promise<string | null>;
  revokeAccess: (grantId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const ManagerContext = createContext<ManagerContextValue | null>(null);

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

  const setViewingAs = useCallback(
    (ownerUserId: string | null, ownerEmail: string | null) => {
      setViewingAsId(ownerUserId);
      setViewingAsEmailState(ownerEmail);
    },
    []
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

      // Activate any pending grants for my email
      if (pendingRows && pendingRows.length > 0) {
        await supabase
          .from("manager_access")
          .update({ manager_user_id: user.id, status: "active" })
          .eq("manager_email", email)
          .is("manager_user_id", null);

        // Reload manager grants after activation
        const { data: refreshed } = await supabase
          .from("manager_access")
          .select("*")
          .eq("manager_user_id", user.id)
          .eq("status", "active");

        if (refreshed) setManagerOf(refreshed.map(mapRow));
      } else if (!manErr && managerRows) {
        setManagerOf(managerRows.map(mapRow));
      }
    } catch {
      // manager_access table may not exist yet — silently skip
    } finally {
      setIsLoadingGrants(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMyGrants([]);
      setManagerOf([]);
      setViewingAsId(null);
      setViewingAsEmailState(null);
      return;
    }
    reload();
  }, [user?.id]);

  const grantAccess = useCallback(
    async (
      managerEmail: string,
      permission: ManagerPermission = "read"
    ): Promise<string | null> => {
      if (!user) return "Not signed in";
      const email = managerEmail.trim().toLowerCase();
      if (!email) return "Please enter an email address";
      if (email === (user.email ?? "").trim().toLowerCase()) {
        return "You cannot grant access to yourself";
      }

      const { error } = await supabase.from("manager_access").insert({
        owner_user_id: user.id,
        owner_email: (user.email ?? "").trim().toLowerCase(),
        manager_email: email,
        status: "pending",
        permission,
      });

      if (error) {
        if (error.code === "23505") return "Access already granted to this email";
        // Column may not exist yet if migration not run — retry without permission
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
              return "Access already granted to this email";
            }
            return fallbackErr.message;
          }
          await reload();
          return null;
        }
        return error.message;
      }

      await reload();
      return null;
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

      // If currently viewing this grant, exit manager mode
      const grant = myGrants.find((g) => g.id === grantId);
      if (grant && viewingAs === grant.ownerUserId) {
        setViewingAsId(null);
        setViewingAsEmailState(null);
      }

      await reload();
    },
    [user, myGrants, viewingAs, reload]
  );

  const activeGrant = useMemo(() => {
    if (!viewingAs) return null;
    return managerOf.find((g) => g.ownerUserId === viewingAs) ?? null;
  }, [viewingAs, managerOf]);

  const isManagerMode = viewingAs !== null;
  // Own account always has full control; manager mode respects grant permission
  const canEdit = !isManagerMode || activeGrant?.permission === "edit" || activeGrant?.permission === "full";
  const canManageBudget =
    !isManagerMode || activeGrant?.permission === "full";

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
