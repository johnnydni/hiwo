"use client";

import Link from "next/link";
import { ChevronRight, ShoppingBag, Camera, Clock } from "lucide-react";
import { loadRoomCards, signPaths } from "@/lib/data";
import { useApp, useData } from "@/components/app-context";
import { firstName, greeting, plural } from "@/lib/format";
import { RoomCard } from "@/components/room-card";
import { PhotoPlaceholder, buttonClass } from "@/components/ui";

export default function HomePage() {
  const { home, profile } = useApp();
  const { data } = useData(async (ctx) => {
    const { supabase } = ctx;
    const [rooms, { count: openCount }, { data: homeCover }] = await Promise.all([
      loadRoomCards(ctx),
      supabase
        .from("shopping_items")
        .select("id", { count: "exact", head: true })
        .eq("home_id", ctx.home.id)
        .eq("status", "open"),
      ctx.home.cover_photo_id
        ? supabase.from("room_photos").select("storage_path").eq("id", ctx.home.cover_photo_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    let coverUrl: string | null = null;
    if (homeCover?.storage_path)
      coverUrl = (await signPaths(supabase, [homeCover.storage_path])).get(homeCover.storage_path) ?? null;
    coverUrl ??= rooms.find((r) => r.coverUrl)?.coverUrl ?? null;
    return { rooms, openCount: openCount ?? 0, coverUrl };
  });
  if (!data) return null;
  const { rooms, openCount, coverUrl } = data;

  const recent = [...rooms].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6);
  const photoCount = rooms.reduce((n, r) => n + r.photoCount, 0);

  return (
    <div className="px-4 md:px-0">
      <header className="animate-fade-up pt-6 md:pt-10">
        <p className="font-serif text-[30px] leading-none md:hidden">hiwo</p>
        <h1 className="mt-6 font-serif text-[30px] leading-tight md:mt-0 md:text-[40px]">
          {greeting()}, {firstName(profile)}.
        </h1>
        <p className="mt-1 text-[14px] text-muted">Schön, dass du da bist.</p>
      </header>

      <Link href="/wohnung" className="group mt-6 block animate-fade-up">
        <div className="relative aspect-[4/3] overflow-hidden rounded-image bg-line md:aspect-[21/9]">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={home.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.01]" />
          ) : (
            <PhotoPlaceholder className="h-full w-full" />
          )}
          <div className="absolute inset-x-3 top-3 flex items-center justify-between rounded-[14px] bg-white/90 px-4 py-3 backdrop-blur">
            <div>
              <p className="text-[14px] font-medium">{home.name}</p>
              <p className="text-[12px] text-muted">
                {[home.city, plural(rooms.length, "Zimmer", "Zimmer")].filter(Boolean).join(" · ")}
              </p>
            </div>
            <ChevronRight size={18} strokeWidth={1.6} className="text-muted" />
          </div>
        </div>
      </Link>

      <section className="mt-8">
        <h2 className="mb-2 text-[15px] font-semibold">Heute</h2>
        <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
          <TodayRow href="/einkauf" icon={<ShoppingBag size={18} strokeWidth={1.6} />}>
            {openCount
              ? `${plural(openCount, "Ding", "Dinge")} auf deiner Einkaufsliste`
              : "Deine Einkaufsliste ist leer"}
          </TodayRow>
          <TodayRow href="/wohnung" icon={<Camera size={18} strokeWidth={1.6} />}>
            {photoCount ? `${plural(photoCount, "Foto", "Fotos")} von deinem Zuhause` : "Noch keine Fotos gespeichert"}
          </TodayRow>
          {recent[0] && (
            <TodayRow href={`/zimmer?id=${recent[0].id}`} icon={<Clock size={18} strokeWidth={1.6} />}>
              {recent[0].name} zuletzt bearbeitet
            </TodayRow>
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[15px] font-semibold">Zuletzt bearbeitet</h2>
        {recent.length ? (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:px-0">
            {recent.map((r) => (
              <div key={r.id} className="w-32 shrink-0 md:w-auto">
                <RoomCard room={r} compact />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card bg-card p-6 text-center shadow-soft">
            <p className="font-serif text-[22px]">Noch keine Zimmer.</p>
            <p className="mt-1 text-[14px] text-muted">Leg dein erstes Zimmer an und zeig hiwo, wie es aussieht.</p>
            <Link href="/wohnung?neu=1" className={buttonClass("primary", "mt-5")}>
              Zimmer hinzufügen
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function TodayRow({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-3.5 text-[14px]">
        <span className="text-muted">{icon}</span>
        <span className="flex-1">{children}</span>
        <ChevronRight size={16} strokeWidth={1.6} className="text-faint" />
      </Link>
    </li>
  );
}
