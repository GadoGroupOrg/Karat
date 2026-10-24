import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Lead, assetUrl, formatPrice, leadImage, useCatalog, usePrice } from "@/src/api";
import { useAuth } from "@/src/auth";
import { getBranding } from "@/src/branding";
import { BRIEF_SECTIONS } from "@/src/components/admin/crafting-brief";
import { isImage } from "@/src/components/admin/lead-files";
import { useDashQuery } from "@/src/components/admin/use-dash";
import { designRows } from "@/src/design-rows";

/* The job sheet is a paper document: it stays black-on-white in every theme, so it uses fixed print colours. */
const INK = "#111111", MUTED = "#666666", LINE = "#DDDDDD", PAPER = "#FFFFFF";

/** Printable workshop job sheet: photos, design spec, crafting brief and sign-off boxes. */
export default function JobSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, loading } = useAuth();
  const { data: lead, isLoading } = useDashQuery<Lead>(["lead", id], `/leads/${id}`);
  const { data: catalog } = useCatalog();
  const price = usePrice(lead?.design ?? null);
  const [printing, setPrinting] = useState(false);

  if (loading || isLoading) return <View style={s.center}><ActivityIndicator color={INK} /></View>;
  if (!token || !lead) {
    return (
      <View style={s.center}>
        <Text style={s.h2}>Sign in to the dashboard to view this job sheet.</Text>
        <Pressable onPress={() => router.replace("/admin")} style={s.btn}><Text style={s.btnText}>Go to dashboard</Text></Pressable>
      </View>
    );
  }
  const spec = lead.design && catalog ? designRows(catalog, lead.design, price.data?.lines ?? []) : null;
  const brief = lead.brief ?? {};
  const img = leadImage(lead);
  const title = lead.design?.name?.trim() || (lead.kind === "product" ? lead.product?.title : lead.sketch?.uploaded ? "Redesign of customer’s photo" : `Custom ${spec?.typeName.toLowerCase() ?? "piece"}`);
  const print = () => {
    if (Platform.OS !== "web") return;
    setPrinting(true); // hide the on-screen buttons on paper
    setTimeout(() => { window.print(); setPrinting(false); }, 60);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: PAPER }} contentContainerStyle={s.page} testID="job-sheet">
      {!printing && <View style={s.actions}>
        <Pressable testID="job-sheet-back" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/admin/leads/${id}` as never))} style={s.btnOutline}>
          <Feather name="arrow-left" size={14} color={INK} /><Text style={s.btnOutlineText}>Back</Text>
        </Pressable>
        <Pressable testID="job-sheet-print" onPress={print} style={s.btn}><Feather name="printer" size={14} color={PAPER} /><Text style={s.btnText}>Print</Text></Pressable>
      </View>}

      <View style={s.header}>
        <View style={{ flexGrow: 1, flexBasis: 280 }}>
          <Text style={s.eyebrow}>{(getBranding()?.store_name ?? "Workshop").toUpperCase()} · WORKSHOP JOB SHEET</Text>
          <Text style={s.h1} testID="job-sheet-title">{title}</Text>
          <Text style={s.meta}>Job #{lead.id.slice(-8).toUpperCase()} · Received {new Date(lead.created_at).toLocaleDateString()}{brief.due_date ? ` · Due ${brief.due_date}` : ""}</Text>
        </View>
        <View style={s.box}>
          <Text style={s.k}>Client</Text><Text style={s.v}>{lead.name}</Text>
          <Text style={s.meta}>{lead.email}{lead.phone ? ` · ${lead.phone}` : ""}</Text>
          {!!lead.price && <Text style={s.meta}>Estimate {formatPrice(lead.price)}{brief.budget ? ` · Budget ${brief.budget}` : ""}</Text>}
        </View>
      </View>

      <View style={s.images}>
        {!!img && <Image source={{ uri: img }} style={s.img} contentFit="contain" testID="job-sheet-image" />}
        {!!lead.sketch && <Image source={{ uri: assetUrl(lead.sketch.sketch_url) }} style={s.img} contentFit="contain" />}
        {(lead.attachments ?? []).filter(isImage).map((a) => (
          <Image key={a.id} source={{ uri: assetUrl(a.url) }} style={s.img} contentFit="contain" testID={`job-sheet-attachment-${a.id}`} />
        ))}
      </View>
      {(lead.attachments ?? []).some((a) => !isImage(a)) && (
        <View style={s.section} testID="job-sheet-files">
          <Text style={s.h3}>Files & links</Text>
          {(lead.attachments ?? []).filter((a) => !isImage(a)).map((a) => (
            <View key={a.id} style={s.row}><Text style={s.k}>{a.kind === "link" ? "Link" : "File"}</Text><Text style={s.v}>{a.kind === "link" && a.name !== a.url ? `${a.name} (${a.url})` : a.name}</Text></View>
          ))}
        </View>
      )}

      {!!spec?.rows.length && (
        <View style={s.section}>
          <Text style={s.h3}>Design as configured</Text>
          {spec.rows.map(([k, v]) => <View key={k} style={s.row}><Text style={s.k}>{k}</Text><Text style={s.v}>{v}</Text></View>)}
        </View>
      )}

      {BRIEF_SECTIONS.map((sec) => {
        const rows = sec.fields.filter((f) => brief[f.key]);
        return rows.length ? (
          <View key={sec.title} style={s.section} testID={`job-sheet-section-${sec.title}`}>
            <Text style={s.h3}>{sec.title}</Text>
            {rows.map((f) => <View key={f.key} style={s.row}><Text style={s.k}>{f.label}</Text><Text style={s.v}>{brief[f.key]}</Text></View>)}
          </View>
        ) : null;
      })}

      {(!!lead.note || !!lead.sketch?.note) && (
        <View style={s.section}>
          <Text style={s.h3}>Customer notes</Text>
          {!!lead.note && <Text style={s.v}>{lead.note}</Text>}
          {!!lead.sketch?.note && <Text style={s.v}>Mark-up: “{lead.sketch.note}”</Text>}
        </View>
      )}

      <View style={s.signoff}>
        {["CAD / design", "Casting", "Setting", "Polish & QC", "Client approval"].map((l) => (
          <View key={l} style={s.sign}><Text style={s.k}>{l}</Text><View style={s.signLine} /><Text style={s.meta}>Initials / date</Text></View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: PAPER, padding: 24 },
  page: { padding: 32, gap: 20, maxWidth: 900, width: "100%", alignSelf: "center" },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  header: { flexDirection: "row", gap: 24, flexWrap: "wrap", borderBottomWidth: 2, borderBottomColor: INK, paddingBottom: 16 },
  eyebrow: { fontSize: 11, letterSpacing: 2, fontWeight: "700", color: MUTED },
  h1: { fontSize: 26, fontWeight: "700", color: INK, marginTop: 4 },
  h2: { fontSize: 16, color: INK, textAlign: "center" },
  h3: { fontSize: 14, fontWeight: "700", letterSpacing: 1, color: INK, textTransform: "uppercase", marginBottom: 6 },
  meta: { fontSize: 12, color: MUTED, marginTop: 2 },
  box: { minWidth: 240, borderWidth: 1, borderColor: LINE, padding: 12, borderRadius: 6 },
  images: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  img: { flexGrow: 1, flexBasis: 260, aspectRatio: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6 },
  section: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 12 },
  row: { flexDirection: "row", gap: 16, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINE },
  k: { width: 200, fontSize: 12, color: MUTED },
  v: { flex: 1, fontSize: 13, color: INK },
  signoff: { flexDirection: "row", flexWrap: "wrap", gap: 12, borderTopWidth: 2, borderTopColor: INK, paddingTop: 16 },
  sign: { flexGrow: 1, flexBasis: 150, gap: 4 },
  signLine: { height: 32, borderBottomWidth: 1, borderBottomColor: INK },
  btn: { flexDirection: "row", gap: 8, alignItems: "center", height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: INK },
  btnText: { color: PAPER, fontWeight: "700" },
  btnOutline: { flexDirection: "row", gap: 8, alignItems: "center", height: 44, paddingHorizontal: 20, borderRadius: 22, borderWidth: 1, borderColor: INK },
  btnOutlineText: { color: INK, fontWeight: "700" },
});
