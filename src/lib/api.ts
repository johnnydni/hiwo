// All writes go straight from the browser to Supabase; RLS decides what is allowed.
import { createClient } from "./supabase";
import { parsePrice } from "./format";
import type { Ctx } from "./data";

type C = Pick<Ctx, "home" | "userId">;

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function check<T extends { error: { message: string } | null }>(res: T): T {
  if (res.error) throw new Error(res.error.message);
  return res;
}

const db = () => createClient();

// ---------------------------------------------------------------------------
// Onboarding & profile
// ---------------------------------------------------------------------------

export async function completeOnboarding(userId: string, fd: FormData): Promise<string | null> {
  const name = str(fd, "display_name");
  if (name) check(await db().from("profiles").update({ display_name: name }).eq("id", userId));
  if (!fd.has("home_name")) return null;
  const { data } = check(
    await db().rpc("create_home", { p_name: str(fd, "home_name"), p_city: str(fd, "city") }),
  );
  return data as string;
}

export async function updateProfile(c: C, fd: FormData) {
  check(await db().from("profiles").update({ display_name: str(fd, "display_name") || null }).eq("id", c.userId));
}

export async function updateHome(c: C, fd: FormData) {
  check(
    await db()
      .from("homes")
      .update({ name: str(fd, "name") || "Meine Wohnung", city: str(fd, "city") || null })
      .eq("id", c.home.id),
  );
}

export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await db().rpc("accept_invite", { p_token: token });
  if (error) throw new Error("Diese Einladung ist nicht mehr gültig.");
  return data as string;
}

export async function signOut() {
  await db().auth.signOut();
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function createRoom(c: C, name: string): Promise<string> {
  const { count } = await db().from("rooms").select("id", { count: "exact", head: true }).eq("home_id", c.home.id);
  const { data } = check(
    await db()
      .from("rooms")
      .insert({ home_id: c.home.id, name: name.trim(), position: count ?? 0 })
      .select("id")
      .single(),
  );
  return data!.id as string;
}

export async function renameRoom(roomId: string, name: string) {
  if (!name.trim()) return;
  check(await db().from("rooms").update({ name: name.trim() }).eq("id", roomId));
}

export async function deleteRoom(c: C, roomId: string) {
  const { data: photos } = await db().from("room_photos").select("storage_path").eq("room_id", roomId);
  if (photos?.length) await db().storage.from("photos").remove(photos.map((p) => p.storage_path));
  check(await db().from("rooms").delete().eq("id", roomId).eq("home_id", c.home.id));
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export async function setRoomCover(roomId: string, photoId: string) {
  check(await db().from("rooms").update({ cover_photo_id: photoId }).eq("id", roomId));
}

export async function setHomeCover(c: C, photoId: string) {
  check(await db().from("homes").update({ cover_photo_id: photoId }).eq("id", c.home.id));
}

export async function deletePhoto(photoId: string) {
  const { data: photo } = await db().from("room_photos").select("storage_path").eq("id", photoId).single();
  if (!photo) return;
  check(await db().from("room_photos").delete().eq("id", photoId));
  await db().storage.from("photos").remove([photo.storage_path]);
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

export async function addFurniture(c: C, roomId: string, name: string) {
  if (!name.trim()) return;
  const { count } = await db()
    .from("furniture_items")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  check(
    await db()
      .from("furniture_items")
      .insert({ home_id: c.home.id, room_id: roomId, name: name.trim(), position: count ?? 0 }),
  );
}

export async function deleteFurniture(id: string) {
  check(await db().from("furniture_items").delete().eq("id", id));
}

// ---------------------------------------------------------------------------
// Shopping
// ---------------------------------------------------------------------------

export async function addShoppingItem(c: C, fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  check(
    await db()
      .from("shopping_items")
      .insert({
        home_id: c.home.id,
        room_id: str(fd, "room_id") || null,
        name,
        price_cents: parsePrice(str(fd, "price")),
        note: str(fd, "note") || null,
        url: str(fd, "url") || null,
      }),
  );
}

export async function updateShoppingItem(id: string, fd: FormData) {
  check(
    await db()
      .from("shopping_items")
      .update({
        name: str(fd, "name") || undefined,
        room_id: str(fd, "room_id") || null,
        price_cents: parsePrice(str(fd, "price")),
        note: str(fd, "note") || null,
        url: str(fd, "url") || null,
      })
      .eq("id", id),
  );
}

export async function setShoppingDone(c: C, id: string, done: boolean) {
  check(
    await db()
      .from("shopping_items")
      .update(
        done
          ? { status: "done", done_by: c.userId, done_at: new Date().toISOString() }
          : { status: "open", done_by: null, done_at: null },
      )
      .eq("id", id),
  );
}

export async function deleteShoppingItem(id: string) {
  const { data } = await db().from("shopping_items").select("image_path").eq("id", id).single();
  check(await db().from("shopping_items").delete().eq("id", id));
  if (data?.image_path) await db().storage.from("photos").remove([data.image_path]);
}

// ---------------------------------------------------------------------------
// Members & invites
// ---------------------------------------------------------------------------

export async function createInvite(c: C, fd: FormData): Promise<{ token: string; name: string }> {
  const contact = str(fd, "contact");
  const isEmail = contact.includes("@");
  const name = str(fd, "name");
  const { data } = check(
    await db()
      .from("home_invites")
      .insert({
        home_id: c.home.id,
        email: isEmail ? contact.toLowerCase() : null,
        phone: !isEmail && contact ? contact : null,
        name: name || null,
        invited_by: c.userId,
      })
      .select("token")
      .single(),
  );
  return { token: data!.token as string, name: name || (isEmail ? contact.split("@")[0] : contact) || "Die Person" };
}

export async function deleteInvite(id: string) {
  check(await db().from("home_invites").delete().eq("id", id));
}

export async function removeMember(c: C, userId: string) {
  check(await db().from("home_members").delete().eq("home_id", c.home.id).eq("user_id", userId));
}
