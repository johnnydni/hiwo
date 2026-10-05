"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkRepo, GitHubError } from "@/lib/github";
import { normalizeRepo, readConnection, saveConnection } from "@/lib/connection";
import { Button, Input, Label } from "@/components/ui";

function explain(e: unknown) {
  if (e instanceof GitHubError) {
    if (e.status === 401) return "Der Schlüssel stimmt nicht oder ist abgelaufen.";
    if (e.status === 403) return "GitHub lässt den Zugriff gerade nicht zu. Versuch es gleich noch einmal.";
    if (e.status === 404) return "Das Repo gibt es nicht, oder der Schlüssel darf es nicht sehen.";
  }
  return "GitHub ist gerade nicht erreichbar.";
}

export function ConnectForm({ next }: { next: string }) {
  const router = useRouter();
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicRepo, setPublicRepo] = useState(false);

  useEffect(() => {
    const saved = readConnection();
    if (saved) setRepo(saved.repo);
  }, []);

  function finish(r: string) {
    const saved = readConnection();
    // keep "who am I" when reconnecting to the same repo
    saveConnection({ repo: r, token: token.trim(), memberId: saved?.repo === r ? saved.memberId : undefined });
    router.replace(`/willkommen/?next=${encodeURIComponent(next)}`);
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    const r = normalizeRepo(repo);
    if (!/^[\w.-]+\/[\w.-]+$/.test(r)) return setError("Bitte gib das Repo als besitzer/name an.");
    if (publicRepo) return finish(r);
    setBusy(true);
    setError(null);
    try {
      const info = await checkRepo({ repo: r, token: token.trim() });
      if (!info.canWrite) {
        setError("Der Schlüssel darf nur lesen. Gib ihm unter „Contents“ Lese- und Schreibrechte.");
      } else if (!info.private) {
        setPublicRepo(true);
      } else {
        return finish(r);
      }
    } catch (err) {
      setError(explain(err));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={connect} className="space-y-3">
      <label className="block">
        <Label>Daten-Repo</Label>
        <Input
          required
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="besitzer/hiwo-daten"
          value={repo}
          onChange={(e) => {
            setRepo(e.target.value);
            setPublicRepo(false);
          }}
        />
      </label>
      <label className="block">
        <Label>Schlüssel (GitHub-Token)</Label>
        <Input
          required
          type="password"
          autoComplete="off"
          placeholder="github_pat_…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>
      {error && <p className="text-center text-[13px] text-terracotta">{error}</p>}
      {publicRepo && (
        <p className="rounded-input bg-terracotta/10 p-3 text-[13px] leading-relaxed text-terracotta">
          Dieses Repo ist öffentlich. Fotos und Listen könnte dann jeder im Internet sehen. Besser: ein privates Repo
          nehmen.
        </p>
      )}
      <Button className="w-full" loading={busy}>
        {publicRepo ? "Trotzdem verbinden" : "Verbinden"}
      </Button>
      <details className="pt-2 text-[13px] leading-relaxed text-muted">
        <summary className="cursor-pointer text-center text-faint">Wie bekomme ich das?</summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          <li>
            Auf GitHub ein <b>privates</b> Repo anlegen, z.B. <i>hiwo-daten</i>.
          </li>
          <li>
            Unter Settings → Developer settings → Fine-grained tokens einen Schlüssel erstellen: nur dieses Repo,
            Recht „Contents: Read and write“.
          </li>
          <li>Repo und Schlüssel hier eintragen. Familie lädst du danach per Link ein.</li>
        </ol>
      </details>
    </form>
  );
}
