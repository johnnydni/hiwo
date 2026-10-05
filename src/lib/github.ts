// Minimal GitHub Contents API client. The browser talks to GitHub directly
// with a fine-grained token that may only read/write the data repository.

export type Connection = {
  /** "owner/repo" of the data repository */
  repo: string;
  token: string;
  /** branch to read/write; empty = repo default */
  branch?: string;
};

const API = process.env.NEXT_PUBLIC_GITHUB_API ?? "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function headers(c: Connection, accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    Authorization: `Bearer ${c.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function contentsUrl(c: Connection, path: string) {
  const ref = c.branch ? `?ref=${encodeURIComponent(c.branch)}` : "";
  return `${API}/repos/${c.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}${ref}`;
}

async function fail(res: Response): Promise<never> {
  let msg = res.statusText;
  try {
    msg = (await res.json()).message ?? msg;
  } catch {}
  throw new GitHubError(res.status, msg);
}

/** Checks token + repo access. Returns the repo's default branch. */
export async function checkRepo(c: Connection): Promise<{ defaultBranch: string; private: boolean; canWrite: boolean }> {
  const res = await fetch(`${API}/repos/${c.repo}`, { headers: headers(c), cache: "no-store" });
  if (!res.ok) await fail(res);
  const r = await res.json();
  return {
    defaultBranch: r.default_branch,
    private: !!r.private,
    // fine-grained tokens report the token's own permissions here
    canWrite: r.permissions ? !!(r.permissions.push || r.permissions.admin || r.permissions.maintain) : true,
  };
}

/** File metadata + text content, or null if it does not exist. */
export async function getText(c: Connection, path: string): Promise<{ text: string; sha: string } | null> {
  const res = await fetch(contentsUrl(c, path), { headers: headers(c), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) await fail(res);
  const meta = await res.json();
  let text: string;
  if (meta.encoding === "base64" && meta.content) {
    text = decodeBase64Utf8(meta.content);
  } else {
    // > 1 MB: content is omitted, fetch raw
    const raw = await fetch(contentsUrl(c, path), {
      headers: headers(c, "application/vnd.github.raw+json"),
      cache: "no-store",
    });
    if (!raw.ok) await fail(raw);
    text = await raw.text();
  }
  return { text, sha: meta.sha };
}

/** Raw bytes of a file (used for photos). */
export async function getBlob(c: Connection, path: string): Promise<Blob> {
  const res = await fetch(contentsUrl(c, path), {
    headers: headers(c, "application/vnd.github.raw+json"),
  });
  if (!res.ok) await fail(res);
  return res.blob();
}

/** Create or update a file. `sha` is required when the file exists (optimistic locking). */
export async function putFile(
  c: Connection,
  path: string,
  contentBase64: string,
  message: string,
  sha?: string,
): Promise<{ sha: string }> {
  const res = await fetch(contentsUrl(c, path).split("?")[0], {
    method: "PUT",
    headers: { ...headers(c), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: contentBase64, sha, branch: c.branch || undefined }),
  });
  if (!res.ok) await fail(res);
  const out = await res.json();
  return { sha: out.content.sha };
}

export async function deleteFile(c: Connection, path: string, sha: string, message: string) {
  const res = await fetch(contentsUrl(c, path).split("?")[0], {
    method: "DELETE",
    headers: { ...headers(c), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: c.branch || undefined }),
  });
  // already gone is fine
  if (!res.ok && res.status !== 404) await fail(res);
}

// ---------------------------------------------------------------------------
// base64 helpers (UTF-8 safe)
// ---------------------------------------------------------------------------

export function encodeBase64Utf8(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function decodeBase64Utf8(b64: string) {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
