"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-context";
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
  const { doc } = useApp();
  const params = useSearchParams();
  const rooms = [...doc.rooms]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ id: r.id, name: r.name }));
  return (
    <>
      <PageHeader title="Einkauf" subtitle={doc.home.name} />
      <ShoppingList
        items={doc.shopping}
        rooms={rooms}
        initialRoom={params.get("zimmer")}
        initiallyAdding={params.get("neu") === "1"}
      />
    </>
  );
}
