import { type AmbientIllustrationProps, useIllustrationId } from "../utils";

function ChipSvg({ children, className, gradientId, ...rest }: AmbientIllustrationProps & { gradientId: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="var(--mini-icon-strong, 0.72)" />
          <stop offset="1" stopColor="currentColor" stopOpacity="var(--mini-icon-soft, 0.18)" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

export function PhaseRampChipIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("phase-ramp-chip");
  return (
    <ChipSvg gradientId={id} {...props}>
      <path
        d="M5 18l4-4 3 2 6-8"
        stroke={`url(#${id})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 8h3v3" stroke="currentColor" strokeOpacity="0.42" strokeWidth="2" strokeLinecap="round" />
    </ChipSvg>
  );
}

export function PhasePeakChipIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("phase-peak-chip");
  return (
    <ChipSvg gradientId={id} {...props}>
      <path d="M4 18l8-12 8 12H4Z" fill={`url(#${id})`} />
      <path d="M12 6l3 12" stroke="white" strokeOpacity="0.45" strokeWidth="1.6" />
    </ChipSvg>
  );
}

export function PhaseHarvestChipIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("phase-harvest-chip");
  return (
    <ChipSvg gradientId={id} {...props}>
      <path d="M12 20V7" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 11c4-4 7-3 8-2-1 3-4 5-8 4M12 15c-4-4-7-3-8-2 1 3 4 5 8 4" fill={`url(#${id})`} />
    </ChipSvg>
  );
}

export function GoalArchetypeFinancialIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("goal-archetype-financial");
  return (
    <ChipSvg gradientId={id} {...props}>
      <rect x="5" y="13" width="3" height="6" rx="1.5" fill={`url(#${id})`} />
      <rect x="11" y="9" width="3" height="10" rx="1.5" fill={`url(#${id})`} />
      <rect x="17" y="5" width="3" height="14" rx="1.5" fill={`url(#${id})`} />
      <circle cx="19" cy="5" r="2" fill="currentColor" opacity="0.34" />
    </ChipSvg>
  );
}

export function GoalArchetypeCreativeIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("goal-archetype-creative");
  return (
    <ChipSvg gradientId={id} {...props}>
      <path d="M5 17c7 2 12-2 14-10-8 1-13 5-14 10Z" fill={`url(#${id})`} />
      <path d="M8 16c3-4 6-6 10-8" stroke="white" strokeOpacity="0.58" strokeWidth="1.7" strokeLinecap="round" />
    </ChipSvg>
  );
}

export function GoalArchetypeHabitIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("goal-archetype-habit");
  return (
    <ChipSvg gradientId={id} {...props}>
      <path d="M18 8a7 7 0 1 0 1 7" stroke={`url(#${id})`} strokeWidth="2.3" strokeLinecap="round" />
      <path
        d="M18 5v4h-4"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ChipSvg>
  );
}

export function GoalArchetypeLearningIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("goal-archetype-learning");
  return (
    <ChipSvg gradientId={id} {...props}>
      <path d="M9 14a6 6 0 1 1 6 0v3H9v-3Z" fill={`url(#${id})`} />
      <path d="M9 20h6" stroke="currentColor" strokeOpacity="0.42" strokeWidth="2" strokeLinecap="round" />
    </ChipSvg>
  );
}

export function GoalArchetypeHealthIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("goal-archetype-health");
  return (
    <ChipSvg gradientId={id} {...props}>
      <path
        d="M12 19s-7-4-7-9a3.7 3.7 0 0 1 6.7-2.1A3.7 3.7 0 0 1 19 10c0 5-7 9-7 9Z"
        stroke={`url(#${id})`}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </ChipSvg>
  );
}

export function GoalArchetypeRelationshipIcon(props: AmbientIllustrationProps) {
  const id = useIllustrationId("goal-archetype-relationship");
  return (
    <ChipSvg gradientId={id} {...props}>
      <circle cx="9" cy="12" r="5" fill={`url(#${id})`} />
      <circle cx="15" cy="12" r="5" fill={`url(#${id})`} opacity="0.66" />
    </ChipSvg>
  );
}
