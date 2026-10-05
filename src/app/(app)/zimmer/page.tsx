"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/components/app-context";
import { ItemList } from "@/components/item-list";
import { plural } from "@/lib/format";
import { basePhoto, variants } from "@/lib/selectors";
import { EmptyState, buttonClass } from "@/components/ui";
import { BasePhoto } from "./base-photo";
import { VariantGrid } from "./variant-grid";
import { RoomMenu } from "./room-menu";

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
  const base = basePhoto(doc, room.id);
  const list = variants(doc, room.id);
  const items = doc.shopping.filter((s) => s.room_id === room.id);

  return (
    <div>
      <div className="relative md:pt-10">
        <BasePhoto roomId={room.id} roomName={room.name} photo={base} />
        <Link
          href="/wohnung"
          aria-label="Zurück"
          className="absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 backdrop-blur md:top-14"
        >
          <ArrowLeft size={20} strokeWidth={1.6} />
        </Link>
      </div>

      <div className="px-4 md:px-0">
        <div className="animate-fade-up flex items-start justify-between pt-5">
          <div>
            <h1 className="font-serif text-[34px] leading-tight md:text-[42px]">{room.name}</h1>
            <p className="text-[13px] text-muted">{plural(list.length, "Variante", "Varianten")}</p>
          </div>
          <RoomMenu roomId={room.id} name={room.name} />
        </div>

        <section className="mt-7">
          <h2 className="text-[15px] font-semibold">Varianten</h2>
          <p className="mb-3 text-[13px] text-muted">Wie könnte {room.name} aussehen? Jede Variante hat ihre eigene Liste.</p>
          <VariantGrid roomId={room.id} variants={list} items={items} />
        </section>

        <section className="mt-9 mb-4">
          <h2 className="text-[15px] font-semibold">Für {room.name} allgemein</h2>
          <p className="mb-3 text-[13px] text-muted">Was ihr unabhängig von der Variante braucht.</p>
          <ItemList
            items={items.filter((i) => !i.variant_id)}
            target={{ room_id: room.id, variant_id: null }}
            placeholder="z.B. Glühbirnen, Haken …"
          />
        </section>
      </div>
    </div>
  );
}
