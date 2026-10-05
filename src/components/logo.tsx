// hiwo mark: an H whose crossbar is a roof, with the "i" (ich) standing under it and the sun as its dot.
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="104 14 202 354"
      width={(size * 202) / 354}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M122 82 V350 M122 232 L204 160 L288 232 M204 160 V112 M288 82 V350"
        fill="none"
        stroke="currentColor"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="204" cy="46" r="30" fill="#fdd99a" />
    </svg>
  );
}

/**
 * The mark drawing itself, as on the splash screen (Illy's order):
 * 1 from the foot up the right stem, over the roof, down the left stem · 2 both stems up · 3 the i, then the sun.
 */
export const LOGO_DRAW_MS = 1800;

export function LogoDraw({ size = 96, className }: { size?: number; className?: string }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 32,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    pathLength: 1,
  } as const;
  return (
    <svg
      viewBox="104 14 238 354"
      width={(size * 238) / 354}
      height={size}
      className={`logo-draw ${className ?? ""}`}
      aria-hidden="true"
    >
      <path d="M324 350 H288 V232 L204 160 L122 232 V350" {...stroke} className="ld-1" />
      <path d="M122 232 V82" {...stroke} className="ld-2" />
      <path d="M288 232 V82" {...stroke} className="ld-2" />
      <path d="M204 160 V112" {...stroke} className="ld-3" />
      <circle cx="204" cy="46" r="30" fill="#fdd99a" className="ld-sun" />
    </svg>
  );
}
