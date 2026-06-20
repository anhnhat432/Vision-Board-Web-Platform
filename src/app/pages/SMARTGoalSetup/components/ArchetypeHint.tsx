import { Lightbulb, Target, TriangleAlert } from "lucide-react";

import {
  type GoalArchetype,
  getArchetypePlanDefaults,
  getArchetypeQualityHints,
  getGoalArchetypeLabel,
} from "@/lib/smart-goal/goalArchetypes";
import { cn } from "../../../components/ui/utils";

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
    body = <p className="font-semibold text-app-ink">{hints.recommendedMetric}</p>;
  } else if (variant === "leadAction") {
    body = (
      <ul className="list-disc space-y-1.5 pl-4">
        {planDefaults.recommendedLeadIndicators.map((indicator) => (
          <li key={indicator} className="font-medium text-app-ink">
            {indicator}
          </li>
        ))}
      </ul>
    );
  } else {
    Icon = TriangleAlert;
    body = (
      <ul className="list-disc space-y-1.5 pl-4">
        {hints.antiPatterns.slice(0, 3).map((pattern) => (
          <li key={pattern} className="font-medium text-app-ink">
            {pattern}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      role="note"
      aria-label={`${VARIANT_TITLE[variant]} (${archetypeLabel})`}
      className={cn(
        "rounded-[14px] border p-4 transition-all duration-200",
        variant === "antiPattern"
          ? "border-app-status-warning/30 bg-app-status-warning/5 text-app-status-warning dark:text-app-status-warning"
          : variant === "metric"
            ? "border-app-accent/20 bg-app-accent-soft/30 text-app-accent"
            : "border-app-accent/20 bg-app-accent-soft/30 text-app-accent",
      )}
      data-archetype={archetype}
      data-archetype-hint-variant={variant}
    >
      {showArchetypeTag ? (
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-app-ink-muted/80">
          Loại mục tiêu: {archetypeLabel}
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
            variant === "antiPattern"
              ? "border-app-status-warning/30 bg-app-status-warning/10 text-app-status-warning dark:text-app-status-warning"
              : variant === "metric"
                ? "border-app-accent/30 bg-app-accent-soft text-app-accent"
                : "border-app-accent/30 bg-app-accent-soft text-app-accent",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 text-sm leading-relaxed text-app-ink-soft">
          <p className="font-bold text-app-ink">{VARIANT_TITLE[variant]}</p>
          <div className="mt-2 text-app-ink-soft">{body}</div>
        </div>
      </div>
    </div>
  );
}
