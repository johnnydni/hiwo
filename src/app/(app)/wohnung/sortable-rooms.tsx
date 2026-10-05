"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useActions } from "@/components/use-actions";
import { RoomCard } from "@/components/room-card";
import type { RoomCard as RoomCardData } from "@/lib/selectors";
import { cx } from "@/components/ui";

/**
 * Room grid the family can reorder: drag with the mouse, or press and hold on a
 * phone (a plain swipe still scrolls). Each drop is one commit.
 */
export function SortableRooms({ rooms, children }: { rooms: RoomCardData[]; children?: ReactNode }) {
  const { reorderRooms } = useActions();
  const [order, setOrder] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  const justDragged = useRef(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // once the saved order arrives, drop the local one
  const savedIds = rooms.map((r) => r.id).join();
  useEffect(() => setOrder(null), [savedIds]);

  const byId = new Map(rooms.map((r) => [r.id, r]));
  const ids = order?.filter((id) => byId.has(id)) ?? rooms.map((r) => r.id);

  function onDragEnd({ active, over }: DragEndEvent) {
    // the drop ends with a click on the card's link; swallow it
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 50);
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setOrder(next);
    setError(false);
    reorderRooms(next).catch(() => {
      setOrder(null);
      setError(true);
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div
          className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-5 md:gap-y-8"
          onClickCapture={(e) => {
            if (justDragged.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {ids.map((id) => (
            <SortableRoom key={id} room={byId.get(id)!} />
          ))}
          {children}
        </div>
      </SortableContext>
      {error && <p className="mt-4 text-[13px] text-terracotta">Die neue Reihenfolge konnte nicht gespeichert werden.</p>}
      {rooms.length > 1 && (
        <p className="mt-6 text-center text-[12px] text-faint">Zum Umsortieren ein Zimmer gedrückt halten und ziehen.</p>
      )}
    </DndContext>
  );
}

function SortableRoom({ room }: { room: RoomCardData }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: room.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="verschiebbares Zimmer"
      // links and images are natively draggable on desktop, which would cancel the sort
      onDragStart={(e) => e.preventDefault()}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        // no iOS link preview / text selection while holding
        "touch-manipulation select-none [-webkit-touch-callout:none]",
        isDragging && "relative z-10 scale-[1.03] opacity-90 drop-shadow-xl",
      )}
    >
      <RoomCard room={room} />
    </div>
  );
}
