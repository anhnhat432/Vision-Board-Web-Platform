import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function WavyDividerIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("wavy-divider-violet-fuchsia");

  return (
    <svg
      viewBox="0 0 1200 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      preserveAspectRatio="none"
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1200" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <path d="M0 46C132 10 240 10 360 42C493 78 611 78 742 40C876 2 1016 7 1200 46" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" />
      <path d="M0 64C152 30 276 28 392 56C522 88 640 88 760 54C898 16 1030 22 1200 62" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" opacity="0.72" />
    </svg>
  );
}
