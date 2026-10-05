"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight, Loader2, Plus } from "lucide-react";
import { useActions, targetValue } from "./use-actions";
import { ItemThumb } from "./item-thumb";
import { formatPrice } from "@/lib/format";
import type { ShoppingItem } from "@/lib/types";
import { cx } from "./ui";

/** Shopping list for one room or one variant, with a quick-add row. */
export function ItemList({
  items,
  target,
  placeholder = "Was braucht ihr? Oder Link einfügen",
}: {
  items: ShoppingItem[];
  target: { room_id: string | null; variant_id: string | null };
  placeholder?: string;
}) {
  const { addShoppingItem, setShoppingDone } = useActions();
  const [name, setName] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  // ticks and new rows show at once; the commit to GitHub follows
  const [optimistic, apply] = useOptimistic(
    items,
    (state, a: { type: "toggle"; id: string; done: boolean } | { type: "add"; item: ShoppingItem }) =>
      a.type === "add"
        ? [...state, a.item]
        : state.map((i) => (i.id === a.id ? { ...i, status: a.done ? ("done" as const) : ("open" as const) } : i)),
  );
  const open = optimistic.filter((i) => i.status === "open");
  const done = optimistic.filter((i) => i.status === "done");
  const total = open.reduce((s, i) => s + (i.price_cents ?? 0), 0);

  const toggle = (it: ShoppingItem) =>
    start(async () => {
      apply({ type: "toggle", id: it.id, done: it.status !== "done" });
      await setShoppingDone(it.id, it.status !== "done").catch(() => {});
    });

  return (
    <div>
      <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
        {open.map((it) =>
          it.id.startsWith("pending:") ? (
            <ItemRow key={it.id} item={it} pending onToggle={() => {}} />
          ) : (
            <ItemRow key={it.id} item={it} onToggle={() => toggle(it)} />
          ),
        )}
        {showDone && done.map((it) => <ItemRow key={it.id} item={it} onToggle={() => toggle(it)} />)}
        <li>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = name.trim();
              if (!value) return;
              const fd = new FormData();
              fd.set("name", value);
              fd.set("target", targetValue(target));
              setName("");
              input.current?.focus();
              start(async () => {
                apply({ type: "add", item: pendingItem(value, target) });
                await addShoppingItem(fd).catch(() => setName(value));
              });
            }}
            className="flex items-center gap-3 py-2"
          >
            <Plus size={18} strokeWidth={1.4} className="shrink-0 text-muted" />
            <input
              ref={input}
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
            />
            {name.trim() && (
              <button className="-mr-2 h-11 px-2 text-[14px] font-medium">
                Hinzufügen
              </button>
            )}
          </form>
        </li>
      </ul>
      <div className="mt-2 flex items-center justify-between px-1 text-[13px] text-muted">
        {done.length > 0 ? (
          <button onClick={() => setShowDone((v) => !v)}>
            {showDone ? "Erledigte ausblenden" : `${done.length} erledigt`}
          </button>
        ) : (
          <span />
        )}
        {total > 0 && <span>Noch offen: {formatPrice(total)}</span>}
      </div>
    </div>
  );
}

/** One shopping item: check circle (44px tap area), optional product photo, link to the item. */
export function ItemRow({
  item,
  onToggle,
  meta,
  pending,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  meta?: string;
  /** not saved yet: spinner instead of the check circle, no link */
  pending?: boolean;
}) {
  const done = item.status === "done";
  if (pending)
    return (
      <li className="animate-fade-up flex items-center gap-1.5 py-1.5 text-muted">
        <span className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center">
          <Loader2 size={18} className="animate-spin" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px]">{item.name}</span>
      </li>
    );
  return (
    <li className="animate-fade-up flex items-center gap-1.5 py-1.5">
      <button
        onClick={onToggle}
        aria-label={done ? "Wieder öffnen" : "Als erledigt markieren"}
        className="group/check -ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          className={cx(
            "flex h-6 w-6 items-center justify-center rounded-full border transition",
            done ? "border-sage bg-sage text-white" : "border-ink/30 group-hover/check:border-ink",
          )}
        >
          {done && <Check size={14} strokeWidth={2.4} className="animate-pop" />}
        </span>
      </button>
      <ItemThumb item={item} className="mr-1.5 h-12 w-12 shrink-0 rounded-[10px] border border-line" />
      <Link href={`/artikel?id=${item.id}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[15px]", done && "text-muted line-through")}>{item.name}</span>
          {meta && <span className="block truncate text-[12px] text-muted">{meta}</span>}
        </span>
        {meta === undefined && item.price_cents != null && (
          <span className="shrink-0 text-[13px] text-muted">{formatPrice(item.price_cents)}</span>
        )}
        <ChevronRight size={16} strokeWidth={1.6} className="shrink-0 text-faint" />
      </Link>
    </li>
  );
}

function pendingItem(name: string, target: { room_id: string | null; variant_id: string | null }): ShoppingItem {
  return {
    id: `pending:${Date.now()}`,
    ...target,
    name,
    price_cents: null,
    note: null,
    url: null,
    image_path: null,
    image_sha: null,
    status: "open",
    created_by: null,
    done_by: null,
    done_at: null,
    created_at: new Date().toISOString(),
  };
}
