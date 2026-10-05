"use client";

// Drawing on a photo, modelled on "Markieren" in Apple Fotos: pen, marker,
// pencil, eraser, arrow and text, a few colours and three widths, undo/redo.
// "Produkt" places a product picture into the photo: its plain background is
// removed (lib/cutout), then it can be moved, scaled, turned and mirrored.
// Everything is kept as vector operations in image pixels and only flattened
// into a JPG on save, so undo is exact and the original photo stays as it is.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Armchair, Eraser, FlipHorizontal2, Highlighter, Loader2, MoveUpRight, Pen, Pencil, Plus, Redo2, Trash2, Type, Undo2 } from "lucide-react";
import { usePhotoUrl } from "./app-context";
import { ProductPicker, type PickContext } from "./product-picker";
import { cx } from "./ui";
import { detectBackground, removeBackground, type Cutout } from "@/lib/cutout";

type Pt = [number, number];
type StrokeTool = "pen" | "marker" | "pencil" | "eraser";
type Tool = StrokeTool | "arrow" | "text" | "product";
/** `src` names the product picture, `tol` how much background is removed (0–100), `w` the picture's width in image pixels. */
type ProductOp = { kind: "product"; id: string; src: string; tol: number; holes: boolean; at: Pt; w: number; rot: number; flip: boolean };
type Op =
  | { kind: "stroke"; tool: StrokeTool; color: string; size: number; pts: Pt[] }
  | { kind: "arrow"; color: string; size: number; a: Pt; b: Pt }
  | { kind: "text"; id: string; color: string; size: number; at: Pt; text: string }
  | ProductOp;
type CutFor = (op: ProductOp) => Cutout | null;

const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: "pen", label: "Stift", icon: <Pen size={20} strokeWidth={1.6} /> },
  { id: "marker", label: "Marker", icon: <Highlighter size={20} strokeWidth={1.6} /> },
  { id: "pencil", label: "Bleistift", icon: <Pencil size={20} strokeWidth={1.6} /> },
  { id: "eraser", label: "Radierer", icon: <Eraser size={20} strokeWidth={1.6} /> },
  { id: "arrow", label: "Pfeil", icon: <MoveUpRight size={20} strokeWidth={1.6} /> },
  { id: "text", label: "Text", icon: <Type size={20} strokeWidth={1.6} /> },
  { id: "product", label: "Produkt", icon: <Armchair size={20} strokeWidth={1.6} /> },
];
// six plus a custom one: still fits a 360px phone in one row with the widths
const COLORS = ["#1f1d1b", "#ffffff", "#e5484d", "#f5a524", "#30a46c", "#0090ff"];
const WIDTHS = [1, 2, 4];
const MAX_SIDE = 2048;

