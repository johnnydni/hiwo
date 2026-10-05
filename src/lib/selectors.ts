import type { HiwoDoc, RoomPhoto, ShoppingItem } from "./types";

export function basePhoto(doc: HiwoDoc, roomId: string): RoomPhoto | null {
  return doc.photos.find((p) => p.room_id === roomId && p.kind === "base") ?? null;
}

export function variants(doc: HiwoDoc, roomId: string): RoomPhoto[] {
  return doc.photos
    .filter((p) => p.room_id === roomId && p.kind === "variant")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function sumOpen(items: ShoppingItem[]) {
  return items.filter((i) => i.status === "open").reduce((s, i) => s + (i.price_cents ?? 0), 0);
}

export type RoomCard = {
  id: string;
  name: string;
  updated_at: string;
  coverPath: string | null;
  variantCount: number;
  openCount: number;
};

export function sortedRooms(doc: HiwoDoc) {
  return [...doc.rooms].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
}

export function roomCards(doc: HiwoDoc): RoomCard[] {
  return sortedRooms(doc).map((r) => ({
    id: r.id,
    name: r.name,
    updated_at: r.updated_at,
    coverPath: (basePhoto(doc, r.id) ?? variants(doc, r.id)[0])?.path ?? null,
    variantCount: variants(doc, r.id).length,
    openCount: doc.shopping.filter((s) => s.room_id === r.id && s.status === "open").length,
  }));
}

export function homeCoverPath(doc: HiwoDoc): string | null {
  if (doc.home.cover) return doc.home.cover.path;
  const explicit = doc.photos.find((p) => p.id === doc.home.cover_photo_id);
  if (explicit) return explicit.path;
  return roomCards(doc).find((r) => r.coverPath)?.coverPath ?? null;
}

/** Options for "Für …" selects: Wohnung, each room, each variant of a room. */
export function targetOptions(doc: HiwoDoc) {
  return sortedRooms(doc).map((r) => ({
    id: r.id,
    name: r.name,
    variants: variants(doc, r.id).map((v) => ({ id: v.id, name: v.name ?? "Variante" })),
  }));
}
