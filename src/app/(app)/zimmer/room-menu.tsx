"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActions } from "@/components/use-actions";
import { Sheet } from "@/components/sheet";
import { Button, Input } from "@/components/ui";

export function RoomMenu({ roomId, name }: { roomId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const { deleteRoom, renameRoom } = useActions();
  const router = useRouter();
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Mehr" className="-mr-3 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-ink/5">
        <MoreHorizontal size={22} strokeWidth={1.6} />
      </button>
      <Sheet open={open} onClose={() => { setOpen(false); setConfirm(false); }} title="Zimmer bearbeiten">
        <div className="space-y-3">
          <Input value={value} onChange={(e) => setValue(e.target.value)} aria-label="Name" />
          <Button
            className="w-full"
            disabled={pending || !value.trim() || value === name}
            onClick={() =>
              start(async () => {
                await renameRoom(roomId, value);
                setOpen(false);
              })
            }
          >
            Speichern
          </Button>
          <button
            onClick={() => (confirm
                ? start(async () => {
                    router.push("/wohnung");
                    await deleteRoom(roomId);
                  })
                : setConfirm(true))}
            disabled={pending}
            className="w-full py-3 text-[14px] text-terracotta"
          >
            {confirm ? "Zimmer mit allen Fotos und Varianten wirklich löschen?" : "Zimmer löschen"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
