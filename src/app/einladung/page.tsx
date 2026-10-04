"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { acceptInvite } from "@/lib/api";
import { rememberHome, Splash } from "@/components/app-context";
import { Button, buttonClass } from "@/components/ui";

type Preview = { home_name: string; city: string | null; inviter: string; expired: boolean; used: boolean };

export default function InvitePage() {
  return (
    <Suspense fallback={<Splash />}>
      <Invite />
    </Suspense>
  );
}

function Invite() {
  const token = useSearchParams().get("t") ?? "";
  const router = useRouter();
  const [state, setState] = useState<{ invite: Preview | undefined; signedIn: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([supabase.rpc("invite_preview", { p_token: token }), supabase.auth.getSession()]).then(
      ([{ data: rows }, { data }]) => setState({ invite: (rows as Preview[] | null)?.[0], signedIn: !!data.session }),
    );
  }, [token]);

  if (!state) return <Splash />;
  const { invite, signedIn } = state;
  const valid = invite && !invite.expired && !invite.used;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12 text-center">
      <p className="font-serif text-[56px] leading-none">hiwo</p>
      <p className="mt-1 text-muted">hier wohne ich.</p>
      {valid ? (
        <>
          <h1 className="animate-fade-up mt-14 font-serif text-[30px] leading-snug">
            {invite.inviter} lädt dich in
            <br />„{invite.home_name}“ ein.
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            Gemeinsam Zimmer planen, Fotos sammeln und Einkaufslisten pflegen.
          </p>
          <div className="mt-10">
            {signedIn ? (
              <Button
                className="w-full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    rememberHome(await acceptInvite(token));
                    router.replace("/");
                  } catch (e) {
                    setError((e as Error).message);
                    setBusy(false);
                  }
                }}
              >
                Einladung annehmen
              </Button>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/einladung/?t=${token}`)}`}
                className={buttonClass("primary", "w-full")}
              >
                Anmelden und beitreten
              </Link>
            )}
            {error && <p className="mt-3 text-[13px] text-terracotta">{error}</p>}
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-14 font-serif text-[30px]">Diese Einladung gilt nicht mehr.</h1>
          <p className="mt-3 text-[15px] text-muted">Bitte die Person, dich noch einmal einzuladen.</p>
        </>
      )}
    </main>
  );
}
