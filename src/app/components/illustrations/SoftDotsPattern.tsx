import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

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
      {Array.from({ length: 10 }, (_, row) =>
        Array.from({ length: 10 }, (_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={18 + col * 18}
            cy={18 + row * 18}
            r={row + col > 13 ? 1.8 : 2.6}
            fill={`url(#${fadeId})`}
          />
        )),
      )}
    </svg>
  );
}
