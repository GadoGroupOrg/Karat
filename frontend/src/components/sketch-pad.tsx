import Feather from "@react-native-vector-icons/feather";
import { useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";

import { Stroke } from "@/src/api";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const INK = "#E6142A"; // sketch ink must stay red in every theme (the AI is told to read red marks)

type Props = {
  /** Square image area inside the canvas (photo is shown "contain"); null = whole canvas (3D snapshot). */
  square: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (strokes: Stroke[], note: string) => void;
  /** Photo drawn under the strokes, fitted inside the same square the strokes are measured against. */
  backgroundUri?: string;
};

/** Finger / mouse drawing layer over the preview. Points are stored normalised (0–1) to the image. */
export function SketchPad({ square, busy, onCancel, onSubmit, backgroundUri }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 1, h: 1 });
  const sizeRef = useRef(size);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [note, setNote] = useState("");
  const live = useRef<[number, number][]>([]);
  const [, force] = useState(0);
  const boxOf = (sz: { w: number; h: number }) => {
    const side = square ? Math.min(sz.w, sz.h) : 0;
    return square ? { bw: side, bh: side, x: (sz.w - side) / 2, y: (sz.h - side) / 2 } : { bw: sz.w, bh: sz.h, x: 0, y: 0 };
  };
  const box = boxOf(size);
  const norm = (x: number, y: number): [number, number] => {
    const b = boxOf(sizeRef.current);
    return [Math.min(1, Math.max(0, (x - b.x) / b.bw)), Math.min(1, Math.max(0, (y - b.y) / b.bh))];
  };
  const toPx = ([nx, ny]: [number, number]) => [nx * box.bw + box.x, ny * box.bh + box.y];
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        live.current = [norm(e.nativeEvent.locationX, e.nativeEvent.locationY)];
        force((n) => n + 1);
      },
      onPanResponderMove: (e) => {
        live.current.push(norm(e.nativeEvent.locationX, e.nativeEvent.locationY));
        force((n) => n + 1);
      },
      onPanResponderRelease: () => {
        const pts = live.current;
        live.current = [];
        if (pts.length) setStrokes((s) => [...s, { points: pts, w: 0.008 }]);
      },
    }),
  );

  const d = (pts: [number, number][]) => pts.map((p, i) => { const [x, y] = toPx(p); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ");
  const onLayout = (e: LayoutChangeEvent) => {
    sizeRef.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
    setSize(sizeRef.current);
  };
  const sw = Math.max(3, box.bw * 0.008);

  return (
    <View style={styles.root} testID="sketch-pad">
      <View style={styles.area} onLayout={onLayout} {...pan.current.panHandlers} testID="sketch-area">
        {!!backgroundUri && (
          <View style={{ position: "absolute", left: box.x, top: box.y, width: box.bw, height: box.bh, pointerEvents: "none" }}>
            <Image source={{ uri: backgroundUri }} contentFit="contain" style={{ width: "100%", height: "100%" }} testID="sketch-background" />
          </View>
        )}
        <Svg width={size.w} height={size.h} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
          {strokes.map((s, i) => <Path key={i} d={d(s.points)} stroke={INK} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
          {live.current.length > 0 && <Path d={d(live.current)} stroke={INK} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </Svg>
        {!strokes.length && !live.current.length && (
          <View style={[styles.tip, { pointerEvents: "none" }]}><Feather name="edit-3" size={14} color={colors.onSurfaceInverse} /><Text style={styles.tipText}>Draw your idea on the piece</Text></View>
        )}
      </View>
      <View style={styles.bar}>
        <TextInput testID="sketch-note-input" value={note} onChangeText={setNote} placeholder="Describe it (e.g. add a hidden halo)" placeholderTextColor={colors.muted} style={styles.note} maxLength={300} />
      </View>
      <View style={[styles.bar, styles.barActions]}>
        <View style={{ flex: 1 }} />
        <Pressable testID="sketch-undo-button" disabled={!strokes.length || busy} onPress={() => setStrokes((s) => s.slice(0, -1))} style={styles.icon}><Feather name="corner-up-left" size={16} color={colors.onSurface} /></Pressable>
        <Pressable testID="sketch-cancel-button" disabled={busy} onPress={onCancel} style={styles.icon}><Feather name="x" size={16} color={colors.onSurface} /></Pressable>
        <Pressable testID="sketch-render-button" disabled={(!strokes.length && !note.trim()) || busy} onPress={() => onSubmit(strokes, note)}
          style={[styles.go, ((!strokes.length && !note.trim()) || busy) && { opacity: 0.5 }]}>
          <Feather name="zap" size={14} color={colors.onSurfaceInverse} />
          <Text style={styles.goText}>{busy ? "Rendering…" : "Render"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  area: { flex: 1, cursor: "crosshair" } as object,
  tip: { position: "absolute", top: spacing.md, alignSelf: "center", flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: c.scrim, paddingHorizontal: spacing.md, height: 32, borderRadius: radius.pill },
  tipText: { fontFamily: fonts.bold, fontSize: 12, color: c.onSurfaceInverse },
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.xs, padding: spacing.sm, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
  barActions: { borderTopWidth: 0, paddingTop: 0 },
  note: { flex: 1, minWidth: 0, height: 40, borderRadius: radius.pill, backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.md, fontFamily: fonts.text, fontSize: 13, color: c.onSurface },
  icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  go: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.surfaceInverse },
  goText: { fontFamily: fonts.bold, fontSize: 13, color: c.onSurfaceInverse },
}));
