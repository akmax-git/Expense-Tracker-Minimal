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
