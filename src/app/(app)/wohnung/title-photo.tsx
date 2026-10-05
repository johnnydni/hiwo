"use client";

import { useState } from "react";
import { Camera, Check, ImagePlus, Loader2 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { useActions } from "@/components/use-actions";
import { usePickPhoto } from "@/components/pick-photo";
import { COVER_ARTS, CoverArt, HomeCover } from "@/components/cover-art";
import { Sheet } from "@/components/sheet";
import { cx } from "@/components/ui";
import { homeCover } from "@/lib/selectors";
import type { CoverArtId } from "@/lib/types";

/** The home's title picture across the top; tap it to upload a photo or pick a drawn one. */
export function TitlePhoto() {
  const { doc } = useApp();
  const { setHomeTitlePhoto, setHomeCoverArt } = useActions();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<CoverArtId | null>(null);
  const [artError, setArtError] = useState(false);
  const picker = usePickPhoto(async (file) => {
    setOpen(false);
    await setHomeTitlePhoto(file);
  });
  const cover = homeCover(doc);
  const chosen = cover && "art" in cover ? cover.art : null;
  const busy = picker.busy || !!saving;

  const pickArt = async (art: CoverArtId) => {
    setOpen(false);
    if (art === chosen) return;
    setSaving(art);
    setArtError(false);
    await setHomeCoverArt(art).catch(() => setArtError(true));
    setSaving(null);
  };

  return (
    <div className="md:pt-10">
      <button
        onClick={() => setOpen(true)}
        disabled={busy}
        aria-label="Titelbild ändern"
        className="relative block w-full overflow-hidden md:rounded-image"
      >
        {cover ? (
          <HomeCover cover={cover} alt={doc.home.name} className="aspect-[4/3] md:aspect-[21/9]" />
        ) : (
          <span className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 border-b border-dashed border-ink/15 bg-card px-8 text-center md:aspect-[21/9] md:rounded-image md:border">
            <Camera size={30} strokeWidth={1.3} className="text-muted" />
            <span className="font-serif text-[24px] leading-snug">Titelbild für {doc.home.name}</span>
            <span className="max-w-[17rem] text-[14px] text-muted">
              Ein Foto von eurer Wohnung, oder ein gezeichnetes Bild für die Phase, in der ihr gerade seid.
            </span>
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/50">
            <Loader2 className="animate-spin" />
          </span>
        )}
      </button>
      {picker.input}
      {(picker.error || artError) && (
        <p className="px-4 pt-2 text-[13px] text-terracotta md:px-0">{picker.error ?? "Das Titelbild konnte nicht gespeichert werden."}</p>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Titelbild">
        <button
          onClick={picker.pick}
          className="flex w-full items-center gap-3 rounded-card bg-card px-4 py-3.5 text-left text-[15px] shadow-soft"
        >
          <ImagePlus size={18} strokeWidth={1.6} className="text-muted" />
          Eigenes Foto hochladen
        </button>
        <p className="mt-5 mb-2 text-[13px] font-medium text-muted">Oder ein Bild für eure Phase</p>
        <div className="grid grid-cols-2 gap-3">
          {COVER_ARTS.map((a) => (
            <button key={a.id} onClick={() => pickArt(a.id)} className="group text-left" aria-pressed={a.id === chosen}>
              <span
                className={cx(
                  "relative block aspect-[4/3] overflow-hidden rounded-[14px] ring-offset-2 ring-offset-paper transition",
                  a.id === chosen ? "ring-2 ring-ink" : "ring-1 ring-line group-hover:ring-ink/30",
                )}
              >
                <CoverArt id={a.id} />
                {a.id === chosen && (
                  <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white">
                    <Check size={14} strokeWidth={2.2} />
                  </span>
                )}
              </span>
              <span className="mt-1.5 block text-[14px] font-medium">{a.name}</span>
              <span className="block text-[12px] text-muted">{a.hint}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
