import { useIllustrationId, type AmbientIllustrationProps } from "../utils";

export function HeroDashboardScene({ className, ...rest }: AmbientIllustrationProps) {
  const glowId = useIllustrationId("hero-dashboard-glow");
  const pathId = useIllustrationId("hero-dashboard-path");

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
        <radialGradient id={glowId} cx="50%" cy="48%" r="65%">
          <stop stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={pathId} x1="126" y1="275" x2="676" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" />
          <stop offset="0.55" stopColor="var(--tone-shell-secondary, #d946ef)" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #22d3ee)" />
        </linearGradient>
      </defs>
      <rect className="gradient-flow" x="38" y="34" width="724" height="326" rx="72" fill={`url(#${glowId})`} />
      <g className="float-subtle" opacity="0.62" transform="translate(70 72)">
        <circle cx="106" cy="112" r="92" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <path
            key={angle}
            d="M106 112L106 24"
            stroke="currentColor"
            strokeOpacity={angle % 90 === 0 ? 0.34 : 0.18}
            strokeWidth="20"
            strokeLinecap="round"
            transform={`rotate(${angle} 106 112)`}
          />
        ))}
        <circle cx="106" cy="112" r="18" fill="currentColor" fillOpacity="0.28" />
      </g>
      <path className="float-subtle" d="M176 286C268 226 334 244 418 190C493 142 560 136 666 96" stroke={`url(#${pathId})`} strokeWidth="8" strokeLinecap="round" opacity="0.72" />
      {[176, 418, 666].map((cx, index) => (
        <circle key={cx} cx={cx} cy={[286, 190, 96][index]} r="14" fill="white" fillOpacity="0.72" stroke={`url(#${pathId})`} strokeWidth="4" />
      ))}
      <g className="twinkle-slow" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.42" strokeWidth="2">
        <path d="M656 56L668 68M668 56L656 68" />
        <path d="M704 102L714 112M714 102L704 112" />
        <path d="M602 88L612 98M612 88L602 98" />
      </g>
    </svg>
  );
}
