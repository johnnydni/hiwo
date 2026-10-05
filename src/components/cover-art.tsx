// Drawn title pictures for a home, one per phase of living there, in the
// line style of the logo. Each scene is 2100×900 (21:9) with everything that
// matters in the middle 1200 (4:3), so `slice` crops it well on any width.
import type { ReactNode } from "react";
import type { CoverArtId } from "@/lib/types";
import type { homeCover } from "@/lib/selectors";
import { Photo } from "./photo";
import { cx } from "./ui";

export const COVER_ARTS: { id: CoverArtId; name: string; hint: string }[] = [
  { id: "entschieden", name: "Entschieden", hint: "Noch nicht eingezogen" },
  { id: "umzug", name: "Umzug", hint: "Kartons und Auspacken" },
  { id: "mittendrin", name: "Mittendrin", hint: "Umstellen und Ideen" },
  { id: "angekommen", name: "Angekommen", hint: "Einfach gemütlich" },
];

const INK = "#1f1f1d";
const SUN = "#fdd99a";
const TERRA = "#b9684a";
const TERRA_LIGHT = "#e9c4b3";
const SAGE_LIGHT = "#cfd6c6";
const CREAM = "#fbf8f1";
const WARM = "#fbf0d9";
const KRAFT = "#d9b68f";
const KRAFT_DARK = "#c49a6c";

export function CoverArt({ id, className, title }: { id: CoverArtId; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 2100 900"
      preserveAspectRatio="xMidYMid slice"
      className={cx("block h-full w-full", className)}
      role="img"
      aria-label={title ?? COVER_ARTS.find((a) => a.id === id)?.name}
    >
      {SCENES[id]()}
    </svg>
  );
}

