import * as THREE from "three";

// Procedural, physically-based ring model. Units: inner finger radius = 1.

export type RingSpec = {
  setting: string; // solitaire-4 | solitaire-6 | cathedral | bezel | halo | three-stone
  band: string; // classic | slim | knife | pave | wide
  shape: string; // round | oval | cushion | princess | emerald
  carat: number;
  metalColor: string;
  stoneColor: string;
  isDiamond: boolean;
  /** Halo / pavé / channel accent colour (default white diamond). */
  accentColor?: string;
  /** Three-stone side stones [left, right]. */
  sideColors?: [string, string];
  /** Toi et Moi second stone. */
  secondColor?: string;
  secondShape?: string;
  /** Wedding band: no head, band width in mm, accent stone style. */
  weddingBand?: { widthMm: number; style: string };
};

export type RingBuild = { group: THREE.Group; sparkleAnchors: THREE.Vector3[]; stoneSize: number };

const R = 1;

type Cut = { profile: [number, number][]; segments: number; phi: number; sx: number; sz: number };

function cutFor(shape: string): Cut {
  switch (shape) {
    case "moval":
      return { profile: brilliant, segments: 20, phi: 0, sx: 0.62, sz: 1.18 };
    case "pear":
    case "marquise":
      return { profile: brilliant, segments: 20, phi: 0, sx: 0.58, sz: 1.2 };
    case "old-mine":
      return {
        profile: [[0.06, -0.4], [0.3, -0.2], [0.5, -0.012], [0.5, 0.012], [0.38, 0.13], [0.22, 0.2], [0.001, 0.2]],
        segments: 8, phi: Math.PI / 8, sx: 1.0, sz: 1.0,
      };
    case "elongated-cushion":
      return { profile: brilliant, segments: 8, phi: Math.PI / 8, sx: 0.8, sz: 1.1 };
    case "radiant":
      return { ...cutFor("emerald"), profile: brilliant, sx: 0.8, sz: 1.08 };
    case "asscher":
      return { ...cutFor("emerald"), sx: 1.0, sz: 1.0 };
    case "heart":
      return { profile: brilliant, segments: 16, phi: 0, sx: 1.05, sz: 0.95 };
    case "oval":
      return { profile: brilliant, segments: 20, phi: 0, sx: 0.74, sz: 1.1 };
    case "cushion":
      return { profile: brilliant, segments: 8, phi: Math.PI / 8, sx: 1.0, sz: 1.0 };
    case "princess":
      return {
        profile: [[0.001, -0.36], [0.3, -0.2], [0.5, -0.012], [0.5, 0.014], [0.44, 0.07], [0.001, 0.09]],
        segments: 4, phi: Math.PI / 4, sx: 1.25, sz: 1.25,
      };
    case "emerald":
      return {
        profile: [[0.001, -0.3], [0.32, -0.18], [0.5, -0.012], [0.5, 0.014], [0.46, 0.055], [0.41, 0.09], [0.001, 0.1]],
        segments: 8, phi: Math.PI / 8, sx: 0.76, sz: 1.12,
      };
    default:
      return { profile: brilliant, segments: 16, phi: 0, sx: 1, sz: 1 };
  }
}

const brilliant: [number, number][] = [
  [0.001, -0.43], [0.3, -0.2], [0.5, -0.012], [0.5, 0.012], [0.41, 0.085], [0.28, 0.155], [0.001, 0.158],
];

function gemGeometry(cut: Cut, size: number) {
  const pts = cut.profile.map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, cut.segments, cut.phi, Math.PI * 2).toNonIndexed();
  g.computeVertexNormals(); // non-indexed → flat facet normals
  g.scale(size * cut.sx, size, size * cut.sz);
  return g;
}

