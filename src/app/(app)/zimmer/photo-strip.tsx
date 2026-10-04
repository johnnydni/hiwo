"use client";

import { useState, useTransition } from "react";
import { Star, Home, Trash2, Sparkles } from "lucide-react";
import { deletePhoto, setHomeCover, setRoomCover } from "@/lib/api";
import { useApp } from "@/components/app-context";
import { Sheet } from "@/components/sheet";
import { cx } from "@/components/ui";
import { AiSheet } from "@/components/ai-assistant";

type P = { id: string; url: string };

export function PhotoStrip({
  roomId,
  roomName,
  coverId,
  homeCoverId,
  photos,
}: {
  roomId: string;
  roomName: string;
  coverId: string | null;
  homeCoverId: string | null;
  photos: P[];
}) {
  const [open, setOpen] = useState<P | null>(null);
  const [ai, setAi] = useState(false);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const app = useApp();

  const close = () => {
    setOpen(null);
    setConfirmDelete(false);
  };
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      close();
      // home cover lives in the app context
      await app.refresh();
    });

  return (
    <>
      {photos.map((p) => (
        <button
          key={p.id}
          onClick={() => setOpen(p)}
          className="relative h-24 w-32 shrink-0 overflow-hidden rounded-[16px] bg-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
          {p.id === coverId && (
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium">
              Titelbild
            </span>
          )}
        </button>
      ))}

      <Sheet open={!!open} onClose={close}>
        {open && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.url} alt="" className="max-h-[55dvh] w-full rounded-image object-contain bg-line" />
            <div className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
              <Action
                icon={<Sparkles size={18} strokeWidth={1.6} />}
                accent
                onClick={() => {
                  close();
                  setAi(true);
                }}
              >
                Mit KI verändern
              </Action>
              <Action
                icon={<Star size={18} strokeWidth={1.6} />}
                disabled={pending || open.id === coverId}
                onClick={() => run(() => setRoomCover(roomId, open.id))}
              >
                {open.id === coverId ? "Ist das Titelbild" : "Als Titelbild festlegen"}
              </Action>
              <Action
                icon={<Home size={18} strokeWidth={1.6} />}
                disabled={pending || open.id === homeCoverId}
                onClick={() => run(() => setHomeCover(app, open.id))}
              >
                {open.id === homeCoverId ? "Ist das Wohnungsbild" : "Als Bild der Wohnung"}
              </Action>
              <Action
                icon={<Trash2 size={18} strokeWidth={1.6} />}
                danger
                disabled={pending}
                onClick={() => (confirmDelete ? run(() => deletePhoto(open.id)) : setConfirmDelete(true))}
              >
                {confirmDelete ? "Wirklich löschen?" : "Foto löschen"}
              </Action>
            </div>
          </div>
        )}
      </Sheet>
      <AiSheet
        open={ai}
        onClose={() => setAi(false)}
        roomName={roomName}
        suggestions={["Mehr Holz", "Japandi", "Andere Couch", "Wandfarbe ändern", "Mehr Stauraum"]}
      />
    </>
  );
}

function Action({
  icon,
  children,
  onClick,
  disabled,
  danger,
  accent,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex w-full items-center gap-3 py-3.5 text-left text-[15px] disabled:opacity-50",
        danger && "text-terracotta",
        accent && "text-terracotta",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
