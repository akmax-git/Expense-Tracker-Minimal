import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

export type ColorTokens = typeof colors.light & {
  radius: typeof colors.radius;
  spacing: typeof colors.spacing;
  brand: typeof colors.brand;
  shadow: typeof colors.shadow;
  /** Back-compat: single radius value (lg) used by older call sites */
  radiusValue: number;
};

/**
 * Returns the design tokens for the current color scheme.
 *
 * Includes palette colors plus scheme-independent radius, spacing,
 * brand accents, and shadow presets.
 */
export function useColors(): ColorTokens {
  const scheme = useColorScheme();
  const palette =
    scheme === "dark" && "dark" in colors
      ? colors.dark
      : colors.light;

  return {
    ...palette,
    radius: colors.radius,
    spacing: colors.spacing,
    brand: colors.brand,
    shadow: colors.shadow,
    radiusValue: colors.radius.lg,
  };
}
