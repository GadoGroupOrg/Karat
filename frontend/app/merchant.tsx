import Feather from "@react-native-vector-icons/feather";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { adminCsv, adminRequest, formatPrice } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Num = Record<string, number>;
type Sheet = {
  gold: { mode: "live" | "manual"; manual_cost_per_gram: number; casting_loss_pct: number; live_spot_usd_oz: number | null; live_updated_at: string | null };
  markups: Num; min_margin_pct: number; accent_cost_per_ct: number; grades: Num;
  stones: Record<string, number[]>;
  labor: { setting: Num; band: Num; shape: Num; engraving: number; base: number };
  grams: { setting: Num; band: Num }; accent_ct: { setting: Num; band: Num }; accent_shape_factor: Num;
  updated_at?: string;
};
type SheetResp = { sheet: Sheet; bracket_labels: string[]; gold_cost_per_gram: number; names: Record<string, Record<string, string>> };
type Preview = { total: number; admin: { cost: number; margin_pct: number; min_margin_applied: boolean; gold_grams: number; gold_cost_per_gram: number } };

const SAMPLE = {
  type: "ring", styleId: "halo", metalId: "yellow-gold", sizeId: "6", addonIds: ["ring-colombian-emerald"], engraving: "", name: "",
  options: { carat: "1", band: "partial-pave", shape: "oval", accent_shape: "round", quality: "fine" },
};

