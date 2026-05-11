import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function WelcomeIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("welcome-violet-fuchsia");
  const warmId = useIllustrationId("welcome-warm-fill");

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="72" y1="38" x2="328" y2="250" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" stopOpacity="0.86" />
          <stop offset="0.58" stopColor="var(--tone-shell-secondary, #d946ef)" stopOpacity="0.66" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" stopOpacity="0.56" />
        </linearGradient>
        <radialGradient id={warmId} cx="50%" cy="45%" r="62%">
          <stop stopColor="#fbcfe8" stopOpacity="0.62" />
          <stop offset="1" stopColor="#ddd6fe" stopOpacity="0.1" />
        </radialGradient>
      </defs>

      <path
        d="M58 168C48 105 99 50 167 62C214 70 227 105 272 98C330 88 362 142 332 202C308 250 238 264 179 244C119 224 68 231 58 168Z"
        fill={`url(#${warmId})`}
      />
      <path
        d="M132 178C123 137 136 101 162 89C181 80 194 92 189 113L177 164"
        stroke={`url(#${gradientId})`}
        strokeWidth="16"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M180 166L193 96M204 167L223 105M229 171L246 124"
        stroke={`url(#${gradientId})`}
        strokeWidth="13"
        strokeLinecap="round"
        opacity="0.76"
      />
      <path
        d="M139 176C160 216 212 229 251 198C266 186 272 170 272 152"
        stroke={`url(#${gradientId})`}
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.82"
      />
      <path
        d="M268 88H315C330 88 342 100 342 115V142C342 157 330 169 315 169H289L270 190V169H268C253 169 241 157 241 142V115C241 100 253 88 268 88Z"
        fill="#ffffff"
        fillOpacity="0.72"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
      />
      <path d="M275 126H308M275 144H324" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.28" />
      <path d="M82 82L91 97L108 100L96 113L98 130L82 123L67 130L69 113L57 100L74 97L82 82Z" fill="#fb7185" opacity="0.62" />
      <circle cx="103" cy="206" r="6" fill="#7c3aed" opacity="0.5" />
      <circle cx="314" cy="214" r="8" fill="#d946ef" opacity="0.42" />
    </svg>
  );
}

