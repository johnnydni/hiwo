// Removing a plain background from a product photo, right in the browser: no
// model, no service. Shop pictures are almost always shot on white (sometimes
// black or light grey), so it's enough to find that colour along the border and
// flood it away from the edges. A soft rim keeps the edges from looking cut.

export type Cutout = {
  canvas: HTMLCanvasElement;
  /** part of the canvas that is still visible, as fractions of its size */
  box: { x: number; y: number; w: number; h: number };
};

/** Largest side product pictures are worked at; plenty for a piece of furniture in a room photo. */
export const PRODUCT_SIDE = 1024;

/** Draw any image into a canvas of at most PRODUCT_SIDE, the starting point for every cutout. */
export function toCanvas(src: CanvasImageSource & { width: number; height: number }, w = src.width, h = src.height) {
  const s = Math.min(1, PRODUCT_SIDE / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Background colour (median of the border) and whether the border is even enough to call it one. */
export function detectBackground(src: HTMLCanvasElement): { rgb: [number, number, number]; plain: boolean; label: string } {
  const { width: w, height: h } = src;
  const d = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (const i of borderPixels(w, h)) {
    rs.push(d[i * 4]);
    gs.push(d[i * 4 + 1]);
    bs.push(d[i * 4 + 2]);
  }
  const rgb: [number, number, number] = [median(rs), median(gs), median(bs)];
  // "plain" when most of the border is close to that colour
  let near = 0;
  for (let k = 0; k < rs.length; k++) if (Math.max(Math.abs(rs[k] - rgb[0]), Math.abs(gs[k] - rgb[1]), Math.abs(bs[k] - rgb[2])) < 30) near++;
  const lum = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
  const grey = Math.max(...rgb) - Math.min(...rgb) < 20;
  const label = !grey ? "farbig" : lum > 225 ? "weiß" : lum < 40 ? "schwarz" : "grau";
  return { rgb, plain: near / rs.length > 0.7, label };
}

/**
 * Make the background transparent. `tolerance` 0–100 (0 = keep everything);
 * `holes` also removes background-coloured areas not connected to the border
 * (the gap between chair legs), at the risk of eating white parts of the product.
 */
export function removeBackground(src: HTMLCanvasElement, tolerance: number, holes: boolean): Cutout {
  const { width: w, height: h } = src;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const g = out.getContext("2d")!;
  g.drawImage(src, 0, 0);
  if (tolerance <= 0) return { canvas: out, box: { x: 0, y: 0, w: 1, h: 1 } };

  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const [br, bg, bb] = detectBackground(src).rgb;
  const limit = (tolerance / 100) * 160;
  const n = w * h;
  const dist = new Uint8Array(n);
  for (let i = 0; i < n; i++) dist[i] = Math.max(Math.abs(d[i * 4] - br), Math.abs(d[i * 4 + 1] - bg), Math.abs(d[i * 4 + 2] - bb));

  const gone = new Uint8Array(n);
  if (holes) {
    for (let i = 0; i < n; i++) if (dist[i] <= limit) gone[i] = 1;
  } else {
    // flood fill from the edges, so white inside the product stays
    const queue = new Int32Array(n);
    let head = 0;
    let tail = 0;
    for (const i of borderPixels(w, h))
      if (!gone[i] && dist[i] <= limit) {
        gone[i] = 1;
        queue[tail++] = i;
      }
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const j of nb)
        if (j >= 0 && j < n && !gone[j] && dist[j] <= limit) {
          gone[j] = 1;
          queue[tail++] = j;
        }
    }
  }

  // soft rim: pixels touching the removed area fade with their likeness to the background
  const soft = limit * 0.6 + 12;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = (i - x) / w;
    if (gone[i]) {
      d[i * 4 + 3] = 0;
      continue;
    }
    const edge = (x > 0 && gone[i - 1]) || (x < w - 1 && gone[i + 1]) || (y > 0 && gone[i - w]) || (y < h - 1 && gone[i + w]);
    if (edge) d[i * 4 + 3] = Math.round(d[i * 4 + 3] * Math.min(1, Math.max(0.15, (dist[i] - limit) / soft)));
    if (d[i * 4 + 3] > 8) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  g.putImageData(img, 0, 0);
  // nothing left: keep the whole frame as the box, so it can still be grabbed
  if (x1 < 0) return { canvas: out, box: { x: 0, y: 0, w: 1, h: 1 } };
  return { canvas: out, box: { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h } };
}

function* borderPixels(w: number, h: number) {
  for (let x = 0; x < w; x++) {
    yield x;
    yield (h - 1) * w + x;
  }
  for (let y = 1; y < h - 1; y++) {
    yield y * w;
    yield y * w + w - 1;
  }
}

function median(a: number[]) {
  const s = [...a].sort((p, q) => p - q);
  return s[s.length >> 1] ?? 255;
}