export default function Merchant() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<SheetResp | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>("gold");

  const load = useCallback(async (p: string) => {
    const r = await adminRequest<SheetResp>(p, "/price-sheet");
    setData(r);
    setSheet(r.sheet);
    setPreview(await adminRequest<Preview>(p, "/quote-preview", { method: "POST", body: JSON.stringify(SAMPLE) }));
  }, []);

  const act = async (name: string, fn: () => Promise<string>) => {
    setBusy(name);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const login = () => act("login", async () => {
    await adminRequest(pin, "/verify");
    await load(pin);
    setAuthed(true);
    return "Unlocked";
  });

  const save = () => act("save", async () => {
    await adminRequest(pin, "/price-sheet", { method: "PUT", body: JSON.stringify({ sheet }) });
    await load(pin);
    await qc.invalidateQueries({ queryKey: ["price"] });
    return "Saved: customer quotes updated live";
  });

  const refreshGold = () => act("gold", async () => {
    const r = await adminRequest<{ spot: number }>(pin, "/gold/refresh", { method: "POST" });
    await load(pin);
    await qc.invalidateQueries({ queryKey: ["price"] });
    return `Spot gold ${formatPrice(r.spot)}/oz`;
  });

  const exportCsv = () => act("export", async () => {
    const text = await adminCsv(pin);
    if (Platform.OS === "web") {
      const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "atelier-price-sheet.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const f = new File(Paths.cache, "atelier-price-sheet.csv");
      if (f.exists) f.delete();
      f.create();
      f.write(text);
      await Sharing.shareAsync(f.uri, { mimeType: "text/csv", dialogTitle: "Price sheet" });
    }
    return "Price sheet exported";
  });

  const importCsv = () => act("import", async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/comma-separated-values", "text/plain", "*/*"], copyToCacheDirectory: true });
    if (res.canceled) return "Import cancelled";
    const asset = res.assets[0];
    const text = Platform.OS === "web" ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
    const r = await adminRequest<{ rows: number }>(pin, "/price-sheet/csv", { method: "POST", body: JSON.stringify({ csv: text }) });
    await load(pin);
    await qc.invalidateQueries({ queryKey: ["price"] });
    return `Imported ${r.rows} price rows`;
  });

  useEffect(() => () => setPin(""), []);

  const set = (fn: (s: Sheet) => void) => setSheet((s) => {
    if (!s) return s;
    const c = JSON.parse(JSON.stringify(s)) as Sheet;
    fn(c);
    return c;
  });

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.root} testID="merchant-screen">
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="merchant-close-button" onPress={close} hitSlop={10} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
        {authed && (
          <Pressable testID="merchant-save-button" onPress={save} disabled={!!busy} style={styles.saveBtn}>
            {busy === "save" ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.saveText}>Save prices</Text>}
          </Pressable>
        )}
      </View>
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing["2xl"] }]}>
        <Text style={styles.eyebrow}>MERCHANT</Text>
        <Text style={styles.h1}>Price sheet</Text>
        <Text style={styles.lead}>Supplier costs and markups. Customers only ever see retail prices.</Text>

        {!authed || !sheet || !data ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <TextInput testID="merchant-pin-input" value={pin} onChangeText={setPin} placeholder="Merchant PIN" placeholderTextColor={colors.muted}
              secureTextEntry keyboardType="number-pad" style={styles.input} onSubmitEditing={login} returnKeyType="go" />
            <Pressable testID="merchant-unlock-button" onPress={login} disabled={!pin || !!busy} style={[styles.primaryBtn, (!pin || !!busy) && { opacity: 0.5 }]}>
              {busy === "login" ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.primaryText}>Unlock</Text>}
            </Pressable>
          </View>
        ) : (
          <>
            {preview && (
              <View style={styles.previewCard} testID="merchant-sample-quote">
                <Text style={styles.previewTitle}>Sample: 1 ct oval Colombian Emerald halo, partial pavé, size 6</Text>
                <View style={styles.previewRow}>
                  <Stat label="Cost" value={formatPrice(preview.admin.cost)} />
                  <Stat label="Retail" value={formatPrice(preview.total)} testID="merchant-sample-retail" />
                  <Stat label="Margin" value={`${preview.admin.margin_pct}%`} testID="merchant-sample-margin" />
                </View>
                <Text style={styles.previewMeta}>
                  {preview.admin.gold_grams} g 18k · gold cost {formatPrice(preview.admin.gold_cost_per_gram)}/g
                  {preview.admin.min_margin_applied ? " · minimum margin applied" : ""}
                </Text>
              </View>
            )}

            <View style={styles.csvRow}>
              <SmallBtn testID="merchant-export-csv-button" icon="download" label="Export CSV" busy={busy === "export"} onPress={exportCsv} />
              <SmallBtn testID="merchant-import-csv-button" icon="upload" label="Import CSV" busy={busy === "import"} onPress={importCsv} />
            </View>
            {msg && <Text style={[styles.msg, { color: msg.ok ? colors.success : colors.error }]} testID="merchant-message">{msg.text}</Text>}

            <Group id="gold" title="18k gold" open={open} setOpen={setOpen}>
              <View style={styles.modeRow}>
                {(["live", "manual"] as const).map((m) => (
                  <Pressable key={m} testID={`gold-mode-${m}`} onPress={() => set((s) => { s.gold.mode = m; })}
                    style={[styles.chip, sheet.gold.mode === m && styles.chipSel]}>
                    <Text style={[styles.chipText, sheet.gold.mode === m && styles.chipTextSel]}>{m === "live" ? "Live spot" : "Manual"}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.note} testID="gold-live-status">
                Spot {sheet.gold.live_spot_usd_oz ? `${formatPrice(sheet.gold.live_spot_usd_oz)}/oz` : "n/a"}
                {sheet.gold.live_updated_at ? ` · ${new Date(sheet.gold.live_updated_at).toLocaleString()}` : ""} · in use {formatPrice(data.gold_cost_per_gram)}/g
              </Text>
              <SmallBtn testID="gold-refresh-button" icon="refresh-cw" label="Refresh spot now" busy={busy === "gold"} onPress={refreshGold} />
              <NumField testID="gold-manual-input" label="Manual 18k cost / g" value={sheet.gold.manual_cost_per_gram} onChange={(v) => set((s) => { s.gold.manual_cost_per_gram = v; })} />
              <NumField testID="gold-loss-input" label="Casting & finishing loss %" value={sheet.gold.casting_loss_pct} onChange={(v) => set((s) => { s.gold.casting_loss_pct = v; })} />
            </Group>

            <Group id="markups" title="Markups & margin" open={open} setOpen={setOpen}>
              {Object.keys(sheet.markups).map((k) => (
                <NumField key={k} testID={`markup-${k}-input`} label={`${k.replace("_", " ")} markup %`} value={sheet.markups[k]} onChange={(v) => set((s) => { s.markups[k] = v; })} />
              ))}
              <NumField testID="min-margin-input" label="Store-wide minimum margin %" value={sheet.min_margin_pct} onChange={(v) => set((s) => { s.min_margin_pct = v; })} />
            </Group>

            <Group id="stones" title="Centre stone cost per carat" open={open} setOpen={setOpen}>
              {Object.keys(sheet.stones).map((sid) => (
                <View key={sid} style={styles.stoneBlock}>
                  <Text style={styles.stoneName}>{data.names.stones[sid] ?? sid}</Text>
                  <View style={styles.bracketGrid}>
                    {data.bracket_labels.map((lbl, i) => (
                      <NumField key={lbl} compact testID={`stone-${sid}-${i}-input`} label={`${lbl} ct`} value={sheet.stones[sid][i]}
                        onChange={(v) => set((s) => { s.stones[sid][i] = v; })} />
                    ))}
                  </View>
                </View>
              ))}
            </Group>

            <Group id="grades" title="Quality grades & accent diamonds" open={open} setOpen={setOpen}>
              {Object.keys(sheet.grades).map((g) => (
                <NumField key={g} testID={`grade-${g}-input`} label={`${g} multiplier ×`} value={sheet.grades[g]} onChange={(v) => set((s) => { s.grades[g] = v; })} />
              ))}
              <NumField testID="accent-cost-input" label="Accent diamond cost / ct" value={sheet.accent_cost_per_ct} onChange={(v) => set((s) => { s.accent_cost_per_ct = v; })} />
              {Object.keys(sheet.accent_shape_factor).map((k) => (
                <NumField key={k} testID={`accent-shape-${k}-input`} label={`${data.names.accent_shape[k] ?? k} accent ×`} value={sheet.accent_shape_factor[k]}
                  onChange={(v) => set((s) => { s.accent_shape_factor[k] = v; })} />
              ))}
            </Group>

            <Group id="labor" title="Labor costs" open={open} setOpen={setOpen}>
              <NumField testID="labor-base-input" label="Base (casting, polish, QC)" value={sheet.labor.base} onChange={(v) => set((s) => { s.labor.base = v; })} />
              <NumField testID="labor-engraving-input" label="Engraving" value={sheet.labor.engraving} onChange={(v) => set((s) => { s.labor.engraving = v; })} />
              {(["setting", "band", "shape"] as const).map((kind) => Object.keys(sheet.labor[kind]).map((k) => (
                <NumField key={`${kind}-${k}`} testID={`labor-${kind}-${k}-input`} label={`${kind}: ${data.names[kind]?.[k] ?? k}`} value={sheet.labor[kind][k]}
                  onChange={(v) => set((s) => { s.labor[kind][k] = v; })} />
              )))}
            </Group>

            <Group id="weights" title="Gold weight & pavé estimates" open={open} setOpen={setOpen}>
              <Text style={styles.note}>
                Settings are grams at 1.00 ct; heads scale with stone size. Bands are grams at size 6; weight scales with finger
                circumference (size 4 ≈ 0.90×, size 9 ≈ 1.15×). Casting loss is added on top.
              </Text>
              {(["setting", "band"] as const).map((kind) => Object.keys(sheet.grams[kind]).map((k) => (
                <View key={`${kind}-${k}`} style={styles.pair}>
                  <Text style={styles.pairLabel}>{data.names[kind]?.[k] ?? k}</Text>
                  <NumField compact testID={`grams-${kind}-${k}-input`} label="g" value={sheet.grams[kind][k]} onChange={(v) => set((s) => { s.grams[kind][k] = v; })} />
                  <NumField compact testID={`accentct-${kind}-${k}-input`} label="pavé ct" value={sheet.accent_ct[kind][k]} onChange={(v) => set((s) => { s.accent_ct[kind][k] = v; })} />
                </View>
              )))}
            </Group>
            {sheet.updated_at && <Text style={styles.note}>Last saved {new Date(sheet.updated_at).toLocaleString()}</Text>}
          </>
        )}
        {!authed && msg && !msg.ok && <Text style={[styles.msg, { color: colors.error }]} testID="merchant-error">{msg.text}</Text>}
      </KeyboardAwareScrollView>
    </View>
  );
}

function Group({ id, title, open, setOpen, children }: { id: string; title: string; open: string | null; setOpen: (v: string | null) => void; children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const isOpen = open === id;
  return (
    <View style={styles.group}>
      <Pressable testID={`merchant-group-${id}`} onPress={() => setOpen(isOpen ? null : id)} style={styles.groupHead}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.onSurface} />
      </Pressable>
      {isOpen && <View style={styles.groupBody}>{children}</View>}
    </View>
  );
}

function NumField({ label, value, onChange, testID, compact }: { label: string; value: number; onChange: (v: number) => void; testID: string; compact?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [text, setText] = useState(String(value ?? 0));
  useEffect(() => setText(String(value ?? 0)), [value]);
  return (
    <View style={compact ? styles.numCompact : styles.num}>
      <Text style={styles.numLabel} numberOfLines={1}>{label}</Text>
      <TextInput testID={testID} value={text} keyboardType="decimal-pad" placeholderTextColor={colors.muted}
        onChangeText={(t) => { setText(t); const n = parseFloat(t); if (!Number.isNaN(n)) onChange(n); }}
        style={[styles.numInput, compact && { width: "100%" }]} />
    </View>
  );
}

function SmallBtn({ icon, label, onPress, busy, testID }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; onPress: () => void; busy: boolean; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} disabled={busy} style={styles.smallBtn}>
      {busy ? <ActivityIndicator color={colors.onSurface} /> : <Feather name={icon} size={14} color={colors.onSurface} />}
      <Text style={styles.smallText}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  const styles = useStyles();
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} testID={testID}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  saveBtn: { height: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  saveText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurfaceInverse },
  body: { paddingHorizontal: spacing.xl },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.5, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface, marginTop: spacing.xs },
  lead: { fontFamily: fonts.text, fontSize: 14, color: c.muted, marginTop: spacing.sm },
  input: { height: 48, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface, borderWidth: 1, borderColor: c.border },
  primaryBtn: { height: 52, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  previewCard: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.md, backgroundColor: c.brandTertiary },
  previewTitle: { fontFamily: fonts.medium, fontSize: 12, color: c.onBrandTertiary },
  previewRow: { flexDirection: "row", marginTop: spacing.md },
  previewMeta: { fontFamily: fonts.text, fontSize: 12, color: c.onBrandTertiary, marginTop: spacing.sm },
  statLabel: { fontFamily: fonts.text, fontSize: 11, color: c.muted },
  statValue: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  csvRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, height: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, alignSelf: "flex-start" },
  smallText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
  msg: { fontFamily: fonts.medium, fontSize: 13, marginTop: spacing.md },
  group: { marginTop: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52, paddingHorizontal: spacing.lg, backgroundColor: c.surfaceSecondary },
  groupTitle: { fontFamily: fonts.display, fontSize: 17, color: c.onSurface },
  groupBody: { padding: spacing.lg, gap: spacing.md },
  modeRow: { flexDirection: "row", gap: spacing.sm },
  chip: { height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, justifyContent: "center" },
  chipSel: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  chipTextSel: { color: c.onSurfaceInverse },
  note: { fontFamily: fonts.text, fontSize: 12, lineHeight: 17, color: c.muted },
  num: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  numCompact: { width: "31%", gap: 2 },
  numLabel: { flexShrink: 1, fontFamily: fonts.text, fontSize: 13, color: c.onSurface, textTransform: "capitalize" },
  numInput: { width: 110, height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: spacing.md, fontFamily: fonts.medium, fontSize: 14, color: c.onSurface, textAlign: "right" },
  stoneBlock: { gap: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  stoneName: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  bracketGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pair: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  pairLabel: { flex: 1, fontFamily: fonts.text, fontSize: 13, color: c.onSurface, paddingBottom: spacing.sm },
}));
