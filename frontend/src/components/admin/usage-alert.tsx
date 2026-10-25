import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { dashRequest } from "@/src/api";
import { useAuth } from "@/src/auth";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Usage = { plan: string; limit: number | null; used: number; exhausted: boolean; upgrade_requested_at: string | null };
const WARN_AT = 0.8;

/** Dashboard banner once a business has used 80% of its monthly AI allowance, with an upgrade request button. */
export function UsageAlert() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { data } = useQuery({ queryKey: ["dash", "ai-usage"], queryFn: () => dashRequest<Usage>(token!, "/ai-usage"), enabled: !!token, refetchInterval: 300_000 });
  if (!data || data.limit == null || data.used < data.limit * WARN_AT) return null;
  const pct = Math.min(100, Math.round((data.used / Math.max(1, data.limit)) * 100));
  const request = async () => {
    setBusy(true);
    setFailed(false);
    try {
      qc.setQueryData(["dash", "ai-usage"], await dashRequest<Usage>(token!, "/upgrade-request", { method: "POST", body: JSON.stringify({ note: "" }) }));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[styles.wrap, data.exhausted && { borderColor: colors.error }]} testID="usage-alert">
      <Feather name={data.exhausted ? "alert-octagon" : "alert-triangle"} size={16} color={data.exhausted ? colors.error : colors.brandPrimary} />
      <View style={{ flex: 1, minWidth: 200 }}>
        <Text style={styles.title}>
          {data.exhausted ? "Your AI allowance is used up for this month" : `You've used ${pct}% of this month's AI allowance`}
        </Text>
        <Text style={styles.sub}>
          {data.used} of {data.limit} AI images on the {data.plan} plan.{" "}
          {data.exhausted ? "Studio photos, angles, sketches and try-on are paused until the 1st. The 3D builder and quotes still work." : "Upgrade to keep AI tools running."}
        </Text>
        {failed && <Text style={[styles.sub, { color: colors.error }]} testID="usage-upgrade-error">Couldn't send the request. Please try again.</Text>}
      </View>
      {data.upgrade_requested_at ? (
        <View style={styles.sent} testID="usage-upgrade-requested"><Feather name="check" size={14} color={colors.onSurface} /><Text style={styles.sentText}>Upgrade requested</Text></View>
      ) : (
        <Pressable testID="usage-upgrade-button" onPress={request} disabled={busy} style={[styles.btn, busy && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator size="small" color={colors.onSurfaceInverse} /> : <Text style={styles.btnText}>Request upgrade</Text>}
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md, margin: spacing.lg, marginBottom: 0, padding: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1, borderColor: c.brandPrimary, backgroundColor: c.surface },
  title: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 13, color: c.onSurface, marginTop: 2 },
  btn: { height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  sent: { flexDirection: "row", alignItems: "center", gap: spacing.xs, height: 44, paddingHorizontal: spacing.md },
  sentText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
}));
