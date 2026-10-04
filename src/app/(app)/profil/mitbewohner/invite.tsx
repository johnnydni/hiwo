"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MoreHorizontal, Plus, Share2 } from "lucide-react";
import { createInvite, deleteInvite, removeMember } from "@/app/actions";
import { Sheet } from "@/components/sheet";
import { Button, Input, Label } from "@/components/ui";

function inviteUrl(token: string) {
  return `${location.origin}/einladung/${token}`;
}

async function share(token: string, name?: string) {
  const url = inviteUrl(token);
  const text = `${name ? `Hallo ${name}, ` : ""}komm mit in unsere Wohnung auf hiwo:`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "hiwo", text, url });
      return "shared";
    } catch {
      /* cancelled */
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ token: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const close = () => {
    setOpen(false);
    setResult(null);
    setCopied(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 py-3.5 text-[15px] text-muted hover:text-ink">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-ink/25">
          <Plus size={18} strokeWidth={1.6} />
        </span>
        Person einladen
      </button>
      <Sheet open={open} onClose={close} title={result ? undefined : "Person einladen"}>
        {result ? (
          <div className="animate-fade-up py-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage text-white">
              <Check size={22} className="animate-pop" />
            </span>
            <p className="mt-4 font-serif text-[26px]">{result.name} wurde eingeladen.</p>
            <p className="mx-auto mt-2 max-w-xs text-[14px] text-muted">
              Schick den Link per WhatsApp, SMS oder Mail. Wer ihn öffnet und sich anmeldet, ist dabei.
            </p>
            <div className="mt-6 space-y-3">
              <Button
                className="w-full"
                onClick={async () => {
                  const r = await share(result.token, result.name);
                  if (r === "copied") setCopied(true);
                }}
              >
                <Share2 size={17} /> Link teilen
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl(result.token));
                  setCopied(true);
                }}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Kopiert" : "Link kopieren"}
              </Button>
            </div>
          </div>
        ) : (
          <form
            action={(fd) => start(async () => setResult(await createInvite(fd)))}
            className="space-y-4"
          >
            <p className="text-[14px] leading-relaxed text-muted">
              Lade Familie oder Mitbewohner ein, um gemeinsam an eurer Wohnung zu arbeiten.
            </p>
            <label className="block">
              <Label>Name</Label>
              <Input name="name" placeholder="z.B. Nadin" />
            </label>
            <label className="block">
              <Label>E-Mail oder Telefonnummer</Label>
              <Input name="contact" placeholder="optional" />
            </label>
            <label className="block">
              <Label>Rolle</Label>
              <select disabled className="h-12 w-full rounded-input border border-line bg-card px-4 text-[15px] text-muted">
                <option>Mitglied</option>
              </select>
            </label>
            <Button className="w-full" disabled={pending}>Einladen</Button>
            <p className="text-center text-[12px] text-faint">
              Mit E-Mail-Adresse tritt die Person automatisch bei, sobald sie sich mit dieser Adresse anmeldet.
            </p>
          </form>
        )}
      </Sheet>
    </>
  );
}

export function InviteRowActions({ id, token }: { id: string; token: string }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="Link teilen"
        onClick={async () => {
          if ((await share(token)) === "copied") {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="rounded-full p-2 text-muted hover:text-ink"
      >
        {copied ? <Check size={17} /> : <Share2 size={17} strokeWidth={1.6} />}
      </button>
      <button
        onClick={() => start(() => deleteInvite(id))}
        disabled={pending}
        className="rounded-full px-2 py-1 text-[13px] text-muted hover:text-terracotta"
      >
        Zurückziehen
      </button>
    </div>
  );
}

export function MemberRowActions({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button aria-label="Mehr" onClick={() => setOpen(true)} className="rounded-full p-2 text-muted hover:text-ink">
        <MoreHorizontal size={18} strokeWidth={1.6} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={name}>
        <Button
          variant="secondary"
          className="w-full text-terracotta"
          disabled={pending}
          onClick={() => start(async () => { await removeMember(userId); setOpen(false); })}
        >
          Aus der Wohnung entfernen
        </Button>
      </Sheet>
    </>
  );
}
