import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function PhasePeakIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("phase-peak-fuchsia-rose");

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
        <linearGradient id={gradientId} x1="24" y1="96" x2="96" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-secondary, #d946ef)" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" />
        </linearGradient>
      </defs>
      <path d="M24 90L60 28L96 90H24Z" fill={`url(#${gradientId})`} opacity="0.3" />
      <path d="M24 90L60 28L96 90" stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M47 58L60 42L73 58" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
      <path d="M60 13V25M27 29L36 38M93 29L84 38M104 64H92M16 64H28" stroke={`url(#${gradientId})`} strokeWidth="2.5" strokeLinecap="round" opacity="0.56" />
      <circle cx="60" cy="90" r="5" fill="#7c3aed" opacity="0.48" />
    </svg>
  );
}

