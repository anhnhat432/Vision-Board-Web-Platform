import {
  GraduationCap,
  Dumbbell,
  TrendingUp,
  PiggyBank,
  Award,
  CheckSquare,
  Activity,
  Palette,
  Users,
  Sparkles,
  RotateCcw,
  type LucideIcon,
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
    <div className="surface-raised rounded-xl border border-app-line bg-app-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-app-ink-muted">Chọn loại mục tiêu</p>
          <p className="text-xs leading-5 text-app-ink-soft">
            Hệ thống đoán loại để gợi ý chính xác hơn. Bạn có thể tự thay đổi nếu chưa đúng.
          </p>
        </div>
        {isUserOverridden ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-semibold text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onClick={onResetToInferred}
            aria-label={`Quay lại đoán tự động (${getGoalArchetypeLabel(inferredArchetype)})`}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Dùng đoán tự động
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {ARCHETYPE_ORDER.map((option) => {
          const Icon = option.icon;
          const active = archetype === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "group flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30",
                active
                  ? "border-app-accent bg-gradient-to-br from-app-accent-soft/40 to-app-accent-soft/10 text-app-accent shadow-sm font-semibold"
                  : "border-app-line bg-app-surface text-app-ink hover:border-app-accent/30 hover:bg-app-accent-soft/5 hover:text-app-accent"
              )}
              onClick={() => onChange(option.value)}
              aria-pressed={active}
            >
              <Icon className={cn(
                "h-4.5 w-4.5 transition-colors duration-200",
                active ? "text-app-accent" : "text-app-ink-muted group-hover:text-app-accent"
              )} aria-hidden="true" />
              <span className="text-sm font-semibold leading-5">{getGoalArchetypeLabel(option.value)}</span>
              <span className={cn(
                "text-xs leading-normal transition-colors duration-200",
                active ? "text-app-accent/80" : "text-app-ink-muted group-hover:text-app-accent/70"
              )}>
                {option.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
