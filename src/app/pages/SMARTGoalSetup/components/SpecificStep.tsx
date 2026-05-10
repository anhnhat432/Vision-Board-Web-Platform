import type { Dispatch, SetStateAction } from "react";

import type { GoalArchetype } from "@/lib/smart-goal";

import { GoalArchetypeExamples } from "../../../components/GoalArchetypeExamples";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { ArchetypePicker } from "./ArchetypePicker";

interface SpecificStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  placeholder: string;
  showError: boolean;
  archetype?: GoalArchetype;
  inferredArchetype?: GoalArchetype;
  isArchetypeOverridden?: boolean;
  onArchetypeChange?: (archetype: GoalArchetype) => void;
  onArchetypeResetToInferred?: () => void;
  /**
   * Optional archetype derived from the user's onboarding intent. When set
   * to a concrete archetype, the step renders a small collapsible "weak vs
   * stronger goal" example panel under the input. Renders nothing for null,
   * undefined, or `"other"`.
   */
  intentArchetype?: GoalArchetype | null;
}

export function SpecificStep({
  smartData,
  setSmartData,
  placeholder,
  showError,
  archetype,
  inferredArchetype,
  isArchetypeOverridden,
  onArchetypeChange,
  onArchetypeResetToInferred,
  intentArchetype,
}: SpecificStepProps) {
  const specificLength = smartData.specific.goal_statement.trim().length;
  const activeArchetype = archetype ?? intentArchetype ?? "other";
  const activeInferredArchetype = inferredArchetype ?? activeArchetype;

  return (
    <div className="stack-stack">
      <div className="stack-tight relative overflow-hidden rounded-[var(--r-card)] border border-violet-200 bg-white/86 p-4 shadow-sm before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-violet-600 before:to-fuchsia-600 dark:border-violet-500/30 dark:bg-slate-950/55">
        <Label htmlFor="smart-specific" className="text-base">
          Câu trả lời của bạn
        </Label>
        <Textarea
          id="smart-specific"
          placeholder={placeholder}
          value={smartData.specific.goal_statement}
          onChange={(event) =>
            setSmartData((previous) => ({
              ...previous,
              specific: {
                goal_statement: event.target.value,
              },
            }))
          }
          className="min-h-[180px] resize-none text-base leading-7"
          aria-invalid={showError}
          aria-describedby="smart-specific-hint smart-specific-counter"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <p id="smart-specific-hint">Viết kết quả cụ thể mà bạn có thể nhìn thấy hoặc kiểm chứng.</p>
          <p id="smart-specific-counter">{specificLength}/10 ký tự tối thiểu</p>
        </div>
      </div>

      <ArchetypePicker
        archetype={activeArchetype}
        inferredArchetype={activeInferredArchetype}
        isUserOverridden={Boolean(isArchetypeOverridden)}
        onChange={onArchetypeChange ?? (() => {})}
        onResetToInferred={onArchetypeResetToInferred ?? (() => {})}
      />

      <ArchetypeHint archetype={activeArchetype} variant="antiPattern" showArchetypeTag={false} />
      <GoalArchetypeExamples archetype={intentArchetype} variant="goal" />
    </div>
  );
}
