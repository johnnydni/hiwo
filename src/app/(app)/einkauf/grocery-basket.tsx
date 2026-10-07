"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronDown, ListChecks, Plus, Search, Trash2, X } from "lucide-react";
import { useActions } from "@/components/use-actions";
import { GroceryIcon } from "@/components/grocery-icon";
import { Sheet } from "@/components/sheet";
import { Button, Input, Label, cx } from "@/components/ui";
import { newId, now } from "@/lib/id";
import {
  CATALOG,
  CATEGORIES,
  category,
  iconFor,
  initial,
  normalize,
  parseEntry,
  putEntries,
  search,
  splitEntries,
  suggest,
  type CategoryId,
} from "@/lib/groceries";
import type { GroceryItem } from "@/lib/types";

type Change =
  | { type: "put"; entries: { id: string; name: string; amount: string | null }[]; at: string }
  | { type: "patch"; ids: Record<string, Partial<GroceryItem>> }
  | { type: "remove"; ids: string[] };

const UNSORTED = "unsortiert";
const byName = (a: GroceryItem, b: GroceryItem) => a.name.localeCompare(b.name, "de");

/**
 * Einkaufskorb, modelled on Bring!: what is needed shows as tiles grouped by
 * category; tap a tile when it is in the basket, hold it to change amount or
 * category. Typing searches the catalogue; "Zuletzt gekauft" and the catalogue
 * below put things back with one tap.
 */
