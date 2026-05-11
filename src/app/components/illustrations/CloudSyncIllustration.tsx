import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function CloudSyncIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("cloud-sync-violet-fuchsia");
  const glowId = useIllustrationId("cloud-sync-glow");

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
        <linearGradient id={gradientId} x1="72" y1="54" x2="248" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="52%" r="54%">
          <stop stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="132" rx="128" ry="72" fill={`url(#${glowId})`} />
      <path d="M95 158H230C253 158 272 140 272 118C272 97 256 80 235 78C226 49 200 32 170 38C146 43 128 59 120 80C96 80 76 98 76 121C76 141 83 158 95 158Z" fill={`url(#${gradientId})`} stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
      <path d="M128 102C146 84 174 84 192 102M192 102H170M192 102V80M194 138C176 156 148 156 130 138M130 138H152M130 138V160" stroke="white" strokeOpacity="0.88" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="238" cy="62" r="23" fill="white" fillOpacity="0.74" />
      <path d="M226 62L235 71L251 52" stroke="currentColor" strokeOpacity="0.68" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 184H240" stroke="currentColor" strokeOpacity="0.16" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
