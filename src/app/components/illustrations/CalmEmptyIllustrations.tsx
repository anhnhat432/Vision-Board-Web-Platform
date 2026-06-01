import { type AmbientIllustrationProps, useIllustrationId } from "./utils";

export function MountainMoonIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("calm-mountain-grad");

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      viewBox="0 0 320 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="180" x2="320" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.03" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Soft circular background glow */}
      <circle cx="160" cy="90" r="70" fill={`url(#${gradientId})`} />

      {/* Minimalist Crescent Moon */}
      <path
        d="M175 40C165 40 156 46 153 55C159 55 165 59 168 64C171 69 171 75 169 80C179 78 186 69 186 58C186 48 181 41 175 40Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />

      {/* Mountain 1 (Back) */}
      <path
        d="M60 140L130 85L210 140"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.25"
      />

      {/* Mountain 2 (Front Right) */}
      <path
        d="M150 140L215 95L275 140"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />

      {/* Mountain 3 (Front Left) */}
      <path
        d="M80 140L165 75L230 140"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* Horizontal Horizon line */}
      <path d="M40 140H280" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.2" />

      {/* Tiny stars / sparkles */}
      <circle cx="95" cy="55" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="235" cy="65" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="215" cy="45" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function ZenLeafIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("calm-leaf-grad");

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      viewBox="0 0 320 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="180" x2="320" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.03" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {/* Soft circular background glow */}
      <circle cx="160" cy="90" r="70" fill={`url(#${gradientId})`} />

      {/* Water concentric ripple 1 */}
      <ellipse
        cx="160"
        cy="125"
        rx="80"
        ry="20"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="4 4"
        opacity="0.2"
      />

      {/* Water Concentric ripple 2 */}
      <ellipse cx="160" cy="125" rx="50" ry="12" stroke="currentColor" strokeWidth="1" opacity="0.35" />

      {/* Minimalist zen leaf outline */}
      <path
        d="M135 110C142 85 178 70 190 95C170 102 155 125 135 110Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />

      {/* Leaf stem and center vein */}
      <path
        d="M125 118C130 115 135 110 145 106M145 106C158 100 178 92 190 95"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />

      {/* Floating Zen circles/dots */}
      <circle cx="210" cy="70" r="2.5" fill="currentColor" opacity="0.4" />
      <circle cx="105" cy="85" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
