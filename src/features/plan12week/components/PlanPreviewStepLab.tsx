import { CalendarDays, CheckCircle2, ChevronDown, Flag, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDateInputValue } from "@/app/utils/storage-date-utils";
import { getArchetypeForIntent, getUserIntentId, hasActionableArchetypeHint } from "@/app/utils/user-intent";
import { buildLeadIndicatorSchedules } from "@/features/plan12week/pages/12WeekSetup/helpers";
import type { PendingFeasibilityResult, TwelveWeekSetupDraft } from "@/features/plan12week/pages/12WeekSetup/types";
import type { GoalArchetype, PendingSMARTGoal } from "@/lib/smart-goal";
import { isLowFeasibility } from "../logic/generatePlan";
import { getArchetypeFirstAction, getArchetypePlanFullDefaults } from "../logic/planArchetypeDefaults";
import { PlanPreviewLab } from "./PlanPreviewLab";

interface PlanPreviewStepLabProps {
  draft: TwelveWeekSetupDraft;
  smartGoal: PendingSMARTGoal;
  feasibility: PendingFeasibilityResult;
  focusArea: string;
  selectedTemplate: { id: string; name: string } | null;
}

export function PlanPreviewStepLab({
  draft,
  smartGoal: _smartGoal,
  feasibility: _feasibility,
  focusArea: _focusArea,
  selectedTemplate: _selectedTemplate,
}: PlanPreviewStepLabProps) {
  const [showFullRoadmap, setShowFullRoadmap] = useState(false);
  const archetype = useMemo((): GoalArchetype | null => {
    const intent = getUserIntentId();
    if (!intent || !hasActionableArchetypeHint(intent)) return null;
    return getArchetypeForIntent(intent);
  }, []);

  const previewPlan = useMemo(() => {
    const lowFeasibility = isLowFeasibility({
      planLoad: draft.tacticLoadPreference,
      weeklyCapacity: "medium",
      bottleneckAxis: _feasibility?.bottleneck?.axis,
    });

    const defaults = archetype ? getArchetypePlanFullDefaults(archetype) : null;
    const firstAction = archetype ? getArchetypeFirstAction(archetype, { lowFeasibility }) : null;

    const leadMetrics = draft.leadIndicators
      .filter((indicator) => indicator.name.trim() !== "")
      .map((indicator) => ({
        name: indicator.name,
        weeklyTarget: parseInt(indicator.target, 10) || 1,
      }));

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const planLoadOptions = {
      tacticLoadPreference: draft.tacticLoadPreference,
      dailyTimeBudget: draft.dailyTimeBudget,
      preferredDays: draft.preferredDays,
    };
    const scheduledIndicators = buildLeadIndicatorSchedules(draft.leadIndicators, planLoadOptions);

    const weekOneTasks: Array<{ id: string; title: string; scheduledDate: string; isCore: boolean }> = [];
    scheduledIndicators.forEach((indicator) => {
      indicator.schedule.forEach((dayOffset, taskIndex) => {
        const taskDate = new Date(weekStart);
        taskDate.setDate(weekStart.getDate() + dayOffset);
        const title = `${indicator.name} #${taskIndex + 1}`;
        weekOneTasks.push({
          id: `task_${indicator.id}_${dayOffset}_${taskIndex}`,
          title,
          scheduledDate: formatDateInputValue(taskDate),
          isCore: indicator.type === "core",
        });
      });
    });

    weekOneTasks.sort((a, b) => {
      if (a.isCore && !b.isCore) return -1;
      if (!a.isCore && b.isCore) return 1;
      return a.scheduledDate.localeCompare(b.scheduledDate);
    });

    const weeks = Array.from({ length: 12 }, (_, i) => {
      const weekNumber = i + 1;
      let focus = "";
      let expectedOutput = "";

      if (weekNumber === 1) {
        focus = defaults?.weekOneFocus || "Giữ nhịp vừa sức và hoàn thành việc đầu tiên.";
        expectedOutput = defaults
          ? `${defaults.weekOneExpectedOutput}\n\nViệc đầu tiên: ${firstAction}`
          : draft.week12Outcome;
      } else if (weekNumber === 4) {
        expectedOutput = defaults?.milestoneTemplates.week4 || draft.week4Milestone;
      } else if (weekNumber === 8) {
        expectedOutput = defaults?.milestoneTemplates.week8 || draft.week8Milestone;
      } else if (weekNumber === 12) {
        expectedOutput = defaults?.milestoneTemplates.week12 || draft.week12Outcome;
      }

      return {
        weekNumber,
        focus,
        expectedOutput,
        leadMetrics,
        tasks: weekNumber === 1 ? weekOneTasks : [],
      };
    });

    return {
      vision: draft.vision12Week,
      weeks,
    };
  }, [
    draft.vision12Week,
    draft.week4Milestone,
    draft.week8Milestone,
    draft.week12Outcome,
    draft.leadIndicators,
    draft.preferredDays,
    draft.dailyTimeBudget,
    draft.tacticLoadPreference,
    archetype,
    _feasibility,
  ]);

  const firstTwoTasks = useMemo(() => {
    return draft.leadIndicators.filter((ind) => ind.name.trim().length > 0).slice(0, 2);
  }, [draft.leadIndicators]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <section className="rounded-[1.75rem] border border-app-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(175,124,65,0.16),transparent_45%),linear-gradient(135deg,var(--color-app-bg-subtle),var(--color-app-surface))] px-5 py-5 shadow-app-sm sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-accent">Sẵn sàng bắt đầu</p>
        <div className="mt-3 flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold leading-snug text-app-ink">Tuần đầu của bạn đã có nhịp.</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-app-ink-soft">
              Sau khi kích hoạt, bạn sẽ vào màn Hôm nay để bắt đầu việc đầu tiên.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-app-line bg-app-surface p-4 shadow-app-sm sm:p-5">
        <div className="flex gap-3">
          <Target className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-app-ink-muted">Đích đến tuần 12</p>
            <p className="mt-1.5 break-words font-serif text-lg font-semibold leading-snug text-app-ink">
              “{draft.week12Outcome || "Bạn sẽ tạo nên một kết quả đáng tự hào."}”
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-app-line bg-app-surface p-4 shadow-app-sm sm:p-5">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-app-ink-muted">Tuần 1 · Bước khởi động</p>
            <p className="mt-1.5 text-sm font-semibold leading-relaxed text-app-ink">{previewPlan.weeks[0]?.focus}</p>
            <div className="mt-3 space-y-2">
              {firstTwoTasks.length > 0 ? (
                firstTwoTasks.map((tactic) => (
                  <div key={tactic.id} className="flex items-center gap-2 text-sm text-app-ink-soft">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
                    <p className="break-words">{tactic.name}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-relaxed text-app-ink-soft">Các hành động lặp lại của bạn sẽ xuất hiện ở đây.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-app-line bg-app-surface shadow-app-sm">
        <button
          type="button"
          aria-expanded={showFullRoadmap}
          aria-controls="full-plan-roadmap"
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-bold text-app-ink transition-colors hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-inset sm:px-5"
          onClick={() => setShowFullRoadmap((current) => !current)}
        >
          <span className="flex items-center gap-2"><Flag className="h-4 w-4 text-app-accent" aria-hidden="true" />Xem toàn bộ lộ trình 12 tuần</span>
          <ChevronDown className={showFullRoadmap ? "h-4 w-4 shrink-0 rotate-180 transition-transform" : "h-4 w-4 shrink-0 transition-transform"} aria-hidden="true" />
        </button>
        {showFullRoadmap ? (
          <div id="full-plan-roadmap" className="border-t border-app-line px-4 py-4 sm:px-5">
            <PlanPreviewLab draft={draft} previewPlan={previewPlan} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
