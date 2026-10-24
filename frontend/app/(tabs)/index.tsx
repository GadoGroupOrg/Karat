import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { assetUrl, useStorefront } from "@/src/api";
import { getBranding } from "@/src/branding";
import { isEmbedded } from "@/src/embed";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Images come from the merchant's Catalog settings (brand photo, stock or default).
const CATEGORIES = [
  { id: "ring", name: "Bridal", line: "Engagement rings & bands" },
  { id: "band", name: "Wedding Bands", line: "His, hers & theirs" },
  { id: "fashion-ring", name: "Fashion Rings", line: "Stack, signet, cocktail" },
  { id: "pendant", name: "Pendants", line: "One meaningful piece" },
  { id: "tennis", name: "Tennis", line: "An unbroken line of light" },
  { id: "necklace", name: "Necklace", line: "Charms on fine chain" },
  { id: "bracelet", name: "Bracelet", line: "Stack your story" },
  { id: "earrings", name: "Earrings", line: "Quiet light" },
];
const STEPS = [
  { icon: "layers", title: "Choose a setting", text: "Solitaire, cathedral, bezel, halo or three-stone." },
  { icon: "droplet", title: "Select your stone & gold", text: "Five cuts, seven gems, yellow, white or rose gold." },
  { icon: "rotate-cw", title: "See it in 3D, then in a photo", text: "Spin and zoom live, then get a studio-quality render." },
] as const;

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const start = (type: string) => router.push({ pathname: "/build", params: { type } });
  const { data: sf } = useStorefront();
  const img = (k: string) => (sf?.images[k] ? assetUrl(sf.images[k]) : undefined);
  const off = sf?.disabled_types ?? [];
  // Bridal tile covers both bridal builders; show the band tile only when the engagement builder is off.
  const cats = CATEGORIES.filter((c) => !off.includes(c.id) && !(c.id === "band" && !off.includes("ring")));
  const heroType = cats[0]?.id ?? "ring";

  return (
    <View style={styles.root} testID="home-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: bottomChrome + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: img("home:hero") }} style={styles.heroImg} contentFit="cover" transition={300} testID="home-hero-image" />
          <LinearGradient colors={["transparent", colors.scrim]} style={styles.heroScrim} />
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.lg }]}>
            {getBranding()?.logo_url ? (
              <Image source={{ uri: assetUrl(getBranding()!.logo_url!) }} style={styles.heroLogo} contentFit="contain" contentPosition="left" testID="home-brand-logo" />
            ) : (
              <Text style={styles.brandMark} testID="home-brand-name">{(getBranding()?.store_name ?? "Karat").toUpperCase()}</Text>
            )}
            <View>
              <Text style={styles.heroTitle}>Design your{"\n"}forever ring.</Text>
              <Text style={styles.heroSub}>Build it in 3D, stone by stone, then see it in a studio photo.</Text>
              <Pressable
                testID="hero-start-designing-button"
                onPress={() => start(heroType)}
                style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.heroBtnText}>Start designing</Text>
                <Feather name="arrow-right" size={16} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>THE COLLECTION</Text>
          <Text style={styles.h2}>What will you create?</Text>
          <View style={styles.grid}>
            {cats.map((c, i) => (
              <Animated.View key={c.id} entering={FadeInDown.delay(80 * i).duration(400)} style={styles.cardWrap}>
                <Pressable
                  testID={`category-card-${c.id}`}
                  onPress={() => start(c.id)}
                  style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
                >
                  <Image source={{ uri: img(`type:${c.id}`) }} style={styles.cardImg} contentFit="cover" transition={300} />
                  <LinearGradient colors={["transparent", colors.scrim]} style={styles.cardScrim} />
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{c.name}</Text>
                    <Text style={styles.cardLine}>{c.line}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.eyebrow}>HOW IT WORKS</Text>
          {STEPS.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <Text style={styles.stepNum}>0{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
              <Feather name={s.icon} size={18} color={colors.brandPrimary} />
            </View>
          ))}
        </View>

        <Pressable style={({ pressed }) => [styles.section, styles.teaser, pressed && { opacity: 0.85 }]} testID="try-on-teaser" onPress={() => router.push("/shop")}>
          <View style={styles.teaserIcon}>
            <Feather name="camera" size={20} color={colors.onBrandTertiary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teaserTitle}>Virtual Try-On</Text>
            <Text style={styles.teaserText}>Pick any piece in the Shop and see it on you with a photo or your camera.</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.onSurface} />
        </Pressable>
        {!isEmbedded && (
          <Pressable testID="home-store-admin-link" onPress={() => router.push("/admin")} style={styles.adminLink}>
            <Feather name="briefcase" size={14} color={colors.muted} />
            <Text style={styles.adminLinkText}>For jewelers · Store admin</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { height: 480, backgroundColor: c.surfaceInverse },
  heroImg: { ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const) },
  heroScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 320 },
  heroContent: { flex: 1, justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingBottom: spacing["2xl"] },
  brandMark: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 4, color: c.onSurfaceInverse },
  heroLogo: { width: 160, height: 40 },
  adminLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 48, marginTop: spacing["2xl"] },
  adminLinkText: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
  heroTitle: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: c.onSurfaceInverse },
  heroSub: { fontFamily: fonts.text, fontSize: 15, color: c.onSurfaceInverse, opacity: 0.85, marginTop: spacing.sm },
  heroBtn: {
    marginTop: spacing.xl, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: c.surface, paddingHorizontal: spacing.xl, height: 48, borderRadius: radius.pill,
  },
  heroBtnText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurface },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing["2xl"] },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.5, color: c.brandPrimary, marginBottom: spacing.sm },
  h2: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface, marginBottom: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.lg },
  cardWrap: { width: "48%" },
  card: { height: 220, borderRadius: radius.md, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  cardImg: { ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const) },
  cardScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 130 },
  cardText: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md },
  cardTitle: { fontFamily: fonts.display, fontSize: 21, color: c.onSurfaceInverse },
  cardLine: { fontFamily: fonts.text, fontSize: 12, color: c.onSurfaceInverse, opacity: 0.85, marginTop: 2 },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.divider },
  stepNum: { fontFamily: fonts.display, fontSize: 22, color: c.brandPrimary, width: 32 },
  stepTitle: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurface },
  stepText: { fontFamily: fonts.text, fontSize: 13, color: c.muted, marginTop: 2 },
  teaser: {
    flexDirection: "row", alignItems: "center", gap: spacing.lg, backgroundColor: c.brandTertiary,
    marginHorizontal: spacing.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderRadius: radius.md,
  },
  teaserIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.brandSecondary, alignItems: "center", justifyContent: "center" },
  teaserTitle: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  teaserText: { fontFamily: fonts.text, fontSize: 13, color: c.onBrandTertiary, marginTop: 2 },
}));
