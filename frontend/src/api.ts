import { useQuery } from "@tanstack/react-query";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export type Metal = { id: string; name: string; color: string; multiplier: number };
export type Option = { id: string; name?: string; label?: string; price: number };
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
};
export type Addon = {
  id: string; name: string; shape: string; color: string | null; price: number; types: string[];
  image?: string | null; source?: "shopify"; url?: string;
};
export type StoreInfo = { domain: string; name: string; currency: string; product_count: number; last_synced: string };
export type Catalog = { types: JewelryType[]; metals: Metal[]; addons: Addon[]; store: StoreInfo | null };
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

export function computePrice(c: Catalog, d: DesignSpec): number {
  const t = c.types.find((x) => x.id === d.type);
  if (!t) return 0;
  const style = t.styles.find((s) => s.id === d.styleId);
  const size = t.sizes.find((s) => s.id === d.sizeId);
  const metal = c.metals.find((m) => m.id === d.metalId);
  if (!style || !size || !metal) return 0;
  let total = (t.base_price + style.price + size.price) * metal.multiplier;
  total += c.addons.filter((a) => d.addonIds.includes(a.id) && a.types.includes(d.type)).reduce((s, a) => s + a.price, 0);
  if (d.engraving.trim() && t.engraving_max > 0) total += t.engraving_price;
  return Math.round(total);
}

export const formatPrice = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
