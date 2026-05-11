import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function EmptyGoalIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("empty-goal-violet-fuchsia");
  const mountainId = useIllustrationId("empty-goal-mountain");

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      viewBox="0 0 320 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="68" y1="52" x2="255" y2="202" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" stopOpacity="0.88" />
          <stop offset="0.55" stopColor="var(--tone-shell-secondary, #d946ef)" stopOpacity="0.66" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" stopOpacity="0.56" />
        </linearGradient>
        <linearGradient id={mountainId} x1="92" y1="88" x2="230" y2="190" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ddd6fe" stopOpacity="0.76" />
          <stop offset="1" stopColor="#fbcfe8" stopOpacity="0.42" />
        </linearGradient>
      </defs>

      <path d="M48 184C83 122 120 102 154 132C187 84 230 72 274 184H48Z" fill={`url(#${mountainId})`} />
      <path d="M48 184C83 122 120 102 154 132C187 84 230 72 274 184" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M154 132L135 160H173L154 132Z" fill="#ffffff" fillOpacity="0.68" />
      <path d="M214 78V128" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.36" />
      <path d="M216 80C235 82 247 90 252 104C236 105 226 101 216 94V80Z" fill={`url(#${gradientId})`} opacity="0.86" />
      <path d="M66 202C84 181 110 176 132 186C158 198 180 194 196 172C207 157 224 148 244 152" stroke={`url(#${gradientId})`} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="5 7" opacity="0.58" />
      <circle cx="78" cy="72" r="8" fill="#fb7185" opacity="0.5" />
      <circle cx="260" cy="68" r="5" fill="#7c3aed" opacity="0.48" />
      <circle cx="244" cy="204" r="4" fill="#d946ef" opacity="0.56" />
    </svg>
  );
}

