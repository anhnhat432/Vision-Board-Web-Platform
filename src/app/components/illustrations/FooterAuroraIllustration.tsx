import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function FooterAuroraIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("footer-aurora-violet-fuchsia");

  return (
    <svg
      viewBox="0 0 1440 200"
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
        <linearGradient id={gradientId} x1="0" y1="42" x2="1440" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.18" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="0.54" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="0.86" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 146C160 72 286 88 456 124C608 156 760 162 940 104C1128 44 1288 62 1440 116V200H0V146Z" fill={`url(#${gradientId})`} />
      <path d="M0 118C190 78 336 86 512 118C704 152 872 140 1054 92C1210 50 1322 64 1440 92" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
