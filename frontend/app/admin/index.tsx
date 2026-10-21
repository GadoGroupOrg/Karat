import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Lead, LeadList, LeadStatus, formatPrice, leadImage, useCatalog } from "@/src/api";
import { WIDE } from "@/src/components/admin/shell";
import { STATUSES, StatusPill, formatDate } from "@/src/components/admin/status";
import { useDashQuery } from "@/src/components/admin/use-dash";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function LeadsInbox() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const h = setTimeout(() => setQ(query), 300);
    return () => clearTimeout(h);
  }, [query]);
  const { data, isLoading, isError, refetch, isRefetching } = useDashQuery<LeadList>(
    ["leads", status, q], `/leads?status=${status}&q=${encodeURIComponent(q)}`, 30000,
  );
  const { data: catalog } = useCatalog();

  const title = (l: Lead) => {
    if (l.kind === "product") return l.product?.title ?? "Store product";
    const t = catalog?.types.find((x) => x.id === l.design?.type);
    return l.design?.name?.trim() || `Custom ${t?.name.toLowerCase() ?? "design"}`;
  };
  const subtitle = (l: Lead) => (l.kind === "product" ? "Try-on enquiry" : "Custom design request");

  const kpis = [
    { label: "Total leads", value: String(data?.total ?? "–"), icon: "inbox" as const },
    { label: "New", value: String(data?.counts.new ?? "–"), icon: "bell" as const },
    { label: "Open pipeline", value: data ? formatPrice(data.open_value) : "–", icon: "trending-up" as const },
    { label: "Won", value: String(data?.counts.won ?? "–"), icon: "award" as const },
  ];

  const header = (
    <View style={{ gap: spacing.lg }}>
      <View>
        <Text style={styles.eyebrow}>INBOX</Text>
        <Text style={styles.h1}>Leads & design requests</Text>
        <Text style={styles.sub}>Every quote request from the app, your website and try-on enquiries lands here.</Text>
      </View>
      <View style={styles.kpiRow}>
        {kpis.map((k) => (
          <View key={k.label} style={[styles.kpi, { minWidth: wide ? 180 : "46%" }]} testID={`admin-kpi-${k.label.toLowerCase().replace(/ /g, "-")}`}>
            <Feather name={k.icon} size={16} color={colors.brandPrimary} />
            <Text style={styles.kpiValue}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.toolbar, !wide && { flexDirection: "column", alignItems: "stretch" }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {[{ id: "" as const, label: "All" }, ...STATUSES].map((s) => {
            const sel = s.id === status;
            const n = s.id ? data?.counts[s.id] : data?.total;
            return (
              <Pressable key={s.id || "all"} testID={`leads-filter-${s.id || "all"}`} onPress={() => setStatus(s.id)} style={[styles.chip, sel && styles.chipSel]}>
                <Text style={[styles.chipText, sel && styles.chipTextSel]}>{s.label}{n !== undefined ? `  ${n}` : ""}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={[styles.search, wide && { width: 280 }]}>
          <Feather name="search" size={16} color={colors.muted} />
          <TextInput testID="leads-search-input" value={query} onChangeText={setQuery} placeholder="Search name, email, piece"
            placeholderTextColor={colors.muted} style={styles.searchInput} />
        </View>
      </View>
      {wide && (
        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.th, { flex: 2.4 }]}>PIECE</Text>
          <Text style={[styles.th, { flex: 2 }]}>CUSTOMER</Text>
          <Text style={[styles.th, { flex: 1 }]}>VALUE</Text>
          <Text style={[styles.th, { flex: 1 }]}>SOURCE</Text>
          <Text style={[styles.th, { flex: 1 }]}>STATUS</Text>
          <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>RECEIVED</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item: l }: { item: Lead }) => {
    const img = leadImage(l);
    const thumb = img ? <Image source={{ uri: img }} style={styles.thumb} contentFit="cover" /> : (
      <View style={[styles.thumb, styles.thumbEmpty]}><Feather name="hexagon" size={18} color={colors.brandPrimary} /></View>
    );
    return (
      <Pressable testID={`lead-row-${l.id}`} onPress={() => router.push(`/admin/leads/${l.id}`)}
        style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [wide ? styles.row : styles.card, (hovered || pressed) && { backgroundColor: colors.surfaceSecondary }]}>
        {wide ? (
          <>
            <View style={[styles.cell, { flex: 2.4, flexDirection: "row", alignItems: "center", gap: spacing.md }]}>
              {thumb}
              <View style={{ flex: 1 }}>
                <Text style={styles.piece} numberOfLines={1}>{title(l)}</Text>
                <Text style={styles.meta} numberOfLines={1}>{subtitle(l)}</Text>
              </View>
            </View>
            <View style={[styles.cell, { flex: 2 }]}>
              <Text style={styles.cust} numberOfLines={1}>{l.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>{l.email}</Text>
            </View>
            <Text style={[styles.cell, styles.val, { flex: 1 }]}>{formatPrice(l.price)}</Text>
            <Text style={[styles.cell, styles.meta, { flex: 1 }]}>{l.source === "embed" ? "Website" : "App"}</Text>
            <View style={[styles.cell, { flex: 1 }]}><StatusPill status={l.status} /></View>
            <Text style={[styles.cell, styles.meta, { flex: 1, textAlign: "right" }]}>{formatDate(l.created_at)}</Text>
          </>
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
            {thumb}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.piece} numberOfLines={1}>{title(l)}</Text>
              <Text style={styles.meta} numberOfLines={1}>{l.name} · {formatPrice(l.price)}</Text>
              <Text style={styles.meta}>{formatDate(l.created_at)} · {l.source === "embed" ? "Website" : "App"}</Text>
            </View>
            <StatusPill status={l.status} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.root} testID="admin-leads-screen">
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.h1}>Couldn’t load leads</Text>
          <Pressable onPress={() => refetch()} style={styles.chip}><Text style={styles.chipText}>Retry</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.leads ?? []}
          keyExtractor={(l) => l.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={[styles.content, wide && styles.contentWide]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="leads-empty">
              <Feather name="inbox" size={28} color={colors.brandPrimary} />
              <Text style={styles.emptyTitle}>No leads yet</Text>
              <Text style={styles.meta}>Add the builder to your website from “Website & Shopify” to start receiving requests.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  content: { padding: spacing.lg, gap: spacing.sm },
  contentWide: { padding: spacing["2xl"], gap: 0, maxWidth: 1200, width: "100%", alignSelf: "center" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface, marginTop: spacing.xs },
  sub: { fontFamily: fonts.text, fontSize: 14, color: c.muted, marginTop: spacing.xs },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  kpi: { flex: 1, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.xs },
  kpiValue: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface, marginTop: spacing.xs },
  kpiLabel: { fontFamily: fonts.medium, fontSize: 12, color: c.muted },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  chip: { height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, justifyContent: "center" },
  chipSel: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  chipTextSel: { color: c.onSurfaceInverse },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  searchInput: { flex: 1, height: 44, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  headRow: { backgroundColor: "transparent", borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, paddingVertical: spacing.sm, marginTop: spacing.sm },
  th: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.5, color: c.muted },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.divider },
  card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  cell: {},
  thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: c.surfaceSecondary },
  thumbEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: c.brandTertiary },
  piece: { fontFamily: fonts.display, fontSize: 15, color: c.onSurface },
  cust: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
  meta: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  val: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing["3xl"], paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
}));
