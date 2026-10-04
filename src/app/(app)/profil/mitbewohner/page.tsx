import { getContext } from "@/lib/data";
import { displayName, relativeDay } from "@/lib/format";
import type { Invite, Member } from "@/lib/types";
import { Avatar, PageHeader } from "@/components/ui";
import { InviteButton, InviteRowActions, MemberRowActions } from "./invite";

export default async function MitbewohnerPage() {
  const { supabase, home, userId, role } = await getContext();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("home_members")
      .select("user_id, role, created_at, profile:profiles(id,email,display_name,avatar_path)")
      .eq("home_id", home.id)
      .order("created_at"),
    supabase
      .from("home_invites")
      .select("id,token,email,phone,name,accepted_at,expires_at,created_at")
      .eq("home_id", home.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const list = (members ?? []) as unknown as Member[];
  const pending = (invites ?? []) as Invite[];

  return (
    <div>
      <PageHeader back="/profil" title="Mitbewohner" subtitle={home.name} />
      <div className="px-4 md:px-0">
        <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
          {list.map((m) => {
            const name = displayName(m.profile);
            const me = m.user_id === userId;
            return (
              <li key={m.user_id} className="flex items-center gap-3 py-3.5">
                <Avatar name={name} size={40} />
                <div className="flex-1">
                  <p className="text-[15px]">{name}</p>
                  <p className="text-[12px] text-muted">
                    {me ? "Du · " : ""}
                    {m.role === "owner" ? "Eigentümer" : "Mitglied"}
                  </p>
                </div>
                {role === "owner" && !me && <MemberRowActions userId={m.user_id} name={name} />}
              </li>
            );
          })}
          <li>
            <InviteButton />
          </li>
        </ul>

        {pending.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-[13px] font-medium tracking-wide text-muted uppercase">Eingeladen</h2>
            <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
              {pending.map((i) => {
                const label = i.name || i.email || i.phone || "Einladungslink";
                return (
                  <li key={i.id} className="flex items-center gap-3 py-3.5">
                    <Avatar name={label} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px]">{label}</p>
                      <p className="text-[12px] text-muted">eingeladen {relativeDay(i.created_at)}</p>
                    </div>
                    <InviteRowActions id={i.id} token={i.token} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p className="mt-14 text-center font-serif text-[22px] leading-snug text-muted">
          Gemeinsam wohnen.
          <br />
          Einfacher organisieren.
        </p>
      </div>
    </div>
  );
}
