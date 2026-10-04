import { getContext, signPaths } from "@/lib/data";
import type { ShoppingItem } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { ShoppingList } from "./shopping-list";

export default async function EinkaufPage({
  searchParams,
}: {
  searchParams: Promise<{ zimmer?: string; neu?: string }>;
}) {
  const { supabase, home } = await getContext();
  const { zimmer, neu } = await searchParams;

  const [{ data: items }, { data: rooms }] = await Promise.all([
    supabase
      .from("shopping_items")
      .select("*")
      .eq("home_id", home.id)
      .order("created_at", { ascending: true }),
    supabase.from("rooms").select("id,name").eq("home_id", home.id).order("position").order("created_at"),
  ]);

  const list = (items ?? []) as ShoppingItem[];
  const urls = await signPaths(supabase, list.map((i) => i.image_path));

  return (
    <>
      <PageHeader title="Einkauf" subtitle={home.name} />
      <ShoppingList
        homeId={home.id}
        items={list.map((i) => ({ ...i, imageUrl: i.image_path ? (urls.get(i.image_path) ?? null) : null }))}
        rooms={rooms ?? []}
        initialRoom={zimmer ?? null}
        initiallyAdding={neu === "1"}
      />
    </>
  );
}
