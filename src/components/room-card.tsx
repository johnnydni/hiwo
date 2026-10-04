import Link from "next/link";
import type { RoomCard as RoomCardData } from "@/lib/data";
import { plural } from "@/lib/format";
import { PhotoPlaceholder, cx } from "./ui";

export function RoomCard({ room, compact }: { room: RoomCardData; compact?: boolean }) {
  return (
    <Link href={`/zimmer?id=${room.id}`} className="group block animate-fade-up">
      <div className={cx("overflow-hidden rounded-image bg-line", compact ? "aspect-square" : "aspect-[4/3]")}>
        {room.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={room.coverUrl}
            alt={room.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <PhotoPlaceholder className="h-full w-full" />
        )}
      </div>
      <p className={cx("mt-2 font-medium", compact ? "text-[13px]" : "text-[15px]")}>{room.name}</p>
      {!compact && (
        <p className="text-[12px] text-muted">
          {plural(room.itemCount, "Element", "Elemente")}
          {room.photoCount > 0 && ` · ${plural(room.photoCount, "Foto", "Fotos")}`}
        </p>
      )}
    </Link>
  );
}
