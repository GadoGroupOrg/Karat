import Feather from "@react-native-vector-icons/feather";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Level, dashRequest } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useDashQuery } from "@/src/components/admin/use-dash";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Q = { id: string; label: string; required: boolean };
type Access = { rules: Record<string, Level>; questions: Q[]; actions: Record<string, string> };
const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "none", label: "Open", hint: "Anyone" },
  { id: "form", label: "Contact form", hint: "Name, email, phone + your questions" },
  { id: "account", label: "Account", hint: "Email/password or Google" },
];

export default function AccessScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const { data, isLoading } = useDashQuery<Access>(["access"], "/access");
  const [rules, setRules] = useState<Record<string, Level>>({});
  const [qs, setQs] = useState<Q[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (data) {
      setRules(data.rules);
      setQs(data.questions);
    }
  }, [data]);

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const clean = qs.filter((q) => q.label.trim()).map((q, i) => ({ ...q, id: q.id || `q${i + 1}`, label: q.label.trim() }));
      await dashRequest(token!, "/access", { method: "PUT", body: JSON.stringify({ rules, questions: clean }) });
      setQs(clean);
      setMsg({ ok: true, text: "Saved. New visitors see these requirements immediately." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.content} testID="admin-access-screen">
      <Text style={styles.eyebrow}>CUSTOMER ACCESS</Text>
      <Text style={styles.h1}>What customers need to unlock each feature</Text>
      <Text style={styles.sub}>Keep features open to everyone, ask for a quick contact form, or require a customer account. Gating AI features also protects your AI credits.</Text>
      {!!msg && <View style={[styles.msg, { backgroundColor: msg.ok ? colors.success : colors.error }]} testID="access-message"><Text style={styles.msgText}>{msg.text}</Text></View>}

      <View style={styles.panel}>
        {Object.entries(data.actions).map(([id, label]) => (
          <View key={id} style={styles.row} testID={`access-row-${id}`}>
            <Text style={styles.action}>{label}</Text>
            <View style={styles.seg}>
              {LEVELS.map((l) => {
                const sel = (rules[id] ?? "none") === l.id;
                return (
                  <Pressable key={l.id} testID={`access-${id}-${l.id}`} onPress={() => setRules({ ...rules, [id]: l.id })} style={[styles.segBtn, sel && styles.segSel]}>
                    <Text style={[styles.segText, sel && { color: colors.onSurfaceInverse }]}>{l.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Text style={styles.hint}>{LEVELS.map((l) => `${l.label}: ${l.hint}`).join("  ·  ")}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.h3}>Contact form questions</Text>
        <Text style={styles.hint}>Asked after name, email and phone, e.g. “Budget”, “When do you need it?”, “How did you hear about us?”</Text>
        {qs.map((q, i) => (
          <View key={i} style={styles.qRow} testID={`access-question-${i}`}>
            <TextInput value={q.label} onChangeText={(v) => setQs(qs.map((x, j) => (j === i ? { ...x, label: v } : x)))} placeholder="Question"
              placeholderTextColor={colors.muted} style={styles.input} maxLength={120} testID={`access-question-input-${i}`} />
            <Text style={styles.hint}>Required</Text>
            <Switch value={q.required} onValueChange={(v) => setQs(qs.map((x, j) => (j === i ? { ...x, required: v } : x)))} trackColor={{ true: colors.brand, false: colors.surfaceTertiary }} />
            <Pressable onPress={() => setQs(qs.filter((_, j) => j !== i))} style={styles.icon} testID={`access-question-remove-${i}`}><Feather name="trash-2" size={16} color={colors.error} /></Pressable>
          </View>
        ))}
        {qs.length < 10 && (
          <Pressable testID="access-add-question-button" onPress={() => setQs([...qs, { id: `q${Date.now()}`, label: "", required: false }])} style={styles.outlineBtn}>
            <Feather name="plus" size={14} color={colors.onSurface} />
            <Text style={styles.outlineText}>Add question</Text>
          </Pressable>
        )}
      </View>
      <Pressable testID="access-save-button" onPress={save} disabled={busy} style={[styles.darkBtn, busy && { opacity: 0.6 }]}>
        {busy ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.darkText}>Save access rules</Text>}
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 1000, width: "100%", alignSelf: "center", paddingBottom: spacing["3xl"] },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
  h3: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted },
  hint: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  action: { fontFamily: fonts.medium, fontSize: 15, color: c.onSurface, minWidth: 180 },
  seg: { flexDirection: "row", gap: 4, padding: 3, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary },
  segBtn: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: "center" },
  segSel: { backgroundColor: c.surfaceInverse },
  segText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  qRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  input: { flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  outlineBtn: { flexDirection: "row", gap: spacing.sm, alignSelf: "flex-start", height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center" },
  outlineText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
  darkBtn: { alignSelf: "flex-start", height: 48, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  darkText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  msg: { padding: spacing.lg, borderRadius: radius.md },
  msgText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSuccess },
}));
