import Feather from "@react-native-vector-icons/feather";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { connectStore, disconnectStore, syncStore, useCatalog } from "@/src/api";
import { useAuth } from "@/src/auth";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function StoreConnect() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: catalog } = useCatalog();
  const { token } = useAuth();
  const store = catalog?.store;
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState<null | "connect" | "sync" | "disconnect">(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (kind: "connect" | "sync" | "disconnect") => {
    if (!token) return router.replace("/admin");
    setError(null);
    setMessage(null);
    setBusy(kind);
    try {
      if (kind === "connect") {
        const r = await connectStore(token, domain);
        setMessage(`Connected ${r.store.name} · ${r.store.product_count} products`);
        setDomain("");
      } else if (kind === "sync") {
        const r = await syncStore(token);
        setMessage(`Synced ${r.store.product_count} products`);
      } else {
        await disconnectStore(token);
        setMessage("Store disconnected");
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["catalog"] }),
        qc.invalidateQueries({ queryKey: ["store-products"] }),
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.root} testID="store-connect-screen">
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="store-connect-close-button" onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin/embed"))} hitSlop={10} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
      </View>
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Text style={styles.eyebrow}>STORE SYNC</Text>
        <Text style={styles.h1}>Shopify connection</Text>
        <Text style={styles.lead}>We read your store&apos;s public product list. No API key needed, read-only.</Text>

        {store && (
          <View style={styles.card} testID="store-connected-card">
            <View style={styles.cardRow}>
              <View style={styles.dot} />
              <Text style={styles.cardTitle} numberOfLines={1}>{store.name}</Text>
            </View>
            <Text style={styles.cardMeta} testID="store-connected-domain">{store.domain}</Text>
            <Text style={styles.cardMeta} testID="store-product-count">
              {store.product_count} products · {store.currency} · synced {new Date(store.last_synced).toLocaleString()}
            </Text>
            <View style={styles.cardActions}>
              <Pressable testID="store-sync-button" onPress={() => run("sync")} disabled={!!busy} style={[styles.smallBtn, styles.smallPrimary]}>
                {busy === "sync" ? <ActivityIndicator color={colors.onSurfaceInverse} /> : (
                  <><Feather name="refresh-cw" size={14} color={colors.onSurfaceInverse} /><Text style={styles.smallPrimaryText}>Sync now</Text></>
                )}
              </Pressable>
              <Pressable testID="store-disconnect-button" onPress={() => run("disconnect")} disabled={!!busy} style={styles.smallBtn}>
                {busy === "disconnect" ? <ActivityIndicator color={colors.error} /> : <Text style={styles.disconnectText}>Disconnect</Text>}
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.label}>{store ? "SWITCH STORE" : "STORE DOMAIN"}</Text>
        <TextInput
          testID="store-domain-input"
          value={domain}
          onChangeText={setDomain}
          placeholder="yourstore.myshopify.com"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          returnKeyType="go"
          onSubmitEditing={() => domain.trim() && run("connect")}
        />
        <Pressable testID="store-connect-button" onPress={() => run("connect")} disabled={!domain.trim() || !!busy} style={[styles.primaryBtn, (!domain.trim() || !!busy) && { opacity: 0.5 }]}>
          {busy === "connect" ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.primaryText}>Connect & sync</Text>}
        </Pressable>
        {error && <Text style={styles.error} testID="store-connect-error">{error}</Text>}
        {message && <Text style={styles.success} testID="store-connect-message">{message}</Text>}
        <Pressable testID="open-merchant-price-sheet" onPress={() => router.push("/merchant")} style={[styles.smallBtn, { marginTop: spacing["2xl"], alignSelf: "flex-start" }]}>
          <Feather name="sliders" size={14} color={colors.onSurface} />
          <Text style={styles.outlineLabel}>Merchant price sheet</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: spacing.xl },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.5, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface, marginTop: spacing.xs },
  lead: { fontFamily: fonts.text, fontSize: 14, lineHeight: 21, color: c.muted, marginTop: spacing.sm },
  card: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.success },
  cardTitle: { flex: 1, fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  cardMeta: { fontFamily: fonts.text, fontSize: 13, color: c.muted, marginTop: spacing.xs },
  cardActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, height: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: "center", borderWidth: 1, borderColor: c.borderStrong },
  smallPrimary: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  smallPrimaryText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurfaceInverse },
  disconnectText: { fontFamily: fonts.bold, fontSize: 13, color: c.error },
  outlineLabel: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.onSurface, marginTop: spacing["2xl"], marginBottom: spacing.md },
  input: { height: 48, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface, borderWidth: 1, borderColor: c.border },
  primaryBtn: { marginTop: spacing.md, height: 52, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error, marginTop: spacing.md },
  success: { fontFamily: fonts.medium, fontSize: 13, color: c.success, marginTop: spacing.md },
}));
