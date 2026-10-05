"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeInvite, readConnection, saveConnection } from "@/lib/connection";
import { Splash } from "@/components/app-context";
import { Logo } from "@/components/logo";

export default function InvitePage() {
  const router = useRouter();
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const invite = decodeInvite(window.location.hash);
    if (!invite) return setInvalid(true);
    const saved = readConnection();
    saveConnection({ ...invite, memberId: saved?.repo === invite.repo ? saved.memberId : undefined });
    // don't leave the key in the address bar / history
    history.replaceState(null, "", window.location.pathname);
    router.replace("/willkommen/");
  }, [router]);

  if (!invalid) return <Splash />;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12 text-center">
      <Logo size={72} className="mx-auto mb-4" />
      <p className="font-serif text-[56px] leading-none">hiwo</p>
      <p className="mt-1 text-muted">hier wohne ich.</p>
      <h1 className="mt-14 font-serif text-[30px]">Dieser Link ist unvollständig.</h1>
      <p className="mt-3 text-[15px] text-muted">Bitte die Person, dir den Einladungslink noch einmal zu schicken.</p>
    </main>
  );
}
