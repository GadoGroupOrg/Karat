import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { dashRequest } from "@/src/api";
import { useAuth } from "@/src/auth";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Feature = { id: string; label: string; enabled: boolean };

/** Store-level switches for which builder tools customers see (price estimates, 3D, AI photo, add-ons…). */
export function BuilderFeatures({ features }: { features: Feature[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [state, setState] = useState<Record<string, boolean>>(Object.fromEntries(features.map((f) => [f.id, f.enabled])));

  const toggle = async (id: string) => {
    const next = { ...state, [id]: !state[id] };
    setState(next);
    await dashRequest(token!, "/catalog/features", { method: "PUT", body: JSON.stringify({ features: { [id]: next[id] } }) });
    qc.invalidateQueries({ queryKey: ["storefront"] });
  };

  return (
    <View style={styles.panel} testID="builder-features">
      <Text style={styles.h3}>Builder features</Text>
      <Text style={styles.sub}>Choose which tools your customers get. Changes apply to your storefront, website embed and Shopify blocks.</Text>
      <View style={styles.grid}>
        {features.map((f) => (
          <Pressable key={f.id} testID={`feature-${f.id}`} onPress={() => toggle(f.id)} style={[styles.item, state[f.id] && styles.itemOn]}
            accessibilityRole="switch" accessibilityState={{ checked: state[f.id] }}>
            <Text style={styles.label}>{f.label}</Text>
            <Switch value={state[f.id]} style={{ pointerEvents: "none" }} trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }} />
          </Pressable>
        ))}
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
  label: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
}));
