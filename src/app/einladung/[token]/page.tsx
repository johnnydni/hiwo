import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/app/actions";
import { Button, buttonClass } from "@/components/ui";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data: rows }, { data: auth }] = await Promise.all([
    supabase.rpc("invite_preview", { p_token: token }),
    supabase.auth.getUser(),
  ]);
  const invite = rows?.[0] as
    | { home_name: string; city: string | null; inviter: string; expired: boolean; used: boolean }
    | undefined;
  const valid = invite && !invite.expired && !invite.used;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12 text-center">
      <p className="font-serif text-[56px] leading-none">hiwo</p>
      <p className="mt-1 text-muted">hier wohne ich.</p>
      {valid ? (
        <>
          <h1 className="animate-fade-up mt-14 font-serif text-[30px] leading-snug">
            {invite.inviter} lädt dich in
            <br />
            „{invite.home_name}“ ein.
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            Gemeinsam Zimmer planen, Fotos sammeln und Einkaufslisten pflegen.
          </p>
          <div className="mt-10">
            {auth.user ? (
              <form action={acceptInvite.bind(null, token)}>
                <Button className="w-full">Einladung annehmen</Button>
              </form>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/einladung/${token}`)}`}
                className={buttonClass("primary", "w-full")}
              >
                Anmelden und beitreten
              </Link>
            )}
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
