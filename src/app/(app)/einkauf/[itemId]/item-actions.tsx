"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { deleteShoppingItem, setShoppingDone, updateShoppingItem } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/image";
import type { ShoppingItem } from "@/lib/types";
import { Sheet } from "@/components/sheet";
import { Button, Input, Label, Textarea } from "@/components/ui";

export function ItemActions({ item, rooms }: { item: ShoppingItem; rooms: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const done = item.status === "done";
  return (
    <div className="mt-6 space-y-3">
      <Button
        className="w-full"
        variant={done ? "secondary" : "primary"}
        disabled={pending}
        onClick={() => start(() => setShoppingDone(item.id, !done))}
      >
        {done ? <RotateCcw size={17} /> : <Check size={17} />}
        {done ? "Wieder auf die Liste" : "Als erledigt"}
      </Button>
      <Button className="w-full" variant="secondary" onClick={() => setEditing(true)}>
        Bearbeiten
      </Button>

      <Sheet open={editing} onClose={() => { setEditing(false); setConfirm(false); }} title="Artikel bearbeiten">
        <form
          action={(fd) => start(async () => { await updateShoppingItem(item.id, fd); setEditing(false); })}
          className="space-y-4"
        >
          <Input name="name" defaultValue={item.name} required />
          <label className="block">
            <Label>Für</Label>
            <select
              name="room_id"
              defaultValue={item.room_id ?? ""}
              className="h-12 w-full rounded-input border border-line bg-card px-4 text-[15px] outline-none"
            >
              <option value="">Gesamte Wohnung</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>Preis</Label>
            <Input
              name="price"
              inputMode="decimal"
              defaultValue={item.price_cents != null ? (item.price_cents / 100).toFixed(2).replace(".", ",") : ""}
              placeholder="z.B. 89,90"
            />
          </label>
          <label className="block">
            <Label>Link</Label>
            <Input name="url" type="url" defaultValue={item.url ?? ""} placeholder="https://" />
          </label>
          <label className="block">
            <Label>Notiz</Label>
            <Textarea name="note" defaultValue={item.note ?? ""} />
          </label>
          <Button className="w-full" disabled={pending}>Speichern</Button>
          <button
            type="button"
            onClick={() => (confirm ? start(() => deleteShoppingItem(item.id)) : setConfirm(true))}
            className="w-full py-2 text-[14px] text-terracotta"
          >
            {confirm ? "Wirklich löschen?" : "Artikel löschen"}
          </button>
        </form>
      </Sheet>
    </div>
  );
}

export function ItemImage({ homeId, itemId, url }: { homeId: string; itemId: string; url: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    const supabase = createClient();
    const { blob } = await prepareImage(file, 1400);
    const path = `${homeId}/shopping/${itemId}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("photos").upload(path, blob, { contentType: blob.type || "image/jpeg" });
    if (!error) {
      const { data: old } = await supabase.from("shopping_items").select("image_path").eq("id", itemId).single();
      await supabase.from("shopping_items").update({ image_path: path }).eq("id", itemId);
      if (old?.image_path) await supabase.storage.from("photos").remove([old.image_path]);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => input.current?.click()}
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-image bg-line"
        aria-label={url ? "Produktfoto ändern" : "Produktfoto hinzufügen"}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 text-[14px] text-muted">
            {busy ? <Loader2 className="animate-spin" /> : <ImagePlus size={26} strokeWidth={1.4} />}
            Produktfoto hinzufügen
          </span>
        )}
        {url && busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/50">
            <Loader2 className="animate-spin" />
          </span>
        )}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files)} />
    </>
  );
}
