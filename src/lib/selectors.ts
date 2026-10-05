import type { HiwoDoc, Room, RoomPhoto } from "./types";

export function roomPhotos(doc: HiwoDoc, roomId: string): RoomPhoto[] {
  return doc.photos.filter((p) => p.room_id === roomId).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function roomCover(doc: HiwoDoc, room: Room): RoomPhoto | null {
  const photos = roomPhotos(doc, room.id);
  return photos.find((p) => p.id === room.cover_photo_id) ?? photos[0] ?? null;
}

export type RoomCard = {
  id: string;
  name: string;
  updated_at: string;
  coverPath: string | null;
  photoCount: number;
  itemCount: number;
};

export function roomCards(doc: HiwoDoc): RoomCard[] {
  return [...doc.rooms]
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
    .map((r) => ({
      id: r.id,
      name: r.name,
      updated_at: r.updated_at,
      coverPath: roomCover(doc, r)?.path ?? null,
      photoCount: doc.photos.filter((p) => p.room_id === r.id).length,
      itemCount: doc.furniture.filter((f) => f.room_id === r.id).length,
    }));
}

export function homeCoverPath(doc: HiwoDoc): string | null {
  const explicit = doc.photos.find((p) => p.id === doc.home.cover_photo_id);
  if (explicit) return explicit.path;
  return roomCards(doc).find((r) => r.coverPath)?.coverPath ?? null;
}
