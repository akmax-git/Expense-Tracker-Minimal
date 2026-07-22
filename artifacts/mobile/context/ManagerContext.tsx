import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

export interface ManagerGrant {
  id: string;
  ownerUserId: string;
  ownerEmail: string;
  managerEmail: string;
  managerUserId: string | null;
  status: "pending" | "active";
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
  isLoadingGrants: boolean;
  setViewingAs: (ownerUserId: string | null, ownerEmail: string | null) => void;
  grantAccess: (managerEmail: string) => Promise<string | null>;
  revokeAccess: (grantId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const ManagerContext = createContext<ManagerContextValue | null>(null);

function mapRow(r: Record<string, unknown>): ManagerGrant {
  return {
    id: r.id as string,
    ownerUserId: r.owner_user_id as string,
    ownerEmail: r.owner_email as string,
    managerEmail: r.manager_email as string,
    managerUserId: (r.manager_user_id as string | null) ?? null,
    status: r.status as "pending" | "active",
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
      const email = user.email ?? "";
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
    async (managerEmail: string): Promise<string | null> => {
      if (!user) return "Not signed in";
      const email = managerEmail.trim().toLowerCase();
      if (!email) return "Please enter an email address";

      const { error } = await supabase.from("manager_access").insert({
        owner_user_id: user.id,
        owner_email: user.email ?? "",
        manager_email: email,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") return "Access already granted to this email";
        return error.message;
      }

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

  return (
    <ManagerContext.Provider
      value={{
        myGrants,
        managerOf,
        viewingAs,
        viewingAsEmail,
        isLoadingGrants,
        setViewingAs,
        grantAccess,
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
