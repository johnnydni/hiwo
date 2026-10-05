"use client";

// Lageplan: draw the rooms from above with a finger, roughly, then the magic
// wand turns the sketch into a tidy plan (lib/plan). Pen and eraser keep
// working on the finished plan: draw a room onto it and convert again, wipe a
// door away, tap a room with the eraser to remove it. "m²" names the rooms and
// takes their size, which gives the whole plan its scale.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Eraser, Pen, Plus, Scan, Undo2, WandSparkles } from "lucide-react";
import { useApp } from "@/components/app-context";
import { useActions } from "@/components/use-actions";
import { PageHeader, cx } from "@/components/ui";
import { bounds, convertSketch, doorEnds, distToSegment, hitsStroke, metresPerUnit, roomArea, roomAt, walls, type Pt } from "@/lib/plan";
import type { PlanDoor, PlanRoom } from "@/lib/types";
import { RoomSheet, formatM2 } from "./room-sheet";

type Tool = "pen" | "eraser" | "m2";
type State = { rooms: PlanRoom[]; doors: PlanDoor[]; strokes: Pt[][] };
type View = { s: number; x: number; y: number };

const SAVE_DELAY = 700;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8;

export function PlanEditor() {
  const { doc } = useApp();
  const { savePlan } = useActions();
  const [hist, setHist] = useState<{ list: State[]; at: number }>(() => ({
    list: [{ rooms: doc.plan?.rooms ?? [], doors: doc.plan?.doors ?? [], strokes: [] }],
    at: 0,
  }));
  const saved = hist.list[hist.at];
  // an eraser swipe in progress: shown live, one undo step when it ends
  const [live, setLive] = useState<State | null>(null);
  const state = live ?? saved;
  const [tool, setTool] = useState<Tool>("pen");
  const [draft, setDraft] = useState<Pt[] | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hint, setHint] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  // -- history ---------------------------------------------------------------
  const commit = useCallback((next: State) => setHist((h) => ({ list: [...h.list.slice(0, h.at + 1), next], at: h.at + 1 })), []);
  const undo = () => setHist((h) => ({ ...h, at: Math.max(0, h.at - 1) }));

  // -- saving: rooms and doors only, a moment after the last change -----------
  const savedRef = useRef(JSON.stringify({ rooms: state.rooms, doors: state.doors }));
  const remoteRef = useRef(doc.plan?.updated_at);
  useEffect(() => {
    const json = JSON.stringify({ rooms: saved.rooms, doors: saved.doors });
    if (json === savedRef.current) return;
    const t = setTimeout(() => {
      savedRef.current = json;
      savePlan({ rooms: saved.rooms, doors: saved.doors }).catch(() => (savedRef.current = ""));
    }, SAVE_DELAY);
    return () => clearTimeout(t);
  }, [saved.rooms, saved.doors, savePlan]);

  // the other person changed the plan meanwhile: take it over, unless we're editing too
  useEffect(() => {
    const plan = doc.plan;
    if (!plan || plan.updated_at === remoteRef.current) return;
    remoteRef.current = plan.updated_at;
    const json = JSON.stringify({ rooms: plan.rooms, doors: plan.doors });
    if (json === savedRef.current) return;
    if (JSON.stringify({ rooms: saved.rooms, doors: saved.doors }) !== savedRef.current) return;
    savedRef.current = json;
    setHist({ list: [{ rooms: plan.rooms, doors: plan.doors, strokes: saved.strokes }], at: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.plan]);

  // -- view: world → screen, fitted to the plan once ---------------------------
  const fit = useCallback(
    (w: number, h: number, s: State) => {
      const b = bounds(s.rooms, s.strokes);
      if (!b) return { s: 1, x: 0, y: 0 };
      const pad = 40;
      const k = Math.min(3, (w - pad * 2) / Math.max(b.w, 1), (h - pad * 2) / Math.max(b.h, 1));
      return { s: k, x: (w - b.w * k) / 2 - b.x * k, y: (h - b.h * k) / 2 - b.y * k };
    },
    [],
  );
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!view && size.w) setView(fit(size.w, size.h, state));
  }, [view, size, fit, state]);

  // -- pointer -------------------------------------------------------------------
  // One finger draws, erases or taps; two fingers move and zoom the plan.
  const gesture = useRef<{ id: number; start: Pt; moved: boolean } | null>(null);
  const fingers = useRef(new Map<number, Pt>());
  const pinch = useRef<{ view: View; mid: Pt; dist: number } | null>(null);
  // after a pinch, the finger left on the glass draws nothing until all are up
  const pinched = useRef(false);
  const toScreen = (e: { clientX: number; clientY: number }): Pt => {
    const r = svg.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const toWorld = (e: React.PointerEvent): Pt => {
    const [x, y] = toScreen(e);
    const v = view ?? { s: 1, x: 0, y: 0 };
    return [(x - v.x) / v.s, (y - v.y) / v.s];
  };
  /** `v` zoomed by `factor` around the screen point `at` */
  const zoom = (v: View, factor: number, at: Pt): View => {
    const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.s * factor));
    const f = s / v.s;
    return { s, x: at[0] - (at[0] - v.x) * f, y: at[1] - (at[1] - v.y) * f };
  };
  const twoFingers = () => {
    const [a, b] = [...fingers.current.values()];
    return { mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as Pt, dist: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])) };
  };

  // desktop: ctrl + wheel (and trackpad pinch) zooms, the wheel moves
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        if (!v) return v;
        if (e.ctrlKey || e.metaKey) return zoom(v, Math.exp(-e.deltaY * 0.01), toScreen(e));
        return { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const px = 1 / (view?.s ?? 1);

  /** Removes strokes and doors under `p`; null if nothing was there. */
  const eraseAt = (s: State, p: Pt): State | null => {
    const r = 12 * px;
    const strokes = s.strokes.filter((st) => !hitsStroke(st, p, r));
    const doors = s.doors.filter((d) => distToSegment(p, ...doorEnds(d)) > r);
    if (strokes.length === s.strokes.length && doors.length === s.doors.length) return null;
    return { ...s, strokes, doors };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!view) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    fingers.current.set(e.pointerId, toScreen(e));
    if (fingers.current.size === 2) {
      // second finger: whatever the first one started is dropped, the plan moves
      gesture.current = null;
      setDraft(null);
      setLive(null);
      pinched.current = true;
      pinch.current = { view, ...twoFingers() };
      return;
    }
    if (gesture.current || pinched.current) return;
    const p = toWorld(e);
    gesture.current = { id: e.pointerId, start: p, moved: false };
    setHint(null);
    if (tool === "pen") setDraft([p]);
    if (tool === "eraser") setLive(eraseAt(state, p));
  };
  const onMove = (e: React.PointerEvent) => {
    if (fingers.current.has(e.pointerId)) fingers.current.set(e.pointerId, toScreen(e));
    const pz = pinch.current;
    if (pz && fingers.current.size >= 2) {
      const { mid, dist } = twoFingers();
      const moved = { ...pz.view, x: pz.view.x + mid[0] - pz.mid[0], y: pz.view.y + mid[1] - pz.mid[1] };
      setView(zoom(moved, dist / pz.dist, mid));
      return;
    }
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const p = toWorld(e);
    if (Math.hypot(p[0] - g.start[0], p[1] - g.start[1]) > 6 * px) g.moved = true;
    if (tool === "pen")
      setDraft((d) => {
        if (!d) return d;
        const last = d[d.length - 1];
        return Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5 * px ? d : [...d, p];
      });
    if (tool === "eraser") {
      const next = eraseAt(state, p);
      if (next) setLive(next);
    }
  };
  const onUp = (e: React.PointerEvent) => {
    fingers.current.delete(e.pointerId);
    if (fingers.current.size < 2) pinch.current = null;
    if (!fingers.current.size) pinched.current = false;
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    const p = toWorld(e);
    if (tool === "pen" && draft) {
      commit({ ...state, strokes: [...state.strokes, [...draft, p]] });
      setDraft(null);
    }
    if (tool === "eraser") {
      if (live) commit(live);
      // a tap on a room (and nothing else) removes the room
      else if (!g.moved) {
        const room = roomAt(state.rooms, p);
        if (room) commit(withoutRoom(state, room.id, px));
      }
      setLive(null);
    }
    if (tool === "m2" && !g.moved) {
      const room = roomAt(state.rooms, p);
      if (room) setOpen(room.id);
    }
  };

  const convert = () => {
    const result = convertSketch(state.strokes, state, px);
    if (!result.addedRooms && !result.addedDoors) {
      setHint("Kein Raum erkannt. Zeichne die Wände ringsum geschlossen, dann noch einmal.");
      return;
    }
    commit({ rooms: result.rooms, doors: result.doors, strokes: [] });
    if (result.rooms.some((r) => !r.room_id && !r.label)) {
      setTool("m2");
      setHint("Tippe auf einen Raum, um ihn zu benennen.");
    }
  };

  const updateRoom = (id: string, patch: Partial<PlanRoom>) =>
    commit({ ...state, rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  // -- drawing -----------------------------------------------------------------
  const v = view ?? { s: 1, x: 0, y: 0 };
  const k = metresPerUnit(state.rooms);
  const nameOf = (r: PlanRoom) => doc.rooms.find((x) => x.id === r.room_id)?.name ?? r.label;
  const empty = !state.rooms.length && !state.strokes.length && !draft;
  const strokePath = (s: Pt[]) => (s.length === 1 ? `M${s[0][0]} ${s[0][1]}h0.01` : "M" + s.map((p) => `${p[0]} ${p[1]}`).join("L"));
  const grid = 20 * v.s;

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-4rem)]">
      <PageHeader
        back="/wohnung"
        title="Lageplan"
        action={
          <div className="-mr-3 flex">
            <IconButton label="Ansicht einpassen" onClick={() => setView(fit(size.w, size.h, state))}>
              <Scan size={20} strokeWidth={1.6} />
            </IconButton>
            <IconButton label="Rückgängig" onClick={undo} disabled={hist.at === 0}>
              <Undo2 size={20} strokeWidth={1.6} />
            </IconButton>
          </div>
        }
      />
      <div ref={box} className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-card border border-line bg-card md:mx-0">
        <svg
          ref={svg}
          className={cx("absolute inset-0 h-full w-full touch-none select-none", tool === "m2" ? "cursor-pointer" : "cursor-crosshair")}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          data-testid="plan"
        >
          <defs>
            <pattern id="plan-grid" width={grid} height={grid} patternUnits="userSpaceOnUse" x={v.x} y={v.y}>
              <circle cx={0.75} cy={0.75} r={0.75} fill="#d9d6ce" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#plan-grid)" />
          <g transform={`translate(${v.x} ${v.y}) scale(${v.s})`}>
            {state.rooms.map((r) => {
              const unnamed = !nameOf(r);
              return (
                <rect
                  key={r.id}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill={tool === "m2" && unnamed ? "#fbf3ee" : "#ffffff"}
                  stroke="#1f1f1d"
                  strokeWidth={1.4}
                  vectorEffect="non-scaling-stroke"
                  className="plan-room"
                />
              );
            })}
            {state.doors.map((d) => {
              const t = 4 * px;
              const [x, y, w, h] = d.dir === "h" ? [d.from, d.at - t, d.to - d.from, 2 * t] : [d.at - t, d.from, 2 * t, d.to - d.from];
              return <rect key={d.id} x={x} y={y} width={w} height={h} fill="#ffffff" stroke="#1f1f1d" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
            })}
            {state.rooms.map((r) => {
              const name = nameOf(r);
              const area = roomArea(r, k);
              const fs = Math.min(15 * px, r.h / 3, r.w / 4);
              return (
                <g key={r.id} pointerEvents="none" textAnchor="middle">
                  <text x={r.x + r.w / 2} y={r.y + r.h / 2 + (area ? -fs * 0.15 : fs * 0.35)} fontSize={fs} fill={name ? "#1f1f1d" : "#a9a7a0"}>
                    {name ?? "?"}
                  </text>
                  {area && (
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 + fs * 1.05} fontSize={fs * 0.8} fill="#75736d">
                      {(area.estimated ? "≈ " : "") + formatM2(area.m2)} m²
                    </text>
                  )}
                </g>
              );
            })}
            {[...state.strokes, ...(draft ? [draft] : [])].map((s, i) => (
              <path
                key={i}
                d={strokePath(s)}
                fill="none"
                stroke="#1f1f1d"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>

        {empty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <p className="font-serif text-[26px] leading-tight text-ink/70">Zeichne deine Wohnung von oben.</p>
            <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-muted">
              Jeden Raum als grobes Rechteck, Türen als zwei kurze Striche an der Wand. Dann tippst du auf den Zauberstab. Mit zwei Fingern verschiebst und zoomst du.
            </p>
          </div>
        )}
        {hint && (
          <div className="animate-fade-in pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
            <span className="rounded-full bg-ink/85 px-3.5 py-1.5 text-center text-[13px] text-white">{hint}</span>
          </div>
        )}
        {state.rooms.length > 0 && (
          <button
            onClick={() => {
              setTool(tool === "m2" ? "pen" : "m2");
              setHint(tool === "m2" ? null : "Tippe auf einen Raum für Name und Fläche.");
            }}
            aria-label="Name und Fläche"
            aria-pressed={tool === "m2"}
            className={cx(
              "absolute right-3 bottom-3 flex h-16 w-16 flex-col items-center justify-center rounded-full border shadow-soft transition",
              tool === "m2" ? "border-ink bg-ink text-white" : "border-line bg-card text-ink",
            )}
          >
            <Plus size={18} strokeWidth={1.8} />
            <span className="-mt-0.5 text-[13px] font-medium">m²</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between px-4 pt-3 md:px-0">
        <div className="flex gap-2">
          <ToolButton label="Stift" active={tool === "pen"} onClick={() => setTool("pen")}>
            <Pen size={20} strokeWidth={1.6} />
          </ToolButton>
          <ToolButton label="Radierer" active={tool === "eraser"} onClick={() => setTool("eraser")}>
            <Eraser size={20} strokeWidth={1.6} />
          </ToolButton>
        </div>
        <ToolButton label="Zauberstab" accent disabled={!state.strokes.length} onClick={convert}>
          <WandSparkles size={20} strokeWidth={1.6} />
        </ToolButton>
      </div>

      <RoomSheet
        room={state.rooms.find((r) => r.id === open) ?? null}
        plan={state.rooms}
        scale={k}
        onClose={() => setOpen(null)}
        onChange={updateRoom}
        onRemove={(id) => {
          setOpen(null);
          commit(withoutRoom(state, id, px));
        }}
      />
    </div>
  );
}

/** The plan without room `id`; doors stay only on walls that are still there. */
function withoutRoom(s: State, id: string, px: number): State {
  const rooms = s.rooms.filter((r) => r.id !== id);
  const ws = walls(rooms);
  const onWall = (d: PlanDoor) => ws.some((w) => w.dir === d.dir && Math.abs(w.at - d.at) < px && w.from <= d.from + px && w.to >= d.to - px);
  return { ...s, rooms, doors: s.doors.filter(onWall) };
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5 disabled:opacity-30">
      {children}
    </button>
  );
}

function ToolButton({
  label,
  active,
  accent,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  accent?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={accent ? undefined : active} className="flex w-16 flex-col items-center gap-1 text-[11px] disabled:opacity-35">
      <span
        className={cx(
          "flex h-12 w-12 items-center justify-center rounded-full border transition",
          accent ? "border-terracotta bg-terracotta text-white" : active ? "border-ink bg-ink text-white" : "border-line bg-card text-ink",
        )}
      >
        {children}
      </span>
      <span className={active || accent ? "text-ink" : "text-muted"}>{label}</span>
    </button>
  );
}
