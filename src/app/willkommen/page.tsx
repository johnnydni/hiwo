import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/app/actions";
import { Button, Input, Label } from "@/components/ui";

export default async function Willkommen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("home_members").select("home_id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const needsName = !profile?.display_name;
  const needsHome = !count;
  if (!needsName && !needsHome) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pt-20 pb-12">
      <p className="font-serif text-[28px]">hiwo</p>
      <h1 className="animate-fade-up mt-10 font-serif text-[38px] leading-tight">
        {needsHome ? (
          <>
            Willkommen
            <br />
            zu Hause.
          </>
        ) : (
          "Schön, dass du da bist."
        )}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        {needsHome
          ? "Lass uns deine Wohnung anlegen. Zimmer und Fotos fügst du danach hinzu."
          : "Wie sollen dich die anderen sehen?"}
      </p>
      <form action={completeOnboarding} className="mt-10 flex flex-1 flex-col gap-5">
        {needsName && (
          <label>
            <Label>Dein Name</Label>
            <Input name="display_name" placeholder="z.B. Illy" required autoFocus />
          </label>
        )}
        {needsHome && (
          <>
            <label>
              <Label>Wie heißt deine Wohnung?</Label>
              <Input name="home_name" placeholder="Meine Wohnung" />
            </label>
            <label>
              <Label>Stadt</Label>
              <Input name="city" placeholder="z.B. München" />
            </label>
          </>
        )}
        <div className="mt-auto pt-6">
          <Button className="w-full">{needsHome ? "Wohnung anlegen" : "Weiter"}</Button>
        </div>
      </form>
    </main>
  );
}
