"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { useApp, useMemberName } from "@/components/app-context";
import { formatPrice, relativeDay } from "@/lib/format";
import { Avatar, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { ItemActions, ItemImage } from "./item-actions";

export default function ItemPage() {
  return (
    <Suspense>
      <Item />
    </Suspense>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Item() {
  const itemId = useSearchParams().get("id") ?? "";
  const { doc } = useApp();
  const nameOf = useMemberName();
  const item = doc.shopping.find((s) => s.id === itemId);

  if (!item)
    return (
      <EmptyState
        title="Diesen Artikel gibt es nicht mehr."
        action={
          <Link href="/einkauf" className={buttonClass("primary")}>
            Zur Einkaufsliste
          </Link>
        }
      />
    );
  const rooms = [...doc.rooms].sort((a, b) => a.position - b.position).map((r) => ({ id: r.id, name: r.name }));
  const roomName = rooms.find((r) => r.id === item.room_id)?.name ?? "Gesamte Wohnung";
  const creator = item.created_by ? nameOf(item.created_by) : null;
  const doneBy = item.done_by ? nameOf(item.done_by) : null;

  return (
    <div>
      <PageHeader back="/einkauf" title="" />
      <div className="-mt-6 px-4 md:px-0">
        <ItemImage itemId={item.id} path={item.image_path} />
        <div className="animate-fade-up mt-5">
          <h1 className="font-serif text-[34px] leading-tight">{item.name}</h1>
          <p className="text-[13px] text-muted">{roomName}</p>
          {item.price_cents != null && <p className="mt-3 text-[20px] font-semibold">{formatPrice(item.price_cents)}</p>}
        </div>

        <ItemActions item={item} rooms={rooms} />

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex items-center gap-2 text-[14px] text-muted hover:text-ink"
          >
            <ExternalLink size={16} strokeWidth={1.6} />
            {hostname(item.url)}
          </a>
        )}

        {item.note && (
          <section className="mt-7">
            <h2 className="mb-2 text-[15px] font-semibold">Notizen</h2>
            <p className="rounded-card bg-card p-4 text-[14px] leading-relaxed shadow-soft">„{item.note}“</p>
          </section>
        )}

        <div className="mt-7 space-y-3 text-[13px] text-muted">
          {creator && (
            <p className="flex items-center gap-2">
              <Avatar name={creator} size={26} />
              Hinzugefügt von {creator} · {relativeDay(item.created_at)}
            </p>
          )}
          {item.status === "done" && doneBy && item.done_at && (
            <p className="flex items-center gap-2">
              <Avatar name={doneBy} size={26} />
              Erledigt von {doneBy} · {relativeDay(item.done_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
