import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

const WEEK_CELLS = [
  { id: "monday", x: 76, fillOpacity: 0.78 },
  { id: "tuesday", x: 101, fillOpacity: 0.78 },
  { id: "wednesday", x: 126, fillOpacity: 0.78 },
  { id: "thursday", x: 151, fillOpacity: 0.78 },
  { id: "friday", x: 176, fillOpacity: 0.34 },
  { id: "saturday", x: 201, fillOpacity: 0.34 },
  { id: "sunday", x: 226, fillOpacity: 0.34 },
] as const;

const CHECKMARKS = [
  { id: "check-monday", x: 81 },
  { id: "check-tuesday", x: 106 },
  { id: "check-wednesday", x: 131 },
  { id: "check-thursday", x: 156 },
] as const;

export function WeeklyReviewIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("weekly-review-app-accent");
  const glowId = useIllustrationId("weekly-review-glow");

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
        <linearGradient id={gradientId} x1="76" y1="54" x2="246" y2="202" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.58" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="52%" r="54%">
          <stop stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="132" rx="130" ry="76" fill={`url(#${glowId})`} />
      <rect
        x="58"
        y="56"
        width="204"
        height="142"
        rx="24"
        fill={`url(#${gradientId})`}
        stroke="currentColor"
        strokeOpacity="0.24"
        strokeWidth="2"
      />
      <path d="M58 92H262" stroke="white" strokeOpacity="0.52" strokeWidth="4" />
      <path d="M102 44V70M218 44V70" stroke="currentColor" strokeOpacity="0.42" strokeWidth="8" strokeLinecap="round" />
      {WEEK_CELLS.map((cell) => (
        <rect
          key={cell.id}
          x={cell.x}
          y="112"
          width="17"
          height="44"
          rx="6"
          fill="white"
          fillOpacity={cell.fillOpacity}
        />
      ))}
      {CHECKMARKS.map((mark) => (
        <path
          key={mark.id}
          d={`M${mark.x} 134L${mark.x + 5} 140L${mark.x + 13} 126`}
          stroke="currentColor"
          strokeOpacity="0.58"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <path
        d="M248 38L254 52L269 54L258 64L261 79L248 71L235 79L238 64L227 54L242 52L248 38Z"
        fill="currentColor"
        opacity="0.58"
      />
    </svg>
  );
}
