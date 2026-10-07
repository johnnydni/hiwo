import { ICON_FILES } from "@/lib/grocery-icons";
import { BASE_PATH } from "@/lib/paths";

/**
 * Drawing for a catalogue icon token (emoji or ":openmoji-name"), from the
 * OpenMoji files in public/einkauf-icons. Unknown tokens fall back to the emoji.
 */
export function GroceryIcon({ icon, size, className }: { icon: string; size: number; className?: string }) {
  const file = ICON_FILES[icon];
  if (!file)
    return icon.startsWith(":") ? null : (
      <span className={className} style={{ fontSize: size * 0.85, lineHeight: 1 }} aria-hidden>
        {icon}
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element -- static export, plain SVG files
  return <img src={`${BASE_PATH}/einkauf-icons/${file}.svg`} width={size} height={size} alt="" draggable={false} className={className} />;
}
