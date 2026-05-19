import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function VisionMapIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("vision-map-app-accent");
  const mapId = useIllustrationId("vision-map-paper");

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="74" y1="56" x2="324" y2="236" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F5D50" stopOpacity="0.88" />
          <stop offset="0.5" stopColor="#3B7565" stopOpacity="0.66" />
          <stop offset="1" stopColor="#4E8C7A" stopOpacity="0.56" />
        </linearGradient>
        <linearGradient id={mapId} x1="86" y1="72" x2="316" y2="230" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.88" />
          <stop offset="1" stopColor="#E8F0EC" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      <path
        d="M80 82L148 58L218 82L312 58V220L218 244L148 220L80 244V82Z"
        fill={`url(#${mapId})`}
        stroke={`url(#${gradientId})`}
        strokeWidth="2.2"
      />
      <path d="M148 58V220M218 82V244" stroke="currentColor" strokeWidth="1.5" opacity="0.18" />
      <path
        d="M112 188C143 128 186 174 206 122C226 72 270 102 294 86"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="6 8"
        opacity="0.56"
      />
      <path
        d="M128 116C128 101 140 90 155 90C170 90 182 101 182 116C182 138 155 160 155 160C155 160 128 138 128 116Z"
        fill={`url(#${gradientId})`}
        opacity="0.84"
      />
      <circle cx="155" cy="116" r="8" fill="#ffffff" fillOpacity="0.78" />
      <path
        d="M244 158C244 145 255 134 268 134C281 134 292 145 292 158C292 177 268 198 268 198C268 198 244 177 244 158Z"
        fill="#3B7565"
        opacity="0.72"
      />
      <circle cx="268" cy="158" r="7" fill="#ffffff" fillOpacity="0.76" />
      <path
        d="M96 62L104 76L120 79L108 91L111 107L96 100L82 107L84 91L72 79L88 76L96 62Z"
        fill="#4E8C7A"
        opacity="0.5"
      />
      <circle cx="322" cy="212" r="8" fill="#2F5D50" opacity="0.42" />
    </svg>
  );
}
