/**
 * MissionBoard — Layout cho goal list
 *
 * Bố cục dạng "mission board" với các goal cards được hiển thị
 * theo dạng lưới. 12-week goals được ưu tiên hiển thị trước.
 *
 * Concept: Studio Desk / Mission Board
 */

import type { Goal, PricingPlanCode } from "@/app/utils/storage";
import { MissionCard } from "./MissionCard";

interface MissionBoardProps {
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

export function MissionBoard({
  twelveWeekGoals,
  simpleGoals,
  goalsWithMetadata,
  currentPlanCode,
  handleToggleTask,
  openTwelveWeekCenter,
  setGoalToDelete,
}: MissionBoardProps) {
  return (
    <div className="space-y-8">
      {/* 12-week goals section */}
      {twelveWeekGoals.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold tracking-normal text-app-ink">
                Mục tiêu đang chạy
              </h2>
              <p className="mt-0.5 text-xs text-app-ink-muted">
                {twelveWeekGoals.length} chu kỳ 12 tuần
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {twelveWeekGoals.map((goal) => {
              const meta = goalsWithMetadata.get(goal.id);
              return (
                <MissionCard
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
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold tracking-normal text-app-ink">
                Mục tiêu thường
              </h2>
              <p className="mt-0.5 text-xs text-app-ink-muted">
                {simpleGoals.length} mục tiêu
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {simpleGoals.map((goal) => {
              const meta = goalsWithMetadata.get(goal.id);
              return (
                <MissionCard
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