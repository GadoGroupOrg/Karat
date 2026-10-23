import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Catalog, DesignSpec, Stroke, assetUrl, requestAngle, requestRender, requestSketch } from "@/src/api";
import { SketchPad } from "@/src/components/sketch-pad";
import { SketchResult } from "@/src/components/sketch-result";
import { useCustomer } from "@/src/customer";
import { JewelryPreview } from "@/src/components/jewelry-preview";
import { RingViewer, type RingViewerHandle } from "@/src/components/ring3d/ring-viewer";
import type { RingSpec } from "@/src/components/ring3d/build-ring";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const RENDER_DELAY = 1200;

export const specKey = (d: DesignSpec) =>
  JSON.stringify({ ...d, name: undefined, addonIds: [...d.addonIds].sort(), options: d.options ?? {} });

type RenderState = { status: "idle" | "loading" | "ready" | "error"; url?: string; key?: string; error?: string; id?: string };
const ANGLES = [
  { id: "hero", label: "¾" }, { id: "front", label: "Front" }, { id: "side", label: "Side" }, { id: "top", label: "Top" }, { id: "back", label: "Back" },
];

type Props = {
  catalog: Catalog;
  design: DesignSpec;
  /** Fixed height (mobile). Omit to fill the parent (desktop). */
  height?: number;
  onRenderChange?: (url: string | null) => void;
  initialRenderUrl?: string | null;
  autoRender?: boolean;
};

