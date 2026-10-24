import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const FIELDS: { key: string; label: string; placeholder: string; wide?: boolean }[] = [
  { key: "ring_size", label: "Ring size", placeholder: "e.g. US 6.25 / UK M" },
  { key: "finger_notes", label: "Finger / knuckle notes", placeholder: "e.g. large knuckle, sizing beads" },
  { key: "metal_spec", label: "Metal & alloy", placeholder: "e.g. 18k yellow, platinum head" },
  { key: "center_stone_mm", label: "Centre stone (mm)", placeholder: "e.g. 8.0 × 6.0 oval" },
  { key: "carat", label: "Carat / grade", placeholder: "e.g. 1.50 ct, F VS1" },
  { key: "accent_spec", label: "Accent stones", placeholder: "e.g. 24 × 1.3 mm melee" },
  { key: "band_width_mm", label: "Band width (mm)", placeholder: "e.g. 2.0 tapering to 1.8" },
  { key: "band_thickness_mm", label: "Band thickness (mm)", placeholder: "e.g. 1.6" },
  { key: "setting_height_mm", label: "Setting height (mm)", placeholder: "e.g. 6.5, low profile" },
  { key: "profile_fit", label: "Profile & fit", placeholder: "e.g. comfort fit, knife edge" },
  { key: "finish", label: "Finish", placeholder: "e.g. high polish, brushed band" },
  { key: "engraving", label: "Engraving", placeholder: "Text, font, position" },
  { key: "due_date", label: "Needed by", placeholder: "e.g. 14 Feb 2027" },
  { key: "budget", label: "Agreed budget", placeholder: "e.g. $6,500–7,000" },
  { key: "crafting_notes", label: "Crafting notes", placeholder: "Anything the bench / CAD team must know", wide: true },
];

type Props = { brief?: Record<string, string>; updatedBy?: string; busy: boolean; onSave: (brief: Record<string, string>) => Promise<boolean> };

/** Jeweller's workshop brief on a lead: sizing specs and crafting details. */
export function CraftingBrief({ brief, updatedBy, busy, onSave }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [form, setForm] = useState<Record<string, string>>(brief ?? {});
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm(brief ?? {}), [brief]);
  const dirty = FIELDS.some((f) => (form[f.key] ?? "") !== (brief?.[f.key] ?? ""));

  const save = async () => {
    if (await onSave(form)) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <View style={styles.panel} testID="lead-crafting-brief">
      <Text style={styles.eyebrow}>CRAFTING BRIEF</Text>
      <Text style={styles.sub}>Sizing and specs for the workshop. Only your team sees this.{updatedBy ? ` Last updated by ${updatedBy}.` : ""}</Text>
      <View style={styles.grid}>
        {FIELDS.map((f) => (
          <View key={f.key} style={[styles.field, f.wide && styles.fieldWide]}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput testID={`brief-${f.key}`} value={form[f.key] ?? ""} onChangeText={(v) => setForm({ ...form, [f.key]: v })}
              placeholder={f.placeholder} placeholderTextColor={colors.muted} multiline={f.wide} maxLength={1000}
              style={[styles.input, f.wide && styles.inputWide]} />
          </View>
        ))}
      </View>
      <Pressable testID="brief-save-button" onPress={save} disabled={busy || !dirty} style={[styles.btn, (busy || (!dirty && !saved)) && { opacity: 0.5 }]}>
        {busy ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.btnText}>{saved ? "Saved" : "Save brief"}</Text>}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md, marginTop: spacing.lg },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  sub: { fontFamily: fonts.text, fontSize: 13, color: c.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  field: { flexGrow: 1, flexBasis: 220, gap: spacing.xs },
  fieldWide: { flexBasis: "100%" },
  label: { fontFamily: fonts.bold, fontSize: 12, color: c.onSurface },
  input: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  inputWide: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" },
  btn: { alignSelf: "flex-start", height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  btnText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
}));
