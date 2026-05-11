import { useIllustrationId, type AmbientIllustrationProps } from "./utils";

export function BillingPlusIllustration({ className, ...rest }: AmbientIllustrationProps) {
  const gradientId = useIllustrationId("billing-plus-violet-fuchsia");
  const glowId = useIllustrationId("billing-plus-glow");

  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="64" y1="38" x2="184" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.68" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="52%">
          <stop stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="122" r="100" fill={`url(#${glowId})`} />
      <path d="M120 30L174 62L196 120L164 188L120 214L76 188L44 120L66 62L120 30Z" fill={`url(#${gradientId})`} stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
      <path d="M120 30V214M66 62L164 188M174 62L76 188M44 120H196" stroke="white" strokeOpacity="0.22" strokeWidth="2" />
      <path d="M120 84V156M84 120H156" stroke="white" strokeOpacity="0.82" strokeWidth="13" strokeLinecap="round" />
      <path d="M120 12V28M120 212V228M28 120H44M196 120H212M52 52L64 64M176 176L188 188" stroke="currentColor" strokeOpacity="0.42" strokeWidth="5" strokeLinecap="round" />
      <circle cx="174" cy="62" r="5" fill="white" fillOpacity="0.72" />
      <circle cx="76" cy="188" r="5" fill="white" fillOpacity="0.58" />
    </svg>
  );
}
