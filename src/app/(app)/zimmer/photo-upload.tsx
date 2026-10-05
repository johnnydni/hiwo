"use client";

import { useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useActions } from "@/components/use-actions";
import { Button } from "@/components/ui";

function usePhotoUpload(roomId: string) {
  const { addPhotos } = useActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const failed = await addPhotos(roomId, Array.from(files));
    setBusy(false);
    if (failed) setError(failed === 1 ? "Ein Foto konnte nicht gespeichert werden." : `${failed} Fotos konnten nicht gespeichert werden.`);
  }
  return { upload, busy, error };
}

export function PhotoUploadTile({ roomId }: { roomId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = usePhotoUpload(roomId);
  return (
    <>
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label="Foto hinzufügen"
        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[16px] border border-dashed border-ink/20 bg-card text-muted transition hover:text-ink"
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : <Plus size={22} strokeWidth={1.4} />}
      </button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      {error && <p className="self-center text-[13px] text-terracotta">{error}</p>}
    </>
  );
}

export function PhotoUploadButton({ roomId }: { roomId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = usePhotoUpload(roomId);
  return (
    <>
      <Button onClick={() => input.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        Foto hinzufügen
      </Button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      {error && <p className="mt-2 text-[13px] text-terracotta">{error}</p>}
    </>
  );
}
