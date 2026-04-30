import { Compass, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { type PendingSMARTGoal, parsePendingSMARTGoal, parseSmartGoal } from "@/lib/smart-goal";
import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
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
import { buildResult } from "./FeasibilityCheck/helpers";
import type { PendingFeasibilityResult, ResultData } from "./FeasibilityCheck/types";

export function FeasibilityCheck() {
  const navigate = useNavigate();
  const hasGuardedRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [focusArea, setFocusArea] = useState<string>("");
  const [wheelScore, setWheelScore] = useState<number | null>(null);
  const [pendingGoal, setPendingGoal] = useState<PendingSMARTGoal | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const questionTopRef = useRef<HTMLDivElement | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (hasGuardedRef.current) return;
    hasGuardedRef.current = true;

    const storedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const draft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    const data = getUserData();

    if (!hasRealLifeBalance(data)) {
      toast.info("Vui lòng hoàn thành Life Balance trước khi kiểm tra tính khả thi.");
      setIsInitializing(false);
      navigate("/onboarding");
      return;
    }

    if (!storedFocusArea || !draft) {
      toast.info("Vui lòng hoàn thành bước viết mục tiêu trước.");
      setIsInitializing(false);
      navigate("/smart-goal-setup");
      return;
    }

    let parsedDraft: unknown;
    try {
      parsedDraft = JSON.parse(draft);
    } catch {
      toast.info("Bản nháp mục tiêu của bạn không hợp lệ. Vui lòng kiểm tra lại.");
      setIsInitializing(false);
      navigate("/smart-goal-setup");
      return;
    }

    const normalizedSmartGoal = parseSmartGoal(parsedDraft, storedFocusArea);
    if (normalizedSmartGoal) {
      localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, JSON.stringify(normalizedSmartGoal));
    }

    const normalizedPendingGoal = parsePendingSMARTGoal(normalizedSmartGoal ?? parsedDraft, storedFocusArea);

    if (!normalizedPendingGoal) {
      toast.info("Bản nháp mục tiêu của bạn chưa hoàn chỉnh. Vui lòng hoàn thành nó.");
      setIsInitializing(false);
      navigate("/smart-goal-setup");
      return;
    }

    const areaData = getScoredLifeArea(data, storedFocusArea);

    if (!areaData) {
      toast.info("Vui lòng hoàn thành phần góc nhìn cuộc sống trước.");
      setIsInitializing(false);
      navigate("/life-insight");
      return;
    }

    setFocusArea(storedFocusArea);
    setWheelScore(areaData.score);
    setPendingGoal(normalizedPendingGoal);
    setIsInitializing(false);
  }, [navigate]);

  useScrollToTopOnChange(currentStep, {
    targetRef: questionTopRef,
    focusRef: questionHeadingRef,
    enabled: !isInitializing && Boolean(pendingGoal && wheelScore !== null && !result),
  });

  if (isInitializing) {
    return (
      <CoreFlowGateState
        currentStepId="feasibility"
        eyebrow="Kiểm tra"
        title="Đang chuẩn bị phần kiểm tra tính khả thi"
        description="Mình đang đọc lại mục tiêu và dữ liệu chọn trọng tâm trước khi bắt đầu đánh giá."
        loading
      />
    );
  }

  if (!pendingGoal || wheelScore === null) {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Kiểm tra"
        title="Thiếu dữ liệu để mở bài đánh giá"
        description="Không tìm thấy đủ thông tin mục tiêu hoặc điểm trọng tâm. Mở lại bước viết mục tiêu để tiếp tục."
        actionLabel="Quay lại viết mục tiêu"
        onAction={() => navigate("/smart-goal-setup")}
      />
    );
  }

  const currentQuestion = QUESTIONS[currentStep];
  const totalSteps = QUESTIONS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const selectedAnswer = answers[currentQuestion.id];

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
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    setResult(buildResult(answers, wheelScore));
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
      description: "Tiếp tục thiết kế kế hoạch 12 tuần cho mục tiêu của bạn.",
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
    <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-7xl space-y-6"
      >
        <CoreFlowProgress currentStepId="feasibility" />

        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-5 sm:p-6 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

            <div className="relative max-w-4xl">
              <div className="space-y-5 sm:space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Kiểm tra tính thực tế
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-3xl font-bold tracking-normal sm:text-4xl lg:text-5xl">
                    Kiểm tra xem mục tiêu này có thực tế với bạn ở thời điểm hiện tại hay không.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Đây không phải là bài kiểm tra để ngăn bạn lại. Nó giúp bạn biết nên giữ nguyên, chia nhỏ hay điều
                    chỉnh mục tiêu để hành trình phía sau bền vững hơn.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    {getLifeAreaLabel(focusArea)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Điểm hiện tại: {wheelScore}/10
                  </Badge>
                </div>
              </div>

              <div className="hidden rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>
                    Câu hỏi {currentStep + 1} / {totalSteps}
                  </span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="mt-3 h-2.5 bg-white/20" />

                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Mục tiêu đã viết</p>
                  <p className="mt-2 text-lg font-semibold text-white">{pendingGoal.specific}</p>
                </div>
                <div className="mt-4 rounded-[24px] border border-white/10 bg-black/12 p-4">
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
          selectedAnswer={selectedAnswer}
          onAnswerChange={handleAnswerChange}
          onBack={handleBack}
          onNext={handleNext}
          targetRef={questionTopRef}
          headingRef={questionHeadingRef}
        />
      </motion.div>
    </div>
  );
}
