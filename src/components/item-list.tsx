"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight, Plus } from "lucide-react";
import { useActions, targetValue } from "./use-actions";
import { Photo } from "./photo";
import { formatPrice } from "@/lib/format";
import type { ShoppingItem } from "@/lib/types";
import { cx } from "./ui";

/** Shopping list for one room or one variant, with a quick-add row. */
export function ItemList({
  items,
  target,
  placeholder = "Was braucht ihr dafür?",
}: {
  items: ShoppingItem[];
  target: { room_id: string | null; variant_id: string | null };
  placeholder?: string;
}) {
  const { addShoppingItem, setShoppingDone } = useActions();
  const [name, setName] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const [optimistic, setOptimistic] = useOptimistic(items, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((i) => (i.id === id ? { ...i, status: done ? ("done" as const) : ("open" as const) } : i)),
  );
  const open = optimistic.filter((i) => i.status === "open");
  const done = optimistic.filter((i) => i.status === "done");
  const total = open.reduce((s, i) => s + (i.price_cents ?? 0), 0);

  const toggle = (it: ShoppingItem) =>
    start(async () => {
      setOptimistic({ id: it.id, done: it.status !== "done" });
      await setShoppingDone(it.id, it.status !== "done").catch(() => {});
    });

  return (
    <div>
      <ul className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
        {open.map((it) => (
          <Row key={it.id} item={it} onToggle={() => toggle(it)} />
        ))}
        {showDone && done.map((it) => <Row key={it.id} item={it} onToggle={() => toggle(it)} />)}
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
              start(async () => {
                await addShoppingItem(fd).catch(() => setName(value));
                input.current?.focus();
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
              className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
            {name.trim() && (
              <button disabled={pending} className="text-[14px] font-medium">
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

function Row({ item, onToggle }: { item: ShoppingItem; onToggle: () => void }) {
  const done = item.status === "done";
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
      {item.image_path && <Photo path={item.image_path} className="h-10 w-10 shrink-0 rounded-[10px]" />}
      <Link href={`/artikel?id=${item.id}`} className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cx("min-w-0 flex-1 truncate text-[15px]", done && "text-muted line-through")}>{item.name}</span>
        {item.price_cents != null && <span className="text-[13px] text-muted">{formatPrice(item.price_cents)}</span>}
        <ChevronRight size={16} strokeWidth={1.6} className="shrink-0 text-faint" />
      </Link>
    </li>
  );
}
