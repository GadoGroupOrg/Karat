import Feather from "@react-native-vector-icons/feather";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { requestSketch, useFeatures, type Stroke } from "@/src/api";
import { useCustomer } from "@/src/customer";
import { SketchPad } from "@/src/components/sketch-pad";
import { SketchResult } from "@/src/components/sketch-result";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Result = { id: string; image_url: string; sketch_url: string; note: string };

/** Upload any jewelry photo, mark up changes (drawing and/or written instructions) and get a rendered final photo. */
export default function Redesign() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ensure } = useCustomer();
  const feat = useFeatures();
  const [photo, setPhoto] = useState<string | null>(null);
  const [cam, setCam] = useState<"idle" | "explain" | "blocked">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const accept = (r: ImagePicker.ImagePickerResult) => {
    if (r.canceled || !r.assets?.[0]) return;
    setPhoto(r.assets[0].uri);
    setError(null);
  };
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85 };
  const pickLibrary = async () => accept(await ImagePicker.launchImageLibraryAsync(opts));
  const launchCamera = async () => {
    setCam("idle");
    accept(await ImagePicker.launchCameraAsync(opts));
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

  const submit = async (strokes: Stroke[], note: string) => {
    if (!photo || !(await ensure("sketch"))) return;
    setBusy(true);
    setError(null);
    try {
      const r = await requestSketch(null, strokes, note, null, photo);
      setResult({ ...r, note });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace("/build"));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="redesign-screen">
      <View style={styles.header}>
        <Pressable testID="redesign-close" onPress={close} hitSlop={8} style={styles.iconBtn}><Feather name="x" size={22} color={colors.onSurface} /></Pressable>
        <Text style={styles.headTitle}>Redesign a photo</Text>
        <View style={styles.iconBtn} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        {!feat("redesign") ? (
          <View testID="redesign-unavailable" style={styles.intro}>
            <Text style={[styles.text, { color: colors.onSurface }]}>Photo redesign isn’t available in this store. Try designing your piece in the builder.</Text>
            <Pressable testID="redesign-open-builder" onPress={() => router.replace("/build")} style={styles.darkBtn}>
              <Text style={styles.darkText}>Open builder</Text>
            </Pressable>
          </View>
        ) : !photo ? (
          <View style={styles.intro} testID="redesign-intro">
            <Text style={styles.eyebrow}>BRING YOUR INSPIRATION</Text>
            <Text style={styles.title}>Start from any jewelry photo</Text>
            <Text style={styles.text}>Upload a piece you own or love, draw what you’d change, or just describe it. We’ll render the finished piece as a studio photo.</Text>
            <Pressable testID="redesign-pick-library" onPress={pickLibrary} style={styles.darkBtn}>
              <Feather name="image" size={16} color={colors.onSurfaceInverse} />
              <Text style={styles.darkText}>Upload a photo</Text>
            </Pressable>
            <Pressable testID="redesign-take-photo" onPress={takePhoto} style={styles.outlineBtn}>
              <Feather name="camera" size={16} color={colors.onSurface} />
              <Text style={styles.outlineText}>Take a photo</Text>
            </Pressable>
            {cam !== "idle" && (
              <View style={styles.perm} testID="redesign-camera-permission">
                <Text style={styles.text}>{cam === "explain" ? "Allow camera access to photograph the piece you want to redesign." : "Camera access is off. You can turn it on in Settings, or upload a photo instead."}</Text>
                <Pressable onPress={cam === "explain" ? requestCamera : () => Linking.openSettings()} style={styles.outlineBtn} testID="redesign-camera-allow">
                  <Text style={styles.outlineText}>{cam === "explain" ? "Allow camera" : "Open Settings"}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.text}>Draw your changes in red, and/or describe them below, then tap Render.</Text>
            <View style={styles.stage} testID="redesign-stage">
              <SketchPad square busy={busy} onCancel={() => setPhoto(null)} onSubmit={submit} backgroundUri={photo} />
            </View>
            {!!error && <Text style={styles.error} testID="redesign-error">{error}</Text>}
            <Pressable testID="redesign-change-photo" onPress={pickLibrary} style={styles.linkBtn}><Text style={styles.link}>Use a different photo</Text></Pressable>
          </>
        )}
      </ScrollView>
      {result && <SketchResult design={null} sketch={result} onClose={() => setResult(null)} />}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md },
  headTitle: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.xl, gap: spacing.md, maxWidth: 640, width: "100%", alignSelf: "center" },
  intro: { gap: spacing.md, paddingTop: spacing.xl },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2.5, color: c.brandPrimary },
  title: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
  text: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.muted },
  stage: { width: "100%", aspectRatio: 0.82, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceSecondary },
  darkBtn: { flexDirection: "row", gap: spacing.sm, height: 52, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  darkText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceInverse },
  outlineBtn: { flexDirection: "row", gap: spacing.sm, height: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  outlineText: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurface },
  perm: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, backgroundColor: c.surfaceSecondary },
  error: { fontFamily: fonts.medium, fontSize: 13, color: c.error },
  linkBtn: { height: 44, justifyContent: "center", alignSelf: "center" },
  link: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurface, textDecorationLine: "underline" },
}));
