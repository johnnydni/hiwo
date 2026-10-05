import Link from "next/link";
import type { RoomCard as RoomCardData } from "@/lib/selectors";
import { plural } from "@/lib/format";
import { Photo } from "./photo";
import { cx } from "./ui";

export function RoomCard({ room, compact }: { room: RoomCardData; compact?: boolean }) {
  const meta = [
    room.variantCount > 0 && plural(room.variantCount, "Variante", "Varianten"),
    room.openCount > 0 && `${room.openCount} auf der Liste`,
  ].filter(Boolean);
  return (
    <Link href={`/zimmer?id=${room.id}`} className="group block animate-fade-up transition-transform duration-150 active:scale-[0.98]">
      <Photo
        path={room.coverPath}
        alt={room.name}
        className={cx("rounded-image", compact ? "aspect-square" : "aspect-[4/3]")}
        imgClassName="transition duration-300 group-hover:scale-[1.02]"
      />
      <p className={cx("mt-2 font-medium", compact ? "text-[13px]" : "text-[15px]")}>{room.name}</p>
      {!compact && <p className="text-[12px] text-muted">{meta.length ? meta.join(" · ") : "Noch leer"}</p>}
    </Link>
  );
}
