import Feather from "@react-native-vector-icons/feather";
import { useCallback, useMemo, useState } from "react";
import { Alert, Platform, Pressable, Share, Text, View } from "react-native";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

/** Multi-select state for list screens. */
export function useSelection(visibleIds: string[]) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const ids = useMemo(() => visibleIds.filter((i) => sel.has(i)), [visibleIds, sel]);
  const toggle = useCallback((id: string) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  }), []);
  const allSelected = visibleIds.length > 0 && ids.length === visibleIds.length;
  const toggleAll = useCallback(() => setSel(allSelected ? new Set() : new Set(visibleIds)), [allSelected, visibleIds]);
  const clear = useCallback(() => setSel(new Set()), []);
  return { ids, has: (id: string) => sel.has(id), toggle, toggleAll, allSelected, clear };
}

export function Checkbox({ checked, onPress, testID, label }: { checked: boolean; onPress: () => void; testID: string; label?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked }}
      style={{ width: 36, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel={label}>
      <Feather name={checked ? "check-square" : "square"} size={20} color={checked ? colors.onSurface : colors.muted} />
    </Pressable>
  );
}

export function confirmAction(message: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert("Are you sure?", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) },
    ]));
}

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Download (web) or share (native) rows as a CSV file. */
export async function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: filename, message: csv });
}

export type BulkAction = { id: string; label: string; icon: React.ComponentProps<typeof Feather>["name"]; danger?: boolean; onPress: () => void };

/** Sticky bar shown while items are selected. `panel` renders an action's options (status list, tag input...). */
export function BulkBar({ count, actions, onClear, active, panel }: {
  count: number; actions: BulkAction[]; onClear: () => void; active?: string | null; panel?: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (!count) return null;
  return (
    <View style={styles.wrap} testID="bulk-bar">
      <View style={styles.row}>
        <Text style={styles.count} testID="bulk-count">{count} selected</Text>
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable key={a.id} testID={`bulk-action-${a.id}`} onPress={a.onPress} style={[styles.btn, active === a.id && styles.btnOn]}>
              <Feather name={a.icon} size={14} color={a.danger ? colors.error : active === a.id ? colors.surfaceInverse : colors.onSurfaceInverse} />
              <Text style={[styles.btnText, a.danger && { color: colors.error }, active === a.id && { color: colors.surfaceInverse }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable testID="bulk-clear" onPress={onClear} hitSlop={8} style={styles.close}>
          <Feather name="x" size={18} color={colors.onSurfaceInverse} />
        </Pressable>
      </View>
      {panel}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg, alignSelf: "center", maxWidth: 1100,
    backgroundColor: c.surfaceInverse, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  count: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse, paddingLeft: spacing.sm },
  actions: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  btn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.onSurfaceInverse },
  btnOn: { backgroundColor: c.onSurfaceInverse },
  btnText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurfaceInverse },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
}));
