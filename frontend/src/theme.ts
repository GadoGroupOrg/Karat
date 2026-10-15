// Design tokens for this app. Light theme only (Luxury minimal: cream, gold, serif).
// Keys match the "color" block of /app/design_guidelines.json.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FCFCFA",
  onSurface: "#1A1A18",
  surfaceSecondary: "#F5F4EE",
  onSurfaceSecondary: "#1A1A18",
  surfaceTertiary: "#EAE9E2",
  onSurfaceTertiary: "#1A1A18",
  surfaceInverse: "#1A1A18",
  onSurfaceInverse: "#FCFCFA",
  muted: "#7A7973",

  brand: "#C5A059",
  onBrand: "#FFFFFF",
  brandPrimary: "#B08D43",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E0C88D",
  onBrandSecondary: "#1A1A18",
  brandTertiary: "#F2E8D0",
  onBrandTertiary: "#8C6A21",

  success: "#3B5C45",
  onSuccess: "#FFFFFF",
  warning: "#C7862E",
  onWarning: "#FFFFFF",
  error: "#8A3333",
  onError: "#FFFFFF",
  info: "#4A6B7C",
  onInfo: "#FFFFFF",

  border: "#EAE9E2",
  borderStrong: "#D1CFC2",
  divider: "#EAE9E2",
  scrim: "rgba(26,26,24,0.65)",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = (system === "light" || system === "dark") && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
export const fonts = {
  display: "PlayfairDisplay",
  text: "Satoshi-Regular",
  medium: "Satoshi-Medium",
  bold: "Satoshi-Bold",
};
