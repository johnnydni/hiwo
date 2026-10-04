export function NotConfigured() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 text-center">
      <p className="font-serif text-[56px] leading-none">hiwo</p>
      <p className="mt-1 text-muted">hier wohne ich.</p>
      <p className="mt-10 text-[15px] leading-relaxed text-ink/70">
        hiwo ist noch nicht mit einer Datenbank verbunden. Trag im GitHub-Repo unter Settings → Secrets and variables →
        Actions → Variables <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ein und
        starte den Deploy neu.
      </p>
    </main>
  );
}
