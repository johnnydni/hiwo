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
  const doc = JSON.parse(file.text) as HiwoDoc;
  // tolerate files written by older versions
  doc.versions ??= [];
  doc.generations ??= [];
  return { doc, sha: file.sha };
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