/** The home's title picture, photo or drawn. */
export function HomeCover({
  cover,
  alt,
  className,
  imgClassName,
}: {
  cover: ReturnType<typeof homeCover>;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  if (cover && "art" in cover)
    return (
      <div className={cx("relative overflow-hidden", className)}>
        <CoverArt id={cover.art} title={alt} className={cx("animate-fade-in", imgClassName)} />
      </div>
    );
  return <Photo path={cover?.path} alt={alt} className={className} imgClassName={imgClassName} />;
}

/** Outlines in ink with round ends, like the logo. */
function Lines({ children, width = 7 }: { children: ReactNode; width?: number }) {
  return (
    <g stroke={INK} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  );
}

/** Wall, floor and the floor line every room scene stands on. */
function Room({ wall, floor }: { wall: string; floor: string }) {
  return (
    <>
      <rect width="2100" height="900" fill={wall} />
      <rect y="720" width="2100" height="180" fill={floor} />
      <path d="M0 720 H2100" stroke={INK} strokeWidth="7" />
    </>
  );
}

function Leaf({ d }: { d: string }) {
  return <path d={d} fill={SAGE_LIGHT} />;
}

const SCENES: Record<CoverArtId, () => ReactNode> = {
  // in front of the house: decided, not moved in yet
  entschieden: () => (
    <>
      <rect width="2100" height="900" fill="#eef1ea" />
      <path d="M0 700 Q400 600 800 690 T1500 680 T2100 690 V900 H0 Z" fill="#dfe5d7" />
      <rect y="720" width="2100" height="180" fill="#e3e8dc" />
      <circle cx="1480" cy="190" r="52" fill={SUN} />
      <Lines width={6}>
        <path d="M640 210 q16 -16 32 0 q16 -16 32 0 M740 260 q12 -12 24 0 q12 -12 24 0" fill="none" />
      </Lines>
      <Lines>
        <path d="M0 720 H2100" />
        {/* path up to the door */}
        <path d="M1015 720 L950 900 H1150 L1085 720 Z" fill="#efe7d6" />
        {/* tree */}
        <path d="M640 720 V560" fill="none" />
        <circle cx="640" cy="490" r="90" fill={SAGE_LIGHT} />
        <path d="M640 600 L600 560 M640 580 L675 545" fill="none" />
        {/* house */}
        <path d="M1165 380 V300 H1205 V411" fill={CREAM} />
        <path d="M860 720 V440 L1050 290 L1240 440 V720 Z" fill={CREAM} />
        <path d="M820 470 L1050 290 L1280 470" fill="none" />
        <circle cx="1050" cy="385" r="28" fill={WARM} />
        <rect x="900" y="500" width="80" height="72" rx="4" fill={WARM} />
        <rect x="1120" y="500" width="80" height="72" rx="4" fill={WARM} />
        <path d="M940 500 V572 M900 536 H980 M1160 500 V572 M1120 536 H1200" fill="none" />
        <path d="M1015 720 V635 A35 35 0 0 1 1085 635 V720" fill={TERRA} />
        <circle cx="1071" cy="672" r="5" fill={INK} stroke="none" />
        {/* bush */}
        <path d="M1260 720 C1250 670 1300 650 1325 675 C1345 640 1400 650 1395 700 C1420 700 1420 720 1410 720 Z" fill={SAGE_LIGHT} />
        {/* sign with a heart: this one it is */}
        <path d="M1500 720 V575" fill="none" />
        <rect x="1420" y="470" width="160" height="105" rx="12" fill="#ffffff" />
        <path
          d="M1500 552 C1462 526 1456 498 1478 490 C1490 486 1498 494 1500 502 C1502 494 1510 486 1522 490 C1544 498 1538 526 1500 552 Z"
          fill={TERRA}
        />
      </Lines>
    </>
  ),

  // moving in: boxes, a plant on top, unpacking
  umzug: () => (
    <>
      <Room wall="#f3ece3" floor="#e7dac8" />
      <Lines>
        {/* window */}
        <rect x="540" y="200" width="250" height="280" rx="6" fill="#eef1ea" />
        <circle cx="700" cy="275" r="30" fill={SUN} stroke="none" />
        <path d="M665 200 V480 M540 340 H790 M525 492 H805" fill="none" />
        {/* rolled-up rug leaning on the wall */}
        <g transform="rotate(-9 830 720)">
          <rect x="800" y="470" width="62" height="250" rx="31" fill={SAGE_LIGHT} />
          <ellipse cx="831" cy="490" rx="31" ry="18" fill={CREAM} />
          <path d="M800 560 H862 M800 620 H862" fill="none" />
        </g>
        {/* stacked boxes */}
        <rect x="900" y="540" width="280" height="180" rx="4" fill={KRAFT} />
        <rect x="1020" y="540" width="40" height="60" fill="#ead2b0" strokeWidth="5" />
        <rect x="935" y="640" width="70" height="44" rx="3" fill="#ffffff" strokeWidth="5" />
        <path d="M948 656 H990 M948 670 H978" fill="none" strokeWidth="4" />
        <rect x="930" y="390" width="220" height="150" rx="4" fill={KRAFT} />
        <rect x="1020" y="390" width="40" height="50" fill="#ead2b0" strokeWidth="5" />
        {/* plant on top */}
        <Leaf d="M1040 332 C1004 302 994 262 1004 232 C1034 252 1044 292 1040 332 Z" />
        <Leaf d="M1040 332 C1066 292 1096 272 1118 272 C1108 302 1076 322 1040 332 Z" />
        <Leaf d="M1040 332 C1034 290 1044 240 1066 208 C1076 250 1066 300 1040 332 Z" />
        <path d="M1000 390 L990 330 H1090 L1080 390 Z" fill={TERRA} />
        {/* an open box, being unpacked */}
        <path d="M1300 600 L1318 548 H1478 L1496 600 Z" fill={KRAFT_DARK} />
        <path d="M1350 600 V505" fill="none" />
        <path d="M1310 505 H1390 L1372 445 H1328 Z" fill={WARM} />
        <path d="M1410 600 L1432 512 L1472 520 L1452 606 Z" fill={TERRA} />
        <rect x="1290" y="595" width="220" height="125" rx="4" fill={KRAFT} />
        <path d="M1290 595 L1240 640 M1510 595 L1556 636" fill="none" />
        {/* books already out */}
        <rect x="1560" y="680" width="84" height="40" rx="3" fill={TERRA_LIGHT} />
        <rect x="1570" y="645" width="66" height="35" rx="3" fill={SAGE_LIGHT} />
      </Lines>
    </>
  ),

  // in the middle of it: moving furniture, notes on the wall, second thoughts
  mittendrin: () => (
    <>
      <Room wall="#f1efe9" floor="#e4e0d6" />
      <Lines>
        {/* ladder leaning on the wall */}
        <path d="M600 720 L680 300 M670 720 L750 300" fill="none" />
        <path d="M612 657 H682 M628 573 H698 M644 489 H714 M660 405 H730 M676 321 H746" fill="none" />
        {/* paint bucket */}
        <path d="M505 660 A40 22 0 0 1 585 660" fill="none" />
        <path d="M500 660 H590 L582 720 H508 Z" fill={TERRA_LIGHT} />
        {/* colour swatches taped to the wall */}
        <rect x="800" y="320" width="44" height="44" rx="4" fill={SAGE_LIGHT} />
        <rect x="856" y="320" width="44" height="44" rx="4" fill={TERRA_LIGHT} />
        <rect x="912" y="320" width="44" height="44" rx="4" fill={SUN} />
        {/* a frame hanging crooked */}
        <path d="M1070 230 L1020 286 M1070 230 L1124 290" fill="none" strokeWidth="4" />
        <g transform="rotate(6 1070 330)">
          <rect x="1000" y="282" width="140" height="100" rx="4" fill="#ffffff" />
          <path d="M1015 365 L1050 325 L1075 350 L1095 330 L1125 365" fill="none" strokeWidth="5" />
        </g>
        {/* ideas and doubts on sticky notes */}
        <g transform="rotate(-4 1360 300)">
          <rect x="1320" y="260" width="84" height="84" fill={SUN} />
          <path d="M1336 288 H1388 M1336 306 H1378 M1336 324 H1384" fill="none" strokeWidth="4" />
        </g>
        <g transform="rotate(5 1462 320)">
          <rect x="1420" y="278" width="84" height="84" fill={SAGE_LIGHT} />
          <path d="M1436 306 H1488 M1436 324 H1472" fill="none" strokeWidth="4" />
        </g>
        <g transform="rotate(-2 1402 412)">
          <rect x="1360" y="370" width="84" height="84" fill={TERRA_LIGHT} />
          <path d="M1388 398 C1388 382 1416 382 1416 398 C1416 410 1402 410 1402 424" fill="none" strokeWidth="6" />
          <circle cx="1402" cy="440" r="4" fill={INK} stroke="none" />
        </g>
        {/* sofa on the move */}
        <path d="M940 470 Q1050 420 1170 470 M1148 452 L1172 471 L1144 484" fill="none" />
        <g transform="rotate(-4 1050 715)">
          <rect x="870" y="530" width="360" height="90" rx="22" fill={SAGE_LIGHT} />
          <rect x="850" y="600" width="400" height="98" rx="18" fill={SAGE_LIGHT} />
          <rect x="828" y="568" width="62" height="130" rx="24" fill={SAGE_LIGHT} />
          <rect x="1210" y="568" width="62" height="130" rx="24" fill={SAGE_LIGHT} />
          <path d="M870 698 V718 M1230 698 V718" fill="none" />
        </g>
        <path d="M790 600 H750 M800 640 H735 M790 680 H755" fill="none" strokeWidth="5" />
        {/* measuring tape */}
        <path d="M1480 714 H1640" fill="none" strokeWidth="5" />
        <path d="M1520 714 V702 M1560 714 V702 M1600 714 V702" fill="none" strokeWidth="4" />
        <circle cx="1460" cy="688" r="30" fill={SUN} />
        <circle cx="1460" cy="688" r="8" fill={INK} stroke="none" />
      </Lines>
    </>
  ),

  // arrived: sofa, lamp light, a cup of tea, the cat asleep
  angekommen: () => (
    <>
      <Room wall="#f5ebe2" floor="#eadccf" />
      {/* lamp light */}
      <circle cx="770" cy="360" r="230" fill={SUN} opacity="0.22" />
      <circle cx="770" cy="360" r="130" fill={SUN} opacity="0.3" />
      <ellipse cx="1095" cy="770" rx="400" ry="44" fill={TERRA_LIGHT} />
      <Lines>
        {/* window, sun going down */}
        <rect x="480" y="190" width="190" height="280" rx="6" fill="#f6e4cc" />
        <circle cx="575" cy="400" r="36" fill={SUN} stroke="none" />
        <path d="M575 190 V470 M466 482 H684" fill="none" />
        {/* floor lamp */}
        <path d="M770 714 V380" fill="none" />
        <ellipse cx="770" cy="714" rx="40" ry="8" fill={INK} />
        <path d="M712 380 H828 L804 300 H736 Z" fill={WARM} />
        {/* pictures above the sofa */}
        <rect x="950" y="280" width="100" height="120" rx="4" fill="#ffffff" />
        <path
          d="M1000 368 C972 348 966 326 984 320 C994 317 999 323 1000 330 C1001 323 1006 317 1016 320 C1034 326 1028 348 1000 368 Z"
          fill={TERRA}
          strokeWidth="5"
        />
        <rect x="1090" y="300" width="160" height="100" rx="4" fill="#ffffff" />
        <circle cx="1210" cy="330" r="12" fill={SUN} stroke="none" />
        <path d="M1105 385 L1145 345 L1175 372 L1195 355 L1235 385" fill="none" strokeWidth="5" />
        {/* sofa with cushions and a throw */}
        <rect x="890" y="470" width="410" height="120" rx="28" fill={TERRA} />
        <g transform="rotate(-8 965 540)">
          <rect x="920" y="500" width="90" height="80" rx="16" fill={SUN} />
        </g>
        <g transform="rotate(8 1205 540)">
          <rect x="1160" y="500" width="90" height="80" rx="16" fill={SAGE_LIGHT} />
        </g>
        <rect x="870" y="580" width="450" height="110" rx="22" fill={TERRA} />
        <path d="M1170 580 H1300 L1292 660 L1196 650 Z" fill={CREAM} />
        <path d="M1206 600 L1201 648 M1236 600 L1233 652 M1266 600 L1264 655" fill="none" strokeWidth="4" />
        <rect x="840" y="540" width="70" height="150" rx="28" fill={TERRA} />
        <rect x="1280" y="540" width="70" height="150" rx="28" fill={TERRA} />
        <path d="M890 690 V715 M1300 690 V715" fill="none" />
        {/* tea */}
        <path d="M1390 600 H1490 M1405 600 V715 M1475 600 V715" fill="none" />
        <rect x="1420" y="556" width="36" height="42" rx="5" fill="#ffffff" />
        <path d="M1456 566 a12 12 0 0 1 0 22" fill="none" strokeWidth="5" />
        <path d="M1430 540 q-10 -15 0 -30 q10 -15 0 -30 M1448 540 q-10 -15 0 -30" fill="none" strokeWidth="5" />
        {/* plant */}
        <Leaf d="M1530 640 C1480 610 1465 550 1480 510 C1520 540 1535 590 1530 640 Z" />
        <Leaf d="M1530 640 C1560 590 1600 560 1630 560 C1620 600 1580 630 1530 640 Z" />
        <Leaf d="M1530 640 C1520 580 1530 520 1560 480 C1575 530 1560 600 1530 640 Z" />
        <path d="M1500 640 H1570 L1560 715 H1510 Z" fill={TERRA_LIGHT} />
        {/* the cat, asleep on the rug */}
        <path d="M1020 768 C1020 730 1070 718 1110 726 C1140 732 1150 755 1146 768 Z" fill={INK} />
        <path d="M1030 768 C1000 768 996 752 1012 748" fill="none" />
        <path d="M1128 732 L1132 708 L1146 724 L1158 712 L1158 740" fill={INK} />
      </Lines>
    </>
  ),
};
