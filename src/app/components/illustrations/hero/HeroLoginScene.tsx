import { HeroOrbitIllustration } from "../HeroOrbitIllustration";
import { useIllustrationId, type AmbientIllustrationProps } from "../utils";

export function HeroLoginScene({ className, ...rest }: AmbientIllustrationProps) {
  const blobId = useIllustrationId("hero-login-blob");
  const strokeId = useIllustrationId("hero-login-stroke");

  return (
    <svg
      viewBox="0 0 600 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <radialGradient id={blobId} cx="50%" cy="45%" r="58%">
          <stop stopColor="currentColor" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={strokeId} x1="90" y1="98" x2="530" y2="420" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" stopOpacity="0.7" />
          <stop offset="0.54" stopColor="var(--tone-shell-secondary, #d946ef)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <ellipse className="gradient-flow" cx="300" cy="245" rx="245" ry="202" fill={`url(#${blobId})`} />
      <HeroOrbitIllustration x="112" y="62" width="376" height="376" className="float-subtle text-current" />
      <g className="twinkle-slow" opacity="0.42">
        <circle cx="112" cy="118" r="4" fill="currentColor" />
        <circle cx="492" cy="132" r="3.5" fill="currentColor" />
        <circle cx="518" cy="318" r="5" fill="currentColor" />
        <circle cx="92" cy="344" r="3" fill="currentColor" />
        <path d="M126 398C206 440 345 448 474 362" stroke={`url(#${strokeId})`} strokeWidth="4" strokeLinecap="round" />
        <path d="M128 102L140 116M140 102L128 116M474 96L488 110M488 96L474 110" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