export function MarkupEditor({
  path,
  context,
  onCancel,
  onSave,
}: {
  /** photo in the data repo to draw on */
  path: string;
  /** room/variant of the photo, so their products come first when inserting one */
  context?: PickContext;
  onCancel: () => void;
  onSave: (blob: Blob, width: number, height: number) => Promise<void>;
}) {
  const url = usePhotoUrl(path);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[2]);
  const [width, setWidth] = useState(1);
  const [hist, setHist] = useState<{ list: Op[][]; at: number }>({ list: [[]], at: 0 });
  const ops = hist.list[hist.at];
  const [text, setText] = useState<{ at: Pt; id?: string; value: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const box = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const cache = useRef<HTMLCanvasElement | null>(null);
  const draft = useRef<Op | null>(null);
  const drag = useRef<{ id: string; from: Pt; orig: Pt; moved: boolean; before: { list: Op[][]; at: number } } | null>(null);
  const pointers = useRef(new Map<number, Pt>());
  const [display, setDisplay] = useState({ w: 0, h: 0 });

  // products: their pictures, cutouts per removal setting, the selected one
  const sources = useRef(new Map<string, HTMLCanvasElement>());
  const cuts = useRef(new Map<string, Cutout>());
  const [sel, setSel] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const gesture = useRef<{
    id: string;
    mode: "move" | "scale" | "pinch";
    moved: boolean;
    orig: ProductOp;
    from: Pt;
    dist: number;
    angle: number;
  } | null>(null);
  const sliding = useRef(false);

  // image size in canvas pixels (photos are stored at ≤1800px already)
  const scale = img ? Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight)) : 1;
  const W = img ? Math.round(img.naturalWidth * scale) : 0;
  const H = img ? Math.round(img.naturalHeight * scale) : 0;
  const unit = Math.max(W, H) / 500;

  useEffect(() => {
    if (!url) return;
    const i = new Image();
    i.onload = () => setImg(i);
    i.onerror = () => setFailed(true);
    i.src = url;
  }, [url]);

  // fit the picture into the free space between the bars
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !W) return;
    const fit = () => {
      const s = Math.min(el.clientWidth / W, el.clientHeight / H);
      setDisplay({ w: Math.floor(W * s), h: Math.floor(H * s) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H]);

  const cutFor = useCallback<CutFor>((op) => {
    const key = `${op.src}|${op.tol}|${op.holes ? 1 : 0}`;
    let c = cuts.current.get(key);
    if (!c) {
      const s = sources.current.get(op.src);
      if (!s) return null;
      c = removeBackground(s, op.tol, op.holes);
      cuts.current.set(key, c);
      // a few MB each: keep only the latest ones (dragging the slider makes many)
      if (cuts.current.size > 16) cuts.current.delete(cuts.current.keys().next().value!);
    }
    return c;
  }, []);

  const selOp = tool === "product" ? ops.find((o): o is ProductOp => o.kind === "product" && o.id === sel) : undefined;
  // image pixels per screen pixel, for handles that stay finger-sized
  const px = display.w ? W / display.w : 1;

  const renderView = useCallback(() => {
    const v = view.current;
    if (!v || !cache.current) return;
    const g = v.getContext("2d")!;
    g.clearRect(0, 0, v.width, v.height);
    g.drawImage(cache.current, 0, 0);
    if (draft.current) drawOp(g, draft.current, cutFor);
    const c = selOp && cutFor(selOp);
    if (selOp && c) drawSelection(g, selOp, c, px);
  }, [cutFor, selOp, px]);

  // committed operations are drawn once into an offscreen cache
  useEffect(() => {
    if (!W) return;
    const c = (cache.current ??= document.createElement("canvas"));
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    for (const op of ops) drawOp(g, op, cutFor);
    renderView();
  }, [ops, W, H, renderView, cutFor]);

  const dirty = hist.at > 0;
  const commit = (next: Op[]) => setHist((h) => ({ list: [...h.list.slice(0, h.at + 1), next], at: h.at + 1 }));
  const undo = () => setHist((h) => ({ ...h, at: Math.max(0, h.at - 1) }));
  const redo = () => setHist((h) => ({ ...h, at: Math.min(h.list.length - 1, h.at + 1) }));
  const cancel = () => (dirty && !confirmCancel ? setConfirmCancel(true) : onCancel());
  // a continuous change (drag, pinch, slider) is one undo step: copy the current
  // state once, then keep editing that copy
  const begin = () => setHist((h) => ({ list: [...h.list.slice(0, h.at + 1), h.list[h.at]], at: h.at + 1 }));
  const live = (id: string, change: (o: ProductOp) => ProductOp) =>
    setHist((h) => {
      const list = [...h.list];
      list[h.at] = list[h.at].map((o) => (o.kind === "product" && o.id === id ? change(o) : o));
      return { ...h, list };
    });
  const editSel = (change: (o: ProductOp) => ProductOp) => selOp && commit(ops.map((o) => (o === selOp ? change(selOp) : o)));
  const removeSel = () => {
    if (!selOp) return;
    commit(ops.filter((o) => o !== selOp));
    setSel(null);
  };

  function insertProduct(canvas: HTMLCanvasElement) {
    const src = crypto.randomUUID();
    sources.current.set(src, canvas);
    const bg = detectBackground(canvas);
    const op: ProductOp = { kind: "product", id: crypto.randomUUID(), src, tol: bg.plain ? 25 : 0, holes: false, at: [0, 0], w: 1, rot: 0, flip: false };
    const c = cutFor(op)!;
    // the product itself takes ~40% of the photo's width (at most half its height), a bit below the middle
    const aspect = canvas.height / canvas.width;
    op.w = Math.min((W * 0.4) / c.box.w, (H * 0.5) / (c.box.h * aspect));
    const f = frame(op, c);
    op.at = [W / 2 - (f.x + f.bw / 2), H * 0.58 - (f.y + f.bh / 2)];
    commit([...ops, op]);
    setSel(op.id);
    setPicker(false);
  }

  const removeRef = useRef(removeSel);
  useEffect(() => {
    removeRef.current = removeSel;
  });
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "Backspace" || e.key === "Delete") removeRef.current();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const toImage = (e: { clientX: number; clientY: number }): Pt => {
    const r = view.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  const size = (t: Tool) => (t === "text" ? 6 : 3) * unit * width;

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (text) {
      // tapping the picture while typing just finishes the text
      finishText();
      return;
    }
    if (tool === "product") return productDown(e);
    pointers.current.set(e.pointerId, toImage(e));
    if (pointers.current.size > 1) {
      // a second finger: no zoom here, just don't leave a stray line
      draft.current = null;
      renderView();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setConfirmCancel(false);
    const p = toImage(e);
    if (tool === "text") {
      const g = view.current!.getContext("2d")!;
      const hit = [...ops].reverse().find((o): o is Extract<Op, { kind: "text" }> => o.kind === "text" && hitText(g, o, p));
      if (hit) {
        drag.current = { id: hit.id, from: p, orig: hit.at, moved: false, before: hist };
        commit(ops.map((o) => (o.kind === "text" && o.id === hit.id ? { ...o } : o)));
      } else setText({ at: p, value: "" });
      return;
    }
    draft.current =
      tool === "arrow"
        ? { kind: "arrow", color, size: size(tool), a: p, b: p }
        : { kind: "stroke", tool, color, size: size(tool), pts: [p] };
    renderView();
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "product") return productMove(e);
    if (pointers.current.size > 1) return;
    const d = drag.current;
    if (d) {
      const p = toImage(e);
      const dx = p[0] - d.from[0];
      const dy = p[1] - d.from[1];
      if (!d.moved && Math.hypot(dx, dy) < unit * 2) return;
      d.moved = true;
      // moving text edits the snapshot made on pointer down (one undo step)
      setHist((h) => {
        const list = [...h.list];
        list[h.at] = list[h.at].map((o) => (o.kind === "text" && o.id === d.id ? { ...o, at: [d.orig[0] + dx, d.orig[1] + dy] } : o));
        return { ...h, list };
      });
      return;
    }
    const op = draft.current;
    if (!op) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    if (op.kind === "arrow") op.b = toImage(e);
    else if (op.kind === "stroke") for (const ev of events) op.pts.push(toImage(ev));
    renderView();
  }

  function up(e: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    if (tool === "product") {
      gesture.current = null;
      return;
    }
    const d = drag.current;
    if (d) {
      drag.current = null;
      if (!d.moved) {
        // a tap on text: edit it (and forget the snapshot from pointer down)
        setHist(d.before);
        const t = ops.find((o) => o.kind === "text" && o.id === d.id);
        if (t?.kind === "text") setText({ at: t.at, id: t.id, value: t.text });
      }
      return;
    }
    const op = draft.current;
    draft.current = null;
    if (!op) return;
    if (op.kind === "arrow" && Math.hypot(op.b[0] - op.a[0], op.b[1] - op.a[1]) < unit * 6) return renderView();
    commit([...ops, op]);
  }

  // one finger drags a product, the round handle or two fingers scale and turn it
  function productDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = toImage(e);
    pointers.current.set(e.pointerId, p);
    e.currentTarget.setPointerCapture(e.pointerId);
    setConfirmCancel(false);
    if (pointers.current.size === 2) {
      if (!selOp) return;
      const [a, b] = [...pointers.current.values()];
      gesture.current = { id: selOp.id, mode: "pinch", moved: gesture.current?.moved ?? false, orig: selOp, from: mid(a, b), dist: dist(a, b), angle: angle(a, b) };
      return;
    }
    if (pointers.current.size > 2) return;
    const c = selOp && cutFor(selOp);
    if (selOp && c && dist(handleAt(selOp, c), p) < 28 * px) {
      gesture.current = { id: selOp.id, mode: "scale", moved: false, orig: selOp, from: p, dist: dist(selOp.at, p), angle: angle(selOp.at, p) };
      return;
    }
    const hit = [...ops].reverse().find((o): o is ProductOp => {
      const k = o.kind === "product" && cutFor(o);
      return !!k && hitProduct(o as ProductOp, k, p, 8 * px);
    });
    setSel(hit?.id ?? null);
    gesture.current = hit ? { id: hit.id, mode: "move", moved: false, orig: hit, from: p, dist: 0, angle: 0 } : null;
  }

  function productMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    const p = toImage(e);
    pointers.current.set(e.pointerId, p);
    const gs = gesture.current;
    if (!gs) return;
    const o = gs.orig;
    let next: ProductOp;
    if (gs.mode === "move") {
      const dx = p[0] - gs.from[0];
      const dy = p[1] - gs.from[1];
      if (!gs.moved && Math.hypot(dx, dy) < unit * 2) return;
      next = { ...o, at: [o.at[0] + dx, o.at[1] + dy] };
    } else if (gs.mode === "scale") {
      next = { ...o, w: Math.max(unit * 10, (o.w * dist(o.at, p)) / gs.dist), rot: o.rot + angle(o.at, p) - gs.angle };
    } else {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const m = mid(a, b);
      next = {
        ...o,
        w: Math.max(unit * 10, (o.w * dist(a, b)) / gs.dist),
        rot: o.rot + angle(a, b) - gs.angle,
        at: [o.at[0] + m[0] - gs.from[0], o.at[1] + m[1] - gs.from[1]],
      };
    }
    if (!gs.moved) {
      gs.moved = true;
      begin();
    }
    live(gs.id, () => next);
  }

  function finishText() {
    if (!text) return;
    const value = text.value.trim();
    const existing = text.id && ops.find((o) => o.kind === "text" && o.id === text.id);
    if (existing) {
      if (existing.kind === "text" && existing.text !== value)
        commit(value ? ops.map((o) => (o === existing ? { ...existing, text: value } : o)) : ops.filter((o) => o !== existing));
    } else if (value) {
      commit([...ops, { kind: "text", id: crypto.randomUUID(), color, size: size("text"), at: text.at, text: value }]);
    }
    setText(null);
  }

  async function save() {
    if (!img || !cache.current) return;
    setSaving(true);
    setSaveError(false);
    try {
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const g = out.getContext("2d")!;
      g.drawImage(img, 0, 0, W, H);
      g.drawImage(cache.current, 0, 0);
      const blob = await new Promise<Blob>((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.88));
      await onSave(blob, W, H);
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex flex-col bg-[#161412] pt-[env(safe-area-inset-top)] text-white select-none"
      role="dialog"
      aria-modal
      aria-label="Bild bearbeiten"
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-2">
        <button onClick={cancel} disabled={saving} className={cx("h-11 shrink-0 rounded-full px-2 text-[15px] whitespace-nowrap", confirmCancel && "text-[#ff8b7a]")}>
          {confirmCancel ? "Änderungen verwerfen?" : "Abbrechen"}
        </button>
        <div className="flex">
          <IconButton label="Rückgängig" onClick={undo} disabled={hist.at === 0 || saving}>
            <Undo2 size={20} strokeWidth={1.6} />
          </IconButton>
          <IconButton label="Wiederholen" onClick={redo} disabled={hist.at === hist.list.length - 1 || saving}>
            <Redo2 size={20} strokeWidth={1.6} />
          </IconButton>
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving || !!text}
          className="relative h-9 shrink-0 rounded-full bg-white px-4 text-[14px] font-medium whitespace-nowrap text-ink disabled:opacity-40"
        >
          <span className={cx(saving && "opacity-0")}>Als Skizze sichern</span>
          {saving && <Loader2 size={16} className="absolute inset-0 m-auto animate-spin" />}
        </button>
      </div>
      {saveError && <p className="px-4 pb-2 text-center text-[13px] text-[#ff8b7a]">Speichern hat nicht geklappt. Bitte noch einmal versuchen.</p>}

      <div ref={box} className="relative mx-2 min-h-0 flex-1">
        {!img ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            {failed ? "Das Bild konnte nicht geladen werden." : <Loader2 className="animate-spin" />}
          </div>
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: display.w, height: display.h }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url!} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
            <canvas
              ref={view}
              width={W}
              height={H}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              aria-label="Zeichenfläche"
              className={cx("absolute inset-0 h-full w-full touch-none", tool === "text" ? "cursor-text" : tool === "product" ? "cursor-move" : "cursor-crosshair")}
            />
          </div>
        )}
        {text && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              finishText();
            }}
            className="animate-fade-in absolute inset-x-2 top-2 flex gap-2 rounded-full bg-black/70 p-1.5 backdrop-blur"
          >
            <input
              autoFocus
              value={text.value}
              onChange={(e) => setText({ ...text, value: e.target.value })}
              placeholder="Text, z.B. Sofa hierhin"
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-base text-white outline-none placeholder:text-white/40"
            />
            <button className="h-10 rounded-full bg-white px-4 text-[14px] font-medium text-ink">Fertig</button>
          </form>
        )}
      </div>

      <div className="shrink-0 px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md justify-between">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (text) finishText();
                setTool(t.id);
                if (t.id === "product" && !ops.some((o) => o.kind === "product")) setPicker(true);
              }}
              aria-label={t.label}
              aria-pressed={tool === t.id}
              className={cx(
                "flex h-14 w-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] transition-colors sm:w-14",
                tool === t.id ? "bg-white/15 text-white" : "text-white/60 hover:text-white",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        {tool === "product" ? (
          <div className="mx-auto mt-1 max-w-md">
            {selOp ? (
              <>
                <div className="flex h-11 items-center gap-3 px-1">
                  <span className="shrink-0 text-[13px] text-white/70">Hintergrund</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selOp.tol}
                    aria-label="Hintergrund entfernen"
                    onChange={(e) => {
                      if (!sliding.current) {
                        sliding.current = true;
                        begin();
                      }
                      const tol = Number(e.target.value);
                      live(selOp.id, (o) => ({ ...o, tol }));
                    }}
                    onPointerUp={() => (sliding.current = false)}
                    onKeyUp={() => (sliding.current = false)}
                    onBlur={() => (sliding.current = false)}
                    className="min-w-0 flex-1 accent-white"
                  />
                  <button
                    onClick={() => editSel((o) => ({ ...o, holes: !o.holes }))}
                    aria-pressed={selOp.holes}
                    title="Auch Hintergrund zwischen Stuhlbeinen, Henkeln usw. entfernen"
                    className={cx("h-8 shrink-0 rounded-full px-3 text-[12px]", selOp.holes ? "bg-white text-ink" : "bg-white/10 text-white/80")}
                  >
                    Lücken
                  </button>
                </div>
                <div className="flex justify-between">
                  <BarButton onClick={() => editSel((o) => ({ ...o, flip: !o.flip }))} icon={<FlipHorizontal2 size={17} strokeWidth={1.6} />}>
                    Spiegeln
                  </BarButton>
                  <BarButton onClick={removeSel} icon={<Trash2 size={17} strokeWidth={1.6} />}>
                    Entfernen
                  </BarButton>
                  <BarButton onClick={() => setPicker(true)} icon={<Plus size={17} strokeWidth={1.6} />}>
                    Noch eins
                  </BarButton>
                </div>
              </>
            ) : (
              <div className="flex h-11 items-center justify-between gap-2 px-1">
                <span className="text-[13px] text-white/60">
                  {ops.some((o) => o.kind === "product") ? "Tippe ein Produkt an, um es zu ändern." : "Setz ein Produkt ins Foto."}
                </span>
                <BarButton onClick={() => setPicker(true)} icon={<Plus size={17} strokeWidth={1.6} />}>
                  Produkt einfügen
                </BarButton>
              </div>
            )}
          </div>
        ) : (
        <div className="mx-auto mt-1 flex max-w-md items-center justify-between">
          <div className={cx("flex items-center transition-opacity", tool === "eraser" && "pointer-events-none opacity-30")}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={`Farbe ${c}`} className="flex h-11 w-8 items-center justify-center">
                <span
                  className={cx("h-6 w-6 rounded-full border border-white/25 transition-transform", color === c && "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#161412]")}
                  style={{ background: c }}
                />
              </button>
            ))}
            <label className="flex h-11 w-8 cursor-pointer items-center justify-center" aria-label="Eigene Farbe">
              <span
                className={cx("h-6 w-6 rounded-full transition-transform", !COLORS.includes(color) && "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#161412]")}
                style={{ background: "conic-gradient(#e5484d, #f5a524, #30a46c, #0090ff, #8e4ec6, #e5484d)" }}
              />
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="sr-only" />
            </label>
          </div>
          <div className="flex items-center">
            {WIDTHS.map((w) => (
              <button key={w} onClick={() => setWidth(w)} aria-label={`Stärke ${w}`} aria-pressed={width === w} className="flex h-11 w-8 items-center justify-center">
                <span className={cx("rounded-full", width === w ? "bg-white" : "bg-white/40")} style={{ width: 4 + w * 3, height: 4 + w * 3 }} />
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
      {picker && <ProductPicker context={context} onPick={insertProduct} onClose={() => setPicker(false)} />}
    </div>,
    document.body,
  );
}

function BarButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] text-white/85 hover:bg-white/10">
      {icon}
      {children}
    </button>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30">
      {children}
    </button>
  );
}

