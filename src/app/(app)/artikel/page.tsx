"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { useApp, useMemberName } from "@/components/app-context";
import { formatPrice, relativeDay } from "@/lib/format";
import { useTargetLabel } from "@/components/target-select";
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
  const targetLabel = useTargetLabel();
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
  const forLabel = targetLabel(item);
  const forHref = item.variant_id ? `/variante?id=${item.variant_id}` : item.room_id ? `/zimmer?id=${item.room_id}` : null;
  const creator = item.created_by ? nameOf(item.created_by) : null;
  const doneBy = item.done_by ? nameOf(item.done_by) : null;

  return (
    <div>
      <PageHeader back={forHref ?? "/einkauf"} title="" />
      <div className="-mt-6 px-4 md:grid md:grid-cols-2 md:items-start md:gap-10 md:px-0">
        <ItemImage itemId={item.id} path={item.image_path} />
        <div>
          <div className="animate-fade-up mt-5 md:mt-0">
            <h1 className="font-serif text-[34px] leading-tight break-words">{item.name}</h1>
            {forHref ? (
              <Link href={forHref} className="text-[13px] text-muted underline-offset-2 hover:underline">
                {forLabel}
              </Link>
            ) : (
              <p className="text-[13px] text-muted">{forLabel}</p>
            )}
            {item.price_cents != null && <p className="mt-3 text-[20px] font-semibold">{formatPrice(item.price_cents)}</p>}
          </div>

          <ItemActions item={item} />

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
    </div>
  );
}
