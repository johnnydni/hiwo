"use client";

import { useRef, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addFurniture, deleteFurniture } from "@/lib/api";
import { useApp } from "@/components/app-context";
import type { FurnitureItem } from "@/lib/types";

export function Furniture({ roomId, items }: { roomId: string; items: FurnitureItem[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const app = useApp();
  return (
    <div className="rounded-card bg-card px-4 shadow-soft">
      <ul className="divide-y divide-line">
        {items.map((it) => (
          <li key={it.id} className="group flex items-center gap-3 py-3 text-[14px]">
            <span className="h-1.5 w-1.5 rounded-full bg-ink/25" />
            <span className="flex-1">{it.name}</span>
            <button
              aria-label={`${it.name} entfernen`}
              onClick={() =>
                start(async () => {
                  await deleteFurniture(it.id);
                  app.bump();
                })
              }
              disabled={pending}
              className="rounded-full p-1 text-faint opacity-60 hover:text-ink md:opacity-0 md:group-hover:opacity-100"
            >
              <X size={16} strokeWidth={1.6} />
            </button>
          </li>
        ))}
      </ul>
      <form
        ref={form}
        onSubmit={async (e) => {
          e.preventDefault();
          const input = form.current!.elements.namedItem("name") as HTMLInputElement;
          const name = input.value;
          input.value = "";
          await addFurniture(app, roomId, name);
          app.bump();
        }}
        className={`flex items-center gap-3 py-2 ${items.length ? "border-t border-line" : ""}`}
      >
        <Plus size={16} strokeWidth={1.6} className="text-muted" />
        <input
          name="name"
          placeholder={items.length ? "Weiteres Möbelstück" : "z.B. Sofa, Couchtisch, Teppich"}
          className="h-10 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
          autoComplete="off"
        />
      </form>
    </div>
  );
}
