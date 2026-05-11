import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function CelebrationBurst({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("celebration-burst-violet-rose");

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="50" y1="54" x2="190" y2="188" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" />
          <stop offset="0.58" stopColor="var(--tone-shell-secondary, #d946ef)" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="74" fill={`url(#${gradientId})`} opacity="0.14" />
      <path d="M120 34V62M120 178V206M34 120H62M178 120H206M58 58L78 78M162 162L182 182M182 58L162 78M78 162L58 182" stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round" opacity="0.58" />
      <path d="M120 78L132 106L162 109L139 128L146 158L120 142L94 158L101 128L78 109L108 106L120 78Z" fill={`url(#${gradientId})`} opacity="0.88" />
      <circle cx="66" cy="96" r="5" fill="#fb7185" opacity="0.65" />
      <circle cx="174" cy="92" r="6" fill="#7c3aed" opacity="0.55" />
      <circle cx="83" cy="184" r="4.5" fill="#d946ef" opacity="0.58" />
      <circle cx="170" cy="184" r="5" fill="#14b8a6" opacity="0.55" />
    </svg>
  );
}

