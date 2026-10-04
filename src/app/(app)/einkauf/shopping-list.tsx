"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Plus } from "lucide-react";
import { addShoppingItem, setShoppingDone } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";
import type { ShoppingItem } from "@/lib/types";
import { Sheet } from "@/components/sheet";
import { Button, EmptyState, Input, Label, Textarea, cx } from "@/components/ui";

type Item = ShoppingItem & { imageUrl: string | null };
type Room = { id: string; name: string };

export function ShoppingList({
  homeId,
  items,
  rooms,
  initialRoom,
  initiallyAdding,
}: {
  homeId: string;
  items: Item[];
  rooms: Room[];
  initialRoom: string | null;
  initiallyAdding: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"all" | "room">(initialRoom ? "room" : "all");
  const [room, setRoom] = useState<string | null>(initialRoom ?? rooms[0]?.id ?? null);
  const [adding, setAdding] = useState(initiallyAdding);
  const [showDone, setShowDone] = useState(false);
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(items, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((i) => (i.id === id ? { ...i, status: done ? ("done" as const) : ("open" as const) } : i)),
  );

  // Live updates when a family member changes the list.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`shopping-${homeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items", filter: `home_id=eq.${homeId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [homeId, router]);

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

  return (
    <div className="px-4 md:px-0">
      <div className="inline-flex rounded-full bg-line/70 p-1 text-[13px]">
        {(["all", "room"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cx("rounded-full px-4 py-1.5 transition", mode === m ? "bg-ink text-white" : "text-ink/70")}
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
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition",
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
            Was fehlt noch in deinem Zuhause? Setz es auf die Liste, alle in der Wohnung sehen es sofort.
          </EmptyState>
        )}
        {groups.map((g) => (
          <section key={g.key}>
            {g.title && <h2 className="mb-2 text-[13px] font-medium tracking-wide text-muted uppercase">{g.title}</h2>}
            <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
              {g.items.map((it) => (
                <Row key={it.id} item={it} rooms={rooms} onToggle={() => toggle(it)} />
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
                  <Row key={it.id} item={it} rooms={rooms} onToggle={() => toggle(it)} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {(open.length > 0 || done.length > 0) && (
        <div className="sticky bottom-24 mt-8 flex items-center gap-3 md:bottom-6">
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
        rooms={rooms}
        defaultRoom={mode === "room" ? room : null}
      />
    </div>
  );
}

function Row({ item, rooms, onToggle }: { item: Item; rooms: Room[]; onToggle: () => void }) {
  const done = item.status === "done";
  const roomName = rooms.find((r) => r.id === item.room_id)?.name ?? "Wohnung";
  const meta = [roomName, formatPrice(item.price_cents)].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-3 py-3">
      <button
        onClick={onToggle}
        aria-label={done ? "Wieder öffnen" : "Als erledigt markieren"}
        className={cx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
          done ? "border-sage bg-sage text-white" : "border-ink/30 hover:border-ink",
        )}
      >
        {done && <Check size={14} strokeWidth={2.4} className="animate-pop" />}
      </button>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-[10px] object-cover" />
      )}
      <Link href={`/einkauf/${item.id}`} className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[15px]", done && "text-muted line-through")}>{item.name}</span>
          <span className="block truncate text-[12px] text-muted">{meta}</span>
        </span>
        <ChevronRight size={16} strokeWidth={1.6} className="shrink-0 text-faint" />
      </Link>
    </li>
  );
}

function AddItemSheet({
  open,
  onClose,
  rooms,
  defaultRoom,
}: {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  defaultRoom: string | null;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [more, setMore] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Sheet open={open} onClose={onClose} title="Artikel hinzufügen">
      <form
        ref={form}
        action={(fd) =>
          start(async () => {
            await addShoppingItem(fd);
            form.current?.reset();
            onClose();
          })
        }
        className="space-y-4"
      >
        <Input name="name" placeholder="Was brauchst du?" required autoFocus />
        <label className="block">
          <Label>Für</Label>
          <select
            name="room_id"
            defaultValue={defaultRoom ?? ""}
            className="h-12 w-full rounded-input border border-line bg-card px-4 text-[15px] outline-none"
          >
            <option value="">Gesamte Wohnung</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
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
