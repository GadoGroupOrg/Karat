import { Text, View } from "react-native";

import { LeadStatus } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export const STATUSES: { id: LeadStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "quoted", label: "Quoted" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export function useStatusColor() {
  const { colors } = useTheme();
  return (s: LeadStatus) =>
    ({
      new: { bg: colors.brandTertiary, fg: colors.onBrandTertiary },
      contacted: { bg: colors.info, fg: colors.onInfo },
      quoted: { bg: colors.warning, fg: colors.onWarning },
      won: { bg: colors.success, fg: colors.onSuccess },
      lost: { bg: colors.surfaceTertiary, fg: colors.muted },
    })[s];
}

export function StatusPill({ status }: { status: LeadStatus }) {
  const styles = useStyles();
  const c = useStatusColor()(status);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]} testID={`lead-status-pill-${status}`}>
      <Text style={[styles.text, { color: c.fg }]}>{STATUSES.find((x) => x.id === status)?.label ?? status}</Text>
    </View>
  );
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const useStyles = makeStyles(() => ({
  pill: { alignSelf: "flex-start", paddingHorizontal: spacing.md, height: 26, borderRadius: radius.pill, justifyContent: "center" },
  text: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.5 },
}));
