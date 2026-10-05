"use client";

// Drawing on a photo, modelled on "Markieren" in Apple Fotos: pen, marker,
// pencil, eraser, arrow and text, a few colours and three widths, undo/redo.
// Everything is kept as vector operations in image pixels and only flattened
// into a JPG on save, so undo is exact and the original photo stays as it is.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Eraser, Highlighter, Loader2, MoveUpRight, Pen, Pencil, Redo2, Type, Undo2 } from "lucide-react";
import { usePhotoUrl } from "./app-context";
import { cx } from "./ui";

type Pt = [number, number];
type StrokeTool = "pen" | "marker" | "pencil" | "eraser";
type Tool = StrokeTool | "arrow" | "text";
type Op =
  | { kind: "stroke"; tool: StrokeTool; color: string; size: number; pts: Pt[] }
  | { kind: "arrow"; color: string; size: number; a: Pt; b: Pt }
  | { kind: "text"; id: string; color: string; size: number; at: Pt; text: string };

const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: "pen", label: "Stift", icon: <Pen size={20} strokeWidth={1.6} /> },
  { id: "marker", label: "Marker", icon: <Highlighter size={20} strokeWidth={1.6} /> },
  { id: "pencil", label: "Bleistift", icon: <Pencil size={20} strokeWidth={1.6} /> },
  { id: "eraser", label: "Radierer", icon: <Eraser size={20} strokeWidth={1.6} /> },
  { id: "arrow", label: "Pfeil", icon: <MoveUpRight size={20} strokeWidth={1.6} /> },
  { id: "text", label: "Text", icon: <Type size={20} strokeWidth={1.6} /> },
];
// six plus a custom one: still fits a 360px phone in one row with the widths
const COLORS = ["#1f1d1b", "#ffffff", "#e5484d", "#f5a524", "#30a46c", "#0090ff"];
const WIDTHS = [1, 2, 4];
const MAX_SIDE = 2048;

export function MarkupEditor({
  path,
  onCancel,
  onSave,
}: {
  /** photo in the data repo to draw on */
  path: string;
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
  const pointers = useRef(new Set<number>());
  const [display, setDisplay] = useState({ w: 0, h: 0 });

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

  const renderView = useCallback(() => {
    const v = view.current;
    if (!v || !cache.current) return;
    const g = v.getContext("2d")!;
    g.clearRect(0, 0, v.width, v.height);
    g.drawImage(cache.current, 0, 0);
    if (draft.current) drawOp(g, draft.current);
  }, []);

  // committed operations are drawn once into an offscreen cache
  useEffect(() => {
    if (!W) return;
    const c = (cache.current ??= document.createElement("canvas"));
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    for (const op of ops) drawOp(g, op);
    renderView();
  }, [ops, W, H, renderView]);

  const dirty = hist.at > 0;
  const commit = (next: Op[]) => setHist((h) => ({ list: [...h.list.slice(0, h.at + 1), next], at: h.at + 1 }));
  const undo = () => setHist((h) => ({ ...h, at: Math.max(0, h.at - 1) }));
  const redo = () => setHist((h) => ({ ...h, at: Math.min(h.list.length - 1, h.at + 1) }));
  const cancel = () => (dirty && !confirmCancel ? setConfirmCancel(true) : onCancel());

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
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
    pointers.current.add(e.pointerId);
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
        <button onClick={cancel} disabled={saving} className={cx("h-11 rounded-full px-3 text-[15px]", confirmCancel && "text-[#ff8b7a]")}>
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
          className="relative h-9 rounded-full bg-white px-4 text-[14px] font-medium text-ink disabled:opacity-40"
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
              className={cx("absolute inset-0 h-full w-full touch-none", tool === "text" ? "cursor-text" : "cursor-crosshair")}
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
              }}
              aria-label={t.label}
              aria-pressed={tool === t.id}
              className={cx(
                "flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] transition-colors",
                tool === t.id ? "bg-white/15 text-white" : "text-white/60 hover:text-white",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
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
      </div>
    </div>,
    document.body,
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

function drawOp(g: CanvasRenderingContext2D, op: Op) {
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
