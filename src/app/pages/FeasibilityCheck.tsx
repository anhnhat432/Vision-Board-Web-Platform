import { Compass, Sparkles, Target } from "lucide-react";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  type GoalArchetype,
  type PendingSMARTGoal,
  evaluateSmartGoalQuality,
  inferGoalArchetype,
  parsePendingSMARTGoal,
  parseSmartGoal,
} from "@/lib/smart-goal";
import type { SmartGoalQualityBridge } from "./FeasibilityCheck/types";
import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { FeasibilityScaleIllustration } from "../components/illustrations";
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { getScoredLifeArea, hasRealLifeBalance } from "../utils/core-flow-guard";
import { APP_STORAGE_KEYS, getLifeAreaLabel, getUserData } from "../utils/storage";
import { FeasibilityStepShell } from "./FeasibilityCheck/components/FeasibilityStepShell";
import { ResultStep } from "./FeasibilityCheck/components/ResultStep";
import { QUESTIONS } from "./FeasibilityCheck/constants";
import { buildResult, getAnsweredQuestionCount, hasCompleteFeasibilityAnswers } from "./FeasibilityCheck/helpers";
import type { PendingFeasibilityResult, ResultData } from "./FeasibilityCheck/types";

type FeasibilitySetupState = "checking" | "needs_life_balance" | "needs_life_insight" | "needs_smart_goal" | "ready";

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

