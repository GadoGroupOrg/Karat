import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const HERO = "https://images.unsplash.com/photo-1549439602-43ebca2327af?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const CATEGORIES = [
  { id: "necklace", name: "Necklace", line: "Charms on fine chain", img: "https://images.unsplash.com/photo-1680690653166-1618c3bcdf51?crop=entropy&cs=srgb&fm=jpg&q=80&w=800" },
  { id: "bracelet", name: "Bracelet", line: "Stack your story", img: "https://images.unsplash.com/photo-1633810543462-77c4a3b13f07?crop=entropy&cs=srgb&fm=jpg&q=80&w=800" },
  { id: "ring", name: "Ring", line: "One stone, yours", img: "https://images.unsplash.com/photo-1626122780071-c09d403b8e32?crop=entropy&cs=srgb&fm=jpg&q=80&w=800" },
  { id: "earrings", name: "Earrings", line: "Quiet light", img: "https://images.unsplash.com/photo-1671644730555-916aa8d8157f?crop=entropy&cs=srgb&fm=jpg&q=80&w=800" },
];
const STEPS = [
  { icon: "layers", title: "Choose a base", text: "Pick a piece, chain style and length." },
  { icon: "droplet", title: "Select your metal", text: "Yellow, rose, white gold or silver." },
  { icon: "star", title: "Make it personal", text: "Add charms, stones and engraving." },
] as const;

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const start = (type: string) => router.push({ pathname: "/build", params: { type } });

  return (
    <View style={styles.root} testID="home-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: bottomChrome + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: HERO }} style={styles.heroImg} contentFit="cover" transition={300} />
          <LinearGradient colors={["transparent", colors.scrim]} style={styles.heroScrim} />
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.lg }]}>
            <Text style={styles.brandMark}>ATELIER</Text>
            <View>
              <Text style={styles.heroTitle}>Design your{"\n"}own heirloom.</Text>
              <Text style={styles.heroSub}>Fine jewelry, composed by you, piece by piece.</Text>
              <Pressable
                testID="hero-start-designing-button"
                onPress={() => start("necklace")}
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
            {CATEGORIES.map((c, i) => (
              <Animated.View key={c.id} entering={FadeInDown.delay(80 * i).duration(400)} style={styles.cardWrap}>
                <Pressable
                  testID={`category-card-${c.id}`}
                  onPress={() => start(c.id)}
                  style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
                >
                  <Image source={{ uri: c.img }} style={styles.cardImg} contentFit="cover" transition={300} />
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

        <View style={[styles.section, styles.teaser]} testID="try-on-teaser">
          <View style={styles.teaserIcon}>
            <Feather name="camera" size={20} color={colors.onBrandTertiary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teaserTitle}>Virtual Try-On</Text>
            <Text style={styles.teaserText}>See your designs on you with a photo or your camera. Coming soon.</Text>
          </View>
        </View>
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
