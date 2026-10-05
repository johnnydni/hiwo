// Lageplan: turns a hand-drawn sketch (pen strokes, seen from above) into a
// tidy floor plan of axis-aligned rooms and doors. Plain geometry, no AI:
//  1. rooms   – a closed loop is a room; its rectangle comes from the
//               loop's moments, so a wobbly or slanted box gives a straight
//               one. Rooms drawn from separate lines are found as areas the
//               lines enclose (drawn thick on a coarse grid, so small gaps
//               close). Boxes drawn over each other's edge meet in the middle.
//  2. tidy    – walls that almost line up are moved onto one line (existing
//               rooms stay where they are), then everything snaps to a grid.
//  3. doors   – short strokes that cross a wall ("||" ticks) become a door;
//               two ticks next to each other give its width.
// Handwriting inside a room is ignored, rooms get their name by tapping them.
// Sizes are in world units: 1 unit = 1 screen pixel when the plan was started.

import type { PlanDoor, PlanRoom } from "./types";

export type Pt = [number, number];

/** tolerances in screen pixels; scaled by `px` (world units per screen pixel) */
const T = { gap: 14, minSide: 24, snap: 16, grid: 10, doorMax: 70, doorWidth: 30, touch: 9, wallMin: 40 };

type Rect = { x: number; y: number; w: number; h: number };

const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function convertSketch(
  strokes: Pt[][],
  plan: { rooms: PlanRoom[]; doors: PlanDoor[] },
  px = 1,
): { rooms: PlanRoom[]; doors: PlanDoor[]; addedRooms: number; addedDoors: number } {
  const drawn = strokes.filter((s) => s.length > 0);
  const loops = drawn.filter((s) => isLoop(s, px));
  const lines = drawn.filter((s) => !loops.includes(s) && diag(s) > T.wallMin * px);
  const fromLoops = loops.map((s) => onStrokes(polygonRect(s), s, px)).filter((r) => !inside(r, plan.rooms));
  const fromLines = findAreas(lines, [...plan.rooms, ...fromLoops], px).filter((r) => !inside(r, plan.rooms) && !inside(r, fromLoops));
  const found = separate([...fromLoops, ...fromLines], plan.rooms);
  const tidy = snapRooms(found, plan.rooms, px);
  const added: PlanRoom[] = tidy.map((r) => ({ id: newId(), ...r, room_id: null, label: null, area_m2: null }));
  const rooms = [...plan.rooms, ...added];
  const doors = findDoors(drawn, rooms, plan.doors, px);
  return { rooms, doors: [...plan.doors, ...doors], addedRooms: added.length, addedDoors: doors.length };
}

function diag(s: Pt[]) {
  const b = bounds([], [s])!;
  return Math.hypot(b.w, b.h);
}

/** mostly the same area as one of `rooms` */
function inside(r: Rect, rooms: Rect[]) {
  return rooms.some((o) => overlap(r, o) > 0.5 * r.w * r.h);
}

// -- 1a. a room drawn in one go: a closed loop ---------------------------------

function isLoop(s: Pt[], px: number) {
  const d = diag(s);
  if (s.length < 4 || d < T.minSide * px) return false;
  const [a, b] = [s[0], s[s.length - 1]];
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= Math.max(T.gap * px * 1.5, d * 0.15);
}

/** Rectangle with the polygon's centre and spread (a slanted box gives a straight one). */
function polygonRect(s: Pt[]): Rect {
  let a = 0, cx = 0, cy = 0, ixx = 0, iyy = 0;
  for (let i = 0; i < s.length; i++) {
    const [x0, y0] = s[i];
    const [x1, y1] = s[(i + 1) % s.length];
    const c = x0 * y1 - x1 * y0;
    a += c;
    cx += (x0 + x1) * c;
    cy += (y0 + y1) * c;
    ixx += (x0 * x0 + x0 * x1 + x1 * x1) * c;
    iyy += (y0 * y0 + y0 * y1 + y1 * y1) * c;
  }
  a /= 2;
  if (Math.abs(a) < 1e-6) return bounds([], [s])!;
  cx /= 6 * a;
  cy /= 6 * a;
  // a uniform w×h rectangle has variance w²/12
  const w = Math.sqrt(Math.max(0, 12 * (ixx / (12 * a) - cx * cx)));
  const h = Math.sqrt(Math.max(0, 12 * (iyy / (12 * a) - cy * cy)));
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * Overlapping rooms (a box drawn over the edge of its neighbour) meet in the
 * middle of the overlap; existing rooms don't move. Rooms drawn inside rooms stay.
 */
function separate(found: Rect[], existing: Rect[]): Rect[] {
  const rects = found.map((r) => ({ ...r }));
  const all = [...existing.map((r) => ({ r, fixed: true })), ...rects.map((r) => ({ r, fixed: false }))];
  for (const a of rects)
    for (const { r: b, fixed } of all) {
      if (a === b) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox <= 0 || oy <= 0) continue;
      const vertical = ox < oy; // the shared wall runs vertically
      const pos = (p: Rect) => (vertical ? p.x : p.y);
      const len = (p: Rect) => (vertical ? p.w : p.h);
      const o = vertical ? ox : oy;
      if (o > 0.5 * Math.min(len(a), len(b))) continue; // nested, not a sloppy edge
      const set = (p: Rect, lo: number, hi: number) => (vertical ? Object.assign(p, { x: lo, w: hi - lo }) : Object.assign(p, { y: lo, h: hi - lo }));
      const aFirst = pos(a) < pos(b);
      const [lo, hi] = aFirst ? [a, b] : [b, a];
      const cut = fixed ? (aFirst ? pos(b) : pos(b) + len(b)) : pos(hi) + o / 2;
      const hiEnd = pos(hi) + len(hi);
      if (lo === a || !fixed) set(lo, pos(lo), cut);
      if (hi === a || !fixed) set(hi, cut, hiEnd);
    }
  return rects;
}

