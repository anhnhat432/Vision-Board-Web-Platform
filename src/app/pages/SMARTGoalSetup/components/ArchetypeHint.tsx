import { Lightbulb, Target, TriangleAlert } from "lucide-react";

import {
  type GoalArchetype,
  getArchetypePlanDefaults,
  getArchetypeQualityHints,
  getGoalArchetypeLabel,
} from "@/lib/smart-goal/goalArchetypes";

export type ArchetypeHintVariant = "metric" | "leadAction" | "antiPattern";

interface ArchetypeHintProps {
  archetype: GoalArchetype;
  variant: ArchetypeHintVariant;
  /** Show the small "loại mục tiêu: X" tag at the top. Default true. */
  showArchetypeTag?: boolean;
}

const VARIANT_TITLE: Record<ArchetypeHintVariant, string> = {
  metric: "Chỉ số nên đo cho loại mục tiêu này",
  leadAction: "Việc giữ nhịp thường hiệu quả",
  antiPattern: "Rủi ro hay gặp với loại mục tiêu này",
};

export function ArchetypeHint({ archetype, variant, showArchetypeTag = true }: ArchetypeHintProps) {
  const archetypeLabel = getGoalArchetypeLabel(archetype);
  const hints = getArchetypeQualityHints(archetype);
  const planDefaults = getArchetypePlanDefaults(archetype);

  let body: React.ReactNode = null;
  let Icon = Lightbulb;

  if (variant === "metric") {
    Icon = Target;
    body = <p>{hints.recommendedMetric}</p>;
  } else if (variant === "leadAction") {
    body = (
      <ul className="list-disc space-y-1 pl-4">
        {planDefaults.recommendedLeadIndicators.map((indicator) => (
          <li key={indicator}>{indicator}</li>
        ))}
      </ul>
    );
  } else {
    Icon = TriangleAlert;
    body = (
      <ul className="list-disc space-y-1 pl-4">
        {hints.antiPatterns.slice(0, 3).map((pattern) => (
          <li key={pattern}>{pattern}</li>
        ))}
      </ul>
    );
  }

  return (
    <div
      role="note"
      aria-label={`${VARIANT_TITLE[variant]} (${archetypeLabel})`}
      className="rounded-lg border border-app-line bg-app-bg p-3"
      data-archetype={archetype}
      data-archetype-hint-variant={variant}
    >
      {showArchetypeTag ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-app-ink-muted">
          Loại mục tiêu: {archetypeLabel}
        </p>
      ) : null}
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
        <div className="min-w-0 text-[12px] leading-relaxed text-app-ink-soft">
          <p className="font-medium text-app-ink">{VARIANT_TITLE[variant]}</p>
          <div className="mt-1.5">{body}</div>
        </div>
      </div>
    </div>
  );
}
