"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { roomCards } from "@/lib/selectors";
import { useApp } from "@/components/app-context";
import { SortableRooms } from "./sortable-rooms";
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
  const { doc } = useApp();
  const { home } = doc;
  const neu = useSearchParams().get("neu");
  const rooms = roomCards(doc);
  const existing = rooms.map((r) => r.name);

  return (
    <>
      <PageHeader
        title={home.name}
        subtitle={home.city ?? undefined}
        titleAction={
          <>
            <Link href="/lageplan" aria-label="Lageplan" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5">
              <MapIcon size={21} strokeWidth={1.6} />
            </Link>
            <AddRoomButton existing={existing} initiallyOpen={neu === "1"} />
          </>
        }
      />
      <div className="px-4 md:px-0">
        {rooms.length ? (
          <SortableRooms rooms={rooms}>
            <AddRoomTile existing={existing} />
          </SortableRooms>
        ) : (
          <EmptyState title="Noch keine Zimmer." action={<AddRoomButton existing={existing} big />}>
            Fang mit dem Raum an, in dem du am meisten Zeit verbringst.
          </EmptyState>
        )}
      </div>
    </>
  );
}