export function GroceryBasket({ items, learned }: { items: GroceryItem[]; learned: Record<string, string> }) {
  const actions = useActions();
  const [, start] = useTransition();
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [cat, setCat] = useState<string | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [editing, setEditing] = useState<GroceryItem | null>(null);
  const [sorting, setSorting] = useState(false);
  const [openCat, setOpenCat] = useState<string | null>(null);
  // "Milch gekauft · Rückgängig", for a mis-tap
  const [undo, setUndo] = useState<GroceryItem | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 4000);
    return () => clearTimeout(t);
  }, [undo]);

  // tiles change at once; the commit to GitHub follows
  const [list, apply] = useOptimistic(items, (state, c: Change) => {
    if (c.type === "put") return putEntries(state, c.entries, learned, null, c.at);
    if (c.type === "remove") return state.filter((i) => !c.ids.includes(i.id));
    return state.map((i) => (c.ids[i.id] ? { ...i, ...c.ids[i.id] } : i));
  });
  const saved = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const open = list.filter((i) => i.status === "open");
  const onList = new Set(open.map((i) => normalize(i.name)));
  const recent = list
    .filter((i) => i.status === "done")
    .sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""))
    .slice(0, 24);
  const unsorted = open.filter((i) => !category(i.category));
  const catOf = (i: GroceryItem) => (category(i.category) ? i.category! : UNSORTED);

  const visible = open.filter((i) => (!cat || catOf(i) === cat) && (!letter || initial(i.name) === letter));
  const groups = [
    { id: UNSORTED, name: "Noch nicht sortiert", icon: null as string | null },
    ...CATEGORIES.map((c) => ({ id: c.id as string, name: c.name, icon: c.icon as string | null })),
  ]
    .map((g) => ({ ...g, items: visible.filter((i) => catOf(i) === g.id).sort(byName) }))
    .filter((g) => g.items.length);
  const catChips = [
    ...(unsorted.length ? [{ id: UNSORTED, label: "Unsortiert", icon: null as string | null, n: unsorted.length }] : []),
    ...CATEGORIES.map((c) => ({ id: c.id as string, label: c.name, icon: c.icon as string | null, n: open.filter((i) => i.category === c.id).length })),
  ].filter((c) => c.n);
  const letters = [...new Set(open.filter((i) => !cat || catOf(i) === cat).map((i) => initial(i.name)))].sort();

  const put = (entries: { name: string; amount: string | null }[]) => {
    if (!entries.length) return;
    const rows = entries.map((e) => ({ ...e, id: newId() }));
    const at = now();
    start(async () => {
      apply({ type: "put", entries: rows, at });
      await actions.putGroceries(rows, at).catch(() => {});
    });
  };
  const submit = () => {
    put(splitEntries(text));
    setText("");
    input.current?.focus();
  };
  const setDone = (it: GroceryItem, done: boolean) => {
    setUndo(done ? it : null);
    start(async () => {
      apply({ type: "patch", ids: { [it.id]: { status: done ? "done" : "open", done_at: done ? now() : null } } });
      await actions.setGroceryDone(it.id, done).catch(() => {});
    });
  };

  // typing: the typed entry itself plus matching catalogue products, Bring!-style
  const typed = text.includes(",") ? null : parseEntry(text);
  const hits = typed ? search(typed.name) : [];
  const typedIsKnown = !!typed && hits.some((p) => p.forms.includes(normalize(typed.name)));

  const tile = (it: GroceryItem) => (
    <Tile
      key={it.id}
      icon={iconFor(it)}
      name={it.name}
      amount={it.amount}
      active={it.status === "open"}
      pending={!saved.has(it.id)}
      label={it.status === "open" ? `${it.name}: gekauft` : `${it.name} wieder in den Korb`}
      onTap={() => setDone(it, it.status === "open")}
      onHold={() => setEditing(it)}
    />
  );

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-3 rounded-card bg-card px-4 py-2 shadow-soft"
      >
        <Search size={18} strokeWidth={1.4} className="shrink-0 text-muted" />
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Was braucht ihr? z.B. 6 Eier"
          aria-label="Einkauf eintragen"
          enterKeyHint="done"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
        />
        {text && (
          <button type="button" onClick={() => setText("")} aria-label="Eingabe leeren" className="-mr-2 flex h-11 w-11 items-center justify-center text-muted">
            <X size={18} strokeWidth={1.6} />
          </button>
        )}
      </form>

      {text.trim() ? (
        <section className="mt-5">
          <p className="mb-2 px-1 text-[13px] text-muted">
            {text.includes(",") ? "Enter trägt alle auf einmal ein." : "Antippen, um es in den Korb zu legen."}
          </p>
          <TileGrid>
            {typed && !typedIsKnown && (
              <Tile
                icon={suggest(typed.name, learned)?.icon ?? null}
                name={typed.name}
                amount={typed.amount}
                active={false}
                fresh
                label={`${typed.name} in den Korb`}
                onTap={() => (put([typed]), setText(""), input.current?.focus())}
              />
            )}
            {hits.map((p) => (
              <Tile
                key={p.name}
                icon={p.icon ?? null}
                name={p.name}
                amount={typed?.amount ?? null}
                active={onList.has(normalize(p.name))}
                label={`${p.name} in den Korb`}
                onTap={() => (put([{ name: p.name, amount: typed?.amount ?? null }]), setText(""), input.current?.focus())}
              />
            ))}
          </TileGrid>
        </section>
      ) : (
        <>
          {unsorted.length > 0 && (
            <button
              onClick={() => setSorting(true)}
              className="animate-fade-up mt-5 flex w-full items-center gap-3 rounded-card border border-ink/15 bg-card px-4 py-3 text-left transition hover:border-ink/40"
            >
              <ListChecks size={20} strokeWidth={1.6} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">Einkäufe sortieren</span>
                <span className="block text-[13px] text-muted">
                  {unsorted.length === 1 ? "1 Eintrag kenne ich noch nicht" : `${unsorted.length} Einträge kenne ich noch nicht`}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[13px] text-white">Los</span>
            </button>
          )}

          {open.length > 0 && (catChips.length > 1 || letters.length > 1) && (
            <div className="mt-5 space-y-2">
              {catChips.length > 1 && (
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
                  <Chip active={!cat} onClick={() => setCat(null)}>
                    Alle {open.length}
                  </Chip>
                  {catChips.map((c) => (
                    <Chip key={c.id} active={cat === c.id} onClick={() => (setCat(cat === c.id ? null : c.id), setLetter(null))}>
                      {c.icon && <GroceryIcon icon={c.icon} size={18} />}
                      {c.label} {c.n}
                    </Chip>
                  ))}
                </div>
              )}
              {letters.length > 1 && (
                <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" aria-label="Nach Buchstabe filtern">
                  {letters.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLetter(letter === l ? null : l)}
                      aria-pressed={letter === l}
                      className={cx(
                        "h-9 w-9 shrink-0 rounded-full text-[13px] font-medium transition",
                        letter === l ? "bg-ink text-white" : "text-muted hover:bg-ink/5",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 space-y-6">
            {open.length === 0 && (
              <div className="animate-fade-up rounded-card px-6 py-8 text-center">
                <p className="font-serif text-[26px] leading-tight">Der Korb ist leer.</p>
                <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-muted">
                  Oben eintippen oder unten aus Zuletzt gekauft und dem Katalog antippen.
                </p>
              </div>
            )}
            {open.length > 0 && groups.length === 0 && <p className="px-1 text-[14px] text-muted">Nichts für diesen Filter.</p>}
            {groups.map((g) => (
              <section key={g.id}>
                <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-medium tracking-wide text-muted uppercase">
                  {g.icon && <GroceryIcon icon={g.icon} size={20} />}
                  {g.name}
                </h2>
                <TileGrid>{g.items.map(tile)}</TileGrid>
              </section>
            ))}
            {open.length > 0 && (
              <p className="px-1 text-[12px] text-faint">
                {open.length === 1 ? "1 Artikel" : `${open.length} Artikel`} im Korb. Antippen: gekauft. Gedrückt halten: Menge oder Kategorie ändern.
              </p>
            )}

            {recent.length > 0 && (
              <section>
                <h2 className="mb-2 text-[13px] font-medium tracking-wide text-muted uppercase">Zuletzt gekauft</h2>
                <TileGrid>{recent.map(tile)}</TileGrid>
              </section>
            )}

            <section>
              <h2 className="mb-2 text-[13px] font-medium tracking-wide text-muted uppercase">Katalog</h2>
              <div className="divide-y divide-line rounded-card bg-card px-4 shadow-soft">
                {CATEGORIES.filter((c) => c.id !== "sonstiges").map((c) => (
                  <div key={c.id}>
                    <button
                      onClick={() => setOpenCat(openCat === c.id ? null : c.id)}
                      aria-expanded={openCat === c.id}
                      className="flex min-h-12 w-full items-center gap-3 text-left text-[15px]"
                    >
                      <GroceryIcon icon={c.icon} size={26} />
                      <span className="flex-1">{c.name}</span>
                      <ChevronDown size={18} strokeWidth={1.6} className={cx("text-faint transition", openCat === c.id && "rotate-180")} />
                    </button>
                    {openCat === c.id && (
                      <div className="pb-4">
                        <TileGrid>
                          {CATALOG.filter((p) => p.category === c.id).map((p) => {
                            const own = open.find((i) => normalize(i.name) === normalize(p.name));
                            return (
                              <Tile
                                key={p.name}
                                icon={p.icon ?? null}
                                name={p.name}
                                amount={own?.amount ?? null}
                                active={!!own}
                                label={own ? `${p.name}: gekauft` : `${p.name} in den Korb`}
                                onTap={() => (own ? setDone(own, true) : put([{ name: p.name, amount: null }]))}
                              />
                            );
                          })}
                        </TileGrid>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 px-1 text-[11px] text-faint">
                Grafiken:{" "}
                <a href="https://openmoji.org" target="_blank" rel="noreferrer" className="underline">
                  OpenMoji
                </a>
                , CC BY-SA 4.0
              </p>
            </section>
          </div>
        </>
      )}

      {undo && (
        <div
          key={undo.id}
          role="status"
          className="animate-fade-up fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-sm items-center gap-3 rounded-button bg-ink py-2 pr-2 pl-4 text-[14px] text-white shadow-soft lg:bottom-6"
        >
          <span className="min-w-0 flex-1 truncate">{undo.name} gekauft</span>
          <button onClick={() => setDone(undo, false)} className="h-10 shrink-0 rounded-button px-3 font-medium hover:bg-white/10">
            Rückgängig
          </button>
        </div>
      )}

      <EditSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(id, change) =>
          start(async () => {
            apply({ type: "patch", ids: { [id]: change } });
            await actions.updateGrocery(id, change).catch(() => {});
          })
        }
        onDelete={(id) =>
          start(async () => {
            apply({ type: "remove", ids: [id] });
            await actions.deleteGrocery(id).catch(() => {});
          })
        }
      />
      {sorting && (
        <SortAssistant
          items={unsorted.filter((i) => saved.has(i.id)).sort(byName)}
          learned={learned}
          onClose={(choices) => {
            setSorting(false);
            if (!Object.keys(choices).length) return;
            start(async () => {
              apply({ type: "patch", ids: Object.fromEntries(Object.entries(choices).map(([id, c]) => [id, { category: c }])) });
              await actions.categorizeGroceries(choices).catch(() => {});
            });
          }}
        />
      )}
    </div>
  );
}

function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">{children}</div>;
}

/**
 * A square tile: icon (or the first letter), name, amount. `active` = needed
 * (terracotta, like Bring!'s red), otherwise quiet. Tap, or hold for details.
 */
function Tile({
  icon,
  name,
  amount,
  active,
  pending,
  fresh,
  label,
  onTap,
  onHold,
}: {
  icon: string | null;
  name: string;
  amount: string | null;
  active: boolean;
  pending?: boolean;
  /** typed, not in the catalogue */
  fresh?: boolean;
  label: string;
  onTap: () => void;
  onHold?: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const startAt = useRef({ x: 0, y: 0 });
  const cancel = () => timer.current && (clearTimeout(timer.current), (timer.current = null));
  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onPointerDown={(e) => {
        held.current = false;
        startAt.current = { x: e.clientX, y: e.clientY };
        if (onHold)
          timer.current = setTimeout(() => {
            held.current = true;
            timer.current = null;
            onHold();
          }, 450);
      }}
      onPointerMove={(e) => Math.hypot(e.clientX - startAt.current.x, e.clientY - startAt.current.y) > 8 && cancel()}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => {
        if (!onHold) return;
        e.preventDefault();
        cancel();
        if (!held.current) {
          held.current = true;
          onHold();
        }
      }}
      onClick={() => {
        if (held.current) return;
        onTap();
      }}
      style={{ WebkitTouchCallout: "none" }}
      className={cx(
        "animate-fade-up relative flex aspect-square flex-col items-center justify-center gap-1 rounded-card px-1.5 pt-2 pb-1.5 text-center select-none transition active:scale-[0.96]",
        active ? "bg-terracotta text-white shadow-soft" : "bg-card text-ink shadow-soft hover:bg-paper",
        fresh && "border border-dashed border-ink/30 shadow-none",
        pending && "opacity-60",
      )}
    >
      {fresh && <Plus size={14} strokeWidth={2} className="absolute top-2 right-2 text-muted" />}
      <span className={cx("flex h-11 items-center font-serif text-[32px] leading-none", !icon && !active && "text-muted")} aria-hidden>
        {icon ? <GroceryIcon icon={icon} size={40} /> : initial(name)}
      </span>
      <span
        className={cx("line-clamp-2 w-full leading-tight font-medium break-words hyphens-auto", name.length > 10 ? "text-[12px]" : "text-[13px]")}
        lang="de"
      >
        {name}
      </span>
      <span className={cx("h-4 truncate text-[12px] leading-4", active ? "text-white/85" : "text-muted")}>{amount ?? ""}</span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] whitespace-nowrap transition",
        active ? "border-ink bg-card" : "border-line text-muted",
      )}
    >
      {children}
    </button>
  );
}

function CategoryGrid({
  value,
  highlight,
  onPick,
}: {
  value: string | null;
  highlight?: string | null;
  onPick: (id: CategoryId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          aria-pressed={value === c.id}
          className={cx(
            "flex min-h-12 items-center gap-2 rounded-input border px-3 py-2 text-left text-[14px] transition",
            value === c.id ? "border-ink bg-ink text-white" : highlight === c.id ? "border-ink bg-card" : "border-line bg-card hover:border-ink/40",
          )}
        >
          <GroceryIcon icon={c.icon} size={24} />
          <span className="min-w-0 leading-tight">{c.name}</span>
        </button>
      ))}
    </div>
  );
}

function EditSheet({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: GroceryItem | null;
  onClose: () => void;
  onSave: (id: string, change: Pick<GroceryItem, "name" | "amount" | "category">) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Sheet open={!!item} onClose={onClose} title="Einkauf bearbeiten">
      {item && <EditForm key={item.id} item={item} onClose={onClose} onSave={onSave} onDelete={onDelete} />}
    </Sheet>
  );
}

function EditForm({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: GroceryItem;
  onClose: () => void;
  onSave: (id: string, change: Pick<GroceryItem, "name" | "amount" | "category">) => void;
  onDelete: (id: string) => void;
}) {
  const [cat, setCat] = useState<string | null>(item.category);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get("name") ?? "").trim() || item.name;
        const amount = String(fd.get("amount") ?? "").trim() || null;
        onSave(item.id, { name, amount, category: cat });
        onClose();
      }}
      className="space-y-4"
    >
      <div className="flex gap-3">
        <label className="block min-w-0 flex-1">
          <Label>Was</Label>
          <Input name="name" defaultValue={item.name} required />
        </label>
        <label className="block w-28 shrink-0">
          <Label>Menge</Label>
          <Input name="amount" defaultValue={item.amount ?? ""} placeholder="z.B. 500 g" />
        </label>
      </div>
      <div>
        <Label>Kategorie</Label>
        <CategoryGrid value={cat} onPick={(c) => setCat(cat === c ? null : c)} />
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          aria-label="Löschen"
          onClick={() => {
            onDelete(item.id);
            onClose();
          }}
        >
          <Trash2 size={18} strokeWidth={1.6} />
        </Button>
        <Button className="flex-1">Speichern</Button>
      </div>
    </form>
  );
}

