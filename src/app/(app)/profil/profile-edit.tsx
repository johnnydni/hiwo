"use client";

import { useState, useTransition } from "react";
import { updateHome, updateProfile } from "@/lib/api";
import { useApp } from "@/components/app-context";
import { Sheet } from "@/components/sheet";
import { Button, Input, Label } from "@/components/ui";

export function ProfileEdit({ name, homeName, city }: { name: string; homeName: string; city: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const app = useApp();
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
              await Promise.all([updateProfile(app, fd), updateHome(app, fd)]);
              await app.refresh();
              setOpen(false);
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
          <Button className="w-full" disabled={pending}>Speichern</Button>
        </form>
      </Sheet>
    </>
  );
}