// -- drawing ------------------------------------------------------------------

const FONT = "600 {px}px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

function drawOp(g: CanvasRenderingContext2D, op: Op, cutFor: CutFor) {
  if (op.kind === "product") {
    const c = cutFor(op);
    if (!c) return;
    const h = (op.w * c.canvas.height) / c.canvas.width;
    g.save();
    g.translate(op.at[0], op.at[1]);
    g.rotate(op.rot);
    if (op.flip) g.scale(-1, 1);
    g.imageSmoothingQuality = "high";
    g.drawImage(c.canvas, -op.w / 2, -h / 2, op.w, h);
    g.restore();
    return;
  }
  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = g.fillStyle = op.color;
  if (op.kind === "stroke") {
    g.lineWidth = op.size;
    if (op.tool === "marker") {
      g.globalAlpha = 0.4;
      g.lineWidth = op.size * 3.5;
      g.lineCap = "butt";
    } else if (op.tool === "pencil") {
      g.globalAlpha = 0.8;
      g.lineWidth = op.size * 0.6;
    } else if (op.tool === "eraser") {
      g.globalCompositeOperation = "destination-out";
      g.lineWidth = op.size * 5;
    }
    strokePath(g, op.pts);
    if (op.tool === "pencil") {
      // a second, offset pass gives the line some graphite texture
      g.globalAlpha = 0.35;
      g.lineWidth = op.size * 0.35;
      strokePath(g, op.pts.map(([x, y], i) => [x + Math.sin(i * 1.7) * op.size * 0.25, y + Math.cos(i * 1.3) * op.size * 0.25]));
    }
  } else if (op.kind === "arrow") {
    const [ax, ay] = op.a;
    const [bx, by] = op.b;
    const angle = Math.atan2(by - ay, bx - ax);
    const head = Math.max(op.size * 4.5, 14);
    g.lineWidth = op.size;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx - Math.cos(angle) * head * 0.6, by - Math.sin(angle) * head * 0.6);
    g.stroke();
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx - head * Math.cos(angle - 0.45), by - head * Math.sin(angle - 0.45));
    g.lineTo(bx - head * Math.cos(angle + 0.45), by - head * Math.sin(angle + 0.45));
    g.closePath();
    g.fill();
  } else {
    g.font = FONT.replace("{px}", String(Math.round(op.size)));
    g.textAlign = "center";
    g.textBaseline = "middle";
    // a soft shadow keeps text readable on busy photos
    g.shadowColor = isLight(op.color) ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.6)";
    g.shadowBlur = op.size * 0.25;
    g.fillText(op.text, op.at[0], op.at[1]);
  }
  g.restore();
}

