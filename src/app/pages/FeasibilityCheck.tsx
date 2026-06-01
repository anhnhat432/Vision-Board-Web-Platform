import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import {
  evaluateSmartGoalQuality,
  type GoalArchetype,
  inferGoalArchetype,
  type PendingSMARTGoal,
  parsePendingSMARTGoal,
  parseSmartGoal,
} from "@/lib/smart-goal";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { PageShell } from "../components/PageShell";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { getScoredLifeArea, hasRealLifeBalance } from "../utils/core-flow-guard";
import { APP_STORAGE_KEYS, getLifeAreaLabel, getUserData } from "../utils/storage";
import { FeasibilityBalanceScale } from "./FeasibilityCheck/components/FeasibilityBalanceScale";
import { FeasibilityStepShell } from "./FeasibilityCheck/components/FeasibilityStepShell";
import { ResultStep } from "./FeasibilityCheck/components/ResultStep";
import { QUESTIONS } from "./FeasibilityCheck/constants";
import { buildResult, getAnsweredQuestionCount, hasCompleteFeasibilityAnswers } from "./FeasibilityCheck/helpers";
import type { PendingFeasibilityResult, ResultData, SmartGoalQualityBridge } from "./FeasibilityCheck/types";

type FeasibilitySetupState = "checking" | "needs_life_balance" | "needs_life_insight" | "needs_smart_goal" | "ready";

type FlushableDebouncedSave<T> = {
  schedule: (value: T) => void;
  flush: () => void;
  cancel: () => void;
};

function createFlushableDebouncedSave<T>(callback: (value: T) => void, delayMs: number): FlushableDebouncedSave<T> {
  let timer: number | null = null;
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
        // Ignore malformed draft.
      }
    }

    const savedResult = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult);
    if (savedResult) {
      try {
        const parsedResult = JSON.parse(savedResult);
        if (parsedResult && typeof parsedResult === "object") {
          const resultData: ResultData = {
            type: parsedResult.resultType ?? parsedResult.type,
            title: parsedResult.resultTitle ?? parsedResult.title,
            summary: parsedResult.resultSummary ?? parsedResult.summary,
            recommendation: parsedResult.recommendation,
            readinessScore: parsedResult.readinessScore,
            adjustedScore: parsedResult.adjustedScore,
            wheelScore: parsedResult.wheelScore,
            diagnosticScore: parsedResult.diagnosticScore,
            maxDiagnosticScore: parsedResult.maxDiagnosticScore,
            axisScores: parsedResult.axisScores ?? [],
            bottleneck: parsedResult.bottleneck,
            planLoad: parsedResult.planLoad,
            weeklyCapacity: parsedResult.weeklyCapacity,
            firstWeekGuidance: parsedResult.firstWeekGuidance,
            scopeRecommendation: parsedResult.scopeRecommendation,
            smartGoalQualityLevel: parsedResult.smartGoalQualityLevel,
            smartGoalQualityNote: parsedResult.smartGoalQualityNote,
            savedAt: parsedResult.savedAt,
          };
          setResult(resultData);
        }
      } catch {
        // Ignore malformed result.
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
        title="Đang chuẩn bị phần kiểm tra tính thực tế"
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
        title="Hoàn thành bước cân bằng trước"
        description="Phần kiểm tra cần điểm cân bằng thật để biết mục tiêu đang dựa trên khu vực nào."
        actionLabel="Bắt đầu cân bằng"
        onAction={() => navigate("/onboarding")}
      />
    );
  }

  if (setupState === "needs_life_insight") {
    return (
      <CoreFlowGateState
        currentStepId="life_insight"
        eyebrow="Kiểm tra"
        title="Chọn trọng tâm trước"
        description="Bạn đã có dữ liệu cân bằng nhưng chưa chọn lĩnh vực ưu tiên cho mục tiêu này."
        actionLabel="Mở bước chọn trọng tâm"
        onAction={() => navigate("/life-insight")}
      />
    );
  }

  if (setupState === "needs_smart_goal") {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Kiểm tra"
        title="Viết mục tiêu trước"
        description="Phần kiểm tra cần một mục tiêu đủ rõ về kết quả, chỉ số, mức cam kết và thời hạn."
        actionLabel="Viết mục tiêu"
        onAction={() => navigate("/smart-goal-setup")}
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
        actionLabel="Viết mục tiêu"
        onAction={() => navigate("/smart-goal-setup")}
      />
    );
  }

  const currentQuestion = QUESTIONS[currentStep];
  const totalSteps = QUESTIONS.length;
  const selectedAnswer = answers[currentQuestion.id];
  const answeredQuestionCount = getAnsweredQuestionCount(answers);

  const handleAnswerChange = (value: string) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [currentQuestion.id]: value }));
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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

  const autoSave = <AutoSaveIndicator status={isDirty ? autoSaveStatus : "saved"} lastSavedAt={lastSavedAt} />;

  if (result) {
    return (
      <PageShell maxWidth="md">
        <div className="space-y-6">
          <div>
            <CoreFlowProgress currentStepId="feasibility" onExit={() => navigate("/")} className="mb-2" />
            <div className="flex justify-end">{autoSave}</div>
          </div>

          <ResultStep
            result={result}
            focusArea={focusArea}
            pendingGoal={pendingGoal}
            onContinue={handleContinueToPlan}
            onAdjustGoal={handleAdjustGoal}
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="md">
      <div className="space-y-6">
        <div>
          <CoreFlowProgress currentStepId="feasibility" onExit={() => navigate("/")} className="mb-2" />
          <div className="flex justify-end">{autoSave}</div>
        </div>

        <section aria-labelledby="feasibility-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
            {getLifeAreaLabel(focusArea)} · Hiệu chuẩn khả thi
          </p>
          <h1
            id="feasibility-title"
            className="mt-3 font-serif text-3xl font-medium leading-tight tracking-[-0.02em] text-app-ink sm:text-4xl"
          >
            Hiệu chuẩn cán cân khả thi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft">
            Cùng chuẩn bị hành trang phù hợp để đảm bảo kế hoạch 12 tuần của bạn chắc thắng.
          </p>

          <div className="mt-6 rounded-2xl border border-indigo-500/10 bg-indigo-50/50 dark:bg-indigo-950/20 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-500/80 dark:text-indigo-400/80 mb-2">
                  Mục tiêu của bạn
                </p>
                <p className="line-clamp-2 text-sm font-bold leading-relaxed text-indigo-900 dark:text-indigo-100">
                  {pendingGoal.specific}
                </p>
              </div>
              <Link
                to="/smart-goal-setup"
                className="shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 transition-colors p-2 -m-2"
              >
                Sửa mục tiêu ✏️
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-indigo-500 text-white px-3 py-1 font-bold shadow-sm">
                {getLifeAreaLabel(focusArea)}
              </span>
              <span className="rounded-full border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 py-1 font-semibold text-indigo-750 dark:text-indigo-300">
                Điểm nền tảng: {wheelScore}/10
              </span>
            </div>
          </div>
        </section>

        <FeasibilityBalanceScale answers={answers} />

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
