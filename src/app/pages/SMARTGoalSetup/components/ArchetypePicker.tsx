import {
  Activity,
  Award,
  CheckSquare,
  Dumbbell,
  GraduationCap,
  type LucideIcon,
  Palette,
  PiggyBank,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { type GoalArchetype, getGoalArchetypeLabel } from "@/lib/smart-goal/goalArchetypes";
import { cn } from "../../../components/ui/utils";

const ARCHETYPE_ORDER: Array<{ value: GoalArchetype; icon: LucideIcon; sub: string }> = [
  { value: "skill_learning", icon: GraduationCap, sub: "Học kỹ năng" },
  { value: "health_fitness", icon: Dumbbell, sub: "Sức khỏe" },
  { value: "career_growth", icon: TrendingUp, sub: "Sự nghiệp" },
  { value: "financial_goal", icon: PiggyBank, sub: "Tài chính" },
  { value: "exam_study", icon: Award, sub: "Thi cử" },
  { value: "project_completion", icon: CheckSquare, sub: "Dự án" },
  { value: "habit_building", icon: Activity, sub: "Thói quen" },
  { value: "creative_output", icon: Palette, sub: "Sáng tạo" },
  { value: "relationship_life", icon: Users, sub: "Kết nối" },
  { value: "other", icon: Sparkles, sub: "Khác" },
];

interface ArchetypePickerProps {
  archetype: GoalArchetype;
  inferredArchetype: GoalArchetype;
  isUserOverridden: boolean;
  onChange: (archetype: GoalArchetype) => void;
  onResetToInferred: () => void;
}

export function ArchetypePicker({
  archetype,
  inferredArchetype,
  isUserOverridden,
  onChange,
  onResetToInferred,
}: ArchetypePickerProps) {
  return (
    <div className="rounded-[14px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-white dark:bg-app-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(23,21,15,0.06)] dark:border-app-line">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#0C5E3A]">Chọn loại mục tiêu</p>
          <p className="text-[11.5px] text-[#5C574B] dark:text-app-ink-soft mt-1">
            Hệ thống tự động đoán loại để gợi ý chính xác hơn. Bạn có thể tự thay đổi nếu chưa đúng.
          </p>
        </div>
        {isUserOverridden ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(23,21,15,0.1)] dark:border-app-line bg-white dark:bg-app-surface px-3 py-1.5 text-[11px] font-semibold text-[#5C574B] dark:text-app-ink-soft transition-colors duration-150 hover:bg-[#FAF8F3] dark:hover:bg-app-bg-subtle hover:text-[#17150F] dark:hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 active:scale-[0.97] cursor-pointer"
            onClick={onResetToInferred}
            aria-label={`Quay lại đoán tự động (${getGoalArchetypeLabel(inferredArchetype)})`}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Dùng đoán tự động
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ARCHETYPE_ORDER.map((option) => {
          const Icon = option.icon;
          const active = archetype === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 cursor-pointer hover:-translate-y-0.5",
                active
                  ? "border-[#0C5E3A] bg-[#E4EEDF] text-[#0C5E3A] shadow-sm"
                  : "border-[rgba(23,21,15,0.12)] dark:border-app-line bg-white dark:bg-app-surface text-[#5C574B] dark:text-app-ink-soft hover:border-[rgba(12,94,58,0.35)] hover:bg-[#EDF7E0] hover:text-[#0C5E3A]",
              )}
              onClick={() => onChange(option.value)}
              aria-pressed={active}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 transition-colors duration-150",
                  active ? "text-[#0C5E3A]" : "text-[#A8A296] dark:text-app-ink-muted",
                )}
                aria-hidden="true"
              />
              <span>{getGoalArchetypeLabel(option.value)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
