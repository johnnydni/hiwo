"use client";

import { useState } from "react";
import type { ShoppingItem } from "@/lib/types";
import { Photo } from "./photo";
import { cx } from "./ui";

/** Own product photo if there is one, else the picture found behind the shop link. */
export function ItemThumb({ item, className }: { item: ShoppingItem; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (item.image_path) return <Photo path={item.image_path} className={className} />;
  if (!item.image_url || broken === item.image_url) return null;
  return (
    <div className={cx("overflow-hidden bg-white", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image_url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(item.image_url ?? null)}
        className="animate-fade-in h-full w-full object-contain"
      />
    </div>
  );
}
