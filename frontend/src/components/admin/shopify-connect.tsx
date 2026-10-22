import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from "react-native";

import { dashRequest } from "@/src/api";
import { useAuth } from "@/src/auth";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

/** Link this business to its Shopify store (starts the Shopify install from the dashboard). */
export function ShopifyConnect() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const [shop, setShop] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!shop.trim()) return setError("Enter your store address.");
    setBusy(true);
    setError(null);
    try {
      const r = await dashRequest<{ authorize_url: string }>(token!, "/shopify/connect", { method: "POST", body: JSON.stringify({ shop }) });
      await Linking.openURL(r.authorize_url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.sm }} testID="shopify-connect">
      <Text style={styles.label}>CONNECT YOUR STORE</Text>
      <View style={styles.row}>
        <TextInput testID="shopify-connect-input" value={shop} onChangeText={setShop} autoCapitalize="none" placeholder="your-store.myshopify.com"
          placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={go} />
        <Pressable testID="shopify-connect-button" onPress={go} disabled={busy} style={styles.btn}>
          {busy ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.btnText}>Connect</Text>}
        </Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.8, color: c.onSurface, marginTop: spacing.xs },
  row: { flexDirection: "row", gap: spacing.sm },
  input: { flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  btn: { height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  btnText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  error: { fontFamily: fonts.medium, fontSize: 12, color: c.error },
}));
