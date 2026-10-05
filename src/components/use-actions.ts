"use client";

// Every user action is one change to hiwo.json (= one commit in the data repo).

import { useApp } from "./app-context";
import { parsePrice } from "@/lib/format";
import { newId, now } from "@/lib/id";
import { prepareImage } from "@/lib/image";
import { removeFile, uploadPhoto } from "@/lib/store";
import type { HiwoDoc } from "@/lib/types";

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function touchRoom(doc: HiwoDoc, roomId: string | null) {
  const room = doc.rooms.find((r) => r.id === roomId);
  if (room) room.updated_at = now();
}

export function useActions() {
  const { conn, me, doc, mutate } = useApp();
  const by = me.id;

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
          cover_photo_id: null,
          current_version_id: null,
          position: d.rooms.length,
          created_by: by,
          created_at: now(),
          updated_at: now(),
        });
      });
      return id;
    },

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
      await mutate("hiwo: Zimmer gelöscht", (d) => {
        const photoIds = new Set(d.photos.filter((p) => p.room_id === roomId).map((p) => p.id));
        d.rooms = d.rooms.filter((r) => r.id !== roomId);
        d.photos = d.photos.filter((p) => p.room_id !== roomId);
        d.furniture = d.furniture.filter((f) => f.room_id !== roomId);
        d.versions = d.versions.filter((v) => v.room_id !== roomId);
        d.generations = d.generations.filter((g) => g.room_id !== roomId);
        d.shopping.forEach((s) => s.room_id === roomId && (s.room_id = null));
        if (d.home.cover_photo_id && photoIds.has(d.home.cover_photo_id)) d.home.cover_photo_id = null;
      });
      // files last: if this fails, the doc is still consistent
      for (const p of photos) await removeFile(conn, p.path, p.sha, "hiwo: Foto gelöscht").catch(() => {});
    },

    // -- photos --------------------------------------------------------------
    addPhotos: async (roomId: string, files: File[]) => {
      let failed = 0;
      for (const file of files) {
        try {
          const { blob, width, height } = await prepareImage(file, 1800);
          const id = newId();
          const path = `fotos/${roomId}/${id}.jpg`;
          const { sha } = await uploadPhoto(conn, path, blob, "hiwo: Foto hochgeladen");
          await mutate("hiwo: Foto hinzugefügt", (d) => {
            d.photos.push({
              id,
              room_id: roomId,
              path,
              sha,
              width: width || null,
              height: height || null,
              created_by: by,
              created_at: now(),
            });
            touchRoom(d, roomId);
          });
        } catch {
          failed++;
        }
      }
      return failed;
    },

    setRoomCover: (roomId: string, photoId: string) =>
      mutate("hiwo: Titelbild gesetzt", (d) => {
        const r = d.rooms.find((x) => x.id === roomId);
        if (r) r.cover_photo_id = photoId;
      }),

    setHomeCover: (photoId: string) =>
      mutate("hiwo: Wohnungsbild gesetzt", (d) => {
        d.home.cover_photo_id = photoId;
      }),

    deletePhoto: async (photoId: string) => {
      const photo = doc.photos.find((p) => p.id === photoId);
      if (!photo) return;
      await mutate("hiwo: Foto gelöscht", (d) => {
        d.photos = d.photos.filter((p) => p.id !== photoId);
        d.rooms.forEach((r) => r.cover_photo_id === photoId && (r.cover_photo_id = null));
        if (d.home.cover_photo_id === photoId) d.home.cover_photo_id = null;
        touchRoom(d, photo.room_id);
      });
      await removeFile(conn, photo.path, photo.sha, "hiwo: Foto gelöscht").catch(() => {});
    },

    // -- furniture -----------------------------------------------------------
    addFurniture: (roomId: string, name: string) =>
      mutate(`hiwo: ${name.trim()} hinzugefügt`, (d) => {
        d.furniture.push({
          id: newId(),
          room_id: roomId,
          name: name.trim(),
          note: null,
          keep: true,
          position: d.furniture.filter((f) => f.room_id === roomId).length,
          created_by: by,
          created_at: now(),
        });
        touchRoom(d, roomId);
      }),

    deleteFurniture: (id: string) =>
      mutate("hiwo: Möbel entfernt", (d) => {
        const f = d.furniture.find((x) => x.id === id);
        d.furniture = d.furniture.filter((x) => x.id !== id);
        if (f) touchRoom(d, f.room_id);
      }),

    // -- shopping ------------------------------------------------------------
    addShoppingItem: (fd: FormData) =>
      mutate(`hiwo: ${str(fd, "name")} auf die Liste`, (d) => {
        d.shopping.push({
          id: newId(),
          room_id: str(fd, "room_id") || null,
          name: str(fd, "name"),
          price_cents: parsePrice(str(fd, "price")),
          note: str(fd, "note") || null,
          url: str(fd, "url") || null,
          image_path: null,
          image_sha: null,
          status: "open",
          created_by: by,
          done_by: null,
          done_at: null,
          created_at: now(),
        });
      }),

    updateShoppingItem: (id: string, fd: FormData) =>
      mutate("hiwo: Artikel bearbeitet", (d) => {
        const s = d.shopping.find((x) => x.id === id);
        if (!s) return;
        s.name = str(fd, "name") || s.name;
        s.room_id = str(fd, "room_id") || null;
        s.price_cents = parsePrice(str(fd, "price"));
        s.note = str(fd, "note") || null;
        s.url = str(fd, "url") || null;
      }),

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
      await mutate("hiwo: Artikel gelöscht", (d) => {
        d.shopping = d.shopping.filter((s) => s.id !== id);
      });
      if (item?.image_path) await removeFile(conn, item.image_path, item.image_sha, "hiwo: Produktfoto gelöscht").catch(() => {});
    },

    setShoppingImage: async (id: string, file: File) => {
      const old = doc.shopping.find((s) => s.id === id);
      const { blob } = await prepareImage(file, 1200);
      const path = `fotos/einkauf/${id}-${Date.now()}.jpg`;
      const { sha } = await uploadPhoto(conn, path, blob, "hiwo: Produktfoto hochgeladen");
      await mutate("hiwo: Produktfoto gesetzt", (d) => {
        const s = d.shopping.find((x) => x.id === id);
        if (s) {
          s.image_path = path;
          s.image_sha = sha;
        }
      });
      if (old?.image_path) await removeFile(conn, old.image_path, old.image_sha, "hiwo: altes Produktfoto").catch(() => {});
    },
  };
}