/** Smooth line through the points (quadratic curves between midpoints). */
function strokePath(g: CanvasRenderingContext2D, pts: Pt[]) {
  if (pts.length === 1) {
    g.beginPath();
    g.arc(pts[0][0], pts[0][1], g.lineWidth / 2, 0, Math.PI * 2);
    g.fill();
    return;
  }
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  g.lineTo(last[0], last[1]);
  g.stroke();
}

function hitText(g: CanvasRenderingContext2D, op: Extract<Op, { kind: "text" }>, [x, y]: Pt) {
  g.save();
  g.font = FONT.replace("{px}", String(Math.round(op.size)));
  const w = g.measureText(op.text).width;
  g.restore();
  const pad = op.size * 0.4;
  return Math.abs(x - op.at[0]) <= w / 2 + pad && Math.abs(y - op.at[1]) <= op.size / 2 + pad;
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160;
}

// -- products -------------------------------------------------------------------

/** Visible part of a product in its own coordinates (centre of the picture = 0,0, before turning). */
function frame(op: ProductOp, c: Cutout) {
  const h = (op.w * c.canvas.height) / c.canvas.width;
  const bw = c.box.w * op.w;
  const bh = c.box.h * h;
  let x = (c.box.x - 0.5) * op.w;
  if (op.flip) x = -x - bw;
  return { x, y: (c.box.y - 0.5) * h, bw, bh };
}

