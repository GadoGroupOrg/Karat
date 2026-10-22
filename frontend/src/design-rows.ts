import { Catalog, DesignSpec, formatPrice } from "@/src/api";
import { groupVisible } from "@/src/catalog-utils";

// Human-readable spec rows for a design (used by the customer design detail and the admin lead view).
export function designRows(catalog: Catalog, design: DesignSpec, lines: { label: string; amount: number }[] = []) {
  const t = catalog.types.find((x) => x.id === design.type);
  if (!t) return { typeName: design.type, rows: [] as [string, string][] };
  const style = t.styles.find((s) => s.id === design.styleId);
  const size = t.sizes.find((s) => s.id === design.sizeId);
  const metal = catalog.metals.find((m) => m.id === design.metalId);
  const addons = catalog.addons.filter((a) => design.addonIds.includes(a.id));
  const rows: [string, string][] = [
    [t.style_label ?? "Style", `${style?.name ?? ""}`],
    ["Metal", metal?.name ?? ""],
    [t.id === "ring" || t.id === "band" ? "Ring size" : t.id === "earrings" ? "Size" : "Length", size?.label ?? ""],
    ...(t.max_addons > 0 ? [[t.addon_label, addons.length ? addons.map((a) => a.name).join(", ") : "None"] as [string, string]] : []),
  ];
  for (const g of t.option_groups ?? []) {
    if (!groupVisible(t, g, design)) continue;
    const o = g.options.find((x) => x.id === (design.options?.[g.id] ?? g.default));
    if (o) rows.push([g.label, o.name]);
  }
  if (design.options?.material_request) rows.push(["Material request", design.options.material_request]);
  for (const l of lines) rows.push([l.label, formatPrice(l.amount)]);
  if (design.engraving.trim()) rows.push(["Engraving", `“${design.engraving.trim()}”`]);
  return { typeName: t.name, rows };
}
