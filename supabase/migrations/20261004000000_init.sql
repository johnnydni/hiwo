-- hiwo – initial schema
-- Home = workspace ("Projekt"), Rooms = Bereiche. Every row carries home_id so
-- row level security is one membership check everywhere.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', null))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Homes & members
-- ---------------------------------------------------------------------------
create table public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Meine Wohnung',
  city text,
  cover_photo_id uuid, -- fk added below (room_photos)
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'member');

create table public.home_members (
  home_id uuid not null references public.homes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (home_id, user_id)
);
create index on public.home_members (user_id);

create table public.home_invites (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  email text,          -- auto-accept when this address signs in
  phone text,          -- stored only; the link is shared manually (no SMS in phase 1)
  name text,
  role public.member_role not null default 'member',
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);
create index on public.home_invites (home_id);
create index on public.home_invites (lower(email));

-- Membership helpers. security definer avoids RLS recursion on home_members.
create function public.is_home_member(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from home_members where home_id = h and user_id = auth.uid());
$$;

create function public.is_home_owner(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from home_members where home_id = h and user_id = auth.uid() and role = 'owner');
$$;

-- ---------------------------------------------------------------------------
-- Rooms, photos, furniture
-- ---------------------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  name text not null,
  cover_photo_id uuid,
  current_version_id uuid, -- phase 2: "aktueller Entwurf"
  position int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.rooms (home_id);

