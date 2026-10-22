import Feather from "@react-native-vector-icons/feather";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { platformApi, type PlatformTenant } from "@/src/api";
import { useAuth } from "@/src/auth";
import { PlatformLogin } from "@/src/components/platform/platform-login";
import { TenantCard } from "@/src/components/platform/tenant-card";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const KEY = "atelier_platform_token";
type List = { tenants: PlatformTenant[]; total: number; totals: { active: number; ai_month: number; leads: number } };

/** Software-supplier console: every business account, usage, pause/resume, support access. */
export default function PlatformConsole() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const qc = useQueryClient();
  const { startSession } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ business_name: "", owner_name: "", owner_email: "" });

  useEffect(() => {
    storage.secureGet<string | null>(KEY, null).then((t) => { setToken(t); setReady(true); });
  }, []);
  const signIn = async (t: string) => { await storage.secureSet(KEY, t); setToken(t); };
  const signOut = useCallback(async () => { await storage.secureRemove(KEY); setToken(null); }, []);

  const list = useQuery({
    queryKey: ["platform", "tenants", q],
    queryFn: () => platformApi.call<List>(token!, `/tenants?q=${encodeURIComponent(q)}`),
    enabled: !!token,
  });
  useEffect(() => {
    if ((list.error as { status?: number } | null)?.status === 401) signOut();
  }, [list.error, signOut]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["platform"] });
  const call = <T,>(path: string, init?: RequestInit) => platformApi.call<T>(token!, path, init);

  const create = async () => {
    try {
      const r = await call<{ tenant: PlatformTenant; temporary_password: string }>("/tenants", { method: "POST", body: JSON.stringify(form) });
      setMsg(`Created ${r.tenant.name}. Owner login: ${form.owner_email} / ${r.temporary_password}`);
      setForm({ business_name: "", owner_name: "", owner_email: "" });
      refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  const actions = {
    toggle: async (t: PlatformTenant) => {
      await call(`/tenants/${t.id}`, { method: "PATCH", body: JSON.stringify({ status: t.status === "active" ? "paused" : "active" }) });
      refresh();
    },
    plan: async (t: PlatformTenant, plan: string) => {
      await call(`/tenants/${t.id}`, { method: "PATCH", body: JSON.stringify({ plan }) });
      refresh();
    },
    open: async (t: PlatformTenant) => {
      try {
        const r = await call<{ access_token: string }>(`/tenants/${t.id}/impersonate`, { method: "POST" });
        if (Platform.OS === "web") {
          window.location.href = `/admin?store=${t.slug}&sso=${encodeURIComponent(r.access_token)}`;
          return;
        }
        await startSession(r.access_token);
        router.push("/admin");
      } catch (e) {
        setMsg((e as Error).message);
      }
    },
    reset: async (t: PlatformTenant) => {
      const r = await call<{ email: string; temporary_password: string }>(`/tenants/${t.id}/reset-owner-password`, { method: "POST" })
        .catch((e: Error) => ({ email: "", temporary_password: "", error: e.message }));
      setMsg(r.temporary_password ? `New temporary password for ${r.email}: ${r.temporary_password}` : "Couldn't reset the password");
    },
  };

  if (!ready) return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;
  if (!token) return <PlatformLogin onSignedIn={signIn} />;

  const t = list.data?.totals;
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]} testID="platform-console">
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>ATELIER PLATFORM</Text>
          <Text style={styles.h1}>Businesses</Text>
        </View>
        <Pressable testID="platform-sign-out" onPress={signOut} style={styles.outline}>
          <Feather name="log-out" size={14} color={colors.onSurface} />
          <Text style={styles.outlineText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.stats}>
        {[["Businesses", list.data?.total], ["Active", t?.active], ["AI images this month", t?.ai_month], ["Leads (all time)", t?.leads]].map(([l, v]) => (
          <View key={l as string} style={styles.stat}><Text style={styles.statVal}>{v ?? "–"}</Text><Text style={styles.statLabel}>{l}</Text></View>
        ))}
      </View>

      {!!msg && <Text style={styles.msg} selectable testID="platform-message">{msg}</Text>}

      <View style={styles.panel}>
        <Text style={styles.h3}>Add a business</Text>
        <View style={[styles.formRow, width < 760 && { flexDirection: "column" }]}>
          {(["business_name", "owner_name", "owner_email"] as const).map((k) => (
            <TextInput key={k} testID={`platform-new-${k}`} value={form[k]} onChangeText={(v) => setForm({ ...form, [k]: v })}
              placeholder={{ business_name: "Business name", owner_name: "Owner name", owner_email: "Owner email" }[k]}
              autoCapitalize={k === "owner_email" ? "none" : "words"} placeholderTextColor={colors.muted} style={styles.input} />
          ))}
          <Pressable testID="platform-create-business" onPress={create} style={styles.darkBtn}><Text style={styles.darkText}>Create</Text></Pressable>
        </View>
      </View>

      <TextInput testID="platform-search" value={q} onChangeText={setQ} placeholder="Search businesses" placeholderTextColor={colors.muted} style={[styles.input, { flex: 0 }]} />
      {list.isLoading ? <ActivityIndicator color={colors.brand} /> : list.data?.tenants.map((x) => <TenantCard key={x.id} t={x} actions={actions} />)}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.xl, gap: spacing.lg, maxWidth: 1100, width: "100%", alignSelf: "center" },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.5, color: c.brandPrimary },
  h1: { fontFamily: fonts.display, fontSize: 32, color: c.onSurface },
  h3: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: 160, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: spacing.lg },
  statVal: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, color: c.muted },
  msg: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurface, backgroundColor: c.brandTertiary, padding: spacing.md, borderRadius: radius.md },
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, gap: spacing.md },
  formRow: { flexDirection: "row", gap: spacing.sm },
  input: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  darkBtn: { height: 46, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center", alignItems: "center" },
  darkText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  outline: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong },
  outlineText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
}));
