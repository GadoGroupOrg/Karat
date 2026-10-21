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

// ---------- White-label branding (applied once at startup, before first render) ----------
export const DISPLAY_FONTS: Record<string, { family: string; label: string }> = {
  playfair: { family: "PlayfairDisplay", label: "Playfair Display" },
  cormorant: { family: "CormorantGaramond", label: "Cormorant Garamond" },
  dmserif: { family: "DMSerifDisplay", label: "DM Serif Display" },
  bodoni: { family: "BodoniModa", label: "Bodoni Moda" },
};
export const TEXT_FONTS: Record<string, { families: [string, string, string]; label: string }> = {
  satoshi: { families: ["Satoshi-Regular", "Satoshi-Medium", "Satoshi-Bold"], label: "Satoshi" },
  inter: { families: ["Inter-Regular", "Inter-Medium", "Inter-Bold"], label: "Inter" },
  jost: { families: ["Jost-Regular", "Jost-Medium", "Jost-Bold"], label: "Jost" },
  montserrat: { families: ["Montserrat-Regular", "Montserrat-Medium", "Montserrat-Bold"], label: "Montserrat" },
};

export type BrandColors = { brand: string; ink: string; surface: string };

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a: string, b: string, t: number) {
  const x = rgb(a), y = rgb(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function brandPalette({ brand, ink, surface }: BrandColors): Partial<ThemeColors> {
  const [r, g, b] = rgb(ink);
  return {
    surface, onSurface: ink, surfaceSecondary: mix(surface, ink, 0.035), onSurfaceSecondary: ink,
    surfaceTertiary: mix(surface, ink, 0.08), onSurfaceTertiary: ink, surfaceInverse: ink, onSurfaceInverse: surface,
    muted: mix(ink, surface, 0.5), brand, brandPrimary: mix(brand, ink, 0.12), brandSecondary: mix(brand, surface, 0.4),
    onBrandSecondary: ink, brandTertiary: mix(brand, surface, 0.8), onBrandTertiary: mix(brand, ink, 0.45),
    border: mix(surface, ink, 0.08), borderStrong: mix(surface, ink, 0.18), divider: mix(surface, ink, 0.08),
    scrim: `rgba(${r},${g},${b},0.65)`,
  };
}

export function applyBranding(b: { colors: BrandColors; display_font: string; text_font: string }) {
  Object.assign(light, brandPalette(b.colors));
  fonts.display = DISPLAY_FONTS[b.display_font]?.family ?? fonts.display;
  const t = TEXT_FONTS[b.text_font]?.families;
  if (t) [fonts.text, fonts.medium, fonts.bold] = t;
}
