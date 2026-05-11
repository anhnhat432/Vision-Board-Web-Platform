import { useIllustrationId, type AmbientIllustrationProps } from "../utils";

function AreaFrame({ children, className, gradientId, ...rest }: AmbientIllustrationProps & { gradientId: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" role="presentation" className={className} {...rest}>
      <defs>
        <linearGradient id={gradientId} x1="5" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="var(--mini-icon-strong, 0.68)" />
          <stop offset="1" stopColor="currentColor" stopOpacity="var(--mini-icon-soft, 0.16)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill={`url(#${gradientId})`} opacity="0.34" />
      {children}
    </svg>
  );
}

export function LifeAreaHealthIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("life-area-health");
  return (
    <AreaFrame gradientId={id} {...props}>
      <path d="M16 24s-8-4.8-8-11a4.2 4.2 0 0 1 7.4-2.7A4.2 4.2 0 0 1 23 13c0 6.2-7 11-7 11Z" fill={`url(#${id})`} />
    </AreaFrame>
  );
}

export function LifeAreaCareerIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("life-area-career");
  return (
    <AreaFrame gradientId={id} {...props}>
      <rect x="8" y="12" width="16" height="11" rx="3" fill={`url(#${id})`} />
      <path d="M13 12V9h6v3M22 8l2-2M24 11h3" stroke="currentColor" strokeOpacity="0.62" strokeWidth="1.7" strokeLinecap="round" />
    </AreaFrame>
  );
}

export function LifeAreaFinanceIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("life-area-finance");
  return (
    <AreaFrame gradientId={id} {...props}>
      <ellipse cx="16" cy="11" rx="7" ry="3" fill={`url(#${id})`} />
      <path d="M9 11v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7M9 15c0 1.7 3.1 3 7 3s7-1.3 7-3" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.6" />
    </AreaFrame>
  );
}

export function LifeAreaFamilyIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("life-area-family");
  return (
    <AreaFrame gradientId={id} {...props}>
      <path d="M9 16l7-6 7 6v7H9v-7Z" fill={`url(#${id})`} />
      <circle cx="12" cy="18" r="1.7" fill="white" opacity="0.8" />
      <circle cx="16" cy="16.5" r="1.9" fill="white" opacity="0.85" />
      <circle cx="20" cy="18" r="1.7" fill="white" opacity="0.8" />
    </AreaFrame>
  );
}

export function LifeAreaLearningIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("life-area-learning");
  return (
    <AreaFrame gradientId={id} {...props}>
      <path d="M7 10c4 0 6 1 9 3 3-2 5-3 9-3v13c-4 0-6 1-9 3-3-2-5-3-9-3V10Z" fill={`url(#${id})`} />
      <path d="M16 13v12" stroke="white" strokeOpacity="0.62" strokeWidth="1.5" strokeLinecap="round" />
    </AreaFrame>
  );
}

export function LifeAreaMindIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("life-area-mind");
  return (
    <AreaFrame gradientId={id} {...props}>
      <circle cx="16" cy="15" r="5" fill={`url(#${id})`} />
      <path d="M9 23h14M12 19l-4 4M20 19l4 4" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="15" r="1.8" fill="white" opacity="0.82" />
    </AreaFrame>
  );
}

export function LifeAreaFunIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("life-area-fun");
  return (
    <AreaFrame gradientId={id} {...props}>
      <circle cx="16" cy="12" r="6" fill={`url(#${id})`} />
      <path d="M16 18c0 4-4 4-4 7M16 18c0 4 4 4 4 7" stroke="currentColor" strokeOpacity="0.52" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M13 12h.1M19 12h.1" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </AreaFrame>
  );
}

export function LifeAreaRelationshipIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("life-area-relationship");
  return (
    <AreaFrame gradientId={id} {...props}>
      <circle cx="13" cy="16" r="6" fill={`url(#${id})`} />
      <circle cx="19" cy="16" r="6" fill={`url(#${id})`} opacity="0.72" />
      <path d="M16 11c2 2 2 8 0 10" stroke="white" strokeOpacity="0.68" strokeWidth="1.6" strokeLinecap="round" />
    </AreaFrame>
  );
}
