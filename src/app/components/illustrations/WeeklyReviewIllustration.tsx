import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function WeeklyReviewIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("weekly-review-violet-fuchsia");
  const glowId = useIllustrationId("weekly-review-glow");

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
        <linearGradient id={gradientId} x1="76" y1="54" x2="246" y2="202" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.58" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="52%" r="54%">
          <stop stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="132" rx="130" ry="76" fill={`url(#${glowId})`} />
      <rect x="58" y="56" width="204" height="142" rx="24" fill={`url(#${gradientId})`} stroke="currentColor" strokeOpacity="0.24" strokeWidth="2" />
      <path d="M58 92H262" stroke="white" strokeOpacity="0.52" strokeWidth="4" />
      <path d="M102 44V70M218 44V70" stroke="currentColor" strokeOpacity="0.42" strokeWidth="8" strokeLinecap="round" />
      {Array.from({ length: 7 }, (_, index) => (
        <rect key={index} x={76 + index * 25} y="112" width="17" height="44" rx="6" fill="white" fillOpacity={index < 4 ? 0.78 : 0.34} />
      ))}
      {[0, 1, 2, 3].map((index) => (
        <path key={index} d={`M${81 + index * 25} 134L86 ${140 + index * 0}L94 126`} stroke="currentColor" strokeOpacity="0.58" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <path d="M248 38L254 52L269 54L258 64L261 79L248 71L235 79L238 64L227 54L242 52L248 38Z" fill="currentColor" opacity="0.58" />
    </svg>
  );
}
