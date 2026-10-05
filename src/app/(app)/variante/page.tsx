"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Home, Pencil, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { useActions } from "@/components/use-actions";
import { ItemList } from "@/components/item-list";
import { Photo } from "@/components/photo";
import { PhotoTools } from "@/components/photo-tools";
import { CompareSlider } from "@/components/compare-slider";
import { Sheet } from "@/components/sheet";
import { basePhoto } from "@/lib/selectors";
import type { RoomPhoto } from "@/lib/types";
import { Button, EmptyState, Input, Label, Textarea, buttonClass, cx } from "@/components/ui";
import { Action } from "../zimmer/base-photo";

export default function VariantPage() {
  return (
    <Suspense>
      <VariantView />
    </Suspense>
  );
}

function VariantView() {
  const id = useSearchParams().get("id") ?? "";
  const { doc } = useApp();
  const [mode, setMode] = useState<"variant" | "compare">("variant");
  const variant = doc.photos.find((p) => p.id === id && p.kind === "variant");
  const room = variant && doc.rooms.find((r) => r.id === variant.room_id);
  if (!variant || !room)
    return (
      <EmptyState
        title="Diese Variante gibt es nicht mehr."
        action={
          <Link href="/wohnung" className={buttonClass("primary")}>
            Zur Wohnung
          </Link>
        }
      />
    );
  const base = basePhoto(doc, room.id);
  const items = doc.shopping.filter((s) => s.variant_id === variant.id);

  return (
    <div>
      <div className="relative md:pt-10">
        <div className="relative aspect-[4/3] overflow-hidden md:aspect-[21/9] md:rounded-image">
          <Photo path={variant.path} alt={variant.name ?? ""} className="absolute inset-0" />
          {base && mode === "compare" && <CompareSlider before={base.path} after={variant.path} className="animate-fade-in" />}
        </div>
        <Link
          href={`/zimmer?id=${room.id}`}
          aria-label="Zurück"
          className="absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 backdrop-blur md:top-14"
        >
          <ArrowLeft size={20} strokeWidth={1.6} />
        </Link>
        {base && (
          <div className="absolute bottom-3 left-3 inline-flex rounded-full md:left-1/2 md:-translate-x-1/2 bg-white/90 p-1 text-[13px] backdrop-blur">
            {(
              [
                ["variant", "Variante"],
                ["compare", "Vergleich"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cx("rounded-full px-3.5 py-2 transition-colors duration-200", mode === m ? "bg-ink text-white" : "text-ink/70")}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <PhotoTools sourceId={variant.id} path={variant.path} />
      </div>

      <div className="px-4 md:px-0">
        <div className="animate-fade-up flex items-start justify-between pt-5">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">{room.name}</p>
            <h1 className="font-serif text-[34px] leading-tight md:text-[42px]">{variant.name}</h1>
            {variant.note && <p className="mt-1 text-[14px] leading-relaxed text-ink/70">{variant.note}</p>}
          </div>
          <EditVariant variant={variant} />
        </div>

        <section className="mt-7 mb-4">
          <h2 className="mb-3 text-[15px] font-semibold">Einkaufsliste für diese Variante</h2>
          <ItemList items={items} target={{ room_id: room.id, variant_id: variant.id }} placeholder="z.B. Sofa – oder Link aus dem Shop" />
        </section>
      </div>
    </div>
  );
}

function EditVariant({ variant }: { variant: RoomPhoto }) {
  const { doc } = useApp();
  const { updateVariant, deletePhoto, setHomeCover } = useActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const close = () => {
    setOpen(false);
    setConfirm(false);
  };
  const isHomeCover = doc.home.cover_photo_id === variant.id;

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Variante bearbeiten" className="-mr-3 mt-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-ink/5">
        <Pencil size={19} strokeWidth={1.6} />
      </button>
      <Sheet open={open} onClose={close} title="Variante bearbeiten">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              await updateVariant(variant.id, fd).catch(() => {});
              close();
            });
          }}
          className="space-y-4"
        >
          <label className="block">
            <Label>Name</Label>
            <Input name="name" defaultValue={variant.name ?? ""} placeholder="z.B. Japandi, Hell & Holz …" />
          </label>
          <label className="block">
            <Label>Notiz</Label>
            <Textarea name="note" defaultValue={variant.note ?? ""} placeholder="Was gefällt euch daran?" />
          </label>
          <Button className="w-full" loading={pending}>
            Speichern
          </Button>
        </form>
        <div className="mt-4 divide-y divide-line rounded-card bg-card px-4 shadow-soft">
          <Action
            icon={<Home size={18} strokeWidth={1.6} />}
            disabled={pending || isHomeCover}
            onClick={() => start(async () => { await setHomeCover(variant.id).catch(() => {}); close(); })}
          >
            {isHomeCover ? "Ist das Bild der Wohnung" : "Als Bild der Wohnung"}
          </Action>
          <Action
            icon={<Trash2 size={18} strokeWidth={1.6} />}
            danger
            disabled={pending}
            onClick={() =>
              confirm
                ? start(async () => {
                    router.push(`/zimmer?id=${variant.room_id}`);
                    await deletePhoto(variant.id).catch(() => {});
                  })
                : setConfirm(true)
            }
          >
            {confirm ? "Wirklich löschen? Die Liste bleibt beim Zimmer." : "Variante löschen"}
          </Action>
        </div>
      </Sheet>
    </>
  );
}
