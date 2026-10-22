import Feather from "@react-native-vector-icons/feather";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { BACKEND_ORIGIN } from "@/src/api";
import { useDashQuery } from "@/src/components/admin/use-dash";
import { ShopifyConnect } from "@/src/components/admin/shopify-connect";
import { getStore } from "@/src/tenant";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Status = {
  configured: boolean; scopes: string; app_url: string; redirect_url: string; webhooks_url: string;
  shops: { shop: string; installed_at: string; uninstalled_at: string | null }[];
};

const STEPS = [
  "In partners.shopify.com → Apps → Create app → “Create app manually”. Name it, then open Configuration.",
  "Paste the App URL and Redirect URL below. Turn off “Embed app in Shopify admin”. Set Webhooks API version 2025-10.",
  "Copy the app’s Client ID and Client secret and send them to your developer (they go in the server settings).",
  "Download the app package, unzip it, and in that folder run: shopify app config link → shopify app deploy.",
  "Distribution → Custom distribution → enter your store → open the install link and approve.",
  "Theme editor: Add section → Apps → “Jewelry Builder”. On the product template add the “Virtual Try-On button” block.",
];

/** Shopify app setup: URLs to paste in the Partner dashboard + downloadable theme app extension. */
export function ShopifyAppPanel() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data } = useDashQuery<Status>(["shopify-app"], "/shopify");
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (k: string, v: string) => {
    await Clipboard.setStringAsync(v);
    setCopied(k);
    setTimeout(() => setCopied(null), 2000);
  };
  const live = data?.shops.filter((s) => !s.uninstalled_at) ?? [];

  const field = (k: string, label: string, v?: string) => (
    <View key={k} style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.linkRow}>
        <Text style={styles.linkText} numberOfLines={1} selectable testID={`shopify-${k}-text`}>{v ?? "…"}</Text>
        <Pressable testID={`shopify-copy-${k}`} onPress={() => v && copy(k, v)} style={styles.iconBtn}>
          <Feather name={copied === k ? "check" : "copy"} size={16} color={colors.onSurface} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.panel} testID="shopify-app-panel">
      <View style={styles.row}>
        <Feather name="package" size={18} color={colors.brandPrimary} />
        <Text style={styles.h3}>Shopify app</Text>
        <View style={[styles.pill, live.length > 0 && styles.pillOn]}>
          <Text style={styles.pillText} testID="shopify-app-status">
            {live.length ? `Installed on ${live.map((s) => s.shop).join(", ")}` : data?.configured ? "Ready to install" : "Setup needed"}
          </Text>
        </View>
      </View>
      <Text style={styles.text}>One-click install with a drag-and-drop builder section and a “Try it on” button on product pages.</Text>
      <View style={styles.quick} testID="shopify-quick-sync">
        <Text style={styles.text}>Just want your products in the builder and try-on now? Sync them from your store address. No app needed.</Text>
        <Pressable testID="shopify-sync-products" onPress={() => router.push("/store-connect")} style={styles.outline}>
          <Feather name="refresh-cw" size={14} color={colors.onSurface} />
          <Text style={styles.outlineText}>Sync products</Text>
        </Pressable>
      </View>
      {STEPS.map((s, i) => (
        <View key={i} style={styles.step}><Text style={styles.stepNum}>{i + 1}</Text><Text style={styles.text}>{s}</Text></View>
      ))}
      {field("app-url", "APP URL", data?.app_url)}
      {field("redirect-url", "ALLOWED REDIRECT URL", data?.redirect_url)}
      <Pressable testID="shopify-download-package" onPress={() => Linking.openURL(`${BACKEND_ORIGIN}/api/shopify/package.zip?store=${getStore() || "gado"}`)} style={styles.darkBtn}>
        <Feather name="download" size={14} color={colors.onSurfaceInverse} />
        <Text style={styles.darkText}>Download app package</Text>
      </Pressable>
      {data?.configured && live.length === 0 && <ShopifyConnect />}
      {!data?.configured && (
        <Text style={styles.hint} testID="shopify-not-configured">Install links stay off until the Client ID and secret are added (step 3).</Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  h3: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface, flex: 1 },
  pill: { paddingHorizontal: spacing.md, height: 26, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.surfaceTertiary },
  pillOn: { backgroundColor: c.brandTertiary },
  pillText: { fontFamily: fonts.bold, fontSize: 11, color: c.onSurface },
  text: { flex: 1, fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.onSurface },
  hint: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.8, color: c.onSurface, marginTop: spacing.xs },
  step: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.surfaceSecondary, textAlign: "center", lineHeight: 22, fontFamily: fonts.bold, fontSize: 11, color: c.onSurface, overflow: "hidden" },
  linkRow: { flexDirection: "row", alignItems: "center", borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingLeft: spacing.lg },
  linkText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  quick: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg },
  outline: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong },
  outlineText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
  darkBtn: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, marginTop: spacing.sm },
  darkText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
}));
