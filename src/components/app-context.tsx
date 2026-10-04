"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { HOME_KEY, type Ctx } from "@/lib/data";
import type { Home, Role } from "@/lib/types";

type AppCtx = Ctx & {
  /** Re-load user/home (after editing profile or home). */
  refresh: () => Promise<void>;
  /** Re-run every useData() on screen (after any mutation). */
  bump: () => void;
  version: number;
};

const AppContext = createContext<AppCtx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}

/** Load signed-in user + current home, or send them to login / onboarding. */
export async function loadContext(): Promise<Ctx | "login" | "onboarding"> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "login";
  const user = session.user;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("id,email,display_name,avatar_path").eq("id", user.id).single(),
    supabase
      .from("home_members")
      .select("role, created_at, home:homes(id,name,city,cover_photo_id,created_at)")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  // Onboarding asks for a home (first user) and a name (everyone, incl. invited people).
  if (!memberships?.length || !profile?.display_name) return "onboarding";

  let preferred: string | null = null;
  try {
    preferred = localStorage.getItem(HOME_KEY);
  } catch {}
  const m = memberships.find((x) => (x.home as unknown as Home)?.id === preferred) ?? memberships[0];

  return {
    supabase,
    userId: user.id,
    profile,
    home: m.home as unknown as Home,
    role: m.role as Role,
  };
}

export function rememberHome(homeId: string) {
  try {
    localStorage.setItem(HOME_KEY, homeId);
  } catch {}
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const refresh = useCallback(async () => {
    const result = await loadContext();
    if (result === "login") router.replace(`/login/?next=${encodeURIComponent(path)}`);
    else if (result === "onboarding") router.replace("/willkommen/");
    else {
      setCtx(result);
      setVersion((v) => v + 1);
    }
  }, [router, path]);

  useEffect(() => {
    refresh();
    // only on first mount; pages call refresh() after profile/home edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ctx) return <Splash />;
  return <AppContext.Provider value={{ ...ctx, refresh, bump, version }}>{children}</AppContext.Provider>;
}

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="animate-shimmer font-serif text-[40px]">hiwo</p>
    </div>
  );
}

/**
 * Tiny data hook: runs `load` with the app context, again whenever `deps`
 * change or any mutation calls `bump()`.
 */
export function useData<T>(load: (ctx: Ctx) => Promise<T>, deps: unknown[] = []) {
  const ctx = useApp();
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    load(ctx).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.home.id, ctx.version, ...deps]);
  return { data, reload: ctx.bump };
}
