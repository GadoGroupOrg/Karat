import { storeKey } from "@/src/tenant";
import { storage } from "@/src/utils/storage";
import { customerApi, hasCustomer, type DesignSpec } from "@/src/api";

export type SavedDesign = DesignSpec & { id: string; price: number; createdAt: string; renderUrl?: string | null };

const KEY = storeKey("saved_designs");

// storage only accepts primitives, so the list is persisted as a JSON string.
async function loadLocal(): Promise<SavedDesign[]> {
  const raw = await storage.getItem(KEY, "[]");
  try {
    return JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
}

async function persist(list: SavedDesign[]) {
  await storage.setItem(KEY, JSON.stringify(list));
}

/** Device list, merged with the customer's account when signed in (device-only designs are uploaded). */
export async function loadDesigns(): Promise<SavedDesign[]> {
  const local = await loadLocal();
  if (!hasCustomer()) return local;
  try {
    const { designs: remote } = await customerApi.designs<SavedDesign>();
    const ids = new Set(remote.map((d) => d.id));
    const missing = local.filter((d) => !ids.has(d.id));
    await Promise.all(missing.map((d) => customerApi.saveDesign(d)));
    const merged = [...remote, ...missing].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    await persist(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function upsertDesign(d: SavedDesign) {
  const list = await loadLocal();
  const idx = list.findIndex((x) => x.id === d.id);
  if (idx >= 0) list[idx] = d;
  else list.unshift(d);
  await persist(list);
  if (hasCustomer()) await customerApi.saveDesign(d).catch(() => null);
}

export async function deleteDesign(id: string) {
  await persist((await loadLocal()).filter((d) => d.id !== id));
  if (hasCustomer()) await customerApi.deleteDesign(id).catch(() => null);
}

export async function getDesign(id: string) {
  return (await loadLocal()).find((d) => d.id === id) ?? null;
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
