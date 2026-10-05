import type { Connection } from "./github";

const KEY = "hiwo_connection";

export type Saved = Connection & { memberId?: string };

export function readConnection(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

export function saveConnection(c: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {}
}

export function clearConnection() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Repo + token travel in the URL fragment, which browsers never send to a server. */
export function encodeInvite(c: Connection) {
  const p = new URLSearchParams({ r: c.repo, t: c.token });
  if (c.branch) p.set("b", c.branch);
  return p.toString();
}

export function decodeInvite(hash: string): Connection | null {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const repo = p.get("r");
  const token = p.get("t");
  if (!repo || !token) return null;
  return { repo, token, branch: p.get("b") ?? undefined };
}

export function normalizeRepo(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}
