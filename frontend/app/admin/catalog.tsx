import Feather from "@react-native-vector-icons/feather";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Switch, Text, TextInput, useWindowDimensions, View } from "react-native";

import { BASE, assetUrl, dashRequest } from "@/src/api";
import { useAuth } from "@/src/auth";
import { WIDE } from "@/src/components/admin/shell";
import { BuilderFeatures, type AiPolicy, type Feature } from "@/src/components/admin/builder-features";
import { useDashQuery } from "@/src/components/admin/use-dash";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { uploadForm } from "@/src/utils/upload";

type Source = "brand" | "stock" | "ai" | "default" | "none";
type Opt = { id: string; name: string; color: string | null; enabled: boolean; custom?: boolean; image: string | null; image_source: Source | null };
type Group = { key: string; label: string; type: string; has_images: boolean; can_add?: boolean; options: Opt[] };
type Slot = { key: string; label: string; image: string | null; image_source: Source };
type Stock = { id: string; label: string; tags: string[]; url: string };
type AdminCatalog = { types: { id: string; name: string; group?: string; enabled: boolean }[]; groups: Group[]; storefront: Slot[]; stock: Stock[]; features?: Feature[]; ai?: AiPolicy };

const SOURCE_LABEL: Record<Source, string> = { brand: "Brand photo", stock: "Stock", ai: "AI studio", default: "Default", none: "No image" };

