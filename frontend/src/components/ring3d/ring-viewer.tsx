import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { PanResponder, Platform, StyleSheet, View } from "react-native";
import * as THREE from "three";

import { RingSpec, buildRing, disposeGroup, shadowTexture, sparkleTexture, studioEnvironment } from "./build-ring";

export type RingViewerHandle = {
  snapshot: () => Promise<string | null>;
  zoomBy: (factor: number) => void;
  reset: () => void;
  setAutoSpin: (on: boolean) => void;
};

const ZOOM_MIN = 0.7, ZOOM_MAX = 3;
const clampZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
const touchDist = (t: readonly { pageX: number; pageY: number }[]) =>
  Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);

type Props = { spec: RingSpec; background: string; testID?: string };

type Engine = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pivot: THREE.Group;
  ring: THREE.Group | null;
  sparkles: { sprite: THREE.Sprite; phase: number; speed: number }[];
  stoneSize: number;
  gl: ExpoWebGLRenderingContext;
};

export const RingViewer = forwardRef<RingViewerHandle, Props>(function RingViewer({ spec, background, testID }, ref) {
  const engine = useRef<Engine | null>(null);
  const layout = useRef({ w: 0, h: 0 });
  const bufSize = useRef({ w: 0, h: 0 });
  const glRef = useRef<GLView>(null);
  const raf = useRef<number | null>(null);
  const motion = useRef({
    yaw: 0.6, pitch: 0, vel: 0.35, dragging: false, lastX: 0, lastY: 0, energy: 0,
    zoom: 1, zoomNow: 1, pinchStart: 0, zoomStart: 1, autoSpin: true,
  });
  const specRef = useRef(spec);
  specRef.current = spec;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, g) => {
        motion.current.dragging = true;
        motion.current.lastX = g.dx;
        motion.current.lastY = g.dy;
        motion.current.pinchStart = 0;
      },
      onPanResponderMove: (evt, g) => {
        const m = motion.current;
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          const dist = touchDist(touches);
          if (!m.pinchStart) {
            m.pinchStart = dist;
            m.zoomStart = m.zoom;
          } else {
            m.zoom = clampZoom(m.zoomStart * (dist / m.pinchStart));
          }
          m.lastX = g.dx; m.lastY = g.dy;
          return;
        }
        const dx = g.dx - m.lastX, dy = g.dy - m.lastY;
        m.lastX = g.dx; m.lastY = g.dy;
        m.yaw += dx * 0.012;
        m.pitch = Math.max(-1.35, Math.min(1.1, m.pitch + dy * 0.008));
        m.vel = dx * 0.6;
        m.energy = Math.min(1, m.energy + Math.abs(dx) * 0.02);
      },
      onPanResponderRelease: () => { motion.current.dragging = false; motion.current.pinchStart = 0; },
      onPanResponderTerminate: () => { motion.current.dragging = false; motion.current.pinchStart = 0; },
    }),
  ).current;

  const rebuild = () => {
    const e = engine.current;
    if (!e) return;
    if (e.ring) {
      e.pivot.remove(e.ring);
      disposeGroup(e.ring);
    }
    const built = buildRing(specRef.current);
    e.ring = built.group;
    e.stoneSize = built.stoneSize;
    e.pivot.add(built.group);
    e.sparkles.forEach((s, i) => {
      const a = built.sparkleAnchors[i % built.sparkleAnchors.length];
      s.sprite.position.copy(a);
    });
    motion.current.energy = 1;
  };

  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(spec)]);

  useEffect(() => {
    engine.current?.renderer.setClearColor(new THREE.Color(background), 1);
  }, [background]);

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    const e = engine.current;
    if (e) {
      if (e.ring) disposeGroup(e.ring);
      e.renderer.dispose();
    }
    engine.current = null;
  }, []);

  useImperativeHandle(ref, () => ({
    zoomBy: (f: number) => { motion.current.zoom = clampZoom(motion.current.zoom * f); },
    reset: () => {
      const m = motion.current;
      m.zoom = 1; m.pitch = 0; m.yaw = 0.6; m.vel = m.autoSpin ? 0.35 : 0;
    },
    setAutoSpin: (on: boolean) => { motion.current.autoSpin = on; },
    snapshot: async () => {
      const e = engine.current;
      if (!e || !glRef.current) return null;
      try {
        e.renderer.render(e.scene, e.camera);
        e.gl.endFrameEXP();
        const snap = await glRef.current.takeSnapshotAsync({ format: "png" });
        const uri = snap.uri as unknown;
        if (typeof uri === "string") return uri;
        if (Platform.OS === "web" && uri instanceof Blob) return URL.createObjectURL(uri);
        return null;
      } catch {
        return null;
      }
    },
  }));

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    if (Platform.OS !== "web") {
      // expo-gl doesn't implement these pixelStorei flags; silence the warnings.
      const ps = gl.pixelStorei.bind(gl);
      gl.pixelStorei = (p: number, v: number | boolean) => {
        if (p === 37440 || p === 37441 || p === 37443) return;
        ps(p, v as number);
      };
    }
    const canvas = ((gl as unknown as { canvas?: HTMLCanvasElement }).canvas && Platform.OS === "web"
      ? (gl as unknown as { canvas: HTMLCanvasElement }).canvas
      : { width: w, height: h, style: {}, addEventListener: () => {}, removeEventListener: () => {}, clientHeight: h, getContext: () => gl }) as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: true, alpha: false });
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(new THREE.Color(background), 1);

    const scene = new THREE.Scene();
    const env = studioEnvironment(renderer);
    if (env) scene.environment = env;
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x3a3029, env ? 0.35 : 1.4));
    const key = new THREE.DirectionalLight(0xffffff, env ? 1.2 : 2.6);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.PointLight(0xffffff, 6, 12);
    rim.position.set(2.5, 3, -2.5);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
    camera.position.set(0, 1.25, 5.6);
    camera.lookAt(0, 0.38, 0);

    const pivot = new THREE.Group();
    scene.add(pivot);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.5),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.55 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.2;
    scene.add(shadow);

    const tex = sparkleTexture();
    const sparkles = Array.from({ length: 9 }, () => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
      sprite.renderOrder = 10;
      return { sprite, phase: Math.random() * Math.PI * 2, speed: 1.4 + Math.random() * 2.2 };
    });

    engine.current = { renderer, scene, camera, pivot, ring: null, sparkles, stoneSize: 0.6, gl };
    rebuild();
    sparkles.forEach((s) => engine.current!.ring!.parent!.add(s.sprite));

    let last = Date.now();
    const t0 = last;
    const loop = () => {
      raf.current = requestAnimationFrame(loop);
      const e = engine.current;
      if (!e) return;
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      const m = motion.current;
      // Keep the drawing buffer matched to the on-screen size (web canvases start at 300x150).
      const dpr = Platform.OS === "web" ? Math.min(2, (globalThis as { devicePixelRatio?: number }).devicePixelRatio || 1) : 1;
      const tw = Platform.OS === "web" ? Math.round(layout.current.w * dpr) : gl.drawingBufferWidth;
      const th = Platform.OS === "web" ? Math.round(layout.current.h * dpr) : gl.drawingBufferHeight;
      if (tw > 0 && th > 0 && (tw !== bufSize.current.w || th !== bufSize.current.h)) {
        bufSize.current = { w: tw, h: th };
        e.renderer.setSize(tw, th, false);
        e.camera.aspect = tw / th;
        e.camera.updateProjectionMatrix();
      }
      if (!m.dragging) {
        const target = m.autoSpin ? 0.35 : 0;
        m.vel += (target - m.vel) * Math.min(1, dt * 1.5);
        m.yaw += m.vel * dt;
        if (m.autoSpin) m.pitch *= 1 - Math.min(1, dt * 0.8);
      }
      m.zoomNow += (m.zoom - m.zoomNow) * Math.min(1, dt * 8);
      const ty = 0.3 + 1.35 * (1 - 1 / m.zoomNow);
      const fit = Math.max(1, 1 / (e.camera.aspect * 1.1)); // pull back on tall/portrait canvases
      e.camera.position.set(0, ty + (1.75 * fit) / m.zoomNow, (6.9 * fit) / m.zoomNow);
      e.camera.lookAt(0, ty, 0);
      m.energy = Math.max(0, m.energy - dt * 0.6);
      // gentle "leaning" sway gives the piece a living, hand-held feel
      e.pivot.rotation.set(-0.08 + m.pitch + Math.sin(t * 0.7) * 0.05, m.yaw, Math.sin(t * 0.45) * 0.045);
      const movement = Math.min(1, Math.abs(m.vel) * 0.5 + m.energy);
      e.sparkles.forEach((s) => {
        const flash = Math.pow(Math.max(0, Math.sin(t * s.speed + s.phase + m.yaw * 5)), 14);
        const scale = e.stoneSize * (0.25 + 0.5 * movement) * flash;
        s.sprite.scale.setScalar(Math.max(0.0001, scale));
        s.sprite.material.opacity = flash;
      });
      try {
        e.renderer.render(e.scene, e.camera);
      } catch (err) {
        // Never freeze the viewer: drop the HDR environment and fall back to direct lights.
        if (e.scene.environment) {
          console.warn("ring render failed, falling back to basic lighting", err);
          e.scene.environment = null;
          e.scene.add(new THREE.HemisphereLight(0xfff6ea, 0x3a3029, 1.3));
        }
      }
      gl.endFrameEXP();
    };
    loop();
  };

  // Mouse-wheel / trackpad zoom in the web preview.
  const webWheel =
    Platform.OS === "web"
      ? { onWheel: (ev: { deltaY: number; preventDefault?: () => void }) => {
          motion.current.zoom = clampZoom(motion.current.zoom * (ev.deltaY > 0 ? 0.92 : 1.08));
        } }
      : {};

  return (
    <View
      style={styles.fill}
      testID={testID}
      onLayout={(ev) => { layout.current = { w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height }; }}
      {...pan.panHandlers}
      {...(webWheel as object)}
    >
      <GLView
        ref={glRef}
        style={styles.fill}
        onContextCreate={onContextCreate}
        msaaSamples={4}
        {...({ webglContextAttributes: { preserveDrawingBuffer: true, antialias: true } } as object)}
      />
    </View>
  );
});

const styles = StyleSheet.create({ fill: { flex: 1 } });
