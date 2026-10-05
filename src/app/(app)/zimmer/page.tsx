"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/components/app-context";
import { formatPrice, plural } from "@/lib/format";
import { roomCover, roomPhotos } from "@/lib/selectors";
import { EmptyState, buttonClass } from "@/components/ui";
import { Photo } from "@/components/photo";
import { PhotoUploadButton, PhotoUploadTile } from "./photo-upload";
import { PhotoStrip } from "./photo-strip";
import { Furniture } from "./furniture";
import { RoomMenu } from "./room-menu";
import { RoomAi } from "./room-ai";

export default function RoomPage() {
  return (
    <Suspense>
      <RoomView />
    </Suspense>
  );
}

function RoomView() {
  const roomId = useSearchParams().get("id") ?? "";
  const { doc } = useApp();
  const room = doc.rooms.find((r) => r.id === roomId);
  if (!room)
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
  const list = roomPhotos(doc, room.id);
  const cover = roomCover(doc, room);
  const items = doc.furniture.filter((f) => f.room_id === room.id).sort((a, b) => a.position - b.position);
  const shopping = doc.shopping.filter((s) => s.room_id === room.id && s.status === "open");

  return (
    <div>
      <div className="relative md:pt-10">
        <Photo path={cover?.path} alt={room.name} className="aspect-[4/3] md:aspect-[21/9] md:rounded-image" />
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
              <PhotoUploadTile roomId={room.id} />
              <PhotoStrip
                roomId={room.id}
                roomName={room.name}
                coverId={cover?.id ?? null}
                homeCoverId={doc.home.cover_photo_id}
                photos={list.map((p) => ({ id: p.id, path: p.path }))}
              />
            </div>
          ) : (
            <div className="rounded-card bg-card px-6 py-10 text-center shadow-soft">
              <p className="font-serif text-[24px] leading-snug">Noch keine Fotos.</p>
              <p className="mx-auto mt-2 max-w-[15rem] text-[14px] leading-relaxed text-muted">
                Zeig hiwo dein Zimmer und wir helfen dir, es zu gestalten.
              </p>
              <div className="mt-6">
                <PhotoUploadButton roomId={room.id} />
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
              <Photo path={cover?.path} alt="Original" className="aspect-[4/3] rounded-[16px]" />
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
          {shopping.length ? (
            <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
              {shopping.map((s) => (
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
