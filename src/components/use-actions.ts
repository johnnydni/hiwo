"use client";

// Every user action is one change to hiwo.json (= one commit in the data repo).

import { useApp } from "./app-context";
import { parsePrice } from "@/lib/format";
import { newId, now } from "@/lib/id";
import { prepareImage } from "@/lib/image";
import { fetchPreview, hostname, looksLikeUrl, normalizeUrl } from "@/lib/link-preview";
import { removeFile, uploadPhoto } from "@/lib/store";
import type { HiwoDoc, PlanDoor, PlanRoom, Sketch } from "@/lib/types";

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function touchRoom(doc: HiwoDoc, roomId: string | null) {
  const room = doc.rooms.find((r) => r.id === roomId);
  if (room) room.updated_at = now();
}

/** "" = Gesamte Wohnung, "<room>" = Zimmer, "<room>/<variant>" = eine Variante */
export function parseTarget(value: string) {
  const [room, variant] = value.split("/");
  return { room_id: room || null, variant_id: variant || null };
}

export function targetValue(item: { room_id: string | null; variant_id: string | null }) {
  return item.room_id ? (item.variant_id ? `${item.room_id}/${item.variant_id}` : item.room_id) : "";
}

/** Removes the sketches of deleted photos/items from the doc. */
function dropSketches(doc: HiwoDoc, sourceIds: Set<string>) {
  if (doc.sketches) doc.sketches = doc.sketches.filter((k) => !sourceIds.has(k.source_id));
}

