/**
 * GoalEmptyState — Empty state cho Command Center
 *
 * Khi chưa có mục tiêu nào: illustration + copy ngắn + 2 CTAs.
 * Phù hợp với concept Command Center — inviting, action-oriented.
 */

import { Plus, Zap } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { MountainMoonIllustration } from "@/app/components/illustrations";

interface GoalEmptyStateProps {
  onStartGuidedGoalFlow: () => void;
  onStartDirectGoalFlow: () => void;
}

export function GoalEmptyState({
  onStartGuidedGoalFlow,
  onStartDirectGoalFlow,
}: GoalEmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-14 sm:py-20">
      {/* Illustration — larger */}
      <div className="w-full max-w-[260px] mb-10 text-app-ink-muted opacity-80">
        <MountainMoonIllustration className="w-full" />
      </div>

      {/* Content */}
      <div className="space-y-3 mb-10 max-w-sm">
        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-app-ink">
          Hành trình của bạn bắt đầu từ đây
        </h3>
        <p className="text-base text-app-ink-soft leading-relaxed">
          Chưa có mục tiêu nào. Hãy bắt đầu chu kỳ 12 tuần đầu tiên để biến ước mơ thành hành động cụ thể.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="bg-app-accent text-white hover:bg-app-accent-hover font-bold shadow-app-sm px-5 py-2.5 rounded-full text-sm"
          onClick={onStartGuidedGoalFlow}
        >
          <Zap className="h-4 w-4 mr-1.5" />
          Bắt đầu chu kỳ 12 tuần
        </Button>
        <Button
          variant="outline"
          className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg font-bold px-5 py-2.5 rounded-full text-sm"
          onClick={onStartDirectGoalFlow}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Tạo mục tiêu thường
        </Button>
      </div>
    </div>
  );
}