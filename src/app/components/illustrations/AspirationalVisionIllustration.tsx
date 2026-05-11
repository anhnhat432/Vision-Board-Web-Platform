import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function AspirationalVisionIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("aspirational-vision-violet-fuchsia");
  const glowId = useIllustrationId("aspirational-vision-glow");

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="76" y1="62" x2="334" y2="254" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.62" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id={glowId} cx="56%" cy="48%" r="55%">
          <stop stopColor="currentColor" stopOpacity="0.23" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="210" cy="178" rx="162" ry="88" fill={`url(#${glowId})`} />
      <path d="M42 236C92 194 125 198 167 156C206 117 229 106 272 56C296 102 326 145 366 214V250H42V236Z" fill={`url(#${gradientId})`} />
      <path d="M92 238L166 142L207 194L272 56L354 236" stroke="currentColor" strokeOpacity="0.36" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M62 256C118 218 174 219 218 190C253 167 282 128 316 82" stroke="white" strokeOpacity="0.72" strokeWidth="7" strokeLinecap="round" strokeDasharray="8 14" />
      <path d="M272 30L282 51L305 54L288 70L292 93L272 82L252 93L256 70L239 54L262 51L272 30Z" fill="currentColor" opacity="0.72" />
      <circle cx="78" cy="244" r="7" fill="white" fillOpacity="0.8" />
      <circle cx="316" cy="82" r="7" fill="white" fillOpacity="0.75" />
      <path d="M54 264H354" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