/**
 * Sorting assistant: one entry at a time, with a suggestion from the word list
 * (or from what you chose before). Tap a category to pick it and go on.
 */
function SortAssistant({
  items,
  learned,
  onClose,
}: {
  items: GroceryItem[];
  learned: Record<string, string>;
  onClose: (choices: Record<string, string>) => void;
}) {
  // the queue is fixed when the assistant opens; new entries wait for the next round
  const [queue] = useState(items);
  const [i, setI] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const suggestions = useMemo(() => Object.fromEntries(queue.map((q) => [q.id, suggest(q.name, learned)])), [queue, learned]);
  const finish = (c: Record<string, string>) => onClose(c);

  const item = queue[i];
  const s = item ? suggestions[item.id] : null;
  const pick = (c: string) => {
    const next = { ...choices, [item.id]: c };
    setChoices(next);
    goOn(next);
  };
  // on to the next entry without a choice (after "Alle übernehmen" that skips ahead)
  const goOn = (next: Record<string, string>) => {
    const k = queue.findIndex((q, k) => k > i && !next[q.id]);
    if (k < 0) finish(next);
    else setI(k);
  };
  const rest = queue.slice(i).filter((q) => suggestions[q.id]);
  const takeAll = () => {
    const next = { ...choices };
    for (const q of rest) next[q.id] = suggestions[q.id]!.category;
    const firstOpen = queue.findIndex((q, k) => k >= i && !next[q.id]);
    setChoices(next);
    if (firstOpen < 0) finish(next);
    else setI(firstOpen);
  };

  if (!item) return null;
  return (
    <Sheet open onClose={() => finish(choices)} title="Einkäufe sortieren">
      <div className="mb-4 flex items-center gap-2" aria-hidden>
        {queue.map((q, k) => (
          <span key={q.id} className={cx("h-1 flex-1 rounded-full transition", k < i ? "bg-ink" : k === i ? "bg-ink/40" : "bg-line")} />
        ))}
      </div>
      <p className="text-[13px] text-muted">
        {i + 1} von {queue.length}
      </p>
      <div key={item.id} className="animate-fade-up mt-1 mb-4 flex items-center gap-3">
        <GroceryIcon icon={s?.icon ?? category(s?.category)?.icon ?? "🛒"} size={48} />
        <div className="min-w-0">
          <p className="truncate font-serif text-[28px] leading-tight">{item.name}</p>
          <p className="text-[14px] text-muted">
            {s
              ? `${s.learned ? "Wie beim letzten Mal" : "Vorschlag"}: ${category(s.category)!.name}`
              : "Kenne ich noch nicht. Wohin gehört das?"}
          </p>
        </div>
      </div>
      <CategoryGrid value={choices[item.id] ?? null} highlight={s?.category} onPick={pick} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {i > 0 && (
          <Button type="button" variant="ghost" onClick={() => setI(i - 1)}>
            Zurück
          </Button>
        )}
        <span className="flex-1" />
        {rest.length > 1 && (
          <Button type="button" variant="secondary" onClick={takeAll}>
            Alle {rest.length} Vorschläge übernehmen
          </Button>
        )}
        {s ? (
          <Button type="button" onClick={() => pick(s.category)}>
            Passt
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={() => goOn(choices)}>
            Überspringen
          </Button>
        )}
      </div>
    </Sheet>
  );
}
