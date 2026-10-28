import Feather from "@react-native-vector-icons/feather";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Customer, Level, customerApi } from "@/src/api";
import { getBranding } from "@/src/branding";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = {
  need: Level;
  action: string;
  questions: { id: string; label: string; required: boolean }[];
  customer: Customer | null;
  onDone: (r: { session_token: string; user: Customer }) => void;
  onCancel: () => void;
  onGoogle: () => void;
};

/** Shown when the jeweler requires a contact form or an account before an action. */
export function GateModal({ need, action, questions, customer, onDone, onCancel, onGoogle }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [tab, setTab] = useState<"form" | "signin" | "signup">(need === "form" ? "form" : "signup");
  const [f, setF] = useState({ name: customer?.name ?? "", email: customer?.email ?? "", phone: customer?.phone ?? "", password: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const store = getBranding()?.store_name ?? "our studio";

  const submit = async () => {
    setError(null);
    const emailOk = /^\S+@\S+\.\S+$/.test(f.email.trim());
    if (!emailOk || (tab !== "signin" && !f.name.trim())) return setError("Please enter your name and a valid email.");
    if (tab !== "form" && f.password.length < (tab === "signup" ? 8 : 1)) return setError("Password must be at least 8 characters.");
    const missing = tab === "form" && questions.find((q) => q.required && !answers[q.id]?.trim());
    if (missing) return setError(`Please answer: ${missing.label}`);
    setBusy(true);
    try {
      const r = tab === "form"
        ? await customerApi.contact({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), answers })
        : tab === "signup"
          ? await customerApi.register({ name: f.name.trim(), email: f.email.trim(), password: f.password, phone: f.phone.trim() })
          : await customerApi.login({ email: f.email.trim(), password: f.password });
      onDone(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input = (key: keyof typeof f, placeholder: string, extra?: object) => (
    <TextInput testID={`gate-${key}-input`} value={f[key]} onChangeText={(v) => setF({ ...f, [key]: v })} placeholder={placeholder}
      placeholderTextColor={colors.muted} style={styles.input} {...extra} />
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <KeyboardAwareScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <View style={styles.card} testID="gate-modal">
            <View style={styles.head}>
              <Text style={styles.eyebrow}>{store.toUpperCase()}</Text>
              <Pressable onPress={onCancel} hitSlop={8} style={styles.close} testID="gate-close-button"><Feather name="x" size={20} color={colors.onSurface} /></Pressable>
            </View>
            <Text style={styles.title}>{tab === "form" ? "A few details first" : tab === "signup" ? "Create your account" : "Welcome back"}</Text>
            <Text style={styles.sub}>{tab === "form" ? `Share your details to ${action}. Our jewelers may follow up personally.` : `Sign in to ${action} and keep your designs in one place.`}</Text>

            {need !== "none" && (
              <>
                <Pressable testID="gate-google-button" onPress={onGoogle} style={styles.google}>
                  <Text style={styles.gIcon}>G</Text>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </Pressable>
                <View style={styles.orRow}><View style={styles.line} /><Text style={styles.or}>or</Text><View style={styles.line} /></View>
              </>
            )}

            {tab !== "signin" && input("name", "Full name", { autoComplete: "name" })}
            {input("email", "Email", { autoCapitalize: "none", keyboardType: "email-address", autoComplete: "email" })}
            {tab !== "signin" && input("phone", "Phone (optional)", { keyboardType: "phone-pad" })}
            {tab !== "form" && input("password", tab === "signup" ? "Password (8+ characters)" : "Password", { secureTextEntry: true })}
            {tab === "form" && questions.map((q) => (
              <TextInput key={q.id} testID={`gate-question-${q.id}`} value={answers[q.id] ?? ""} onChangeText={(v) => setAnswers({ ...answers, [q.id]: v })}
                placeholder={`${q.label}${q.required ? "" : " (optional)"}`} placeholderTextColor={colors.muted} style={styles.input} />
            ))}
            {!!error && <Text style={styles.error} testID="gate-error">{error}</Text>}
            <Pressable testID="gate-submit-button" onPress={submit} disabled={busy} style={[styles.btn, busy && { opacity: 0.7 }]}>
              {busy ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.btnText}>{tab === "form" ? "Continue" : tab === "signup" ? "Create account" : "Sign in"}</Text>}
            </Pressable>
            {tab !== "form" && (
              <Pressable testID="gate-switch-tab" onPress={() => { setError(null); setTab(tab === "signup" ? "signin" : "signup"); }} style={styles.link}>
                <Text style={styles.linkText}>{tab === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  scrim: { flex: 1, backgroundColor: c.scrim },
  center: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  card: { width: "100%", maxWidth: 440, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -spacing.md },
  title: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted },
  input: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface },
  google: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, height: 50, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong },
  gIcon: { fontFamily: fonts.bold, fontSize: 18, color: c.onSurface },
  googleText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurface },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: c.divider },
  or: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error },
  btn: { height: 52, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center", marginTop: spacing.xs },
  btnText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  link: { height: 40, alignItems: "center", justifyContent: "center" },
  linkText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface, textDecorationLine: "underline" },
}));
