import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatPrice, useCatalog, useFeatures, useStoreProduct } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const USES = [
  { type: "necklace", label: "Necklace charm", icon: "link" },
  { type: "bracelet", label: "Bracelet charm", icon: "circle" },
  { type: "earrings", label: "Earring drop", icon: "droplet" },
] as const;

export default function ProductDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feat = useFeatures();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: p, isLoading, isError } = useStoreProduct(id);
  const { data: catalog } = useCatalog();
  const { width } = useWindowDimensions();

  const close = () => (router.canGoBack() ? router.back() : router.replace("/shop"));
  const addTo = (type: string) => {
    if (router.canGoBack()) router.back();
    router.navigate({ pathname: "/build", params: { type, addId: id, nonce: String(Date.now()) } });
  };

  return (
    <View style={styles.root} testID="product-detail-screen">
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="product-detail-close-button" onPress={close} hitSlop={10} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
      </View>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : isError || !p ? (
        <View style={styles.center} testID="product-not-found"><Text style={styles.h1}>Product not found</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {(p.images.length ? p.images : [p.image]).map((src, i) => (
              <Image key={i} source={{ uri: src ?? undefined }} style={[styles.galleryImg, { width }]} contentFit="cover" transition={250} />
            ))}
          </ScrollView>
          <View style={styles.body}>
            <Text style={styles.type}>{p.product_type.toUpperCase()}</Text>
            <Text style={styles.h1} testID="product-detail-title">{p.title}</Text>
            <Text style={styles.price} testID="product-detail-price">
              {formatPrice(p.price)} {catalog?.store?.currency ?? ""}
              {p.compare_at_price && p.compare_at_price > p.price ? <Text style={styles.compare}>  {formatPrice(p.compare_at_price)}</Text> : null}
            </Text>
            {!p.available && <Text style={styles.soldOut}>Currently sold out</Text>}

            {!!p.image && feat("try_on") && <Pressable testID="product-try-on-button" onPress={() => router.push(`/try-on/${p.id}`)} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
              <Feather name="camera" size={18} color={colors.onSurfaceInverse} />
              <Text style={styles.primaryText}>Try it on</Text>
            </Pressable>}

            <Text style={styles.sectionLabel}>ADD TO A DESIGN</Text>
            <View style={styles.useGrid}>
              {USES.map((u) => (
                <Pressable key={u.type} testID={`product-add-to-${u.type}-button`} onPress={() => addTo(u.type)} style={({ pressed }) => [styles.useTile, pressed && { opacity: 0.8 }]}>
                  <Feather name={u.icon} size={18} color={colors.brandPrimary} />
                  <Text style={styles.useText}>{u.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable testID="product-view-in-store-button" onPress={() => WebBrowser.openBrowserAsync(p.url)} style={styles.secondaryBtn}>
              <Feather name="external-link" size={16} color={colors.onSurface} />
              <Text style={styles.secondaryText}>View in store</Text>
            </Pressable>

            {!!p.description && <Text style={styles.desc}>{p.description}</Text>}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  gallery: { height: 360 },
  galleryImg: { height: 360, backgroundColor: c.surfaceSecondary },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  type: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: c.onSurface, marginTop: spacing.xs },
  price: { fontFamily: fonts.medium, fontSize: 18, color: c.onSurface, marginTop: spacing.sm },
  compare: { fontFamily: fonts.text, fontSize: 15, color: c.muted, textDecorationLine: "line-through" },
  soldOut: { fontFamily: fonts.medium, fontSize: 13, color: c.error, marginTop: spacing.xs },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.onSurface, marginTop: spacing["2xl"], marginBottom: spacing.md },
  useGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  useTile: { width: "48.5%", flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 52, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: c.brandTertiary },
  useText: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
  primaryBtn: { marginTop: spacing.xl, height: 54, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  primaryText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  secondaryBtn: { marginTop: spacing.lg, height: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  secondaryText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurface },
  desc: { fontFamily: fonts.text, fontSize: 14, lineHeight: 22, color: c.muted, marginTop: spacing.xl },
}));
