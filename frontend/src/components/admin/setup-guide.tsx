import Feather from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { BACKEND_ORIGIN } from "@/src/api";
import { getBranding } from "@/src/branding";
import { useDashQuery } from "@/src/components/admin/use-dash";
import { storeLink } from "@/src/tenant";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Step = { id: string; label: string; done: boolean; href: string };

/** First-run checklist on the dashboard home; hides itself once everything is done. */
export function SetupGuide() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const b = getBranding();
  const { data: shopify } = useDashQuery<{ shops: { uninstalled_at: string | null }[] }>(["shopify-app"], "/shopify");
  const { data: leads } = useDashQuery<{ total: number }>(["leads-count"], "/leads");

  const steps: Step[] = [
    { id: "brand", label: "Add your logo and colours", done: !!b?.logo_url, href: "/admin/branding" },
    { id: "catalog", label: "Choose which builders to offer", done: false, href: "/admin/catalog" },
    { id: "pricing", label: "Set your gold and stone pricing", done: false, href: "/merchant" },
    { id: "install", label: "Add the builder to your website or Shopify", done: !!shopify?.shops.some((s) => !s.uninstalled_at), href: "/admin/embed" },
    { id: "lead", label: "Receive your first design request", done: (leads?.total ?? 0) > 0, href: "/admin" },
  ];
  if (steps.filter((s) => s.done).length >= 3) return null;

  return (
    <View style={styles.card} testID="setup-guide">
      <Text style={styles.title}>Set up your studio</Text>
      <Text style={styles.text}>Your storefront link: <Text style={styles.link} selectable testID="setup-store-link">{storeLink(BACKEND_ORIGIN)}</Text></Text>
      {steps.map((s, i) => (
        <Pressable key={s.id} testID={`setup-step-${s.id}`} onPress={() => router.push(s.href as never)} style={styles.step}>
          <View style={[styles.dot, s.done && styles.dotDone]}>
            {s.done ? <Feather name="check" size={12} color={colors.onSurfaceInverse} /> : <Text style={styles.num}>{i + 1}</Text>}
          </View>
          <Text style={[styles.text, s.done && styles.doneText]}>{s.label}</Text>
          <Feather name="chevron-right" size={16} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.brandTertiary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, marginBottom: spacing.lg },
  title: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  text: { flex: 1, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  link: { fontFamily: fonts.bold },
  doneText: { color: c.muted, textDecorationLine: "line-through" },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  num: { fontFamily: fonts.bold, fontSize: 11, color: c.onSurface },
}));