export function makeMaterials(spec: RingSpec) {
  const metal = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.metalColor), metalness: 1, roughness: 0.09,
    envMapIntensity: 1.6, clearcoat: 0.6, clearcoatRoughness: 0.05,
  });
  const stoneColor = new THREE.Color(spec.stoneColor);
  const gemOuter = new THREE.MeshPhysicalMaterial({
    color: stoneColor, metalness: 0, roughness: 0, transparent: true, opacity: spec.isDiamond ? 0.22 : 0.3,
    envMapIntensity: spec.isDiamond ? 3.4 : 2.4, clearcoat: 1, clearcoatRoughness: 0, ior: 2.4,
    flatShading: true, depthWrite: false,
  });
  const gemInner = new THREE.MeshPhysicalMaterial({
    color: spec.isDiamond ? new THREE.Color("#D2D9E1") : stoneColor, metalness: 1, roughness: 0,
    envMapIntensity: spec.isDiamond ? 2.1 : 2, flatShading: true,
    
  });
  const melee = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.accentColor ?? "#FFFFFF"), metalness: 1, roughness: 0, envMapIntensity: 3,
    flatShading: true,
  });
  return { metal, gemOuter, gemInner, melee };
}

/** Materials for an extra feature stone of another colour (toi et moi, three-stone sides). */
function gemMats(base: Mats, color: string): Mats {
  const white = color.toUpperCase() === "#FFFFFF";
  const c = new THREE.Color(color);
  const gemOuter = base.gemOuter.clone();
  gemOuter.color = c;
  gemOuter.opacity = white ? 0.22 : 0.3;
  const gemInner = base.gemInner.clone();
  gemInner.color = white ? new THREE.Color("#D2D9E1") : c;
  return { ...base, gemOuter, gemInner };
}

type Mats = ReturnType<typeof makeMaterials>;

function addGem(group: THREE.Group, cut: Cut, size: number, pos: THREE.Vector3, m: Mats, tilt = 0) {
  const geo = gemGeometry(cut, size);
  const inner = new THREE.Mesh(geo, m.gemInner);
  const outer = new THREE.Mesh(geo, m.gemOuter);
  outer.scale.setScalar(1.004);
  outer.renderOrder = 2;
  for (const mesh of [inner, outer]) {
    mesh.position.copy(pos);
    mesh.rotation.z = tilt;
    group.add(mesh);
  }
}

function tube(points: THREE.Vector3[], radius: number, mat: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 28, radius, 10, false), mat);
}

function addProngs(group: THREE.Group, center: THREE.Vector3, rx: number, rz: number, d: number, count: number, baseY: number, m: Mats) {
  const angles = count === 6 ? [0, 60, 120, 180, 240, 300] : [45, 135, 225, 315];
  const pr = 0.016 + 0.014 * d;
  for (const deg of angles) {
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a), s = Math.sin(a);
    const pts = [
      new THREE.Vector3(center.x + c * 0.06, baseY, center.z + s * 0.08),
      new THREE.Vector3(center.x + c * rx * 0.78, center.y - 0.28 * d, center.z + s * rz * 0.78),
      new THREE.Vector3(center.x + c * rx * 1.03, center.y, center.z + s * rz * 1.03),
      new THREE.Vector3(center.x + c * rx * 0.9, center.y + 0.1 * d, center.z + s * rz * 0.9),
    ];
    group.add(tube(pts, pr, m.metal));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(pr * 1.3, 12, 10), m.metal);
    tip.position.copy(pts[3]);
    group.add(tip);
  }
  // under-gallery basket rail
  const rail = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 48), m.metal);
  rail.rotation.x = Math.PI / 2;
  rail.scale.set(rx * 1.6, rz * 1.6, 0.25);
  rail.position.set(center.x, center.y - 0.2 * d, center.z);
  group.add(rail);
}

const BANDS: Record<string, { tube: number; zs: number; radial: number; pave?: [number, number] }> = {
  polished: { tube: 0.085, zs: 1.85, radial: 40 },
  "diamond-cut": { tube: 0.09, zs: 1.7, radial: 6 },
  "partial-pave": { tube: 0.082, zs: 1.85, radial: 40, pave: [40, 140] },
  "three-quarter-pave": { tube: 0.082, zs: 1.85, radial: 40, pave: [-45, 225] },
  "full-pave": { tube: 0.082, zs: 1.85, radial: 40, pave: [-90, 270] },
  infinity: { tube: 0.07, zs: 1.6, radial: 40 },
};
const SETTING_3D: Record<string, string> = {
  "hidden-halo": "halo", "double-halo": "halo", "vintage-milgrain": "halo", "toi-et-moi": "three-stone",
  "split-shank": "cathedral", bypass: "solitaire-4",
};

