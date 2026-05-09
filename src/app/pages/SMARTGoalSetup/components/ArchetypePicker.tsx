import { Wand2 } from "lucide-react";

import {
  type GoalArchetype,
  getGoalArchetypeLabel,
} from "@/lib/smart-goal/goalArchetypes";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

const ARCHETYPE_ORDER: GoalArchetype[] = [
  "skill_learning",
  "health_fitness",
  "career_growth",
  "financial_goal",
  "exam_study",
  "project_completion",
  "habit_building",
  "creative_output",
  "relationship_life",
  "other",
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
    <div className="rounded-[var(--r-card)] border border-slate-200 bg-white/85 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Label htmlFor="smart-archetype-select" className="text-sm font-semibold text-slate-900">
            Loại mục tiêu
          </Label>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Mình đoán loại để gợi ý đúng hơn. Nếu sai, đổi tay — gợi ý sẽ cập nhật theo.
          </p>
        </div>
        {isUserOverridden && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-xs text-slate-500 hover:text-slate-900"
            onClick={onResetToInferred}
            aria-label={`Quay lại đoán tự động (${getGoalArchetypeLabel(inferredArchetype)})`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Dùng đoán tự động
          </Button>
        )}
      </div>
      <div className="mt-[var(--space-inline)]">
        <Select value={archetype} onValueChange={(value) => onChange(value as GoalArchetype)}>
          <SelectTrigger
            id="smart-archetype-select"
            aria-label="Chọn loại mục tiêu"
            className="w-full"
          >
            <SelectValue placeholder="Chọn loại mục tiêu" />
          </SelectTrigger>
          <SelectContent>
            {ARCHETYPE_ORDER.map((option) => (
              <SelectItem key={option} value={option}>
                {getGoalArchetypeLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
