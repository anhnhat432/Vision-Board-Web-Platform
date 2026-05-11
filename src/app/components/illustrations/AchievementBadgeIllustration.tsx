import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function AchievementBadgeIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("achievement-badge-violet-fuchsia");
  const glowId = useIllustrationId("achievement-badge-glow");

  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="58" y1="34" x2="184" y2="212" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.62" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="52%" r="55%">
          <stop stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="102" fill={`url(#${glowId})`} />
      <path d="M120 28L178 50V104C178 146 154 180 120 198C86 180 62 146 62 104V50L120 28Z" fill={`url(#${gradientId})`} stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
      <path d="M120 72L132 102L164 105L140 126L148 158L120 141L92 158L100 126L76 105L108 102L120 72Z" fill="white" fillOpacity="0.74" />
      <path d="M58 82C36 102 34 132 54 154M182 82C204 102 206 132 186 154" stroke="currentColor" strokeOpacity="0.34" strokeWidth="7" strokeLinecap="round" />
      <path d="M79 172L58 212L98 198M161 172L182 212L142 198" fill={`url(#${gradientId})`} opacity="0.78" />
      <circle cx="120" cy="122" r="56" stroke="white" strokeOpacity="0.48" strokeWidth="3" />
    </svg>
  );
}
