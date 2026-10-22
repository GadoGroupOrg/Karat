import Feather from "@react-native-vector-icons/feather";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";

import { BACKEND_ORIGIN } from "@/src/api";
import { WIDE } from "@/src/components/admin/shell";
import { ShopifyAppPanel } from "@/src/components/admin/shopify-app-panel";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Mode = "popup" | "inline";
type Page = "build" | "shop" | "home";
const PAGES: { id: Page; label: string }[] = [
  { id: "build", label: "Builder" },
  { id: "shop", label: "Shop + Try-on" },
  { id: "home", label: "Full app" },
];
const PLATFORMS = [
  { name: "Shopify", icon: "shopping-bag", steps: [
    "Online Store → Themes → Customize.",
    "Pop-up on every page: ⋯ → Edit code → layout/theme.liquid → paste just before </body> → Save.",
    "Inline on one page: open the page (e.g. “Design your ring”) → Add section → Custom Liquid → paste → Save.",
  ] },
  { name: "WordPress", icon: "globe", steps: ["Edit the page → add a “Custom HTML” block → paste → Update."] },
  { name: "Wix", icon: "layout", steps: ["Settings → Custom code → + Add custom code → paste → load on all pages (pop-up) or Add → Embed code (inline)."] },
  { name: "Squarespace", icon: "square", steps: ["Edit page → Add block → Code → paste (inline), or Settings → Advanced → Code injection → Footer (pop-up)."] },
] as const;

export default function EmbedScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const [mode, setMode] = useState<Mode>("popup");
  const [page, setPage] = useState<Page>("build");
  const [label, setLabel] = useState("Design your own");
  const [copied, setCopied] = useState<string | null>(null);

  const attrs = `data-mode="${mode}" data-page="${page}"${mode === "popup" ? ` data-label="${label.replace(/"/g, "")}"` : ` data-target="#atelier-builder" data-height="820px"`}`;
  const snippet = `${mode === "inline" ? '<div id="atelier-builder"></div>\n' : ""}<script src="${BACKEND_ORIGIN}/api/embed.js" ${attrs} async></script>`;
  const link = `${BACKEND_ORIGIN}${page === "home" ? "/" : `/${page}`}?embed=1`;

  const copy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const seg = <T extends string>(items: { id: T; label: string }[], value: T, set: (v: T) => void, prefix: string) => (
    <View style={styles.seg}>
      {items.map((i) => (
        <Pressable key={i.id} testID={`${prefix}-${i.id}`} onPress={() => set(i.id)} style={[styles.segItem, value === i.id && styles.segSel]}>
          <Text style={[styles.segText, value === i.id && { color: colors.onSurfaceInverse }]}>{i.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, wide && styles.contentWide]} testID="admin-embed-screen">
      <Text style={styles.eyebrow}>INSTALL</Text>
      <Text style={styles.h1}>Website & Shopify</Text>
      <Text style={styles.sub}>Add the builder and virtual try-on to any website with one snippet. It uses your branding, and every request lands in Leads.</Text>

      <View style={[{ gap: spacing.xl }, wide && { flexDirection: "row", alignItems: "flex-start" }]}>
        <View style={[styles.panel, wide && { flex: 1 }]}>
          <Text style={styles.label}>HOW IT APPEARS</Text>
          {seg([{ id: "popup" as Mode, label: "Floating button + pop-up" }, { id: "inline" as Mode, label: "Inline on a page" }], mode, setMode, "embed-mode")}
          <Text style={styles.label}>OPENS TO</Text>
          {seg(PAGES, page, setPage, "embed-page")}
          {mode === "popup" && (
            <>
              <Text style={styles.label}>BUTTON TEXT</Text>
              <TextInput testID="embed-label-input" value={label} onChangeText={setLabel} maxLength={40} style={styles.input} />
            </>
          )}
          <Text style={styles.label}>YOUR SNIPPET</Text>
          <View style={styles.code}><Text style={styles.codeText} selectable testID="embed-snippet-text">{snippet}</Text></View>
          <View style={styles.row}>
            <Pressable testID="embed-copy-snippet-button" onPress={() => copy("snippet", snippet)} style={styles.darkBtn}>
              <Feather name={copied === "snippet" ? "check" : "copy"} size={14} color={colors.onSurfaceInverse} />
              <Text style={styles.darkText}>{copied === "snippet" ? "Copied" : "Copy snippet"}</Text>
            </Pressable>
            <Pressable testID="embed-preview-button" onPress={() => WebBrowser.openBrowserAsync(link)} style={styles.outlineBtn}>
              <Feather name="external-link" size={14} color={colors.onSurface} />
              <Text style={styles.outlineText}>Preview</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>OR SHARE A DIRECT LINK</Text>
          <Text style={styles.hint}>Use it for a “Design your ring” menu item, Instagram bio or email.</Text>
          <View style={styles.linkRow}>
            <Text style={styles.linkText} numberOfLines={1} selectable testID="embed-link-text">{link}</Text>
            <Pressable testID="embed-copy-link-button" onPress={() => copy("link", link)} style={styles.iconBtn}>
              <Feather name={copied === "link" ? "check" : "copy"} size={16} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>

        <View style={[{ gap: spacing.md }, wide && { flex: 1 }]}>
          {PLATFORMS.map((p) => (
            <View key={p.name} style={styles.panel} testID={`embed-platform-${p.name.toLowerCase()}`}>
              <View style={styles.row}>
                <Feather name={p.icon} size={18} color={colors.brandPrimary} />
                <Text style={styles.h3}>{p.name}</Text>
              </View>
              {p.steps.map((s, i) => (
                <View key={i} style={styles.step}><Text style={styles.stepNum}>{i + 1}</Text><Text style={styles.stepText}>{s}</Text></View>
              ))}
            </View>
          ))}
          <ShopifyAppPanel />
        </View>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.md },
  contentWide: { padding: spacing["2xl"], maxWidth: 1200, width: "100%", alignSelf: "center" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface },
  h3: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted, marginBottom: spacing.md },
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.sm },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.8, color: c.onSurface, marginTop: spacing.md },
  hint: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  seg: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  segItem: { height: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, justifyContent: "center" },
  segSel: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  segText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  input: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface },
  code: { backgroundColor: c.surfaceInverse, borderRadius: radius.md, padding: spacing.lg },
  codeText: { fontFamily: "SpaceMono", fontSize: 12, lineHeight: 19, color: c.onSurfaceInverse },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  darkBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse },
  darkText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong },
  outlineText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  linkRow: { flexDirection: "row", alignItems: "center", borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingLeft: spacing.lg },
  linkText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  step: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.surfaceSecondary, textAlign: "center", lineHeight: 22, fontFamily: fonts.bold, fontSize: 11, color: c.onSurface, overflow: "hidden" },
  stepText: { flex: 1, fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.onSurface },
}));
