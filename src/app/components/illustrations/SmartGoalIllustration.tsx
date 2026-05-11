import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function SmartGoalIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("smart-goal-violet-fuchsia");
  const glowId = useIllustrationId("smart-goal-glow");

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
        <linearGradient id={gradientId} x1="86" y1="42" x2="236" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.62" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="48%" r="56%">
          <stop stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="132" rx="132" ry="76" fill={`url(#${glowId})`} />
      <path d="M56 196C94 156 116 136 153 124C192 112 226 91 266 46" stroke={`url(#${gradientId})`} strokeWidth="7" strokeLinecap="round" strokeDasharray="9 10" />
      <path d="M160 46L181 94L233 99L194 133L206 185L160 158L114 185L126 133L87 99L139 94L160 46Z" fill={`url(#${gradientId})`} stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
      <path d="M160 90V18M190 112L260 72M188 148L252 196M132 148L68 196M130 112L60 72" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
      {[["160", "18"], ["260", "72"], ["252", "196"], ["68", "196"], ["60", "72"]].map(([cx, cy], index) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={index === 0 ? 7 : 6} fill="currentColor" opacity={0.28 + index * 0.07} />
      ))}
      <circle cx="160" cy="126" r="15" fill="white" fillOpacity="0.66" />
    </svg>
  );
}
