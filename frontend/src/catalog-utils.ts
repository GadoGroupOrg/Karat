import { DesignSpec, JewelryType, OptionGroup } from "@/src/api";

const opt = (t: JewelryType, d: DesignSpec, gid: string) =>
  d.options?.[gid] ?? t.option_groups?.find((g) => g.id === gid)?.default;

/** True when the design has halo / pavé / channel accent stones. */
export function hasAccents(t: JewelryType, d: DesignSpec) {
  const style = t.styles.find((s) => s.id === d.styleId);
  const multi = ["three-stone", "toi-et-moi"].includes(d.styleId);
  const band = t.option_groups?.find((g) => g.id === "band")?.options.find((o) => o.id === opt(t, d, "band"));
  return (!multi && (style?.accent_ct ?? 0) > 0) || (band?.accent_ct ?? 0) > 0;
}

/** Hide stone pickers that don't apply to the chosen setting (e.g. side stones on a solitaire). */
export function groupVisible(t: JewelryType, g: OptionGroup, d: DesignSpec) {
  if (!g.when) return true;
  if (g.when === "accents") return hasAccents(t, d);
  if (g.when === "stack") return (d.options?.stack ?? "0") !== "0";
  return g.when.styles.includes(d.styleId);
}

/** Wedding bands: some styles and widths are women's or men's only. */
export function forWearer<T extends { wearers?: string[] }>(t: JewelryType, d: DesignSpec, items: T[]) {
  const w = opt(t, d, "wearer");
  if (!w) return items;
  return items.filter((x) => !x.wearers || x.wearers.includes(w));
}
