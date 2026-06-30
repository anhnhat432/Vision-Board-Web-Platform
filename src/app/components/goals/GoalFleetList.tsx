/**
 * GoalFleetList — Grid layout cho Command Center Studio
 *
 * 2-column grid desktop, 1 column mobile.
 * Gộp 12-week và simple goals, sắp xếp theo urgency.
 */

import type { Goal, PricingPlanCode } from "@/app/utils/storage";
import { GoalFleetItem } from "./GoalFleetItem";

interface GoalFleetListProps {
  twelveWeekGoals: Goal[];
  simpleGoals: Goal[];
  goalsWithMetadata: Map<
    string,
    {
      progress: number;
      isOverdue: boolean;
      isNearDeadline: boolean;
    }
  >;
  currentPlanCode: PricingPlanCode;
  handleToggleTask: (goalId: string, taskId: string) => void;
  openTwelveWeekCenter: (goalId: string) => void;
  setGoalToDelete: (goalId: string) => void;
}

export function GoalFleetList({
  twelveWeekGoals,
  simpleGoals,
  goalsWithMetadata,
  currentPlanCode,
  handleToggleTask,
  openTwelveWeekCenter,
  setGoalToDelete,
}: GoalFleetListProps) {
  // Combine all goals for unified grid
  const allGoals = [...twelveWeekGoals, ...simpleGoals];

  if (allGoals.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-app-ink">
            Tất cả mục tiêu
          </h2>
          <p className="mt-0.5 text-[11px] text-app-ink-muted">
            {allGoals.length} mục tiêu · {twelveWeekGoals.length} chu kỳ 12 tuần
          </p>
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {allGoals.map((goal, index) => {
          const meta = goalsWithMetadata.get(goal.id);
          return (
            <div
              key={goal.id}
              className="gt-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <GoalFleetItem
                goal={goal}
                currentPlanCode={currentPlanCode}
                progress={meta?.progress ?? 0}
                isOverdue={meta?.isOverdue ?? false}
                isNearDeadline={meta?.isNearDeadline ?? false}
                handleToggleTask={handleToggleTask}
                openTwelveWeekCenter={openTwelveWeekCenter}
                setGoalToDelete={setGoalToDelete}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}