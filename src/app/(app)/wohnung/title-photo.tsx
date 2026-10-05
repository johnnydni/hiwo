"use client";

import { Camera, Loader2 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { useActions } from "@/components/use-actions";
import { usePickPhoto } from "@/components/pick-photo";
import { Photo } from "@/components/photo";
import { homeCoverPath } from "@/lib/selectors";

/** The home's title picture across the top; tap it to pick a new one. */
export function TitlePhoto() {
  const { doc } = useApp();
  const { setHomeTitlePhoto } = useActions();
  const picker = usePickPhoto(setHomeTitlePhoto);
  const path = homeCoverPath(doc);

  return (
    <div className="md:pt-10">
      <button
        onClick={picker.pick}
        disabled={picker.busy}
        aria-label="Titelbild ändern"
        className="relative block w-full overflow-hidden md:rounded-image"
      >
        {path ? (
          <Photo path={path} alt={doc.home.name} className="aspect-[4/3] md:aspect-[21/9]" />
        ) : (
          <span className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 border-b border-dashed border-ink/15 bg-card px-8 text-center md:aspect-[21/9] md:rounded-image md:border">
            <Camera size={30} strokeWidth={1.3} className="text-muted" />
            <span className="font-serif text-[24px] leading-snug">Titelbild für {doc.home.name}</span>
            <span className="max-w-[16rem] text-[14px] text-muted">Ein Foto, das eure Wohnung zeigt, von außen oder euer Lieblingsblick.</span>
          </span>
        )}
        {picker.busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/50">
            <Loader2 className="animate-spin" />
          </span>
        )}
      </button>
      {picker.input}
      {picker.error && <p className="px-4 pt-2 text-[13px] text-terracotta md:px-0">{picker.error}</p>}
    </div>
  );
}
