import { createClient as create, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = !!url && !!key;

let client: SupabaseClient | null = null;

/** One browser client for the whole app; the session lives in localStorage. */
export function createClient(): SupabaseClient {
  if (!client) {
    client = create(url ?? "http://localhost", key ?? "missing", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

/** Base path the app is served under (e.g. "/hiwo" on GitHub Pages). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Absolute URL of an app page, for links that leave the app (e-mails, invites). */
export function appUrl(path: string) {
  return `${window.location.origin}${BASE_PATH}${path}`;
}
