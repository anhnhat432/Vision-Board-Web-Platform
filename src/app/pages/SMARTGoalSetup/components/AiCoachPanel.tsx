import { Check, ChevronDown, Lightbulb } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/app/components/ui/utils";
import type { GoalArchetype } from "@/lib/smart-goal";
import type { SmartGoalStarter } from "../../../utils/smart-goal-starters";
import type { SMARTData, SmartStepDefinition } from "../types";
import { getPersonaData, type PersonaTone } from "./persona-data";

interface AiCoachPanelProps {
  step: SmartStepDefinition;
  archetype: GoalArchetype;
  smartGoalStarter: SmartGoalStarter;
  smartData: SMARTData;
  onApplyStarter: (transformedText?: string) => void;
}

const TONE_LABELS: Record<PersonaTone, string> = {
  empathetic: "Ấm áp",
  pragmatic: "Thực tế",
  strategic: "Chiến lược",
};

export function AiCoachPanel({
  step,
  archetype,
  smartGoalStarter,
  onApplyStarter,
}: AiCoachPanelProps) {
  const [isAiCoachExpanded, setIsAiCoachExpanded] = useState(false);
  const [selectedTone, setSelectedTone] = useState<PersonaTone>("empathetic");

  const { coachComment, goalDraft, coreTextToApply } = getPersonaData(
    step.key,
    selectedTone,
    {
      specificGoalStatement: smartGoalStarter.specificGoalStatement,
      metricName: smartGoalStarter.metricName,
      baselineValue: smartGoalStarter.baselineValue,
      targetValue: smartGoalStarter.targetValue,
      weeklyHours: smartGoalStarter.weeklyHours,
      motivationReason: smartGoalStarter.motivationReason,
      targetWeeks: smartGoalStarter.targetWeeks,
    },
    archetype,
  );

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-app-line bg-app-surface/70">
      <button
        type="button"
        onClick={() => setIsAiCoachExpanded(!isAiCoachExpanded)}
        aria-expanded={isAiCoachExpanded}
        aria-controls="smart-ai-coach-panel"
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-app-bg-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-3.5 w-3.5 text-app-ink-muted" aria-hidden="true" />
          <span className="text-[12px] font-bold text-app-ink-soft">
            Mở gợi ý thêm: {TONE_LABELS[selectedTone]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] text-app-ink-muted sm:inline">
            {isAiCoachExpanded ? "Thu gọn" : "Xem gợi ý"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-app-ink-muted transition-transform duration-200",
              isAiCoachExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isAiCoachExpanded && (
          <motion.div
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            id="smart-ai-coach-panel"
            className="space-y-3 overflow-hidden px-3.5 pb-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-line/50 pb-2.5">
              <span className="text-[11px] font-semibold text-app-ink-soft">Cách viết:</span>
              <div className="flex items-center gap-1.5">
                {(["empathetic", "pragmatic", "strategic"] as const).map((tone, idx) => {
                  const isActive = selectedTone === tone;
                  return (
                    <span key={tone} className="flex items-center">
                      {idx > 0 && <span className="mr-1.5 text-app-ink-muted">|</span>}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTone(tone);
                        }}
                        className={cn(
                          "min-h-8 font-bold transition-all duration-150 hover:text-app-accent dark:text-app-accent cursor-pointer text-[11px] py-1 px-2 leading-tight focus-visible:ring-1 focus-visible:ring-app-accent/50 focus-visible:outline-none focus-visible:rounded-sm",
                          isActive
                            ? "text-app-accent dark:text-app-accent underline decoration-2 underline-offset-2"
                            : "text-app-ink-muted"
                        )}
                      >
                        {TONE_LABELS[tone]}
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="max-w-[62ch] break-words text-[12.5px] italic leading-relaxed text-app-ink-soft">
                {coachComment}
              </p>

              {goalDraft && (
                <div className="relative rounded-[13px] border border-app-line bg-app-surface px-3.5 py-2.5 shadow-none">
                  <p className="mb-1 text-[11px] font-extrabold text-app-accent">
                    Câu có thể chỉnh
                  </p>
                  <p className="max-w-[58ch] break-words text-[12.5px] italic leading-relaxed text-app-ink-soft select-text">
                    &ldquo;{goalDraft}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyStarter(coreTextToApply);
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-app-accent/20 bg-app-bg-subtle px-3.5 py-1.5 text-[12px] font-bold leading-tight text-app-accent transition-all duration-150 active:scale-[0.98] cursor-pointer hover:bg-app-line/30 focus-visible:ring-2 focus-visible:ring-app-accent/50 focus-visible:outline-none dark:bg-app-bg-subtle/60 dark:text-app-accent"
                aria-label={`Dùng gợi ý cho bước ${step.label}`}
              >
                <Check className="h-3 w-3" aria-hidden="true" />
                Dùng câu này
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
