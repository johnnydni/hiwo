export type Role = "owner" | "member";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_path: string | null;
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
  home_id: string;
  name: string;
  cover_photo_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type RoomPhoto = {
  id: string;
  home_id: string;
  room_id: string;
  storage_path: string;
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
  keep: boolean;
  position: number;
};

export type ShoppingItem = {
  id: string;
  home_id: string;
  room_id: string | null;
  name: string;
  price_cents: number | null;
  note: string | null;
  url: string | null;
  image_path: string | null;
  status: "open" | "done";
  created_by: string | null;
  done_by: string | null;
  done_at: string | null;
  created_at: string;
};

export type Member = {
  user_id: string;
  role: Role;
  created_at: string;
  profile: Profile | null;
};

export type Invite = {
  id: string;
  token: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};
