import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { platformApi } from "@/src/api";
import { KaratLogo } from "@/src/components/karat-logo";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function PlatformLogin({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onSignedIn((await platformApi.login(email.trim(), password)).access_token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.root} contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled" testID="platform-login">
      <View style={styles.card}>
        <KaratLogo height={44} />
        <Text style={styles.eyebrow}>KARAT PLATFORM</Text>
        <Text style={styles.title}>Supplier console</Text>
        <TextInput testID="platform-email-input" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          placeholder="Email" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput testID="platform-password-input" value={password} onChangeText={setPassword} secureTextEntry placeholder="Password"
          placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={submit} />
        {!!error && <Text style={styles.error} testID="platform-login-error">{error}</Text>}
        <Pressable testID="platform-login-submit" onPress={submit} disabled={busy} style={styles.btn}>
          {busy ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.btnText}>Sign in</Text>}
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceSecondary },
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 400, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing["2xl"], gap: spacing.md, borderWidth: 1, borderColor: c.border },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  title: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface, marginBottom: spacing.sm },
  input: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error },
  btn: { marginTop: spacing.sm, height: 52, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  btnText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
}));
