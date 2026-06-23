import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
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
import { MotionFadeIn } from "../components/motion";
import { PageShell } from "../components/PageShell";
import { ScreenGuide } from "../components/ScreenGuide";
import { SCREEN_GUIDES } from "../components/screen-guides";
import { cn } from "../components/ui/utils";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { getScoredLifeArea, hasRealLifeBalance } from "../utils/core-flow-guard";
import { APP_STORAGE_KEYS, getLifeAreaLabel, getUserData } from "../utils/storage";
import { FeasibilityBalanceScale } from "./FeasibilityCheck/components/FeasibilityBalanceScale";
import { FeasibilityStepShell } from "./FeasibilityCheck/components/FeasibilityStepShell";
import { ResultStep } from "./FeasibilityCheck/components/ResultStep";
import { QUESTIONS } from "./FeasibilityCheck/constants";
import {
  ADVANCED_QUESTION_IDS,
  buildPendingFeasibilityResult,
  buildFeasibilityAnswersWithDefaults,
  buildResult,
  CORE_QUESTION_IDS,
  getAnsweredQuestionCount,
  hasCompleteFeasibilityAnswers,
} from "./FeasibilityCheck/helpers";
import type { PendingFeasibilityResult, ResultData, SmartGoalQualityBridge } from "./FeasibilityCheck/types";

type FeasibilitySetupState = "checking" | "needs_life_balance" | "needs_life_insight" | "needs_smart_goal" | "ready";

type FlushableDebouncedSave<T> = {
  schedule: (value: T) => void;
  flush: () => void;
  cancel: () => void;
};

const CORE_QUESTIONS = QUESTIONS.filter((question) => question.tier === "core");
const ALL_QUESTION_IDS = QUESTIONS.map((question) => question.id);

