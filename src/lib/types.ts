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
  cover_photo_id: string | null;
  /** phase 2: "aktueller Entwurf" */
  current_version_id: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomPhoto = {
  id: string;
  room_id: string;
  /** path inside the data repo, e.g. fotos/<room>/<id>.jpg */
  path: string;
  /** git blob sha, needed to delete the file */
  sha: string;
  width: number | null;
  height: number | null;
  created_by: string | null;
  created_at: string;
};

export type FurnitureItem = {
  id: string;
  room_id: string;
  name: string;
  note: string | null;
  /** phase 2: KI soll dieses Möbel behalten */
  keep: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
};

export type ShoppingItem = {
  id: string;
  /** null = Gesamte Wohnung */
  room_id: string | null;
  name: string;
  price_cents: number | null;
  note: string | null;
  url: string | null;
  image_path: string | null;
  image_sha: string | null;
  status: "open" | "done";
  created_by: string | null;
  done_by: string | null;
  done_at: string | null;
  created_at: string;
};

/** Phase 2: a saved variant of a room. The original photo is never overwritten. */
export type RoomVersion = {
  id: string;
  room_id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  source_photo_id: string | null;
  parent_version_id: string | null;
  generation_id: string | null;
  created_by: string | null;
  created_at: string;
};

/** Phase 2: one AI run; becomes a RoomVersion only when the user saves it. */
export type AiGeneration = {
  id: string;
  room_id: string;
  source_photo_id: string | null;
  parent_version_id: string | null;
  prompt: string;
  kept_furniture_ids: string[];
  status: "queued" | "running" | "succeeded" | "failed" | "discarded";
  generated_image_path: string | null;
  model: string | null;
  error: string | null;
  created_by: string | null;
  created_at: string;
};

export type HiwoDoc = {
  schema: 1;
  home: Home;
  members: Member[];
  rooms: Room[];
  photos: RoomPhoto[];
  furniture: FurnitureItem[];
  shopping: ShoppingItem[];
  versions: RoomVersion[];
  generations: AiGeneration[];
};
