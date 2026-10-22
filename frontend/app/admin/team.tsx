import Feather from "@react-native-vector-icons/feather";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { changePassword, dashRequest } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useDashQuery } from "@/src/components/admin/use-dash";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Member = { id: string; email: string; name: string; role: "owner" | "staff"; created_at: string };

export default function TeamScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token, admin } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useDashQuery<{ users: Member[]; me: string }>(["team"], "/team");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" as Member["role"] });
  const [msg, setMsg] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "" });
  const call = (path: string, init?: RequestInit) => dashRequest<Record<string, string>>(token!, path, init);
  const refresh = () => qc.invalidateQueries({ queryKey: ["dash", "team"] });

  const add = useMutation({
    mutationFn: () => call("/team", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { setForm({ name: "", email: "", password: "", role: "staff" }); setMsg("Team member added. Share their email and password with them."); refresh(); },
    onError: (e: Error) => setMsg(e.message),
  });
  const confirm = (q: string) => (Platform.OS === "web" ? window.confirm(q) : true);
  const remove = async (m: Member) => {
    if (!confirm(`Remove ${m.email}?`)) return;
    await call(`/team/${m.id}`, { method: "DELETE" }).catch((e: Error) => setMsg(e.message));
    refresh();
  };
  const reset = async (m: Member) => {
    const r: Record<string, string> = await call(`/team/${m.id}/reset-password`, { method: "POST" }).catch((e: Error) => ({ error: e.message }));
    setMsg(r.temporary_password ? `Temporary password for ${m.email}: ${r.temporary_password}` : r.error);
  };
  const savePw = async () => {
    try {
      await changePassword(token!, pw.current, pw.next);
      setPw({ current: "", next: "" });
      setMsg("Your password was updated.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} testID="admin-team-screen">
      <Text style={styles.eyebrow}>ACCOUNT</Text>
      <Text style={styles.h1}>Team</Text>
      <Text style={styles.sub}>Give your staff their own login. Staff can manage leads and consultations; only owners manage the team.</Text>
      {!!msg && <Text style={styles.msg} selectable testID="team-message">{msg}</Text>}

      <View style={styles.panel}>
        {isLoading ? <ActivityIndicator color={colors.brand} /> : data?.users.map((m) => (
          <View key={m.id} style={styles.row} testID={`team-member-${m.email}`}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(m.name || m.email).charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{m.name || m.email}{m.id === data.me ? " (you)" : ""}</Text>
              <Text style={styles.meta}>{m.email} · {m.role === "owner" ? "Owner" : "Staff"}</Text>
            </View>
            {m.id !== data.me && admin?.role === "owner" && (
              <>
                <Pressable testID={`team-reset-${m.email}`} onPress={() => reset(m)} style={styles.iconBtn}><Feather name="key" size={16} color={colors.onSurface} /></Pressable>
                <Pressable testID={`team-remove-${m.email}`} onPress={() => remove(m)} style={styles.iconBtn}><Feather name="trash-2" size={16} color={colors.error} /></Pressable>
              </>
            )}
          </View>
        ))}
      </View>

      {admin?.role === "owner" && (
        <View style={styles.panel}>
          <Text style={styles.h3}>Add a team member</Text>
          {(["name", "email", "password"] as const).map((k) => (
            <TextInput key={k} testID={`team-add-${k}-input`} value={form[k]} onChangeText={(v) => setForm({ ...form, [k]: v })}
              placeholder={k === "password" ? "Temporary password (8+ characters)" : k === "email" ? "Email" : "Name"} autoCapitalize={k === "name" ? "words" : "none"}
              placeholderTextColor={colors.muted} style={styles.input} />
          ))}
          <View style={styles.seg}>
            {(["staff", "owner"] as const).map((r) => (
              <Pressable key={r} testID={`team-role-${r}`} onPress={() => setForm({ ...form, role: r })} style={[styles.segItem, form.role === r && styles.segSel]}>
                <Text style={[styles.segText, form.role === r && { color: colors.onSurfaceInverse }]}>{r === "staff" ? "Staff" : "Owner"}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable testID="team-add-button" onPress={() => add.mutate()} disabled={add.isPending} style={styles.darkBtn}>
            {add.isPending ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.darkText}>Add member</Text>}
          </Pressable>
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.h3}>Change your password</Text>
        <TextInput testID="team-current-password" value={pw.current} onChangeText={(v) => setPw({ ...pw, current: v })} secureTextEntry placeholder="Current password" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput testID="team-new-password" value={pw.next} onChangeText={(v) => setPw({ ...pw, next: v })} secureTextEntry placeholder="New password (8+ characters)" placeholderTextColor={colors.muted} style={styles.input} />
        <Pressable testID="team-save-password" onPress={savePw} style={styles.darkBtn}><Text style={styles.darkText}>Update password</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 760, width: "100%" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.5, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface },
  h3: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted },
  msg: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface, backgroundColor: c.brandTertiary, padding: spacing.md, borderRadius: radius.md },
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  name: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  meta: { fontFamily: fonts.text, fontSize: 12, color: c.muted },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  input: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  seg: { flexDirection: "row", gap: spacing.sm },
  segItem: { height: 40, paddingHorizontal: spacing.xl, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, justifyContent: "center" },
  segSel: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  segText: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface },
  darkBtn: { alignSelf: "flex-start", height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  darkText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
}));
