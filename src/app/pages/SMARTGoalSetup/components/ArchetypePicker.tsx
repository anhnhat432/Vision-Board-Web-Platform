import { Lightbulb, RotateCcw, type LucideIcon } from "lucide-react";

import { type GoalArchetype, getGoalArchetypeLabel } from "@/lib/smart-goal/goalArchetypes";

const ARCHETYPE_ORDER: Array<{ value: GoalArchetype; icon: LucideIcon; sub: string }> = [
  { value: "skill_learning", icon: Lightbulb, sub: "Học kỹ năng" },
  { value: "health_fitness", icon: Lightbulb, sub: "Sức khỏe" },
  { value: "career_growth", icon: Lightbulb, sub: "Sự nghiệp" },
  { value: "financial_goal", icon: Lightbulb, sub: "Tài chính" },
  { value: "exam_study", icon: Lightbulb, sub: "Thi cử" },
  { value: "project_completion", icon: Lightbulb, sub: "Dự án" },
  { value: "habit_building", icon: Lightbulb, sub: "Thói quen" },
  { value: "creative_output", icon: Lightbulb, sub: "Sáng tạo" },
  { value: "relationship_life", icon: Lightbulb, sub: "Kết nối" },
  { value: "other", icon: Lightbulb, sub: "Khác" },
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
    <div className="surface-raised rounded-xl border border-app-line bg-app-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-app-ink-muted">Chọn loại mục tiêu</p>
          <p className="text-xs leading-5 text-app-ink-muted">
            Mình đoán loại để gợi ý đúng hơn. Nếu sai, đổi tay.
          </p>
        </div>
        {isUserOverridden ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-medium text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onClick={onResetToInferred}
            aria-label={`Quay lại đoán tự động (${getGoalArchetypeLabel(inferredArchetype)})`}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Dùng đoán tự động
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ARCHETYPE_ORDER.map((option) => {
          const Icon = option.icon;
          const active = archetype === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={
                active
                  ? "flex flex-col items-start gap-1 rounded-lg border border-app-accent bg-app-accent-soft p-3 text-left text-app-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                  : "flex flex-col items-start gap-1 rounded-lg border border-app-line bg-app-surface p-3 text-left text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              }
              onClick={() => onChange(option.value)}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium leading-5">{getGoalArchetypeLabel(option.value)}</span>
              <span className={active ? "text-xs text-app-accent/80" : "text-xs text-app-ink-muted"}>
                {option.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
