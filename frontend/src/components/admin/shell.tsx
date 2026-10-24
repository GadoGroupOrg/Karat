import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { assetUrl } from "@/src/api";
import { useAuth } from "@/src/auth";
import { getBranding } from "@/src/branding";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Nav = { href: string; label: string; icon: React.ComponentProps<typeof Feather>["name"]; match: (p: string) => boolean };
const NAV: Nav[] = [
  { href: "/admin", label: "Leads", icon: "inbox", match: (p) => p === "/admin" || p.startsWith("/admin/leads") },
  { href: "/admin/catalog", label: "Catalog", icon: "grid", match: (p) => p.startsWith("/admin/catalog") },
  { href: "/admin/access", label: "Customer access", icon: "lock", match: (p) => p.startsWith("/admin/access") },
  { href: "/admin/customers", label: "Customers", icon: "users", match: (p) => p.startsWith("/admin/customers") },
  { href: "/admin/branding", label: "Branding", icon: "feather", match: (p) => p.startsWith("/admin/branding") },
  { href: "/admin/embed", label: "Website & Shopify", icon: "code", match: (p) => p.startsWith("/admin/embed") },
  { href: "/admin/team", label: "Team", icon: "user-plus", match: (p) => p.startsWith("/admin/team") },
  { href: "/merchant", label: "Pricing", icon: "dollar-sign", match: () => false },
  { href: "/build", label: "Open builder", icon: "edit-3", match: () => false },
];

export const WIDE = 900;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const path = usePathname();
  const { admin, session, signOut } = useAuth();
  const impersonating = !!session?.impersonating;
  const exit = async () => {
    await signOut();
    if (impersonating) router.replace("/platform" as never);
  };
  const b = getBranding();
  const wide = width >= WIDE;

  const brand = (
    <View style={styles.brandRow}>
      {b?.logo_url ? (
        <Image source={{ uri: assetUrl(b.logo_url) }} style={styles.logo} contentFit="contain" />
      ) : (
        <View style={styles.logoMark}><Text style={styles.logoMarkText}>{(b?.store_name ?? "A").slice(0, 1)}</Text></View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.storeName} numberOfLines={1}>{b?.store_name ?? "Karat"}</Text>
        <Text style={styles.storeSub}>{admin?.role === "staff" ? "Staff" : "Store admin"}</Text>
      </View>
    </View>
  );

  const items = NAV.filter((n) => n.href !== "/admin/team" || admin?.role === "owner").map((n) => {
    const active = n.match(path);
    return (
      <Pressable
        key={n.href}
        testID={`admin-nav-${n.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
        onPress={() => (n.match(path) ? null : n.href.startsWith("/admin") ? router.replace(n.href as never) : router.push(n.href as never))}
        accessibilityRole="link"
        style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
          wide ? styles.navItem : styles.navChip,
          active && (wide ? styles.navItemActive : styles.navChipActive),
          (hovered || pressed) && !active && { backgroundColor: colors.surfaceSecondary },
        ]}
      >
        <Feather name={n.icon} size={16} color={active ? colors.onSurfaceInverse : colors.onSurface} />
        <Text style={[styles.navText, active && { color: colors.onSurfaceInverse }]}>{n.label}</Text>
      </Pressable>
    );
  });

  const banner = impersonating && (
    <View style={styles.banner} testID="admin-impersonation-banner">
      <Feather name="eye" size={14} color={colors.onSurfaceInverse} />
      <Text style={styles.bannerText} numberOfLines={1}>Support view · {session?.tenant.name} ({admin?.email})</Text>
      <Pressable testID="admin-exit-impersonation" onPress={exit} hitSlop={8} style={styles.bannerBtn}>
        <Text style={styles.bannerBtnText}>Back to platform</Text>
      </Pressable>
    </View>
  );

  if (wide) {
    return (
      <View style={{ flex: 1 }}>
      {banner}
      <View style={styles.wideRoot} testID="admin-shell">
        <View style={styles.sidebar}>
          {brand}
          <View style={styles.navList}>{items}</View>
          <View style={{ flex: 1 }} />
          <Text style={styles.who} numberOfLines={1}>{admin?.email}</Text>
          <Pressable testID="admin-sign-out-button" onPress={exit} style={styles.signOut}>
            <Feather name="log-out" size={16} color={colors.onSurface} />
            <Text style={styles.navText}>Sign out</Text>
          </Pressable>
        </View>
        <View style={styles.main}>{children}</View>
      </View>
      </View>
    );
  }
  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="admin-shell">
      {banner}
      <View style={styles.topBar}>
        {brand}
        <View style={{ flex: 1 }} />
        <Pressable testID="admin-sign-out-button" onPress={exit} hitSlop={8} style={styles.iconBtn}>
          <Feather name="log-out" size={18} color={colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chipBarContent}>
        {items}
      </ScrollView>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  wideRoot: { flex: 1, flexDirection: "row", backgroundColor: c.surfaceSecondary },
  sidebar: { width: 248, backgroundColor: c.surface, borderRightWidth: 1, borderRightColor: c.border, padding: spacing.lg, gap: spacing.lg },
  main: { flex: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexShrink: 1 },
  logo: { width: 40, height: 40 },
  logoMark: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  logoMarkText: { fontFamily: fonts.display, fontSize: 20, color: c.onSurfaceInverse },
  storeName: { fontFamily: fonts.display, fontSize: 17, color: c.onSurface },
  storeSub: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.8, color: c.brandPrimary, textTransform: "uppercase" },
  navList: { gap: 4, marginTop: spacing.md },
  navItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, height: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  navItemActive: { backgroundColor: c.surfaceInverse },
  navChip: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border },
  navChipActive: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  navText: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
  who: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  signOut: { flexDirection: "row", alignItems: "center", gap: spacing.md, height: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: c.border },
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceInverse, paddingHorizontal: spacing.lg, minHeight: 44 },
  bannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: c.onSurfaceInverse },
  bannerBtn: { height: 32, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.onSurfaceInverse, justifyContent: "center" },
  bannerBtnText: { fontFamily: fonts.bold, fontSize: 12, color: c.onSurfaceInverse },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  chipBar: { flexGrow: 0, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: c.border },
  chipBarContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, alignItems: "center" },
}));
