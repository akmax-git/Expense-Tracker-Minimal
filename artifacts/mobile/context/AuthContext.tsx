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
import { Platform } from "react-native";

import {
  clearAuthParamsFromUrl,
  getAuthRedirectUrl,
  getCurrentWebUrl,
  parseAuthCallbackUrl,
  urlHasAuthParams,
  urlIsPasswordRecovery,
} from "@/lib/authRedirect";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string
  ) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<string | null>;
  updatePassword: (newPassword: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function initialRecoveryFromUrl(): boolean {
  const webUrl = getCurrentWebUrl();
  if (urlIsPasswordRecovery(webUrl)) return true;
  if (webUrl?.includes("reset-password") && urlHasAuthParams(webUrl)) return true;
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Set synchronously so root nav does not bounce to login before tokens apply
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    initialRecoveryFromUrl
  );

  const createSessionFromUrl = useCallback(async (url: string) => {
    if (!urlHasAuthParams(url)) return null;

    const isRecovery = urlIsPasswordRecovery(url);
    if (isRecovery) setIsPasswordRecovery(true);

    const { accessToken, refreshToken, type, code } = parseAuthCallbackUrl(url);

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return error.message;
      if (isRecovery || type === "recovery" || url.includes("reset-password")) {
        setIsPasswordRecovery(true);
      }
      clearAuthParamsFromUrl();
      return null;
    }

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return error.message;
      // setSession often emits SIGNED_IN, not PASSWORD_RECOVERY
      if (isRecovery || type === "recovery") {
        setIsPasswordRecovery(true);
      }
      clearAuthParamsFromUrl();
      return null;
    }

    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        // 1) Consume recovery / OAuth tokens BEFORE unlocking navigation
        const webUrl = getCurrentWebUrl();
        if (webUrl && urlHasAuthParams(webUrl)) {
          await createSessionFromUrl(webUrl);
        } else {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl && urlHasAuthParams(initialUrl)) {
            if (urlIsPasswordRecovery(initialUrl)) {
              setIsPasswordRecovery(true);
            }
            await createSessionFromUrl(initialUrl);
          }
        }

        if (cancelled) return;

        const { data: { session: next } } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(next);
        setUser(next?.user ?? null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        } else if (event === "USER_UPDATED" || event === "SIGNED_OUT") {
          setIsPasswordRecovery(false);
        }
      }
    );

    const linkSub = Linking.addEventListener("url", ({ url }) => {
      if (urlIsPasswordRecovery(url)) setIsPasswordRecovery(true);
      void createSessionFromUrl(url);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, [createSessionFromUrl]);

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
      const redirectTo = getAuthRedirectUrl("/auth/callback");

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
        const err = await createSessionFromUrl(result.url);
        if (err) return err;
      } else if (result.type === "cancel") {
        return null; // User cancelled — not an error
      }

      return null;
    } catch (err: any) {
      return err?.message ?? "Google sign-in failed";
    }
  }, [createSessionFromUrl]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPasswordForEmail = useCallback(
    async (email: string): Promise<string | null> => {
      // Always send users to the dedicated reset screen (web + native)
      const redirectTo = getAuthRedirectUrl("/reset-password");
      if (__DEV__) {
        console.log("[auth] password reset redirectTo:", redirectTo);
      }
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );
      return error?.message ?? null;
    },
    []
  );

  const updatePassword = useCallback(
    async (newPassword: string): Promise<string | null> => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (!error) setIsPasswordRecovery(false);
      return error?.message ?? null;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isPasswordRecovery,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPasswordForEmail,
        updatePassword,
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
