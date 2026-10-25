import { Image } from "expo-image";
import { usePathname } from "expo-router";
import { Linking, Platform, Pressable, StyleSheet, Text } from "react-native";

import { isEmbedded } from "@/src/embed";
import { fonts, spacing, useTheme } from "@/src/theme";

const URL = "https://karatdesign.io";
const DIAMOND = require("@/assets/images/karat-diamond.png");

/** Subtle "Powered by Karat" credit on every website/Shopify embed (not on the jeweller's own dashboard). */
export function PoweredBy() {
  const { colors } = useTheme();
  const path = usePathname();
  if (!isEmbedded || /^\/(admin|platform|job-sheet)/.test(path)) return null;
  const open = () => (Platform.OS === "web" ? window.open(URL, "_blank", "noopener") : Linking.openURL(URL));
  return (
    <Pressable testID="powered-by-karat" onPress={open} accessibilityRole="link" style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <Image source={DIAMOND} style={styles.diamond} contentFit="contain" testID="powered-by-diamond" />
      <Text style={[styles.text, { color: colors.muted }]}>
        Powered by <Text style={[styles.brand, { color: colors.onSurface }]}>Karat</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 32, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.xs },
  diamond: { width: 16, height: 10 },
  text: { fontFamily: fonts.text, fontSize: 11, letterSpacing: 0.5 },
  brand: { fontFamily: fonts.bold, letterSpacing: 1 },
});
