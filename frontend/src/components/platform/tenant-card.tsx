import Feather from "@react-native-vector-icons/feather";
import { Pressable, Text, View } from "react-native";

import { type PlatformTenant } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const PLANS = ["trial", "starter", "pro", "enterprise", "founder"];

type Actions = {
  toggle: (t: PlatformTenant) => void;
  plan: (t: PlatformTenant, plan: string) => void;
  open: (t: PlatformTenant) => void;
  reset: (t: PlatformTenant) => void;
  dismiss: (t: PlatformTenant) => void;
};

export function TenantCard({ t, limit, actions }: { t: PlatformTenant; limit: number | null; actions: Actions }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const active = t.status === "active";
  const u = t.ai_usage_month;
  return (
    <View style={styles.card} testID={`platform-tenant-${t.slug}`}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={styles.name}>{t.name}</Text>
          <Text style={styles.meta}>/{t.slug} · {t.owner_email ?? "no owner"} · since {new Date(t.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.pill, !active && styles.pillOff]}><Text style={styles.pillText}>{active ? "Active" : "Paused"}</Text></View>
      </View>
      <Text style={styles.meta}>
        {t.leads} leads · {t.customers} customers · {t.team} team · {t.shopify_shop ? `Shopify: ${t.shopify_shop}` : "No Shopify"} ·
        AI this month: {t.ai_total_month}{limit != null ? ` of ${limit}` : ""} ({u.render ?? 0} renders, {u.angle ?? 0} angles, {u.sketch ?? 0} sketches, {u.tryon ?? 0} try-ons)
      </Text>
      {!!t.upgrade_request && (
        <View style={styles.upgrade} testID={`platform-upgrade-${t.slug}`}>
          <Feather name="trending-up" size={14} color={colors.brandPrimary} />
          <Text style={[styles.meta, { flex: 1, color: colors.onSurface }]}>
            Upgrade requested by {t.upgrade_request.by} on {new Date(t.upgrade_request.created_at).toLocaleDateString()}. Choose a new plan below to answer it.
          </Text>
          <Pressable testID={`platform-upgrade-dismiss-${t.slug}`} onPress={() => actions.dismiss(t)} style={styles.outline}>
            <Text style={styles.outlineText}>Dismiss</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.plans}>
        {PLANS.map((p) => (
          <Pressable key={p} testID={`platform-plan-${t.slug}-${p}`} onPress={() => actions.plan(t, p)} style={[styles.chip, t.plan === p && styles.chipOn]}>
            <Text style={[styles.chipText, t.plan === p && { color: colors.onSurfaceInverse }]}>{p}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable testID={`platform-open-${t.slug}`} onPress={() => actions.open(t)} style={styles.dark}>
          <Feather name="log-in" size={14} color={colors.onSurfaceInverse} />
          <Text style={styles.darkText}>Open dashboard</Text>
        </Pressable>
        <Pressable testID={`platform-toggle-${t.slug}`} onPress={() => actions.toggle(t)} style={styles.outline}>
          <Feather name={active ? "pause" : "play"} size={14} color={colors.onSurface} />
          <Text style={styles.outlineText}>{active ? "Pause" : "Resume"}</Text>
        </Pressable>
        <Pressable testID={`platform-reset-${t.slug}`} onPress={() => actions.reset(t)} style={styles.outline}>
          <Feather name="key" size={14} color={colors.onSurface} />
          <Text style={styles.outlineText}>Reset owner password</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  name: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  meta: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.muted },
  pill: { paddingHorizontal: spacing.md, height: 26, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.brandTertiary },
  pillOff: { backgroundColor: c.surfaceTertiary },
  pillText: { fontFamily: fonts.bold, fontSize: 11, color: c.onSurface },
  plans: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  upgrade: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: c.brandPrimary },
  chip: { height: 32, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, justifyContent: "center" },
  chipOn: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurface, textTransform: "capitalize" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dark: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: c.surfaceInverse },
  darkText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurfaceInverse },
  outline: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong },
  outlineText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
}));
