import { storage } from "@/src/utils/storage";
import type { DesignSpec } from "@/src/api";

export type SavedDesign = DesignSpec & { id: string; price: number; createdAt: string; renderUrl?: string | null };

const KEY = "saved_designs";

// storage only accepts primitives, so the list is persisted as a JSON string.
export async function loadDesigns(): Promise<SavedDesign[]> {
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

export async function upsertDesign(d: SavedDesign) {
  const list = await loadDesigns();
  const idx = list.findIndex((x) => x.id === d.id);
  if (idx >= 0) list[idx] = d;
  else list.unshift(d);
  await persist(list);
}

export async function deleteDesign(id: string) {
  await persist((await loadDesigns()).filter((d) => d.id !== id));
}

export async function getDesign(id: string) {
  return (await loadDesigns()).find((d) => d.id === id) ?? null;
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
