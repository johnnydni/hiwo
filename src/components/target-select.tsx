"use client";

import { useApp } from "./app-context";
import { targetOptions } from "@/lib/selectors";
import { Label } from "./ui";

/** "Für …" picker: Gesamte Wohnung, a room, or one variant of a room. Submits as `target`. */
export function TargetSelect({ defaultValue }: { defaultValue: string }) {
  const { doc } = useApp();
  const rooms = targetOptions(doc);
  return (
    <label className="block">
      <Label>Für</Label>
      <select
        name="target"
        defaultValue={defaultValue}
        className="h-12 w-full rounded-input border border-line bg-card px-4 text-base outline-none"
      >
        <option value="">Gesamte Wohnung</option>
        {rooms.map((r) =>
          r.variants.length ? (
            <optgroup key={r.id} label={r.name}>
              <option value={r.id}>{r.name} allgemein</option>
              {r.variants.map((v) => (
                <option key={v.id} value={`${r.id}/${v.id}`}>
                  {r.name} · {v.name}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

/** "Wohnzimmer · Japandi" / "Wohnzimmer" / "Gesamte Wohnung" */
export function useTargetLabel() {
  const { doc } = useApp();
  return (item: { room_id: string | null; variant_id: string | null }) => {
    const room = doc.rooms.find((r) => r.id === item.room_id);
    if (!room) return "Gesamte Wohnung";
    const variant = doc.photos.find((p) => p.id === item.variant_id);
    return variant ? `${room.name} · ${variant.name}` : room.name;
  };
}
