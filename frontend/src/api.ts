import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { isEmbedded } from "@/src/embed";
import { tenantHeaders } from "@/src/tenant";
import { uploadForm } from "@/src/utils/upload";

export const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

// Customer identity (contact form / account) is attached to every call so the jeweler's access rules apply.
let customerToken: string | null = null;
export const setCustomerToken = (t: string | null) => {
  customerToken = t;
};
export const customerHeaders = (): Record<string, string> => ({
  ...tenantHeaders(),
  ...(customerToken ? { "X-Customer-Token": customerToken } : {}),
});
export const hasCustomer = () => !!customerToken;

export type Metal = { id: string; name: string; color: string; multiplier: number };
export type Option = {
  id: string; name?: string; label?: string; price: number; description?: string; image?: string;
  grams?: number; accent_ct?: number; weight_factor?: number; wearers?: string[];
};
export type JewelryType = {
  id: string;
  name: string;
  tagline: string;
  base_price: number;
  addon_kind: "charm" | "stone" | "none";
  group?: string;
  group_name?: string;
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
  grams?: number; accent_ct?: number; description?: string; image?: string; color?: string; wearers?: string[]; mm?: number;
};
export type OptionGroup = {
  id: string; label: string; default: string; options: GroupOption[];
  /** Only show for these styles, or only when the design has halo/pavé accents. */
  when?: { styles: string[] } | "accents";
};
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
    headers: { "Content-Type": "application/json", ...customerHeaders(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail : "Something went wrong";
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export type Storefront = { images: Record<string, string>; disabled_types: string[] };
export function useStorefront() {
  return useQuery({ queryKey: ["storefront"], queryFn: () => request<Storefront>("/storefront"), staleTime: 1000 * 30 });
}

export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: () => request<Catalog>("/catalog"), staleTime: 1000 * 60 * 10 });
}

