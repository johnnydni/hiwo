"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useActions } from "@/components/use-actions";
import { usePickPhoto } from "@/components/pick-photo";
import { Photo } from "@/components/photo";
import { formatPrice, plural } from "@/lib/format";
import type { RoomPhoto, ShoppingItem } from "@/lib/types";

export function VariantGrid({
  roomId,
  variants,
  items,
}: {
  roomId: string;
  variants: RoomPhoto[];
  items: ShoppingItem[];
}) {
  const router = useRouter();
  const { addVariant } = useActions();
  const picker = usePickPhoto(async (file) => {
    const id = await addVariant(roomId, file);
    router.push(`/variante?id=${id}`);
  });

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {variants.map((v) => {
        const mine = items.filter((i) => i.variant_id === v.id && i.status === "open");
        const total = mine.reduce((s, i) => s + (i.price_cents ?? 0), 0);
        return (
          <Link key={v.id} href={`/variante?id=${v.id}`} className="group animate-fade-up block transition-transform duration-150 active:scale-[0.98]">
            <Photo path={v.path} alt={v.name ?? ""} className="aspect-[4/3] rounded-[16px]" />
            <p className="mt-1.5 truncate text-[14px] font-medium">{v.name}</p>
            <p className="text-[12px] text-muted">
              {mine.length ? plural(mine.length, "Ding", "Dinge") : "Noch keine Liste"}
              {total > 0 && ` · ${formatPrice(total)}`}
            </p>
          </Link>
        );
      })}
      <button
        onClick={picker.pick}
        disabled={picker.busy}
        className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-[16px] border border-dashed border-ink/20 bg-card px-3 text-center text-[13px] text-muted transition hover:text-ink"
      >
        {picker.busy ? <Loader2 size={20} className="animate-spin" /> : <Plus size={22} strokeWidth={1.4} />}
        Variante hinzufügen
      </button>
      {picker.input}
      {picker.error && <p className="col-span-2 text-[13px] text-terracotta">{picker.error}</p>}
    </div>
  );
}
