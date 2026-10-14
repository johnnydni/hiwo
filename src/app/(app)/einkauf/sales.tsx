"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ImagePlus, Plus, X } from "lucide-react";
import { useActions } from "@/components/use-actions";
import { Photo } from "@/components/photo";
import { Sheet } from "@/components/sheet";
import { Button, EmptyState, Input, Label, Textarea, cx } from "@/components/ui";
import { formatPrice, plural } from "@/lib/format";
import { SALE_STATUS } from "@/lib/sales";
import type { SaleItem } from "@/lib/types";

/** Things from the home that are to be sold: photo cards, sold ones folded away. */
export function Sales({ items }: { items: SaleItem[] }) {
  const [adding, setAdding] = useState(false);
  const [showSold, setShowSold] = useState(false);
  const open = items.filter((i) => i.status !== "sold");
  const sold = items
    .filter((i) => i.status === "sold")
    .sort((a, b) => (b.sold_at ?? "").localeCompare(a.sold_at ?? ""));
  const sum = (list: SaleItem[]) => list.reduce((s, i) => s + (i.price_cents ?? 0), 0);

  return (
    <div>
      {open.length === 0 && !sold.length ? (
        <EmptyState title="Nichts zu verkaufen.">
          Was soll weg? Mit dem Plus unten rechts legst du es mit Fotos, Beschreibung und Preis an.
        </EmptyState>
      ) : (
        <>
          {open.length > 0 && (
            <p className="mb-3 px-1 text-[13px] text-muted">
              {plural(open.length, "Sache", "Sachen")}
              {sum(open) > 0 && ` · zusammen ${formatPrice(sum(open))}`}
            </p>
          )}
          <SaleGrid items={open} />
        </>
      )}

      {sold.length > 0 && (
        <section className="mt-7">
          <button onClick={() => setShowSold((v) => !v)} className="mb-3 text-[13px] font-medium text-muted">
            {showSold ? "Verkaufte ausblenden" : `Verkauft (${sold.length})`}
            {sum(sold) > 0 && ` · ${formatPrice(sum(sold))} eingenommen`}
          </button>
          {showSold && <SaleGrid items={sold} />}
        </section>
      )}

      {/* room for the floating button below the last card */}
      <div className="h-20" />
      <button
        onClick={() => setAdding(true)}
        aria-label="Zum Verkauf anlegen"
        className="animate-fade-up fixed right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-soft transition hover:bg-ink/90 active:scale-95 lg:right-10 lg:bottom-8"
      >
        <Plus size={26} strokeWidth={1.8} />
      </button>
      <AddSaleSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function SaleGrid({ items }: { items: SaleItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {items.map((it) => (
        <li key={it.id} className="animate-fade-up">
          <Link href={`/verkauf?id=${it.id}`} className="block overflow-hidden rounded-card bg-card shadow-soft">
            <div className="relative">
              <Photo path={it.photos[0]?.path} className={cx("aspect-square", it.status === "sold" && "opacity-60")} />
              {it.status !== "available" && (
                <span
                  className={cx(
                    "absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-medium",
                    it.status === "reserved" ? "bg-terracotta text-white" : "bg-ink/75 text-white",
                  )}
                >
                  {SALE_STATUS[it.status]}
                </span>
              )}
              {it.photos.length > 1 && (
                <span className="absolute right-2 bottom-2 rounded-full bg-ink/60 px-2 py-0.5 text-[11px] text-white">
                  {it.photos.length} Fotos
                </span>
              )}
            </div>
            <div className="px-3 py-2.5">
              <p className={cx("truncate text-[14px]", it.status === "sold" && "text-muted")}>{it.name}</p>
              <p className="text-[14px] font-semibold">{formatPrice(it.price_cents) ?? <span className="font-normal text-muted">ohne Preis</span>}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AddSaleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { addSaleItem } = useActions();
  const close = () => {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
    setError(null);
    form.current?.reset();
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title="Zum Verkauf anlegen">
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            try {
              await addSaleItem(fd, files.map((f) => f.file));
              close();
            } catch (err) {
              setError((err as Error).message || "Konnte nicht gespeichert werden.");
            }
          });
        }}
        className="space-y-4"
      >
        <PhotoPicker files={files} onChange={setFiles} />
        <Input name="name" placeholder="Was verkaufst du?" required />
        <label className="block">
          <Label>Preis</Label>
          <Input name="price" inputMode="decimal" placeholder="z.B. 40" />
        </label>
        <label className="block">
          <Label>Beschreibung</Label>
          <Textarea name="description" placeholder="Zustand, Maße, Abholung …" />
        </label>
        {error && <p className="text-center text-[13px] text-terracotta">{error}</p>}
        <Button className="w-full" loading={pending}>
          Speichern
        </Button>
      </form>
    </Sheet>
  );
}

/** Picked photos as small previews (not uploaded yet), plus a tile to add more. */
function PhotoPicker({
  files,
  onChange,
}: {
  files: { file: File; url: string }[];
  onChange: (f: { file: File; url: string }[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
      {files.map((f, i) => (
        <div key={f.url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[10px] bg-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="Foto entfernen"
            onClick={() => {
              URL.revokeObjectURL(f.url);
              onChange(files.filter((x) => x !== f));
            }}
            className="absolute top-0 right-0 flex h-8 w-8 items-center justify-center"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white">
              <X size={12} strokeWidth={2.4} />
            </span>
          </button>
          {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-ink/60 px-1.5 text-[10px] text-white">Titel</span>}
        </div>
      ))}
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cx(
          "flex h-20 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-dashed border-ink/20 bg-card text-[13px] text-muted",
          files.length ? "w-20 flex-col gap-1" : "w-full",
        )}
      >
        <ImagePlus size={20} strokeWidth={1.4} />
        {files.length ? "Mehr" : "Fotos hinzufügen"}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const picked = [...(e.target.files ?? [])].map((file) => ({ file, url: URL.createObjectURL(file) }));
          e.target.value = "";
          onChange([...files, ...picked]);
        }}
      />
    </div>
  );
}
