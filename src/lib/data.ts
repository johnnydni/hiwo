import type { SupabaseClient } from "@supabase/supabase-js";
import type { Home, Profile, Role } from "./types";

export const HOME_KEY = "hiwo_home";

export type Ctx = {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
  home: Home;
  role: Role;
};

/** Signed URLs for private photos, keyed by storage path. */
export async function signPaths(supabase: SupabaseClient, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const { data } = await supabase.storage.from("photos").createSignedUrls(unique, 60 * 60);
  data?.forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
  return map;
}

export type RoomCard = {
  id: string;
  name: string;
  updated_at: string;
  coverPhotoId: string | null;
  coverUrl: string | null;
  photoCount: number;
  itemCount: number;
  versionCount: number;
};

/** Rooms of the current home with cover image and counts, in display order. */
export async function loadRoomCards(ctx: Pick<Ctx, "supabase" | "home">): Promise<RoomCard[]> {
  const { data: rooms, error } = await ctx.supabase
    .from("rooms")
    .select(
      "id,name,cover_photo_id,updated_at,position,room_photos!room_photos_room_id_fkey(id,storage_path,created_at),furniture_items(count),room_versions!room_versions_room_id_fkey(count)",
    )
    .eq("home_id", ctx.home.id)
    .order("position")
    .order("created_at");
  if (error) throw error;
  if (!rooms) return [];

  type PhotoRow = { id: string; storage_path: string; created_at: string };
  const withCover = rooms.map((r) => {
    const photos = (r.room_photos as PhotoRow[]) ?? [];
    const cover =
      photos.find((p) => p.id === r.cover_photo_id) ??
      [...photos].sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ??
      null;
    return { r, photos, cover };
  });
  const urls = await signPaths(
    ctx.supabase,
    withCover.map((x) => x.cover?.storage_path),
  );

  return withCover.map(({ r, photos, cover }) => ({
    id: r.id,
    name: r.name,
    updated_at: r.updated_at,
    coverPhotoId: cover?.id ?? null,
    coverUrl: cover ? (urls.get(cover.storage_path) ?? null) : null,
    photoCount: photos.length,
    itemCount: (r.furniture_items as { count: number }[])?.[0]?.count ?? 0,
    versionCount: (r.room_versions as { count: number }[])?.[0]?.count ?? 0,
  }));
}
