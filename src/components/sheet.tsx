"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "./ui";

export function Sheet({
  open,
  onClose,
  title,
  children,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  dark?: boolean;
}) {
  // stay mounted for the closing animation
  const [mounted, setMounted] = useState(open);
  const closing = mounted && !open;
  useEffect(() => {
    if (open) setMounted(true);
    else if (mounted) {
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;
  // Portal: a sheet opened from an animated header would otherwise be positioned
  // inside that header (transforms make `fixed` relative to the element).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal>
      <button
        aria-label="Schließen"
        className={cx("absolute inset-0 bg-ink/30", closing ? "animate-fade-out" : "animate-fade-in")}
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        className={cx(
          closing ? "animate-sheet-down md:animate-dialog-out" : "animate-sheet-up md:animate-dialog-in",
          closing && "pointer-events-none",
          "relative max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-sheet px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-soft",
          "md:max-w-lg md:rounded-sheet md:pb-6",
          dark ? "bg-ink text-white" : "bg-paper",
        )}
      >
        <div className={cx("mx-auto mb-3 h-1 w-10 rounded-full md:hidden", dark ? "bg-white/20" : "bg-line")} />
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="text-[17px] font-semibold">{title}</div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className={cx("-mr-2 flex h-11 w-11 items-center justify-center rounded-full", dark ? "hover:bg-white/10" : "hover:bg-ink/5")}
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
