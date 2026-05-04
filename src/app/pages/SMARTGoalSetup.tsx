import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";

import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { Card, CardContent } from "../components/ui/card";
import { trackAnalyticsEvent } from "../utils/analytics";
import { getScoredLifeArea, hasRealLifeBalance } from "../utils/core-flow-guard";
import { getSmartGoalStarter, getSmartGoalStarterPreview } from "../utils/smart-goal-starters";
import { APP_STORAGE_KEYS, getUserData } from "../utils/storage";
import {
  buildSmartGoal,
  hasOutcomeIndicator,
  isPendingSMARTGoal,
  normalizeListInput,
  parseNumberInput,
  type SmartGoal,
} from "@/lib/smart-goal";
import {
  type GoalArchetype,
  inferGoalArchetype,
} from "@/lib/smart-goal/goalArchetypes";
import { mapFocusAreaToDomain } from "@/lib/smart-goal";
import { SMART_STEPS } from "./SMARTGoalSetup/constants";
import {
  buildGoalClarityItems,
  buildSMARTDataFromDraft,
  createInitialSMARTData,
  formatStepDraft,
  getStepValidationError,
  hasStepDraftContent,
} from "./SMARTGoalSetup/helpers";
import { AchievableStep } from "./SMARTGoalSetup/components/AchievableStep";
import { MeasurableStep } from "./SMARTGoalSetup/components/MeasurableStep";
import { RelevantStep } from "./SMARTGoalSetup/components/RelevantStep";
import { SmartGoalHero } from "./SMARTGoalSetup/components/SmartGoalHero";
import { SmartGoalStepShell } from "./SMARTGoalSetup/components/SmartGoalStepShell";
import { SpecificStep } from "./SMARTGoalSetup/components/SpecificStep";
import { TimeBoundStep } from "./SMARTGoalSetup/components/TimeBoundStep";
import type { SMARTData, SmartStepKey } from "./SMARTGoalSetup/types";

