"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readConnection, saveConnection, type Saved } from "@/lib/connection";
import { createDoc, loadDoc, updateDoc, type Loaded } from "@/lib/store";
import { newId, now } from "@/lib/id";
import { Splash } from "@/components/app-context";
import { Avatar, Button, Input, Label } from "@/components/ui";

export default function WillkommenPage() {
  return (
    <Suspense fallback={<Splash />}>
      <Willkommen />
    </Suspense>
  );
}

type State = { conn: Saved; loaded: Loaded | null };

function Willkommen() {
  const router = useRouter();
  const rawNext = useSearchParams().get("next");
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("/willkommen") ? rawNext : "/";
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const conn = readConnection();
    if (!conn) return router.replace("/login/");
    loadDoc(conn)
      .then((loaded) => {
        if (loaded && loaded.doc.members.some((m) => m.id === conn.memberId)) return router.replace(next);
        setState({ conn, loaded });
      })
      .catch(() => router.replace("/login/"));
  }, [router, next]);

  if (!state) return <Splash />;
  const { conn, loaded } = state;

  function enter(memberId: string) {
    saveConnection({ ...conn, memberId });
    router.replace(next);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("display_name") ?? "").trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    const id = newId();
    try {
      if (!loaded) {
        await createDoc(conn, {
          schema: 2,
          home: {
            id: newId(),
            name: String(fd.get("home_name") ?? "").trim() || "Meine Wohnung",
            city: String(fd.get("city") ?? "").trim() || null,
            cover_photo_id: null,
            created_at: now(),
          },
          members: [{ id, name, role: "owner", joined_at: now() }],
          rooms: [],
          photos: [],
          shopping: [],
        });
      } else {
        await updateDoc(conn, loaded, `hiwo: ${name} ist dabei`, (d) => {
          d.members.push({ id, name, role: "member", joined_at: now() });
        });
      }
      enter(id);
    } catch (err) {
      setError((err as Error).message || "Das hat nicht geklappt.");
      setBusy(false);
    }
  }

  const needsHome = !loaded;
  const members = loaded?.doc.members ?? [];

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
          <>
            Schön, dass
            <br />
            du da bist.
          </>
        )}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        {needsHome
          ? "Lass uns deine Wohnung anlegen. Zimmer und Fotos fügst du danach hinzu."
          : `Das ist „${loaded.doc.home.name}“. Wie sollen dich die anderen sehen?`}
      </p>

      {members.length > 0 && (
        <section className="mt-8">
          <Label>Schon dabei? Dann tipp auf deinen Namen.</Label>
          <ul className="mt-2 divide-y divide-line rounded-card bg-card px-4 shadow-soft">
            {members.map((m) => (
              <li key={m.id}>
                <button onClick={() => enter(m.id)} className="flex w-full items-center gap-3 py-3 text-left text-[15px]">
                  <Avatar name={m.name} size={32} />
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={submit} className="mt-8 flex flex-1 flex-col gap-5">
        <label>
          <Label>{members.length ? "Neu hier? Dein Name" : "Dein Name"}</Label>
          <Input name="display_name" placeholder="z.B. Illy" required autoFocus={!members.length} />
        </label>
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
        {error && <p className="text-[13px] text-terracotta">{error}</p>}
        <div className="mt-auto pt-6">
          <Button className="w-full" loading={busy}>
            {needsHome ? "Wohnung anlegen" : "Beitreten"}
          </Button>
        </div>
      </form>
    </main>
  );
}
