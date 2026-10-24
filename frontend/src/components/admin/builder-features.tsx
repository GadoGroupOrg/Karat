import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { dashRequest } from "@/src/api";
import { useAuth } from "@/src/auth";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type Feature = { id: string; label: string; enabled: boolean; locked?: "plan" | "limit" | null };
export type AiPolicy = { plan: string; limit: number | null; used: number; exhausted: boolean };

/** Store-level switches for which builder tools customers see (price estimates, 3D, AI photo, add-ons…). */
export function BuilderFeatures({ features, ai }: { features: Feature[]; ai?: AiPolicy }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [state, setState] = useState<Record<string, boolean>>(Object.fromEntries(features.map((f) => [f.id, f.enabled])));

  const toggle = async (id: string) => {
    const next = { ...state, [id]: !state[id] };
    setState(next);
    try {
      await dashRequest(token!, "/catalog/features", { method: "PUT", body: JSON.stringify({ features: { [id]: next[id] } }) });
    } catch {
      setState((s) => ({ ...s, [id]: !next[id] }));
      return;
    }
    qc.invalidateQueries({ queryKey: ["storefront"] });
  };

  return (
    <View style={styles.panel} testID="builder-features">
      <Text style={styles.h3}>Builder features</Text>
      <Text style={styles.sub}>Choose which tools your customers get. Changes apply to your storefront, website embed and Shopify blocks.</Text>
      {!!ai && (
        <Text style={[styles.usage, ai.exhausted && { color: colors.error }]} testID="ai-usage">
          AI images this month: {ai.used}{ai.limit != null ? ` of ${ai.limit}` : " (unlimited)"} · {ai.plan} plan
          {ai.exhausted ? " · Allowance used up, AI tools are paused until next month" : ""}
        </Text>
      )}
      <View style={styles.grid}>
        {features.map((f) => {
          const on = state[f.id] && !f.locked;
          return (
            <Pressable key={f.id} testID={`feature-${f.id}`} onPress={() => !f.locked && toggle(f.id)} disabled={!!f.locked}
              style={[styles.item, on && styles.itemOn, !!f.locked && { opacity: 0.6 }]}
              accessibilityRole="switch" accessibilityState={{ checked: on, disabled: !!f.locked }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{f.label}</Text>
                {!!f.locked && <Text style={styles.lock} testID={`feature-${f.id}-locked`}>{f.locked === "plan" ? "Not included in your plan" : "Monthly AI allowance used"}</Text>}
              </View>
              <Switch value={on} disabled={!!f.locked} style={{ pointerEvents: "none" }} trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md },
  h3: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 13, color: c.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  item: { flexGrow: 1, flexBasis: 240, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: c.border },
  itemOn: { borderColor: c.borderStrong, backgroundColor: c.surfaceSecondary },
  label: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
  lock: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurface, marginTop: 2 },
  usage: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface, backgroundColor: c.surfaceSecondary, padding: spacing.md, borderRadius: radius.md },
}));
