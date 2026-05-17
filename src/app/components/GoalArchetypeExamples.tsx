import type { GoalArchetype } from "@/lib/smart-goal";
import {
  getGoalArchetypeExample,
  getGoalArchetypeLabel,
} from "@/lib/smart-goal";
import { CircleAlert, Lightbulb } from "lucide-react";

/**
 * Which slice of the example bundle to render. Keeps the panel small —
 * each surface (SMART specific step, SMART measurable step, lead
 * indicators step) only shows the part of the bundle relevant to the
 * step it is on.
 */
export type GoalArchetypeExampleVariant =
  | "goal" // weakGoal + strongerGoal
  | "metric" // goodMetric + badMetric
  | "lead_indicator"; // goodLeadIndicator + badLeadIndicator + week1StarterTask

interface GoalArchetypeExamplesProps {
  archetype: GoalArchetype | null | undefined;
  variant: GoalArchetypeExampleVariant;
  /** Header copy. Defaults to a friendly Vietnamese sentence. */
  title?: string;
  /** Render the disclosure expanded by default. Off by default to avoid scroll fatigue. */
  defaultOpen?: boolean;
  /** Optional className passthrough for spacing. */
  className?: string;
}

const VARIANT_TITLE: Record<GoalArchetypeExampleVariant, string> = {
  goal: "So sánh hai cách viết cùng một mục tiêu",
  metric: "So sánh hai cách chọn chỉ số theo dõi",
  lead_indicator: "So sánh hai cách chọn việc lặp lại",
};

/**
 * Tiny disclosure panel showing weak vs. stronger examples for one slice
 * of the archetype example bundle. Renders nothing when archetype is
 * null/undefined or `"other"` — those cases get the generic SMART rubric
 * instead, no archetype-specific copy.
 *
 * Pure presentation. Reads only from the deterministic example bundle
 * via `getGoalArchetypeExample`. No analytics, no storage writes.
 */
export function GoalArchetypeExamples({
  archetype,
  variant,
  title,
  defaultOpen = false,
  className,
}: GoalArchetypeExamplesProps) {
  if (!archetype || archetype === "other") return null;

  const example = getGoalArchetypeExample(archetype);
  const archetypeLabel = getGoalArchetypeLabel(archetype);
  const headline = title ?? VARIANT_TITLE[variant];

  const pair = pickPair(example, variant);

  return (
    <details
      open={defaultOpen}
      data-testid="goal-archetype-examples"
      data-variant={variant}
      data-archetype={archetype}
      className={["rounded-lg border border-app-line bg-app-bg p-3 text-left", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-medium text-app-ink">
        <Lightbulb className="h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
        <span>
          {headline} <span className="font-normal text-app-ink-muted">— {archetypeLabel}</span>
        </span>
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {pair.map((entry) => (
          <div
            key={`${variant}-${entry.tone}`}
            data-tone={entry.tone}
            className={
              entry.tone === "weak"
                ? "rounded-lg border border-app-line bg-app-surface px-3 py-2.5 text-[14px] leading-6 text-app-ink-soft"
                : "rounded-lg border border-app-accent bg-app-accent-soft px-3 py-2.5 text-[14px] leading-6 text-app-accent"
            }
          >
            <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]">
              {entry.tone === "weak" ? (
                <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{entry.label}</span>
            </div>
            <p className="mt-1.5">{entry.body}</p>
          </div>
        ))}
      </div>
      {variant === "lead_indicator" ? (
        <p
          data-testid="goal-archetype-week1-starter"
          className="mt-3 rounded-lg border border-app-line bg-app-surface px-3 py-2.5 text-[14px] leading-6 text-app-ink-soft"
        >
          <span className="font-medium text-app-ink">Việc bắt đầu cho tuần 1:</span> {example.week1StarterTask}
        </p>
      ) : null}
    </details>
  );
}

interface ExamplePairEntry {
  tone: "weak" | "stronger";
  label: string;
  body: string;
}

function pickPair(
  example: ReturnType<typeof getGoalArchetypeExample>,
  variant: GoalArchetypeExampleVariant,
): ExamplePairEntry[] {
  switch (variant) {
    case "goal":
      return [
        { tone: "weak", label: "Mục tiêu chưa rõ", body: example.weakGoal },
        { tone: "stronger", label: "Phiên bản rõ hơn", body: example.strongerGoal },
      ];
    case "metric":
      return [
        { tone: "weak", label: "Chỉ số dễ ngộ nhận", body: example.badMetric },
        { tone: "stronger", label: "Chỉ số đo được", body: example.goodMetric },
      ];
    case "lead_indicator":
      return [
        { tone: "weak", label: "Việc nhầm thành kết quả", body: example.badLeadIndicator },
        { tone: "stronger", label: "Việc lặp lại tốt", body: example.goodLeadIndicator },
      ];
  }
}
