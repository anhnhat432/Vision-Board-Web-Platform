import type { ExecutionInsight, WeeklyReviewEvidence } from "@/features/plan12week/logic";
import { WeeklyEvidenceInsights } from "./WeeklyEvidenceInsights";
import { WeeklyEvidenceSummary } from "./WeeklyEvidenceSummary";

interface WeeklyReviewEvidencePanelProps {
  evidence: WeeklyReviewEvidence;
  insights: ReadonlyArray<ExecutionInsight>;
  formatCalendarDate: (value: string) => string;
}

export function WeeklyReviewEvidencePanel({
  evidence,
  insights,
  formatCalendarDate,
}: WeeklyReviewEvidencePanelProps) {
  return (
    <section
      data-testid="weekly-evidence-panel"
      aria-label={`Bằng chứng tuần ${evidence.weekNumber}`}
      className="min-w-0 overflow-hidden rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface shadow-[var(--app-shadow-card)]"
    >
      <WeeklyEvidenceSummary evidence={evidence} formatCalendarDate={formatCalendarDate} />
      {!evidence.completion.isEmpty && <WeeklyEvidenceInsights insights={insights} />}
    </section>
  );
}
