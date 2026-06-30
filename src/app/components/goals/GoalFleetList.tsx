/**
 * GoalFleetList — Compact fleet list cho Command Center
 *
 * Thay thế MissionBoard grid bằng list dọc compact.
 * 12-week goals hiển thị trước, simple goals sau.
 * Mỗi section có header riêng.
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
  return (
    <div className="space-y-6">
      {/* 12-week goals section */}
      {twelveWeekGoals.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <div>
              <h2 className="text-sm font-bold tracking-normal text-app-ink">
                Chu kỳ 12 tuần
              </h2>
              <p className="mt-0.5 text-[11px] text-app-ink-muted">
                {twelveWeekGoals.length} mục tiêu đang chạy
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {twelveWeekGoals.map((goal) => {
              const meta = goalsWithMetadata.get(goal.id);
              return (
                <GoalFleetItem
                  key={goal.id}
                  goal={goal}
                  currentPlanCode={currentPlanCode}
                  progress={meta?.progress ?? 0}
                  isOverdue={meta?.isOverdue ?? false}
                  isNearDeadline={meta?.isNearDeadline ?? false}
                  handleToggleTask={handleToggleTask}
                  openTwelveWeekCenter={openTwelveWeekCenter}
                  setGoalToDelete={setGoalToDelete}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Simple goals section */}
      {simpleGoals.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <div>
              <h2 className="text-sm font-bold tracking-normal text-app-ink">
                Mục tiêu thường
              </h2>
              <p className="mt-0.5 text-[11px] text-app-ink-muted">
                {simpleGoals.length} mục tiêu
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {simpleGoals.map((goal) => {
              const meta = goalsWithMetadata.get(goal.id);
              return (
                <GoalFleetItem
                  key={goal.id}
                  goal={goal}
                  currentPlanCode={currentPlanCode}
                  progress={meta?.progress ?? 0}
                  isOverdue={meta?.isOverdue ?? false}
                  isNearDeadline={meta?.isNearDeadline ?? false}
                  handleToggleTask={handleToggleTask}
                  openTwelveWeekCenter={openTwelveWeekCenter}
                  setGoalToDelete={setGoalToDelete}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}