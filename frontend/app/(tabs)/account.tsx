import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { customerApi, formatPrice, useCatalog, type MyQuote } from "@/src/api";
import { ProfileCard } from "@/src/components/account/profile-card";
import { QuoteRow } from "@/src/components/account/quote-row";
import { JewelryPreview } from "@/src/components/jewelry-preview";
import { useCustomer } from "@/src/customer";
import { SavedDesign, loadDesigns } from "@/src/designs";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const EMPTY_IMG = "https://images.unsplash.com/photo-1615540732322-4ae8deb97091?crop=entropy&cs=srgb&fm=jpg&q=80&w=900";
type Tab = "designs" | "quotes";

export default function Account() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: catalog } = useCatalog();
  const { customer, promptSignIn, signOut } = useCustomer();
  const [tab, setTab] = useState<Tab>("designs");
  const [designs, setDesigns] = useState<SavedDesign[] | null>(null);
  const [quotes, setQuotes] = useState<MyQuote[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const reload = useCallback(async () => {
    setDesigns(await loadDesigns());
    setQuotes(customer ? (await customerApi.quotes().catch(() => ({ quotes: [] }))).quotes : []);
  }, [customer]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const header = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
      <ProfileCard customer={customer} onSignIn={promptSignIn} onSignOut={signOut} />
      <View style={styles.seg}>
        {(["designs", "quotes"] as Tab[]).map((t) => (
          <Pressable key={t} testID={`account-tab-${t}`} onPress={() => setTab(t)} style={[styles.segItem, tab === t && styles.segSel]}>
            <Text style={[styles.segText, tab === t && { color: colors.onSurfaceInverse }]}>
              {t === "designs" ? `Saved designs${designs ? ` (${designs.length})` : ""}` : `Quote requests${quotes && customer ? ` (${quotes.length})` : ""}`}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const empty =
    tab === "designs" ? (
      <View style={styles.empty} testID="saved-empty-state">
        <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="cover" transition={300} />
        <Text style={styles.emptyTitle}>Your collection is empty</Text>
        <Text style={styles.emptyText}>Compose your first piece in the atelier.</Text>
        <Pressable testID="saved-start-designing-button" onPress={() => router.push("/build")} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Start designing</Text>
        </Pressable>
      </View>
    ) : (
      <View style={styles.empty} testID="quotes-empty-state">
        <Text style={styles.emptyTitle}>{customer ? "No quote requests yet" : "Sign in to see your quotes"}</Text>
        <Text style={styles.emptyText}>{customer ? "Request a quote from any design and track it here." : "Requests you send while signed in appear here."}</Text>
      </View>
    );

  const loading = designs === null || quotes === null || !catalog;
  const contentStyle = { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: bottomChrome + spacing.xl, gap: spacing.lg };
  const refresh = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />;

  return (
    <View style={styles.root} testID="account-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.eyebrow}>MY ACCOUNT</Text>
        <Text style={styles.title}>Your atelier</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : tab === "designs" ? (
        <FlatList
          key="designs"
          data={designs}
          keyExtractor={(d) => d.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.lg }}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={contentStyle}
          refreshControl={refresh}
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
                  <Text style={styles.price}>Est. {formatPrice(item.price)}</Text>
                </Pressable>
              </Animated.View>
            );
          }}
        />
      ) : (
        <FlatList
          key="quotes"
          data={quotes}
          keyExtractor={(q) => q.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={[contentStyle, { gap: spacing.md }]}
          refreshControl={refresh}
          renderItem={({ item }) => <QuoteRow q={item} />}
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
  seg: { flexDirection: "row", gap: spacing.sm },
  segItem: { flex: 1, height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  segSel: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  segText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  empty: { alignItems: "center", paddingVertical: spacing.xl },
  emptyImg: { width: "100%", height: 200, borderRadius: radius.md, marginBottom: spacing.xl },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface, textAlign: "center" },
  emptyText: { fontFamily: fonts.text, fontSize: 14, color: c.muted, marginTop: spacing.sm, textAlign: "center" },
  primaryBtn: { marginTop: spacing.xl, height: 50, paddingHorizontal: spacing["2xl"], borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  thumb: { aspectRatio: 1, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, padding: spacing.sm, overflow: "hidden" },
  thumbPhoto: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  name: { fontFamily: fonts.display, fontSize: 16, color: c.onSurface, marginTop: spacing.md },
  meta: { fontFamily: fonts.text, fontSize: 12, color: c.muted, marginTop: 2 },
  price: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface, marginTop: spacing.xs },
}));
