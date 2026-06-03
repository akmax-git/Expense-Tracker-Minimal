import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string
  ) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return error?.message ?? null;
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      name: string
    ): Promise<string | null> => {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name },
        },
      });
      if (signUpError) return signUpError.message;

      // Auto sign-in immediately (works when email confirmation is disabled in Supabase)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return signInError?.message ?? null;
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    try {
      const redirectTo = Linking.createURL("/auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) return error.message;
      if (!data.url) return "Could not get sign-in URL";

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.replace("#", "?"));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) return setErr.message;
        }
      } else if (result.type === "cancel") {
        return null; // User cancelled — not an error
      }

      return null;
    } catch (err: any) {
      return err?.message ?? "Google sign-in failed";
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
