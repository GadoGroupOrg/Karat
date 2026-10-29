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
  /** Pavé ring under the centre stone, around the basket. */
  hiddenHalo?: boolean;
  /** Two-tone: head/prong metal colour (defaults to the band metal). */
  headColor?: string;
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
    color: new THREE.Color(spec.metalColor), metalness: 1, roughness: 0.14,
    envMapIntensity: 1.15, clearcoat: 0, clearcoatRoughness: 0.05,
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
const SETTING_3D: Record<string, string> = { "toi-et-moi": "three-stone" };
// Styles whose band opens under the head (the shank continues as strands/sweeps instead of a full circle).
const BAND_GAP: Record<string, number> = { "split-shank": 0.68, bypass: 0.55 };

function ringOfGems(group: THREE.Group, n: number, ds: number, at: (i: number) => [THREE.Vector3, THREE.Vector3], mat: THREE.Material) {
  const mesh = new THREE.InstancedMesh(gemGeometry(cutFor("round"), ds), mat, n);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const [p, dir] = at(i);
    mesh.setMatrixAt(i, new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(up, dir), new THREE.Vector3(1, 1, 1)));
  }
  group.add(mesh);
}

function beads(group: THREE.Group, pts: THREE.Vector3[], r: number, mat: THREE.Material) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 8, 6), mat, pts.length);
  pts.forEach((p, i) => mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
  group.add(mesh);
}

