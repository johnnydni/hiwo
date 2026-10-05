"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/components/app-context";
import { useActions } from "@/components/use-actions";
import { TargetSelect, useTargetLabel } from "@/components/target-select";
import { ItemRow } from "@/components/item-list";
import { formatPrice } from "@/lib/format";
import type { ShoppingItem } from "@/lib/types";
import { Sheet } from "@/components/sheet";
import { Button, EmptyState, Input, Label, Textarea, cx } from "@/components/ui";

type Item = ShoppingItem;
type Room = { id: string; name: string };

export function ShoppingList({
  items,
  rooms,
  initialRoom,
  initiallyAdding,
}: {
  items: Item[];
  rooms: Room[];
  initialRoom: string | null;
  initiallyAdding: boolean;
}) {
  const { doc } = useApp();
  const { setShoppingDone } = useActions();
  const [mode, setMode] = useState<"all" | "room">(initialRoom ? "room" : "all");
  const [room, setRoom] = useState<string | null>(initialRoom ?? rooms[0]?.id ?? null);
  const [adding, setAdding] = useState(initiallyAdding);
  const [showDone, setShowDone] = useState(false);
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(items, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((i) => (i.id === id ? { ...i, status: done ? ("done" as const) : ("open" as const) } : i)),
  );

  const toggle = (it: Item) =>
    start(async () => {
      setOptimistic({ id: it.id, done: it.status !== "done" });
      await setShoppingDone(it.id, it.status !== "done");
    });

  const visible = mode === "room" ? optimistic.filter((i) => i.room_id === room) : optimistic;
  const open = visible.filter((i) => i.status === "open");
  const done = visible.filter((i) => i.status === "done");

  const groups = useMemo(() => {
    if (mode === "room") return [{ key: room ?? "", title: null as string | null, items: open }];
    const g = [{ key: "home", title: "Gesamt", items: open.filter((i) => !i.room_id) }];
    for (const r of rooms) g.push({ key: r.id, title: r.name, items: open.filter((i) => i.room_id === r.id) });
    return g.filter((x) => x.items.length);
  }, [mode, room, rooms, open]);

  const total = open.reduce((s, i) => s + (i.price_cents ?? 0), 0);

  // Under a room heading the room name is noise; keep only the variant and the price.
  const targetLabel = useTargetLabel();
  const variantName = (it: Item) => doc.photos.find((p) => p.id === it.variant_id)?.name;
  const meta = (it: Item, grouped: boolean) =>
    [grouped ? (it.room_id ? variantName(it) : null) : targetLabel(it), formatPrice(it.price_cents)]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="px-4 md:px-0">
      <div className="inline-flex rounded-full bg-line/70 p-1 text-[13px]">
        {(["all", "room"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cx("rounded-full px-4 py-2 transition", mode === m ? "bg-ink text-white" : "text-ink/70")}
          >
            {m === "all" ? "Gesamte Wohnung" : "Nach Zimmer"}
          </button>
        ))}
      </div>

      {mode === "room" && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {rooms.length ? (
            rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoom(r.id)}
                className={cx(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition",
                  room === r.id ? "border-ink bg-card" : "border-line text-muted",
                )}
              >
                {r.name}
              </button>
            ))
          ) : (
            <p className="text-[13px] text-muted">Noch keine Zimmer angelegt.</p>
          )}
        </div>
      )}

      <div className="mt-6 space-y-7">
        {groups.length === 0 && !done.length && (
          <EmptyState title="Alles da." action={<Button onClick={() => setAdding(true)}><Plus size={18} /> Artikel hinzufügen</Button>}>
            Was fehlt noch in deinem Zuhause? Setz es auf die Liste, dann seht ihr es beide.
          </EmptyState>
        )}
        {groups.map((g) => (
          <section key={g.key}>
            {g.title && <h2 className="mb-2 text-[13px] font-medium tracking-wide text-muted uppercase">{g.title}</h2>}
            <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
              {g.items.map((it) => (
                <ItemRow key={it.id} item={it} meta={meta(it, true)} onToggle={() => toggle(it)} />
              ))}
            </ul>
          </section>
        ))}

        {done.length > 0 && (
          <section>
            <button onClick={() => setShowDone((v) => !v)} className="mb-2 text-[13px] font-medium text-muted">
              {showDone ? "Erledigte ausblenden" : `Erledigt (${done.length})`}
            </button>
            {showDone && (
              <ul className="divide-y divide-line rounded-card bg-card/60 px-4">
                {done.map((it) => (
                  <ItemRow key={it.id} item={it} meta={meta(it, false)} onToggle={() => toggle(it)} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {(open.length > 0 || done.length > 0) && (
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] mt-8 flex items-center gap-3 lg:bottom-6">
          <Button className="flex-1 shadow-soft" onClick={() => setAdding(true)}>
            <Plus size={18} /> Artikel hinzufügen
          </Button>
          {total > 0 && (
            <span className="rounded-button bg-card px-4 py-3 text-[13px] text-muted shadow-soft">
              {formatPrice(total)}
            </span>
          )}
        </div>
      )}

      <AddItemSheet
        open={adding}
        onClose={() => setAdding(false)}
        defaultRoom={mode === "room" ? room : null}
      />
    </div>
  );
}

function AddItemSheet({
  open,
  onClose,
  defaultRoom,
}: {
  open: boolean;
  onClose: () => void;
  defaultRoom: string | null;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [more, setMore] = useState(false);
  const [pending, start] = useTransition();
  const { addShoppingItem } = useActions();
  return (
    <Sheet open={open} onClose={onClose} title="Artikel hinzufügen">
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            await addShoppingItem(fd);
            form.current?.reset();
            onClose();
          });
        }}
        className="space-y-4"
      >
        <Input name="name" placeholder="Was brauchst du? Oder Link einfügen" required autoFocus />
        <TargetSelect key={defaultRoom ?? ""} defaultValue={defaultRoom ?? ""} />
        {more ? (
          <>
            <label className="block">
              <Label>Preis</Label>
              <Input name="price" inputMode="decimal" placeholder="z.B. 89,90" />
            </label>
            <label className="block">
              <Label>Link</Label>
              <Input name="url" type="url" placeholder="https://" />
            </label>
            <label className="block">
              <Label>Notiz</Label>
              <Textarea name="note" placeholder="Warum, welche Farbe, welches Maß …" />
            </label>
          </>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="text-[14px] text-muted hover:text-ink">
            + Preis, Link oder Notiz
          </button>
        )}
        <Button className="w-full" disabled={pending}>
          Auf die Liste
        </Button>
      </form>
    </Sheet>
  );
}
