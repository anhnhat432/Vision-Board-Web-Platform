import { CheckCircle2, ChevronDown, CircleAlert, Lightbulb } from "lucide-react";
import type { GoalArchetype } from "@/lib/smart-goal";
import { getGoalArchetypeExample, getGoalArchetypeLabel } from "@/lib/smart-goal";
import { cn } from "./ui/utils";

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
      className={cn(
        "group overflow-hidden rounded-[14px] border border-app-line bg-app-surface transition-all duration-200 text-left",
        className,
      )}
    >
      <summary className="flex cursor-pointer items-center justify-between list-none p-4 text-sm font-semibold text-app-accent hover:bg-app-accent-soft/10 focus:outline-none focus:ring-2 focus:ring-app-accent/30 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
          <span>
            {headline} <span className="font-normal text-app-ink-muted/80">— {archetypeLabel}</span>
          </span>
        </span>
        <ChevronDown
          className="h-4.5 w-4.5 text-app-accent transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="border-t border-app-accent/10 bg-app-surface/50 p-4 space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          {pair.map((entry) => {
            const isStrong = entry.tone === "stronger";
            return (
              <div
                key={`${variant}-${entry.tone}`}
                data-tone={entry.tone}
                className={cn(
                  "rounded-[14px] border p-4 text-sm leading-relaxed transition-all duration-200",
                  isStrong
                    ? "border-app-accent/30 bg-app-accent-soft/30 text-app-accent"
                    : "border-app-line bg-app-surface text-app-ink-soft",
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  {isStrong ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="h-4 w-4 shrink-0 text-app-ink-muted" aria-hidden="true" />
                  )}
                  <span>{entry.label}</span>
                </div>
                <p className="mt-2.5 font-medium text-app-ink/90">{entry.body}</p>
              </div>
            );
          })}
        </div>

        {variant === "lead_indicator" ? (
          <div
            data-testid="goal-archetype-week1-starter"
            className="rounded-[14px] border border-app-line bg-app-surface/80 p-4 text-sm leading-relaxed text-app-ink-soft"
          >
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-app-accent">
              <Lightbulb className="h-3.5 w-3.5" />
              Việc bắt đầu cho tuần 1
            </p>
            <p className="mt-2 font-medium text-app-ink">{example.week1StarterTask}</p>
          </div>
        ) : null}
      </div>
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
