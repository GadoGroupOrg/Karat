import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Catalog, DesignSpec, assetUrl, requestRender } from "@/src/api";
import { JewelryPreview } from "@/src/components/jewelry-preview";
import { RingViewer, type RingViewerHandle } from "@/src/components/ring3d/ring-viewer";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const RENDER_DELAY = 2800;

export const specKey = (d: DesignSpec) =>
  JSON.stringify({ ...d, name: undefined, addonIds: [...d.addonIds].sort(), options: d.options ?? {} });

type RenderState = { status: "idle" | "loading" | "ready" | "error"; url?: string; key?: string; error?: string };

type Props = {
  catalog: Catalog;
  design: DesignSpec;
  height: number;
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
  const [mode, setMode] = useState<"live" | "photo">("live");
  const [spin, setSpin] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const key = specKey(design);
  const [render, setRender] = useState<RenderState>(
    initialRenderUrl ? { status: "ready", url: initialRenderUrl, key } : { status: "idle" },
  );
  const keyRef = useRef(key);
  keyRef.current = key;
  const isRing = design.type === "ring";

  const ringSpec = useMemo(() => {
    const t = catalog.types.find((x) => x.id === "ring");
    const opt = (g: string) => design.options?.[g] ?? t?.option_groups.find((x) => x.id === g)?.default ?? "";
    const stone = catalog.addons.find((a) => a.id === design.addonIds[0]);
    return {
      setting: design.styleId,
      band: opt("band"),
      shape: opt("shape"),
      carat: parseFloat(opt("carat") || "1"),
      metalColor: catalog.metals.find((m) => m.id === design.metalId)?.color ?? "#EDC36A",
      stoneColor: stone?.color ?? "#FFFFFF",
      isDiamond: !stone || stone.id.includes("diamond"),
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
      setRender({ status: "ready", url, key: k });
      if (autoRender) setMode("photo");
    } catch (e) {
      if (keyRef.current !== k) return;
      setRender({ status: "error", key: k, error: (e as Error).message });
    }
  };

  // Auto-render once the customer pauses on a configuration; any change returns to the live view.
  useEffect(() => {
    setRender((r) => (r.key === key ? r : { status: "idle" }));
    setMode("live");
    if (!autoRender) return;
    const h = setTimeout(() => run(false), RENDER_DELAY);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    onRenderChange?.(render.status === "ready" && render.key === key ? render.url ?? null : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render, key]);

  useEffect(() => {
    if (render.status !== "ready" && mode === "photo" && render.status !== "loading") setMode("live");
  }, [render.status, mode]);

  const photoReady = render.status === "ready" && render.key === key;

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
    <View style={[styles.canvas, { height }]} testID="builder-preview-canvas">
      <View style={styles.stage}>
        {isRing ? (
          <RingViewer ref={viewer} spec={ringSpec} background={colors.surfaceSecondary} testID="ring-3d-viewer" />
        ) : (
          <Animated.View key={`${design.type}-${design.styleId}`} entering={FadeIn.duration(350)} style={styles.sketch}>
            <JewelryPreview catalog={catalog} design={design} />
          </Animated.View>
        )}
        {mode === "photo" && photoReady && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.photoLayer}>
            <Image source={{ uri: render.url }} style={styles.photo} contentFit="cover" transition={300} testID="builder-render-photo" />
          </Animated.View>
        )}
      </View>

      <View style={styles.segment} testID="canvas-mode-toggle">
        {(["live", "photo"] as const).map((m) => {
          const sel = mode === m;
          const disabled = m === "photo" && !photoReady;
          return (
            <Pressable
              key={m}
              testID={`canvas-mode-${m}`}
              disabled={disabled}
              onPress={() => setMode(m)}
              style={[styles.segBtn, sel && styles.segSel, disabled && { opacity: 0.45 }]}
            >
              <Text style={[styles.segText, sel && styles.segTextSel]}>{m === "live" ? (isRing ? "3D" : "Live") : "Photo"}</Text>
            </Pressable>
          );
        })}
      </View>

      {isRing && mode === "live" && (
        <View style={[styles.hint, { pointerEvents: "none" }]}>
          <Feather name="move" size={12} color={colors.muted} />
          <Text style={styles.hintText}>Drag 360° · pinch to zoom</Text>
        </View>
      )}
      {isRing && mode === "live" && controls(viewer, false)}
      {mode === "photo" && photoReady && (
        <View style={styles.controls}>
          <CtrlBtn testID="photo-fullscreen-button" icon="maximize-2" onPress={() => setFullscreen(true)} />
        </View>
      )}

      <Modal visible={fullscreen} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setFullscreen(false)}>
        <View style={[styles.fsRoot, { paddingTop: insets.top }]} testID="fullscreen-viewer">
          <View style={styles.fsHeader}>
            <Text style={styles.fsTitle}>{mode === "photo" ? "Studio photo" : "360° view"}</Text>
            <Pressable testID="fullscreen-close-button" onPress={() => setFullscreen(false)} hitSlop={10} style={styles.fsClose}>
              <Feather name="x" size={22} color={colors.onSurface} />
            </Pressable>
          </View>
          {mode === "photo" && photoReady ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.fsPhotoWrap}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image source={{ uri: render.url }} style={styles.fsPhoto} contentFit="contain" testID="fullscreen-photo" />
            </ScrollView>
          ) : isRing ? (
            <View style={{ flex: 1 }}>
              <RingViewer ref={fullViewer} spec={ringSpec} background={colors.surfaceSecondary} testID="fullscreen-ring-3d" />
              {controls(fullViewer, true)}
            </View>
          ) : null}
        </View>
      </Modal>

      <View style={[styles.renderChip, { pointerEvents: "box-none" }]} testID="render-status">
        {render.status === "loading" ? (
          <View style={styles.chipInner}>
            <ActivityIndicator size="small" color={colors.brandPrimary} />
            <Text style={styles.chipText}>Rendering studio photo…</Text>
          </View>
        ) : photoReady ? (
          <Pressable testID="render-thumbnail" onPress={() => setMode(mode === "photo" ? "live" : "photo")} style={styles.chipInner}>
            {mode === "live" && <Image source={{ uri: render.url }} style={styles.thumb} contentFit="cover" />}
            <Text style={styles.chipText}>{mode === "photo" ? "Back to 3D" : "Studio photo"}</Text>
            <Pressable testID="rerender-button" onPress={() => run(true)} hitSlop={10} style={styles.rerender}>
              <Feather name="refresh-cw" size={13} color={colors.onSurface} />
            </Pressable>
          </Pressable>
        ) : render.status === "error" ? (
          <Pressable testID="render-retry-button" onPress={() => run(true)} style={styles.chipInner}>
            <Feather name="alert-circle" size={14} color={colors.error} />
            <Text style={styles.chipText} numberOfLines={1}>Render failed · Retry</Text>
          </Pressable>
        ) : (
          <Pressable testID="render-now-button" onPress={() => run(false)} style={styles.chipInner}>
            <Feather name="aperture" size={14} color={colors.brandPrimary} />
            <Text style={styles.chipText}>Render photo</Text>
          </Pressable>
        )}
      </View>
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
  thumb: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.surfaceTertiary },
  rerender: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
}));
