import Feather from "@react-native-vector-icons/feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { computePrice, createQuote, formatPrice, useCatalog } from "@/src/api";
import { DesignCanvas } from "@/src/components/design-canvas";
import { SavedDesign, deleteDesign, getDesign } from "@/src/designs";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function DesignDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: catalog } = useCatalog();
  const [design, setDesign] = useState<SavedDesign | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", note: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { getDesign(id).then(setDesign); }, [id]);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/saved"));

  if (design === undefined || !catalog) {
    return <View style={[styles.root, styles.center]}><ActivityIndicator color={colors.brand} /></View>;
  }
  if (design === null) {
    return (
      <View style={[styles.root, styles.center]} testID="design-not-found">
        <Text style={styles.h1}>Design not found</Text>
        <Pressable testID="design-not-found-close" onPress={close} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Close</Text></Pressable>
      </View>
    );
  }

  const t = catalog.types.find((x) => x.id === design.type)!;
  const style = t.styles.find((s) => s.id === design.styleId);
  const size = t.sizes.find((s) => s.id === design.sizeId);
  const metal = catalog.metals.find((m) => m.id === design.metalId);
  const addons = catalog.addons.filter((a) => design.addonIds.includes(a.id));
  const price = computePrice(catalog, design);

  const rows: [string, string][] = [
    [t.style_label ?? "Style", `${style?.name ?? ""}`],
    ["Metal", metal?.name ?? ""],
    [t.id === "ring" ? "Ring size" : t.id === "earrings" ? "Size" : "Length", size?.label ?? ""],
    [t.addon_label, addons.length ? addons.map((a) => a.name).join(", ") : "None"],
  ];
  for (const g of t.option_groups ?? []) {
    const o = g.options.find((x) => x.id === (design.options?.[g.id] ?? g.default));
    if (o) rows.push([g.label, o.name]);
  }
  if (design.engraving.trim()) rows.push(["Engraving", `“${design.engraving.trim()}”`]);

  const submit = async () => {
    setError(null);
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Please enter your name and a valid email.");
      return;
    }
    setSending(true);
    try {
      const { id: _id, price: _p, createdAt: _c, renderUrl: _r, ...spec } = design;
      await createQuote({ design: spec, name: form.name.trim(), email: form.email.trim(), note: form.note });
      setSent(true);
      setShowForm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async () => {
    await deleteDesign(design.id);
    close();
  };

  return (
    <View style={styles.root} testID="design-detail-screen">
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="design-detail-close-button" onPress={close} hitSlop={10} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
        <Pressable
          testID="design-detail-delete-button"
          onPress={() => (confirmDelete ? remove() : setConfirmDelete(true))}
          style={[styles.deleteBtn, confirmDelete && { backgroundColor: colors.error }]}
        >
          <Feather name="trash-2" size={16} color={confirmDelete ? colors.onError : colors.error} />
          {confirmDelete && <Text style={styles.deleteText}>Tap to confirm</Text>}
        </Pressable>
      </View>

      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <DesignCanvas catalog={catalog} design={design} height={340} initialRenderUrl={design.renderUrl ?? null} autoRender={false} />
        </View>
        <View style={styles.body}>
          <Text style={styles.h1} testID="design-detail-name">{design.name}</Text>
          <Text style={styles.price} testID="design-detail-price">{formatPrice(price)}</Text>

          <View style={styles.table}>
            {rows.map(([k, v]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.rowKey}>{k}</Text>
                <Text style={styles.rowVal}>{v}</Text>
              </View>
            ))}
          </View>

          {sent ? (
            <Animated.View entering={FadeIn} style={styles.success} testID="quote-success-message">
              <Feather name="check-circle" size={20} color={colors.onSuccess} />
              <Text style={styles.successText}>Request received. Our jewelers will email you within 48 hours.</Text>
            </Animated.View>
          ) : showForm ? (
            <Animated.View entering={FadeIn} style={styles.form} testID="quote-form">
              <Text style={styles.formTitle}>Request a quote</Text>
              <TextInput testID="quote-name-input" placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input}
                value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
              <TextInput testID="quote-email-input" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input}
                autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
              <TextInput testID="quote-note-input" placeholder="Notes for our jewelers (optional)" placeholderTextColor={colors.muted}
                style={[styles.input, { height: 88, paddingTop: spacing.md, textAlignVertical: "top" }]} multiline
                value={form.note} onChangeText={(v) => setForm((f) => ({ ...f, note: v }))} />
              {error && <Text style={styles.error} testID="quote-error-message">{error}</Text>}
              <Pressable testID="quote-submit-button" onPress={submit} disabled={sending} style={[styles.primaryBtn, sending && { opacity: 0.6 }]}>
                {sending ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.primaryText}>Send request</Text>}
              </Pressable>
            </Animated.View>
          ) : (
            <Pressable testID="request-quote-button" onPress={() => setShowForm(true)} style={styles.primaryBtn}>
              <Feather name="shopping-bag" size={16} color={colors.onSurfaceInverse} />
              <Text style={styles.primaryText}>Request a quote</Text>
            </Pressable>
          )}

          <Pressable
            testID="edit-design-button"
            onPress={() => {
              if (router.canGoBack()) router.back();
              router.navigate({ pathname: "/build", params: { designId: design.id } });
            }}
            style={styles.secondaryBtn}
          >
            <Feather name="edit-3" size={16} color={colors.onSurface} />
            <Text style={styles.secondaryText}>Edit design</Text>
          </Pressable>

          <View style={styles.teaser} testID="detail-try-on-teaser">
            <Feather name="camera" size={20} color={colors.onBrandTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.teaserTitle}>Try it on · Coming soon</Text>
              <Text style={styles.teaserText}>Upload a photo or use your camera to see this piece on you.</Text>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  center: { alignItems: "center", justifyContent: "center", gap: spacing.lg },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  deleteText: { fontFamily: fonts.medium, fontSize: 13, color: c.onError },
  preview: {},
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  h1: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
  price: { fontFamily: fonts.medium, fontSize: 18, color: c.brandPrimary, marginTop: spacing.xs },
  table: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: c.divider },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider, gap: spacing.lg },
  rowKey: { fontFamily: fonts.text, fontSize: 14, color: c.muted },
  rowVal: { flex: 1, textAlign: "right", fontFamily: fonts.medium, fontSize: 14, color: c.onSurface },
  primaryBtn: { marginTop: spacing.xl, height: 52, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  primaryText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  secondaryBtn: { marginTop: spacing.md, height: 52, paddingHorizontal: spacing.xl, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  secondaryText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurface },
  form: { marginTop: spacing.xl, gap: spacing.md },
  formTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  input: { height: 48, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface, borderWidth: 1, borderColor: c.border },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error },
  success: { marginTop: spacing.xl, flexDirection: "row", gap: spacing.md, alignItems: "center", backgroundColor: c.success, padding: spacing.lg, borderRadius: radius.md },
  successText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: c.onSuccess },
  teaser: { marginTop: spacing.xl, flexDirection: "row", gap: spacing.lg, alignItems: "center", backgroundColor: c.brandTertiary, padding: spacing.lg, borderRadius: radius.md },
  teaserTitle: { fontFamily: fonts.display, fontSize: 17, color: c.onSurface },
  teaserText: { fontFamily: fonts.text, fontSize: 13, color: c.onBrandTertiary, marginTop: 2 },
}));
