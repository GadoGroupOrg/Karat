import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatPrice, useCatalog, useStoreProducts } from "@/src/api";
import { useAuth } from "@/src/auth";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Shop() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { data: catalog } = useCatalog();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [ptype, setPtype] = useState("");
  const { data, isLoading, isError, refetch, isRefetching } = useStoreProducts(debounced, ptype);
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(h);
  }, [query]);
  useEffect(() => {
    if (data?.product_types?.length) setTypes(data.product_types);
  }, [data?.product_types]);

  const store = catalog?.store;

  return (
    <View style={styles.root} testID="shop-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow} numberOfLines={1}>{store ? store.name.toUpperCase() : "NO STORE CONNECTED"}</Text>
          <Text style={styles.title}>Shop</Text>
        </View>
        {!!token && (
          <Pressable testID="shop-store-settings-button" onPress={() => router.push("/store-connect")} style={styles.iconBtn} hitSlop={8}>
            <Feather name="settings" size={20} color={colors.onSurface} />
          </Pressable>
        )}
      </View>

      {!store ? (
        <View style={[styles.center, { paddingBottom: bottomChrome + spacing.xl }]} testID="shop-not-connected">
          <Feather name="shopping-bag" size={32} color={colors.brandPrimary} />
          <Text style={styles.emptyTitle}>{token ? "Connect your Shopify store" : "The collection is coming soon"}</Text>
          <Text style={styles.emptyText}>
            {token ? "Products from your store become charms and centre stones in the builder." : "In the meantime, design your own piece in the builder."}
          </Text>
          <Pressable testID="shop-connect-store-button" onPress={() => router.push(token ? "/store-connect" : "/build")} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{token ? "Connect store" : "Start designing"}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.searchWrap}>
            <Feather name="search" size={16} color={colors.muted} />
            <TextInput
              testID="shop-search-input"
              value={query}
              onChangeText={setQuery}
              placeholder="Search pieces"
              placeholderTextColor={colors.muted}
              style={styles.search}
              returnKeyType="search"
            />
            {!!query && (
              <Pressable testID="shop-search-clear" onPress={() => setQuery("")} hitSlop={10}>
                <Feather name="x" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
            {["", ...types].map((ty) => {
              const sel = ty === ptype;
              return (
                <Pressable key={ty || "all"} testID={`shop-type-chip-${ty || "all"}`} onPress={() => setPtype(ty)} style={[styles.chip, sel && styles.chipSel]}>
                  <Text style={[styles.chipText, sel && styles.chipTextSel]}>{ty || "All"}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {isLoading ? (
            <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
          ) : isError ? (
            <View style={styles.center} testID="shop-error">
              <Text style={styles.emptyTitle}>Unable to load products</Text>
              <Pressable testID="shop-retry-button" onPress={() => refetch()} style={styles.outlineBtn}><Text style={styles.outlineText}>Retry</Text></Pressable>
            </View>
          ) : (
            <FlatList
              data={data?.products ?? []}
              keyExtractor={(p) => p.id}
              numColumns={2}
              columnWrapperStyle={{ gap: spacing.lg }}
              contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: bottomChrome + spacing.xl, gap: spacing.xl }}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
              ListEmptyComponent={<Text style={[styles.emptyText, { marginTop: spacing["2xl"] }]} testID="shop-empty">No pieces match your search.</Text>}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(300)} style={{ flex: 1, maxWidth: "50%" }}>
                  <Pressable testID={`shop-product-card-${item.id}`} onPress={() => router.push(`/product/${item.id}`)} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
                    <Image source={{ uri: item.image ?? undefined }} style={styles.img} contentFit="cover" transition={250} />
                    <Text style={styles.type}>{item.product_type.toUpperCase()}</Text>
                    <Text style={styles.name} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.price}>{formatPrice(item.price)} {store.currency}{!item.available ? " · Sold out" : ""}</Text>
                  </Pressable>
                </Animated.View>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.5, color: c.brandPrimary, marginTop: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface, marginTop: spacing.xs },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.xl, height: 44,
    paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border,
  },
  search: { flex: 1, fontFamily: fonts.text, fontSize: 15, color: c.onSurface, height: 44 },
  chipRow: { flexGrow: 0, flexShrink: 0, height: 56, minHeight: 56 },
  chipRowContent: { gap: spacing.sm, paddingHorizontal: spacing.xl, alignItems: "center" },
  chip: { height: 36, flexShrink: 0, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, justifyContent: "center" },
  chipSel: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  chipTextSel: { color: c.onSurfaceInverse },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface, textAlign: "center" },
  emptyText: { fontFamily: fonts.text, fontSize: 14, color: c.muted, textAlign: "center" },
  primaryBtn: { marginTop: spacing.md, height: 50, paddingHorizontal: spacing["2xl"], borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  outlineBtn: { borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: spacing.xl, height: 44, justifyContent: "center", borderRadius: radius.pill },
  outlineText: { fontFamily: fonts.medium, color: c.onSurface },
  img: { width: "100%", aspectRatio: 0.85, borderRadius: radius.md, backgroundColor: c.surfaceSecondary },
  type: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.5, color: c.brandPrimary, marginTop: spacing.md },
  name: { fontFamily: fonts.display, fontSize: 15, lineHeight: 20, color: c.onSurface, marginTop: 2 },
  price: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface, marginTop: spacing.xs },
}));
