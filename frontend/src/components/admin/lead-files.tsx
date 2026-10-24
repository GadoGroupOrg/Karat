import Feather from "@react-native-vector-icons/feather";
import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";

import { Lead, LeadAttachment, assetUrl, dashRequest, uploadLeadFile } from "@/src/api";
import { useAuth } from "@/src/auth";
import { formatDateTime } from "@/src/components/admin/status";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export const isImage = (a: LeadAttachment) => a.kind === "file" && !!a.mime?.startsWith("image/");
const sizeLabel = (n?: number) => (!n ? "" : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export function openAttachment(a: LeadAttachment) {
  const url = a.kind === "file" ? assetUrl(a.url) : a.url;
  if (Platform.OS === "web") window.open(url, "_blank", "noopener");
  else WebBrowser.openBrowserAsync(url);
}

/** Jeweller-only files & links on a lead (references, CAD, invoices…). Optional. */
export function LeadFiles({ lead }: { lead: Lead }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const items = lead.attachments ?? [];

  const run = async (key: string, fn: () => Promise<Lead>) => {
    setBusy(key);
    setError(null);
    try {
      qc.setQueryData(["dash", "lead", lead.id], await fn());
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const pickFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const f = r.assets[0];
    if (f.size && f.size > 25_000_000) return setError("File is too large (max 25 MB)");
    run("upload", () => uploadLeadFile(token!, lead.id, { uri: f.uri, name: f.name, mimeType: f.mimeType }));
  };

  const addLink = async () => {
    const u = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const ok = await run("link", () => dashRequest<Lead>(token!, `/leads/${lead.id}/links`, { method: "POST", body: JSON.stringify({ url: u, label: label.trim() }) }));
    if (ok) { setUrl(""); setLabel(""); setLinkOpen(false); }
  };

  const remove = (a: LeadAttachment) => run(a.id, () => dashRequest<Lead>(token!, `/leads/${lead.id}/attachments/${a.id}`, { method: "DELETE" }));

  return (
    <View style={styles.panel} testID="lead-files-panel">
      <Text style={styles.eyebrow}>FILES & LINKS</Text>
      <Text style={styles.muted}>Optional. Reference photos, CAD files, invoices or links. Only your team sees these; images also print on the job sheet.</Text>

      <View style={styles.btnRow}>
        <Pressable testID="lead-upload-file-button" onPress={pickFile} disabled={!!busy} style={[styles.outlineBtn, !!busy && { opacity: 0.6 }]}>
          {busy === "upload" ? <ActivityIndicator size="small" color={colors.onSurface} /> : <Feather name="upload" size={14} color={colors.onSurface} />}
          <Text style={styles.outlineText}>{busy === "upload" ? "Uploading…" : "Upload file"}</Text>
        </Pressable>
        <Pressable testID="lead-add-link-button" onPress={() => setLinkOpen((v) => !v)} disabled={!!busy} style={styles.outlineBtn}>
          <Feather name="link" size={14} color={colors.onSurface} />
          <Text style={styles.outlineText}>Add link</Text>
        </Pressable>
      </View>

      {linkOpen && (
        <View style={styles.linkBox} testID="lead-link-form">
          <TextInput testID="lead-link-url-input" value={url} onChangeText={setUrl} placeholder="https://…" placeholderTextColor={colors.muted}
            autoCapitalize="none" keyboardType="url" style={styles.input} />
          <TextInput testID="lead-link-label-input" value={label} onChangeText={setLabel} placeholder="Label (optional)" placeholderTextColor={colors.muted} style={styles.input} />
          <Pressable testID="lead-link-save-button" onPress={addLink} disabled={!url.trim() || busy === "link"}
            style={[styles.darkBtn, (!url.trim() || busy === "link") && { opacity: 0.5 }]}>
            {busy === "link" ? <ActivityIndicator size="small" color={colors.onSurfaceInverse} /> : <Text style={styles.darkText}>Save link</Text>}
          </Pressable>
        </View>
      )}
      {!!error && <Text style={styles.error} testID="lead-files-error">{error}</Text>}

      <View style={{ marginTop: spacing.md, gap: spacing.sm }} testID="lead-files-list">
        {items.length === 0 && <Text style={styles.muted}>No files or links yet.</Text>}
        {items.map((a) => (
          <View key={a.id} style={styles.item} testID={`lead-file-${a.id}`}>
            <Pressable onPress={() => openAttachment(a)} style={styles.itemMain} testID={`lead-file-open-${a.id}`}>
              {isImage(a) ? <Image source={{ uri: assetUrl(a.url) }} style={styles.thumb} contentFit="cover" /> : (
                <View style={[styles.thumb, styles.icon]}><Feather name={a.kind === "link" ? "link" : "file"} size={18} color={colors.brandPrimary} /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{a.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>{[a.kind === "link" ? "Link" : sizeLabel(a.size), a.author, formatDateTime(a.created_at)].filter(Boolean).join(" · ")}</Text>
              </View>
            </Pressable>
            <Pressable testID={`lead-file-remove-${a.id}`} onPress={() => remove(a)} disabled={!!busy} hitSlop={6} style={styles.remove} accessibilityLabel={`Remove ${a.name}`}>
              {busy === a.id ? <ActivityIndicator size="small" color={colors.muted} /> : <Feather name="trash-2" size={16} color={colors.muted} />}
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  panel: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.xl, marginTop: spacing.lg },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: c.brandPrimary },
  muted: { fontFamily: fonts.text, fontSize: 13, color: c.muted, marginTop: spacing.xs },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: spacing.lg },
  outlineText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  darkBtn: { alignSelf: "flex-end", alignItems: "center", justifyContent: "center", height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse },
  darkText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  linkBox: { marginTop: spacing.md, gap: spacing.sm },
  input: { height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, fontFamily: fonts.text, fontSize: 14, color: c.onSurface },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error, marginTop: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.sm },
  itemMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: c.surfaceSecondary },
  icon: { alignItems: "center", justifyContent: "center", backgroundColor: c.brandTertiary },
  name: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
  meta: { fontFamily: fonts.text, fontSize: 11, color: c.muted, marginTop: 2 },
  remove: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
}));
