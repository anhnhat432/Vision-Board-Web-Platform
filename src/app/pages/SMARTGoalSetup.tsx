import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { PageShell } from "../components/PageShell";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
import { trackAnalyticsEvent } from "../utils/analytics";
import { getScoredLifeArea, hasRealLifeBalance } from "../utils/core-flow-guard";
import { getSmartGoalStarter, getSmartGoalStarterPreview } from "../utils/smart-goal-starters";
import { APP_STORAGE_KEYS, getCurrentPlan, getUserData } from "../utils/storage";
import { hasReachedLimit } from "../utils/feature-entitlements";
import type { AspirationalVision as AspirationalVisionModel } from "../utils/storage-types";
import {
  buildSmartGoal,
  evaluateSmartGoalQuality,
  inferGoalArchetype,
  isPendingSMARTGoal,
  mapFocusAreaToDomain,
  normalizeListInput,
  parseNumberInput,
  type SmartGoal,
} from "@/lib/smart-goal";
import {
  getArchetypeQualityHints,
  type GoalArchetype,
} from "@/lib/smart-goal/goalArchetypes";
import {
  getArchetypeForIntent,
  getUserIntentId,
  hasActionableArchetypeHint,
  type UserIntentId,
} from "../utils/user-intent";
import { SMART_STEPS } from "./SMARTGoalSetup/constants";
import {
  buildGoalClarityItems,
  buildSMARTDataFromDraft,
  buildSmartGoalFromFormData,
  createInitialSMARTData,
  formatStepDraft,
  getQualityScoreBucket,
  getStepQualityHint,
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

type FlushableDebouncedSave<T> = {
  schedule: (value: T) => void;
  flush: () => void;
  cancel: () => void;
};

function createFlushableDebouncedSave<T>(callback: (value: T) => void, delayMs: number): FlushableDebouncedSave<T> {
  let timer: ReturnType<typeof window.setTimeout> | null = null;
  let pendingValue: T | null = null;

  const flush = () => {
    if (pendingValue === null) return;

    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }

    const value = pendingValue;
    pendingValue = null;
    callback(value);
  };

  return {
    schedule: (value) => {
      pendingValue = value;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(flush, delayMs);
    },
    flush,
    cancel: () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      pendingValue = null;
    },
  };
}

