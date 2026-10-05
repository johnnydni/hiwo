"use client";

import { useState, useTransition } from "react";
import { Camera, Home, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { useActions } from "@/components/use-actions";
import { usePickPhoto } from "@/components/pick-photo";
import { Photo } from "@/components/photo";
import { Sheet } from "@/components/sheet";
import { cx } from "@/components/ui";
import type { RoomPhoto } from "@/lib/types";

/** The room as it is today. One photo; replacing it keeps the variants. */
export function BasePhoto({ roomId, roomName, photo }: { roomId: string; roomName: string; photo: RoomPhoto | null }) {
  const { doc } = useApp();
  const { setBasePhoto, setHomeCover, deletePhoto } = useActions();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const picker = usePickPhoto(async (file) => {
    setOpen(false);
    await setBasePhoto(roomId, file);
  });
  const close = () => {
    setOpen(false);
    setConfirm(false);
  };

  if (!photo)
    return (
      <>
        <button
          onClick={picker.pick}
          disabled={picker.busy}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 border-b border-dashed border-ink/15 bg-card px-8 text-center md:aspect-[21/9] md:rounded-image md:border"
        >
          {picker.busy ? (
            <Loader2 className="animate-spin text-muted" />
          ) : (
            <Camera size={30} strokeWidth={1.3} className="text-muted" />
          )}
          <span className="font-serif text-[24px] leading-snug">So sieht {roomName} jetzt aus</span>
          <span className="max-w-[16rem] text-[14px] text-muted">
            Fotografier den Raum im Ist-Zustand. Darunter sammelt ihr dann Varianten.
          </span>
          {picker.error && <span className="text-[13px] text-terracotta">{picker.error}</span>}
        </button>
        {picker.input}
      </>
    );

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative block w-full" aria-label="Ausgangsfoto">
        <Photo path={photo.path} alt={roomName} className="aspect-[4/3] md:aspect-[21/9] md:rounded-image" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[12px] font-medium backdrop-blur">
          Ausgangszustand
        </span>
        {picker.busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/50 md:rounded-image">
            <Loader2 className="animate-spin" />
          </span>
        )}
      </button>
      {picker.input}
      {picker.error && <p className="px-4 pt-2 text-[13px] text-terracotta">{picker.error}</p>}
      <Sheet open={open} onClose={close} title="Ausgangsfoto">
        <div className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
          <Action icon={<RefreshCw size={18} strokeWidth={1.6} />} onClick={picker.pick} disabled={picker.busy}>
            Foto ersetzen
          </Action>
          <Action
            icon={<Home size={18} strokeWidth={1.6} />}
            disabled={pending || doc.home.cover_photo_id === photo.id}
            onClick={() => start(async () => { await setHomeCover(photo.id).catch(() => {}); close(); })}
          >
            {doc.home.cover_photo_id === photo.id ? "Ist das Bild der Wohnung" : "Als Bild der Wohnung"}
          </Action>
          <Action
            icon={<Trash2 size={18} strokeWidth={1.6} />}
            danger
            disabled={pending}
            onClick={() =>
              confirm ? start(async () => { await deletePhoto(photo.id).catch(() => {}); close(); }) : setConfirm(true)
            }
          >
            {confirm ? "Wirklich löschen? Varianten bleiben." : "Foto löschen"}
          </Action>
        </div>
      </Sheet>
    </>
  );
}

export function Action({
  icon,
  children,
  onClick,
  disabled,
  danger,
  loading,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex w-full items-center gap-3 py-3.5 text-left text-[15px] disabled:opacity-50",
        danger && "text-terracotta",
      )}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
