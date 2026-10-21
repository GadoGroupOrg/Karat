import Feather from "@react-native-vector-icons/feather";
import { File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { assetUrl, createQuote, requestTryOn, useStoreProduct } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Photo = { uri: string; mimeType?: string; name?: string };
type CamState = "idle" | "explain" | "blocked";

const TIPS: Record<string, string> = {
  ring: "Show your hand flat or slightly curled, fingers apart, in soft light.",
  necklace: "Face the camera with your neck and collarbone visible.",
  earrings: "Turn slightly so your earlobe is clearly visible, hair tucked back.",
  bracelet: "Show your wrist and the back of your hand in good light.",
};

function tipFor(text: string) {
  const t = text.toLowerCase();
  if (/ring|band|engagement/.test(t) && !/earring/.test(t)) return TIPS.ring;
  if (/earring/.test(t)) return TIPS.earrings;
  if (/bracelet|bangle/.test(t)) return TIPS.bracelet;
  return TIPS.necklace;
}

export default function TryOn() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product } = useStoreProduct(id);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cam, setCam] = useState<CamState>("idle");
  const [tryonId, setTryonId] = useState<string | null>(null);
  const [enquire, setEnquire] = useState<"closed" | "open" | "sent">("closed");
  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "" });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sendEnquiry = async () => {
    setFormError(null);
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError("Please enter your name and a valid email.");
    setSending(true);
    try {
      await createQuote({ product_id: id, tryon_id: tryonId ?? undefined, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), note: form.note });
      setEnquire("sent");
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace("/shop"));

  const accept = (r: ImagePicker.ImagePickerResult) => {
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setPhoto({ uri: a.uri, mimeType: a.mimeType ?? "image/jpeg", name: a.fileName ?? "photo.jpg" });
    setResult(null);
    setError(null);
    setShowOriginal(false);
  };

  const pickOpts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85, allowsEditing: false };

  const pickLibrary = async () => accept(await ImagePicker.launchImageLibraryAsync(pickOpts));

  const launchCamera = async () => {
    setCam("idle");
    accept(await ImagePicker.launchCameraAsync({ ...pickOpts, cameraType: ImagePicker.CameraType.front }));
  };

  const takePhoto = async () => {
    if (Platform.OS === "web") return launchCamera();
    const perm = await ImagePicker.getCameraPermissionsAsync();
    if (perm.granted) return launchCamera();
    setCam(perm.canAskAgain ? "explain" : "blocked");
  };

  const requestCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.granted) return launchCamera();
    setCam(perm.canAskAgain ? "explain" : "blocked");
  };

  const run = async () => {
    if (!photo || !id) return;
    setBusy(true);
    setError(null);
    try {
      const r = await requestTryOn(id, photo);
      setResult(assetUrl(r.image_url));
      setTryonId(r.id);
      setShowOriginal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try-on failed");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!result) return;
    if (Platform.OS === "web") return Linking.openURL(result);
    const file = await File.downloadFileAsync(result, new File(Paths.cache, `atelier-tryon-${Date.now()}.png`));
    await Sharing.shareAsync(file.uri, { mimeType: "image/png", dialogTitle: "Share try-on" });
  };

  const shown = result && !showOriginal ? result : photo?.uri;

  return (
    <View style={styles.root} testID="try-on-screen">
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="try-on-close-button" onPress={close} hitSlop={10} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>VIRTUAL TRY-ON</Text>
          <Text style={styles.productName} numberOfLines={1} testID="try-on-product-title">{product?.title ?? " "}</Text>
        </View>
        {!!product?.image && <Image source={{ uri: product.image }} style={styles.thumb} contentFit="cover" />}
      </View>

      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.stage} testID="try-on-stage">
          {shown ? (
            <Animated.View key={shown} entering={FadeIn.duration(350)} style={StyleSheetFill}>
              <Image source={{ uri: shown }} style={StyleSheetFill} contentFit="cover" testID={result && !showOriginal ? "try-on-result-image" : "try-on-photo-image"} />
            </Animated.View>
          ) : (
            <View style={styles.placeholder}>
              <Feather name="user" size={36} color={colors.brandPrimary} />
              <Text style={styles.placeholderTitle}>Add a photo of yourself</Text>
              <Text style={styles.placeholderText}>{tipFor(`${product?.product_type ?? ""} ${product?.title ?? ""}`)}</Text>
            </View>
          )}
          {busy && (
            <View style={styles.busy} testID="try-on-loading">
              <ActivityIndicator color={colors.onSurfaceInverse} />
              <Text style={styles.busyText}>Placing the piece on you…</Text>
              <Text style={styles.busySub}>This usually takes 15–30 seconds</Text>
            </View>
          )}
          {result && !busy && (
            <Pressable testID="try-on-compare-toggle" onPress={() => setShowOriginal((v) => !v)} style={styles.compare}>
              <Feather name={showOriginal ? "eye" : "eye-off"} size={14} color={colors.onSurface} />
              <Text style={styles.compareText}>{showOriginal ? "Show try-on" : "Show original"}</Text>
            </Pressable>
          )}
        </View>

        {cam === "explain" && (
          <View style={styles.permCard} testID="try-on-camera-explain">
            <Text style={styles.permTitle}>Use your camera</Text>
            <Text style={styles.permText}>We only use the camera to take your try-on photo. Nothing is captured until you tap the shutter.</Text>
            <View style={styles.row}>
              <Pressable testID="try-on-camera-allow" onPress={requestCamera} style={[styles.smallBtn, styles.smallBtnDark]}>
                <Text style={styles.smallBtnDarkText}>Allow camera</Text>
              </Pressable>
              <Pressable testID="try-on-camera-cancel" onPress={() => setCam("idle")} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Not now</Text>
              </Pressable>
            </View>
          </View>
        )}
        {cam === "blocked" && (
          <View style={styles.permCard} testID="try-on-camera-blocked">
            <Text style={styles.permTitle}>Camera access is off</Text>
            <Text style={styles.permText}>Turn on camera access in Settings, or choose a photo from your library instead.</Text>
            <View style={styles.row}>
              <Pressable testID="try-on-open-settings" onPress={() => Linking.openSettings()} style={[styles.smallBtn, styles.smallBtnDark]}>
                <Text style={styles.smallBtnDarkText}>Open Settings</Text>
              </Pressable>
              <Pressable onPress={() => setCam("idle")} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!!error && <Text style={styles.error} testID="try-on-error">{error}</Text>}

        <View style={styles.row}>
          <Pressable testID="try-on-camera-button" disabled={busy} onPress={takePhoto} style={({ pressed }) => [styles.sourceBtn, (pressed || busy) && { opacity: 0.6 }]}>
            <Feather name="camera" size={18} color={colors.onSurface} />
            <Text style={styles.sourceText}>Take photo</Text>
          </Pressable>
          <Pressable testID="try-on-library-button" disabled={busy} onPress={pickLibrary} style={({ pressed }) => [styles.sourceBtn, (pressed || busy) && { opacity: 0.6 }]}>
            <Feather name="image" size={18} color={colors.onSurface} />
            <Text style={styles.sourceText}>Upload photo</Text>
          </Pressable>
        </View>

        {photo && (
          <Pressable testID="try-on-generate-button" disabled={busy} onPress={run} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && { opacity: 0.7 }]}>
            <Feather name={result ? "refresh-cw" : "zap"} size={18} color={colors.onSurfaceInverse} />
            <Text style={styles.primaryText}>{busy ? "Working…" : result ? "Try again" : "Try it on"}</Text>
          </Pressable>
        )}
        {result && !busy && (
          <Pressable testID="try-on-share-button" onPress={share} style={styles.secondaryBtn}>
            <Feather name="share" size={16} color={colors.onSurface} />
            <Text style={styles.secondaryText}>Save or share</Text>
          </Pressable>
        )}
        {result && !busy && enquire === "closed" && (
          <Pressable testID="try-on-enquire-button" onPress={() => setEnquire("open")} style={styles.outlineBtn}>
            <Feather name="message-circle" size={16} color={colors.onSurface} />
            <Text style={styles.secondaryText}>Enquire about this piece</Text>
          </Pressable>
        )}
        {enquire === "open" && (
          <View style={styles.form} testID="try-on-enquiry-form">
            <Text style={styles.permTitle}>Talk to our jewelers</Text>
            <TextInput testID="try-on-enquiry-name-input" placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input}
              value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <TextInput testID="try-on-enquiry-email-input" placeholder="Email" placeholderTextColor={colors.muted} style={styles.input}
              autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
            <TextInput testID="try-on-enquiry-phone-input" placeholder="Phone (optional)" placeholderTextColor={colors.muted} style={styles.input}
              keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <TextInput testID="try-on-enquiry-note-input" placeholder="Size, questions… (optional)" placeholderTextColor={colors.muted}
              style={[styles.input, { height: 80, paddingTop: spacing.md, textAlignVertical: "top" }]} multiline
              value={form.note} onChangeText={(v) => setForm((f) => ({ ...f, note: v }))} />
            {!!formError && <Text style={styles.error}>{formError}</Text>}
            <Pressable testID="try-on-enquiry-submit-button" onPress={sendEnquiry} disabled={sending} style={[styles.primaryBtn, sending && { opacity: 0.6 }]}>
              {sending ? <ActivityIndicator color={colors.onSurfaceInverse} /> : <Text style={styles.primaryText}>Send enquiry</Text>}
            </Pressable>
          </View>
        )}
        {enquire === "sent" && (
          <View style={styles.sent} testID="try-on-enquiry-success">
            <Feather name="check-circle" size={18} color={colors.onSuccess} />
            <Text style={styles.sentText}>Thanks! Our jewelers will be in touch soon, and your try-on photo is attached.</Text>
          </View>
        )}
        <Text style={styles.note}>AI-generated preview. Your photo is only used to create this image.</Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

