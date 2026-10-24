import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type PlanSetting = { ai: Record<string, boolean>; monthly_limit: number | null };
const AI: [string, string][] = [["studio_photo", "Studio photo"], ["angle_views", "Angle views"], ["sketch", "Sketch to render"],
  ["redesign", "Photo redesign"], ["try_on", "Try-on"]];

/** Supplier console: which AI tools each plan includes + monthly AI image allowance. */
export function PlanSettings({ plans, onSave }: { plans: Record<string, PlanSetting>; onSave: (plan: string, s: PlanSetting) => Promise<void> }) {
  const styles = useStyles();
  return (
    <View style={styles.panel} testID="platform-plans">
      <Text style={styles.h3}>Plans & AI allowance</Text>
      <Text style={styles.sub}>Each business gets the AI tools of its plan. One AI image (studio photo, angle, sketch render, redesign or try-on) uses 1 credit; re-opening an existing image is free. Leave the limit blank for unlimited.</Text>
      {Object.entries(plans).map(([p, s]) => <PlanRow key={`${p}-${JSON.stringify(s)}`} plan={p} initial={s} onSave={onSave} />)}
    </View>
  );
}

function PlanRow({ plan, initial, onSave }: { plan: string; initial: PlanSetting; onSave: (plan: string, s: PlanSetting) => Promise<void> }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [ai, setAi] = useState(initial.ai);
  const [limit, setLimit] = useState(initial.monthly_limit == null ? "" : String(initial.monthly_limit));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(ai) !== JSON.stringify(initial.ai) || limit !== (initial.monthly_limit == null ? "" : String(initial.monthly_limit));
  const save = async () => {
    setBusy(true);
    await onSave(plan, { ai, monthly_limit: limit.trim() === "" ? null : Math.max(0, parseInt(limit, 10) || 0) }).finally(() => setBusy(false));
  };
  return (
    <View style={styles.row} testID={`plan-row-${plan}`}>
      <Text style={styles.plan}>{plan}</Text>
      <View style={styles.chips}>
        {AI.map(([k, l]) => (
          <Pressable key={k} testID={`plan-${plan}-${k}`} onPress={() => setAi({ ...ai, [k]: !ai[k] })} style={[styles.chip, ai[k] && styles.chipOn]}
            accessibilityRole="checkbox" accessibilityState={{ checked: ai[k] }}>
            <Text style={[styles.chipText, ai[k] && { color: colors.onSurfaceInverse }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput testID={`plan-${plan}-limit`} value={limit} onChangeText={(v) => setLimit(v.replace(/\D/g, ""))} placeholder="Unlimited"
        placeholderTextColor={colors.muted} keyboardType="number-pad" style={styles.input} />
      <Text style={styles.unit}>/ month</Text>
      <Pressable testID={`plan-${plan}-save`} onPress={save} disabled={!dirty || busy} style={[styles.save, (!dirty || busy) && { opacity: 0.4 }]}>
        {busy ? <ActivityIndicator size="small" color={colors.onSurfaceInverse} /> : <Text style={styles.saveText}>Save</Text>}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md },
  h3: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 13, color: c.muted, lineHeight: 19 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: c.divider },
  plan: { width: 100, fontFamily: fonts.bold, fontSize: 14, color: c.onSurface, textTransform: "capitalize" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, flexGrow: 1, flexBasis: 300 },
  chip: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, justifyContent: "center" },
  chipOn: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurface },
  input: { width: 100, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  unit: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  save: { height: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  saveText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurfaceInverse },
}));
