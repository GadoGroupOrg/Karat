import Feather from "@react-native-vector-icons/feather";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Branding, assetUrl, dashRequest, fetchBranding, uploadLogo } from "@/src/api";
import { useAuth } from "@/src/auth";
import { setCurrentBranding } from "@/src/branding";
import { WIDE } from "@/src/components/admin/shell";
import { DISPLAY_FONTS, TEXT_FONTS, applyBranding, brandPalette, fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const PRESETS = [
  { name: "Champagne", brand: "#C5A059", ink: "#1A1A18", surface: "#FCFCFA" },
  { name: "Rose", brand: "#B76E79", ink: "#2B1D1F", surface: "#FDF8F6" },
  { name: "Emerald", brand: "#2F6B4F", ink: "#14211B", surface: "#F8FAF7" },
  { name: "Sapphire", brand: "#2C4A7C", ink: "#121826", surface: "#F8F9FC" },
  { name: "Noir", brand: "#A68A64", ink: "#0E0E0E", surface: "#F4F2EE" },
];
const HEX = /^#[0-9A-Fa-f]{6}$/;
type Form = Omit<Branding, "logo_url" | "updated_at">;

export default function BrandingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const { data, isLoading } = useQuery({ queryKey: ["branding-admin"], queryFn: () => fetchBranding(8000) });
  const [form, setForm] = useState<Form | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (data && !form) {
      const { logo_url, updated_at: _u, ...rest } = data;
      setForm(rest);
      setLogoUrl(logo_url);
    }
  }, [data, form]);

  if (isLoading || !form) return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;

  const setColor = (k: keyof Form["colors"], v: string) => setForm({ ...form, colors: { ...form.colors, [k]: v.startsWith("#") ? v : `#${v}` } });
  const valid = form.store_name.trim().length > 0 && Object.values(form.colors).every((c) => HEX.test(c));
  const pal = valid ? brandPalette(form.colors) : brandPalette(PRESETS[0]);
  const disp = DISPLAY_FONTS[form.display_font].family;
  const [tReg, tMed, tBold] = TEXT_FONTS[form.text_font].families;

  const run = async (key: string, fn: () => Promise<Branding>, ok: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const b = await fn();
      setLogoUrl(b.logo_url);
      applyBranding(b);
      setCurrentBranding(b);
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };
  const save = () => run("save", () => dashRequest<Branding>(token!, "/branding", { method: "PUT", body: JSON.stringify(form) }),
    "Branding saved. Customers see it next time they open the app or your website.");
  const pickLogo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    run("logo", () => uploadLogo(token!, { uri: a.uri, mimeType: a.mimeType ?? "image/png", name: a.fileName ?? "logo.png" }), "Logo updated");
  };
  const removeLogo = () => run("logo", () => dashRequest<Branding>(token!, "/branding/logo", { method: "DELETE" }), "Logo removed");

  const editor = (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.panel}>
        <Text style={styles.label}>STORE NAME</Text>
        <TextInput testID="branding-store-name-input" value={form.store_name} onChangeText={(v) => setForm({ ...form, store_name: v })} style={styles.input} maxLength={60} />
        <Text style={styles.label}>TAGLINE</Text>
        <TextInput testID="branding-tagline-input" value={form.tagline} onChangeText={(v) => setForm({ ...form, tagline: v })} style={styles.input} maxLength={120} />
        <Text style={styles.label}>LOGO</Text>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            {logoUrl ? <Image source={{ uri: assetUrl(logoUrl) }} style={{ width: "100%", height: "100%" }} contentFit="contain" testID="branding-logo-image" /> : <Feather name="image" size={20} color={colors.muted} />}
          </View>
          <Pressable testID="branding-upload-logo-button" onPress={pickLogo} disabled={!!busy} style={styles.outlineBtn}>
            {busy === "logo" ? <ActivityIndicator size="small" color={colors.onSurface} /> : <Text style={styles.outlineText}>{logoUrl ? "Replace" : "Upload logo"}</Text>}
          </Pressable>
          {logoUrl && (
            <Pressable testID="branding-remove-logo-button" onPress={removeLogo} disabled={!!busy} style={styles.textBtn}>
              <Text style={styles.textBtnText}>Remove</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.hint}>PNG or SVG with a transparent background works best.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>COLOUR PRESETS</Text>
        <View style={styles.wrap}>
          {PRESETS.map((p) => {
            const sel = p.brand === form.colors.brand && p.ink === form.colors.ink && p.surface === form.colors.surface;
            return (
              <Pressable key={p.name} testID={`branding-preset-${p.name.toLowerCase()}`} onPress={() => setForm({ ...form, colors: { brand: p.brand, ink: p.ink, surface: p.surface } })}
                style={[styles.preset, sel && { borderColor: colors.onSurface }]}>
                <View style={{ flexDirection: "row" }}>
                  {[p.surface, p.brand, p.ink].map((c) => <View key={c} style={[styles.swatchSm, { backgroundColor: c }]} />)}
                </View>
                <Text style={styles.presetText}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>
        {([["brand", "Accent (buttons, highlights)"], ["ink", "Text & dark buttons"], ["surface", "Background"]] as const).map(([k, label]) => (
          <View key={k} style={styles.colorRow}>
            <View style={[styles.swatch, { backgroundColor: HEX.test(form.colors[k]) ? form.colors[k] : "transparent" }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.colorLabel}>{label}</Text>
            </View>
            <TextInput testID={`branding-color-${k}-input`} value={form.colors[k]} onChangeText={(v) => setColor(k, v)} autoCapitalize="characters" maxLength={7}
              style={[styles.input, styles.hexInput, !HEX.test(form.colors[k]) && { borderColor: colors.error }]} />
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>HEADING FONT</Text>
        <View style={styles.wrap}>
          {Object.entries(DISPLAY_FONTS).map(([id, f]) => (
            <Pressable key={id} testID={`branding-display-font-${id}`} onPress={() => setForm({ ...form, display_font: id })}
              style={[styles.fontCard, form.display_font === id && styles.fontCardSel]}>
              <Text style={[styles.fontSample, { fontFamily: f.family }]}>Forever</Text>
              <Text style={styles.fontName}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>BODY FONT</Text>
        <View style={styles.wrap}>
          {Object.entries(TEXT_FONTS).map(([id, f]) => (
            <Pressable key={id} testID={`branding-text-font-${id}`} onPress={() => setForm({ ...form, text_font: id })}
              style={[styles.fontCard, form.text_font === id && styles.fontCardSel]}>
              <Text style={[styles.fontSampleSm, { fontFamily: f.families[1] }]}>Design yours</Text>
              <Text style={styles.fontName}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const preview = (
    <View style={[styles.preview, { backgroundColor: pal.surface, borderColor: pal.border }]} testID="branding-preview">
      <Text style={[styles.previewTag, { color: pal.muted, fontFamily: tBold }]}>LIVE PREVIEW</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {logoUrl ? <Image source={{ uri: assetUrl(logoUrl) }} style={{ width: 32, height: 32 }} contentFit="contain" /> : null}
        <Text style={{ fontFamily: tBold, fontSize: 12, letterSpacing: 2.5, color: pal.brandPrimary }}>{form.store_name.toUpperCase() || "YOUR STORE"}</Text>
      </View>
      <Text style={{ fontFamily: disp, fontSize: 32, lineHeight: 38, color: pal.onSurface, marginTop: spacing.lg }}>Design your{"\n"}forever ring.</Text>
      <Text style={{ fontFamily: tReg, fontSize: 14, lineHeight: 20, color: pal.muted, marginTop: spacing.sm }}>{form.tagline || "Your tagline"}</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, flexWrap: "wrap" }}>
        {["Oval", "Round", "Emerald"].map((s, i) => (
          <View key={s} style={{ height: 34, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: "center", borderWidth: 1,
            borderColor: i === 0 ? pal.surfaceInverse : pal.border, backgroundColor: i === 0 ? pal.surfaceInverse : pal.surface }}>
            <Text style={{ fontFamily: tMed, fontSize: 13, color: i === 0 ? pal.onSurfaceInverse : pal.onSurface }}>{s}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.md, backgroundColor: pal.brandTertiary }}>
        <Text style={{ fontFamily: tBold, fontSize: 11, letterSpacing: 1.5, color: pal.onBrandTertiary }}>ESTIMATE</Text>
        <Text style={{ fontFamily: disp, fontSize: 24, color: pal.onSurface, marginTop: 2 }}>$4,850</Text>
      </View>
      <View style={{ marginTop: spacing.lg, height: 50, borderRadius: radius.pill, backgroundColor: pal.surfaceInverse, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: tBold, fontSize: 15, color: pal.onSurfaceInverse }}>Request a quote</Text>
      </View>
      <View style={{ marginTop: spacing.sm, height: 50, borderRadius: radius.pill, backgroundColor: pal.brand, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: tBold, fontSize: 15, color: pal.onSurfaceInverse }}>Try it on</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, wide && styles.contentWide]} testID="admin-branding-screen">
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>WHITE LABEL</Text>
          <Text style={styles.h1}>Branding</Text>
          <Text style={styles.sub}>Your logo, name, colours and fonts are used across the mobile app and the builder on your website.</Text>
        </View>
        {wide && (
          <Pressable testID="branding-save-button" onPress={save} disabled={!valid || !!busy} style={[styles.darkBtn, (!valid || !!busy) && { opacity: 0.5 }]}>
            {busy === "save" ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.darkText}>Save branding</Text>}
          </Pressable>
        )}
      </View>
      {!!msg && (
        <View style={[styles.msg, { backgroundColor: msg.ok ? colors.success : colors.error }]} testID="branding-message">
          <Text style={styles.msgText}>{msg.text}</Text>
          {msg.ok && Platform.OS === "web" && (
            <Pressable onPress={() => window.location.reload()} testID="branding-reload-button"><Text style={[styles.msgText, { textDecorationLine: "underline" }]}>Reload to apply here</Text></Pressable>
          )}
        </View>
      )}
      {wide ? (
        <View style={{ flexDirection: "row", gap: spacing.xl, alignItems: "flex-start" }}>
          <View style={{ flex: 1.3 }}>{editor}</View>
          <View style={{ flex: 1 }}>{preview}</View>
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {preview}
          {editor}
          <Pressable testID="branding-save-button" onPress={save} disabled={!valid || !!busy} style={[styles.darkBtn, (!valid || !!busy) && { opacity: 0.5 }]}>
            {busy === "save" ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.darkText}>Save branding</Text>}
          </Pressable>
        </View>
      )}
    </KeyboardAwareScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.lg },
  contentWide: { padding: spacing["2xl"], maxWidth: 1200, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", alignItems: "flex-end", gap: spacing.lg },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface, marginTop: spacing.xs },
  sub: { fontFamily: fonts.text, fontSize: 14, color: c.muted, marginTop: spacing.xs },
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.sm },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.8, color: c.onSurface, marginTop: spacing.sm },
  input: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface },
  hint: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logoBox: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", padding: 6 },
  outlineBtn: { height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, justifyContent: "center" },
  outlineText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  textBtn: { height: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  textBtnText: { fontFamily: fonts.medium, fontSize: 13, color: c.error },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preset: { padding: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.border, alignItems: "center", gap: 6, minWidth: 88 },
  swatchSm: { width: 20, height: 20, borderRadius: 10, marginHorizontal: -2, borderWidth: 1, borderColor: c.border },
  presetText: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurface },
  colorRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  swatch: { width: 36, height: 36, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderStrong },
  colorLabel: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
  hexInput: { width: 120, fontFamily: fonts.medium },
  fontCard: { minWidth: 140, flexGrow: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.border, gap: 4 },
  fontCardSel: { borderColor: c.onSurface, backgroundColor: c.surfaceSecondary },
  fontSample: { fontSize: 24, color: c.onSurface },
  fontSampleSm: { fontSize: 16, color: c.onSurface },
  fontName: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  preview: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl },
  previewTag: { fontSize: 10, letterSpacing: 2, marginBottom: spacing.lg },
  darkBtn: { height: 48, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  darkText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  msg: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, padding: spacing.lg, borderRadius: radius.md },
  msgText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSuccess },
}));
