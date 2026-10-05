export function firstName(name: string | null | undefined) {
  return (name ?? "").trim().split(/\s+/)[0] || "du";
}

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
export function formatPrice(cents: number | null | undefined) {
  if (cents == null) return null;
  return euro.format(cents / 100);
}

/** "89,90" / "89.90" / "89" → 8990 */
export function parsePrice(input: string): number | null {
  const s = input.replace(/[€\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function greeting(date = new Date()) {
  const h = Number(
    new Intl.DateTimeFormat("de-DE", { hour: "numeric", hour12: false, timeZone: "Europe/Berlin" }).format(date),
  );
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Hallo";
  return "Guten Abend";
}

export function relativeDay(iso: string) {
  const d = new Date(iso);
  const tz = "Europe/Berlin";
  const day = (x: Date) => new Intl.DateTimeFormat("de-DE", { timeZone: tz, dateStyle: "short" }).format(x);
  const time = new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  if (day(d) === day(now)) return `heute · ${time}`;
  if (day(d) === day(yesterday)) return `gestern · ${time}`;
  return new Intl.DateTimeFormat("de-DE", { timeZone: tz, day: "numeric", month: "long" }).format(d);
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