export function FeasibilityCheck() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const hasGuardedRef = useRef(false);
  const [setupState, setSetupState] = useState<FeasibilitySetupState>("checking");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  const [focusArea, setFocusArea] = useState<string>("");
  const [wheelScore, setWheelScore] = useState<number | null>(null);
  const [pendingGoal, setPendingGoal] = useState<PendingSMARTGoal | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const questionTopRef = useRef<HTMLDivElement | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const smartGoalQualityLevelRef: MutableRefObject<SmartGoalQualityBridge | undefined> = useRef(undefined);
  const goalArchetypeRef: MutableRefObject<GoalArchetype | undefined> = useRef(undefined);

  useEffect(() => {
    if (hasGuardedRef.current) return;
    hasGuardedRef.current = true;

    const storedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const draft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    const data = getUserData();

    if (!hasRealLifeBalance(data)) {
      setSetupState("needs_life_balance");
      return;
    }

    if (!storedFocusArea) {
      setSetupState("needs_life_insight");
      return;
    }

    if (!draft) {
      setSetupState("needs_smart_goal");
      return;
    }

    let parsedDraft: unknown;
    try {
      parsedDraft = JSON.parse(draft);
    } catch {
      setSetupState("needs_smart_goal");
      return;
    }

    const normalizedSmartGoal = parseSmartGoal(parsedDraft, storedFocusArea);
    if (normalizedSmartGoal) {
      localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, JSON.stringify(normalizedSmartGoal));
      const qualityResult = evaluateSmartGoalQuality(normalizedSmartGoal);
      smartGoalQualityLevelRef.current = qualityResult.level;
      goalArchetypeRef.current = inferGoalArchetype({
        domain: normalizedSmartGoal.domain,
        focusArea: storedFocusArea,
        goalStatement: normalizedSmartGoal.specific?.goal_statement,
        metricName: normalizedSmartGoal.measurable?.metric_name,
        metricUnit: normalizedSmartGoal.measurable?.metric_unit,
      });
    }

    const normalizedPendingGoal = parsePendingSMARTGoal(normalizedSmartGoal ?? parsedDraft, storedFocusArea);

    if (!normalizedPendingGoal) {
      setSetupState("needs_smart_goal");
      return;
    }

    const areaData = getScoredLifeArea(data, storedFocusArea);

    if (!areaData) {
      setSetupState("needs_life_insight");
      return;
    }

    // Restore saved feasibility answers (draft)
    const savedAnswers = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers);
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const restoredAnswers = parsed as Record<number, string>;
          setAnswers(restoredAnswers);
          setLastSavedSnapshot(JSON.stringify(restoredAnswers));
          setLastSavedAt(new Date());
        }
      } catch {
        // Ignore malformed draft
      }
    }

    setFocusArea(storedFocusArea);
    setWheelScore(areaData.score);
    setPendingGoal(normalizedPendingGoal);
    setSetupState("ready");
  }, []);

  const answeredCount = Object.keys(answers).length;
  const currentAnswersSnapshot = useMemo(() => JSON.stringify(answers), [answers]);
  const isDirty = setupState === "ready" && answeredCount > 0 && currentAnswersSnapshot !== lastSavedSnapshot;
  const debouncedSaveRef = useRef<FlushableDebouncedSave<string> | null>(null);

  const saveAnswersSnapshot = useCallback((snapshot: string) => {
    setAutoSaveStatus("saving");
    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers, snapshot);
    setLastSavedSnapshot(snapshot);
    setLastSavedAt(new Date());
    setAutoSaveStatus("saved");
  }, []);

  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = createFlushableDebouncedSave(saveAnswersSnapshot, 400);
  }

  useEffect(() => {
    if (setupState !== "ready") return;
    if (answeredCount === 0) return;
    if (!isDirty) {
      setAutoSaveStatus("saved");
      return;
    }

    setAutoSaveStatus("idle");
    debouncedSaveRef.current?.schedule(currentAnswersSnapshot);
  }, [answeredCount, currentAnswersSnapshot, isDirty, setupState]);

  useDirtyFormGuard(isDirty, () => debouncedSaveRef.current?.flush());

  useScrollToTopOnChange(currentStep, {
    targetRef: questionTopRef,
    focusRef: questionHeadingRef,
    enabled: setupState === "ready" && Boolean(pendingGoal && wheelScore !== null && !result),
  });

  if (setupState === "checking") {
    return (
      <CoreFlowGateState
        currentStepId="feasibility"
        eyebrow="Kiểm tra"
        title="Đang chuẩn bị phần kiểm tra tính khả thi"
        description="Đang đọc lại mục tiêu và dữ liệu trọng tâm trước khi bắt đầu."
        loading
      />
    );
  }

  if (setupState === "needs_life_balance") {
    return (
      <CoreFlowGateState
        currentStepId="life_balance"
        eyebrow="Kiểm tra"
        title="Hoàn thành Cân bằng cuộc sống trước khi kiểm tra tính khả thi"
        description="Phần kiểm tra cần điểm cân bằng thật để biết mục tiêu đang dựa trên khu vực nào. Hãy hoàn thành bước đánh giá trước, rồi quay lại kiểm tra."
        actionLabel="Bắt đầu Cân bằng cuộc sống"
        onAction={() => navigate("/onboarding")}
        secondaryActionLabel="Về Trang chính"
        onSecondaryAction={() => navigate("/")}
      />
    );
  }

  if (setupState === "needs_life_insight") {
    return (
      <CoreFlowGateState
        currentStepId="life_insight"
        eyebrow="Kiểm tra"
        title="Chọn trọng tâm trước khi kiểm tra tính khả thi"
        description="Bạn đã có dữ liệu cân bằng nhưng chưa có trọng tâm hợp lệ. Chọn một lĩnh vực ưu tiên để phần kiểm tra hiểu đúng bối cảnh mục tiêu."
        actionLabel="Mở góc nhìn cuộc sống"
        onAction={() => navigate("/life-insight")}
        secondaryActionLabel="Bắt đầu Cân bằng cuộc sống"
        onSecondaryAction={() => navigate("/onboarding")}
      />
    );
  }

  if (setupState === "needs_smart_goal") {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Kiểm tra"
        title="Viết mục tiêu SMART trước khi kiểm tra tính khả thi"
        description="Phần kiểm tra cần một mục tiêu đủ rõ về kết quả, chỉ số, mức cam kết và thời hạn. Quay lại bước viết mục tiêu để hoàn thiện bản nháp."
        actionLabel="Quay lại viết mục tiêu"
        onAction={() => navigate("/smart-goal-setup")}
        secondaryActionLabel="Mở góc nhìn cuộc sống"
        onSecondaryAction={() => navigate("/life-insight")}
      />
    );
  }

  if (!pendingGoal || wheelScore === null) {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Kiểm tra"
        title="Thiếu dữ liệu để kiểm tra"
        description="Chưa đủ thông tin mục tiêu hoặc điểm trọng tâm. Quay lại bước viết mục tiêu để tiếp tục."
        actionLabel="Quay lại viết mục tiêu"
        onAction={() => navigate("/smart-goal-setup")}
      />
    );
  }

  const currentQuestion = QUESTIONS[currentStep];
  const totalSteps = QUESTIONS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const selectedAnswer = answers[currentQuestion.id];
  const answeredQuestionCount = getAnsweredQuestionCount(answers);

  const handleAnswerChange = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      return;
    }

    navigate("/smart-goal-setup");
  };

  const handleNext = () => {
    if (!selectedAnswer) return;

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    if (!hasCompleteFeasibilityAnswers(answers)) {
      return;
    }

    setResult(
      buildResult(answers, wheelScore, {
        smartGoalQualityLevel: smartGoalQualityLevelRef.current,
        goalArchetype: goalArchetypeRef.current,
      }),
    );
  };

  const handleContinueToPlan = () => {
    if (!result) return;

    const pendingFeasibilityResult: PendingFeasibilityResult = {
      resultType: result.type,
      resultTitle: result.title,
      resultSummary: result.summary,
      recommendation: result.recommendation,
      readinessScore: result.readinessScore,
      adjustedScore: result.adjustedScore,
      wheelScore: result.wheelScore,
      diagnosticScore: result.diagnosticScore,
      maxDiagnosticScore: result.maxDiagnosticScore,
      axisScores: result.axisScores,
      bottleneck: result.bottleneck,
      planLoad: result.planLoad,
      weeklyCapacity: result.weeklyCapacity,
      firstWeekGuidance: result.firstWeekGuidance,
      scopeRecommendation: result.scopeRecommendation,
      smartGoalQualityLevel: result.smartGoalQualityLevel,
      smartGoalQualityNote: result.smartGoalQualityNote,
      savedAt: new Date().toISOString(),
    };

    const finalAnswersSnapshot = JSON.stringify(answers);
    debouncedSaveRef.current?.cancel();
    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityResult, JSON.stringify(pendingFeasibilityResult));
    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers, finalAnswersSnapshot);
    setLastSavedSnapshot(finalAnswersSnapshot);
    setLastSavedAt(new Date());
    setAutoSaveStatus("saved");
    trackAnalyticsEvent("feasibility_completed", {
      focus_area: focusArea,
      result_type: result.type,
      readiness_score: result.readinessScore,
      adjusted_score: result.adjustedScore,
      bottleneck_axis: result.bottleneck.axis,
      plan_load: result.planLoad,
      weekly_capacity: result.weeklyCapacity,
      answer_count: Object.keys(answers).length,
    });

    toast.success("Đã kiểm tra tính thực tế", {
      description: "Tiếp tục thiết kế kế hoạch 12 tuần.",
    });

    navigate("/12-week-setup");
  };

  const handleAdjustGoal = () => {
    navigate("/smart-goal-setup");
  };

  if (result) {
    return (
      <ResultStep
        result={result}
        focusArea={focusArea}
        pendingGoal={pendingGoal}
        onContinue={handleContinueToPlan}
        onAdjustGoal={handleAdjustGoal}
      />
    );
  }

  return (
    <PageShell maxWidth="xl">
      <div className={prefersReducedMotion ? "stack-section" : "animate-fade-in-up stack-section"}>
        <CoreFlowProgress currentStepId="feasibility" onExit={() => navigate("/")} />

        <Card>
          <CardContent className="relative p-5 sm:p-7 lg:p-8">
            <FeasibilityScaleIllustration className="pointer-events-none absolute -right-4 bottom-4 hidden w-56 text-[color:var(--tone-shell-primary)] opacity-15 lg:block" />

            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="stack-stack min-w-0">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <Compass className="h-3.5 w-3.5 text-[color:var(--tone-shell-secondary)]" aria-hidden="true" />
                  Kiểm tra tính thực tế
                </p>

                <div className="stack-tight">
                  <h1 className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-4xl">
                    Mục tiêu này có <span className="text-gradient-vibrant">khả thi</span> với bạn lúc này không?
                  </h1>
                  <p className="hidden max-w-2xl text-base leading-relaxed text-muted-foreground sm:block">
                    Không phải bài kiểm tra chặn lại — giúp bạn biết nên giữ nguyên, chia nhỏ hay điều chỉnh mục tiêu
                    trước khi vào kế hoạch 12 tuần.
                  </p>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:hidden">
                    Giúp biết nên giữ nguyên, chia nhỏ hay điều chỉnh mục tiêu trước khi vào kế hoạch 12 tuần.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="brand">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    {getLifeAreaLabel(focusArea)}
                  </Badge>
                  <Badge variant="neutral">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Điểm hiện tại: {wheelScore}/10
                  </Badge>
                </div>

                <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>
                      Câu hỏi {currentStep + 1} / {totalSteps}
                    </span>
                    <span className="font-semibold text-foreground">{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="mt-2 h-2" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Mục tiêu đã viết
                  </p>
                  <p className="mt-2 text-base font-semibold leading-6 text-foreground">{pendingGoal.specific}</p>
                </div>
                <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Khung thời gian
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{pendingGoal.timeBound}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <AutoSaveIndicator status={isDirty ? autoSaveStatus : "saved"} lastSavedAt={lastSavedAt} />
        </div>

        <FeasibilityStepShell
          currentQuestion={currentQuestion}
          currentStep={currentStep}
          totalSteps={totalSteps}
          answeredQuestionCount={answeredQuestionCount}
          selectedAnswer={selectedAnswer}
          onAnswerChange={handleAnswerChange}
          onBack={handleBack}
          onNext={handleNext}
          targetRef={questionTopRef}
          headingRef={questionHeadingRef}
        />
      </div>
    </PageShell>
  );
}