const WEDDING_3D: Record<string, string> = {
  pave: "partial-pave", channel: "three-quarter-pave", eternity: "full-pave", "diamond-cut": "diamond-cut",
};

function buildWeddingBand(spec: RingSpec, m: Mats): RingBuild {
  const group = new THREE.Group();
  const wb = spec.weddingBand!;
  const tubeR = 0.075 + 0.004 * wb.widthMm;
  const zs = Math.max(1, (wb.widthMm / 8) / (2 * tubeR));
  const radial = ["flat-court", "beveled-edge"].includes(wb.style) ? 4 : wb.style === "knife-edge" ? 3 : wb.style === "diamond-cut" ? 6 : 40;
  const geo = new THREE.TorusGeometry(R + tubeR, tubeR, radial, 220);
  geo.scale(1, 1, zs);
  group.add(new THREE.Mesh(geo, m.metal));
  const pk = WEDDING_3D[wb.style];
  const anchors: THREE.Vector3[] = [new THREE.Vector3(0, R + 2 * tubeR, 0)];
  if (pk && BANDS[pk].pave) {
    const [from, to] = BANDS[pk].pave!;
    const ds = Math.min(0.11, 0.05 + 0.008 * wb.widthMm);
    const angles: number[] = [];
    for (let deg = from; deg <= to; deg += (ds / (R + 2 * tubeR)) * (180 / Math.PI) * 1.15) angles.push((deg * Math.PI) / 180);
    const pave = new THREE.InstancedMesh(gemGeometry(cutFor("round"), ds), m.melee, angles.length);
    const up = new THREE.Vector3(0, 1, 0);
    angles.forEach((a, i) => {
      const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      pave.setMatrixAt(i, new THREE.Matrix4().compose(dir.clone().multiplyScalar(R + 2 * tubeR - 0.012), q, new THREE.Vector3(1, 1, 1)));
      if (i % 6 === 0) anchors.push(dir.clone().multiplyScalar(R + 2 * tubeR));
    });
    group.add(pave);
  }
  if (wb.style === "single-stone") {
    const g = new THREE.Mesh(gemGeometry(cutFor("round"), 0.14), m.melee);
    g.position.set(0, R + 2 * tubeR - 0.02, 0);
    group.add(g);
  }
  return { group, sparkleAnchors: anchors, stoneSize: 0.3 };
}

