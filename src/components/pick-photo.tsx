"use client";

import { useRef, useState } from "react";

/** A hidden file input plus busy/error state around an async upload. */
export function usePickPhoto(onFile: (file: File) => Promise<unknown>) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      hidden
      onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setBusy(true);
        setError(null);
        try {
          await onFile(file);
        } catch {
          setError("Das Foto konnte nicht gespeichert werden.");
        }
        setBusy(false);
      }}
    />
  );
  return { pick: () => ref.current?.click(), input, busy, error };
}
