"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AiSheet } from "@/components/ai-assistant";

const IDEAS = ["Raum verändern", "Möbel austauschen", "Stil ausprobieren"];

export function RoomAi({ roomName, hasPhoto }: { roomName: string; hasPhoto: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="space-y-2">
        {IDEAS.map((idea) => (
          <button
            key={idea}
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-3 rounded-[14px] bg-card px-4 py-3.5 text-left text-[14px] shadow-soft transition hover:translate-x-0.5"
          >
            <Sparkles size={17} strokeWidth={1.6} className="text-terracotta" />
            {idea}
          </button>
        ))}
      </div>
      {!hasPhoto && <p className="mt-2 text-[12px] text-muted">Tipp: Mit einem Foto kann hiwo dein Zimmer später direkt umgestalten.</p>}
      <AiSheet
        open={open}
        onClose={() => setOpen(false)}
        roomName={roomName}
        suggestions={["Mehr Holz", "Japandi", "Andere Couch", "Wandfarbe ändern", "Mehr Stauraum"]}
      />
    </>
  );
}
