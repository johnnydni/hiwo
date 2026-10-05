"use client";

import { useApp } from "@/components/app-context";
import { Avatar, PageHeader } from "@/components/ui";
import { InviteButton, MemberRowActions } from "./invite";

export default function MitbewohnerPage() {
  const { doc, me } = useApp();

  return (
    <div>
      <PageHeader back="/profil" title="Mitbewohner" subtitle={doc.home.name} />
      <div className="px-4 md:px-0">
        <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
          {doc.members.map((m) => {
            const isMe = m.id === me.id;
            return (
              <li key={m.id} className="flex items-center gap-3 py-3.5">
                <Avatar name={m.name} size={40} />
                <div className="flex-1">
                  <p className="text-[15px]">{m.name}</p>
                  <p className="text-[12px] text-muted">
                    {isMe ? "Du · " : ""}
                    {m.role === "owner" ? "Eigentümer" : "Mitglied"}
                  </p>
                </div>
                {me.role === "owner" && !isMe && <MemberRowActions memberId={m.id} name={m.name} />}
              </li>
            );
          })}
          <li>
            <InviteButton />
          </li>
        </ul>

        <p className="mt-14 text-center font-serif text-[22px] leading-snug text-muted">
          Gemeinsam wohnen.
          <br />
          Einfacher organisieren.
        </p>
      </div>
    </div>
  );
}
