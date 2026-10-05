"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readConnection, type Saved } from "@/lib/connection";
import { loadDoc, photoUrl, updateDoc, type Loaded } from "@/lib/store";
import type { HiwoDoc, Member } from "@/lib/types";

type AppCtx = {
  conn: Saved;
  doc: HiwoDoc;
  me: Member;
  /** Apply a change to hiwo.json and commit it (one commit per action). */
  mutate: (message: string, change: (doc: HiwoDoc) => void) => Promise<void>;
  /** Re-read hiwo.json (others may have changed it). */
  reload: () => Promise<void>;
};

const AppContext = createContext<AppCtx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}

const POLL_MS = 30_000;

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [conn, setConn] = useState<Saved | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<Loaded | null>(null);
  loadedRef.current = loaded;

  const reload = useCallback(async () => {
    const c = readConnection();
    if (!c) return;
    const l = await loadDoc(c);
    if (l && l.sha !== loadedRef.current?.sha) setLoaded(l);
  }, []);

  useEffect(() => {
    const c = readConnection();
    if (!c) {
      router.replace(`/login/?next=${encodeURIComponent(path)}`);
      return;
    }
    setConn(c);
    loadDoc(c)
      .then((l) => {
        if (!l || !c.memberId || !l.doc.members.some((m) => m.id === c.memberId)) {
          router.replace("/willkommen/");
          return;
        }
        setLoaded(l);
      })
      .catch((e) => setError(String(e.message ?? e)));
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick up changes from the rest of the family while the app is open.
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && reload().catch(() => {});
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [reload]);

  const mutate = useCallback(
    async (message: string, change: (doc: HiwoDoc) => void) => {
      const c = readConnection()!;
      const next = await updateDoc(c, loadedRef.current, message, change);
      loadedRef.current = next;
      setLoaded(next);
    },
    [],
  );

  if (error) return <ConnectionError message={error} />;
  if (!conn || !loaded) return <Splash />;
  const me = loaded.doc.members.find((m) => m.id === conn.memberId);
  if (!me) return <Splash />;

  return (
    <AppContext.Provider value={{ conn, doc: loaded.doc, me, mutate, reload }}>{children}</AppContext.Provider>
  );
}

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="animate-shimmer font-serif text-[40px]">hiwo</p>
    </div>
  );
}

function ConnectionError({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 text-center">
      <p className="font-serif text-[30px]">hiwo kommt gerade nicht an deine Daten.</p>
      <p className="mt-3 text-[14px] text-muted">{message}</p>
      <a href="./" className="mt-6 text-[14px] underline">
        Noch einmal versuchen
      </a>
    </main>
  );
}

/** Blob URL of a private photo in the data repo (null while loading). */
export function usePhotoUrl(path: string | null | undefined) {
  const { conn } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (path) photoUrl(conn, path).then((u) => alive && setUrl(u), () => {});
    return () => {
      alive = false;
    };
  }, [conn, path]);
  return url;
}

/** Display name of a member id (falls back for people who left). */
export function useMemberName() {
  const { doc } = useApp();
  return (id: string | null | undefined) => doc.members.find((m) => m.id === id)?.name ?? "Jemand";
}
