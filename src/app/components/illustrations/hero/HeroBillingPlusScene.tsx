import { useIllustrationId, type AmbientIllustrationProps } from "../utils";

export function HeroBillingPlusScene({ className, ...rest }: AmbientIllustrationProps) {
  const crystalId = useIllustrationId("hero-billing-plus-crystal");
  const floorId = useIllustrationId("hero-billing-plus-floor");

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
        <linearGradient id={crystalId} x1="204" y1="64" x2="404" y2="390" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" stopOpacity="0.78" />
          <stop offset="0.58" stopColor="var(--tone-shell-secondary, #d946ef)" stopOpacity="0.58" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" stopOpacity="0.44" />
        </linearGradient>
        <radialGradient id={floorId} cx="50%" cy="50%" r="50%">
          <stop stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="gradient-flow" cx="300" cy="388" rx="184" ry="54" fill={`url(#${floorId})`} />
      <g className="float-subtle">
        <path d="M300 58L396 114L432 238L374 362L300 414L226 362L168 238L204 114L300 58Z" fill={`url(#${crystalId})`} stroke="white" strokeOpacity="0.24" strokeWidth="3" />
        <path d="M300 58V414M204 114L374 362M396 114L226 362M168 238H432" stroke="white" strokeOpacity="0.22" strokeWidth="3" />
        <path d="M300 174V298M238 236H362" stroke="white" strokeOpacity="0.82" strokeWidth="16" strokeLinecap="round" />
      </g>
      <g className="twinkle-slow" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.42" strokeWidth="6">
        <path d="M300 20V48" />
        <path d="M300 424V462" />
        <path d="M104 238H148" />
        <path d="M452 238H496" />
      </g>
      <g className="twinkle-fast" fill="white" opacity="0.62">
        <circle cx="420" cy="96" r="5" />
        <circle cx="172" cy="154" r="4" />
        <circle cx="464" cy="332" r="4" />
        <circle cx="218" cy="392" r="5" />
      </g>
    </svg>
  );
}
