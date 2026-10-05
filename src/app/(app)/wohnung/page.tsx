"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loadRoomCards } from "@/lib/data";
import { useApp, useData } from "@/components/app-context";
import { RoomCard } from "@/components/room-card";
import { EmptyState, PageHeader } from "@/components/ui";
import { AddRoomButton, AddRoomTile } from "./add-room";

export default function WohnungPage() {
  return (
    <Suspense>
      <Wohnung />
    </Suspense>
  );
}

function Wohnung() {
  const { home } = useApp();
  const neu = useSearchParams().get("neu");
  const { data: rooms } = useData(loadRoomCards);
  if (!rooms) return null;
  const existing = rooms.map((r) => r.name);

  return (
    <>
      <PageHeader
        title={home.name}
        subtitle={home.city ?? undefined}
        action={<AddRoomButton existing={existing} initiallyOpen={neu === "1"} />}
      />
      <div className="px-4 md:px-0">
        {rooms.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-5 md:gap-y-8">
            {rooms.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
            <AddRoomTile existing={existing} />
          </div>
        ) : (
          <EmptyState title="Noch keine Zimmer." action={<AddRoomButton existing={existing} big />}>
            Fang mit dem Raum an, in dem du am meisten Zeit verbringst.
          </EmptyState>
        )}
      </div>
    </>
  );
}
