import Feather from "@react-native-vector-icons/feather";
import { usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { useAuth } from "@/src/auth";
import { fonts, spacing, useTheme } from "@/src/theme";

/** When a signed-in jeweller previews the storefront/builder (e.g. inside the Shopify admin), a way back to their dashboard. */
export function DashboardReturn() {
  const { colors } = useTheme();
  const { admin } = useAuth();
  const path = usePathname();
  const router = useRouter();
  if (Platform.OS !== "web" || !admin || /^\/(admin|platform|job-sheet)(\/|$)/.test(path)) return null;
  return (
    <Pressable testID="back-to-dashboard-button" onPress={() => router.dismissTo("/admin" as never)} accessibilityRole="button"
      style={[styles.bar, { backgroundColor: colors.surfaceInverse }]}>
      <Feather name="arrow-left" size={14} color={colors.onSurfaceInverse} />
      <Text numberOfLines={1} style={[styles.text, { color: colors.onSurfaceInverse }]}>Back to dashboard</Text>
      <Text numberOfLines={1} style={[styles.hint, { color: colors.onSurfaceInverse }]}>· you&apos;re previewing your storefront</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  text: { fontFamily: fonts.bold, fontSize: 13, flexShrink: 0 },
  hint: { fontFamily: fonts.text, fontSize: 12, opacity: 0.75, flexShrink: 1 },
});