function hasAdvancedAnswerDraft(answers: Record<number, string | null | undefined>): boolean {
  return ADVANCED_QUESTION_IDS.some((questionId) => {
    const answer = answers[questionId];
    return typeof answer === "string" && answer.trim().length > 0;
  });
}

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
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [showAdvancedQuestions, setShowAdvancedQuestions] = useState(false);
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

    // Kiểm tra xem mục tiêu đang được đánh giá khả thi có bị thay đổi không
    const activeGoalRaw = localStorage.getItem("feasibilityActiveGoal");
    const isNewGoal = !activeGoalRaw || activeGoalRaw !== draft;

    if (isNewGoal) {
      // Sao lưu câu trả lời cũ trước khi xóa
      const oldAnswers = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers);
      const oldResult = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult);
      if (oldAnswers) {
        localStorage.setItem("feasibilityBackupAnswers", oldAnswers);
        setShowRestoreBanner(true);
      }
      if (oldResult) {
        localStorage.setItem("feasibilityBackupResult", oldResult);
      }

      // Xóa kết quả và câu trả lời cũ trong localStorage
      localStorage.removeItem(APP_STORAGE_KEYS.pendingFeasibilityResult);
      localStorage.removeItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers);
      // Cập nhật mục tiêu đang hoạt động hiện tại
      localStorage.setItem("feasibilityActiveGoal", draft);
    } else {
      // Nếu không phải goal mới, xem có backup cũ chưa được xử lý không để dọn dẹp
      localStorage.removeItem("feasibilityBackupAnswers");
      localStorage.removeItem("feasibilityBackupResult");
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

    if (!isNewGoal) {
      const savedAnswers = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers);
      if (savedAnswers) {
        try {
          const parsed = JSON.parse(savedAnswers);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const restoredAnswers = parsed as Record<number, string>;
            setAnswers(restoredAnswers);
            setShowAdvancedQuestions(hasAdvancedAnswerDraft(restoredAnswers));
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

  const activeQuestions = showAdvancedQuestions ? QUESTIONS : CORE_QUESTIONS;

  useEffect(() => {
    if (currentStep < activeQuestions.length) return;
    setCurrentStep(Math.max(activeQuestions.length - 1, 0));
  }, [activeQuestions.length, currentStep]);

  useScrollToTopOnChange(currentStep, {
    targetRef: questionTopRef,
    focusRef: questionHeadingRef,
    enabled: setupState === "ready" && Boolean(pendingGoal && wheelScore !== null && !result),
  });

  if (setupState === "checking") {
    return (
      <>
        <ScreenGuide {...SCREEN_GUIDES.feasibility} autoOpen />
        <CoreFlowGateState
          currentStepId="feasibility"
          eyebrow="Kiểm tra"
          title="Đang chuẩn bị phần kiểm tra tính thực tế"
          description="Đang đọc lại mục tiêu và dữ liệu trọng tâm trước khi bắt đầu."
          loading
        />
      </>
    );
  }

  if (setupState === "needs_life_balance") {
    return (
      <>
        <ScreenGuide {...SCREEN_GUIDES.feasibility} autoOpen />
        <CoreFlowGateState
          currentStepId="life_balance"
          eyebrow="Kiểm tra"
          title="Hoàn thành bước cân bằng trước"
          description="Phần kiểm tra cần điểm cân bằng thật để biết mục tiêu đang dựa trên khu vực nào."
          actionLabel="Bắt đầu cân bằng"
          onAction={() => navigate("/onboarding")}
        />
      </>
    );
  }

  if (setupState === "needs_life_insight") {
    return (
      <>
        <ScreenGuide {...SCREEN_GUIDES.feasibility} autoOpen />
        <CoreFlowGateState
          currentStepId="life_insight"
          eyebrow="Kiểm tra"
          title="Chọn trọng tâm trước"
          description="Bạn đã có dữ liệu cân bằng nhưng chưa chọn lĩnh vực ưu tiên cho mục tiêu này."
          actionLabel="Mở bước chọn trọng tâm"
          onAction={() => navigate("/life-insight")}
        />
      </>
    );
  }

  if (setupState === "needs_smart_goal") {
    return (
      <>
        <ScreenGuide {...SCREEN_GUIDES.feasibility} autoOpen />
        <CoreFlowGateState
          currentStepId="smart_goal"
          eyebrow="Kiểm tra"
          title="Viết mục tiêu trước"
          description="Phần kiểm tra cần một mục tiêu đủ rõ về kết quả, chỉ số, mức cam kết và thời hạn."
          actionLabel="Viết mục tiêu"
          onAction={() => navigate("/smart-goal-setup")}
        />
      </>
    );
  }

  if (!pendingGoal || wheelScore === null) {
    return (
      <>
        <ScreenGuide {...SCREEN_GUIDES.feasibility} autoOpen />
        <CoreFlowGateState
          currentStepId="smart_goal"
          eyebrow="Kiểm tra"
          title="Thiếu dữ liệu để kiểm tra"
          description="Chưa đủ thông tin mục tiêu hoặc điểm trọng tâm. Quay lại bước viết mục tiêu để tiếp tục."
          actionLabel="Viết mục tiêu"
          onAction={() => navigate("/smart-goal-setup")}
        />
      </>
    );
  }

  const currentQuestion = activeQuestions[currentStep] ?? activeQuestions[0] ?? QUESTIONS[0];
  const totalSteps = activeQuestions.length;
  const selectedAnswer = answers[currentQuestion.id];
  const activeQuestionIds = activeQuestions.map((question) => question.id);
  const requiredQuestionIds = showAdvancedQuestions ? ALL_QUESTION_IDS : CORE_QUESTION_IDS;
  const answeredQuestionCount = getAnsweredQuestionCount(answers, activeQuestionIds);

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

    if (!hasCompleteFeasibilityAnswers(answers, requiredQuestionIds)) {
      return;
    }

    const completedAnswers = buildFeasibilityAnswersWithDefaults(answers);
    setAnswers(completedAnswers);
    setResult(
      buildResult(completedAnswers, wheelScore, {
        smartGoalQualityLevel: smartGoalQualityLevelRef.current,
        goalArchetype: goalArchetypeRef.current,
      }),
    );
  };

  const handleContinueToPlan = () => {
    if (!result) return;

    const pendingFeasibilityResult: PendingFeasibilityResult = buildPendingFeasibilityResult(result);
    const finalAnswers = buildFeasibilityAnswersWithDefaults(answers);

    const finalAnswersSnapshot = JSON.stringify(finalAnswers);
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
      answer_count: requiredQuestionIds.length,
    });

    toast.success("Đã kiểm tra tính thực tế", {
      description: "Tiếp tục thiết kế kế hoạch 12 tuần.",
    });

    navigate("/12-week-setup");
  };

  const handleRestoreAnswers = () => {
    const backupAnswers = localStorage.getItem("feasibilityBackupAnswers");
    const backupResult = localStorage.getItem("feasibilityBackupResult");

    if (backupAnswers) {
      try {
        const parsed = JSON.parse(backupAnswers);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const restoredAnswers = parsed as Record<number, string>;
          setAnswers(restoredAnswers);
          setShowAdvancedQuestions(hasAdvancedAnswerDraft(restoredAnswers));
          setLastSavedSnapshot(backupAnswers);
          setLastSavedAt(new Date());
          localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers, backupAnswers);
        }
      } catch {
        // Ignore
      }
    }

    if (backupResult) {
      try {
        const parsedResult = JSON.parse(backupResult);
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
          localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityResult, backupResult);
        }
      } catch {
        // Ignore
      }
    }

    localStorage.removeItem("feasibilityBackupAnswers");
    localStorage.removeItem("feasibilityBackupResult");
    setShowRestoreBanner(false);
    toast.success("Đã khôi phục các câu trả lời khả thi trước đó.");
  };

  const handleDiscardBackup = () => {
    localStorage.removeItem("feasibilityBackupAnswers");
    localStorage.removeItem("feasibilityBackupResult");
    setShowRestoreBanner(false);
  };

  const handleAdjustGoal = () => {
    navigate("/smart-goal-setup");
  };

  const handleAdvancedToggle = () => {
    const currentQuestionId = currentQuestion.id;
    const nextShowAdvanced = !showAdvancedQuestions;
    const nextQuestions = nextShowAdvanced ? QUESTIONS : CORE_QUESTIONS;
    const nextStep = nextQuestions.findIndex((question) => question.id === currentQuestionId);

    setShowAdvancedQuestions(nextShowAdvanced);
    setCurrentStep(nextStep >= 0 ? nextStep : Math.min(currentStep, nextQuestions.length - 1));
  };

  const autoSave = <AutoSaveIndicator status={isDirty ? autoSaveStatus : "saved"} lastSavedAt={lastSavedAt} />;
  const resultAnswers = buildFeasibilityAnswersWithDefaults(answers);

  if (result) {
    return (
      <PageShell maxWidth="md">
        <ScreenGuide {...SCREEN_GUIDES.feasibility} autoOpen />
        <div className="space-y-4 sm:space-y-6">
          <div>
            <CoreFlowProgress
              currentStepId="feasibility"
              onExit={() => navigate("/")}
              className="mb-1 sm:mb-2"
              compactOnMobile
            />
            <div className="flex justify-end">{autoSave}</div>
          </div>

          <ResultStep
            result={result}
            focusArea={focusArea}
            pendingGoal={pendingGoal}
            onContinue={handleContinueToPlan}
            onAdjustGoal={handleAdjustGoal}
            answers={resultAnswers}
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="xl">
      <ScreenGuide {...SCREEN_GUIDES.feasibility} autoOpen />
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex-1">
            <CoreFlowProgress
              currentStepId="feasibility"
              onExit={() => navigate("/")}
              className="mb-1 sm:mb-2"
              compactOnMobile
            />
          </div>
          <div className="shrink-0 flex items-center justify-end">{autoSave}</div>
        </div>

        <section aria-labelledby="feasibility-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
            {getLifeAreaLabel(focusArea)} · Hiệu chuẩn khả thi
          </p>
          <h1
            id="feasibility-title"
            className="mt-2 break-words font-serif text-[27px] font-medium leading-[1.08] tracking-[-0.02em] text-app-ink sm:mt-3 sm:text-4xl sm:leading-tight"
          >
            Hiệu chuẩn cán cân khả thi
          </h1>
          <p className="mt-1.5 max-w-2xl break-words text-[13px] leading-[1.55] text-app-ink-soft sm:mt-2 sm:text-sm sm:leading-6">
            Cùng chuẩn bị hành trang phù hợp để đảm bảo kế hoạch 12 tuần của bạn chắc thắng.
          </p>

          <MotionFadeIn>
            <div className="mt-3 rounded-card border border-app-line bg-app-bg-subtle p-3.5 shadow-app-sm sm:mt-6 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-app-ink-muted sm:mb-2 sm:text-xs">
                    Mục tiêu của bạn
                  </p>
                  <p className="break-words text-[13px] font-bold leading-[1.55] text-app-ink sm:text-sm sm:leading-relaxed">
                    {pendingGoal.specific}
                  </p>
                </div>
                <Link
                  to="/smart-goal-setup"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control px-3 py-2 text-xs font-bold leading-tight text-app-accent transition-colors hover:text-app-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:-m-2"
                >
                  Sửa mục tiêu ✏️
                </Link>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2 text-xs sm:mt-4">
                <span className="rounded-pill bg-app-accent text-white px-3 py-1 font-semibold shadow-app-sm">
                  {getLifeAreaLabel(focusArea)}
                </span>
                <span className="rounded-pill border border-app-line bg-app-surface px-3 py-1 font-semibold text-app-ink-soft">
                  Điểm nền tảng: {wheelScore}/10
                </span>
              </div>
            </div>
          </MotionFadeIn>

          {/* Banner khôi phục câu trả lời cũ */}
          {showRestoreBanner && (
            <MotionFadeIn>
              <div className="mt-4 flex flex-col gap-3 rounded-card border border-app-status-warning/30 bg-app-status-warning/5 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-app-status-warning flex items-center gap-1.5">
                    <span>💡</span> Phát hiện câu trả lời cũ
                  </p>
                  <p className="text-xs text-app-ink-soft leading-normal">
                    Bạn vừa cập nhật mục tiêu SMART. Bạn có muốn khôi phục lại các câu trả lời khả thi trước đó không?
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDiscardBackup}
                    className="inline-flex min-h-11 items-center justify-center px-3.5 py-1.5 text-xs font-semibold rounded-control border border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg-subtle transition-all duration-200"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreAnswers}
                    className="inline-flex min-h-11 items-center justify-center px-4 py-1.5 text-xs font-bold rounded-control bg-app-accent text-white hover:bg-app-accent-hover transition-all duration-200 shadow-app-sm"
                  >
                    Khôi phục ✏️
                  </button>
                </div>
              </div>
            </MotionFadeIn>
          )}
        </section>

        {/* Layout Grid 2 cột trên Desktop (cột cán cân sticky), di động cán cân đảo xuống dưới câu hỏi */}
        <div className="mt-4 flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start md:gap-8 lg:mt-8">
          {/* Cột trái chứa câu hỏi khảo sát */}
          <div className="order-1 md:col-span-7 w-full">
            <div className="mb-3 rounded-card border border-app-line bg-app-surface/70 p-3 shadow-app-sm sm:mb-4 sm:p-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                    Mặc định 3 câu cốt lõi
                  </p>
                  <p className="hidden text-[13.5px] leading-[1.6] text-app-ink-soft sm:block sm:text-sm sm:leading-6">
                    Time, Energy và Confidence là đủ để tạo kết quả khả thi. Mở phần nâng cao nếu bạn muốn tinh chỉnh
                    thêm Clarity, Obstacle, Routine và Resources.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAdvancedToggle}
                  aria-expanded={showAdvancedQuestions}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border border-app-line bg-app-surface px-3.5 py-2 text-sm font-bold leading-tight text-app-ink transition-all duration-200 hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:px-4 sm:py-2.5"
                >
                  <SlidersHorizontal className="h-4 w-4 text-app-accent" aria-hidden="true" />
                  {showAdvancedQuestions ? "Ẩn nâng cao" : "Mở nâng cao"}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-app-ink-muted transition-transform",
                      showAdvancedQuestions && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold sm:mt-3">
                <span className="rounded-pill bg-app-accent-soft px-3 py-1 text-app-accent">
                  {CORE_QUESTION_IDS.length} câu cốt lõi
                </span>
                <span
                  className={cn(
                    "rounded-pill border px-3 py-1",
                    showAdvancedQuestions
                      ? "border-app-accent/25 bg-app-accent-soft text-app-accent"
                      : "border-app-line bg-app-bg-subtle text-app-ink-muted",
                  )}
                >
                  {ADVANCED_QUESTION_IDS.length} câu nâng cao tùy chọn
                </span>
              </div>
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

          {/* Cột phải chứa Cán cân (Desktop nằm bên cạnh sticky; Mobile nằm dưới câu hỏi làm preview) */}
          <div className="order-2 md:col-span-5 w-full md:sticky md:top-24">
            <FeasibilityBalanceScale answers={answers} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
