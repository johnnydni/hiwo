"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { appUrl, createClient } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: appUrl(`/auth/confirm/?next=${encodeURIComponent(next)}`) },
    });
    setBusy(false);
    if (error) setError("Das hat nicht geklappt. Bitte prüfe die E-Mail-Adresse.");
    else setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) {
      setBusy(false);
      setError("Der Code passt leider nicht. Versuch es noch einmal.");
      return;
    }
    await supabase.rpc("accept_pending_invites");
    router.replace(next);
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="animate-fade-up space-y-3">
        <p className="text-center text-[14px] text-muted">
          Wir haben dir einen Code an <span className="text-ink">{email}</span> geschickt.
        </p>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-stelliger Code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="text-center text-[20px] tracking-[0.4em]"
          autoFocus
        />
        {error && <p className="text-center text-[13px] text-terracotta">{error}</p>}
        <Button className="w-full" disabled={busy || code.length < 6}>
          Anmelden
        </Button>
        <button type="button" onClick={() => setStep("email")} className="w-full py-2 text-[14px] text-muted">
          Andere E-Mail verwenden
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-3">
      <Input
        type="email"
        required
        autoComplete="email"
        placeholder="Deine E-Mail-Adresse"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <p className="text-center text-[13px] text-terracotta">{error}</p>}
      <Button className="w-full" disabled={busy}>
        Weiter
      </Button>
      <p className="pt-2 text-center text-[12px] text-faint">Kein Passwort nötig. Du bekommst einen Code per E-Mail.</p>
    </form>
  );
}
