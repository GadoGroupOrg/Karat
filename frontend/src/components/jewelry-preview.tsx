import React, { useId } from "react";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Image as SvgImage, Line, Path, Polygon, Text as SvgText } from "react-native-svg";

import type { Addon, Catalog, DesignSpec } from "@/src/api";
import { useTheme } from "@/src/theme";

// Fixed light/dark accents inside rendered metal (identical in any theme).
const HIGHLIGHT = "#FFFFFF";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function Gem({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    return `${cx + Math.cos(a) * r * 0.55},${cy + Math.sin(a) * r * 0.55}`;
  }).join(" ");
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={color} stroke={shade(color, -0.35)} strokeWidth={1} />
      <Polygon points={pts} fill={HIGHLIGHT} fillOpacity={0.28} stroke={HIGHLIGHT} strokeOpacity={0.5} strokeWidth={0.6} />
      <Circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.18} fill={HIGHLIGHT} fillOpacity={0.85} />
    </G>
  );
}

function Pearl({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={color} stroke={shade(color, -0.2)} strokeWidth={1} />
      <Circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.3} fill={HIGHLIGHT} fillOpacity={0.9} />
    </G>
  );
}

// Store product photo, cropped to a round bezel in the chosen metal.
function ProductCharm({ addon, cx, cy, s, metal }: { addon: Addon; cx: number; cy: number; s: number; metal: string }) {
  const clipId = `clip${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <G>
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={cx} cy={cy} r={s} />
        </ClipPath>
      </Defs>
      <Circle cx={cx} cy={cy} r={s + 2} fill={metal} />
      {addon.image ? (
        <SvgImage href={addon.image} x={cx - s} y={cy - s} width={s * 2} height={s * 2}
          preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
      ) : (
        <Circle cx={cx} cy={cy} r={s} fill={HIGHLIGHT} />
      )}
    </G>
  );
}

export function Charm({ addon, cx, cy, s, metal, canvas, letter }: {
  addon: Addon; cx: number; cy: number; s: number; metal: string; canvas: string; letter: string;
}) {
  const stroke = shade(metal, -0.3);
  switch (addon.shape) {
    case "image":
      return <ProductCharm addon={addon} cx={cx} cy={cy + s * 0.7} s={s * 1.7} metal={metal} />;
    case "heart":
      return (
        <Path
          d={`M ${cx} ${cy + s} C ${cx - s * 1.6} ${cy - s * 0.1}, ${cx - s * 0.7} ${cy - s * 1.3}, ${cx} ${cy - s * 0.4} C ${cx + s * 0.7} ${cy - s * 1.3}, ${cx + s * 1.6} ${cy - s * 0.1}, ${cx} ${cy + s} Z`}
          fill={metal} stroke={stroke} strokeWidth={1} />
      );
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? s : s * 0.45;
        return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
      }).join(" ");
      return <Polygon points={pts} fill={metal} stroke={stroke} strokeWidth={1} />;
    }
    case "moon":
      return (
        <G>
          <Circle cx={cx} cy={cy} r={s} fill={metal} stroke={stroke} strokeWidth={1} />
          <Circle cx={cx + s * 0.45} cy={cy - s * 0.25} r={s * 0.82} fill={canvas} />
        </G>
      );
    case "disc":
      return (
        <G>
          <Circle cx={cx} cy={cy} r={s} fill={metal} stroke={stroke} strokeWidth={1} />
          <SvgText x={cx} y={cy + s * 0.38} fontSize={s * 1.05} fontWeight="700" fill={stroke} textAnchor="middle">
            {letter}
          </SvgText>
        </G>
      );
    case "clover":
      return (
        <G>
          {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy], i) => (
            <Circle key={i} cx={cx + dx * s * 0.48} cy={cy + dy * s * 0.48} r={s * 0.5} fill={metal} stroke={stroke} strokeWidth={0.8} />
          ))}
        </G>
      );
    case "eye":
      return (
        <G>
          <Circle cx={cx} cy={cy} r={s} fill={addon.color ?? metal} stroke={metal} strokeWidth={2} />
          <Circle cx={cx} cy={cy} r={s * 0.55} fill={HIGHLIGHT} />
          <Circle cx={cx} cy={cy} r={s * 0.28} fill={shade(addon.color ?? metal, -0.5)} />
        </G>
      );
    case "pearl":
      return <Pearl cx={cx} cy={cy} r={s} color={addon.color ?? HIGHLIGHT} />;
    default:
      return (
        <G>
          <Circle cx={cx} cy={cy} r={s + 1.5} fill={metal} />
          <Gem cx={cx} cy={cy} r={s} color={addon.color ?? HIGHLIGHT} />
        </G>
      );
  }
}

function Stone({ addon, cx, cy, r, metal = "#D4AF37" }: { addon?: Addon; cx: number; cy: number; r: number; metal?: string }) {
  if (!addon) return <Gem cx={cx} cy={cy} r={r} color="#F4F6F6" />;
  if (addon.shape === "image") return <ProductCharm addon={addon} cx={cx} cy={cy} s={r} metal={metal} />;
  if (addon.shape === "pearl") return <Pearl cx={cx} cy={cy} r={r} color={addon.color ?? HIGHLIGHT} />;
  return <Gem cx={cx} cy={cy} r={r} color={addon.color ?? HIGHLIGHT} />;
}

function chainProps(style: string, metal: string) {
  if (style === "paperclip") return { stroke: metal, strokeWidth: 4, strokeDasharray: "14 3" };
  if (style === "snake") return { stroke: metal, strokeWidth: 4.5 };
  return { stroke: metal, strokeWidth: 3, strokeDasharray: "6 2.5" };
}

type Props = { catalog: Catalog; design: DesignSpec; width?: number | string; height?: number | string };

export function JewelryPreview({ catalog, design, width = "100%", height = "100%" }: Props) {
  const { colors } = useTheme();
  const canvas = colors.surfaceSecondary;
  const t = catalog.types.find((x) => x.id === design.type);
  const metal = catalog.metals.find((m) => m.id === design.metalId)?.color ?? colors.brand;
  const addons = design.addonIds
    .map((id) => catalog.addons.find((a) => a.id === id))
    .filter((a): a is Addon => !!a && a.types.includes(design.type));
  const sizeIdx = Math.max(0, t?.sizes.findIndex((s) => s.id === design.sizeId) ?? 0);
  const letter = (design.engraving.trim()[0] ?? "A").toUpperCase();
  const engr = design.engraving.trim();
  const chain = chainProps(design.styleId, metal);

  let body: React.ReactNode = null;

  if (design.type === "necklace") {
    const P0 = { x: 40, y: 30 }, P2 = { x: 260, y: 30 }, P1 = { x: 150, y: 170 + sizeIdx * 22 };
    const at = (tt: number) => ({
      x: (1 - tt) ** 2 * P0.x + 2 * (1 - tt) * tt * P1.x + tt ** 2 * P2.x,
      y: (1 - tt) ** 2 * P0.y + 2 * (1 - tt) * tt * P1.y + tt ** 2 * P2.y,
    });
    const d = `M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`;
    body = (
      <G>
        <Path d={d} fill="none" strokeLinecap="round" {...chain} />
        {design.styleId === "snake" && <Path d={d} fill="none" stroke={HIGHLIGHT} strokeOpacity={0.55} strokeWidth={1} />}
        {design.styleId === "paperclip" && <Path d={d} fill="none" stroke={canvas} strokeWidth={1.6} strokeDasharray="10 7" strokeDashoffset={-2} />}
        {addons.map((a, i) => {
          const p = at(0.5 + (i - (addons.length - 1) / 2) * 0.085);
          return (
            <G key={a.id}>
              <Line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 9} stroke={metal} strokeWidth={1.5} />
              <Charm addon={a} cx={p.x} cy={p.y + 20} s={10} metal={metal} canvas={canvas} letter={letter} />
            </G>
          );
        })}
      </G>
    );
  } else if (design.type === "bracelet") {
    const cx = 150, cy = 105, rx = 100 + sizeIdx * 6, ry = 50 + sizeIdx * 3;
    body = (
      <G>
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" {...chain} strokeWidth={design.styleId === "tennis" ? 7 : chain.strokeWidth} strokeDasharray={design.styleId === "tennis" ? undefined : chain.strokeDasharray} />
        {design.styleId === "paperclip" && <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={canvas} strokeWidth={1.6} strokeDasharray="10 7" />}
        {design.styleId === "tennis" &&
          Array.from({ length: 30 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 30;
            return <Circle key={i} cx={cx + rx * Math.cos(a)} cy={cy + ry * Math.sin(a)} r={2.6} fill={HIGHLIGHT} stroke={shade(metal, -0.3)} strokeWidth={0.6} />;
          })}
        {addons.map((a, i) => {
          const ang = Math.PI / 2 + (i - (addons.length - 1) / 2) * 0.36;
          const x = cx + rx * Math.cos(ang), y = cy + ry * Math.sin(ang);
          return (
            <G key={a.id}>
              <Line x1={x} y1={y} x2={x} y2={y + 8} stroke={metal} strokeWidth={1.5} />
              <Charm addon={a} cx={x} cy={y + 19} s={10} metal={metal} canvas={canvas} letter={letter} />
            </G>
          );
        })}
        {!!engr && (
          <SvgText x={cx} y={cy + 4} fontSize={12} fontStyle="italic" fill={colors.muted} textAnchor="middle">{`“${engr}”`}</SvgText>
        )}
      </G>
    );
  } else if (design.type === "ring") {
    const cx = 150, cy = 140, r = 62;
    const band = design.styleId === "band" ? 14 : 9;
    const stone = addons[0];
    const top = cy - r;
    body = (
      <G>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={shade(metal, -0.15)} strokeWidth={band} />
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={metal} strokeWidth={band - 3} />
        <Circle cx={cx} cy={cy} r={r - band / 2 + 1} fill="none" stroke={HIGHLIGHT} strokeOpacity={0.4} strokeWidth={1} />
        {design.styleId === "band" ? (
          stone && [-18, 0, 18].map((dx) => <Stone key={dx} addon={stone} cx={cx + dx} cy={top + (dx === 0 ? 0 : 3)} r={4} />)
        ) : (
          <G>
            {design.styleId === "halo" &&
              Array.from({ length: 14 }, (_, i) => {
                const a = (Math.PI * 2 * i) / 14;
                return <Circle key={i} cx={cx + Math.cos(a) * 24} cy={top - 18 + Math.sin(a) * 24} r={3.4} fill={HIGHLIGHT} stroke={shade(metal, -0.3)} strokeWidth={0.8} />;
              })}
            {[-1, 1].map((s) => (
              <Line key={s} x1={cx + s * 10} y1={top - 2} x2={cx + s * 14} y2={top - 30} stroke={metal} strokeWidth={3} strokeLinecap="round" />
            ))}
            <Stone metal={metal} addon={stone} cx={cx} cy={top - 18} r={17} />
          </G>
        )}
        {!!engr && (
          <SvgText x={cx} y={cy + 6} fontSize={13} fontStyle="italic" fill={colors.muted} textAnchor="middle">{`“${engr}”`}</SvgText>
        )}
      </G>
    );
  } else if (design.type === "earrings") {
    const stone = addons[0];
    body = (
      <G>
        {[95, 205].map((x) => {
          if (design.styleId === "hoop") {
            const r = 30 + sizeIdx * 10;
            return (
              <G key={x}>
                <Circle cx={x} cy={60 + r} r={r} fill="none" stroke={metal} strokeWidth={4 + sizeIdx} />
                <Circle cx={x} cy={60 + r} r={r} fill="none" stroke={HIGHLIGHT} strokeOpacity={0.45} strokeWidth={1} />
                {stone && <Stone metal={metal} addon={stone} cx={x} cy={60 + 2 * r} r={6} />}
              </G>
            );
          }
          if (design.styleId === "drop") {
            const len = 50 + sizeIdx * 22;
            return (
              <G key={x}>
                <Path d={`M ${x - 10} 52 C ${x - 10} 30, ${x + 10} 30, ${x} 58`} fill="none" stroke={metal} strokeWidth={2.5} />
                <Line x1={x} y1={58} x2={x} y2={58 + len} stroke={metal} strokeWidth={2} strokeDasharray="4 2" />
                <Circle cx={x} cy={58 + len + 12} r={14} fill={metal} />
                <Stone metal={metal} addon={stone} cx={x} cy={58 + len + 12} r={12} />
              </G>
            );
          }
          const r = 12 + sizeIdx * 5;
          return (
            <G key={x}>
              <Circle cx={x} cy={120} r={r + 3} fill={metal} stroke={shade(metal, -0.3)} strokeWidth={1} />
              <Stone metal={metal} addon={stone} cx={x} cy={120} r={r} />
            </G>
          );
        })}
      </G>
    );
  }

  return (
    <Svg width={width} height={height} viewBox="0 0 300 260">
      {body}
    </Svg>
  );
}
