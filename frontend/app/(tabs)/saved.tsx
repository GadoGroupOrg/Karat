import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatPrice, useCatalog } from "@/src/api";
import { JewelryPreview } from "@/src/components/jewelry-preview";
import { SavedDesign, loadDesigns } from "@/src/designs";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const EMPTY_IMG = "https://images.unsplash.com/photo-1615540732322-4ae8deb97091?crop=entropy&cs=srgb&fm=jpg&q=80&w=900";

export default function Saved() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: catalog } = useCatalog();
  const [designs, setDesigns] = useState<SavedDesign[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const reload = useCallback(async () => setDesigns(await loadDesigns()), []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <View style={styles.root} testID="saved-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.eyebrow}>YOUR COLLECTION</Text>
        <Text style={styles.title}>Saved designs</Text>
      </View>

      {designs === null || !catalog ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : designs.length === 0 ? (
        <View style={[styles.empty, { paddingBottom: bottomChrome + spacing.xl }]} testID="saved-empty-state">
          <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="cover" transition={300} />
          <Text style={styles.emptyTitle}>Your collection is empty</Text>
          <Text style={styles.emptyText}>Compose your first piece in the atelier.</Text>
          <Pressable testID="saved-start-designing-button" onPress={() => router.push("/build")} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Start designing</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={designs}
          keyExtractor={(d) => d.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.lg }}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: bottomChrome + spacing.xl, gap: spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          renderItem={({ item, index }) => {
            const metal = catalog.metals.find((m) => m.id === item.metalId);
            return (
              <Animated.View entering={FadeInDown.delay(60 * index).duration(350)} style={{ flex: 1, maxWidth: "50%" }}>
                <Pressable testID={`saved-design-card-${item.id}`} onPress={() => router.push(`/design/${item.id}`)} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
                  <View style={styles.thumb}>
                    {item.renderUrl ? (
                      <Image source={{ uri: item.renderUrl }} style={styles.thumbPhoto} contentFit="cover" transition={250} testID={`saved-design-photo-${item.id}`} />
                    ) : (
                      <JewelryPreview catalog={catalog} design={item} />
                    )}
                  </View>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{metal?.name}</Text>
                  <Text style={styles.price}>{formatPrice(item.price)}</Text>
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.5, color: c.brandPrimary, marginTop: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface, marginTop: spacing.xs },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, paddingHorizontal: spacing.xl, alignItems: "center", justifyContent: "center" },
  emptyImg: { width: "100%", height: 220, borderRadius: radius.md, marginBottom: spacing.xl },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface },
  emptyText: { fontFamily: fonts.text, fontSize: 14, color: c.muted, marginTop: spacing.sm },
  primaryBtn: { marginTop: spacing.xl, height: 50, paddingHorizontal: spacing["2xl"], borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  thumb: { aspectRatio: 1, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, padding: spacing.sm, overflow: "hidden" },
  thumbPhoto: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  name: { fontFamily: fonts.display, fontSize: 16, color: c.onSurface, marginTop: spacing.md },
  meta: { fontFamily: fonts.text, fontSize: 12, color: c.muted, marginTop: 2 },
  price: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface, marginTop: spacing.xs },
}));
