"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { targetValue, useActions } from "@/components/use-actions";
import { TargetSelect } from "@/components/target-select";
import { usePhotoUrl } from "@/components/app-context";
import { PhotoTools } from "@/components/photo-tools";
import type { ShoppingItem } from "@/lib/types";
import { Sheet } from "@/components/sheet";
import { Button, Input, Label, Textarea, cx } from "@/components/ui";

export function ItemActions({ item }: { item: ShoppingItem }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions = useActions();
  const router = useRouter();
  const done = item.status === "done";
  return (
    <div className="mt-6 space-y-3">
      <Button
        className="w-full"
        variant={done ? "secondary" : "primary"}
        loading={pending}
        onClick={() =>
          start(async () => {
            await actions.setShoppingDone(item.id, !done).catch((e) => setError(e.message));
          })
        }
      >
        {done ? <RotateCcw size={17} /> : <Check size={17} />}
        {done ? "Wieder auf die Liste" : "Als erledigt"}
      </Button>
      {error && <p className="text-center text-[13px] text-terracotta">{error}</p>}
      <Button className="w-full" variant="secondary" onClick={() => setEditing(true)}>
        Bearbeiten
      </Button>

      <Sheet open={editing} onClose={() => { setEditing(false); setConfirm(false); }} title="Artikel bearbeiten">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              try {
                await actions.updateShoppingItem(item.id, fd);
                setEditing(false);
              } catch (err) {
                setError((err as Error).message);
              }
            });
          }}
          className="space-y-4"
        >
          <Input name="name" defaultValue={item.name} required />
          <TargetSelect defaultValue={targetValue(item)} />
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
          <Button className="w-full" loading={pending}>Speichern</Button>
          <button
            type="button"
            onClick={() => (confirm
                ? start(async () => {
                    router.push("/einkauf");
                    await actions.deleteShoppingItem(item.id).catch(() => {});
                  })
                : setConfirm(true))}
            className="w-full py-2 text-[14px] text-terracotta"
          >
            {confirm ? "Wirklich löschen?" : "Artikel löschen"}
          </button>
        </form>
      </Sheet>
    </div>
  );
}

export function ItemImage({ itemId, path, remote }: { itemId: string; path: string | null; remote?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const { setShoppingImage } = useActions();
  const own = usePhotoUrl(path);
  const [remoteBroken, setRemoteBroken] = useState(false);
  const fromLink = !path && remote && !remoteBroken ? remote : null;
  const url = own ?? fromLink;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      await setShoppingImage(itemId, file);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => input.current?.click()}
          className={cx(
            "relative block w-full overflow-hidden rounded-image",
            // without a photo a slim drop zone is enough; most items never get one
            path ? (url ? "aspect-[4/3] bg-white" : "aspect-[4/3] bg-line") : fromLink ? "aspect-[4/3] bg-white" : "h-24 border border-dashed border-ink/15 bg-card md:aspect-[4/3] md:h-auto",
          )}
          aria-label={url ? "Produktfoto ändern" : "Produktfoto hinzufügen"}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => fromLink && setRemoteBroken(true)}
              className="animate-fade-in h-full w-full object-contain p-[5%]"
            />
          ) : path ? (
            <span className="animate-shimmer block h-full w-full bg-line" />
          ) : (
            <span className="flex h-full items-center justify-center gap-2 text-[14px] text-muted md:flex-col">
              {busy ? <Loader2 className="animate-spin" /> : <ImagePlus size={22} strokeWidth={1.4} />}
              Produktfoto hinzufügen
            </span>
          )}
          {fromLink && !busy && (
            <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-3 py-1 text-[12px] text-white">
              Bild aus dem Link · eigenes Foto?
            </span>
          )}
          {url && busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/50">
              <Loader2 className="animate-spin" />
            </span>
          )}
        </button>
        {/* only own photos: pictures hotlinked from a shop can't be drawn on and saved */}
        {path && own && <PhotoTools sourceId={itemId} path={path} />}
      </div>
      {failed && <p className="mt-2 text-center text-[13px] text-terracotta">Das Foto konnte nicht gespeichert werden.</p>}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files)} />
    </>
  );
}
