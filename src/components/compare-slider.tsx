"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronsLeftRight } from "lucide-react";
import { Photo } from "./photo";

/** Before/after: the base photo on the left of the handle, the variant on the right. */
export function CompareSlider({ before, after, className }: { before: string; after: string; className?: string }) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  const down = (e: PointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const move = (e: PointerEvent) => dragging.current && moveTo(e.clientX);
  const up = () => (dragging.current = false);
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - step));
    else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + step));
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={box}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDragStart={(e) => e.preventDefault()}
      // vertical swipes still scroll the page; horizontal ones move the handle
      style={{ touchAction: "pan-y" }}
      className={`absolute inset-0 cursor-ew-resize select-none ${className ?? ""}`}
    >
      <Photo path={after} alt="Variante" className="absolute inset-0" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Photo path={before} alt="Vorher" className="absolute inset-0" />
      </div>
      <span className="pointer-events-none absolute top-4 left-18 rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-medium backdrop-blur md:top-14">
        Vorher
      </span>
      <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-medium backdrop-blur md:top-14">
        Variante
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Vorher und Variante vergleichen"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={key}
        className="absolute inset-y-0 -ml-px w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.35)] outline-none"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-soft">
          <ChevronsLeftRight size={20} strokeWidth={1.6} />
        </span>
      </div>
    </div>
  );
}