export function buildRing(spec: RingSpec): RingBuild {
  const m = makeMaterials(spec);
  if (spec.weddingBand) return buildWeddingBand(spec, m);
  const group = new THREE.Group();
  const b = BANDS[spec.band] ?? BANDS.polished;
  const isToiEtMoi = spec.setting === "toi-et-moi";
  spec = { ...spec, setting: isToiEtMoi ? "toi-et-moi" : SETTING_3D[spec.setting] ?? spec.setting };

  // Band
  const bandGeo = new THREE.TorusGeometry(R + b.tube, b.tube, b.radial, 220);
  bandGeo.scale(1, 1, b.zs);
  group.add(new THREE.Mesh(bandGeo, m.metal));
  const topY = R + 2 * b.tube;

  // Centre stone
  const cut = cutFor(spec.shape);
  const d = 0.74 * Math.cbrt(Math.max(0.25, spec.carat));
  const rx = (d / 2) * cut.sx, rz = (d / 2) * cut.sz;
  const raised = spec.setting === "bezel" ? 0.1 + 0.18 * d : 0.14 + 0.3 * d;
  const gy = topY + raised;
  // Toi et Moi: two equal feature stones side by side, each in its own prongs.
  const offset = isToiEtMoi ? rx * 0.98 : 0;
  const center = new THREE.Vector3(-offset, gy, isToiEtMoi ? -rz * 0.18 : 0);
  addGem(group, cut, d, center, m, isToiEtMoi ? 0.12 : 0);
  if (isToiEtMoi) {
    const cut2 = cutFor(spec.secondShape ?? "pear");
    const c2 = new THREE.Vector3(offset, gy, rz * 0.18);
    const m2 = gemMats(m, spec.secondColor ?? "#FFFFFF");
    addGem(group, cut2, d, c2, m2, -0.12);
    addProngs(group, c2, (d / 2) * cut2.sx, (d / 2) * cut2.sz, d, 4, topY - 0.03, m);
  }
  const anchors: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.random() * 0.8;
    anchors.push(new THREE.Vector3(Math.cos(a) * rx * rr, gy + 0.08 * d + Math.random() * 0.07 * d, Math.sin(a) * rz * rr));
  }

  if (spec.setting === "bezel") {
    const prof = [[0.3, gy - 0.3 * d], [0.53, gy - 0.05 * d], [0.545, gy + 0.03 * d], [0.5, gy + 0.04 * d]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const bez = new THREE.LatheGeometry(prof, cut.segments === 16 || cut.segments === 20 ? 64 : cut.segments, cut.phi);
    bez.scale(d * cut.sx, 1, d * cut.sz);
    const bezMesh = new THREE.Mesh(bez, m.metal);
    (bezMesh.material as THREE.Material).side = THREE.DoubleSide;
    group.add(bezMesh);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(rx * 0.55, 0.1, gy - 0.3 * d - topY + 0.04, 24), m.metal);
    stem.position.y = (gy - 0.3 * d + topY - 0.04) / 2;
    group.add(stem);
  } else {
    addProngs(group, center, rx, rz, d, spec.setting === "solitaire-6" ? 6 : 4, topY - 0.03, m);
  }

  if (spec.setting === "halo") {
    const ds = 0.085;
    const hx = rx + ds * 0.62, hz = rz + ds * 0.62;
    const perim = Math.PI * (3 * (hx + hz) - Math.sqrt((3 * hx + hz) * (hx + 3 * hz)));
    const n = Math.floor(perim / (ds * 1.08));
    const melee = new THREE.InstancedMesh(gemGeometry(cutFor("round"), ds), m.melee, n);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      mtx.makeTranslation(Math.cos(a) * hx, gy - 0.025 * d, Math.sin(a) * hz);
      melee.setMatrixAt(i, mtx);
    }
    group.add(melee);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 10, 72), m.metal);
    frame.rotation.x = Math.PI / 2;
    frame.scale.set(hx, hz, 1);
    frame.position.y = gy - 0.025 * d - 0.035;
    group.add(frame);
  }

  if (spec.setting === "three-stone") {
    const d2 = d * 0.62;
    for (const side of [-1, 1]) {
      const sx = side * (rx + (d2 / 2) * cut.sx + 0.05);
      const c2 = new THREE.Vector3(sx, gy - 0.08 * d, 0);
      const sc = spec.sideColors?.[side < 0 ? 0 : 1];
      addGem(group, cut, d2, c2, sc ? gemMats(m, sc) : m, -side * 0.22);
      addProngs(group, c2, (d2 / 2) * cut.sx, (d2 / 2) * cut.sz, d2, 4, topY - 0.06, m);
    }
  }

  if (spec.setting === "cathedral") {
    for (const side of [-1, 1]) {
      for (const zs of [-1, 1]) {
        const a = Math.PI / 2 + side * -0.62;
        const pts = [
          new THREE.Vector3(Math.cos(a) * (R + b.tube * 1.6), Math.sin(a) * (R + b.tube * 1.6), zs * b.tube * b.zs * 0.45),
          new THREE.Vector3(side * rx * 0.95, gy - 0.42 * d, zs * rz * 0.45),
          new THREE.Vector3(side * rx * 0.55, gy - 0.2 * d, zs * rz * 0.4),
        ];
        group.add(tube(pts, 0.032, m.metal));
      }
    }
  }

  if (b.pave) {
    const ds = 0.07;
    const angles: number[] = [];
    for (let deg = b.pave[0]; deg <= b.pave[1]; deg += 5.2) if (Math.abs(deg - 90) > 16) angles.push((deg * Math.PI) / 180);
    const pave = new THREE.InstancedMesh(gemGeometry(cutFor("round"), ds), m.melee, angles.length);
    const up = new THREE.Vector3(0, 1, 0);
    angles.forEach((a, i) => {
      const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      const p = dir.clone().multiplyScalar(R + 2 * b.tube - 0.012);
      pave.setMatrixAt(i, new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
    });
    group.add(pave);
  }

  return { group, sparkleAnchors: anchors, stoneSize: d };
}

