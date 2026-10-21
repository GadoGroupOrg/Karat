import Feather from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useAuth } from "@/src/auth";
import { getBranding } from "@/src/branding";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function AdminLogin() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled" testID="admin-login-screen">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{(getBranding()?.store_name ?? "Atelier").toUpperCase()} · STORE ADMIN</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to manage design requests, branding and your website builder.</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput testID="admin-login-email-input" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
          keyboardType="email-address" placeholder="you@store.com" placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={submit} />
        <Text style={styles.label}>Password</Text>
        <View style={styles.pwWrap}>
          <TextInput testID="admin-login-password-input" value={password} onChangeText={setPassword} secureTextEntry={!show}
            autoComplete="current-password" placeholder="Password" placeholderTextColor={colors.muted} style={[styles.input, { flex: 1, borderWidth: 0 }]} onSubmitEditing={submit} />
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={8} style={styles.eye} testID="admin-login-toggle-password">
            <Feather name={show ? "eye-off" : "eye"} size={18} color={colors.muted} />
          </Pressable>
        </View>
        {!!error && <Text style={styles.error} testID="admin-login-error">{error}</Text>}
        <Pressable testID="admin-login-submit-button" onPress={submit} disabled={busy} style={({ pressed }) => [styles.btn, (pressed || busy) && { opacity: 0.8 }]}>
          {busy ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.btnText}>Sign in</Text>}
        </Pressable>
        <Pressable testID="admin-login-back-button" onPress={() => router.replace("/")} style={styles.back}>
          <Feather name="arrow-left" size={14} color={colors.muted} />
          <Text style={styles.backText}>Back to the store</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceSecondary },
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 420, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing["2xl"], borderWidth: 1, borderColor: c.border },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  title: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface, marginTop: spacing.sm },
  sub: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { fontFamily: fonts.bold, fontSize: 12, color: c.onSurface, marginTop: spacing.md, marginBottom: spacing.xs },
  input: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface },
  pwWrap: { flexDirection: "row", alignItems: "center", borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary },
  eye: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error, marginTop: spacing.md },
  btn: { marginTop: spacing.xl, height: 52, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  back: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, marginTop: spacing.lg, height: 40 },
  backText: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
}));
