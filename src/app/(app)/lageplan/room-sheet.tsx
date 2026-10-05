"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/components/app-context";
import { useActions } from "@/components/use-actions";
import { Sheet } from "@/components/sheet";
import { Button, Input, Label, cx } from "@/components/ui";
import { sortedRooms } from "@/lib/selectors";
import { roomArea } from "@/lib/plan";
import type { PlanRoom } from "@/lib/types";

export function formatM2(m2: number) {
  return m2.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

/** Which hiwo room an area of the plan is, and how big it is. */
export function RoomSheet({
  room,
  plan,
  scale,
  onClose,
  onChange,
  onRemove,
}: {
  room: PlanRoom | null;
  plan: PlanRoom[];
  scale: number | null;
  onClose: () => void;
  onChange: (id: string, patch: Partial<PlanRoom>) => void;
  onRemove: (id: string) => void;
}) {
  const { doc } = useApp();
  const { createRoom } = useActions();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  // keep the last room while the sheet closes
  const [shown, setShown] = useState<PlanRoom | null>(room);
  useEffect(() => {
    if (!room) return;
    setShown(room);
    setRoomId(room.room_id);
    setLabel(room.room_id ? "" : (room.label ?? ""));
    setArea(room.area_m2 ? formatM2(room.area_m2) : "");
  }, [room]);

  const taken = new Set(plan.filter((p) => p.id !== shown?.id && p.room_id).map((p) => p.room_id));
  const rooms = sortedRooms(doc);
  const estimate = shown && scale ? roomArea({ ...shown, area_m2: null }, scale) : null;
  const linked = rooms.find((r) => r.id === roomId);

  const save = async () => {
    if (!shown) return;
    setBusy(true);
    try {
      let id = roomId;
      // a new name: also a new room in hiwo, so it gets photos and a shopping list
      if (!id && label.trim()) id = await createRoom(label.trim());
      const m2 = parseFloat(area.replace(",", "."));
      onChange(shown.id, { room_id: id, label: id ? null : label.trim() || null, area_m2: m2 > 0 ? m2 : null });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!room} onClose={onClose} title={linked?.name ?? (label || "Welcher Raum ist das?")}>
      <div className="space-y-5">
        <div>
          <Label>Zimmer</Label>
          <div className="flex flex-wrap gap-2">
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={taken.has(r.id)}
                onClick={() => {
                  setRoomId(roomId === r.id ? null : r.id);
                  setLabel("");
                }}
                className={cx(
                  "rounded-full border px-3.5 py-1.5 text-[13px] transition disabled:opacity-35",
                  roomId === r.id ? "border-ink bg-ink text-white" : "border-line bg-card hover:border-ink/30",
                )}
              >
                {r.name}
              </button>
            ))}
          </div>
          <Input
            className="mt-3"
            placeholder="oder neues Zimmer, z.B. Abstellraum"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (e.target.value) setRoomId(null);
            }}
          />
        </div>
        <label className="block">
          <Label>Fläche in m²</Label>
          <Input
            inputMode="decimal"
            placeholder={estimate ? `≈ ${formatM2(estimate.m2)}` : "z.B. 14,5"}
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
          <span className="mt-1.5 block text-[12px] text-muted">
            Eine Fläche reicht: daraus schätzt hiwo die Größe aller anderen Räume.
          </span>
        </label>
        <Button className="w-full" loading={busy} onClick={save}>
          Übernehmen
        </Button>
        <div className="flex items-center justify-between">
          {shown?.room_id ? (
            <Link href={`/zimmer?id=${shown.room_id}`} className="inline-flex h-11 items-center gap-1.5 text-[14px]">
              Zum Zimmer <ArrowRight size={16} strokeWidth={1.6} />
            </Link>
          ) : (
            <span />
          )}
          <button onClick={() => shown && onRemove(shown.id)} className="h-11 text-[14px] text-terracotta">
            Aus dem Plan entfernen
          </button>
        </div>
      </div>
    </Sheet>
  );
}
