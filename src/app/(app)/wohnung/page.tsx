import { getContext, loadRoomCards } from "@/lib/data";
import { RoomCard } from "@/components/room-card";
import { EmptyState, PageHeader } from "@/components/ui";
import { AddRoomButton, AddRoomTile } from "./add-room";

export default async function WohnungPage({ searchParams }: { searchParams: Promise<{ neu?: string }> }) {
  const ctx = await getContext();
  const rooms = await loadRoomCards(ctx);
  const { neu } = await searchParams;
  const existing = rooms.map((r) => r.name);

  return (
    <>
      <PageHeader
        title={ctx.home.name}
        subtitle={ctx.home.city ?? undefined}
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
