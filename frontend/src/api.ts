import { useQuery } from "@tanstack/react-query";

import { uploadForm } from "@/src/utils/upload";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export type Metal = { id: string; name: string; color: string; multiplier: number };
export type Option = {
  id: string; name?: string; label?: string; price: number; description?: string; image?: string;
  grams?: number; accent_ct?: number; weight_factor?: number;
};
export type JewelryType = {
  id: string;
  name: string;
  tagline: string;
  base_price: number;
  addon_kind: "charm" | "stone";
  addon_label: string;
  max_addons: number;
  engraving_price: number;
  engraving_max: number;
  styles: Option[];
  sizes: Option[];
  style_label: string;
  option_groups: OptionGroup[];
  material_request?: boolean;
};
export type Addon = {
  id: string; name: string; shape: string; color: string | null; price: number; types: string[];
  image?: string | null; source?: "shopify"; url?: string;
};
export type GroupOption = {
  id: string; name: string; price: number; metal_factor?: number; addon_factor?: number; accent_factor?: number;
  grams?: number; accent_ct?: number; description?: string; image?: string;
};
export type OptionGroup = { id: string; label: string; default: string; options: GroupOption[] };
export type StoreInfo = { domain: string; name: string; currency: string; product_count: number; last_synced: string };
export type Pricing = { gold_karat: string; gold_per_gram: number; accent_price_per_ct: number; currency: string; note: string };
export type Catalog = { types: JewelryType[]; metals: Metal[]; addons: Addon[]; store: StoreInfo | null; pricing: Pricing };
export type StoreProduct = {
  id: string; title: string; handle: string; vendor: string; product_type: string; tags: string[];
  description: string; price: number; compare_at_price: number | null; available: boolean;
  image: string | null; images: string[]; url: string;
};

export type DesignSpec = {
  type: string;
  styleId: string;
  metalId: string;
  sizeId: string;
  addonIds: string[];
  engraving: string;
  name: string;
  options?: Record<string, string>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail : "Something went wrong";
    throw new Error(detail);
  }
  return res.json();
}

export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: () => request<Catalog>("/catalog"), staleTime: 1000 * 60 * 10 });
}

export function createQuote(body: { design: DesignSpec; name: string; email: string; note: string }) {
  return request<{ id: string; price: number }>("/quotes", { method: "POST", body: JSON.stringify(body) });
}

export function useStoreProducts(q: string, productType: string) {
  return useQuery({
    queryKey: ["store-products", q, productType],
    queryFn: () =>
      request<{ products: StoreProduct[]; product_types: string[] }>(
        `/store/products?q=${encodeURIComponent(q)}&product_type=${encodeURIComponent(productType)}`,
      ),
  });
}

export function useStoreProduct(id: string) {
  return useQuery({ queryKey: ["store-product", id], queryFn: () => request<StoreProduct>(`/store/products/${id}`) });
}

export const connectStore = (domain: string) =>
  request<{ store: StoreInfo }>("/store/connect", { method: "POST", body: JSON.stringify({ domain }) });
export const syncStore = () => request<{ store: StoreInfo }>("/store/sync", { method: "POST" });
export const disconnectStore = () => request<{ store: null }>("/store", { method: "DELETE" });

export type PriceLine = { label: string; amount: number };

// Mirrors compute_breakdown in backend/server.py.
export function computeBreakdown(c: Catalog, d: DesignSpec): { lines: PriceLine[]; total: number; grams: number } {
  const empty = { lines: [], total: 0, grams: 0 };
  const t = c.types.find((x) => x.id === d.type);
  if (!t) return empty;
  const style = t.styles.find((s) => s.id === d.styleId);
  const size = t.sizes.find((s) => s.id === d.sizeId);
  const metal = c.metals.find((m) => m.id === d.metalId);
  if (!style || !size || !metal) return empty;
  let labor = t.base_price + style.price + size.price;
  let grams = style.grams ?? 0, accentCt = style.accent_ct ?? 0, addonFactor = 1, accentFactor = 1;
  for (const g of t.option_groups ?? []) {
    const o = g.options.find((x) => x.id === (d.options?.[g.id] ?? g.default));
    if (!o) continue;
    labor += o.price;
    grams += o.grams ?? 0;
    accentCt += o.accent_ct ?? 0;
    addonFactor *= o.addon_factor ?? 1;
    accentFactor *= o.accent_factor ?? 1;
  }
  const wf = size.weight_factor ?? 1;
  grams *= wf;
  accentCt *= wf;
  const lines: PriceLine[] = [];
  if (grams) {
    lines.push({ label: `18k gold · ${grams.toFixed(1)} g`, amount: grams * c.pricing.gold_per_gram * metal.multiplier });
    lines.push({ label: "Setting & craftsmanship", amount: labor });
  } else {
    lines.push({ label: "Piece", amount: labor * metal.multiplier });
  }
  if (accentCt) lines.push({ label: `Accent diamonds · ${accentCt.toFixed(2)} ct`, amount: accentCt * c.pricing.accent_price_per_ct * accentFactor });
  for (const a of c.addons.filter((x) => d.addonIds.includes(x.id) && x.types.includes(d.type))) {
    lines.push({ label: a.name, amount: a.price * addonFactor });
  }
  if (d.engraving.trim() && t.engraving_max > 0) lines.push({ label: "Engraving", amount: t.engraving_price });
  lines.forEach((l) => { l.amount = Math.round(l.amount); });
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0), grams };
}

export const computePrice = (c: Catalog, d: DesignSpec) => computeBreakdown(c, d).total;

export const formatPrice = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export const assetUrl = (path: string) => `${process.env.EXPO_PUBLIC_BACKEND_URL}${path}`;

export async function requestRender(design: DesignSpec, snapshotUri: string | null, force = false) {
  const res = await uploadForm(`${BASE}/renders`, {
    fields: { design: JSON.stringify(design), force: force ? "true" : "false" },
    files: snapshotUri ? { snapshot: { uri: snapshotUri, name: "preview.png", mimeType: "image/png" } } : {},
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Render failed");
  return body as { id: string; image_url: string; cached: boolean };
}