// -- 1b. a room from separate lines: an enclosed area --------------------------

function findAreas(strokes: Pt[][], known: Rect[], px: number): Rect[] {
  if (!strokes.length) return [];
  // 1 = wall of a known room, 4 = drawn line
  const segs: [Pt, Pt, number][] = [];
  for (const s of strokes) for (let i = 1; i < s.length; i++) segs.push([s[i - 1], s[i], 4]);
  for (const r of known) {
    const a: Pt = [r.x, r.y], b: Pt = [r.x + r.w, r.y], c: Pt = [r.x + r.w, r.y + r.h], d: Pt = [r.x, r.y + r.h];
    segs.push([a, b, 1], [b, c, 1], [c, d, 1], [d, a, 1]);
  }

  const radius = (T.gap * px) / 2;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [a, b] of segs)
    for (const p of [a, b]) {
      minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
    }
  const pad = radius * 3;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const cell = Math.max(Math.max(maxX - minX, maxY - minY) / 300, px * 1.5);
  const cols = Math.ceil((maxX - minX) / cell) + 1;
  const rows = Math.ceil((maxY - minY) / cell) + 1;
  const grid = new Uint8Array(cols * rows); // 0 free, 1/4 wall, 2 outside, 3 visited

  // thick strokes, so small gaps close
  const rc = Math.max(1, Math.round(radius / cell));
  const disc: [number, number][] = [];
  for (let dy = -rc; dy <= rc; dy++) for (let dx = -rc; dx <= rc; dx++) if (dx * dx + dy * dy <= rc * rc) disc.push([dx, dy]);
  for (const [a, b, v] of segs) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / (cell / 2)));
    for (let i = 0; i <= n; i++) {
      const cx = Math.round((a[0] + ((b[0] - a[0]) * i) / n - minX) / cell);
      const cy = Math.round((a[1] + ((b[1] - a[1]) * i) / n - minY) / cell);
      for (const [dx, dy] of disc) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < cols && y < rows && grid[y * cols + x] !== 4) grid[y * cols + x] = v;
      }
    }
  }

  let touchesLine = false;
  const fill = (start: number, mark: number, visit?: (i: number) => void) => {
    const stack = [start];
    grid[start] = mark;
    const step = (j: number) => {
      if (grid[j] === 0) {
        grid[j] = mark;
        stack.push(j);
      } else if (grid[j] === 4) touchesLine = true;
    };
    while (stack.length) {
      const i = stack.pop()!;
      visit?.(i);
      const x = i % cols, y = (i - x) / cols;
      if (x > 0) step(i - 1);
      if (x < cols - 1) step(i + 1);
      if (y > 0) step(i - cols);
      if (y < rows - 1) step(i + cols);
    }
  };
  // everything reachable from the border is outside
  fill(0, 2);

  // each enclosed area: a rectangle with the same centre and spread
  const out: Rect[] = [];
  const minSide = T.minSide * px;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== 0) continue;
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
    touchesLine = false;
    fill(i, 3, (j) => {
      const x = minX + (j % cols) * cell, y = minY + Math.floor(j / cols) * cell;
      n++; sx += x; sy += y; sxx += x * x; syy += y * y;
    });
    // only areas a new line closes, not a gap between rooms already there
    if (!touchesLine) continue;
    if (n * cell * cell < minSide * minSide * 0.6) continue; // specks
    const mx = sx / n, my = sy / n;
    // the strokes ate `radius` on each side
    const w = Math.sqrt(Math.max(0, 12 * (sxx / n - mx * mx))) + 2 * radius;
    const h = Math.sqrt(Math.max(0, 12 * (syy / n - my * my))) + 2 * radius;
    if (w < minSide || h < minSide) continue;
    out.push(onStrokes({ x: mx - w / 2, y: my - h / 2, w, h }, strokes.flat(), px));
  }
  return out;
}

