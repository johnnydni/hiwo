"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { signPaths } from "@/lib/data";
import { useApp, useData } from "@/components/app-context";
import { formatPrice, plural } from "@/lib/format";
import type { FurnitureItem, RoomPhoto, ShoppingItem } from "@/lib/types";
import { EmptyState, PhotoPlaceholder, buttonClass } from "@/components/ui";
import { PhotoUploadButton, PhotoUploadTile } from "./photo-upload";
import { PhotoStrip } from "./photo-strip";
import { Furniture } from "./furniture";
import { RoomMenu } from "./room-menu";
import { RoomAi } from "./room-ai";

export default function RoomPage() {
  return (
    <Suspense>
      <Room />
    </Suspense>
  );
}

function Room() {
  const roomId = useSearchParams().get("id") ?? "";
  const { home } = useApp();
  const { data } = useData(
    async ({ supabase, home }) => {
      const { data: room } = await supabase
        .from("rooms")
        .select("id,name,cover_photo_id,home_id")
        .eq("id", roomId)
        .eq("home_id", home.id)
        .maybeSingle();
      if (!room) return { room: null } as const;
      const [{ data: photos }, { data: furniture }, { data: shopping }] = await Promise.all([
        supabase.from("room_photos").select("*").eq("room_id", roomId).order("created_at"),
        supabase
          .from("furniture_items")
          .select("id,room_id,name,note,keep,position")
          .eq("room_id", roomId)
          .order("position"),
        supabase
          .from("shopping_items")
          .select("id,name,price_cents,status")
          .eq("room_id", roomId)
          .eq("status", "open")
          .order("created_at"),
      ]);
      const list = (photos ?? []) as RoomPhoto[];
      const urls = await signPaths(supabase, list.map((p) => p.storage_path));
      return { room, list, urls, furniture: (furniture ?? []) as FurnitureItem[], shopping };
    },
    [roomId],
  );

  if (!data) return null;
  if (!data.room)
    return (
      <EmptyState
        title="Dieses Zimmer gibt es nicht mehr."
        action={
          <Link href="/wohnung" className={buttonClass("primary")}>
            Zur Wohnung
          </Link>
        }
      />
    );
  const { room, list, urls, furniture: items, shopping } = data;
  const cover = list.find((p) => p.id === room.cover_photo_id) ?? list[0];
  const coverUrl = cover ? urls.get(cover.storage_path) : null;

  return (
    <div>
      <div className="relative md:pt-10">
        <div className="aspect-[4/3] overflow-hidden bg-line md:aspect-[21/9] md:rounded-image">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={room.name} className="animate-fade-in h-full w-full object-cover" />
          ) : (
            <PhotoPlaceholder className="h-full w-full" />
          )}
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 md:top-10">
          <Link href="/wohnung" aria-label="Zurück" className="rounded-full bg-white/85 p-2 backdrop-blur">
            <ArrowLeft size={20} strokeWidth={1.6} />
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-0">
        <div className="animate-fade-up flex items-start justify-between pt-5">
          <div>
            <h1 className="font-serif text-[34px] leading-tight md:text-[42px]">{room.name}</h1>
            <p className="text-[13px] text-muted">
              {plural(items.length, "Element", "Elemente")} · {plural(list.length, "Foto", "Fotos")}
            </p>
          </div>
          <RoomMenu roomId={room.id} name={room.name} />
        </div>

        <section className="mt-7">
          <h2 className="mb-3 text-[15px] font-semibold">Fotos</h2>
          {list.length ? (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              <PhotoUploadTile homeId={home.id} roomId={room.id} />
              <PhotoStrip
                roomId={room.id}
                roomName={room.name}
                coverId={cover?.id ?? null}
                homeCoverId={home.cover_photo_id}
                photos={list.map((p) => ({ id: p.id, url: urls.get(p.storage_path) ?? "" }))}
              />
            </div>
          ) : (
            <div className="rounded-card bg-card px-6 py-10 text-center shadow-soft">
              <p className="font-serif text-[24px] leading-snug">Noch keine Fotos.</p>
              <p className="mx-auto mt-2 max-w-[15rem] text-[14px] leading-relaxed text-muted">
                Zeig hiwo dein Zimmer und wir helfen dir, es zu gestalten.
              </p>
              <div className="mt-6">
                <PhotoUploadButton homeId={home.id} roomId={room.id} />
              </div>
            </div>
          )}
        </section>

        <section className="mt-9">
          <h2 className="mb-3 text-[15px] font-semibold">Meine Einrichtung</h2>
          <Furniture roomId={room.id} items={items} />
        </section>

        <section className="mt-9">
          <h2 className="mb-3 text-[15px] font-semibold">KI-Ideen</h2>
          <RoomAi roomName={room.name} hasPhoto={!!cover} />
        </section>

        <section className="mt-9">
          <h2 className="mb-3 text-[15px] font-semibold">Varianten</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
            <div className="w-36 shrink-0">
              <div className="aspect-[4/3] overflow-hidden rounded-[16px] bg-line">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="Original" className="h-full w-full object-cover" />
                ) : (
                  <PhotoPlaceholder className="h-full w-full" />
                )}
              </div>
              <p className="mt-1.5 text-[13px] font-medium">Original</p>
              <p className="text-[11px] text-muted">bleibt immer erhalten</p>
            </div>
            <div className="flex w-36 shrink-0 flex-col">
              <div className="flex aspect-[4/3] items-center justify-center rounded-[16px] border border-dashed border-ink/15 px-3 text-center text-[12px] leading-snug text-muted">
                Neue Varianten entstehen mit KI
              </div>
            </div>
          </div>
        </section>

        <section className="mt-9 mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Einkauf für {room.name}</h2>
            <Link href={`/einkauf?zimmer=${room.id}`} className="text-[13px] text-muted hover:text-ink">
              Alle
            </Link>
          </div>
          {shopping?.length ? (
            <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
              {(shopping as Pick<ShoppingItem, "id" | "name" | "price_cents">[]).map((s) => (
                <li key={s.id}>
                  <Link href={`/artikel?id=${s.id}`} className="flex items-center gap-3 py-3.5 text-[14px]">
                    <span className="h-4 w-4 rounded-full border border-ink/30" />
                    <span className="flex-1">{s.name}</span>
                    {s.price_cents != null && <span className="text-muted">{formatPrice(s.price_cents)}</span>}
                    <ChevronRight size={16} strokeWidth={1.6} className="text-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link
              href={`/einkauf?zimmer=${room.id}&neu=1`}
              className="block rounded-card border border-dashed border-ink/15 px-4 py-4 text-center text-[14px] text-muted hover:text-ink"
            >
              Etwas für {room.name} auf die Liste setzen
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
