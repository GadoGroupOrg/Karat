import Feather from "@react-native-vector-icons/feather";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Lead, LeadStatus, assetUrl, dashRequest, formatPrice, leadImage, useCatalog, usePrice } from "@/src/api";
import { useAuth } from "@/src/auth";
import { CraftingBrief } from "@/src/components/admin/crafting-brief";
import { LeadFiles } from "@/src/components/admin/lead-files";
import { WIDE } from "@/src/components/admin/shell";
import { STATUSES, StatusPill, formatDateTime, useStatusColor } from "@/src/components/admin/status";
import { useDashQuery } from "@/src/components/admin/use-dash";
import { designRows } from "@/src/design-rows";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function LeadDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lead, isLoading, isError } = useDashQuery<Lead>(["lead", id], `/leads/${id}`);
  const { data: catalog } = useCatalog();
  const price = usePrice(lead?.design ?? null);
  const statusColor = useStatusColor();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (key: string, path: string, init: RequestInit) => {
    setBusy(key);
    setError(null);
    try {
      const updated = await dashRequest<Lead>(token!, path, init);
      qc.setQueryData(["dash", "lead", id], updated);
      qc.invalidateQueries({ queryKey: ["dash", "leads"] });
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };
  const setStatus = (s: LeadStatus) => mutate(s, `/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status: s }) });
  const addNote = async () => {
    if (!note.trim()) return;
    if (await mutate("note", `/leads/${id}/notes`, { method: "POST", body: JSON.stringify({ text: note.trim() }) })) setNote("");
  };
  const back = () => (router.canGoBack() ? router.back() : router.replace("/admin"));

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;
  if (isError || !lead) {
    return (
      <View style={styles.center} testID="lead-not-found">
        <Text style={styles.h1}>Lead not found</Text>
        <Pressable onPress={back} style={styles.outlineBtn}><Text style={styles.outlineText}>Back to leads</Text></Pressable>
      </View>
    );
  }

  const img = leadImage(lead);
  const spec = lead.design && catalog ? designRows(catalog, lead.design, price.data?.lines ?? []) : null;
  const pieceTitle = lead.kind === "product" ? lead.product?.title ?? "Store product"
    : lead.design?.name?.trim() || (lead.sketch?.uploaded ? "Redesign of customer’s photo" : `Custom ${spec?.typeName.toLowerCase() ?? "design"}`);
  const saveBrief = (brief: Record<string, string>) => mutate("brief", `/leads/${id}/brief`, { method: "PUT", body: JSON.stringify({ brief }) });
  const brief = <><CraftingBrief brief={lead.brief} updatedBy={lead.brief_updated_by} busy={busy === "brief"} onSave={saveBrief} /><LeadFiles lead={lead} /></>;
  const pieceRows: [string, string][] = spec?.rows ?? (lead.product ? [["Type", lead.product.product_type], ["Store price", formatPrice(lead.product.price)]] : []);

  const piece = (
    <View style={styles.panel} testID="lead-piece-panel">
      {img ? <Image source={{ uri: img }} style={styles.hero} contentFit="cover" testID="lead-image" /> : (
        <View style={[styles.hero, styles.heroEmpty]}><Feather name="hexagon" size={32} color={colors.brandPrimary} /><Text style={styles.muted}>No studio photo saved with this request</Text></View>
      )}
      <View style={{ padding: spacing.xl }}>
        <Text style={styles.eyebrow}>{lead.kind === "product" ? "TRY-ON ENQUIRY" : lead.kind === "sketch" ? (lead.sketch?.uploaded ? "PHOTO REDESIGN" : "SKETCH REQUEST") : "CUSTOM DESIGN"}</Text>
        <Text style={styles.h2} testID="lead-piece-title">{pieceTitle}</Text>
        <Text style={styles.price}>{lead.price ? `Est. ${formatPrice(lead.price)}` : "Price to be quoted"}</Text>
        <View style={styles.table}>
          {pieceRows.map(([k, v]) => (
            <View key={k} style={styles.tr}><Text style={styles.tk}>{k}</Text><Text style={styles.tv}>{v}</Text></View>
          ))}
        </View>
        {lead.sketch && (
          <View style={styles.quote} testID="lead-sketch">
            <Text style={styles.quoteLabel}>{lead.sketch.uploaded ? "Customer’s photo with mark-up" : "Customer’s sketch"}</Text>
            <Image source={{ uri: assetUrl(lead.sketch.sketch_url) }} style={{ width: "100%", aspectRatio: 1, borderRadius: radius.sm, marginTop: spacing.sm }} contentFit="contain" />
            {!!lead.sketch.note && <Text style={styles.quoteText}>“{lead.sketch.note}”</Text>}
          </View>
        )}
        {lead.product?.url && (
          <Pressable onPress={() => WebBrowser.openBrowserAsync(lead.product!.url)} style={styles.outlineBtn} testID="lead-view-product-button">
            <Feather name="external-link" size={14} color={colors.onSurface} />
            <Text style={styles.outlineText}>View product in store</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const customer = (
    <View style={[styles.panel, { padding: spacing.xl }]} testID="lead-customer-panel">
      <Text style={styles.eyebrow}>CUSTOMER</Text>
      <Text style={styles.h2} testID="lead-customer-name">{lead.name}</Text>
      <Text style={styles.muted}>{lead.email}{lead.phone ? ` · ${lead.phone}` : ""}</Text>
      <Text style={styles.muted}>Received {formatDateTime(lead.created_at)} via {lead.source === "embed" ? "website" : "app"}</Text>
      <View style={styles.btnRow}>
        <Pressable testID="lead-email-button" onPress={() => Linking.openURL(`mailto:${lead.email}?subject=${encodeURIComponent(`Your ${pieceTitle}`)}`)} style={styles.darkBtn}>
          <Feather name="mail" size={14} color={colors.onSurfaceInverse} />
          <Text style={styles.darkText}>Email</Text>
        </Pressable>
        {!!lead.phone && (
          <Pressable testID="lead-call-button" onPress={() => Linking.openURL(`tel:${lead.phone}`)} style={styles.outlineBtnSm}>
            <Feather name="phone" size={14} color={colors.onSurface} />
            <Text style={styles.outlineText}>Call</Text>
          </Pressable>
        )}
      </View>
      {!!lead.note && (
        <View style={styles.quote}>
          <Text style={styles.quoteLabel}>Customer note</Text>
          <Text style={styles.quoteText}>{lead.note}</Text>
        </View>
      )}

      <Text style={[styles.eyebrow, { marginTop: spacing.xl }]}>STATUS</Text>
      <View style={styles.statusRow}>
        {STATUSES.map((s) => {
          const sel = lead.status === s.id;
          const c = statusColor(s.id);
          return (
            <Pressable key={s.id} testID={`lead-status-${s.id}`} disabled={!!busy} onPress={() => !sel && setStatus(s.id)}
              style={[styles.statusBtn, sel && { backgroundColor: c.bg, borderColor: c.bg }]}>
              {busy === s.id ? <ActivityIndicator size="small" color={colors.onSurface} /> : (
                <Text style={[styles.statusText, sel && { color: c.fg }]}>{s.label}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.eyebrow, { marginTop: spacing.xl }]}>NOTES & ACTIVITY</Text>
      <View style={styles.noteBox}>
        <TextInput testID="lead-note-input" value={note} onChangeText={setNote} placeholder="Add a private note (call outcome, quote sent…)"
          placeholderTextColor={colors.muted} multiline style={styles.noteInput} />
        <Pressable testID="lead-add-note-button" disabled={busy === "note" || !note.trim()} onPress={addNote}
          style={[styles.darkBtn, { alignSelf: "flex-end" }, (!note.trim() || busy === "note") && { opacity: 0.5 }]}>
          {busy === "note" ? <ActivityIndicator size="small" color={colors.onSurfaceInverse} /> : <Text style={styles.darkText}>Add note</Text>}
        </Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={{ marginTop: spacing.md }} testID="lead-notes-list">
        {[...lead.notes].reverse().map((n) => (
          <View key={n.id} style={styles.noteItem}>
            <View style={[styles.dot, n.system && { backgroundColor: colors.borderStrong }]} />
            <View style={{ flex: 1 }}>
              <Text style={n.system ? styles.sysText : styles.noteText}>{n.text}</Text>
              <Text style={styles.noteMeta}>{n.author} · {formatDateTime(n.created_at)}</Text>
            </View>
          </View>
        ))}
        <View style={styles.noteItem}>
          <View style={[styles.dot, { backgroundColor: colors.brand }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sysText}>Request received</Text>
            <Text style={styles.noteMeta}>{formatDateTime(lead.created_at)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, wide && styles.contentWide]} testID="admin-lead-detail-screen">
      <View style={styles.topRow}>
        <Pressable testID="lead-back-button" onPress={back} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={16} color={colors.onSurface} />
          <Text style={styles.outlineText}>All leads</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Pressable testID="lead-job-sheet-button" onPress={() => router.push(`/job-sheet/${id}` as never)} style={styles.outlineBtnSm}>
            <Feather name="printer" size={14} color={colors.onSurface} />
            <Text style={styles.outlineText}>Job sheet</Text>
          </Pressable>
          <StatusPill status={lead.status} />
        </View>
      </View>
      {wide ? (
        <View style={{ flexDirection: "row", gap: spacing.xl, alignItems: "flex-start" }}>
          <View style={{ flex: 1.1 }}>{piece}{brief}</View>
          <View style={{ flex: 1 }}>{customer}</View>
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>{customer}{piece}{brief}</View>
      )}
    </KeyboardAwareScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  contentWide: { padding: spacing["2xl"], maxWidth: 1200, width: "100%", alignSelf: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  backBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44 },
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  hero: { width: "100%", aspectRatio: 1.2, backgroundColor: c.surfaceSecondary },
  heroEmpty: { alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: c.brandTertiary },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface },
  h2: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface, marginTop: spacing.xs },
  price: { fontFamily: fonts.medium, fontSize: 18, color: c.brandPrimary, marginTop: spacing.xs },
  muted: { fontFamily: fonts.text, fontSize: 13, color: c.muted, marginTop: spacing.xs },
  table: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: c.divider },
  tr: { flexDirection: "row", justifyContent: "space-between", gap: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  tk: { fontFamily: fonts.text, fontSize: 13, color: c.muted },
  tv: { flex: 1, textAlign: "right", fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  btnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  darkBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  darkText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  outlineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 44, marginTop: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: spacing.xl },
  outlineBtnSm: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: spacing.xl },
  outlineText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  quote: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.md, backgroundColor: c.surfaceSecondary },
  quoteLabel: { fontFamily: fonts.bold, fontSize: 11, color: c.muted },
  quoteText: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.onSurface, marginTop: spacing.xs },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  statusBtn: { minWidth: 92, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  statusText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  noteBox: { marginTop: spacing.sm, gap: spacing.sm },
  noteInput: { minHeight: 80, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, padding: spacing.md, fontFamily: fonts.text, fontSize: 14, color: c.onSurface, textAlignVertical: "top" },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error, marginTop: spacing.sm },
  noteItem: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.onSurface, marginTop: 6 },
  noteText: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.onSurface },
  sysText: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
  noteMeta: { fontFamily: fonts.text, fontSize: 11, color: c.muted, marginTop: 2 },
}));