export function DesignCanvas({ catalog, design, height, onRenderChange, initialRenderUrl = null, autoRender = true }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const viewer = useRef<RingViewerHandle>(null);
  const fullViewer = useRef<RingViewerHandle>(null);
  const [mode, setMode] = useState<"live" | "photo">("photo");
  const [lastUrl, setLastUrl] = useState<string | null>(initialRenderUrl);
  const [spin, setSpin] = useState(false); // still until the customer presses play
  const [fullscreen, setFullscreen] = useState(false);
  const key = specKey(design);
  const [render, setRender] = useState<RenderState>(
    initialRenderUrl ? { status: "ready", url: initialRenderUrl, key } : { status: "idle" },
  );
  const keyRef = useRef(key);
  keyRef.current = key;
  const isRing = design.type === "ring" || design.type === "band";
  const hasLive = isRing || ["necklace", "bracelet", "earrings"].includes(design.type);
  const { allowed, ensure } = useCustomer();
  const [angle, setAngle] = useState("hero");
  const [angleUrls, setAngleUrls] = useState<Record<string, string>>({});
  const [angleBusy, setAngleBusy] = useState<string | null>(null);
  const [sketching, setSketching] = useState(false);
  const [sketchBusy, setSketchBusy] = useState(false);
  const [sketch, setSketch] = useState<{ id: string; image_url: string; sketch_url: string; note: string } | null>(null);
  const [sketchError, setSketchError] = useState<string | null>(null);

  const ringSpec = useMemo((): RingSpec => {
    const t = catalog.types.find((x) => x.id === design.type);
    const opt = (g: string) => design.options?.[g] ?? t?.option_groups.find((x) => x.id === g)?.default ?? "";
    const colorOf = (g: string) => t?.option_groups.find((x) => x.id === g)?.options.find((o) => o.id === opt(g))?.color ?? "#FFFFFF";
    const stone = catalog.addons.find((a) => a.id === design.addonIds[0]);
    const metalColor = catalog.metals.find((m) => m.id === design.metalId)?.color ?? "#EDC36A";
    if (design.type === "band") {
      const w = t?.option_groups.find((g) => g.id === "width")?.options.find((o) => o.id === opt("width"));
      return {
        setting: "none", band: "polished", shape: "round", carat: 1, metalColor, stoneColor: "#FFFFFF", isDiamond: true,
        accentColor: colorOf("accent_stone"), weddingBand: { widthMm: w?.mm ?? parseFloat(opt("width") || "2"), style: design.styleId },
      };
    }
    return {
      setting: design.styleId,
      band: opt("band"),
      shape: opt("shape"),
      carat: parseFloat(opt("carat") || "1"),
      metalColor,
      stoneColor: stone?.color ?? "#FFFFFF",
      isDiamond: !stone || stone.id.includes("diamond"),
      accentColor: colorOf("accent_stone"),
      sideColors: [colorOf("side_left"), colorOf("side_right")],
      secondColor: colorOf("second_stone"),
      secondShape: opt("second_shape"),
      hiddenHalo: opt("hidden_halo") === "yes",
      headColor: opt("head_metal") && opt("head_metal") !== "match"
        ? t?.option_groups.find((g) => g.id === "head_metal")?.options.find((o) => o.id === opt("head_metal"))?.color : undefined,
    };
  }, [catalog, design]);

  const run = async (force = false) => {
    const k = keyRef.current;
    setRender({ status: "loading", key: k });
    try {
      const snap = isRing ? await viewer.current?.snapshot() ?? null : null;
      const r = await requestRender(design, snap, force);
      if (keyRef.current !== k) return;
      const url = assetUrl(r.image_url);
      setRender({ status: "ready", url, key: k, id: r.id });
      setLastUrl(url);
    } catch (e) {
      if (keyRef.current !== k) return;
      setRender({ status: "error", key: k, error: (e as Error).message });
    }
  };

  // Auto-render once the customer pauses on a configuration; any change returns to the live view.
  useEffect(() => {
    setRender((r) => (r.key === key ? r : { status: "idle" }));
    setAngle("hero");
    setAngleUrls({});
    if (!autoRender || !allowed("studio_photo")) return;
    const h = setTimeout(() => run(false), RENDER_DELAY);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    onRenderChange?.(render.status === "ready" && render.key === key ? render.url ?? null : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render, key]);


  const photoReady = render.status === "ready" && render.key === key;
  const baseUrl = photoReady ? render.url ?? null : lastUrl;
  const shownUrl = photoReady && angle !== "hero" ? angleUrls[angle] ?? baseUrl : baseUrl;

  const pickAngle = async (a: string) => {
    if (a === "hero" || angleUrls[a]) return setAngle(a);
    if (!render.id || !(await ensure("angles"))) return;
    setAngleBusy(a);
    try {
      const r = await requestAngle(render.id, a);
      setAngleUrls((u) => ({ ...u, [a]: assetUrl(r.image_url) }));
      setAngle(a);
    } catch (e) {
      setRender((r) => ({ ...r, error: (e as Error).message }));
    } finally {
      setAngleBusy(null);
    }
  };
  const startPhoto = async () => {
    if (await ensure("studio_photo")) run(false);
  };
  const startSketch = async () => {
    if (await ensure("sketch")) {
      setSketchError(null);
      setSketching(true);
    }
  };
  const submitSketch = async (strokes: Stroke[], note: string) => {
    setSketchBusy(true);
    setSketchError(null);
    try {
      const useRender = mode === "photo" && photoReady && angle === "hero" ? render.id ?? null : null;
      const snap = !useRender && isRing && mode === "live" ? await viewer.current?.snapshot() ?? null : null;
      if (!useRender && !snap) throw new Error("Wait for the studio photo, or switch to 3D, then sketch.");
      const r = await requestSketch(design, strokes, note, useRender, snap);
      setSketch({ ...r, note });
      setSketching(false);
    } catch (e) {
      setSketchError((e as Error).message);
    } finally {
      setSketchBusy(false);
    }
  };

  const toggleSpin = () => {
    const next = !spin;
    setSpin(next);
    viewer.current?.setAutoSpin(next);
    fullViewer.current?.setAutoSpin(next);
  };

  const controls = (v: React.RefObject<RingViewerHandle | null>, inFull: boolean) => (
    <View style={[styles.controls, inFull && { bottom: insets.bottom + spacing.xl }]} testID={inFull ? "fullscreen-view-controls" : "view-controls"}>
      <CtrlBtn testID={`${inFull ? "fs-" : ""}zoom-in-button`} icon="zoom-in" onPress={() => v.current?.zoomBy(1.25)} />
      <CtrlBtn testID={`${inFull ? "fs-" : ""}zoom-out-button`} icon="zoom-out" onPress={() => v.current?.zoomBy(0.8)} />
      <CtrlBtn testID={`${inFull ? "fs-" : ""}spin-toggle-button`} icon={spin ? "pause" : "rotate-cw"} onPress={toggleSpin} />
      <CtrlBtn testID={`${inFull ? "fs-" : ""}reset-view-button`} icon="crosshair" onPress={() => v.current?.reset()} />
      {!inFull && <CtrlBtn testID="fullscreen-button" icon="maximize-2" onPress={() => setFullscreen(true)} />}
    </View>
  );

  return (
    <View style={[styles.canvas, height ? { height } : { flex: 1 }]} testID="builder-preview-canvas">
      <View style={styles.stage}>
        {mode === "live" && hasLive ? (
          isRing ? (
            <RingViewer ref={viewer} spec={ringSpec} background={colors.surfaceSecondary} testID="ring-3d-viewer" />
          ) : (
            <Animated.View key={`${design.type}-${design.styleId}`} entering={FadeIn.duration(350)} style={styles.sketch}>
              <JewelryPreview catalog={catalog} design={design} />
            </Animated.View>
          )
        ) : shownUrl ? (
          <View style={styles.photoLayer}>
            {/* Soft blurred backdrop fills the frame; the sharp photo is always shown whole (never cropped). */}
            <Image source={{ uri: shownUrl }} style={styles.photo} contentFit="cover" blurRadius={40} />
            <Image source={{ uri: shownUrl }} style={[styles.photo, StyleSheet.absoluteFill]} contentFit="contain" transition={400} testID="builder-render-photo" />
            {!photoReady && <View style={styles.updatingVeil} />}
          </View>
        ) : !allowed("studio_photo") && render.status !== "loading" ? (
          <View style={styles.placeholder} testID="photo-locked">
            <Feather name="aperture" size={24} color={colors.brandPrimary} />
            <Text style={styles.placeholderTitle}>See it as a real photograph</Text>
            <Pressable testID="unlock-studio-photo-button" onPress={startPhoto} style={styles.unlockBtn}>
              <Text style={styles.unlockText}>Create studio photo</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.placeholder} testID="photo-placeholder">
            <ActivityIndicator color={colors.brandPrimary} />
            <Text style={styles.placeholderTitle}>Crafting your studio photo</Text>
            <Text style={styles.placeholderText}>Every choice you make is rendered as a real photograph.</Text>
          </View>
        )}
        {sketching && <SketchPad square={mode === "photo"} busy={sketchBusy} onCancel={() => setSketching(false)} onSubmit={submitSketch} />}
      </View>
      {!!sketchError && sketching && <Text style={styles.sketchError} testID="sketch-error">{sketchError}</Text>}

      {hasLive && <View style={styles.segment} testID="canvas-mode-toggle">
        {(["photo", "live"] as const).map((m) => {
          const sel = mode === m;
          return (
            <Pressable
              key={m}
              testID={`canvas-mode-${m}`}
              onPress={() => setMode(m)}
              style={[styles.segBtn, sel && styles.segSel]}
            >
              <Text style={[styles.segText, sel && styles.segTextSel]}>{m === "live" ? (isRing ? "3D" : "Sketch") : "Photo"}</Text>
            </Pressable>
          );
        })}
      </View>}

      {isRing && mode === "live" && (
        <View style={[styles.hint, { pointerEvents: "none" }]}>
          <Feather name="move" size={12} color={colors.muted} />
          <Text style={styles.hintText}>Drag 360° · pinch to zoom</Text>
        </View>
      )}
      {isRing && mode === "live" && controls(viewer, false)}
      {!sketching && (mode === "photo" ? !!shownUrl : isRing) && (
        <View style={[styles.controls, mode === "live" && { bottom: "auto", top: spacing["3xl"] + spacing.lg }]}>
          <CtrlBtn testID="sketch-start-button" icon="edit-3" onPress={startSketch} />
          {mode === "photo" && <CtrlBtn testID="photo-fullscreen-button" icon="maximize-2" onPress={() => setFullscreen(true)} />}
        </View>
      )}
      {!sketching && mode === "photo" && photoReady && !!render.id && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.angles} contentContainerStyle={styles.anglesInner} testID="angle-bar">
          {ANGLES.map((a) => {
            const sel = angle === a.id;
            return (
              <Pressable key={a.id} testID={`angle-${a.id}`} onPress={() => pickAngle(a.id)} disabled={!!angleBusy} style={[styles.angleChip, sel && styles.angleSel]}>
                {angleBusy === a.id ? <ActivityIndicator size="small" color={colors.onSurface} /> : (
                  <Text style={[styles.angleText, sel && { color: colors.onSurfaceInverse }]}>{a.label}</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {sketch && <SketchResult design={design} sketch={sketch} onClose={() => setSketch(null)} />}

      <Modal visible={fullscreen} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setFullscreen(false)}>
        <View style={[styles.fsRoot, { paddingTop: insets.top }]} testID="fullscreen-viewer">
          <View style={styles.fsHeader}>
            <Text style={styles.fsTitle}>{mode === "photo" ? "Studio photo" : "360° view"}</Text>
            <Pressable testID="fullscreen-close-button" onPress={() => setFullscreen(false)} hitSlop={10} style={styles.fsClose}>
              <Feather name="x" size={22} color={colors.onSurface} />
            </Pressable>
          </View>
          {mode === "photo" && shownUrl ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.fsPhotoWrap}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image source={{ uri: shownUrl }} style={styles.fsPhoto} contentFit="contain" testID="fullscreen-photo" />
            </ScrollView>
          ) : isRing ? (
            <View style={{ flex: 1 }}>
              <RingViewer ref={fullViewer} spec={ringSpec} background={colors.surfaceSecondary} testID="fullscreen-ring-3d" />
              {controls(fullViewer, true)}
            </View>
          ) : null}
        </View>
      </Modal>

      {!sketching && <View style={[styles.renderChip, mode === "photo" && photoReady && styles.renderChipTop, { pointerEvents: "box-none" }]} testID="render-status">
        {render.status === "loading" ? (
          <View style={styles.chipInner}>
            <ActivityIndicator size="small" color={colors.brandPrimary} />
            <Text style={styles.chipText}>Rendering studio photo…</Text>
          </View>
        ) : photoReady ? (
          <View style={styles.chipInner} testID="render-thumbnail">
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text style={styles.chipText}>Studio photo</Text>
            <Pressable testID="rerender-button" onPress={() => run(true)} hitSlop={10} style={styles.rerender}>
              <Feather name="refresh-cw" size={13} color={colors.onSurface} />
            </Pressable>
          </View>
        ) : render.status === "error" ? (
          <Pressable testID="render-retry-button" onPress={() => run(true)} style={styles.chipInner}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text style={styles.chipText} numberOfLines={1}>Render failed · Retry</Text>
          </Pressable>
        ) : (
          <Pressable testID="render-now-button" onPress={startPhoto} style={styles.chipInner}>
            <Feather name="aperture" size={14} color={colors.brandPrimary} />
            <Text style={styles.chipText}>Render photo</Text>
          </Pressable>
        )}
      </View>}
    </View>
  );
}

function CtrlBtn({ icon, onPress, testID }: { icon: React.ComponentProps<typeof Feather>["name"]; onPress: () => void; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} hitSlop={4} style={({ pressed }) => [styles.ctrl, pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] }]}>
      <Feather name={icon} size={16} color={colors.onSurface} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  controls: { position: "absolute", right: spacing.md, bottom: spacing.md, gap: spacing.sm },
  ctrl: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
  },
  fsRoot: { flex: 1, backgroundColor: c.surfaceSecondary },
  fsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  fsTitle: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface },
  fsClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  fsPhotoWrap: { flexGrow: 1, justifyContent: "center" },
  fsPhoto: { width: "100%", aspectRatio: 1 },
  canvas: { marginHorizontal: spacing.xl, borderRadius: radius.lg, backgroundColor: c.surfaceSecondary, overflow: "hidden" },
  stage: { flex: 1 },
  sketch: { flex: 1, paddingTop: spacing["2xl"], paddingBottom: spacing["2xl"] },
  photoLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  updatingVeil: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.surface, opacity: 0.35 },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing["2xl"] },
  placeholderTitle: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface, marginTop: spacing.sm },
  placeholderText: { fontFamily: fonts.text, fontSize: 13, color: c.muted, textAlign: "center" },
  photo: { width: "100%", height: "100%" },
  segment: { position: "absolute", top: spacing.md, left: spacing.md, flexDirection: "row", backgroundColor: c.surface, borderRadius: radius.pill, padding: 3, borderWidth: 1, borderColor: c.border },
  segBtn: { height: 30, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: "center" },
  segSel: { backgroundColor: c.surfaceInverse },
  segText: { fontFamily: fonts.bold, fontSize: 12, color: c.onSurface },
  segTextSel: { color: c.onSurfaceInverse },
  hint: { position: "absolute", top: spacing.lg + 2, right: spacing.md, flexDirection: "row", alignItems: "center", gap: 4 },
  hintText: { fontFamily: fonts.medium, fontSize: 11, color: c.muted },
  renderChip: { position: "absolute", left: spacing.md, bottom: spacing.md, alignItems: "flex-start" },
  chipInner: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 40, paddingLeft: spacing.sm, paddingRight: spacing.md,
    borderRadius: radius.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 12, color: c.onSurface },
  renderChipTop: { bottom: "auto", top: spacing.md, left: "auto", right: spacing.md },
  angles: { position: "absolute", left: 0, right: 56, bottom: spacing.md },
  anglesInner: { gap: 6, paddingHorizontal: spacing.md },
  angleChip: { minWidth: 48, height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  angleSel: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  angleText: { fontFamily: fonts.bold, fontSize: 12, color: c.onSurface },
  unlockBtn: { marginTop: spacing.md, height: 44, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: c.surfaceInverse, justifyContent: "center" },
  unlockText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceInverse },
  sketchError: { position: "absolute", top: spacing.md, alignSelf: "center", fontFamily: fonts.medium, fontSize: 12, color: c.onError, backgroundColor: c.error, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  rerender: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
}));
