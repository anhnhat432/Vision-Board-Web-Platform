import { useIllustrationId, type AmbientIllustrationProps } from "../utils";

export function HeroAchievementsScene({ className, ...rest }: AmbientIllustrationProps) {
  const badgeId = useIllustrationId("hero-achievements-badge");
  const ribbonId = useIllustrationId("hero-achievements-ribbon");

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
        <linearGradient id={badgeId} x1="266" y1="58" x2="540" y2="322" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #0d9488)" stopOpacity="0.68" />
          <stop offset="0.55" stopColor="var(--tone-shell-secondary, #f59e0b)" stopOpacity="0.54" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #3b82f6)" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={ribbonId} x1="170" y1="292" x2="644" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.72" />
          <stop offset="1" stopColor="white" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <ellipse className="gradient-flow" cx="400" cy="202" rx="314" ry="152" fill="currentColor" opacity="0.16" />
      <g className="float-subtle" opacity="0.46">
        <path d="M270 118L338 88L406 118V202C406 246 372 282 338 300C304 282 270 246 270 202V118Z" fill={`url(#${badgeId})`} />
        <path d="M482 126L538 102L594 126V196C594 232 566 262 538 276C510 262 482 232 482 196V126Z" fill={`url(#${badgeId})`} opacity="0.74" />
        <path d="M188 150L240 128L292 150V214C292 248 266 274 240 288C214 274 188 248 188 214V150Z" fill={`url(#${badgeId})`} opacity="0.62" />
      </g>
      <path className="float-subtle" d="M172 292C286 244 408 226 640 116" stroke={`url(#${ribbonId})`} strokeWidth="16" strokeLinecap="round" opacity="0.72" />
      <path d="M400 122L420 174L476 176L432 210L446 264L400 234L354 264L368 210L324 176L380 174L400 122Z" fill="white" fillOpacity="0.62" />
      <g className="twinkle-slow" fill="white" opacity="0.56">
        <circle cx="166" cy="104" r="4" />
        <circle cx="626" cy="82" r="5" />
        <circle cx="682" cy="244" r="4" />
        <circle cx="250" cy="330" r="3" />
        <circle cx="540" cy="318" r="3.5" />
      </g>
    </svg>
  );
}