export function SMARTGoalSetup() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [setupState, setSetupState] = useState<"checking" | "needs_life_balance" | "needs_life_insight" | "ready">(
    "checking",
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [focusArea, setFocusArea] = useState<string>("");
  const [smartData, setSmartData] = useState<SMARTData>(createInitialSMARTData());
  const [userIntent, setUserIntentState] = useState<UserIntentId | null>(null);
  const [archetypeOverride, setArchetypeOverride] = useState<GoalArchetype | null>(null);
  const [aspirationalVision, setAspirationalVision] = useState<AspirationalVisionModel | null>(null);
  const [isVisionPromptDismissed, setIsVisionPromptDismissed] = useState(false);
  const [isGoalLimitPaywallOpen, setIsGoalLimitPaywallOpen] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  const stepTopRef = useRef<HTMLDivElement | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const data = getUserData();
    setAspirationalVision(data.aspirationalVision ?? null);
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

      const initialSmartData = buildSMARTDataFromDraft(parsed);
      setSmartData(initialSmartData);
      setLastSavedSnapshot(JSON.stringify(buildSmartGoalFromFormData(initialSmartData, parsedFocusArea || area)));
      setLastSavedAt(new Date());
    } catch {
      // Ignore malformed drafts.
    }

    setUserIntentState(getUserIntentId());
    setSetupState("ready");
  }, []);

  const intentArchetype: GoalArchetype | null = useMemo(() => {
    if (!userIntent || !hasActionableArchetypeHint(userIntent)) return null;
    return getArchetypeForIntent(userIntent);
  }, [userIntent]);

  const inferredArchetype: GoalArchetype = useMemo(() => {
    if (intentArchetype) return intentArchetype;
    return inferGoalArchetype({
      domain: focusArea ? mapFocusAreaToDomain(focusArea) : undefined,
      focusArea,
      goalStatement: smartData.specific.goal_statement,
      metricName: smartData.measurable.metric_name,
    });
  }, [focusArea, intentArchetype, smartData.measurable.metric_name, smartData.specific.goal_statement]);
  const archetype: GoalArchetype = archetypeOverride ?? inferredArchetype;
  const isArchetypeOverridden = archetypeOverride !== null;

  const intentMetricHint = useMemo(() => {
    if (!intentArchetype) return undefined;
    return getArchetypeQualityHints(intentArchetype).recommendedMetric;
  }, [intentArchetype]);

  const firstStepData = SMART_STEPS[0];
  if (!firstStepData) {
    throw new Error("Các bước mục tiêu SMART chưa được cấu hình.");
  }

  const currentStepData = SMART_STEPS[currentStep] ?? firstStepData;
  const currentStepKey = currentStepData.key;
  const totalSteps = SMART_STEPS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const completedCount = useMemo(
    () => SMART_STEPS.filter((step) => getStepValidationError(step.key, smartData) === null).length,
    [smartData],
  );
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
  const hasMinimumGoalStatement = smartData.specific.goal_statement.trim().length >= 10;
  const isCurrentStepValid =
    currentStepError === null && (currentStepKey !== "timeBound" || hasMinimumGoalStatement);
  const currentStepHasDraftContent = hasStepDraftContent(currentStepKey, smartData);
  const currentStarterPreview = getSmartGoalStarterPreview(currentStepKey, smartGoalStarter);
  const shouldShowCurrentStepError =
    currentStepError !== null && (currentStepKey === "specific" || currentStepHasDraftContent);
  const liveSmartGoal = useMemo(() => buildSmartGoalFromFormData(smartData, focusArea), [smartData, focusArea]);
  const qualityResult = useMemo(() => evaluateSmartGoalQuality(liveSmartGoal), [liveSmartGoal]);
  const currentStepSoftWarning =
    currentStepError === null
      ? getStepQualityHint(currentStepKey, qualityResult, currentStepHasDraftContent)
      : null;
  const qualityFeedback =
    currentStepKey === "timeBound"
      ? {
          level: qualityResult.level,
          overallScore: qualityResult.overallScore,
          warnings: qualityResult.warnings,
          suggestions: qualityResult.suggestions,
          canProceedToFeasibility: qualityResult.canProceedToFeasibility,
        }
      : null;

  const hasAnyDraftContent = useMemo(
    () => SMART_STEPS.some((step) => hasStepDraftContent(step.key, smartData)),
    [smartData],
  );
  const currentSnapshot = useMemo(() => JSON.stringify(liveSmartGoal), [liveSmartGoal]);
  const isDirty = setupState === "ready" && hasAnyDraftContent && currentSnapshot !== lastSavedSnapshot;
  const debouncedSaveRef = useRef<FlushableDebouncedSave<string> | null>(null);

  const saveSmartGoalSnapshot = useCallback((snapshot: string) => {
    setAutoSaveStatus("saving");
    localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, snapshot);
    setLastSavedSnapshot(snapshot);
    setLastSavedAt(new Date());
    setAutoSaveStatus("saved");
  }, []);

  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = createFlushableDebouncedSave(saveSmartGoalSnapshot, 600);
  }

  useEffect(() => {
    if (setupState !== "ready") return;
    if (!hasAnyDraftContent) return;
    if (!isDirty) {
      setAutoSaveStatus("saved");
      return;
    }

    setAutoSaveStatus("idle");
    debouncedSaveRef.current?.schedule(currentSnapshot);
  }, [currentSnapshot, hasAnyDraftContent, isDirty, setupState]);

  useDirtyFormGuard(isDirty, () => debouncedSaveRef.current?.flush());

  useScrollToTopOnChange(currentStep, {
    targetRef: stepTopRef,
    focusRef: stepHeadingRef,
    enabled: setupState === "ready",
  });

  const handleGoToFeasibility = () => {
    const specificGoalStatement = smartData.specific.goal_statement.trim();
    const measurableTarget = parseNumberInput(smartData.measurable.target_value);
    const weeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours);
    const measurableBaseline = parseNumberInput(smartData.measurable.baseline_value);
    const targetWeeks = parseNumberInput(smartData.timeBound.target_weeks);

    if (specificGoalStatement.length < 10) {
      return;
    }
    if (measurableTarget === undefined || weeklyHours === undefined) {
      return;
    }
    if (measurableBaseline !== undefined && measurableTarget <= measurableBaseline) {
      return;
    }

    const currentUserData = getUserData();
    if (hasReachedLimit(currentUserData, "maxActiveGoals")) {
      setIsGoalLimitPaywallOpen(true);
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

    const finalSnapshot = JSON.stringify(smartGoal);
    debouncedSaveRef.current?.cancel();
    localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, finalSnapshot);
    setLastSavedSnapshot(finalSnapshot);
    setLastSavedAt(new Date());
    setAutoSaveStatus("saved");
    const finalQuality = evaluateSmartGoalQuality(smartGoal);
    trackAnalyticsEvent("smart_goal_created", {
      focus_area: focusArea,
      target_mode: smartData.timeBound.mode,
      target_weeks: smartData.timeBound.mode === "weeks" ? targetWeeks : undefined,
      has_baseline: measurableBaseline !== undefined,
      weekly_hours: weeklyHours,
      quality_level: finalQuality.level,
      score_bucket: getQualityScoreBucket(finalQuality.overallScore),
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
            intentArchetype={intentArchetype}
          />
        );
      case "measurable":
        return (
          <MeasurableStep
            smartData={smartData}
            setSmartData={setSmartData}
            currentStepHasDraftContent={currentStepHasDraftContent}
            intentMetricHint={intentMetricHint}
            intentArchetype={intentArchetype}
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
        description="Đang kiểm tra dữ liệu cân bằng và trọng tâm trước khi mở phần viết mục tiêu."
      />
    );
  }

  if (setupState === "needs_life_balance") {
    return (
      <CoreFlowGateState
        currentStepId="life_balance"
        eyebrow="Viết mục tiêu"
        title="Hoàn thành bước cân bằng trước"
        description="Chấm điểm các lĩnh vực cuộc sống trước để mục tiêu dựa trên dữ liệu thật, không phải số mặc định."
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
        description="Đã có dữ liệu cân bằng nhưng chưa chọn trọng tâm. Chọn một lĩnh vực rồi quay lại viết mục tiêu."
        actionLabel="Mở bước chọn trọng tâm"
        onAction={() => navigate("/life-insight")}
      />
    );
  }

  return (
    <PageShell maxWidth="xl">
      <UpgradePaywallDialog
        open={isGoalLimitPaywallOpen}
        onOpenChange={setIsGoalLimitPaywallOpen}
        context="plan"
        currentPlan={getCurrentPlan(getUserData())}
        title="Bạn đã có 3 mục tiêu"
        description="Nâng cấp Plus để tạo thêm mục tiêu. Dữ liệu hiện có vẫn được giữ nguyên."
        source="paywall_dialog"
      />
      <div className={prefersReducedMotion ? "stack-stack" : "animate-fade-in-up stack-stack"}>
        <CoreFlowProgress currentStepId="smart_goal" onExit={() => navigate("/")} />
        {!isVisionPromptDismissed && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                {aspirationalVision ? (
                  <p className="text-sm leading-6 text-foreground">
                    <span className="font-semibold text-[color:var(--tone-shell-primary)]">
                      Mục tiêu này phục vụ tầm nhìn 3 năm:
                    </span>{" "}
                    {aspirationalVision.summary}
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-foreground">
                    Bạn đang đặt mục tiêu 12 tuần. Phương pháp gốc khuyên gắn với tầm nhìn 3 năm.
                  </p>
                )}
              </div>
              {!aspirationalVision && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/vision">Điền 2 phút →</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsVisionPromptDismissed(true)}>
                    Bỏ qua
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <SmartGoalHero
          focusArea={focusArea}
          smartData={smartData}
          currentStep={currentStep}
          completedCount={completedCount}
          totalSteps={totalSteps}
          progressPercentage={progressPercentage}
          smartGoalStarter={smartGoalStarter}
        />

        <div ref={stepTopRef}>
          <Card>
            <CardContent className="p-5 sm:p-7">
              <div className="mb-3 flex justify-end">
                <AutoSaveIndicator status={isDirty ? autoSaveStatus : "saved"} lastSavedAt={lastSavedAt} />
              </div>
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
                qualityFeedback={qualityFeedback}
                onApplyStarter={() => handleApplyStarterForStep(currentStepKey)}
                onJumpToStep={handleJumpToStep}
                onBack={handleBack}
                onNext={handleNext}
              >
                {renderCurrentStepFields()}
              </SmartGoalStepShell>
            </CardContent>
          </Card>

          <details className="mt-[var(--space-stack)] rounded-[var(--r-card)] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)] p-5 shadow-[var(--shadow-1)]">
            <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
              Xem lại mục tiêu đang viết
            </summary>

            <div className="mt-4 stack-tight">
              {SMART_STEPS.map((step) => (
                <div
                  key={step.key}
                  className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {step.label}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-foreground">
                    {formatStepDraft(step.key, smartData) || "Chưa có nội dung cho phần này."}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </PageShell>
  );
}
