import { useState, type Dispatch, type SetStateAction } from "react";

import type { GoalArchetype } from "@/lib/smart-goal";

import { GoalArchetypeExamples } from "../../../components/GoalArchetypeExamples";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { ArchetypePicker } from "./ArchetypePicker";
import { errorTextClass, helperTextClass, labelClass, requiredMarkerClass, textareaClass } from "./formStyles";

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
  const [hasBlurredGoalStatement, setHasBlurredGoalStatement] = useState(false);
  const specificLength = smartData.specific.goal_statement.trim().length;
  const activeArchetype = archetype ?? intentArchetype ?? "other";
  const goalStatementInvalid = specificLength < 10;
  const showInlineError = goalStatementInvalid && (hasBlurredGoalStatement || showError);
  const specificDescribedBy = ["smart-specific-hint", "smart-specific-counter", showInlineError ? "smart-specific-error" : null]
    .filter(Boolean)
    .join(" ");
  const activeInferredArchetype = inferredArchetype ?? activeArchetype;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="smart-specific" className={labelClass}>
          Câu trả lời của bạn
          <span className={requiredMarkerClass} aria-hidden="true">*</span>
          <span className="sr-only"> bắt buộc</span>
        </label>
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
          onBlur={() => setHasBlurredGoalStatement(true)}
          className={`${textareaClass} min-h-[180px]`}
          aria-invalid={showInlineError}
          aria-describedby={specificDescribedBy}
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p id="smart-specific-hint" className={helperTextClass}>
            Viết kết quả cụ thể mà bạn có thể nhìn thấy hoặc kiểm chứng.
          </p>
          <p id="smart-specific-counter" className={helperTextClass}>
            {specificLength}/10 ký tự tối thiểu
          </p>
        </div>
        {showInlineError ? (
          <p id="smart-specific-error" className={errorTextClass} role="alert">
            Mục tiêu cụ thể cần ít nhất 10 ký tự có nghĩa.
          </p>
        ) : null}
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
