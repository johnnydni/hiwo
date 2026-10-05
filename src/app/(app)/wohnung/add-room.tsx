"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActions } from "@/components/use-actions";
import { Sheet } from "@/components/sheet";
import { Button, Input } from "@/components/ui";

const SUGGESTIONS = ["Wohnzimmer", "Schlafzimmer", "Küche", "Badezimmer", "Arbeitszimmer", "Kinderzimmer", "Flur", "Balkon"];

function AddRoomSheet({ open, onClose, existing }: { open: boolean; onClose: () => void; existing: string[] }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { createRoom } = useActions();
  const router = useRouter();
  const free = SUGGESTIONS.filter((s) => !existing.includes(s));
  return (
    <Sheet open={open} onClose={onClose} title="Zimmer hinzufügen">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          const id = await createRoom(name);
          router.push(`/zimmer?id=${id}`);
        }}
        className="space-y-4"
      >
        <Input name="name" placeholder="Wie heißt das Zimmer?" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        {free.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {free.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className="rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] hover:border-ink/30"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <Button className="w-full" disabled={busy || !name.trim()}>
          Zimmer hinzufügen
        </Button>
      </form>
    </Sheet>
  );
}

export function AddRoomButton({ existing, initiallyOpen, big }: { existing: string[]; initiallyOpen?: boolean; big?: boolean }) {
  const [open, setOpen] = useState(!!initiallyOpen);
  return (
    <>
      {big ? (
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} /> Zimmer hinzufügen
        </Button>
      ) : (
        <button onClick={() => setOpen(true)} aria-label="Zimmer hinzufügen" className="-mr-3 flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5">
          <Plus size={22} strokeWidth={1.6} />
        </button>
      )}
      <AddRoomSheet open={open} onClose={() => setOpen(false)} existing={existing} />
    </>
  );
}

export function AddRoomTile({ existing }: { existing: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="block text-left">
        <div className="flex aspect-[4/3] items-center justify-center rounded-image border border-dashed border-ink/15 text-muted transition hover:border-ink/30 hover:text-ink">
          <Plus size={24} strokeWidth={1.4} />
        </div>
        <p className="mt-2 text-[15px] text-muted">Zimmer hinzufügen</p>
      </button>
      <AddRoomSheet open={open} onClose={() => setOpen(false)} existing={existing} />
    </>
  );
}
