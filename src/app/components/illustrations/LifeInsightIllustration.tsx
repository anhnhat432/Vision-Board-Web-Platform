import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function LifeInsightIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("life-insight-violet-fuchsia");
  const glowId = useIllustrationId("life-insight-glow");

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
        <linearGradient id={gradientId} x1="82" y1="54" x2="246" y2="204" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.58" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id={glowId} cx="52%" cy="48%" r="52%">
          <stop stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="162" cy="128" rx="132" ry="82" fill={`url(#${glowId})`} />
      <path d="M58 176C78 128 118 94 170 86C214 79 248 91 270 112" stroke="currentColor" strokeOpacity="0.16" strokeWidth="16" strokeLinecap="round" />
      <circle cx="140" cy="112" r="54" fill="white" fillOpacity="0.68" stroke={`url(#${gradientId})`} strokeWidth="9" />
      <path d="M178 150L226 198" stroke={`url(#${gradientId})`} strokeWidth="14" strokeLinecap="round" />
      <path d="M203 82C203 63 218 48 237 48C256 48 271 63 271 82C271 96 263 108 251 113V126H223V113C211 108 203 96 203 82Z" fill={`url(#${gradientId})`} opacity="0.78" />
      <path d="M224 140H250M227 154H247" stroke="currentColor" strokeOpacity="0.36" strokeWidth="5" strokeLinecap="round" />
      <path d="M237 28V40M280 83H292M190 83H178M267 48L276 39M207 48L198 39" stroke="currentColor" strokeOpacity="0.44" strokeWidth="4" strokeLinecap="round" />
      <circle cx="112" cy="104" r="10" fill="currentColor" opacity="0.22" />
      <circle cx="136" cy="126" r="7" fill="currentColor" opacity="0.32" />
      <circle cx="160" cy="102" r="5" fill="currentColor" opacity="0.28" />
    </svg>
  );
}