export function useActions() {
  const { conn, me, doc, mutate, track } = useApp();
  const by = me.id;
  const sketchesOf = (ids: Set<string>) => (doc.sketches ?? []).filter((k) => ids.has(k.source_id));
  const removeSketchFiles = async (list: Sketch[]) => {
    for (const k of list) await removeFile(conn, k.path, k.sha, "hiwo: Skizze gelöscht").catch(() => {});
  };

  async function upload(roomId: string, file: File) {
    const { blob, width, height } = await prepareImage(file, 1800);
    const id = newId();
    const path = `fotos/${roomId}/${id}.jpg`;
    const { sha } = await track(uploadPhoto(conn, path, blob, "hiwo: Foto hochgeladen"));
    return {
      id,
      room_id: roomId,
      path,
      sha,
      width: width || null,
      height: height || null,
      created_by: by,
      created_at: now(),
    };
  }

  /** Stores the shop's product picture; replaces the name only if it was just the link. */
  async function fillFromLink(itemId: string, url: string, placeholderName: string | null) {
    const preview = await fetchPreview(url);
    if (!preview || (!preview.image && !(placeholderName && preview.title))) return;
    await mutate("hiwo: Produktbild aus Link", (d) => {
      const s = d.shopping.find((x) => x.id === itemId);
      if (!s || s.url !== url) return;
      if (preview.image) s.image_url = preview.image;
      if (placeholderName && preview.title && s.name === placeholderName) s.name = preview.title;
    }).catch(() => {});
  }

  return {
    // -- home & profile ------------------------------------------------------
    updateHome: (fd: FormData) =>
      mutate("hiwo: Wohnung bearbeitet", (d) => {
        d.home.name = str(fd, "name") || "Meine Wohnung";
        d.home.city = str(fd, "city") || null;
      }),

    renameMe: (name: string) =>
      mutate(`hiwo: ${name} hat den Namen geändert`, (d) => {
        const m = d.members.find((x) => x.id === by);
        if (m && name.trim()) m.name = name.trim();
      }),

    removeMember: (id: string) =>
      mutate("hiwo: Mitglied entfernt", (d) => {
        d.members = d.members.filter((m) => m.id !== id || m.role === "owner");
      }),

    // -- rooms ---------------------------------------------------------------
    createRoom: async (name: string) => {
      const id = newId();
      await mutate(`hiwo: Zimmer „${name.trim()}“ angelegt`, (d) => {
        d.rooms.push({
          id,
          name: name.trim(),
          position: d.rooms.length,
          created_by: by,
          created_at: now(),
          updated_at: now(),
        });
      });
      return id;
    },

    /** New room order; rooms missing from `ids` (added meanwhile by someone else) go last. */
    reorderRooms: (ids: string[]) =>
      mutate("hiwo: Zimmer umsortiert", (d) => {
        const rank = (id: string) => {
          const i = ids.indexOf(id);
          return i === -1 ? ids.length : i;
        };
        [...d.rooms]
          .sort((a, b) => rank(a.id) - rank(b.id) || a.position - b.position)
          .forEach((r, i) => (r.position = i));
      }),

    renameRoom: (roomId: string, name: string) =>
      mutate("hiwo: Zimmer umbenannt", (d) => {
        const r = d.rooms.find((x) => x.id === roomId);
        if (r && name.trim()) {
          r.name = name.trim();
          r.updated_at = now();
        }
      }),

    deleteRoom: async (roomId: string) => {
      const photos = doc.photos.filter((p) => p.room_id === roomId);
      const sketches = sketchesOf(new Set(photos.map((p) => p.id)));
      await mutate("hiwo: Zimmer gelöscht", (d) => {
        const photoIds = new Set(d.photos.filter((p) => p.room_id === roomId).map((p) => p.id));
        dropSketches(d, photoIds);
        d.rooms = d.rooms.filter((r) => r.id !== roomId);
        d.photos = d.photos.filter((p) => p.room_id !== roomId);
        // keep the shopping items, they just move to "Gesamte Wohnung"
        d.shopping.forEach((s) => {
          if (s.room_id === roomId) {
            s.room_id = null;
            s.variant_id = null;
          }
        });
        if (d.home.cover_photo_id && photoIds.has(d.home.cover_photo_id)) d.home.cover_photo_id = null;
        // the area stays on the Lageplan, under the room's old name
        const name = doc.rooms.find((r) => r.id === roomId)?.name ?? null;
        d.plan?.rooms.forEach((p) => {
          if (p.room_id !== roomId) return;
          p.room_id = null;
          p.label = name;
        });
      });
      // files last: if this fails, the doc is still consistent
      for (const p of photos) await removeFile(conn, p.path, p.sha, "hiwo: Foto gelöscht").catch(() => {});
      await removeSketchFiles(sketches);
    },

    // -- photos: one base photo per room, any number of variants --------------
    /** Sets (or replaces) the photo of how the room looks today. */
    setBasePhoto: async (roomId: string, file: File) => {
      const old = doc.photos.find((p) => p.room_id === roomId && p.kind === "base");
      const photo = await upload(roomId, file);
      await mutate(old ? "hiwo: Ausgangsfoto ersetzt" : "hiwo: Ausgangsfoto hinzugefügt", (d) => {
        d.photos = d.photos.filter((p) => !(p.room_id === roomId && p.kind === "base"));
        d.photos.push({ ...photo, kind: "base", name: null, note: null });
        if (old && d.home.cover_photo_id === old.id) d.home.cover_photo_id = photo.id;
        // sketches of the old photo stay with the room's (new) base photo
        d.sketches?.forEach((k) => old && k.source_id === old.id && (k.source_id = photo.id));
        touchRoom(d, roomId);
      });
      if (old) await removeFile(conn, old.path, old.sha, "hiwo: altes Ausgangsfoto").catch(() => {});
    },

    /** Uploads a variant photo and returns its id. */
    addVariant: async (roomId: string, file: File) => {
      const photo = await upload(roomId, file);
      await mutate("hiwo: Variante hinzugefügt", (d) => {
        const n = d.photos.filter((p) => p.room_id === roomId && p.kind === "variant").length + 1;
        d.photos.push({ ...photo, kind: "variant", name: `Variante ${n}`, note: null });
        touchRoom(d, roomId);
      });
      return photo.id;
    },

    /** New picture for a variant; name, note, list, sketches and Wohnungsbild stay. */
    replaceVariantPhoto: async (id: string, file: File) => {
      const old = doc.photos.find((p) => p.id === id);
      if (!old) return;
      const photo = await upload(old.room_id, file);
      await mutate("hiwo: Variantenbild ersetzt", (d) => {
        const v = d.photos.find((p) => p.id === id);
        if (!v) return;
        Object.assign(v, { path: photo.path, sha: photo.sha, width: photo.width, height: photo.height });
        touchRoom(d, v.room_id);
      });
      await removeFile(conn, old.path, old.sha, "hiwo: altes Variantenbild").catch(() => {});
    },

    updateVariant: (id: string, fd: FormData) =>
      mutate("hiwo: Variante bearbeitet", (d) => {
        const v = d.photos.find((p) => p.id === id);
        if (!v) return;
        v.name = str(fd, "name") || v.name;
        v.note = str(fd, "note") || null;
        touchRoom(d, v.room_id);
      }),

    setHomeCover: (photoId: string) =>
      mutate("hiwo: Wohnungsbild gesetzt", (d) => {
        d.home.cover_photo_id = photoId;
      }),

    deletePhoto: async (photoId: string) => {
      const photo = doc.photos.find((p) => p.id === photoId);
      if (!photo) return;
      const sketches = sketchesOf(new Set([photoId]));
      await mutate(photo.kind === "base" ? "hiwo: Ausgangsfoto gelöscht" : "hiwo: Variante gelöscht", (d) => {
        d.photos = d.photos.filter((p) => p.id !== photoId);
        dropSketches(d, new Set([photoId]));
        // items of a deleted variant stay on the room's list
        d.shopping.forEach((s) => s.variant_id === photoId && (s.variant_id = null));
        if (d.home.cover_photo_id === photoId) d.home.cover_photo_id = null;
        touchRoom(d, photo.room_id);
      });
      await removeFile(conn, photo.path, photo.sha, "hiwo: Foto gelöscht").catch(() => {});
      await removeSketchFiles(sketches);
    },

    // -- shopping ------------------------------------------------------------
    /** A link pasted as the name works too: the name then comes from the shop page. */
    addShoppingItem: async (fd: FormData) => {
      const id = newId();
      let name = str(fd, "name");
      let url = str(fd, "url") || null;
      const nameIsLink = looksLikeUrl(name);
      if (nameIsLink) {
        url = url ?? normalizeUrl(name);
        name = hostname(normalizeUrl(name));
      }
      await mutate(`hiwo: ${name} auf die Liste`, (d) => {
        d.shopping.push({
          id,
          ...parseTarget(str(fd, "target")),
          name,
          price_cents: parsePrice(str(fd, "price")),
          note: str(fd, "note") || null,
          url,
          image_path: null,
          image_sha: null,
          image_url: null,
          status: "open",
          created_by: by,
          done_by: null,
          done_at: null,
          created_at: now(),
        });
      });
      // picture (and name) from the shop page, in the background: adding stays instant
      if (url) void fillFromLink(id, url, nameIsLink ? name : null);
    },

    updateShoppingItem: async (id: string, fd: FormData) => {
      const before = doc.shopping.find((x) => x.id === id);
      const url = str(fd, "url") ? normalizeUrl(str(fd, "url")) : null;
      await mutate("hiwo: Artikel bearbeitet", (d) => {
        const s = d.shopping.find((x) => x.id === id);
        if (!s) return;
        s.name = str(fd, "name") || s.name;
        Object.assign(s, parseTarget(str(fd, "target")));
        s.price_cents = parsePrice(str(fd, "price"));
        s.note = str(fd, "note") || null;
        if (s.url !== url) s.image_url = null;
        s.url = url;
      });
      if (url && url !== before?.url) void fillFromLink(id, url, null);
    },

    setShoppingDone: (id: string, done: boolean) =>
      mutate(done ? "hiwo: Artikel erledigt" : "hiwo: Artikel wieder offen", (d) => {
        const s = d.shopping.find((x) => x.id === id);
        if (!s) return;
        s.status = done ? "done" : "open";
        s.done_by = done ? by : null;
        s.done_at = done ? now() : null;
      }),

    deleteShoppingItem: async (id: string) => {
      const item = doc.shopping.find((s) => s.id === id);
      const sketches = sketchesOf(new Set([id]));
      await mutate("hiwo: Artikel gelöscht", (d) => {
        d.shopping = d.shopping.filter((s) => s.id !== id);
        dropSketches(d, new Set([id]));
      });
      if (item?.image_path) await removeFile(conn, item.image_path, item.image_sha, "hiwo: Produktfoto gelöscht").catch(() => {});
      await removeSketchFiles(sketches);
    },

    setShoppingImage: async (id: string, file: File) => {
      const old = doc.shopping.find((s) => s.id === id);
      const { blob } = await prepareImage(file, 1200);
      const path = `fotos/einkauf/${id}-${Date.now()}.jpg`;
      const { sha } = await track(uploadPhoto(conn, path, blob, "hiwo: Produktfoto hochgeladen"));
      await mutate("hiwo: Produktfoto gesetzt", (d) => {
        const s = d.shopping.find((x) => x.id === id);
        if (s) {
          s.image_path = path;
          s.image_sha = sha;
        }
      });
      if (old?.image_path) await removeFile(conn, old.image_path, old.image_sha, "hiwo: altes Produktfoto").catch(() => {});
    },

    // -- Lageplan --------------------------------------------------------------
    /** Saves the whole plan (rooms and doors) at once. */
    savePlan: (plan: { rooms: PlanRoom[]; doors: PlanDoor[] }) =>
      mutate("hiwo: Lageplan gespeichert", (d) => {
        d.plan = { rooms: plan.rooms, doors: plan.doors, updated_by: by, updated_at: now() };
      }),

    // -- sketches: drawn-on copies of a photo, the original stays -------------
    /** Saves the editor's result as a new sketch of `sourceId`; returns its id. */
    saveSketch: async (sourceId: string, blob: Blob, width: number, height: number) => {
      const id = newId();
      const path = `fotos/skizzen/${sourceId}/${id}.jpg`;
      const { sha } = await track(uploadPhoto(conn, path, blob, "hiwo: Skizze hochgeladen"));
      await mutate("hiwo: Skizze gespeichert", (d) => {
        (d.sketches ??= []).push({ id, source_id: sourceId, path, sha, width, height, created_by: by, created_at: now() });
      });
      return id;
    },

    deleteSketch: async (id: string) => {
      const sketch = doc.sketches?.find((k) => k.id === id);
      if (!sketch) return;
      await mutate("hiwo: Skizze gelöscht", (d) => {
        d.sketches = (d.sketches ?? []).filter((k) => k.id !== id);
      });
      await removeSketchFiles([sketch]);
    },
  };
}
