import { useIllustrationId, type AmbientIllustrationProps } from "../utils";

const SMART_DOTS = Array.from({ length: 26 }, (_, index) => ({
  id: `smart-dot-${index + 1}`,
  cx: 72 + (index % 13) * 54,
  cy: 58 + Math.floor(index / 13) * 260,
}));

export function HeroSmartGoalScene({ className, ...rest }: AmbientIllustrationProps) {
  const starId = useIllustrationId("hero-smart-goal-star");
  const orbitId = useIllustrationId("hero-smart-goal-orbit");

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
        <linearGradient id={starId} x1="304" y1="80" x2="512" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" stopOpacity="0.78" />
          <stop offset="0.55" stopColor="var(--tone-shell-secondary, #d946ef)" stopOpacity="0.62" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" stopOpacity="0.52" />
        </linearGradient>
        <linearGradient id={orbitId} x1="166" y1="300" x2="644" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.7" />
          <stop offset="1" stopColor="white" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <g opacity="0.22">
        {SMART_DOTS.map((dot) => (
          <circle key={dot.id} cx={dot.cx} cy={dot.cy} r="3" fill="currentColor" />
        ))}
      </g>
      <ellipse cx="400" cy="202" rx="252" ry="86" stroke={`url(#${orbitId})`} strokeWidth="4" strokeDasharray="10 14" transform="rotate(-14 400 202)" />
      <path d="M400 78L430 158L514 162L448 214L470 296L400 250L330 296L352 214L286 162L370 158L400 78Z" fill={`url(#${starId})`} />
      <g stroke="white" strokeLinecap="round" strokeOpacity="0.52" strokeWidth="3">
        <path d="M400 104V44" />
        <path d="M464 166L534 126" />
        <path d="M448 236L520 300" />
        <path d="M352 236L280 300" />
        <path d="M336 166L266 126" />
      </g>
      <path d="M164 316C246 276 316 286 380 246C438 210 488 158 636 112" stroke="currentColor" strokeOpacity="0.28" strokeWidth="7" strokeLinecap="round" />
      <circle cx="636" cy="112" r="10" fill="white" fillOpacity="0.7" />
    </svg>
  );
}
