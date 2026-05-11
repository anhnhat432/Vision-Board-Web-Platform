import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function EmptyTaskIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("empty-task-violet-fuchsia");
  const glowId = useIllustrationId("empty-task-glow");

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
        <linearGradient id={gradientId} x1="78" y1="58" x2="248" y2="194" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tone-shell-primary, #7c3aed)" stopOpacity="0.86" />
          <stop offset="0.55" stopColor="var(--tone-shell-secondary, #d946ef)" stopOpacity="0.64" />
          <stop offset="1" stopColor="var(--tone-shell-tertiary, #fb7185)" stopOpacity="0.56" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="55%">
          <stop stopColor="#ddd6fe" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ddd6fe" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="160" cy="126" rx="118" ry="86" fill={`url(#${glowId})`} />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={88 + col * 50}
            y={72 + row * 42}
            width="34"
            height="28"
            rx="9"
            fill="#ffffff"
            fillOpacity="0.76"
            stroke={col === 2 && row === 0 ? `url(#${gradientId})` : "currentColor"}
            strokeWidth={col === 2 && row === 0 ? 2.2 : 1.5}
            opacity={col === 2 && row === 0 ? 1 : 0.22}
          />
        )),
      )}
      <path d="M192 83L202 93L222 70" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 188C110 202 176 207 248 182" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 8" opacity="0.5" />
      <path d="M68 70L76 84L92 87L81 99L83 115L68 108L53 115L56 99L44 87L60 84L68 70Z" fill="#fb7185" opacity="0.54" />
      <circle cx="262" cy="80" r="6" fill="#7c3aed" opacity="0.45" />
      <circle cx="246" cy="166" r="5" fill="#d946ef" opacity="0.52" />
    </svg>
  );
}