/**
 * Moves each side of `r` onto the drawn line next to it (median of the stroke
 * points close to that side), so the room is as big as it was drawn.
 */
function onStrokes(r: Rect, pts: Pt[], px: number): Rect {
  const band = T.gap * px * 1.3;
  const median = (v: number[], fallback: number) => {
    if (v.length < 3) return fallback;
    v.sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  const inY = (p: Pt) => p[1] > r.y + r.h * 0.15 && p[1] < r.y + r.h * 0.85;
  const inX = (p: Pt) => p[0] > r.x + r.w * 0.15 && p[0] < r.x + r.w * 0.85;
  const x0 = median(pts.filter((p) => inY(p) && Math.abs(p[0] - r.x) < band).map((p) => p[0]), r.x);
  const x1 = median(pts.filter((p) => inY(p) && Math.abs(p[0] - r.x - r.w) < band).map((p) => p[0]), r.x + r.w);
  const y0 = median(pts.filter((p) => inX(p) && Math.abs(p[1] - r.y) < band).map((p) => p[1]), r.y);
  const y1 = median(pts.filter((p) => inX(p) && Math.abs(p[1] - r.y - r.h) < band).map((p) => p[1]), r.y + r.h);
  return x1 - x0 > 0 && y1 - y0 > 0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : r;
}

function overlap(a: Rect, b: Rect) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

// -- 2. tidy: shared wall lines and a grid ------------------------------------

function snapRooms(found: Rect[], existing: Rect[], px: number): Rect[] {
  const tol = T.snap * px;
  const grid = T.grid * px;
  const axis = (lo: (r: Rect) => number, hi: (r: Rect) => number) => {
    const vals: { v: number; fixed: boolean; set?: (v: number) => void }[] = [];
    for (const r of existing) vals.push({ v: lo(r), fixed: true }, { v: hi(r), fixed: true });
    const edges = found.map((r) => ({ lo: lo(r), hi: hi(r) }));
    edges.forEach((e) => vals.push({ v: e.lo, fixed: false, set: (v) => (e.lo = v) }, { v: e.hi, fixed: false, set: (v) => (e.hi = v) }));
    vals.sort((a, b) => a.v - b.v);
    for (let i = 0; i < vals.length; ) {
      // compare with the first of the group, so groups don't creep along
      let j = i;
      while (j < vals.length && vals[j].v - vals[i].v <= tol) j++;
      const group = vals.slice(i, j);
      const fixed = group.filter((g) => g.fixed);
      const target = fixed.length
        ? fixed.reduce((s, g) => s + g.v, 0) / fixed.length
        : Math.round(group.reduce((s, g) => s + g.v, 0) / group.length / grid) * grid;
      group.forEach((g) => g.set?.(target));
      i = j;
    }
    return edges;
  };
  const xs = axis((r) => r.x, (r) => r.x + r.w);
  const ys = axis((r) => r.y, (r) => r.y + r.h);
  const minSide = T.minSide * px * 0.8;
  return found
    .map((_, i) => ({ x: xs[i].lo, y: ys[i].lo, w: xs[i].hi - xs[i].lo, h: ys[i].hi - ys[i].lo }))
    .filter((r) => r.w >= minSide && r.h >= minSide);
}

// -- 3. doors: ticks across a wall --------------------------------------------

/** `out`: on which side of the line the room is not (-1 above/left, 1 below/right) */
type Wall = { dir: "h" | "v"; at: number; from: number; to: number; out: -1 | 1 };

export function walls(rooms: Rect[]): Wall[] {
  return rooms.flatMap((r) => [
    { dir: "h" as const, at: r.y, from: r.x, to: r.x + r.w, out: -1 as const },
    { dir: "h" as const, at: r.y + r.h, from: r.x, to: r.x + r.w, out: 1 as const },
    { dir: "v" as const, at: r.x, from: r.y, to: r.y + r.h, out: -1 as const },
    { dir: "v" as const, at: r.x + r.w, from: r.y, to: r.y + r.h, out: 1 as const },
  ]);
}

function findDoors(strokes: Pt[][], rooms: PlanRoom[], existing: PlanDoor[], px: number): PlanDoor[] {
  const ws = walls(rooms);
  const marks: { wall: Wall; pos: number }[] = [];
  for (const s of strokes) {
    const xs = s.map((p) => p[0]), ys = s.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (Math.hypot(x1 - x0, y1 - y0) > T.doorMax * px) continue; // walls, not ticks
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const touch = T.touch * px;
    let best: { wall: Wall; pos: number; d: number } | null = null;
    for (const w of ws) {
      // a tick runs across the wall (or starts at it, "|" hanging off a line)
      const [along0, along1, across0, across1, pos] =
        w.dir === "h" ? [x0, x1, y0, y1, cx] : [y0, y1, x0, x1, cy];
      if (pos < w.from || pos > w.to) continue;
      if (across1 - across0 < touch || along1 - along0 > (across1 - across0) * 1.2) continue;
      const crosses = across0 < w.at - touch / 3 && across1 > w.at + touch / 3;
      // hanging off the wall on the outside; inside a room it is more likely a letter
      const hangs =
        Math.abs((w.out < 0 ? across1 : across0) - w.at) <= touch &&
        !rooms.some((r) => cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h);
      if (!crosses && !hangs) continue;
      const d = Math.abs((w.dir === "h" ? cy : cx) - w.at);
      if (!best || d < best.d) best = { wall: w, pos, d };
    }
    if (best) marks.push(best);
  }

  // ticks on the same wall line close to each other belong to one door
  const doors: PlanDoor[] = [];
  const key = (w: Wall) => `${w.dir}:${w.at.toFixed(2)}`;
  const byLine = new Map<string, typeof marks>();
  for (const m of marks) byLine.set(key(m.wall), [...(byLine.get(key(m.wall)) ?? []), m]);
  for (const list of byLine.values()) {
    list.sort((a, b) => a.pos - b.pos);
    for (let i = 0; i < list.length; ) {
      let j = i + 1;
      while (j < list.length && list[j].pos - list[j - 1].pos <= T.doorMax * px) j++;
      const group = list.slice(i, j);
      const wall = group[0].wall;
      let from = group[0].pos, to = group[group.length - 1].pos;
      if (to - from < T.doorWidth * px * 0.5) {
        const c = (from + to) / 2;
        from = c - (T.doorWidth * px) / 2;
        to = c + (T.doorWidth * px) / 2;
      }
      from = Math.max(from, wall.from);
      to = Math.min(to, wall.to);
      const door: PlanDoor = { id: newId(), dir: wall.dir, at: wall.at, from, to };
      const dup = [...existing, ...doors].some(
        (d) => d.dir === door.dir && Math.abs(d.at - door.at) < px && Math.min(d.to, door.to) > Math.max(d.from, door.from),
      );
      if (!dup && to > from) doors.push(door);
      i = j;
    }
  }
  return doors;
}

// -- sizes --------------------------------------------------------------------

/**
 * Metres per world unit, from the rooms whose size was entered. Rooms without
 * an entered size are estimated with it.
 */
export function metresPerUnit(rooms: PlanRoom[]): number | null {
  const known = rooms.filter((r) => r.area_m2 && r.w * r.h > 0);
  if (!known.length) return null;
  const m2 = known.reduce((s, r) => s + (r.area_m2 ?? 0), 0);
  const units = known.reduce((s, r) => s + r.w * r.h, 0);
  return Math.sqrt(m2 / units);
}

export function roomArea(room: PlanRoom, k: number | null): { m2: number; estimated: boolean } | null {
  if (room.area_m2) return { m2: room.area_m2, estimated: false };
  if (!k) return null;
  return { m2: room.w * room.h * k * k, estimated: true };
}

// -- hit tests (eraser, tapping a room) ---------------------------------------

export function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

export function hitsStroke(s: Pt[], p: Pt, r: number) {
  if (s.length === 1) return Math.hypot(s[0][0] - p[0], s[0][1] - p[1]) <= r;
  for (let i = 1; i < s.length; i++) if (distToSegment(p, s[i - 1], s[i]) <= r) return true;
  return false;
}

export function doorEnds(d: PlanDoor): [Pt, Pt] {
  return d.dir === "h" ? [[d.from, d.at], [d.to, d.at]] : [[d.at, d.from], [d.at, d.to]];
}

export function roomAt(rooms: PlanRoom[], p: Pt): PlanRoom | null {
  // the smallest one wins, in case rooms overlap
  return (
    rooms
      .filter((r) => p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h)
      .sort((a, b) => a.w * a.h - b.w * b.h)[0] ?? null
  );
}

export function bounds(rooms: Rect[], strokes: Pt[][] = []) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rooms) {
    x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
  }
  for (const s of strokes)
    for (const [x, y] of s) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
