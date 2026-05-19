import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function EmptyOrdersIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("empty-orders-app-accent");
  const glowId = useIllustrationId("empty-orders-glow");

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
        <linearGradient id={gradientId} x1="80" y1="48" x2="242" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.58" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="55%" r="55%">
          <stop stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="150" rx="128" ry="68" fill={`url(#${glowId})`} />
      <path
        d="M84 108H236V190H84V108Z"
        fill={`url(#${gradientId})`}
        stroke="currentColor"
        strokeOpacity="0.24"
        strokeWidth="2"
      />
      <path
        d="M84 108L60 78H132L160 108H84ZM236 108L260 78H188L160 108H236Z"
        fill={`url(#${gradientId})`}
        opacity="0.66"
      />
      <path d="M160 108V190M112 108V190M208 108V190" stroke="white" strokeOpacity="0.42" strokeWidth="5" />
      <path
        d="M100 70C96 48 124 44 138 78M220 70C224 48 196 44 182 78"
        stroke="currentColor"
        strokeOpacity="0.34"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M68 50L76 60M252 48L244 60M160 26V42M42 120H58M264 124H280"
        stroke="currentColor"
        strokeOpacity="0.36"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M252 160C240 164 236 174 240 190C252 184 259 176 252 160Z" fill="currentColor" opacity="0.24" />
    </svg>
  );
}