const StyleSheetFill = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.5, color: c.brandPrimary },
  productName: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface, marginTop: 2 },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: c.surfaceSecondary },
  stage: { width: "100%", aspectRatio: 0.8, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing["2xl"], gap: spacing.sm },
  placeholderTitle: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface, textAlign: "center", marginTop: spacing.sm },
  placeholderText: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted, textAlign: "center" },
  busy: { ...StyleSheetFill, backgroundColor: c.scrim, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  busyText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  busySub: { fontFamily: fonts.text, fontSize: 12, color: c.onSurfaceInverse, opacity: 0.8 },
  compare: { position: "absolute", top: spacing.md, right: spacing.md, flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.surface },
  compareText: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurface },
  row: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  sourceBtn: { flex: 1, height: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  sourceText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  primaryBtn: { marginTop: spacing.md, height: 54, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  primaryText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  secondaryBtn: { marginTop: spacing.md, height: 50, borderRadius: radius.pill, backgroundColor: c.brandTertiary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  secondaryText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  permCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.md, backgroundColor: c.brandTertiary },
  permTitle: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  permText: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.onSurface, marginTop: spacing.xs },
  smallBtn: { flex: 1, height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  smallBtnDark: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  smallBtnText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface },
  smallBtnDarkText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurfaceInverse },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error, marginTop: spacing.md, textAlign: "center" },
  note: { fontFamily: fonts.text, fontSize: 11, color: c.muted, textAlign: "center", marginTop: spacing.lg },
  outlineBtn: { marginTop: spacing.md, height: 50, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  form: { marginTop: spacing.lg, gap: spacing.md },
  input: { height: 48, borderRadius: radius.md, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, fontFamily: fonts.text, fontSize: 15, color: c.onSurface, borderWidth: 1, borderColor: c.border },
  sent: { marginTop: spacing.lg, flexDirection: "row", gap: spacing.md, alignItems: "center", backgroundColor: c.success, padding: spacing.lg, borderRadius: radius.md },
  sentText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: c.onSuccess },
}));
