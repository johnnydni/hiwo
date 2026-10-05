// Reads and writes hiwo.json in the data repository. Every write is a commit;
// concurrent edits are resolved by re-reading and re-applying the change.

import {
  blobToBase64,
  deleteFile,
  encodeBase64Utf8,
  getBlob,
  getText,
  GitHubError,
  putFile,
  type Connection,
} from "./github";
import type { HiwoDoc } from "./types";

export const DOC_PATH = "hiwo.json";

export type Loaded = { doc: HiwoDoc; sha: string };

export async function loadDoc(c: Connection): Promise<Loaded | null> {
  const file = await getText(c, DOC_PATH);
  if (!file) return null;
  return { doc: migrate(JSON.parse(file.text)), sha: file.sha };
}

type V1Photo = { id: string; room_id: string; created_at: string; kind?: string; name?: string | null; note?: string | null };
type V1Doc = { schema?: number; rooms: { id: string; cover_photo_id?: string | null }[]; photos: V1Photo[]; shopping: { variant_id?: string | null }[] };

/**
 * Schema 1 (first GitHub version) had many equal photos per room plus a
 * furniture list and AI tables. Schema 2: one base photo per room, the other
 * photos become variants. Written back on the next change.
 */
export function migrate(raw: unknown): HiwoDoc {
  const d = raw as V1Doc & Record<string, unknown>;
  if (d.schema === 2) return d as unknown as HiwoDoc;
  for (const room of d.rooms) {
    const photos = d.photos.filter((p) => p.room_id === room.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const base = photos.find((p) => p.id === room.cover_photo_id) ?? photos[0];
    let n = 0;
    for (const p of photos) {
      p.kind = p === base ? "base" : "variant";
      p.name = p === base ? null : `Variante ${++n}`;
      p.note ??= null;
    }
    delete room.cover_photo_id;
    delete (room as Record<string, unknown>).current_version_id;
  }
  for (const s of d.shopping) s.variant_id ??= null;
  delete d.furniture;
  delete d.versions;
  delete d.generations;
  d.schema = 2;
  return d as unknown as HiwoDoc;
}

/**
 * Apply `change` to the latest hiwo.json and commit it. If someone else
 * committed in between (409/422 on a stale sha), reload and try again.
 */
export async function updateDoc(
  c: Connection,
  current: Loaded | null,
  message: string,
  change: (doc: HiwoDoc) => void,
): Promise<Loaded> {
  let base = current;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!base) base = await loadDoc(c);
    if (!base) throw new Error("hiwo.json fehlt im Daten-Repo.");
    const doc = structuredClone(base.doc);
    change(doc);
    try {
      const { sha } = await putFile(c, DOC_PATH, encodeBase64Utf8(JSON.stringify(doc, null, 1)), message, base.sha);
      return { doc, sha };
    } catch (e) {
      if (e instanceof GitHubError && (e.status === 409 || e.status === 422)) {
        base = null; // stale: reload and re-apply
        continue;
      }
      throw e;
    }
  }
  throw new Error("Gerade ändern viele gleichzeitig. Bitte versuch es noch einmal.");
}

export async function createDoc(c: Connection, doc: HiwoDoc): Promise<Loaded> {
  const { sha } = await putFile(c, DOC_PATH, encodeBase64Utf8(JSON.stringify(doc, null, 1)), "hiwo: Wohnung angelegt");
  return { doc, sha };
}

export async function uploadPhoto(c: Connection, path: string, blob: Blob, message: string) {
  return putFile(c, path, await blobToBase64(blob), message);
}

export async function removeFile(c: Connection, path: string, sha: string | null, message: string) {
  if (sha) await deleteFile(c, path, sha, message);
}

// Photos are private files: fetch them once per session and hand out blob URLs.
const photoCache = new Map<string, Promise<string>>();

export function photoUrl(c: Connection, path: string): Promise<string> {
  let p = photoCache.get(path);
  if (!p) {
    p = getBlob(c, path).then((b) => URL.createObjectURL(b));
    p.catch(() => photoCache.delete(path));
    photoCache.set(path, p);
  }
  return p;
}
