import { useIllustrationId, type AmbientIllustrationProps } from "../utils";

const WEEK_CELLS = Array.from({ length: 12 }, (_, index) => ({
  id: `week-cell-${index + 1}`,
  x: 26 + (index % 4) * 62,
  y: 34 + Math.floor(index / 4) * 44,
  opacity: index < 5 ? 0.26 : 0.1,
}));

export function Hero12WeekScene({ className, ...rest }: AmbientIllustrationProps) {
  const waveId = useIllustrationId("hero-12-week-wave");
  const cardId = useIllustrationId("hero-12-week-card");

  return (
    <svg
      viewBox="0 0 800 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={waveId} x1="82" y1="76" x2="708" y2="334" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" stopOpacity="0.55" />
          <stop offset="0.48" stopColor="var(--tone-shell-secondary, #d946ef)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #14b8a6)" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={cardId} x1="292" y1="106" x2="596" y2="286" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.72" />
          <stop offset="1" stopColor="white" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <path className="gradient-flow" d="M54 302C172 190 260 318 390 204C502 106 598 194 746 98" stroke={`url(#${waveId})`} strokeWidth="58" strokeLinecap="round" opacity="0.28" />
      <path className="float-subtle" d="M70 244C186 156 282 254 408 162C526 76 610 150 730 94" stroke={`url(#${waveId})`} strokeWidth="22" strokeLinecap="round" opacity="0.36" />
      <g className="float-subtle" transform="translate(300 108) rotate(-7 150 92)">
        <rect width="300" height="184" rx="28" fill={`url(#${cardId})`} stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
        {WEEK_CELLS.map((cell) => (
          <rect
            key={cell.id}
            x={cell.x}
            y={cell.y}
            width="42"
            height="28"
            rx="8"
            fill="currentColor"
            fillOpacity={cell.opacity}
          />
        ))}
      </g>
      <path d="M154 316C250 252 344 278 438 210C500 165 548 116 606 84" stroke="white" strokeOpacity="0.64" strokeWidth="4" strokeLinecap="round" />
      <path className="twinkle-fast" d="M606 66L614 82L632 84L618 96L622 114L606 104L590 114L594 96L580 84L598 82L606 66Z" fill="currentColor" fillOpacity="0.48" />
    </svg>
  );
}