export function SMARTGoalSetup() {
  const navigate = useNavigate();
  const [setupState, setSetupState] = useState<"checking" | "needs_life_balance" | "needs_life_insight" | "ready">(
    "checking",
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [focusArea, setFocusArea] = useState<string>("");
  const [smartData, setSmartData] = useState<SMARTData>(createInitialSMARTData());
  const [archetypeOverride, setArchetypeOverride] = useState<GoalArchetype | null>(null);
  const stepTopRef = useRef<HTMLDivElement | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const data = getUserData();
    if (!hasRealLifeBalance(data)) {
      setSetupState("needs_life_balance");
      return;
    }

    const area = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    if (!area || !getScoredLifeArea(data, area)) {
      setSetupState("needs_life_insight");
      return;
    }

    setFocusArea(area);

    const draft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    if (!draft) {
      setSetupState("ready");
      return;
    }

    try {
      const parsed = JSON.parse(draft);
      const parsedFocusArea = isPendingSMARTGoal(parsed) && parsed.focusArea.trim().length > 0 ? parsed.focusArea : "";

      if (area && parsedFocusArea && parsedFocusArea !== area) {
        setSetupState("ready");
        return;
      }

      if (!area && parsedFocusArea) {
        setFocusArea(parsedFocusArea);
      }

      setSmartData(buildSMARTDataFromDraft(parsed));
    } catch {
      // Ignore malformed drafts.
    }

    setSetupState("ready");
  }, []);

  const firstStepData = SMART_STEPS[0];
  if (!firstStepData) {
    throw new Error("SMART goal steps are not configured.");
  }

  const currentStepData = SMART_STEPS[currentStep] ?? firstStepData;
  const currentStepKey = currentStepData.key;
  const totalSteps = SMART_STEPS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const completedCount = useMemo(
    () => SMART_STEPS.filter((step) => getStepValidationError(step.key, smartData) === null).length,
    [smartData],
  );
  const inferredArchetype = useMemo<GoalArchetype>(
    () =>
      inferGoalArchetype({
        domain: focusArea ? mapFocusAreaToDomain(focusArea) : undefined,
        focusArea,
        goalStatement: smartData.specific.goal_statement,
        metricName: smartData.measurable.metric_name,
      }),
    [focusArea, smartData.specific.goal_statement, smartData.measurable.metric_name],
  );
  const archetype: GoalArchetype = archetypeOverride ?? inferredArchetype;
  const isArchetypeOverridden = archetypeOverride !== null;
  const smartGoalStarter = useMemo(() => getSmartGoalStarter(focusArea), [focusArea]);
  const clarityItems = useMemo(() => buildGoalClarityItems(smartData), [smartData]);
  const clarityDoneCount = clarityItems.filter((item) => item.done).length;
  const clarityProgress = (clarityDoneCount / clarityItems.length) * 100;
  const summaryRows = useMemo(
    () =>
      SMART_STEPS.map((step) => ({
        key: step.key,
        label: step.label,
        value: formatStepDraft(step.key, smartData) || "Chưa có nội dung cho phần này.",
      })),
    [smartData],
  );
  const currentStepError = getStepValidationError(currentStepKey, smartData);
  const isCurrentStepValid = currentStepError === null;
  const currentStepHasDraftContent = hasStepDraftContent(currentStepKey, smartData);
  const currentStarterPreview = getSmartGoalStarterPreview(currentStepKey, smartGoalStarter);
  const shouldShowCurrentStepError = currentStepError !== null && currentStepHasDraftContent;
  const currentStepSoftWarning =
    currentStepKey === "specific" &&
    currentStepError === null &&
    !hasOutcomeIndicator(smartData.specific.goal_statement)
      ? "Gợi ý: nên dùng động từ kết quả rõ ràng như đạt, hoàn thành, xây dựng, ra mắt hoặc chạm mốc."
      : null;

  useScrollToTopOnChange(currentStep, {
    targetRef: stepTopRef,
    focusRef: stepHeadingRef,
    enabled: setupState === "ready",
  });

  const handleGoToFeasibility = () => {
    const measurableTarget = parseNumberInput(smartData.measurable.target_value);
    const weeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours);
    const measurableBaseline = parseNumberInput(smartData.measurable.baseline_value);
    const targetWeeks = parseNumberInput(smartData.timeBound.target_weeks);

    if (measurableTarget === undefined || weeklyHours === undefined) {
      return;
    }
    if (measurableBaseline !== undefined && measurableTarget <= measurableBaseline) {
      return;
    }

    const smartGoal: SmartGoal = buildSmartGoal({
      focusArea,
      specificGoalStatement: smartData.specific.goal_statement,
      measurableMetricName: smartData.measurable.metric_name,
      measurableBaselineValue: measurableBaseline,
      measurableTargetValue: measurableTarget,
      achievableWeeklyTimeCommitmentHours: weeklyHours,
      achievableRequiredSkills: normalizeListInput(smartData.achievable.required_skills),
      achievableSupportResources: normalizeListInput(smartData.achievable.support_resources),
      relevantMotivationReason: smartData.relevant.motivation_reason,
      relevantLifeDimensionAlignment: smartData.relevant.life_dimension_alignment,
      timeBoundTargetDate: smartData.timeBound.mode === "date" ? smartData.timeBound.target_date : undefined,
      timeBoundTargetWeeks: smartData.timeBound.mode === "weeks" ? targetWeeks : undefined,
    });

    localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, JSON.stringify(smartGoal));
    trackAnalyticsEvent("smart_goal_created", {
      focus_area: focusArea,
      target_mode: smartData.timeBound.mode,
      target_weeks: smartData.timeBound.mode === "weeks" ? targetWeeks : undefined,
      has_baseline: measurableBaseline !== undefined,
      weekly_hours: weeklyHours,
      goal_archetype: archetype,
      archetype_overridden: isArchetypeOverridden,
    });

    navigate("/feasibility");
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    handleGoToFeasibility();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      return;
    }

    navigate("/life-insight");
  };

  const handleJumpToStep = (stepKey: SmartStepKey) => {
    const nextStep = SMART_STEPS.findIndex((step) => step.key === stepKey);
    if (nextStep >= 0) setCurrentStep(nextStep);
  };

  const handleApplyStarterForStep = (stepKey: SmartStepKey) => {
    setSmartData((previous) => {
      switch (stepKey) {
        case "specific":
          return {
            ...previous,
            specific: {
              goal_statement: smartGoalStarter.specificGoalStatement,
            },
          };
        case "measurable":
          return {
            ...previous,
            measurable: {
              metric_name: smartGoalStarter.metricName,
              baseline_value: smartGoalStarter.baselineValue,
              target_value: smartGoalStarter.targetValue,
            },
          };
        case "achievable":
          return {
            ...previous,
            achievable: {
              weekly_time_commitment_hours: smartGoalStarter.weeklyHours,
              required_skills: smartGoalStarter.requiredSkills,
              support_resources: smartGoalStarter.supportResources,
            },
          };
        case "relevant":
          return {
            ...previous,
            relevant: {
              motivation_reason: smartGoalStarter.motivationReason,
              life_dimension_alignment: smartGoalStarter.lifeDimensionAlignment,
            },
          };
        case "timeBound":
          return {
            ...previous,
            timeBound: {
              mode: "weeks",
              target_date: "",
              target_weeks: smartGoalStarter.targetWeeks,
            },
          };
        default:
          return previous;
      }
    });
  };

  const renderCurrentStepFields = () => {
    switch (currentStepKey) {
      case "specific":
        return (
          <SpecificStep
            smartData={smartData}
            setSmartData={setSmartData}
            placeholder={currentStepData.placeholder}
            showError={shouldShowCurrentStepError}
            archetype={archetype}
            inferredArchetype={inferredArchetype}
            isArchetypeOverridden={isArchetypeOverridden}
            onArchetypeChange={(next) => setArchetypeOverride(next)}
            onArchetypeResetToInferred={() => setArchetypeOverride(null)}
          />
        );
      case "measurable":
        return (
          <MeasurableStep
            smartData={smartData}
            setSmartData={setSmartData}
            currentStepHasDraftContent={currentStepHasDraftContent}
            archetype={archetype}
          />
        );
      case "achievable":
        return (
          <AchievableStep
            smartData={smartData}
            setSmartData={setSmartData}
            currentStepHasDraftContent={currentStepHasDraftContent}
            archetype={archetype}
          />
        );
      case "relevant":
        return (
          <RelevantStep
            smartData={smartData}
            setSmartData={setSmartData}
            placeholder={currentStepData.placeholder}
            currentStepHasDraftContent={currentStepHasDraftContent}
          />
        );
      case "timeBound":
        return <TimeBoundStep smartData={smartData} setSmartData={setSmartData} />;
      default:
        return null;
    }
  };

  if (setupState === "checking") {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Viết mục tiêu"
        loading
        title="Đang chuẩn bị bước viết mục tiêu"
        description="Mình đang kiểm tra dữ liệu cân bằng cuộc sống và trọng tâm đã chọn trước khi mở phần viết mục tiêu."
      />
    );
  }

  if (setupState === "needs_life_balance") {
    return (
      <CoreFlowGateState
        currentStepId="life_balance"
        eyebrow="Viết mục tiêu"
        title="Hoàn thành bước cân bằng trước"
        description="Bước viết mục tiêu cần đi sau dữ liệu cân bằng cuộc sống thật. Hãy chấm điểm các lĩnh vực trước để mục tiêu không bắt đầu từ số mặc định."
        actionLabel="Bắt đầu cân bằng"
        onAction={() => navigate("/onboarding")}
      />
    );
  }

  if (setupState === "needs_life_insight") {
    return (
      <CoreFlowGateState
        currentStepId="life_insight"
        eyebrow="Viết mục tiêu"
        title="Chọn trọng tâm trước"
        description="Bạn đã có dữ liệu cân bằng cuộc sống, nhưng chưa chọn lĩnh vực trọng tâm. Hãy chọn một trọng tâm rồi quay lại viết mục tiêu."
        actionLabel="Mở bước chọn trọng tâm"
        onAction={() => navigate("/life-insight")}
      />
    );
  }

  return (
    <div className="flow-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-7xl space-y-5"
      >
        <CoreFlowProgress currentStepId="smart_goal" />

        <SmartGoalHero
          focusArea={focusArea}
          smartData={smartData}
          currentStep={currentStep}
          completedCount={completedCount}
          totalSteps={totalSteps}
          progressPercentage={progressPercentage}
        />

        <div ref={stepTopRef} className="mx-auto max-w-4xl">
          <Card className="flow-panel overflow-hidden">
            <CardContent className="p-5 sm:p-6 lg:p-7">
              <SmartGoalStepShell
                stepIndex={currentStep}
                totalSteps={totalSteps}
                step={currentStepData}
                headingRef={stepHeadingRef}
                starterPreview={currentStarterPreview}
                clarityItems={clarityItems}
                clarityDoneCount={clarityDoneCount}
                clarityProgress={clarityProgress}
                summaryRows={summaryRows}
                showReview={currentStepKey === "timeBound"}
                currentStepError={shouldShowCurrentStepError ? currentStepError : null}
                currentStepSoftWarning={currentStepSoftWarning}
                isCurrentStepValid={isCurrentStepValid}
                onApplyStarter={() => handleApplyStarterForStep(currentStepKey)}
                onJumpToStep={handleJumpToStep}
                onBack={handleBack}
                onNext={handleNext}
              >
                {renderCurrentStepFields()}
              </SmartGoalStepShell>
            </CardContent>
          </Card>

          <details className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white/78 p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.24)]">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Xem lại mục tiêu đang viết
            </summary>

            <div className="mt-4 space-y-3">
              {SMART_STEPS.map((step) => (
                <div key={step.key} className="flow-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {formatStepDraft(step.key, smartData) || "Chưa có nội dung cho phần này."}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </motion.div>
    </div>
  );
}