export type Stroke = { points: [number, number][]; w: number };
export async function requestSketch(design: DesignSpec, strokes: Stroke[], note: string, renderId: string | null, snapshotUri: string | null) {
  const res = await uploadForm(`${BASE}/sketches`, {
    fields: { design: JSON.stringify(design), strokes: JSON.stringify(strokes), note, render_id: renderId ?? "" },
    files: snapshotUri && !renderId ? { snapshot: { uri: snapshotUri, name: "preview.png", mimeType: "image/png" } } : {},
    headers: customerHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Sketch render failed");
  return body as { id: string; image_url: string; sketch_url: string };
}
export function requestAngle(renderId: string, angle: string) {
  return request<{ image_url: string }>(`/renders/${renderId}/angles/${angle}`, { method: "POST" });
}

export type Level = "none" | "form" | "account";
export type Customer = { user_id: string; email: string; name: string; phone: string; picture?: string | null; kind: string; level: Level };
export type AccessRules = { rules: Record<string, Level>; questions: { id: string; label: string; required: boolean }[] };
export const customerApi = {
  access: () => request<AccessRules>("/access"),
  me: () => request<Customer>("/customers/me"),
  contact: (b: { name: string; email: string; phone: string; answers: Record<string, string> }) =>
    request<{ session_token: string; user: Customer }>("/customers/contact", { method: "POST", body: JSON.stringify(b) }),
  register: (b: { name: string; email: string; password: string; phone: string }) =>
    request<{ session_token: string; user: Customer }>("/customers/register", { method: "POST", body: JSON.stringify(b) }),
  login: (b: { email: string; password: string }) =>
    request<{ session_token: string; user: Customer }>("/customers/login", { method: "POST", body: JSON.stringify(b) }),
  google: (session_id: string) => request<{ session_token: string; user: Customer }>("/auth/session", { method: "POST", body: JSON.stringify({ session_id }) }),
  logout: () => request<{ ok: boolean }>("/customers/logout", { method: "POST" }),
  designs: <T,>() => request<{ designs: T[] }>("/customers/designs"),
  saveDesign: (d: { id: string }) => request<{ ok: boolean }>(`/customers/designs/${d.id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteDesign: (id: string) => request<{ ok: boolean }>(`/customers/designs/${id}`, { method: "DELETE" }),
  quotes: () => request<{ quotes: MyQuote[] }>("/customers/quotes"),
};
export type MyQuote = {
  id: string; kind: string; price: number; status: string; created_at: string; image_url: string | null;
  note: string; title: string; product_image: string | null;
};

export type QuoteBody = {
  design?: DesignSpec; product_id?: string; tryon_id?: string; sketch_id?: string; render_url?: string | null; source?: "app" | "embed";
  name: string; email: string; phone?: string; note: string;
};
export function createQuote(body: QuoteBody) {
  return request<{ id: string; price: number }>("/quotes", { method: "POST", body: JSON.stringify({ source: isEmbedded ? "embed" : "app", ...body }) });
}

// ---------- Branding & desktop admin ----------
export type Branding = {
  store_name: string; tagline: string; logo_url: string | null;
  colors: { brand: string; ink: string; surface: string }; display_font: string; text_font: string; updated_at: string | null;
};
export async function fetchBranding(timeoutMs = 4000): Promise<Branding | null> {
  const ctrl = new AbortController();
  const h = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await request<Branding>("/branding", { signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(h);
  }
}

export type LeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";
export type LeadNote = { id: string; text: string; system: boolean; author: string; created_at: string };
export type Lead = {
  id: string; kind: "design" | "product" | "sketch"; design: DesignSpec | null;
  sketch?: { id: string; note: string; sketch_url: string } | null;
  product: { id: string; title: string; price: number; image: string | null; url: string; product_type: string } | null;
  name: string; email: string; phone: string; note: string; price: number; image_url: string | null;
  source: "app" | "embed"; status: LeadStatus; notes: LeadNote[]; created_at: string;
};
export type LeadList = { leads: Lead[]; counts: Record<LeadStatus, number>; total: number; open_value: number };

export function dashRequest<T>(token: string, path: string, init?: RequestInit) {
  return request<T>(`/dashboard${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
}
export async function uploadLogo(token: string, file: { uri: string; mimeType?: string; name?: string }) {
  const res = await uploadForm(`${BASE}/dashboard/branding/logo`, {
    files: { logo: { uri: file.uri, mimeType: file.mimeType || "image/png", name: file.name || "logo.png" } },
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Upload failed");
  return body as Branding;
}
export type AdminRole = "owner" | "staff";
export type AdminSession = {
  admin: { id: string; email: string; name: string; role: AdminRole };
  tenant: { id: string; slug: string; name: string; status: string; plan: string };
  impersonating: boolean;
};
export function login(email: string, password: string) {
  return request<AdminSession & { access_token: string }>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
}
export function signup(b: { business_name: string; name: string; email: string; password: string }) {
  return request<AdminSession & { access_token: string }>("/auth/signup", { method: "POST", body: JSON.stringify(b) });
}
export function fetchMe(token: string) {
  return request<AdminSession>("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
}
export function changePassword(token: string, current_password: string, new_password: string) {
  return request<{ ok: boolean }>("/auth/password", {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ current_password, new_password }),
  });
}

// ---------- Platform (software supplier) console ----------
export type PlatformTenant = {
  id: string; slug: string; name: string; status: "active" | "paused"; plan: string; created_at: string;
  owner_email: string | null; team: number; leads: number; customers: number; shopify_shop: string | null;
  ai_usage_month: Record<string, number>; ai_total_month: number;
};
export const platformApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; admin: { id: string; email: string; name: string } }>("/platform/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),
  call: <T,>(token: string, path: string, init?: RequestInit) =>
    request<T>(`/platform${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } }),
};
export const leadImage = (l: Lead) => (l.image_url ? assetUrl(l.image_url) : l.product?.image ?? null);
export const BACKEND_ORIGIN = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

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

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
export const connectStore = (token: string, domain: string) =>
  request<{ store: StoreInfo }>("/store/connect", { method: "POST", headers: bearer(token), body: JSON.stringify({ domain }) });
export const syncStore = (token: string) => request<{ store: StoreInfo }>("/store/sync", { method: "POST", headers: bearer(token) });
export const disconnectStore = (token: string) => request<{ store: null }>("/store", { method: "DELETE", headers: bearer(token) });

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
// `pin` is either the merchant PIN or "Bearer <token>" from the desktop admin login.
const merchantAuth = (pin: string): Record<string, string> => (pin.startsWith("Bearer ") ? { Authorization: pin } : { "X-Merchant-Pin": pin });
export function adminRequest<T>(pin: string, path: string, init?: RequestInit) {
  return request<T>(`/admin${path}`, { ...init, headers: { ...merchantAuth(pin), ...(init?.headers || {}) } });
}
export async function adminCsv(pin: string) {
  const res = await fetch(`${BASE}/admin/price-sheet.csv`, { headers: merchantAuth(pin) });
  if (!res.ok) throw new Error("Export failed");
  return res.text();
}

export const formatPrice = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export const assetUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${process.env.EXPO_PUBLIC_BACKEND_URL}${path}`);

export async function requestTryOn(productId: string, photo: { uri: string; mimeType?: string; name?: string }) {
  const res = await uploadForm(`${BASE}/tryons`, {
    fields: { product_id: productId },
    headers: customerHeaders(),
    files: { photo: { uri: photo.uri, name: photo.name || "photo.jpg", mimeType: photo.mimeType || "image/jpeg" } },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Try-on failed");
  return body as { id: string; image_url: string; product_id: string };
}

export async function requestRender(design: DesignSpec, snapshotUri: string | null, force = false) {
  const res = await uploadForm(`${BASE}/renders`, {
    fields: { design: JSON.stringify(design), force: force ? "true" : "false" },
    headers: customerHeaders(),
    files: snapshotUri ? { snapshot: { uri: snapshotUri, name: "preview.png", mimeType: "image/png" } } : {},
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Render failed");
  return body as { id: string; image_url: string; cached: boolean };
}