function toWorld(op: ProductOp, [lx, ly]: Pt): Pt {
  const c = Math.cos(op.rot);
  const s = Math.sin(op.rot);
  return [op.at[0] + lx * c - ly * s, op.at[1] + lx * s + ly * c];
}

function hitProduct(op: ProductOp, c: Cutout, [px, py]: Pt, pad: number) {
  const dx = px - op.at[0];
  const dy = py - op.at[1];
  const cos = Math.cos(-op.rot);
  const sin = Math.sin(-op.rot);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const f = frame(op, c);
  return lx >= f.x - pad && lx <= f.x + f.bw + pad && ly >= f.y - pad && ly <= f.y + f.bh + pad;
}

/** The round handle sits on the bottom-right corner of the visible part. */
function handleAt(op: ProductOp, c: Cutout): Pt {
  const f = frame(op, c);
  return toWorld(op, [f.x + f.bw, f.y + f.bh]);
}

function drawSelection(g: CanvasRenderingContext2D, op: ProductOp, c: Cutout, px: number) {
  const f = frame(op, c);
  g.save();
  g.translate(op.at[0], op.at[1]);
  g.rotate(op.rot);
  g.shadowColor = "rgba(0,0,0,0.5)";
  g.shadowBlur = 3 * px;
  g.strokeStyle = "#fff";
  g.lineWidth = 1.5 * px;
  g.setLineDash([6 * px, 5 * px]);
  g.strokeRect(f.x, f.y, f.bw, f.bh);
  g.setLineDash([]);
  const hx = f.x + f.bw;
  const hy = f.y + f.bh;
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(hx, hy, 12 * px, 0, Math.PI * 2);
  g.fill();
  // a turning arrow inside the handle
  g.shadowBlur = 0;
  g.strokeStyle = "#1f1d1b";
  g.lineWidth = 1.6 * px;
  g.beginPath();
  g.arc(hx, hy, 5.5 * px, -Math.PI * 0.9, Math.PI * 0.4);
  g.stroke();
  const ex = hx + Math.cos(Math.PI * 0.4) * 5.5 * px;
  const ey = hy + Math.sin(Math.PI * 0.4) * 5.5 * px;
  g.beginPath();
  g.moveTo(ex - 3.5 * px, ey - 0.5 * px);
  g.lineTo(ex, ey);
  g.lineTo(ex + 0.5 * px, ey - 3.5 * px);
  g.stroke();
  g.restore();
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const angle = (a: Pt, b: Pt) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
