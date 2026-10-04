import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Home, Profile, Role } from "./types";

export const HOME_COOKIE = "hiwo_home";

export type Ctx = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profile: Profile;
  home: Home;
  role: Role;
};

/** Signed-in user + their current home. Redirects to login / onboarding. */
export const getContext = cache(async (): Promise<Ctx> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("id,email,display_name,avatar_path").eq("id", user.id).single(),
    supabase
      .from("home_members")
      .select("role, created_at, home:homes(id,name,city,cover_photo_id,created_at)")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  // Onboarding asks for a home (first user) and a name (everyone, incl. invited people).
  if (!memberships?.length || !profile?.display_name) redirect("/willkommen");

  const preferred = (await cookies()).get(HOME_COOKIE)?.value;
  const m = memberships.find((x) => (x.home as unknown as Home)?.id === preferred) ?? memberships[0];

  return {
    supabase,
    userId: user.id,
    profile: profile ?? { id: user.id, email: user.email ?? null, display_name: null, avatar_path: null },
    home: m.home as unknown as Home,
    role: m.role as Role,
  };
});

/** Signed URLs for private photos, keyed by storage path. */
export async function signPaths(supabase: Ctx["supabase"], paths: (string | null | undefined)[]) {
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
export async function loadRoomCards(ctx: Ctx): Promise<RoomCard[]> {
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
