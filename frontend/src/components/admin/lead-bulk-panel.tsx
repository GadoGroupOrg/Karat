import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { STATUSES } from "@/src/components/admin/status";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type LeadBulkMode = "status" | "assign" | "tag" | null;
type Member = { id: string; name: string; email: string };

/** Options row shown under the bulk bar for the chosen lead action. */
export function LeadBulkPanel({ mode, team, tags, onStatus, onAssign, onTag }: {
  mode: LeadBulkMode; team: Member[]; tags: string[];
  onStatus: (s: string) => void; onAssign: (id: string | null) => void; onTag: (tag: string, remove: boolean) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [tag, setTag] = useState("");
  if (!mode) return null;

  const chip = (key: string, label: string, onPress: () => void, testID: string) => (
    <Pressable key={key} testID={testID} onPress={onPress} style={styles.chip}><Text style={styles.chipText}>{label}</Text></Pressable>
  );

  return (
    <View style={styles.panel} testID={`bulk-panel-${mode}`}>
      {mode === "status" && STATUSES.map((s) => chip(s.id, s.label, () => onStatus(s.id), `bulk-status-${s.id}`))}
      {mode === "assign" && (
        <>
          {team.map((m) => chip(m.id, m.name || m.email, () => onAssign(m.id), `bulk-assign-${m.email}`))}
          {chip("none", "Unassign", () => onAssign(null), "bulk-assign-none")}
        </>
      )}
      {mode === "tag" && (
        <View style={{ gap: spacing.sm, width: "100%" }}>
          <View style={styles.tagRow}>
            <TextInput testID="bulk-tag-input" value={tag} onChangeText={setTag} placeholder="Tag, e.g. VIP or Bridal show"
              placeholderTextColor={colors.muted} style={styles.input} maxLength={40}
              onSubmitEditing={() => tag.trim() && onTag(tag.trim(), false)} />
            <Pressable testID="bulk-tag-add" onPress={() => tag.trim() && onTag(tag.trim(), false)} style={styles.chip}><Text style={styles.chipText}>Add tag</Text></Pressable>
            <Pressable testID="bulk-tag-remove" onPress={() => tag.trim() && onTag(tag.trim(), true)} style={styles.chip}><Text style={styles.chipText}>Remove tag</Text></Pressable>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((t) => chip(t, `# ${t}`, () => setTag(t), `bulk-tag-suggest-${t}`))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  panel: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.borderStrong },
  chip: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.surface, justifyContent: "center" },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  input: { flexGrow: 1, minWidth: 200, height: 40, borderRadius: radius.pill, backgroundColor: c.surface, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
}));