export default function CatalogScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const { data, isLoading, refetch } = useDashQuery<AdminCatalog>(["catalog"], "/catalog");
  const [offTypes, setOffTypes] = useState<string[]>([]);
  const [off, setOff] = useState<Record<string, string[]>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [picker, setPicker] = useState<{ key: string; label: string; source: Source } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newStyle, setNewStyle] = useState({ name: "", description: "", price: "" });

  const addStyle = async (type: string) => {
    if (!newStyle.name.trim()) return setMsg({ ok: false, text: "Give your style a name." });
    setBusy("add");
    try {
      await dashRequest(token!, "/custom-styles", { method: "POST", body: JSON.stringify({
        type, name: newStyle.name.trim(), description: newStyle.description.trim(), price: Number(newStyle.price) || 0 }) });
      setAdding(null);
      setNewStyle({ name: "", description: "", price: "" });
      await refresh();
      setMsg({ ok: true, text: "Style added. Tap its image to upload your product photo." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };
  const removeStyle = async (id: string) => {
    setBusy("add");
    try {
      await dashRequest(token!, `/custom-styles/${id}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (!data || dirty) return;
    setOffTypes(data.types.filter((t) => !t.enabled).map((t) => t.id));
    setOff(Object.fromEntries(data.groups.map((g) => [g.key, g.options.filter((o) => !o.enabled).map((o) => o.id)])));
  }, [data, dirty]);

  const counts = useMemo(() => Object.fromEntries((data?.groups ?? []).map((g) => [g.key, g.options.length - (off[g.key]?.length ?? 0)])), [data, off]);

  const toggleType = (id: string) => {
    setDirty(true);
    setOffTypes((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  };
  const toggleOpt = (g: string, id: string) => {
    const cur = off[g] ?? [];
    const enabling = cur.includes(id);
    if (!enabling && counts[g] <= 1) return setMsg({ ok: false, text: "Keep at least one option switched on." });
    setDirty(true);
    setOff({ ...off, [g]: enabling ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  const refresh = async () => {
    await refetch();
    qc.invalidateQueries({ queryKey: ["catalog"] });
    qc.invalidateQueries({ queryKey: ["storefront"] });
  };

  const save = async () => {
    setBusy("save");
    setMsg(null);
    try {
      await dashRequest(token!, "/catalog/toggles", { method: "PUT", body: JSON.stringify({ disabled_types: offTypes, disabled: off }) });
      setDirty(false);
      await refresh();
      setMsg({ ok: true, text: "Catalog saved. Customers see the changes right away." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const setImage = async (key: string, body: { source: "stock" | "default"; url?: string } | { upload: true }) => {
    setBusy(key);
    setMsg(null);
    try {
      if ("upload" in body) {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
        if (r.canceled || !r.assets?.[0]) return;
        const a = r.assets[0];
        const res = await uploadForm(`${BASE}/dashboard/images/${encodeURIComponent(key)}`, {
          files: { image: { uri: a.uri, mimeType: a.mimeType ?? "image/jpeg", name: a.fileName ?? "photo.jpg" } },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? "Upload failed");
      } else {
        await dashRequest(token!, `/images/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setPicker(null);
      await refresh();
      setMsg({ ok: true, text: "Image updated" });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;

  const tileW = wide ? 168 : "47%";
  const imageTile = (key: string, label: string, image: string | null, source: Source | null, extra?: React.ReactNode, dim?: boolean) => (
    <View key={key} style={[styles.tile, { width: tileW }, dim && { opacity: 0.45 }]} testID={`catalog-tile-${key}`}>
      <Pressable onPress={() => setPicker({ key, label, source: source ?? "none" })} testID={`catalog-change-image-${key}`}>
        {image ? <Image source={{ uri: assetUrl(image) }} style={styles.tileImg} contentFit="cover" /> : (
          <View style={[styles.tileImg, styles.tileEmpty]}><Feather name="image" size={18} color={colors.muted} /></View>
        )}
        <View style={styles.badge}><Text style={styles.badgeText}>{SOURCE_LABEL[source ?? "none"]}</Text></View>
        <View style={styles.editIcon}><Feather name="edit-2" size={12} color={colors.onSurface} /></View>
      </Pressable>
      <View style={styles.tileFoot}>
        <Text style={styles.tileName} numberOfLines={1}>{label}</Text>
        {extra}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.content, wide && styles.contentWide]} testID="admin-catalog-screen">
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>CATALOG</Text>
            <Text style={styles.h1}>Builders, options & images</Text>
            <Text style={styles.sub}>Choose what customers can design and which photos they see. Tap any image to use your own brand photo, a stock photo, or the AI studio image.</Text>
          </View>
        </View>
        {!!msg && (
          <View style={[styles.msg, { backgroundColor: msg.ok ? colors.success : colors.error }]} testID="catalog-message">
            <Text style={styles.msgText}>{msg.text}</Text>
          </View>
        )}

        {!!data.features && <BuilderFeatures features={data.features} ai={data.ai} />}

        <View style={styles.panel}>
          <Text style={styles.h3}>Builders</Text>
          <View style={styles.wrap}>
            {data.types.map((t) => {
              const on = !offTypes.includes(t.id);
              return (
                <Pressable key={t.id} onPress={() => toggleType(t.id)} style={[styles.typeCard, on && styles.typeOn]} testID={`catalog-type-${t.id}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.typeName}>{t.name}</Text>
                    <Text style={styles.typeSub}>{t.group === "bridal" ? "Bridal builder" : "Builder"} · {on ? "On" : "Off"}</Text>
                  </View>
                  <Switch value={on} pointerEvents="none" trackColor={{ true: colors.brand, false: colors.surfaceTertiary }} testID={`catalog-type-switch-${t.id}`} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.h3}>Storefront images</Text>
          <Text style={styles.hint}>The home screen hero and collection tiles.</Text>
          <View style={styles.wrap}>{data.storefront.map((s) => imageTile(s.key, s.label, s.image, s.image_source))}</View>
        </View>

        {data.groups.map((g) => (
          <View key={g.key} style={[styles.panel, offTypes.includes(g.type) && { opacity: 0.6 }]} testID={`catalog-group-${g.key}`}>
            <View style={styles.groupHead}>
              <Text style={styles.h3}>{g.label}</Text>
              <Text style={styles.hint}>{counts[g.key]} of {g.options.length} offered</Text>
            </View>
            <View style={styles.wrap}>
              {g.options.map((o) => {
                const on = !(off[g.key] ?? []).includes(o.id);
                const sw = (
                  <>
                    {o.custom && <Pressable onPress={() => removeStyle(o.id)} hitSlop={6} testID={`catalog-remove-style-${o.id}`}><Feather name="trash-2" size={14} color={colors.error} /></Pressable>}
                    <Switch value={on} onValueChange={() => toggleOpt(g.key, o.id)} trackColor={{ true: colors.brand, false: colors.surfaceTertiary }} testID={`catalog-switch-${g.key}-${o.id}`} />
                  </>
                );
                return g.has_images ? imageTile(`${g.key}:${o.id}`, o.name, o.image, o.image_source, sw, !on) : (
                  <View key={o.id} style={[styles.chipRow, !on && { opacity: 0.5 }]} testID={`catalog-option-${g.key}-${o.id}`}>
                    {!!o.color && <View style={[styles.dot, { backgroundColor: o.color }]} />}
                    <Text style={styles.chipName}>{o.name}</Text>
                    {sw}
                  </View>
                );
              })}
            </View>
            {g.can_add && !["ring", "band"].includes(g.type) && (adding === g.type ? (
              <View style={styles.addForm} testID={`catalog-add-form-${g.type}`}>
                <TextInput testID="catalog-new-style-name" value={newStyle.name} onChangeText={(v) => setNewStyle({ ...newStyle, name: v })} placeholder="Style name (e.g. Gado Signature Huggie)" placeholderTextColor={colors.muted} style={styles.input} maxLength={60} />
                <TextInput testID="catalog-new-style-description" value={newStyle.description} onChangeText={(v) => setNewStyle({ ...newStyle, description: v })} placeholder="Short description" placeholderTextColor={colors.muted} style={styles.input} maxLength={200} />
                <TextInput testID="catalog-new-style-price" value={newStyle.price} onChangeText={(v) => setNewStyle({ ...newStyle, price: v.replace(/[^0-9.]/g, "") })} placeholder="Price added to the base ($)" placeholderTextColor={colors.muted} style={styles.input} keyboardType="numeric" />
                <View style={styles.wrap}>
                  <Pressable testID="catalog-new-style-save" onPress={() => addStyle(g.type)} disabled={busy === "add"} style={styles.darkBtn}><Text style={styles.darkText}>Add style</Text></Pressable>
                  <Pressable onPress={() => setAdding(null)} style={styles.outlineBtnSm}><Text style={styles.outlineText}>Cancel</Text></Pressable>
                </View>
              </View>
            ) : (
              <Pressable testID={`catalog-add-style-${g.type}`} onPress={() => setAdding(g.type)} style={styles.outlineBtnSm}>
                <Feather name="plus" size={14} color={colors.onSurface} />
                <Text style={styles.outlineText}>Add your own style</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.saveBar}>
        <Text style={styles.hint}>{dirty ? "You have unsaved changes" : "All changes saved"}</Text>
        <Pressable testID="catalog-save-button" onPress={save} disabled={!dirty || !!busy} style={[styles.darkBtn, (!dirty || !!busy) && { opacity: 0.5 }]}>
          {busy === "save" ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.darkText}>Save catalog</Text>}
        </Pressable>
      </View>

      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.scrim} onPress={() => setPicker(null)}>
          <Pressable style={[styles.sheet, wide && styles.sheetWide]} onPress={() => null} testID="catalog-image-picker">
            <View style={styles.groupHead}>
              <Text style={styles.h3}>{picker?.label}</Text>
              <Pressable onPress={() => setPicker(null)} hitSlop={8} style={styles.iconBtn} testID="catalog-picker-close"><Feather name="x" size={20} color={colors.onSurface} /></Pressable>
            </View>
            <Pressable testID="catalog-upload-brand-button" disabled={!!busy} onPress={() => picker && setImage(picker.key, { upload: true })} style={styles.darkBtn}>
              {busy === picker?.key ? <ActivityIndicator color={colors.onSurfaceInverse} /> : (
                <><Feather name="upload" size={14} color={colors.onSurfaceInverse} /><Text style={styles.darkText}>Upload brand photo</Text></>
              )}
            </Pressable>
            <Pressable testID="catalog-use-default-button" disabled={!!busy} onPress={() => picker && setImage(picker.key, { source: "default" })} style={styles.outlineBtn}>
              <Text style={styles.outlineText}>{picker?.key.includes(":") && !picker.key.startsWith("home") && !picker.key.startsWith("type") ? "Use AI studio image" : "Use default image"}</Text>
            </Pressable>
            <Text style={[styles.label, { marginTop: spacing.lg }]}>STOCK LIBRARY</Text>
            <View style={styles.wrap}>
              {data.stock.map((s) => (
                <Pressable key={s.id} testID={`catalog-stock-${s.id}`} disabled={!!busy} onPress={() => picker && setImage(picker.key, { source: "stock", url: s.url })} style={styles.stock}>
                  <Image source={{ uri: s.url }} style={styles.stockImg} contentFit="cover" />
                  <Text style={styles.stockLabel} numberOfLines={1}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.lg },
  contentWide: { padding: spacing["2xl"], maxWidth: 1200, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", alignItems: "flex-end" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface, marginTop: spacing.xs },
  h3: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted, marginTop: spacing.xs },
  hint: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.8, color: c.onSurface },
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md },
  groupHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  typeCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, minWidth: 220, flexGrow: 1, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: c.border },
  typeOn: { borderColor: c.brand, backgroundColor: c.brandTertiary },
  typeName: { fontFamily: fonts.display, fontSize: 17, color: c.onSurface },
  typeSub: { fontFamily: fonts.text, fontSize: 12, color: c.muted, marginTop: 2 },
  tile: { borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: "hidden", backgroundColor: c.surface },
  tileImg: { width: "100%", aspectRatio: 1, backgroundColor: c.surfaceSecondary },
  tileEmpty: { alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", left: 6, top: 6, paddingHorizontal: 8, height: 22, borderRadius: radius.pill, backgroundColor: c.surface, justifyContent: "center" },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: c.onSurface },
  editIcon: { position: "absolute", right: 6, top: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" },
  tileFoot: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, minHeight: 48 },
  tileName: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  chipRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.sm, height: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: c.borderStrong },
  chipName: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  saveBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  darkBtn: { flexDirection: "row", gap: spacing.sm, height: 48, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  darkText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  outlineBtn: { height: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  outlineBtnSm: { flexDirection: "row", gap: spacing.sm, alignSelf: "flex-start", height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center" },
  addForm: { gap: spacing.sm, maxWidth: 520 },
  input: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  outlineText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  msg: { padding: spacing.lg, borderRadius: radius.md },
  msgText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSuccess },
  scrim: { flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", maxHeight: "85%", backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  sheetWide: { width: 560, borderRadius: radius.lg, marginBottom: "auto", marginTop: "auto" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  stock: { width: 120 },
  stockImg: { width: 120, height: 120, borderRadius: radius.sm, backgroundColor: c.surfaceSecondary },
  stockLabel: { fontFamily: fonts.text, fontSize: 11, color: c.muted, marginTop: 4 },
}));
