import { keepPreviousData, useQuery } from "@tanstack/react-query";

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
export type Pricing = { gold_karat: string; currency: string };
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
export type Quote = { lines: PriceLine[]; total: number; gold_grams: number };

const priceKey = (d: DesignSpec) => JSON.stringify({ ...d, name: "", addonIds: [...d.addonIds].sort() });

// Live retail quote from the merchant price sheet (costs & margins never reach the client).
export function usePrice(design: DesignSpec | null | undefined) {
  return useQuery({
    queryKey: ["price", design ? priceKey(design) : ""],
    enabled: !!design,
    placeholderData: keepPreviousData,
    queryFn: () => request<Quote>("/price", { method: "POST", body: JSON.stringify(design) }),
  });
}

// ---------- Merchant admin ----------
export function adminRequest<T>(pin: string, path: string, init?: RequestInit) {
  return request<T>(`/admin${path}`, { ...init, headers: { "X-Merchant-Pin": pin, ...(init?.headers || {}) } });
}
export async function adminCsv(pin: string) {
  const res = await fetch(`${BASE}/admin/price-sheet.csv`, { headers: { "X-Merchant-Pin": pin } });
  if (!res.ok) throw new Error("Export failed");
  return res.text();
}

export const formatPrice = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export const assetUrl = (path: string) => `${process.env.EXPO_PUBLIC_BACKEND_URL}${path}`;

export async function requestTryOn(productId: string, photo: { uri: string; mimeType?: string; name?: string }) {
  const res = await uploadForm(`${BASE}/tryons`, {
    fields: { product_id: productId },
    files: { photo: { uri: photo.uri, name: photo.name || "photo.jpg", mimeType: photo.mimeType || "image/jpeg" } },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Try-on failed");
  return body as { id: string; image_url: string; product_id: string };
}

export async function requestRender(design: DesignSpec, snapshotUri: string | null, force = false) {
  const res = await uploadForm(`${BASE}/renders`, {
    fields: { design: JSON.stringify(design), force: force ? "true" : "false" },
    files: snapshotUri ? { snapshot: { uri: snapshotUri, name: "preview.png", mimeType: "image/png" } } : {},
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Render failed");
  return body as { id: string; image_url: string; cached: boolean };
}
