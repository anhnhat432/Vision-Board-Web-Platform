import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function PhaseHarvestIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("phase-harvest-emerald");

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
        <linearGradient id={gradientId} x1="28" y1="92" x2="92" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#059669" />
          <stop offset="0.6" stopColor="#14b8a6" />
          <stop offset="1" stopColor="var(--tone-shell-secondary, #d946ef)" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="62" r="34" fill={`url(#${gradientId})`} opacity="0.18" />
      <path d="M38 62C38 42 49 29 60 22M38 62C38 82 49 95 60 102" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" />
      <path d="M82 62C82 42 71 29 60 22M82 62C82 82 71 95 60 102" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" />
      <path d="M43 44C33 42 27 36 25 27C35 28 42 34 43 44ZM43 79C33 80 27 86 25 95C35 94 42 88 43 79ZM77 44C87 42 93 36 95 27C85 28 78 34 77 44ZM77 79C87 80 93 86 95 95C85 94 78 88 77 79Z" fill={`url(#${gradientId})`} opacity="0.48" />
      <path d="M45 63L56 74L78 48" stroke={`url(#${gradientId})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

