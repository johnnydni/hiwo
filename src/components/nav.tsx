"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { cx } from "./ui";
import { Logo } from "@/components/logo";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/wohnung", label: "Wohnung", icon: LayoutGrid },
  { href: "/einkauf", label: "Einkauf", icon: ShoppingBag },
  { href: "/profil", label: "Profil", icon: User },
];

// Detail pages belong to the tab they were opened from.
const ALIASES: Record<string, string[]> = { "/wohnung": ["/zimmer", "/variante"], "/einkauf": ["/artikel"] };

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return [href, ...(ALIASES[href] ?? [])].some((p) => path.startsWith(p));
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur pb-safe lg:hidden">
      <ul className="mx-auto flex max-w-md justify-around px-2 pt-2 pb-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cx(
                  "flex min-h-11 w-16 flex-col items-center justify-center gap-1 py-1 text-[11px] transition",
                  active ? "text-ink" : "text-faint",
                )}
              >
                <Icon size={22} strokeWidth={active ? 1.9 : 1.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-5 py-8 lg:flex">
      <Link href="/" className="mb-10 block">
        <span className="flex items-end gap-2.5">
          <Logo size={40} />
          <span className="font-serif text-[36px] leading-none">hiwo</span>
        </span>
        <span className="mt-1 block text-[13px] text-muted">hier wohne ich.</span>
      </Link>
      <ul className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cx(
                  "flex items-center gap-3 rounded-button px-3 py-2.5 text-[15px] transition",
                  active ? "bg-card font-medium text-ink shadow-soft" : "text-muted hover:text-ink",
                )}
              >
                <Icon size={20} strokeWidth={1.6} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
