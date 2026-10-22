import Feather from "@react-native-vector-icons/feather";
import { useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, Text, TextInput, View } from "react-native";

import { useDashQuery } from "@/src/components/admin/use-dash";
import { formatDate } from "@/src/components/admin/status";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Cust = {
  user_id: string; email: string; name?: string; phone?: string; kind: "contact" | "account"; google?: boolean;
  answers?: Record<string, { label: string; answer: string }>; created_at: string; last_seen?: string; leads: number;
};

export default function CustomersScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const { data, isLoading } = useDashQuery<{ customers: Cust[]; total: number }>(["customers", q], `/customers?q=${encodeURIComponent(q)}`);

  return (
    <View style={{ flex: 1 }} testID="admin-customers-screen">
      <FlatList
        data={data?.customers ?? []}
        keyExtractor={(c) => c.user_id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <Text style={styles.eyebrow}>CUSTOMERS</Text>
            <Text style={styles.h1}>People who shared details or signed up</Text>
            <View style={styles.search}>
              <Feather name="search" size={16} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search name, email, phone" placeholderTextColor={colors.muted} style={styles.searchInput} testID="customers-search-input" />
            </View>
            {isLoading && <ActivityIndicator color={colors.brand} />}
          </View>
        }
        ListEmptyComponent={!isLoading ? <Text style={styles.meta} testID="customers-empty">No customers yet. They appear here when they fill a contact form or create an account.</Text> : null}
        renderItem={({ item: c }) => (
          <View style={styles.card} testID={`customer-row-${c.user_id}`}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{c.name || c.email}</Text>
                <Text style={styles.meta}>{c.email}{c.phone ? ` · ${c.phone}` : ""}</Text>
              </View>
              <View style={[styles.pill, c.kind === "account" && styles.pillAcc]}>
                <Text style={styles.pillText}>{c.kind === "account" ? (c.google ? "Google account" : "Account") : "Contact form"}</Text>
              </View>
            </View>
            {!!c.answers && Object.values(c.answers).map((a) => <Text key={a.label} style={styles.meta}><Text style={styles.qLabel}>{a.label}: </Text>{a.answer}</Text>)}
            <View style={styles.rowTop}>
              <Text style={styles.meta}>Joined {formatDate(c.created_at)} · {c.leads} request{c.leads === 1 ? "" : "s"}</Text>
              <Pressable onPress={() => Linking.openURL(`mailto:${c.email}`)} style={styles.mail} testID={`customer-email-${c.user_id}`}>
                <Feather name="mail" size={14} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  content: { padding: spacing.xl, gap: spacing.sm, maxWidth: 1000, width: "100%", alignSelf: "center" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  searchInput: { flex: 1, height: 44, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  card: { backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.xs },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md, justifyContent: "space-between" },
  name: { fontFamily: fonts.display, fontSize: 17, color: c.onSurface },
  meta: { fontFamily: fonts.text, fontSize: 13, color: c.muted },
  qLabel: { fontFamily: fonts.bold, color: c.onSurface },
  pill: { paddingHorizontal: spacing.md, height: 26, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.surfaceTertiary },
  pillAcc: { backgroundColor: c.brandTertiary },
  pillText: { fontFamily: fonts.bold, fontSize: 11, color: c.onSurface },
  mail: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
}));