create table public.room_photos (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  storage_path text not null unique,
  width int,
  height int,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.room_photos (room_id);

alter table public.rooms
  add constraint rooms_cover_photo_fk foreign key (cover_photo_id)
  references public.room_photos (id) on delete set null;
alter table public.homes
  add constraint homes_cover_photo_fk foreign key (cover_photo_id)
  references public.room_photos (id) on delete set null;

create table public.furniture_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null,
  note text,
  keep boolean not null default true, -- phase 2: KI soll dieses Möbel behalten
  position int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.furniture_items (room_id);

-- ---------------------------------------------------------------------------
-- Versions & AI generations (phase 2 – schema ready, no UI yet)
-- The original photo is never overwritten: a version always points at a new
-- image, and generations only become versions when the user saves them.
-- ---------------------------------------------------------------------------
create table public.room_versions (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null,
  description text,
  image_path text,
  source_photo_id uuid references public.room_photos (id) on delete set null,
  parent_version_id uuid references public.room_versions (id) on delete set null,
  generation_id uuid,
  is_original boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.room_versions (room_id);

alter table public.rooms
  add constraint rooms_current_version_fk foreign key (current_version_id)
  references public.room_versions (id) on delete set null;

create type public.generation_status as enum ('queued', 'running', 'succeeded', 'failed', 'discarded');

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  source_photo_id uuid references public.room_photos (id) on delete set null,
  parent_version_id uuid references public.room_versions (id) on delete set null,
  prompt text not null,
  kept_furniture_ids uuid[] not null default '{}',
  status public.generation_status not null default 'queued',
  generated_image_path text,
  model text,
  error text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.ai_generations (room_id);

alter table public.room_versions
  add constraint room_versions_generation_fk foreign key (generation_id)
  references public.ai_generations (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Shopping
-- One list per home; room_id null = "Gesamte Wohnung". A separate lists table
-- can be introduced later without changing items' meaning.
-- ---------------------------------------------------------------------------
create type public.shopping_status as enum ('open', 'done');

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  name text not null,
  price_cents int check (price_cents is null or price_cents >= 0),
  note text,
  url text,
  image_path text,
  status public.shopping_status not null default 'open',
  created_by uuid references public.profiles (id) on delete set null,
  done_by uuid references public.profiles (id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.shopping_items (home_id, status);

-- ---------------------------------------------------------------------------
-- Integrity: child rows must belong to the same home as their room.
-- ---------------------------------------------------------------------------
create function public.check_room_home() returns trigger
language plpgsql as $$
begin
  if new.room_id is not null and not exists (
    select 1 from public.rooms r where r.id = new.room_id and r.home_id = new.home_id
  ) then
    raise exception 'room does not belong to home';
  end if;
  return new;
end $$;

create trigger room_photos_home before insert or update on public.room_photos
  for each row execute function public.check_room_home();
create trigger furniture_home before insert or update on public.furniture_items
  for each row execute function public.check_room_home();
create trigger shopping_home before insert or update on public.shopping_items
  for each row execute function public.check_room_home();
create trigger versions_home before insert or update on public.room_versions
  for each row execute function public.check_room_home();
create trigger generations_home before insert or update on public.ai_generations
  for each row execute function public.check_room_home();

create function public.touch_room() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update rooms set updated_at = now() where id = coalesce(new.room_id, old.room_id);
  return coalesce(new, old);
end $$;

create trigger room_photos_touch after insert or delete on public.room_photos
  for each row execute function public.touch_room();
create trigger furniture_touch after insert or update or delete on public.furniture_items
  for each row execute function public.touch_room();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create function public.create_home(p_name text, p_city text) returns uuid
language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into homes (name, city, created_by)
    values (coalesce(nullif(trim(p_name), ''), 'Meine Wohnung'), nullif(trim(p_city), ''), auth.uid())
    returning id into h;
  insert into home_members (home_id, user_id, role) values (h, auth.uid(), 'owner');
  return h;
end $$;

create function public.accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv home_invites;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into inv from home_invites where token = p_token;
  if not found then raise exception 'invite not found'; end if;
  if inv.expires_at < now() then raise exception 'invite expired'; end if;
  if inv.accepted_at is not null and inv.accepted_by is distinct from auth.uid() then
    raise exception 'invite already used';
  end if;
  insert into home_members (home_id, user_id, role)
    values (inv.home_id, auth.uid(), inv.role)
    on conflict do nothing;
  update home_invites set accepted_at = now(), accepted_by = auth.uid()
    where id = inv.id and accepted_at is null;
  return inv.home_id;
end $$;

-- Joins every open invite addressed to the signed-in user's email.
create function public.accept_pending_invites() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; inv home_invites; my_email text;
begin
  select lower(email) into my_email from auth.users where id = auth.uid();
  if my_email is null then return 0; end if;
  for inv in
    select * from home_invites
    where lower(email) = my_email and accepted_at is null and expires_at > now()
  loop
    insert into home_members (home_id, user_id, role) values (inv.home_id, auth.uid(), inv.role)
      on conflict do nothing;
    update home_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Public preview of an invite (home name + inviter) for the landing page.
create function public.invite_preview(p_token text)
returns table (home_name text, city text, inviter text, expired boolean, used boolean)
language sql stable security definer set search_path = public as $$
  select h.name, h.city, coalesce(p.display_name, split_part(p.email, '@', 1)),
         i.expires_at < now(), i.accepted_at is not null
  from home_invites i
  join homes h on h.id = i.home_id
  left join profiles p on p.id = i.invited_by
  where i.token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.home_invites enable row level security;
alter table public.rooms enable row level security;
alter table public.room_photos enable row level security;
alter table public.furniture_items enable row level security;
alter table public.room_versions enable row level security;
alter table public.ai_generations enable row level security;
alter table public.shopping_items enable row level security;

-- Profiles: yourself, plus anyone you share a home with.
create policy "profiles read" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.home_members a
    join public.home_members b on a.home_id = b.home_id
    where a.user_id = auth.uid() and b.user_id = profiles.id
  )
);
create policy "profiles update self" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "homes read" on public.homes for select using (public.is_home_member(id));
create policy "homes update" on public.homes for update
  using (public.is_home_member(id)) with check (public.is_home_member(id));
create policy "homes delete" on public.homes for delete using (public.is_home_owner(id));

create policy "members read" on public.home_members for select using (public.is_home_member(home_id));
-- Owners remove others; anyone may leave (but not the owner role row).
create policy "members delete" on public.home_members for delete using (
  (public.is_home_owner(home_id) and user_id <> auth.uid())
  or (user_id = auth.uid() and role <> 'owner')
);

create policy "invites read" on public.home_invites for select using (public.is_home_member(home_id));
create policy "invites insert" on public.home_invites for insert
  with check (public.is_home_member(home_id) and invited_by = auth.uid() and role = 'member');
create policy "invites delete" on public.home_invites for delete using (public.is_home_member(home_id));

-- Content tables: full access for members of the home.
do $$
declare t text;
begin
  foreach t in array array['rooms','room_photos','furniture_items','room_versions','ai_generations','shopping_items']
  loop
    execute format('create policy "%1$s select" on public.%1$I for select using (public.is_home_member(home_id))', t);
    execute format('create policy "%1$s insert" on public.%1$I for insert with check (public.is_home_member(home_id))', t);
    execute format('create policy "%1$s update" on public.%1$I for update using (public.is_home_member(home_id)) with check (public.is_home_member(home_id))', t);
    execute format('create policy "%1$s delete" on public.%1$I for delete using (public.is_home_member(home_id))', t);
  end loop;
end $$;

-- created_by is always the caller.
create function public.set_created_by() returns trigger
language plpgsql as $$
begin
  new.created_by := auth.uid();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['rooms','room_photos','furniture_items','room_versions','ai_generations','shopping_items']
  loop
    execute format('create trigger %1$s_created_by before insert on public.%1$I for each row execute function public.set_created_by()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, first path segment = home_id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "photos read" on storage.objects for select
  using (bucket_id = 'photos' and public.is_home_member(((storage.foldername(name))[1])::uuid));
create policy "photos insert" on storage.objects for insert
  with check (bucket_id = 'photos' and public.is_home_member(((storage.foldername(name))[1])::uuid));
create policy "photos delete" on storage.objects for delete
  using (bucket_id = 'photos' and public.is_home_member(((storage.foldername(name))[1])::uuid));

-- Realtime for collaborative shopping lists.
alter publication supabase_realtime add table public.shopping_items;
