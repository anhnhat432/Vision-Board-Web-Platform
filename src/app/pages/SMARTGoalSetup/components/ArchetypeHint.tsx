import { Lightbulb, Sparkles, Target, TriangleAlert } from "lucide-react";

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

const VARIANT_BG: Record<ArchetypeHintVariant, string> = {
  metric: "border-emerald-200 bg-emerald-50/70",
  leadAction: "border-violet-200 bg-violet-50/70",
  antiPattern: "border-amber-200 bg-amber-50/70",
};

export function ArchetypeHint({ archetype, variant, showArchetypeTag = true }: ArchetypeHintProps) {
  const archetypeLabel = getGoalArchetypeLabel(archetype);
  const hints = getArchetypeQualityHints(archetype);
  const planDefaults = getArchetypePlanDefaults(archetype);

  let body: React.ReactNode = null;
  let Icon = Lightbulb;

  if (variant === "metric") {
    Icon = Target;
    body = <p className="text-sm leading-6 text-slate-700">{hints.recommendedMetric}</p>;
  } else if (variant === "leadAction") {
    Icon = Sparkles;
    body = (
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
        {planDefaults.recommendedLeadIndicators.map((indicator) => (
          <li key={indicator}>{indicator}</li>
        ))}
      </ul>
    );
  } else {
    Icon = TriangleAlert;
    body = (
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
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
      className={`rounded-[var(--r-card)] border p-4 ${VARIANT_BG[variant]}`}
      data-archetype={archetype}
      data-archetype-hint-variant={variant}
    >
      {showArchetypeTag && (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Loại mục tiêu: {archetypeLabel}
        </p>
      )}
      <div className="mt-2 flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{VARIANT_TITLE[variant]}</p>
          <div className="mt-2">{body}</div>
        </div>
      </div>
    </div>
  );
}
