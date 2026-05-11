import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

const SOFT_DOTS = Array.from({ length: 100 }, (_, dotIndex) => {
  const row = Math.floor(dotIndex / 10);
  const col = dotIndex % 10;

  return {
    id: `soft-dot-${dotIndex}`,
    cx: 18 + col * 18,
    cy: 18 + row * 18,
    r: row + col > 13 ? 1.8 : 2.6,
  };
});

export function SoftDotsPattern({ className, ...rest }: AmbientIllustrationProps) {
  const fadeId = useIllustrationId("soft-dots-fade");

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <radialGradient id={fadeId} cx="78%" cy="16%" r="82%">
          <stop stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.03" />
        </radialGradient>
      </defs>
      {SOFT_DOTS.map((dot) => (
        <circle key={dot.id} cx={dot.cx} cy={dot.cy} r={dot.r} fill={`url(#${fadeId})`} />
      ))}
    </svg>
  );
}
