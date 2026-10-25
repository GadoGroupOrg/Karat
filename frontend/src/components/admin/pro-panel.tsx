import Feather from "@react-native-vector-icons/feather";
import { Pressable, Text, TextInput, View } from "react-native";

import { formatPrice } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type ProLine = { label: string; amount: string };
export type ProState = { sizes: Record<string, string>; lines: ProLine[]; override: string; note: string };
export const emptyPro: ProState = { sizes: {}, lines: [], override: "", note: "" };

const SIZE_FIELDS: { key: string; label: string; placeholder: string; types?: string[] }[] = [
  { key: "carat", label: "Centre stone (ct)", placeholder: "e.g. 1.37", types: ["ring"] },
  { key: "center_stone_mm", label: "Stone size (mm)", placeholder: "e.g. 7.20 × 7.22", types: ["ring"] },
  { key: "ring_size", label: "Ring size", placeholder: "e.g. US 6.25", types: ["ring", "band"] },
  { key: "band_width_mm", label: "Band width (mm)", placeholder: "e.g. 1.8", types: ["ring", "band"] },
  { key: "band_thickness_mm", label: "Band thickness (mm)", placeholder: "e.g. 1.6", types: ["ring", "band"] },
];

const num = (v: string) => {
  const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Final quoted price: manual total if set, else estimate + custom lines. */
export function quotedTotal(p: ProState, estimate: number) {
  const o = num(p.override);
  if (o != null) return Math.round(o);
  return estimate + p.lines.reduce((s, l) => s + Math.round(num(l.amount) ?? 0), 0);
}

export function pricingBody(p: ProState) {
  const lines = p.lines.filter((l) => l.label.trim() && num(l.amount) != null).map((l) => ({ label: l.label.trim(), amount: Math.round(num(l.amount)!) }));
  const o = num(p.override);
  return { lines, total_override: o != null ? Math.max(0, Math.round(o)) : null, note: p.note.trim() };
}

/** Staff-only Pro builder controls: exact measurements + custom pricing for a lead. */
export function ProPanel({ type, value, onChange, estimate }: { type: string; value: ProState; onChange: (p: ProState) => void; estimate: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const fields = SIZE_FIELDS.filter((f) => !f.types || f.types.includes(type));
  const setSize = (k: string, v: string) => onChange({ ...value, sizes: { ...value.sizes, [k]: v } });
  const setLine = (i: number, patch: Partial<ProLine>) => onChange({ ...value, lines: value.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const input = (props: React.ComponentProps<typeof TextInput>) => <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />;

  return (
    <View style={styles.panel} testID="pro-panel">
      <View style={styles.head}>
        <Feather name="tool" size={14} color={colors.brandPrimary} />
        <Text style={styles.eyebrow}>PRO BUILDER · STAFF ONLY</Text>
      </View>

      {fields.length > 0 && <>
        <Text style={styles.h}>Exact measurements</Text>
        <Text style={styles.sub}>Carat and band width update the 3D view. All values go on the crafting brief and job sheet.</Text>
        <View style={styles.grid}>
          {fields.map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              {input({ testID: `pro-size-${f.key}`, value: value.sizes[f.key] ?? "", onChangeText: (v) => setSize(f.key, v), placeholder: f.placeholder })}
            </View>
          ))}
        </View>
      </>}

      <Text style={[styles.h, { marginTop: spacing.lg }]}>Custom pricing</Text>
      <Text style={styles.sub}>Estimate {formatPrice(estimate)}. Add labour, rush or discount lines, or set the final price.</Text>
      {value.lines.map((l, i) => (
        <View key={i} style={styles.lineRow} testID={`pro-line-${i}`}>
          <View style={{ flex: 2 }}>{input({ testID: `pro-line-label-${i}`, value: l.label, onChangeText: (v) => setLine(i, { label: v }), placeholder: "e.g. Rush fee" })}</View>
          <View style={{ flex: 1 }}>{input({ testID: `pro-line-amount-${i}`, value: l.amount, onChangeText: (v) => setLine(i, { amount: v }), placeholder: "+250 / -100", keyboardType: "numbers-and-punctuation" })}</View>
          <Pressable testID={`pro-line-remove-${i}`} onPress={() => onChange({ ...value, lines: value.lines.filter((_, j) => j !== i) })} style={styles.iconBtn} accessibilityLabel="Remove line">
            <Feather name="x" size={16} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      <Pressable testID="pro-add-line-button" onPress={() => onChange({ ...value, lines: [...value.lines, { label: "", amount: "" }] })} style={styles.addBtn}>
        <Feather name="plus" size={14} color={colors.onSurface} />
        <Text style={styles.addText}>Add line item</Text>
      </Pressable>
      <View style={[styles.grid, { marginTop: spacing.md }]}>
        <View style={styles.field}>
          <Text style={styles.label}>Final price (optional)</Text>
          {input({ testID: "pro-override-input", value: value.override, onChangeText: (v) => onChange({ ...value, override: v }), placeholder: "Overrides the total", keyboardType: "numeric" })}
        </View>
        <View style={[styles.field, { flexBasis: "100%" }]}>
          <Text style={styles.label}>Quote note</Text>
          {input({ testID: "pro-note-input", value: value.note, onChangeText: (v) => onChange({ ...value, note: v }), placeholder: "e.g. Includes GIA stone sourced by us" })}
        </View>
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Quoted price</Text>
        <Text style={styles.total} testID="pro-quoted-total">{formatPrice(quotedTotal(value, estimate))}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  panel: { borderWidth: 1, borderColor: c.brandPrimary, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: c.surface, marginBottom: spacing.xl },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  h: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 12, color: c.muted, marginTop: 2, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  field: { flexGrow: 1, flexBasis: 140, gap: 4 },
  label: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurface },
  input: { height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  lineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", height: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong },
  addText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.divider },
  totalLabel: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
  total: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface },
}));
