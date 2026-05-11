import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function LifeBalanceWheelIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("life-balance-wheel-violet-fuchsia");
  const glowId = useIllustrationId("life-balance-wheel-glow");

  return (
    <svg
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="65" y1="52" x2="252" y2="270" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="var(--illustration-strong, 0.56)" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity="var(--illustration-mid, 0.28)" />
          <stop offset="1" stopColor="currentColor" stopOpacity="var(--illustration-soft, 0.12)" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="48%" r="50%">
          <stop stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="160" r="136" fill={`url(#${glowId})`} />
      {[
        "M160 160L160 44A116 116 0 01242 78Z",
        "M160 160L242 78A116 116 0 01276 160Z",
        "M160 160L276 160A116 116 0 01242 242Z",
        "M160 160L242 242A116 116 0 01160 276Z",
        "M160 160L160 276A116 116 0 0178 242Z",
        "M160 160L78 242A116 116 0 0144 160Z",
        "M160 160L44 160A116 116 0 0178 78Z",
        "M160 160L78 78A116 116 0 01160 44Z",
      ].map((path, index) => (
        <path
          key={path}
          d={path}
          fill={`url(#${gradientId})`}
          opacity={0.42 + index * 0.055}
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="1"
        />
      ))}
      <circle cx="160" cy="160" r="116" stroke="currentColor" strokeOpacity="0.32" strokeWidth="2" />
      <circle cx="160" cy="160" r="38" fill="white" fillOpacity="0.72" stroke="currentColor" strokeOpacity="0.22" />
      <circle cx="160" cy="160" r="9" fill="currentColor" opacity="0.72" />
      <path d="M160 44V276M44 160H276M78 78L242 242M242 78L78 242" stroke="currentColor" strokeOpacity="0.14" />
    </svg>
  );
}
