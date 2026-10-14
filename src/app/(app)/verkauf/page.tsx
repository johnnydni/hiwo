"use client";

import { Suspense, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useApp, useMemberName } from "@/components/app-context";
import { useActions } from "@/components/use-actions";
import { Photo } from "@/components/photo";
import { Sheet } from "@/components/sheet";
import { Avatar, Button, EmptyState, Input, Label, PageHeader, Textarea, buttonClass, cx } from "@/components/ui";
import { formatPrice, relativeDay } from "@/lib/format";
import { SALE_STATUS, adText, priceInput } from "@/lib/sales";
import type { SaleItem, SaleStatus } from "@/lib/types";

const BACK = "/einkauf?verkaufen=1";

export default function SalePage() {
  return (
    <Suspense>
      <Sale />
    </Suspense>
  );
}

function Sale() {
  const id = useSearchParams().get("id") ?? "";
  const { doc } = useApp();
  const nameOf = useMemberName();
  const item = doc.sales?.find((s) => s.id === id);
  if (!item)
    return (
      <EmptyState
        title="Das gibt es hier nicht mehr."
        action={
          <Link href={BACK} className={buttonClass("primary")}>
            Zu Verkaufen
          </Link>
        }
      />
    );
  const creator = item.created_by ? nameOf(item.created_by) : null;
  return (
    <div>
      <PageHeader back={BACK} title="" />
      <div className="-mt-6 px-4 md:grid md:grid-cols-2 md:items-start md:gap-10 md:px-0">
        <Gallery item={item} />
        <div>
          <div className="animate-fade-up mt-5 md:mt-0">
            <h1 className="font-serif text-[34px] leading-tight break-words">{item.name}</h1>
            <p className="mt-2 text-[20px] font-semibold">{formatPrice(item.price_cents) ?? <span className="text-[15px] font-normal text-muted">Noch kein Preis</span>}</p>
          </div>
          <StatusSwitch item={item} />
          {item.description && (
            <section className="mt-7">
              <h2 className="mb-2 text-[15px] font-semibold">Beschreibung</h2>
              <p className="rounded-card bg-card p-4 text-[14px] leading-relaxed whitespace-pre-line shadow-soft">{item.description}</p>
            </section>
          )}
          <SaleActions item={item} />
          <div className="mt-7 space-y-3 text-[13px] text-muted">
            {creator && (
              <p className="flex items-center gap-2">
                <Avatar name={creator} size={26} />
                Angelegt von {creator} · {relativeDay(item.created_at)}
              </p>
            )}
            {item.status === "sold" && item.sold_at && <p>Verkauft · {relativeDay(item.sold_at)}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Big photo plus a row of thumbnails; the first photo is the title picture. */
function Gallery({ item }: { item: SaleItem }) {
  const { addSalePhotos, removeSalePhoto, setSaleCover } = useActions();
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const current = item.photos.find((p) => p.path === selected) ?? item.photos[0];
  const run = async (work: Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work;
    } catch {
      setError("Das hat nicht geklappt. Bitte noch einmal versuchen.");
    }
    setBusy(false);
  };
  const add = () => input.current?.click();

  return (
    <div>
      {current ? (
        <div className="relative">
          <Photo path={current.path} className="aspect-[4/3] rounded-image" />
          <div className="absolute right-3 bottom-3 flex gap-2">
            {current !== item.photos[0] && (
              <button
                onClick={() => run(setSaleCover(item.id, current.path))}
                aria-label="Als Titelfoto"
                title="Als Titelfoto"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-soft backdrop-blur transition hover:bg-white active:scale-95"
              >
                <Star size={19} strokeWidth={1.6} />
              </button>
            )}
            <button
              onClick={() =>
                confirm
                  ? (setConfirm(false), setSelected(null), run(removeSalePhoto(item.id, current.path)))
                  : setConfirm(true)
              }
              onBlur={() => setConfirm(false)}
              aria-label="Foto löschen"
              className={cx(
                "flex h-11 items-center justify-center gap-2 rounded-full shadow-soft backdrop-blur transition active:scale-95",
                confirm ? "bg-terracotta px-4 text-[14px] text-white" : "w-11 bg-white/90 hover:bg-white",
              )}
            >
              <Trash2 size={19} strokeWidth={1.6} />
              {confirm && "Löschen?"}
            </button>
          </div>
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-image bg-white/50">
              <Loader2 className="animate-spin" />
            </span>
          )}
        </div>
      ) : (
        <button
          onClick={add}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-image border border-dashed border-ink/15 bg-card text-[14px] text-muted"
        >
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus size={24} strokeWidth={1.4} />}
          Fotos hinzufügen
        </button>
      )}
      {item.photos.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {item.photos.map((p, i) => (
            <button
              key={p.path}
              onClick={() => (setSelected(p.path), setConfirm(false))}
              aria-label={`Foto ${i + 1}`}
              aria-pressed={p === current}
              className={cx("shrink-0 rounded-[10px] border-2 transition", p === current ? "border-ink" : "border-transparent")}
            >
              <Photo path={p.path} className="h-16 w-16 rounded-[8px]" />
            </button>
          ))}
          <button
            onClick={add}
            aria-label="Fotos hinzufügen"
            className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[10px] border border-dashed border-ink/20 bg-card text-muted"
          >
            <ImagePlus size={20} strokeWidth={1.4} />
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-center text-[13px] text-terracotta">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) void run(addSalePhotos(item.id, files));
        }}
      />
    </div>
  );
}

