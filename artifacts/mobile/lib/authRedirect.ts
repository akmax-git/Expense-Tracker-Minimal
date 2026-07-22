import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * Stable redirect URL for Supabase Auth emails (password reset, OAuth).
 * Must be listed under Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export function getAuthRedirectUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  // Prefer explicit origin (production web / configured domain)
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.replace(/^https?:\/\//, "");
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${normalized}`;
  }
  if (domain) {
    return `https://${domain}${normalized}`;
  }

  // Native / Expo: scheme from app.config.js → lifeeasy://...
  return Linking.createURL(normalized);
}

/** Current browser href, or null on native. */
export function getCurrentWebUrl(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  return window.location.href;
}

/** True when the URL carries auth tokens / recovery markers. */
export function urlHasAuthParams(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("access_token=") ||
    url.includes("refresh_token=") ||
    url.includes("type=recovery") ||
    url.includes("code=") ||
    /[?#&]type=recovery\b/.test(url)
  );
}

/** True when this URL is a password-recovery callback. */
export function urlIsPasswordRecovery(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.includes("type=recovery")) return true;
  // Landing on /reset-password with a PKCE code is always recovery
  try {
    const path = url.split("?")[0]?.split("#")[0] ?? "";
    if (path.includes("reset-password") && url.includes("code=")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Parse access/refresh tokens or PKCE code from an auth callback URL. */
export function parseAuthCallbackUrl(url: string): {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  code: string | null;
} {
  try {
    const hash = url.includes("#") ? url.split("#")[1] ?? "" : "";
    const query = url.includes("?")
      ? url.split("?")[1]?.split("#")[0] ?? ""
      : "";
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(query);

    return {
      accessToken:
        hashParams.get("access_token") ?? queryParams.get("access_token"),
      refreshToken:
        hashParams.get("refresh_token") ?? queryParams.get("refresh_token"),
      type: hashParams.get("type") ?? queryParams.get("type"),
      code: queryParams.get("code") ?? hashParams.get("code"),
    };
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      type: null,
      code: null,
    };
  }
}

/** Strip auth tokens from the browser URL so a refresh doesn't re-process them. */
export function clearAuthParamsFromUrl(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.hash = "";
    [
      "access_token",
      "refresh_token",
      "expires_in",
      "expires_at",
      "token_type",
      "type",
      "code",
      "provider_token",
      "provider_refresh_token",
    ].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState({}, document.title, url.pathname + url.search);
  } catch {
    /* ignore */
  }
}
