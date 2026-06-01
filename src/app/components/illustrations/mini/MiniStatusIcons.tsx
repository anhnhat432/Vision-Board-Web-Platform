import { type AmbientIllustrationProps, useIllustrationId } from "../utils";

function StatusGradient({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={id} cx="50%" cy="45%" r="58%">
        <stop stopColor="currentColor" stopOpacity="var(--mini-icon-strong, 0.76)" />
        <stop offset="1" stopColor="currentColor" stopOpacity="var(--mini-icon-soft, 0.18)" />
      </radialGradient>
    </defs>
  );
}

export function SyncIdleDot({ className, ...rest }: AmbientIllustrationProps) {
  const id = useIllustrationId("sync-idle-dot");
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <StatusGradient id={id} />
      <circle cx="8" cy="8" r="5.5" fill={`url(#${id})`} />
    </svg>
  );
}

export function SyncSyncingDot({ className, ...rest }: AmbientIllustrationProps) {
  const id = useIllustrationId("sync-syncing-dot");
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <StatusGradient id={id} />
      <circle cx="8" cy="8" r="7" fill={`url(#${id})`} opacity="0.38" className="motion-safe:animate-pulse" />
      <circle cx="8" cy="8" r="3.5" fill="currentColor" opacity="0.72" />
    </svg>
  );
}

export function SyncErrorDot({ className, ...rest }: AmbientIllustrationProps) {
  const id = useIllustrationId("sync-error-dot");
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <StatusGradient id={id} />
      <circle cx="8" cy="8" r="5.5" fill={`url(#${id})`} stroke="currentColor" strokeOpacity="0.58" />
      <path d="M8 5v3.4M8 11h.1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SyncOkDot({ className, ...rest }: AmbientIllustrationProps) {
  const id = useIllustrationId("sync-ok-dot");
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <StatusGradient id={id} />
      <circle cx="8" cy="8" r="5.8" fill={`url(#${id})`} />
      <path d="M5.3 8.2l1.8 1.8 3.6-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BadgeRibbonAccent({ className, ...rest }: AmbientIllustrationProps) {
  const id = useIllustrationId("badge-ribbon-accent");
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
      <defs>
        <linearGradient id={id} x1="7" y1="5" x2="25" y2="27">
          <stop stopColor="currentColor" stopOpacity="0.72" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path d="M9 7h14v19l-7-4-7 4V7Z" fill={`url(#${id})`} />
      <path d="M16 10l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5L16 10Z" fill="white" opacity="0.8" />
    </svg>
  );
}

export function EmptyHintArrow({ className, ...rest }: AmbientIllustrationProps) {
  const id = useIllustrationId("empty-hint-arrow");
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={id} x1="6" y1="8" x2="34" y2="34">
          <stop stopColor="currentColor" stopOpacity="0.68" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <path
        d="M8 12c10-5 23 1 21 15"
        stroke={`url(#${id})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="3 4"
      />
      <path
        d="M24 25l5 4 4-5"
        stroke="currentColor"
        strokeOpacity="0.52"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
