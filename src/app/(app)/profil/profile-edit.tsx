"use client";

import { useState, useTransition } from "react";
import { useActions } from "@/components/use-actions";
import { Sheet } from "@/components/sheet";
import { Button, Input, Label } from "@/components/ui";

export function ProfileEdit({ name, homeName, city }: { name: string; homeName: string; city: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { renameMe, updateHome } = useActions();
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-[14px] text-muted hover:text-ink">
        Bearbeiten
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Profil & Wohnung">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              try {
                // one after another: both write hiwo.json
                await renameMe(String(fd.get("display_name") ?? ""));
                await updateHome(fd);
                setOpen(false);
              } catch (err) {
                setError((err as Error).message);
              }
            });
          }}
          className="space-y-4"
        >
          <label className="block">
            <Label>Dein Name</Label>
            <Input name="display_name" defaultValue={name} />
          </label>
          <label className="block">
            <Label>Name der Wohnung</Label>
            <Input name="name" defaultValue={homeName} />
          </label>
          <label className="block">
            <Label>Stadt</Label>
            <Input name="city" defaultValue={city} />
          </label>
          {error && <p className="text-[13px] text-terracotta">{error}</p>}
          <Button className="w-full" loading={pending}>Speichern</Button>
        </form>
      </Sheet>
    </>
  );
}
