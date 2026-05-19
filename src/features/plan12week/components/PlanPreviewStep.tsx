import { useMemo, useState, useCallback } from "react";
import { formatDateInputValue } from "@/app/utils/storage-date-utils";
import { getUserIntentId, getArchetypeForIntent, hasActionableArchetypeHint } from "@/app/utils/user-intent";
import { isLowFeasibility } from "../logic/generatePlan";
import { getArchetypePlanFullDefaults, getArchetypeFirstAction } from "../logic/planArchetypeDefaults";
import { buildLeadIndicatorSchedules } from "@/app/pages/12WeekSetup/helpers";
import { PlanPreview } from "./PlanPreview";
import { TacticsEditor } from "./TacticsEditor";
import type { LeadIndicatorDraft, TwelveWeekSetupDraft } from "@/app/pages/12WeekSetup/types";
import type { GoalArchetype } from "@/lib/smart-goal";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import type { PendingFeasibilityResult } from "@/app/pages/12WeekSetup/types";

interface PlanPreviewStepProps {
  draft: TwelveWeekSetupDraft;
  smartGoal: PendingSMARTGoal;
  feasibility: PendingFeasibilityResult;
  focusArea: string;
  selectedTemplate: { id: string; name: string } | null;
  onBack: () => void;
  onSubmit: () => void;
  onChange: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
  validationMessage?: string | null;
  canConfirm?: boolean;
}

export function PlanPreviewStep({
  draft,
  smartGoal: _smartGoal,
  feasibility: _feasibility,
  focusArea: _focusArea,
  selectedTemplate: _selectedTemplate,
  onBack,
  onSubmit,
  onChange,
  validationMessage,
  canConfirm = true,
}: PlanPreviewStepProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [localDraft, setLocalDraft] = useState<TwelveWeekSetupDraft>(draft);

  // Determine archetype from user intent
  const archetype = useMemo((): GoalArchetype | null => {
    const intent = getUserIntentId();
    if (!intent || !hasActionableArchetypeHint(intent)) return null;
    return getArchetypeForIntent(intent);
  }, []);

  // Sync local draft when prop changes
  const effectiveDraft = localDraft;

  // Build preview plan directly from draft to reflect user edits
  const previewPlan = useMemo(() => {
    // Determine low feasibility for first action recommendation
    const lowFeasibility = isLowFeasibility({
      planLoad: draft.tacticLoadPreference,
      weeklyCapacity: "medium",
      bottleneckAxis: _feasibility?.bottleneck?.axis,
    });

    // Get archetype defaults for focus and milestones if available
    const defaults = archetype ? getArchetypePlanFullDefaults(archetype) : null;
    const firstAction = archetype ? getArchetypeFirstAction(archetype, { lowFeasibility }) : null;

    // Build leadMetrics from draft indicators
    const leadMetrics = draft.leadIndicators
      .filter((indicator) => indicator.name.trim() !== "")
      .map((indicator) => ({
        name: indicator.name,
        weeklyTarget: parseInt(indicator.target, 10) || 1,
      }));

    // Build week 1 tasks from draft indicators and preferred days
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const planLoadOptions = {
      tacticLoadPreference: draft.tacticLoadPreference,
      dailyTimeBudget: draft.dailyTimeBudget,
      preferredDays: draft.preferredDays,
    };
    const scheduledIndicators = buildLeadIndicatorSchedules(draft.leadIndicators, planLoadOptions);

    const weekOneTasks: Array<{ id: string; title: string; scheduledDate: string }> = [];
    scheduledIndicators.forEach((indicator) => {
      indicator.schedule.forEach((dayOffset) => {
        const taskDate = new Date(weekStart);
        taskDate.setDate(weekStart.getDate() + dayOffset);
        const title = indicator.type === "core" ? `[CỐT LỖI] ${indicator.name}` : indicator.name;
        weekOneTasks.push({
          id: `task_${indicator.id}_${Date.now()}_${dayOffset}`,
          title,
          scheduledDate: formatDateInputValue(taskDate),
        });
      });
    });

    // Sort: core tasks first, then by date
    weekOneTasks.sort((a, b) => {
      const aCore = a.title.startsWith("[CỐT LỖI]");
      const bCore = b.title.startsWith("[CỐT LỖI]");
      if (aCore && !bCore) return -1;
      if (!aCore && bCore) return 1;
      return a.scheduledDate.localeCompare(b.scheduledDate);
    });

    // Build 12 weeks array
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

  const handleEditTactics = useCallback(() => {
    setLocalDraft(draft);
    setIsEditorOpen(true);
  }, [draft]);

  const handleTacticsChange = useCallback((newIndicators: LeadIndicatorDraft[]) => {
    setLocalDraft((prev) => ({
      ...prev,
      leadIndicators: newIndicators,
    }));
    setIsEditorOpen(false);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setLocalDraft(draft); // reset
  }, [draft]);

  const handleConfirm = useCallback(() => {
    // Apply any pending changes
    if (localDraft !== draft) {
      onChange("leadIndicators", localDraft.leadIndicators);
    }
    onSubmit();
  }, [localDraft, draft, onChange, onSubmit]);

  return (
    <>
      <PlanPreview
        draft={effectiveDraft}
        previewPlan={previewPlan}
        onEditTactics={handleEditTactics}
        onConfirm={handleConfirm}
        onBack={onBack}
        validationMessage={validationMessage}
        canConfirm={canConfirm}
      />

      {isEditorOpen && (
        <TacticsEditor tactics={localDraft.leadIndicators} onChange={handleTacticsChange} onClose={handleCloseEditor} />
      )}
    </>
  );
}
