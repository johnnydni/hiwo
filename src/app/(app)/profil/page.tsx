"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Home, Users, ShoppingBag, LogOut, Database } from "lucide-react";
import { useApp } from "@/components/app-context";
import { clearConnection } from "@/lib/connection";
import { plural } from "@/lib/format";
import { Avatar } from "@/components/ui";
import { ProfileEdit } from "./profile-edit";

export default function ProfilPage() {
  const { doc, me, conn } = useApp();
  const home = doc.home;
  const router = useRouter();
  const rooms = doc.rooms.length;
  const members = doc.members.length;
  const name = me.name;

  return (
    <div className="px-4 pt-8 md:px-0 md:pt-12">
      <div className="animate-fade-up flex items-center gap-4">
        <Avatar name={name} size={60} />
        <div className="flex-1">
          <h1 className="font-serif text-[30px] leading-tight">{name}</h1>
          <p className="text-[13px] text-muted">{me.role === "owner" ? "Eigentümer" : "Mitglied"} · {home.name}</p>
        </div>
        <ProfileEdit name={me.name} homeName={home.name} city={home.city ?? ""} />
      </div>

      <ul className="mt-8 divide-y divide-line rounded-card bg-card px-4 shadow-soft">
        <Row href="/wohnung" icon={Home} label="Meine Wohnung" sub={[home.city, plural(rooms, "Zimmer", "Zimmer")].filter(Boolean).join(" · ")} />
        <Row href="/profil/mitbewohner" icon={Users} label="Mitbewohner" sub={plural(members, "Person", "Personen")} />
        <Row href="/einkauf" icon={ShoppingBag} label="Einkaufslisten" />
        <Row href={`https://github.com/${conn.repo}`} icon={Database} label="Gespeichert in" sub={conn.repo} />
      </ul>

      <div className="mt-4">
        <button
          onClick={async () => {
            clearConnection();
            router.replace("/login/");
          }}
          className="flex w-full items-center gap-3 rounded-card bg-card px-4 py-4 text-left text-[15px] shadow-soft">
          <LogOut size={19} strokeWidth={1.6} className="text-muted" />
          Auf diesem Gerät abmelden
        </button>
      </div>
      <p className="mt-10 text-center font-serif text-[18px] text-faint">hiwo · hier wohne ich.</p>
    </div>
  );
}

function Row({
  href,
  icon: Icon,
  label,
  sub,
}: {
  href?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  sub?: string;
}) {
  const inner = (
    <>
      <Icon size={19} strokeWidth={1.6} className="text-muted" />
      <span className="flex-1">
        <span className="block text-[15px]">{label}</span>
        {sub && <span className="block text-[12px] text-muted">{sub}</span>}
      </span>
      {href && <ChevronRight size={16} strokeWidth={1.6} className="text-faint" />}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="flex items-center gap-3 py-3.5">{inner}</Link>
      ) : (
        <div className="flex items-center gap-3 py-3.5 opacity-60">{inner}</div>
      )}
    </li>
  );
}
