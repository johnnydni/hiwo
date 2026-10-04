import Link from "next/link";
import { ChevronRight, Home, Users, ShoppingBag, Sparkles, Bell, Palette, CircleHelp, LogOut } from "lucide-react";
import { getContext } from "@/lib/data";
import { displayName, plural } from "@/lib/format";
import { Avatar } from "@/components/ui";
import { ProfileEdit } from "./profile-edit";

export default async function ProfilPage() {
  const { supabase, profile, home } = await getContext();
  const [{ count: rooms }, { count: members }] = await Promise.all([
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("home_id", home.id),
    supabase.from("home_members").select("user_id", { count: "exact", head: true }).eq("home_id", home.id),
  ]);
  const name = displayName(profile);

  return (
    <div className="px-4 pt-8 md:px-0 md:pt-12">
      <div className="animate-fade-up flex items-center gap-4">
        <Avatar name={name} size={60} />
        <div className="flex-1">
          <h1 className="font-serif text-[30px] leading-tight">{name}</h1>
          <p className="text-[13px] text-muted">{profile.email}</p>
        </div>
        <ProfileEdit name={profile.display_name ?? ""} homeName={home.name} city={home.city ?? ""} />
      </div>

      <ul className="mt-8 divide-y divide-line rounded-card bg-card px-4 shadow-soft">
        <Row href="/wohnung" icon={Home} label="Meine Wohnung" sub={[home.city, plural(rooms ?? 0, "Zimmer", "Zimmer")].filter(Boolean).join(" · ")} />
        <Row href="/profil/mitbewohner" icon={Users} label="Mitbewohner" sub={plural(members ?? 1, "Person", "Personen")} />
        <Row href="/einkauf" icon={ShoppingBag} label="Einkaufslisten" />
      </ul>

      <ul className="mt-4 divide-y divide-line rounded-card bg-card px-4 shadow-soft">
        <Row icon={Sparkles} label="KI-Einstellungen" sub="Bald verfügbar" />
        <Row icon={Bell} label="Benachrichtigungen" sub="Bald verfügbar" />
        <Row icon={Palette} label="Design & Darstellung" sub="Bald verfügbar" />
        <Row href="mailto:hallo@hiwo.app" icon={CircleHelp} label="Hilfe & Support" />
      </ul>

      <form action="/auth/signout" method="post" className="mt-4">
        <button className="flex w-full items-center gap-3 rounded-card bg-card px-4 py-4 text-left text-[15px] shadow-soft">
          <LogOut size={19} strokeWidth={1.6} className="text-muted" />
          Abmelden
        </button>
      </form>
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
