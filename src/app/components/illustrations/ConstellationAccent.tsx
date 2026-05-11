import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function ConstellationAccent({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("constellation-accent-violet-fuchsia");
  const points = [
    [24, 42, 4],
    [58, 24, 3],
    [92, 58, 5],
    [132, 34, 3],
    [118, 104, 4],
    [66, 126, 3],
    [32, 96, 3],
  ];

  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="18" y1="18" x2="142" y2="136" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.48" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <path d="M24 42L58 24L92 58L132 34M92 58L118 104L66 126L32 96L24 42" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" opacity="0.46" />
      ))}
      <path d="M132 18L136 27L146 29L138 36L140 46L132 41L124 46L126 36L118 29L128 27L132 18Z" fill="currentColor" opacity="0.48" />
    </svg>
  );
}
