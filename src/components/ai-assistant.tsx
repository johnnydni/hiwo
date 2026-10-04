"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles, Wand2, Repeat, Palette, Layers } from "lucide-react";
import { Sheet } from "./sheet";

const actions = [
  { label: "Raum verändern", icon: Wand2 },
  { label: "Möbel austauschen", icon: Repeat },
  { label: "Stil ausprobieren", icon: Palette },
  { label: "Neue Variante erstellen", icon: Layers },
];

/**
 * Global KI entry point. Phase 1 shows the shape of the feature honestly:
 * the input is there, generation arrives in phase 2.
 */
export function AiFab({ roomName }: { roomName?: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const hidden = path.startsWith("/einkauf") || path.startsWith("/profil");
  if (hidden) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="hiwo fragen"
        className="fixed right-5 bottom-24 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-white shadow-soft transition hover:scale-105 active:scale-95 md:right-10 md:bottom-10"
      >
        <Sparkles size={22} strokeWidth={1.6} />
      </button>
      <AiSheet open={open} onClose={() => setOpen(false)} roomName={roomName} />
    </>
  );
}

export function AiSheet({
  open,
  onClose,
  roomName,
  suggestions,
}: {
  open: boolean;
  onClose: () => void;
  roomName?: string;
  suggestions?: string[];
}) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const close = () => {
    setSent(false);
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} dark>
      <div className="pb-2 text-center">
        <p className="font-serif text-[30px]">hiwo</p>
        <p className="mt-3 font-serif text-[24px] leading-snug text-white/90">
          {roomName ? (
            <>
              <span className="mb-1 block font-sans text-[12px] tracking-wide text-white/50 uppercase">{roomName}</span>
              Was möchtest du
              <br />
              verändern?
            </>
          ) : (
            <>
              Was möchtest du
              <br />
              für dein Zuhause tun?
            </>
          )}
        </p>
      </div>
      <form
        className="mt-6 flex items-center gap-2 rounded-full bg-white p-1.5 pl-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) setSent(true);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={roomName ? "Mach den Raum wärmer …" : "Frag hiwo …"}
          className="h-10 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
        />
        <button
          aria-label="Senden"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white"
        >
          <ArrowRight size={18} />
        </button>
      </form>
      {sent ? (
        <p className="animate-fade-up mt-6 rounded-card bg-white/10 p-4 text-[14px] leading-relaxed text-white/80">
          Danke! Die KI-Gestaltung kommt im nächsten Schritt. Dann wird aus deinem Foto eine neue Variante, das Original
          bleibt immer erhalten.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {(suggestions ?? actions.map((a) => a.label)).map((label) => {
            const Icon = actions.find((a) => a.label === label)?.icon ?? Sparkles;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setText((t) => (t ? `${t} ${label}` : label))}
                className="flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-[14px] text-white/90 hover:bg-white/10"
              >
                <Icon size={16} strokeWidth={1.6} />
                {label}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-center text-[12px] text-white/40">KI-Ideen sind in Vorbereitung.</p>
    </Sheet>
  );
}
