"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/image";
import { Button, cx } from "@/components/ui";

export function usePhotoUpload(homeId: string, roomId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const supabase = createClient();
    const list = Array.from(files);
    setBusy(list.length);
    for (const file of list) {
      const { blob, width, height } = await prepareImage(file);
      const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${homeId}/${roomId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, blob, { contentType: blob.type || "image/jpeg", cacheControl: "31536000" });
      if (upErr) {
        setError("Ein Foto konnte nicht hochgeladen werden.");
      } else {
        const { error: dbErr } = await supabase
          .from("room_photos")
          .insert({ home_id: homeId, room_id: roomId, storage_path: path, width: width || null, height: height || null });
        if (dbErr) {
          await supabase.storage.from("photos").remove([path]);
          setError("Ein Foto konnte nicht gespeichert werden.");
        }
      }
      setBusy((n) => n - 1);
    }
    router.refresh();
  }
  return { upload, busy, error };
}

export function PhotoUploadTile({ homeId, roomId }: { homeId: string; roomId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = usePhotoUpload(homeId, roomId);
  return (
    <>
      <button
        onClick={() => input.current?.click()}
        disabled={busy > 0}
        aria-label="Foto hinzufügen"
        className={cx(
          "flex h-24 w-24 shrink-0 items-center justify-center rounded-[16px] border border-dashed border-ink/20 bg-card text-muted transition hover:text-ink",
        )}
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : <Plus size={22} strokeWidth={1.4} />}
      </button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      {error && <p className="self-center text-[13px] text-terracotta">{error}</p>}
    </>
  );
}

export function PhotoUploadButton({ homeId, roomId }: { homeId: string; roomId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = usePhotoUpload(homeId, roomId);
  return (
    <>
      <Button onClick={() => input.current?.click()} disabled={busy > 0}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        Foto hinzufügen
      </Button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      {error && <p className="mt-2 text-[13px] text-terracotta">{error}</p>}
    </>
  );
}
