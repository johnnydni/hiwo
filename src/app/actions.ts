"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContext, HOME_COOKIE } from "@/lib/data";
import { parsePrice } from "@/lib/format";

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function fail(message: string): never {
  throw new Error(message);
}

// ---------------------------------------------------------------------------
// Onboarding & profile
// ---------------------------------------------------------------------------

export async function completeOnboarding(fd: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = str(fd, "display_name");
  if (name) await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);

  if (fd.has("home_name")) {
    const { data: homeId, error } = await supabase.rpc("create_home", {
      p_name: str(fd, "home_name"),
      p_city: str(fd, "city"),
    });
    if (error) fail(error.message);
    (await cookies()).set(HOME_COOKIE, homeId as string, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  redirect("/");
}

export async function updateProfile(fd: FormData) {
  const { supabase, userId } = await getContext();
  await supabase.from("profiles").update({ display_name: str(fd, "display_name") || null }).eq("id", userId);
  revalidatePath("/", "layout");
}

export async function updateHome(fd: FormData) {
  const { supabase, home } = await getContext();
  await supabase
    .from("homes")
    .update({ name: str(fd, "name") || "Meine Wohnung", city: str(fd, "city") || null })
    .eq("id", home.id);
  revalidatePath("/", "layout");
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const { data: homeId, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) fail("Diese Einladung ist nicht mehr gültig.");
  (await cookies()).set(HOME_COOKIE, homeId as string, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user!.id).single();
  redirect(profile?.display_name ? "/" : "/willkommen");
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function createRoom(fd: FormData) {
  const { supabase, home } = await getContext();
  const name = str(fd, "name");
  if (!name) return;
  const { count } = await supabase.from("rooms").select("id", { count: "exact", head: true }).eq("home_id", home.id);
  const { data, error } = await supabase
    .from("rooms")
    .insert({ home_id: home.id, name, position: count ?? 0 })
    .select("id")
    .single();
  if (error) fail(error.message);
  redirect(`/wohnung/${data.id}`);
}

export async function renameRoom(roomId: string, name: string) {
  const { supabase } = await getContext();
  if (!name.trim()) return;
  await supabase.from("rooms").update({ name: name.trim() }).eq("id", roomId);
  revalidatePath("/", "layout");
}

export async function deleteRoom(roomId: string) {
  const { supabase, home } = await getContext();
  const { data: photos } = await supabase.from("room_photos").select("storage_path").eq("room_id", roomId);
  if (photos?.length) await supabase.storage.from("photos").remove(photos.map((p) => p.storage_path));
  await supabase.from("rooms").delete().eq("id", roomId).eq("home_id", home.id);
  revalidatePath("/", "layout");
  redirect("/wohnung");
}

// ---------------------------------------------------------------------------
// Photos (upload happens in the browser straight to storage)
// ---------------------------------------------------------------------------

export async function setRoomCover(roomId: string, photoId: string) {
  const { supabase } = await getContext();
  await supabase.from("rooms").update({ cover_photo_id: photoId }).eq("id", roomId);
  revalidatePath("/", "layout");
}

export async function setHomeCover(photoId: string) {
  const { supabase, home } = await getContext();
  await supabase.from("homes").update({ cover_photo_id: photoId }).eq("id", home.id);
  revalidatePath("/", "layout");
}

export async function deletePhoto(photoId: string) {
  const { supabase } = await getContext();
  const { data: photo } = await supabase.from("room_photos").select("storage_path").eq("id", photoId).single();
  if (!photo) return;
  await supabase.from("room_photos").delete().eq("id", photoId);
  await supabase.storage.from("photos").remove([photo.storage_path]);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

export async function addFurniture(roomId: string, fd: FormData) {
  const { supabase, home } = await getContext();
  const name = str(fd, "name");
  if (!name) return;
  const { count } = await supabase
    .from("furniture_items")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  await supabase.from("furniture_items").insert({ home_id: home.id, room_id: roomId, name, position: count ?? 0 });
  revalidatePath(`/wohnung/${roomId}`);
}

export async function deleteFurniture(id: string, roomId: string) {
  const { supabase } = await getContext();
  await supabase.from("furniture_items").delete().eq("id", id);
  revalidatePath(`/wohnung/${roomId}`);
}

// ---------------------------------------------------------------------------
// Shopping
// ---------------------------------------------------------------------------

export async function addShoppingItem(fd: FormData) {
  const { supabase, home } = await getContext();
  const name = str(fd, "name");
  if (!name) return;
  const roomId = str(fd, "room_id") || null;
  await supabase.from("shopping_items").insert({
    home_id: home.id,
    room_id: roomId,
    name,
    price_cents: parsePrice(str(fd, "price")),
    note: str(fd, "note") || null,
    url: str(fd, "url") || null,
  });
  revalidatePath("/", "layout");
}

export async function updateShoppingItem(id: string, fd: FormData) {
  const { supabase } = await getContext();
  await supabase
    .from("shopping_items")
    .update({
      name: str(fd, "name") || undefined,
      room_id: str(fd, "room_id") || null,
      price_cents: parsePrice(str(fd, "price")),
      note: str(fd, "note") || null,
      url: str(fd, "url") || null,
    })
    .eq("id", id);
  revalidatePath("/", "layout");
}

export async function setShoppingDone(id: string, done: boolean) {
  const { supabase, userId } = await getContext();
  await supabase
    .from("shopping_items")
    .update(
      done
        ? { status: "done", done_by: userId, done_at: new Date().toISOString() }
        : { status: "open", done_by: null, done_at: null },
    )
    .eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteShoppingItem(id: string) {
  const { supabase } = await getContext();
  const { data } = await supabase.from("shopping_items").select("image_path").eq("id", id).single();
  await supabase.from("shopping_items").delete().eq("id", id);
  if (data?.image_path) await supabase.storage.from("photos").remove([data.image_path]);
  revalidatePath("/", "layout");
  redirect("/einkauf");
}

// ---------------------------------------------------------------------------
// Members & invites
// ---------------------------------------------------------------------------

export async function createInvite(fd: FormData): Promise<{ token: string; name: string }> {
  const { supabase, home, userId } = await getContext();
  const contact = str(fd, "contact");
  const isEmail = contact.includes("@");
  const name = str(fd, "name");
  const { data, error } = await supabase
    .from("home_invites")
    .insert({
      home_id: home.id,
      email: isEmail ? contact.toLowerCase() : null,
      phone: !isEmail && contact ? contact : null,
      name: name || null,
      invited_by: userId,
    })
    .select("token")
    .single();
  if (error) fail(error.message);
  revalidatePath("/profil/mitbewohner");
  return { token: data.token, name: name || (isEmail ? contact.split("@")[0] : contact) || "Die Person" };
}

export async function deleteInvite(id: string) {
  const { supabase } = await getContext();
  await supabase.from("home_invites").delete().eq("id", id);
  revalidatePath("/profil/mitbewohner");
}

export async function removeMember(userId: string) {
  const { supabase, home } = await getContext();
  await supabase.from("home_members").delete().eq("home_id", home.id).eq("user_id", userId);
  revalidatePath("/profil/mitbewohner");
}
