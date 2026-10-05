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