export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

// Studio environment: procedural HDR equirect map — dark warm studio, softbox, strip lights and
// pin-point hot-spots that make facets flash and polished gold read as mirror metal.
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture | null {
  try {
    const W = 512, H = 256;
    // Half-float: RGBA16F is filterable on every OpenGL ES 3 phone GPU (RGBA32F is not).
    const data = new Uint16Array(W * H * 4);
    const hf = THREE.DataUtils.toHalfFloat;
    const rand = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
    const spots = Array.from({ length: 22 }, (_, i) => ({ u: rand(i + 1), v: 0.18 + rand(i + 50) * 0.55, r: 0.004 + rand(i + 90) * 0.004 }));
    const strips = [
      { u: 0.1, w: 0.012, i: 10 }, { u: 0.36, w: 0.01, i: 8 }, { u: 0.6, w: 0.014, i: 12 },
      { u: 0.86, w: 0.01, i: 9 }, { u: 0.7, w: 0.006, i: 14 },
    ];
    for (let y = 0; y < H; y++) {
      const v = 1 - y / (H - 1); // row 0 is the bottom of the sphere (no flipY: expo-gl ignores it)
      for (let x = 0; x < W; x++) {
        const u = x / (W - 1);
        let r = 0.02, g = 0.017, b = 0.014; // dark warm walls
        if (v > 0.72) { r = g = b = 0.004; } // floor
        if (v < 0.14) { const k = 1.8 * (1 - v / 0.14) + 0.4; r += k; g += k * 0.97; b += k * 0.92; } // overhead softbox
        const fill = Math.exp(-(((u - 0.75) / 0.09) ** 2) - (((v - 0.42) / 0.12) ** 2)) * 1.1; // warm cream card behind camera
        r += fill; g += fill * 0.95; b += fill * 0.86;
        for (const s of strips) {
          if (Math.abs(u - s.u) < s.w && v > 0.18 && v < 0.68) { r += s.i; g += s.i * 0.98; b += s.i * 0.95; }
        }
        if (Math.abs(v - 0.46) < 0.008 && u > 0.2 && u < 0.32) { r += 6; g += 6; b += 6; }
        for (const sp of spots) {
          const d2 = (u - sp.u) ** 2 + (v - sp.v) ** 2;
          if (d2 < sp.r * sp.r) { r += 60; g += 60; b += 58; }
        }
        const k = (y * W + x) * 4;
        data[k] = hf(r); data[k + 1] = hf(g); data[k + 2] = hf(b); data[k + 3] = hf(1);
      }
    }
    const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.flipY = false;
    tex.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();
    tex.dispose();
    return env;
  } catch (err) {
    console.warn("studio env failed", err);
    return null;
  }
}

function dataTexture(size: number, fn: (x: number, y: number) => number, rgb: [number, number, number]) {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1)) * 2 - 1, y = (j / (size - 1)) * 2 - 1;
      const k = (j * size + i) * 4;
      data[k] = rgb[0]; data[k + 1] = rgb[1]; data[k + 2] = rgb[2];
      data[k + 3] = Math.min(255, Math.max(0, Math.round(fn(x, y) * 255)));
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}

export const sparkleTexture = () =>
  dataTexture(64, (x, y) => {
    const r2 = x * x + y * y;
    const core = Math.exp(-r2 * 28);
    const arms = Math.exp(-Math.abs(x) * 26) * Math.exp(-y * y * 2.5) + Math.exp(-Math.abs(y) * 26) * Math.exp(-x * x * 2.5);
    const diag = 0.35 * (Math.exp(-Math.abs(x - y) * 30) + Math.exp(-Math.abs(x + y) * 30)) * Math.exp(-r2 * 4);
    return Math.min(1, core + arms * 0.9 + diag);
  }, [255, 255, 255]);

export const shadowTexture = () => dataTexture(64, (x, y) => Math.exp(-(x * x + y * y) * 3.2) * 0.85, [40, 30, 20]);
