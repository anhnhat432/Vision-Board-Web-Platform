import { useMemo, type ComponentProps } from "react";

import { TwelveWeekProgressTab } from "@/app/components/twelve-week/TwelveWeekProgressTab";

import { generateAdaptiveSuggestion } from "../logic/adaptivePlanning";
import { analyzeExecutionPatterns } from "../logic/behaviorInsights";
import { calculatePlanInsights } from "../logic/planInsights";
import type { LeadMetric, Plan12Week, Task, Week } from "../types/planTypes";
import { ExecutionInsights } from "./ExecutionInsights";
import { ExecutionFeedback } from "./ExecutionFeedback";
import { PlanProgress } from "./PlanProgress";

export type PlanOverviewProps = ComponentProps<typeof TwelveWeekProgressTab>;

function parseWeeklyTarget(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function toPlanWeek(
  props: PlanOverviewProps,
  weekNumber: number,
): Week {
  const weekPlan = props.system.weeklyPlans.find((item) => item.weekNumber === weekNumber);
  const weekTasks = props.system.taskInstances.filter((task) => task.weekNumber === weekNumber);
  const weekReview = props.system.weeklyReviews.find((review) => review.weekNumber === weekNumber);
  const weekScoreboard = props.system.scoreboard.find((item) => item.weekNumber === weekNumber);

  const tasks: Task[] = weekTasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.completed ? "done" : "todo",
    scheduledDate: task.scheduledDate,
  }));

  const leadMetrics: LeadMetric[] = props.system.leadIndicators.map((indicator) => ({
    name: indicator.name,
    weeklyTarget: parseWeeklyTarget(indicator.target),
    logs: weekTasks
      .filter((task) => task.leadIndicatorName === indicator.name)
      .map((task) => ({
        date: task.scheduledDate,
        value: task.completed ? 1 : 0,
        completed: task.completed,
      })),
  }));

  return {
    weekNumber,
    focus: weekPlan?.focus ?? "",
    expectedOutput: weekPlan?.milestone ?? "",
    tasks,
    leadMetrics,
    review: weekReview
      ? {
          weekNumber,
          executionScore: weekScoreboard?.weeklyScore ?? 0,
          reflection: weekReview.biggestOutputThisWeek || undefined,
          adjustments: weekReview.nextWeekPriority || undefined,
        }
      : undefined,
  };
}

function adaptToPlanModel(props: PlanOverviewProps): Plan12Week {
  return {
    id: props.system.templateId ?? "plan_12week_overview",
    vision: props.system.vision12Week,
    smartGoalId: props.system.templateId ?? "smart_goal_unknown",
    startDate: props.system.startDate,
    weeks: Array.from({ length: props.system.totalWeeks }, (_, index) =>
      toPlanWeek(props, index + 1),
    ),
  };
}

export function PlanOverview(props: PlanOverviewProps) {
  const planModel = useMemo(() => adaptToPlanModel(props), [props]);
  const behaviorInsights = useMemo(
    () => analyzeExecutionPatterns(planModel),
    [planModel],
  );
  const planInsights = useMemo(() => calculatePlanInsights(planModel), [planModel]);

  const weeks = props.system.scoreboard.map((week) => ({
    weekNumber: week.weekNumber,
    executionScore: week.weeklyScore,
    completed: week.reviewDone,
  }));

  const currentWeekTaskCount =
    planModel.weeks.find((week) => week.weekNumber === props.currentWeek)?.tasks.length ?? 0;
  const adaptiveSuggestion = generateAdaptiveSuggestion(
    props.currentWeekScoreValue,
    currentWeekTaskCount,
  );

  return (
    <div className="space-y-6">
      <PlanProgress weeks={weeks} totalWeeks={12} />
      <ExecutionInsights
        averageExecutionScore={behaviorInsights.averageExecutionScore}
        longestStreak={behaviorInsights.longestMetricStreak}
        bestPerformingWeek={planInsights.bestWeek}
        adaptiveSuggestion={adaptiveSuggestion}
      />
      <ExecutionFeedback score={props.currentWeekScoreValue} />
      <TwelveWeekProgressTab {...props} />
    </div>
  );
}
