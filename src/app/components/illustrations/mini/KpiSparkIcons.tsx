import { type AmbientIllustrationProps, useIllustrationId } from "../utils";

function MiniDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="currentColor" stopOpacity="var(--mini-icon-strong, 0.72)" />
        <stop offset="1" stopColor="currentColor" stopOpacity="var(--mini-icon-soft, 0.18)" />
      </linearGradient>
    </defs>
  );
}

export function KpiStreakSpark({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("kpi-streak-spark");
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <MiniDefs id={gradientId} />
      <circle cx="16" cy="17" r="12" fill={`url(#${gradientId})`} opacity="0.32" />
      <path d="M17 5c4 5-2 6 3 11 2 2 2 6-2 8-5 3-10-1-9-6 .4-3 3-5 4-8 2 3 4 3 4-5Z" fill={`url(#${gradientId})`} />
      <path d="M14 20c1 2 4 2 5 0" stroke="white" strokeOpacity="0.72" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function KpiOutputSpark({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("kpi-output-spark");
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <MiniDefs id={gradientId} />
      <path d="M5 23h22" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M7 21l5-5 4 3 8-9"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="10" r="3.5" fill={`url(#${gradientId})`} />
    </svg>
  );
}

export function KpiFocusSpark({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("kpi-focus-spark");
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <MiniDefs id={gradientId} />
      <circle cx="16" cy="16" r="12" stroke={`url(#${gradientId})`} strokeWidth="2" />
      <circle cx="16" cy="16" r="7" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
      <circle cx="16" cy="16" r="3.5" fill={`url(#${gradientId})`} />
    </svg>
  );
}

export function KpiBalanceSpark({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("kpi-balance-spark");
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <MiniDefs id={gradientId} />
      <path d="M16 7v18M7 13h18" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
      <rect x="5" y="14" width="10" height="8" rx="4" fill={`url(#${gradientId})`} />
      <rect x="17" y="10" width="10" height="8" rx="4" fill={`url(#${gradientId})`} opacity="0.78" />
    </svg>
  );
}
