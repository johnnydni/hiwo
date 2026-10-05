"use client";

// Choosing a product to place into a photo in the image editor: a picture from
// the shopping lists (this variant's first) or one straight from the device.

import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useApp } from "./app-context";
import { ItemThumb } from "./item-thumb";
import { cx } from "./ui";
import { PRODUCT_SIDE, toCanvas } from "@/lib/cutout";
import { photoUrl } from "@/lib/store";
import type { ShoppingItem } from "@/lib/types";

export type PickContext = { roomId: string | null; variantId: string | null };

export function ProductPicker({
  context,
  onPick,
  onClose,
}: {
  context?: PickContext;
  onPick: (canvas: HTMLCanvasElement, name: string) => void;
  onClose: () => void;
}) {
  const { doc, conn } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rank = (i: ShoppingItem) =>
    context?.variantId && i.variant_id === context.variantId ? 0 : context?.roomId && i.room_id === context.roomId ? 1 : 2;
  const items = doc.shopping
    .filter((i) => i.image_path || i.image_url)
    .sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at));

  async function pickItem(item: ShoppingItem) {
    setBusy(item.id);
    setError(null);
    try {
      const img = item.image_path ? await load(await photoUrl(conn, item.image_path)) : await loadShopImage(item.image_url!);
      onPick(toCanvas(img), item.name);
    } catch {
      setError(
        item.image_path
          ? "Das Foto konnte nicht geladen werden."
          : "Der Shop gibt sein Bild nicht zum Bearbeiten frei. Speichere es aufs Gerät und wähle es oben aus, oder lade es beim Artikel als eigenes Foto hoch.",
      );
    }
    setBusy(null);
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setBusy("file");
    setError(null);
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const c = toCanvas(bmp);
      bmp.close();
      onPick(c, file.name);
    } catch {
      setError("Dieses Bildformat kann der Browser nicht öffnen. Versuch es mit JPG oder PNG.");
    }
    setBusy(null);
  }

  return (
    <div className="animate-fade-in absolute inset-0 z-10 flex flex-col bg-[#161412]/95 pt-[env(safe-area-inset-top)] backdrop-blur" role="dialog" aria-label="Produkt einfügen">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <h2 className="text-[17px] font-medium">Produkt einfügen</h2>
        <button onClick={onClose} aria-label="Schließen" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
          <X size={20} strokeWidth={1.6} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <label
          className={cx(
            "flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/30 text-[15px] hover:bg-white/5",
            busy && "pointer-events-none opacity-50",
          )}
        >
          {busy === "file" ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} strokeWidth={1.6} />}
          Bild vom Gerät
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
        </label>
        <p className="mt-2 text-[13px] text-white/50">Am besten ein Produktfoto auf weißem oder schwarzem Grund, z.B. ein Screenshot aus dem Shop.</p>
        {error && <p className="mt-3 rounded-xl bg-[#ff8b7a]/15 px-3 py-2 text-[13px] text-[#ffb3a7]">{error}</p>}

        <h3 className="mt-6 mb-2 text-[13px] tracking-wide text-white/50 uppercase">Aus den Einkaufslisten</h3>
        {items.length === 0 ? (
          <p className="text-[14px] text-white/60">Noch keine Artikel mit Bild. Füge einen Shop-Link oder ein Produktfoto zu einem Artikel hinzu.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((i) => (
              <button
                key={i.id}
                onClick={() => pickItem(i)}
                disabled={!!busy}
                className="relative text-left disabled:opacity-60"
                aria-label={`${i.name} einfügen`}
              >
                <ItemThumb item={i} className="aspect-square rounded-xl" />
                {busy === i.id && (
                  <span className="absolute inset-x-0 top-0 flex aspect-square items-center justify-center rounded-xl bg-black/40">
                    <Loader2 size={20} className="animate-spin" />
                  </span>
                )}
                <span className="mt-1 block truncate text-[12px] text-white/70">{i.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function load(src: string, cors = false) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    if (cors) i.crossOrigin = "anonymous";
    i.referrerPolicy = "no-referrer";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/**
 * Shop pictures can only be drawn on a canvas if the shop allows it (CORS).
 * Many image CDNs do; for the rest the picture goes through images.weserv.nl,
 * a free image proxy that does.
 */
async function loadShopImage(url: string) {
  try {
    return await load(url, true);
  } catch {
    return load(`https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${PRODUCT_SIDE}&h=${PRODUCT_SIDE}&fit=inside`, true);
  }
}
