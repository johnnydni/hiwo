// Everything a home contains lives in one JSON file (hiwo.json) in the data
// repository; photos are separate files next to it under fotos/.

export type Role = "owner" | "member";

export type Member = {
  id: string;
  name: string;
  role: Role;
  joined_at: string;
};

export type Home = {
  id: string;
  name: string;
  city: string | null;
  cover_photo_id: string | null;
  created_at: string;
};

export type Room = {
  id: string;
  name: string;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * A room has one base photo (how it looks today) and any number of variants
 * (photos of how it could look). Each variant can carry its own shopping list.
 */
export type RoomPhoto = {
  id: string;
  room_id: string;
  kind: "base" | "variant";
  /** variants only, e.g. "Japandi" */
  name: string | null;
  note: string | null;
  /** path inside the data repo, e.g. fotos/<room>/<id>.jpg */
  path: string;
  /** git blob sha, needed to delete the file */
  sha: string;
  width: number | null;
  height: number | null;
  created_by: string | null;
  created_at: string;
};

export type ShoppingItem = {
  id: string;
  /** null = Gesamte Wohnung */
  room_id: string | null;
  /** set when the item belongs to one variant of the room */
  variant_id: string | null;
  name: string;
  price_cents: number | null;
  note: string | null;
  url: string | null;
  image_path: string | null;
  image_sha: string | null;
  /** product picture found behind `url` (hotlinked); an own photo (image_path) wins */
  image_url?: string | null;
  status: "open" | "done";
  created_by: string | null;
  done_by: string | null;
  done_at: string | null;
  created_at: string;
};

export type HiwoDoc = {
  schema: 2;
  home: Home;
  members: Member[];
  rooms: Room[];
  photos: RoomPhoto[];
  shopping: ShoppingItem[];
};
