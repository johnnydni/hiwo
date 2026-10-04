import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getContext, signPaths } from "@/lib/data";
import { displayName, formatPrice, relativeDay } from "@/lib/format";
import type { Profile, ShoppingItem } from "@/lib/types";
import { Avatar, PageHeader } from "@/components/ui";
import { ItemActions, ItemImage } from "./item-actions";

export default async function ItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const { supabase, home } = await getContext();
  const { data } = await supabase.from("shopping_items").select("*").eq("id", itemId).eq("home_id", home.id).maybeSingle();
  if (!data) notFound();
  const item = data as ShoppingItem;

  const [{ data: rooms }, { data: people }, urls] = await Promise.all([
    supabase.from("rooms").select("id,name").eq("home_id", home.id).order("position"),
    supabase
      .from("profiles")
      .select("id,email,display_name,avatar_path")
      .in("id", [item.created_by, item.done_by].filter(Boolean) as string[]),
    signPaths(supabase, [item.image_path]),
  ]);
  const byId = new Map((people as Profile[] | null)?.map((p) => [p.id, p]));
  const roomName = rooms?.find((r) => r.id === item.room_id)?.name ?? "Gesamte Wohnung";
  const creator = item.created_by ? byId.get(item.created_by) : null;
  const doneBy = item.done_by ? byId.get(item.done_by) : null;

  return (
    <div>
      <PageHeader back="/einkauf" title="" />
      <div className="-mt-6 px-4 md:px-0">
        <ItemImage
          homeId={home.id}
          itemId={item.id}
          url={item.image_path ? (urls.get(item.image_path) ?? null) : null}
        />
        <div className="animate-fade-up mt-5">
          <h1 className="font-serif text-[34px] leading-tight">{item.name}</h1>
          <p className="text-[13px] text-muted">{roomName}</p>
          {item.price_cents != null && <p className="mt-3 text-[20px] font-semibold">{formatPrice(item.price_cents)}</p>}
        </div>

        <ItemActions item={item} rooms={rooms ?? []} />

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex items-center gap-2 text-[14px] text-muted hover:text-ink"
          >
            <ExternalLink size={16} strokeWidth={1.6} />
            {new URL(item.url).hostname.replace(/^www\./, "")}
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
              <Avatar name={displayName(creator)} size={26} />
              Hinzugefügt von {displayName(creator)} · {relativeDay(item.created_at)}
            </p>
          )}
          {item.status === "done" && doneBy && item.done_at && (
            <p className="flex items-center gap-2">
              <Avatar name={displayName(doneBy)} size={26} />
              Erledigt von {displayName(doneBy)} · {relativeDay(item.done_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
