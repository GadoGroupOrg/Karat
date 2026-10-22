import { Platform } from "react-native";

/** Which business's storefront this session shows. Set by `?store=<slug>` (embeds, Shopify blocks, hosted links)
 * or by signing in to a business dashboard. Empty = the default business. Kept per browser tab. */
const KEY = "atelier_store";
const web = Platform.OS === "web" && typeof window !== "undefined";

function initial(): string {
  if (!web) return "";
  const fromUrl = new URLSearchParams(window.location.search).get("store");
  if (fromUrl) {
    window.sessionStorage.setItem(KEY, fromUrl.toLowerCase());
    return fromUrl.toLowerCase();
  }
  return window.sessionStorage.getItem(KEY) ?? "";
}

let slug = initial();

export const getStore = () => slug;
export const tenantHeaders = (): Record<string, string> => (slug ? { "X-Tenant": slug } : {});
/** Namespaces device storage per business (the default business keeps the original keys). */
export const storeKey = (k: string) => (slug && slug !== "gado" ? `${k}:${slug}` : k);

/** Switch business. Returns true if the page is reloading to pick up the new branding. */
export function switchStore(next: string): boolean {
  if (!next || next === slug || (!slug && next === "gado")) return false;
  slug = next;
  if (web) {
    window.sessionStorage.setItem(KEY, next);
    window.location.reload();
    return true;
  }
  return false;
}

export const storeLink = (origin: string, path = "/") => `${origin}${path}?store=${slug || "gado"}`;
