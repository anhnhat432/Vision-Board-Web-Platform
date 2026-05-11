import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function FeasibilityScaleIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("feasibility-scale-violet-fuchsia");
  const glowId = useIllustrationId("feasibility-scale-glow");

  return (
    <svg
      viewBox="0 0 320 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="72" y1="48" x2="248" y2="204" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="55%" r="54%">
          <stop stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="142" rx="128" ry="70" fill={`url(#${glowId})`} />
      <path d="M160 58V184M120 184H200" stroke="currentColor" strokeOpacity="0.42" strokeWidth="7" strokeLinecap="round" />
      <path d="M84 94L238 78" stroke={`url(#${gradientId})`} strokeWidth="7" strokeLinecap="round" />
      <path d="M94 96L70 150M94 96L124 144M226 80L202 132M226 80L260 124" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 150H144C137 174 57 174 48 150Z" fill={`url(#${gradientId})`} opacity="0.62" />
      <path d="M184 132H280C270 158 194 158 184 132Z" fill={`url(#${gradientId})`} opacity="0.42" />
      <rect x="82" y="116" width="18" height="22" rx="5" fill="white" fillOpacity="0.72" />
      <rect x="104" y="106" width="18" height="32" rx="5" fill="white" fillOpacity="0.58" />
      <path d="M224 100H246M224 100L234 116L224 132H246L236 116L246 100" stroke="white" strokeOpacity="0.8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="160" cy="58" r="12" fill="currentColor" opacity="0.46" />
    </svg>
  );
}
