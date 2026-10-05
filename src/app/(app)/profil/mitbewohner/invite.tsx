"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MoreHorizontal, Plus, Share2 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { useActions } from "@/components/use-actions";
import { encodeInvite } from "@/lib/connection";
import { appUrl } from "@/lib/paths";
import { Sheet } from "@/components/sheet";
import { Button, Input, Label } from "@/components/ui";

export function InviteButton() {
  const { conn } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  // the fragment (#…) never leaves the browser, so the token is not sent to the web server
  const inviteUrl = () => `${appUrl("/einladung/")}#${encodeInvite(conn)}`;
  const close = () => {
    setOpen(false);
    setCopied(false);
  };

  async function copy() {
    await navigator.clipboard.writeText(inviteUrl());
    setCopied(true);
  }

  async function share() {
    const text = `${name.trim() ? `Hallo ${name.trim()}, ` : ""}komm mit in unsere Wohnung auf hiwo:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "hiwo", text, url: inviteUrl() });
        return;
      } catch {
        /* cancelled or unsupported: fall back to copying */
      }
    }
    await copy();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 py-3.5 text-[15px] text-muted hover:text-ink">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-ink/25">
          <Plus size={18} strokeWidth={1.6} />
        </span>
        Person einladen
      </button>
      <Sheet open={open} onClose={close} title="Person einladen">
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-muted">
            Schick den Link per WhatsApp, SMS oder Mail. Wer ihn öffnet, gibt seinen Namen ein und ist dabei.
          </p>
          <label className="block">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Nadin (optional)" />
          </label>
          <Button className="w-full" onClick={share}>
            <Share2 size={17} /> Link teilen
          </Button>
          <Button variant="secondary" className="w-full" onClick={copy}>
            {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Kopiert" : "Link kopieren"}
          </Button>
          <p className="text-center text-[12px] leading-relaxed text-faint">
            Der Link enthält den Schlüssel zu euren Daten. Teil ihn nur mit Menschen, die mitplanen sollen.
          </p>
        </div>
      </Sheet>
    </>
  );
}

export function MemberRowActions({ memberId, name }: { memberId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { removeMember } = useActions();
  return (
    <>
      <button aria-label="Mehr" onClick={() => setOpen(true)} className="-mr-3 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-ink">
        <MoreHorizontal size={18} strokeWidth={1.6} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={name}>
        <Button
          variant="secondary"
          className="w-full text-terracotta"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await removeMember(memberId).catch(() => {});
              setOpen(false);
            })
          }
        >
          Aus der Wohnung entfernen
        </Button>
        <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
          {name} verschwindet aus der Liste. Wer den Einladungslink noch hat, kommt aber weiter an die Daten, bis du
          auf GitHub einen neuen Schlüssel erstellst.
        </p>
      </Sheet>
    </>
  );
}
