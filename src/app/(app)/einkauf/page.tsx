"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signPaths } from "@/lib/data";
import { useApp, useData } from "@/components/app-context";
import type { ShoppingItem } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { ShoppingList } from "./shopping-list";

export default function EinkaufPage() {
  return (
    <Suspense>
      <Einkauf />
    </Suspense>
  );
}

function Einkauf() {
  const { home } = useApp();
  const params = useSearchParams();
  const { data } = useData(async ({ supabase, home }) => {
    const [{ data: items }, { data: rooms }] = await Promise.all([
      supabase.from("shopping_items").select("*").eq("home_id", home.id).order("created_at", { ascending: true }),
      supabase.from("rooms").select("id,name").eq("home_id", home.id).order("position").order("created_at"),
    ]);
    const list = (items ?? []) as ShoppingItem[];
    const urls = await signPaths(supabase, list.map((i) => i.image_path));
    return {
      items: list.map((i) => ({ ...i, imageUrl: i.image_path ? (urls.get(i.image_path) ?? null) : null })),
      rooms: rooms ?? [],
    };
  });

  return (
    <>
      <PageHeader title="Einkauf" subtitle={home.name} />
      {data && (
        <ShoppingList
          homeId={home.id}
          items={data.items}
          rooms={data.rooms}
          initialRoom={params.get("zimmer")}
          initiallyAdding={params.get("neu") === "1"}
        />
      )}
    </>
  );
}
