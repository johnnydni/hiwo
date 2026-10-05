"use client";

import Link from "next/link";
import { ChevronRight, ShoppingBag, Camera, Clock } from "lucide-react";
import { useApp } from "@/components/app-context";
import { homeCover, roomCards } from "@/lib/selectors";
import { firstName, greeting, plural } from "@/lib/format";
import { RoomCard } from "@/components/room-card";
import { HomeCover } from "@/components/cover-art";
import { buttonClass } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function HomePage() {
  const { doc, me } = useApp();
  const { home } = doc;
  const rooms = roomCards(doc);
  const openCount = doc.shopping.filter((s) => s.status === "open").length;
  const cover = homeCover(doc);

  const recent = [...rooms].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6);
  const variantCount = rooms.reduce((n, r) => n + r.variantCount, 0);

  return (
    <div className="px-4 md:px-0">
      <header className="animate-fade-up pt-6 md:pt-10">
        <p className="flex items-end gap-2 font-serif text-[30px] leading-none lg:hidden">
          <Logo size={32} />
          hiwo
        </p>
        <h1 className="mt-6 font-serif text-[30px] leading-tight lg:mt-0 md:text-[40px]">
          {greeting()}, {firstName(me.name)}.
        </h1>
        <p className="mt-1 text-[14px] text-muted">Schön, dass du da bist.</p>
      </header>

      <Link href="/wohnung" className="group mt-6 block animate-fade-up">
        <div className="relative">
          <HomeCover
            cover={cover}
            alt={home.name}
            className="aspect-[4/3] rounded-image md:aspect-[21/9]"
            imgClassName="transition duration-500 group-hover:scale-[1.01]"
          />
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
            {variantCount ? `${plural(variantCount, "Variante", "Varianten")} zum Vergleichen` : "Noch keine Varianten gespeichert"}
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
            <p className="mt-1 text-[14px] text-muted">Leg dein erstes Zimmer an und fotografier, wie es jetzt aussieht.</p>
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
