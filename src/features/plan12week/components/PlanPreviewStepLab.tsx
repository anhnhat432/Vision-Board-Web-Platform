import { useMemo } from "react";
import { formatDateInputValue } from "@/app/utils/storage-date-utils";
import { getUserIntentId, getArchetypeForIntent, hasActionableArchetypeHint } from "@/app/utils/user-intent";
import { isLowFeasibility } from "../logic/generatePlan";
import { getArchetypePlanFullDefaults, getArchetypeFirstAction } from "../logic/planArchetypeDefaults";
import { buildLeadIndicatorSchedules } from "@/app/pages/12WeekSetup/helpers";
import { PlanPreviewLab } from "./PlanPreviewLab";
import type { TwelveWeekSetupDraft } from "@/app/pages/12WeekSetup/types";
import type { GoalArchetype } from "@/lib/smart-goal";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import type { PendingFeasibilityResult } from "@/app/pages/12WeekSetup/types";

interface PlanPreviewStepLabProps {
  draft: TwelveWeekSetupDraft;
  smartGoal: PendingSMARTGoal;
  feasibility: PendingFeasibilityResult;
  focusArea: string;
  selectedTemplate: { id: string; name: string } | null;
  onBack?: () => void;
  onSubmit?: () => void;
  onChange?: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
  validationMessage?: string | null;
  canConfirm?: boolean;
}

export function PlanPreviewStepLab({
  draft,
  smartGoal: _smartGoal,
  feasibility: _feasibility,
  focusArea: _focusArea,
  selectedTemplate: _selectedTemplate,
  onBack: _onBack,
  onSubmit: _onSubmit,
  onChange: _onChange,
  validationMessage,
  canConfirm = true,
}: PlanPreviewStepLabProps) {

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
          id: `task_${indicator.id}_${Date.now()}_${dayOffset}`,
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
        focus = defaults?.weekOneFocus || "";
        expectedOutput = defaults ? `${defaults.weekOneExpectedOutput}\n\nViệc đầu tiên: ${firstAction}` : "";
      } else if (weekNumber === 4) {
        expectedOutput = defaults?.milestoneTemplates.week4 || "";
      } else if (weekNumber === 8) {
        expectedOutput = defaults?.milestoneTemplates.week8 || "";
      } else if (weekNumber === 12) {
        expectedOutput = defaults?.milestoneTemplates.week12 || "";
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
    draft.leadIndicators,
    draft.preferredDays,
    draft.dailyTimeBudget,
    draft.tacticLoadPreference,
    archetype,
    _feasibility,
  ]);

  return (
    <div className="space-y-3">
      <PlanPreviewLab draft={draft} previewPlan={previewPlan} />
      {validationMessage ? (
        <p role="alert" className="rounded-[var(--r-control)] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {validationMessage}
        </p>
      ) : null}
      {!canConfirm && !validationMessage ? (
        <p className="rounded-[var(--r-control)] border border-app-line bg-app-bg px-3 py-2 text-sm text-app-ink-soft">
          Kiểm tra lại các bước trước khi lưu kế hoạch.
        </p>
      ) : null}
    </div>
  );
}