function StatusSwitch({ item }: { item: SaleItem }) {
  const { setSaleStatus } = useActions();
  // the new status shows at once; the commit to GitHub follows
  const [status, show] = useOptimistic(item.status);
  const [, start] = useTransition();
  return (
    <div className="mt-5 flex rounded-full bg-line/70 p-1 text-[13px]" role="group" aria-label="Status">
      {(Object.keys(SALE_STATUS) as SaleStatus[]).map((s) => (
        <button
          key={s}
          aria-pressed={status === s}
          onClick={() =>
            start(async () => {
              show(s);
              await setSaleStatus(item.id, s).catch(() => {});
            })
          }
          className={cx(
            "flex-1 rounded-full py-2 transition",
            status === s ? (s === "reserved" ? "bg-terracotta text-white" : "bg-ink text-white") : "text-ink/70",
          )}
        >
          {SALE_STATUS[s]}
        </button>
      ))}
    </div>
  );
}

function SaleActions({ item }: { item: SaleItem }) {
  const actions = useActions();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-6 space-y-3">
      <Button
        className="w-full"
        variant="secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(adText(item)).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? <Check size={17} /> : <Copy size={17} />}
        {copied ? "Kopiert" : "Anzeigentext kopieren"}
      </Button>
      <Button className="w-full" variant="secondary" onClick={() => setEditing(true)}>
        Bearbeiten
      </Button>

      <Sheet open={editing} onClose={() => (setEditing(false), setConfirm(false))} title="Bearbeiten">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              try {
                await actions.updateSaleItem(item.id, fd);
                setEditing(false);
              } catch (err) {
                setError((err as Error).message);
              }
            });
          }}
          className="space-y-4"
        >
          <Input name="name" defaultValue={item.name} required />
          <label className="block">
            <Label>Preis</Label>
            <Input name="price" inputMode="decimal" defaultValue={priceInput(item.price_cents)} placeholder="z.B. 40" />
          </label>
          <label className="block">
            <Label>Beschreibung</Label>
            <Textarea name="description" defaultValue={item.description ?? ""} className="min-h-36" />
          </label>
          {error && <p className="text-center text-[13px] text-terracotta">{error}</p>}
          <Button className="w-full" loading={pending}>
            Speichern
          </Button>
          <button
            type="button"
            onClick={() =>
              confirm
                ? start(async () => {
                    router.push(BACK);
                    await actions.deleteSaleItem(item.id).catch(() => {});
                  })
                : setConfirm(true)
            }
            className="w-full py-2 text-[14px] text-terracotta"
          >
            {confirm ? "Wirklich löschen?" : "Löschen"}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