/** A halo row: pavé stones in a gold collet (seat + raised outer rim), as on a real halo head. */
function haloRow(group: THREE.Group, hx: number, hz: number, y: number, ds: number, m: Mats, head: Mats, milgrain = false) {
  const perim = Math.PI * (3 * (hx + hz) - Math.sqrt((3 * hx + hz) * (hx + 3 * hz)));
  const n = Math.max(10, Math.floor(perim / (ds * 1.06)));
  ringOfGems(group, n, ds, (i) => {
    const a = (i / n) * Math.PI * 2;
    return [new THREE.Vector3(Math.cos(a) * hx, y, Math.sin(a) * hz), new THREE.Vector3(Math.cos(a) * 0.12, 1, Math.sin(a) * 0.12).normalize()];
  }, m.melee);
  const seat = new THREE.Mesh(new THREE.TorusGeometry(1, ds * 0.42, 10, 96), head.metal);
  seat.rotation.x = Math.PI / 2;
  seat.scale.set(hx, hz, 1);
  seat.position.y = y - ds * 0.45;
  group.add(seat);
  const ox = hx + ds * 0.58, oz = hz + ds * 0.58;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, ds * 0.16, 8, 120), head.metal);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(ox, oz, 1);
  rim.position.y = y - ds * 0.05;
  group.add(rim);
  if (milgrain) {
    const k = Math.floor((Math.PI * (ox + oz)) / (ds * 0.32));
    beads(group, Array.from({ length: k }, (_, i) => {
      const a = (i / k) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * (ox + ds * 0.12), y - ds * 0.05, Math.sin(a) * (oz + ds * 0.12));
    }), ds * 0.13, head.metal);
  }
  return { ox, oz };
}

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
      pave.setMatrixAt(i, new THREE.Matrix4().compose(dir.clone().multiplyScalar(R + 2 * tubeR + 0.006), q, new THREE.Vector3(1, 1, 1)));
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
  const head: Mats = spec.headColor ? { ...m, metal: makeMaterials({ ...spec, metalColor: spec.headColor }).metal } : m;
  const isToiEtMoi = spec.setting === "toi-et-moi";
  spec = { ...spec, setting: isToiEtMoi ? "toi-et-moi" : SETTING_3D[spec.setting] ?? spec.setting };

  // Band (comfort-fit oval profile; open at the top for split-shank / bypass designs)
  const gap = BAND_GAP[spec.setting] ?? 0;
  const bandGeo = new THREE.TorusGeometry(R + b.tube, b.tube, b.radial, 220, Math.PI * 2 - gap * 2);
  if (gap) bandGeo.rotateZ(Math.PI / 2 + gap);
  bandGeo.scale(1, 1, b.zs);
  group.add(new THREE.Mesh(bandGeo, m.metal));
  const topY = R + 2 * b.tube;
  const bandEnd = (side: number) => {
    const a = Math.PI / 2 - side * gap;
    return new THREE.Vector3(Math.cos(a) * (R + b.tube), Math.sin(a) * (R + b.tube), 0);
  };
  if (gap) {
    // Round off the open band ends so the shoulders flow into the strands instead of showing a cut face.
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(b.tube, 24, 16), m.metal);
      cap.scale.set(1, 1, b.zs);
      cap.position.copy(bandEnd(side));
      group.add(cap);
    }
  }

  // Centre stone
  const cut = cutFor(spec.shape);
  const d = 0.66 * Math.cbrt(Math.max(0.25, spec.carat));
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
    addProngs(group, c2, (d / 2) * cut2.sx, (d / 2) * cut2.sz, d, 4, topY - 0.03, head);
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
    const bezMesh = new THREE.Mesh(bez, head.metal);
    (bezMesh.material as THREE.Material).side = THREE.DoubleSide;
    group.add(bezMesh);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(rx * 0.55, 0.1, gy - 0.3 * d - topY + 0.04, 24), head.metal);
    stem.position.y = (gy - 0.3 * d + topY - 0.04) / 2;
    group.add(stem);
  } else {
    addProngs(group, center, rx, rz, d, spec.setting === "solitaire-6" ? 6 : 4, topY - 0.03, head);
  }

  if (spec.hiddenHalo) {
    // Hidden halo: a row of pavé tucked under the centre stone's girdle on a gold collar, seen from the side.
    const ds = Math.min(0.075, Math.max(0.05, d * 0.1)), hx = rx * 0.82, hz = rz * 0.82, hy = gy - 0.2 * d;
    const n = Math.floor((Math.PI * (hx + hz)) / (ds * 1.04));
    ringOfGems(group, n, ds, (i) => {
      const a = (i / n) * Math.PI * 2;
      return [new THREE.Vector3(Math.cos(a) * hx, hy, Math.sin(a) * hz), new THREE.Vector3(Math.cos(a), 0.55, Math.sin(a)).normalize()];
    }, m.melee);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(1, ds * 0.4, 10, 96), head.metal);
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(hx * 0.9, hz * 0.9, 1);
    collar.position.y = hy - ds * 0.4;
    group.add(collar);
  }

  const haloDs = Math.min(0.1, Math.max(0.065, d * 0.14));
  if (spec.setting === "halo" || spec.setting === "double-halo" || spec.setting === "vintage-milgrain") {
    const milgrain = spec.setting === "vintage-milgrain";
    const inner = haloRow(group, rx + haloDs * 0.62, rz + haloDs * 0.62, gy - 0.03 * d, haloDs, m, head, milgrain);
    if (spec.setting === "double-halo") haloRow(group, inner.ox + haloDs * 0.55, inner.oz + haloDs * 0.55, gy - 0.07 * d, haloDs * 0.9, m, head);
    // Halo heads sit on a basket; vintage adds filigree scrolls on the sides and milgrain along the shoulders.
    for (const side of [-1, 1]) {
      group.add(tube([
        new THREE.Vector3(side * rx * 0.2, topY - 0.02, 0),
        new THREE.Vector3(side * inner.ox * 0.85, gy - 0.35 * d, 0),
        new THREE.Vector3(side * inner.ox * 0.95, gy - 0.08 * d, 0),
      ], 0.028, head.metal));
      if (milgrain) {
        for (const zs of [-1, 1]) {
          // Filigree drops hang from the gallery rail (attached, not floating beside the head).
          const lr = 0.055, a = Math.atan2(zs * Math.sin(0.55), side * Math.cos(0.55));
          const loop = new THREE.Mesh(new THREE.TorusGeometry(lr, 0.012, 6, 24), head.metal);
          loop.position.set(Math.cos(a) * rx * 0.8, gy - 0.2 * d - lr * 0.85, Math.sin(a) * rz * 0.8);
          loop.rotation.y = Math.PI / 2 - a;
          group.add(loop);
        }
        if (side > 0) {
          // shoulder milgrain spans both shoulders: add once (not per side)
          const edge: THREE.Vector3[] = [];
          for (let deg = 25; deg <= 155; deg += 2.2) {
            const a = (deg * Math.PI) / 180;
            for (const zs of [-1, 1]) edge.push(new THREE.Vector3(Math.cos(a) * (R + b.tube * 1.35), Math.sin(a) * (R + b.tube * 1.35), zs * b.tube * b.zs * 0.92));
          }
          beads(group, edge, 0.013, m.metal);
        }
      }
    }
  }

  if (spec.setting === "three-stone") {
    const d2 = d * 0.62;
    for (const side of [-1, 1]) {
      const sx = side * (rx + (d2 / 2) * cut.sx + 0.03);
      const by = Math.sqrt(Math.max(0, topY * topY - sx * sx)); // band surface under the side stone
      const c2 = new THREE.Vector3(sx, Math.min(gy - 0.05 * d, by + 0.1 + 0.28 * d2), 0);
      const sc = spec.sideColors?.[side < 0 ? 0 : 1];
      addGem(group, cut, d2, c2, sc ? gemMats(m, sc) : m, -side * 0.22);
      addProngs(group, c2, (d2 / 2) * cut.sx, (d2 / 2) * cut.sz, d2, 4, by - 0.03, head);
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

  if (spec.setting === "split-shank") {
    // Each shoulder divides into two strands that rejoin under the head; the upper strands carry pavé.
    // Strands follow the band circle (starting inside the band end so the join is hidden) and fan out
    // across the finger axis as they approach the head, meeting under the basket.
    const st = b.tube * 0.72;
    const onCircle = (a: number, r: number, z: number) => new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
    for (const side of [-1, 1]) {
      for (const zs of [-1, 1]) {
        const pts = [
          onCircle(Math.PI / 2 - side * (gap + 0.12), R + b.tube, 0),
          onCircle(Math.PI / 2 - side * gap * 0.75, R + b.tube, zs * b.tube * b.zs * 0.7),
          onCircle(Math.PI / 2 - side * gap * 0.35, R + b.tube + 0.04, zs * Math.max(rz * 0.6, b.tube * b.zs * 0.9)),
          new THREE.Vector3(side * rx * 0.3, topY - 0.02, zs * rz * 0.4),
        ];
        group.add(tube(pts, st, m.metal));
        const curve = new THREE.CatmullRomCurve3(pts);
        const k = 7;
        ringOfGems(group, k, st * 1.5, (i) => {
          const t = 0.22 + (i / (k - 1)) * 0.55;
          const p = curve.getPoint(t);
          const out = new THREE.Vector3(p.x, p.y, 0).normalize();
          return [p.add(out.clone().multiplyScalar(st * 0.8)), out];
        }, m.melee);
      }
    }
  }

  if (spec.setting === "bypass") {
    // The two shoulders sweep past each other around the stone: one in front, one behind.
    for (const side of [-1, 1]) {
      const zs = side;
      const pts = [
        new THREE.Vector3(Math.cos(Math.PI / 2 - side * (gap + 0.1)) * (R + b.tube), Math.sin(Math.PI / 2 - side * (gap + 0.1)) * (R + b.tube), 0),
        new THREE.Vector3(Math.cos(Math.PI / 2 - side * gap * 0.6) * (R + b.tube + 0.05), Math.sin(Math.PI / 2 - side * gap * 0.6) * (R + b.tube + 0.05), zs * rz * 0.3),
        new THREE.Vector3(side * rx * 0.25, gy - 0.32 * d, zs * (rz * 1.18 + 0.04)),
        new THREE.Vector3(-side * rx * 0.75, gy - 0.1 * d, zs * rz * 0.85),
        new THREE.Vector3(-side * rx * 1.08, gy + 0.02 * d, zs * rz * 0.35),
      ];
      group.add(tube(pts, b.tube * 0.92, m.metal));
      const cap = new THREE.Mesh(new THREE.SphereGeometry(b.tube * 0.92, 16, 12), m.metal);
      cap.position.copy(pts[pts.length - 1]);
      group.add(cap);
    }
  }

  if (b.pave) {
    // melee sits proud of the band surface (girdle just above the metal) so the crowns read clearly
    const ds = 0.078;
    const step = (ds / (R + 2 * b.tube)) * (180 / Math.PI) * 1.12;
    const angles: number[] = [];
    // keep clear of the head, and of the open gap on split-shank / bypass (no stones floating over air)
    const clear = Math.max(16, (gap * 180) / Math.PI + (gap ? 12 : 4));
    // Partial pavé on an open (split-shank / bypass) band: start where the band resumes and run 50° down each shoulder.
    const [p0, p1] = gap && b.pave[0] === 40 ? [90 - clear - 50, 90 + clear + 50] : b.pave;
    for (let deg = p0; deg <= p1; deg += step) if (Math.abs(deg - 90) > clear) angles.push((deg * Math.PI) / 180);
    const pave = new THREE.InstancedMesh(gemGeometry(cutFor("round"), ds), m.melee, angles.length);
    const up = new THREE.Vector3(0, 1, 0);
    angles.forEach((a, i) => {
      const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      const p = dir.clone().multiplyScalar(R + 2 * b.tube + 0.006);
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

// Studio environment: procedural HDR equirect map — bright neutral jewellery studio (light-tent walls,
// big softboxes, strip lights) plus pin-point hot-spots that make facets flash. Polished gold reflects
// mostly light surroundings, so it reads as bright yellow metal instead of dark/tarnished.
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture | null {
  try {
    const W = 512, H = 256;
    // Half-float: RGBA16F is filterable on every OpenGL ES 3 phone GPU (RGBA32F is not).
    const data = new Uint16Array(W * H * 4);
    const hf = THREE.DataUtils.toHalfFloat;
    const rand = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
    const spots = Array.from({ length: 22 }, (_, i) => ({ u: rand(i + 1), v: 0.18 + rand(i + 50) * 0.55, r: 0.004 + rand(i + 90) * 0.004 }));
    const strips = [
      { u: 0.1, w: 0.012, i: 6 }, { u: 0.36, w: 0.01, i: 5 }, { u: 0.6, w: 0.014, i: 7 },
      { u: 0.86, w: 0.01, i: 5 }, { u: 0.7, w: 0.006, i: 8 },
    ];
    const box = (u: number, v: number, cu: number, cv: number, hu: number, hv: number) =>
      Math.abs(u - cu) < hu && Math.abs(v - cv) < hv ? 1 : 0;
    for (let y = 0; y < H; y++) {
      const v = 1 - y / (H - 1); // row 0 is the bottom of the sphere (no flipY: expo-gl ignores it)
      for (let x = 0; x < W; x++) {
        const u = x / (W - 1);
        // Light-tent walls: bright top fading to a soft grey floor, slightly warm.
        const wall = v < 0.5 ? 0.95 - v * 0.6 : 0.65 - (v - 0.5) * 0.9;
        let r = wall, g = wall * 0.98, b = wall * 0.95;
        if (v < 0.16) { const k = 3 * (1 - v / 0.16) + 0.6; r += k; g += k; b += k * 0.98; } // overhead softbox
        const soft = 3.2 * (box(u, v, 0.25, 0.42, 0.07, 0.14) + box(u, v, 0.75, 0.42, 0.07, 0.14)); // side softboxes
        r += soft; g += soft; b += soft * 0.98;
        if (v > 0.78) { r *= 0.7; g *= 0.7; b *= 0.7; } // table edge contrast so the band shows form
        // Black flags (like a jeweller's photo cards) between the softboxes: polished metal needs dark
        // reflections next to bright ones, otherwise it reads flat and plasticky.
        const flag = box(u, v, 0.5, 0.45, 0.05, 0.2) || box(u, v, 0.02, 0.45, 0.04, 0.2) || box(u, v, 0.98, 0.45, 0.04, 0.2) || box(u, v, 0.5, 0.6, 0.5, 0.025);
        if (flag) { r = 0.03; g = 0.028; b = 0.026; }
        for (const s of strips) {
          if (Math.abs(u - s.u) < s.w && v > 0.18 && v < 0.68) { r += s.i; g += s.i; b += s.i * 0.98; }
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
