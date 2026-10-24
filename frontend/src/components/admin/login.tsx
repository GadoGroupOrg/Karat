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
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [business, setBusiness] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    if (mode === "up" && (business.trim().length < 2 || !name.trim())) return setError("Enter your business name and your name.");
    if (mode === "up" && password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") await signUp({ business_name: business.trim(), name: name.trim(), email, password });
      else await signIn(email, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled" testID="admin-login-screen">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{mode === "up" ? "KARAT FOR JEWELLERS" : `${(getBranding()?.store_name ?? "Karat").toUpperCase()} · STORE ADMIN`}</Text>
        <Text style={styles.title}>{mode === "up" ? "Create your studio" : "Welcome back"}</Text>
        <Text style={styles.sub}>
          {mode === "up"
            ? "Get your own branded jewelry builder, virtual try-on and consultation dashboard."
            : "Sign in to manage design requests, branding and your website builder."}
        </Text>
        {mode === "up" && (
          <>
            <Text style={styles.label}>Business name</Text>
            <TextInput testID="admin-signup-business-input" value={business} onChangeText={setBusiness} placeholder="e.g. Luna Fine Jewelry"
              placeholderTextColor={colors.muted} style={styles.input} autoComplete="organization" />
            <Text style={styles.label}>Your name</Text>
            <TextInput testID="admin-signup-name-input" value={name} onChangeText={setName} placeholder="Full name"
              placeholderTextColor={colors.muted} style={styles.input} autoComplete="name" />
          </>
        )}
        <Text style={styles.label}>Email</Text>
        <TextInput testID="admin-login-email-input" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
          keyboardType="email-address" placeholder="you@store.com" placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={submit} />
        <Text style={styles.label}>Password</Text>
        <View style={styles.pwWrap}>
          <TextInput testID="admin-login-password-input" value={password} onChangeText={setPassword} secureTextEntry={!show}
            autoComplete={mode === "up" ? "new-password" : "current-password"} placeholder={mode === "up" ? "At least 8 characters" : "Password"} placeholderTextColor={colors.muted} style={[styles.input, { flex: 1, borderWidth: 0 }]} onSubmitEditing={submit} />
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={8} style={styles.eye} testID="admin-login-toggle-password">
            <Feather name={show ? "eye-off" : "eye"} size={18} color={colors.muted} />
          </Pressable>
        </View>
        {!!error && <Text style={styles.error} testID="admin-login-error">{error}</Text>}
        <Pressable testID="admin-login-submit-button" onPress={submit} disabled={busy} style={({ pressed }) => [styles.btn, (pressed || busy) && { opacity: 0.8 }]}>
          {busy ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.btnText}>{mode === "up" ? "Create account" : "Sign in"}</Text>}
        </Pressable>
        <Pressable testID="admin-login-mode-toggle" onPress={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }} style={styles.back}>
          <Text style={styles.switchText}>{mode === "in" ? "New jeweller? Create a business account" : "Already have an account? Sign in"}</Text>
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
  switchText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface, textDecorationLine: "underline" },
  backText: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
}));
