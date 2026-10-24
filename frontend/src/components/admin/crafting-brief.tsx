import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type BriefField = { key: string; label: string; placeholder?: string; options?: string[]; wide?: boolean };
export type BriefSection = { title: string; hint: string; fields: BriefField[] };

/** Consultation spec built around ring anatomy (centre stone → head → shoulders → shank → sizing area) and GIA grading. */
export const BRIEF_SECTIONS: BriefSection[] = [
  { title: "Client & sizing", hint: "Fit and timing", fields: [
    { key: "ring_size", label: "Ring size", placeholder: "e.g. US 6.25 / UK M" },
    { key: "finger_notes", label: "Finger / knuckle notes", placeholder: "e.g. large knuckle, wide finger" },
    { key: "sizing_area", label: "Base / sizing area", options: ["Standard round", "Sizing beads", "Sizing bar", "Square base", "Flat comfort base"] },
    { key: "due_date", label: "Needed by", placeholder: "e.g. 14 Feb 2027" },
    { key: "budget", label: "Agreed budget", placeholder: "e.g. $6,500–7,000" },
  ] },
  { title: "Centre stone", hint: "GIA 4Cs and report", fields: [
    { key: "cs_type", label: "Stone type", options: ["Natural diamond", "Lab-grown diamond", "Sapphire", "Emerald", "Ruby", "Moissanite", "Other gem"] },
    { key: "cs_shape", label: "Shape", options: ["Round", "Oval", "Cushion", "Emerald", "Pear", "Marquise", "Princess", "Radiant", "Asscher", "Heart"] },
    { key: "center_stone_mm", label: "Measurements (mm)", placeholder: "e.g. 8.05 × 6.02 × 3.71" },
    { key: "carat", label: "Carat weight", placeholder: "e.g. 1.52 ct" },
    { key: "cs_color", label: "Colour", options: ["D", "E", "F", "G", "H", "I", "J", "K–M", "Fancy"] },
    { key: "cs_clarity", label: "Clarity", options: ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1–I3"] },
    { key: "cs_cut", label: "Cut grade", options: ["Excellent", "Very Good", "Good", "Fair", "Poor"] },
    { key: "cs_lab", label: "Grading lab", options: ["GIA", "IGI", "GCAL", "AGL", "Gübelin", "Not certified"] },
    { key: "cs_report", label: "Report number", placeholder: "e.g. GIA 2141234567" },
    { key: "cs_origin", label: "Origin / treatment", placeholder: "e.g. Colombian, minor oil" },
  ] },
  { title: "Head & setting", hint: "Prongs, halo, gallery, bridge", fields: [
    { key: "prong_count", label: "Prongs / setting", options: ["4 prong", "6 prong", "8 prong", "Bezel", "Half bezel", "Tension"] },
    { key: "prong_style", label: "Prong style", options: ["Claw", "Round", "Tab", "Double claw", "V-tip", "Eagle claw"] },
    { key: "halo_spec", label: "Halo", options: ["None", "Single", "Double", "Floating"] },
    { key: "hidden_halo_spec", label: "Hidden halo", options: ["None", "Pavé", "Micro-pavé", "Two-row"] },
    { key: "gallery_style", label: "Gallery", options: ["Open", "Basket", "Trellis", "Filigree", "Scroll"] },
    { key: "gallery_rail", label: "Gallery rail", options: ["None", "Plain", "Pavé", "Milgrain"] },
    { key: "bridge", label: "Bridge", options: ["None", "Plain", "Pavé", "Engraved"] },
    { key: "cathedral", label: "Cathedral", options: ["None", "Low", "High", "Split"] },
    { key: "setting_height_mm", label: "Setting height (mm)", placeholder: "e.g. 6.5, sits flush with band" },
  ] },
  { title: "Shoulders, accents & shank", hint: "Band build", fields: [
    { key: "shoulder_style", label: "Shoulders", options: ["Plain", "Pavé", "Split", "Twisted", "Tapered", "Knife edge"] },
    { key: "accent_spec", label: "Accent stones", placeholder: "e.g. 36 × 1.2 mm, F/G VS, 0.25 ctw" },
    { key: "accent_setting", label: "Accent setting", options: ["Micro-pavé", "Pavé", "French pavé", "Channel", "Bead-set", "Bar"] },
    { key: "shank_style", label: "Shank", options: ["Straight", "Tapered", "Cathedral", "Split", "Twisted", "Bypass"] },
    { key: "band_width_mm", label: "Band width (mm)", placeholder: "e.g. 2.0 tapering to 1.8" },
    { key: "band_thickness_mm", label: "Band thickness (mm)", placeholder: "e.g. 1.6" },
    { key: "profile_fit", label: "Profile & fit", options: ["Comfort fit", "Flat", "Court", "D-shape", "Knife edge", "European"] },
    { key: "metal_spec", label: "Metal & alloy", placeholder: "e.g. 18k yellow, platinum head" },
    { key: "finish", label: "Finish", options: ["High polish", "Satin", "Brushed", "Hammered", "Milgrain edges"] },
    { key: "engraving", label: "Engraving", placeholder: "Text, font, position" },
  ] },
  { title: "Workshop", hint: "For the bench / CAD team", fields: [
    { key: "crafting_notes", label: "Crafting notes", placeholder: "Anything the bench or CAD team must know", wide: true },
  ] },
];
const ALL = BRIEF_SECTIONS.flatMap((s) => s.fields);

type Props = { brief?: Record<string, string>; updatedBy?: string; busy: boolean; onSave: (brief: Record<string, string>) => Promise<boolean> };

/** Jeweller's consultation designer on a lead: full anatomy + gem spec for the workshop. */
export function CraftingBrief({ brief, updatedBy, busy, onSave }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [form, setForm] = useState<Record<string, string>>(brief ?? {});
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm(brief ?? {}), [brief]);
  const dirty = ALL.some((f) => (form[f.key] ?? "") !== (brief?.[f.key] ?? ""));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (await onSave(form)) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <View style={styles.panel} testID="lead-crafting-brief">
      <Text style={styles.eyebrow}>CONSULTATION DESIGNER · CRAFTING BRIEF</Text>
      <Text style={styles.sub}>Full spec for the workshop, built around ring anatomy and GIA grading. Only your team sees this.{updatedBy ? ` Last updated by ${updatedBy}.` : ""}</Text>
      {BRIEF_SECTIONS.map((sec) => (
        <View key={sec.title} style={styles.section} testID={`brief-section-${sec.title}`}>
          <Text style={styles.h4}>{sec.title} <Text style={styles.hint}>· {sec.hint}</Text></Text>
          <View style={styles.grid}>
            {sec.fields.map((f) => (
              <View key={f.key} style={[styles.field, (f.wide || f.options) && styles.fieldWide]}>
                <Text style={styles.label}>{f.label}</Text>
                {f.options && (
                  <View style={styles.chips}>
                    {f.options.map((o) => {
                      const sel = form[f.key] === o;
                      return (
                        <Pressable key={o} testID={`brief-${f.key}-${o}`} onPress={() => set(f.key, sel ? "" : o)} style={[styles.chip, sel && styles.chipSel]}>
                          <Text style={[styles.chipText, sel && { color: colors.onSurfaceInverse }]}>{o}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {(!f.options || (form[f.key] && !f.options.includes(form[f.key]))) ? (
                  <TextInput testID={`brief-${f.key}`} value={form[f.key] ?? ""} onChangeText={(v) => set(f.key, v)}
                    placeholder={f.placeholder ?? "Custom…"} placeholderTextColor={colors.muted} multiline={f.wide} maxLength={1000}
                    style={[styles.input, f.wide && styles.inputWide]} />
                ) : (
                  <Pressable testID={`brief-${f.key}-custom`} onPress={() => set(f.key, " ")} hitSlop={6}><Text style={styles.custom}>+ Custom</Text></Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
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
  section: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.divider },
  h4: { fontFamily: fonts.display, fontSize: 17, color: c.onSurface },
  hint: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  field: { flexGrow: 1, flexBasis: 220, gap: spacing.xs },
  fieldWide: { flexBasis: "100%" },
  label: { fontFamily: fonts.bold, fontSize: 12, color: c.onSurface },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, justifyContent: "center" },
  chipSel: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurface },
  custom: { fontFamily: fonts.bold, fontSize: 12, color: c.muted, minHeight: 44, textAlignVertical: "center", lineHeight: 44 },
  input: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  inputWide: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" },
  btn: { alignSelf: "flex-start", height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  btnText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
}));
