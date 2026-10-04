"use client";

import { useEffect, type ReactNode } from "react";
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

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal>
      <button aria-label="Schließen" className="animate-fade-in absolute inset-0 bg-ink/30" onClick={onClose} />
      <div
        className={cx(
          "animate-sheet-up relative max-h-[90dvh] w-full overflow-y-auto rounded-t-sheet px-5 pt-3 pb-8 pb-safe shadow-soft",
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
            className={cx("rounded-full p-1.5", dark ? "hover:bg-white/10" : "hover:bg-ink/5")}
          >
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
