import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "ai";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90",
  secondary: "bg-card text-ink border border-ink/80 hover:bg-paper",
  ghost: "text-ink hover:bg-ink/5",
  ai: "bg-terracotta text-white hover:bg-terracotta/90",
};

export function buttonClass(variant: Variant = "primary", extra?: string) {
  return cx(
    "inline-flex h-12 items-center justify-center gap-2 rounded-button px-5 text-[15px] font-medium",
    "transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    extra,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cx(
        "h-12 w-full rounded-input border border-line bg-card px-4 text-[15px] text-ink",
        "placeholder:text-faint outline-none transition focus:border-ink/40",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cx(
        "min-h-24 w-full rounded-input border border-line bg-card px-4 py-3 text-[15px] text-ink",
        "placeholder:text-faint outline-none transition focus:border-ink/40",
        className,
      )}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-2 block text-[13px] font-medium text-muted">{children}</span>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[15px] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="animate-fade-up px-4 pt-6 pb-4 md:px-0 md:pt-10">
      <div className="flex min-h-10 items-center justify-between">
        {back ? (
          <Link href={back} aria-label="Zurück" className="-ml-2 rounded-full p-2 hover:bg-ink/5">
            <ArrowLeft size={22} strokeWidth={1.6} />
          </Link>
        ) : (
          <span />
        )}
        {action}
      </div>
      <h1 className="font-serif text-[34px] leading-tight font-medium md:text-[42px]">{title}</h1>
      {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
    </header>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center rounded-card px-6 py-12 text-center">
      <p className="font-serif text-[26px] leading-tight">{title}</p>
      {children && <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-line font-medium text-ink/80"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** Photo placeholder used when a room has no photo yet. Warm, not an icon grid. */
export function PhotoPlaceholder({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      className={cx(
        "flex items-end bg-gradient-to-br from-[#ece8df] via-[#e6e1d6] to-[#ddd6c8] p-4",
        className,
      )}
    >
      {label && <span className="font-serif text-[22px] text-ink/40">{label}</span>}
    </div>
  );
}
