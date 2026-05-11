import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function EmptyJournalIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("empty-journal-violet-fuchsia");
  const pageId = useIllustrationId("empty-journal-page");

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
        <linearGradient id={gradientId} x1="66" y1="58" x2="254" y2="196" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" stopOpacity="0.86" />
          <stop offset="0.62" stopColor="var(--tone-shell-secondary, #d946ef)" stopOpacity="0.66" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" stopOpacity="0.56" />
        </linearGradient>
        <linearGradient id={pageId} x1="88" y1="78" x2="232" y2="178" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f5f3ff" stopOpacity="0.72" />
        </linearGradient>
      </defs>

      <path d="M58 172C78 102 132 64 201 78C248 88 276 126 262 174C247 224 157 220 112 199C89 188 71 185 58 172Z" fill="#ddd6fe" opacity="0.32" />
      <path d="M80 80C110 70 136 74 160 96V190C135 169 108 163 80 171V80Z" fill={`url(#${pageId})`} stroke={`url(#${gradientId})`} strokeWidth="2" />
      <path d="M160 96C184 74 210 70 240 80V171C212 163 185 169 160 190V96Z" fill="#ffffff" fillOpacity="0.78" stroke={`url(#${gradientId})`} strokeWidth="2" />
      <path d="M104 111H134M101 132H137M102 153H128M188 111H219M184 132H223M190 153H213" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      <path d="M70 52C94 35 123 34 145 50" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 7" opacity="0.5" />
      <path d="M222 56C242 48 263 55 276 72" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 7" opacity="0.44" />
      <circle cx="92" cy="48" r="5" fill="#fb7185" opacity="0.7" />
      <circle cx="259" cy="82" r="6" fill="#7c3aed" opacity="0.48" />
      <circle cx="246" cy="196" r="5" fill="#d946ef" opacity="0.48" />
    </svg>
  );
}

