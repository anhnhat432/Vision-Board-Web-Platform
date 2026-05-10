import { Compass, Sparkles, Target } from "lucide-react";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
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
import { PageShell } from "../components/PageShell";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
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

export function FeasibilityCheck() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const hasGuardedRef = useRef(false);
  const [setupState, setSetupState] = useState<FeasibilitySetupState>("checking");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
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

    setFocusArea(storedFocusArea);
    setWheelScore(areaData.score);
    setPendingGoal(normalizedPendingGoal);
    setSetupState("ready");
  }, []);

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
        title="Hoàn thành Life Balance trước khi kiểm tra tính khả thi"
        description="Phần kiểm tra cần điểm cân bằng thật để biết mục tiêu đang dựa trên khu vực nào. Hãy hoàn thành bước đánh giá trước, rồi quay lại kiểm tra."
        actionLabel="Bắt đầu Life Balance"
        onAction={() => navigate("/onboarding")}
        secondaryActionLabel="Về bảng điều khiển"
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
        actionLabel="Mở Life Insight"
        onAction={() => navigate("/life-insight")}
        secondaryActionLabel="Bắt đầu Life Balance"
        onSecondaryAction={() => navigate("/onboarding")}
      />
    );
  }

  if (setupState === "needs_smart_goal") {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Kiểm tra"
        title="Viết SMART Goal trước khi kiểm tra tính khả thi"
        description="Phần kiểm tra cần một mục tiêu đủ rõ về kết quả, chỉ số, mức cam kết và thời hạn. Quay lại bước viết mục tiêu để hoàn thiện bản nháp."
        actionLabel="Quay lại viết mục tiêu"
        onAction={() => navigate("/smart-goal-setup")}
        secondaryActionLabel="Mở Life Insight"
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

    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityResult, JSON.stringify(pendingFeasibilityResult));
    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers, JSON.stringify(answers));
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
    <PageShell maxWidth="hero">
      <div className={prefersReducedMotion ? "stack-section" : "animate-fade-in-up stack-section"}>
        <CoreFlowProgress currentStepId="feasibility" onExit={() => navigate("/")} />

        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-5 sm:p-6 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

            <div className="relative max-w-4xl">
              <div className="stack-stack sm:stack-section">
                <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Kiểm tra tính thực tế
                </div>

                <div className="stack-tight sm:stack-stack">
                  <h1 className="max-w-4xl text-2xl font-bold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
                    Mục tiêu này có{" "}
                    <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent dark:from-violet-200 dark:via-fuchsia-200 dark:to-rose-200">
                      khả thi
                    </span>{" "}
                    với bạn lúc này không?
                  </h1>
                  <p className="hidden max-w-2xl text-base leading-8 text-white/82 sm:block lg:text-lg">
                    Không phải bài kiểm tra chặn lại — giúp bạn biết nên giữ nguyên, chia nhỏ hay điều chỉnh mục tiêu
                    trước khi vào kế hoạch 12 tuần.
                  </p>
                  <p className="max-w-2xl text-sm leading-6 text-white/82 sm:hidden">
                    Giúp biết nên giữ nguyên, chia nhỏ hay điều chỉnh mục tiêu trước khi vào kế hoạch 12 tuần.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-[var(--r-pill)] border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    {getLifeAreaLabel(focusArea)}
                  </Badge>
                  <Badge variant="outline" className="rounded-[var(--r-pill)] border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Điểm hiện tại: {wheelScore}/10
                  </Badge>
                </div>
              </div>

              <div className="hidden rounded-[var(--r-card)] border border-white/14 bg-white/12 p-6 shadow-sm">
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>
                    Câu hỏi {currentStep + 1} / {totalSteps}
                  </span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="mt-[var(--space-inline)] h-2.5 bg-white/20" />

                <div className="mt-6 rounded-[var(--r-card)] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Mục tiêu đã viết</p>
                  <p className="mt-2 text-lg font-semibold text-white">{pendingGoal.specific}</p>
                </div>
                <div className="mt-4 rounded-[var(--r-card)] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Khung thời gian</p>
                  <p className="mt-2 text-sm font-semibold text-white">{pendingGoal.timeBound}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
