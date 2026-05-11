import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function HeroOrbitIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("hero-orbit-violet-fuchsia");
  const glowId = useIllustrationId("hero-orbit-glow");
  const softId = useIllustrationId("hero-orbit-soft");

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="52" y1="58" x2="340" y2="332" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--tone-shell-primary, #7c3aed)" stopOpacity="0.88" />
          <stop offset="55%" stopColor="var(--tone-shell-secondary, #d946ef)" stopOpacity="0.68" />
          <stop offset="100%" stopColor="var(--tone-shell-tertiary, #fb7185)" stopOpacity="0.58" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--tone-shell-primary, #a78bfa)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--tone-shell-primary, #a78bfa)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={softId} x1="90" y1="110" x2="280" y2="290" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <circle cx="200" cy="200" r="178" fill={`url(#${glowId})`} />
      <ellipse
        cx="200"
        cy="200"
        rx="158"
        ry="58"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.7"
        strokeDasharray="5 8"
        opacity="0.62"
        transform="rotate(-15 200 200)"
      />
      <ellipse
        cx="200"
        cy="200"
        rx="105"
        ry="40"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        opacity="0.5"
        transform="rotate(25 200 200)"
      />
      <ellipse
        cx="200"
        cy="200"
        rx="72"
        ry="30"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.18"
        transform="rotate(-44 200 200)"
      />
      <circle cx="200" cy="200" r="44" fill={`url(#${gradientId})`} opacity="0.95" />
      <circle cx="190" cy="188" r="28" fill={`url(#${softId})`} opacity="0.52" />
      <circle cx="320" cy="160" r="8" fill="var(--tone-shell-tertiary, #fb7185)" opacity="0.82" />
      <circle cx="80" cy="240" r="6.5" fill="var(--tone-shell-primary, #a78bfa)" opacity="0.72" />
      <circle cx="280" cy="282" r="5.5" fill="var(--tone-shell-secondary, #d946ef)" opacity="0.68" />
      <path
        d="M60 320C122 348 185 364 252 340C291 326 316 302 340 280"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.52"
      />
    </svg>
  );
}

