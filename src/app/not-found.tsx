import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-[30px]">Hier ist nichts.</p>
      <p className="mt-2 text-[14px] text-muted">Vielleicht wurde es gelöscht oder verschoben.</p>
      <Link href="/" className={buttonClass("primary", "mt-6")}>Zurück nach Hause</Link>
    </main>
  );
}
