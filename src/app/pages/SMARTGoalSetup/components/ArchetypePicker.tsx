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
    <div className="rounded-[14px] border border-app-line bg-app-surface p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-app-line/40">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-app-accent">Chọn loại mục tiêu</p>
          <p className="text-[11px] text-app-ink-soft mt-0.5">
            Hệ thống tự động đoán loại để gợi ý chính xác hơn. Bạn có thể tự thay đổi nếu chưa đúng.
          </p>
        </div>
        {isUserOverridden ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-[10px] font-semibold text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 active:scale-[0.97] cursor-pointer"
            onClick={onResetToInferred}
            aria-label={`Quay lại đoán tự động (${getGoalArchetypeLabel(inferredArchetype)})`}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Dùng đoán tự động
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ARCHETYPE_ORDER.map((option) => {
          const Icon = option.icon;
          const active = archetype === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 cursor-pointer",
                active
                  ? "border-app-accent bg-app-accent-soft/30 text-app-accent shadow-sm"
                  : "border-app-line bg-app-bg text-app-ink-soft hover:border-app-accent/30 hover:bg-app-accent-soft/10 hover:text-app-accent",
              )}
              onClick={() => onChange(option.value)}
              aria-pressed={active}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 transition-colors duration-150",
                  active ? "text-app-accent" : "text-app-ink-muted group-hover:text-app-accent",
                )}
                aria-hidden="true"
              />
              <span className="leading-none">{getGoalArchetypeLabel(option.value)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
