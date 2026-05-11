import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function PhaseRampIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("phase-ramp-violet-fuchsia");

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="24" y1="92" x2="96" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" />
          <stop offset="0.58" stopColor="var(--tone-shell-secondary, #d946ef)" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" />
        </linearGradient>
      </defs>
      <rect x="18" y="72" width="20" height="20" rx="6" fill={`url(#${gradientId})`} opacity="0.22" />
      <rect x="44" y="58" width="20" height="34" rx="6" fill={`url(#${gradientId})`} opacity="0.34" />
      <rect x="70" y="42" width="20" height="50" rx="6" fill={`url(#${gradientId})`} opacity="0.46" />
      <path d="M24 54C42 50 58 42 72 30L80 23" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="round" />
      <path d="M66 23H80V37" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="94" cy="82" r="5" fill="#fb7185" opacity="0.58" />
    </svg>
  );
}

