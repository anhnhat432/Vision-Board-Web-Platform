import { ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { APP_STORAGE_KEYS, getLifeAreaLabel, getUserData } from "../utils/storage";

interface Question {
  id: number;
  question: string;
  options: { value: string; label: string; score: number }[];
}

interface PendingSMARTGoal {
  focusArea: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Mỗi tuần bạn có thể dành chính xác bao nhiêu thời gian cho mục tiêu này?",
    options: [
      { value: "lt1", label: "Dưới 1 giờ mỗi tuần", score: 1 },
      { value: "1to3", label: "1-3 giờ mỗi tuần", score: 2 },
      { value: "3to5", label: "3-5 giờ mỗi tuần", score: 3 },
      { value: "gt5", label: "Hơn 5 giờ mỗi tuần", score: 4 },
    ],
  },
  {
    id: 2,
    question: "Mục tiêu này cảm thấy thực tế đến mức nào với bạn hiện tại?",
    options: [
      { value: "overwhelming", label: "Cảm giác quá lớn và quá sức", score: 1 },
      { value: "challenging", label: "Khó nhưng vẫn có thể chạm tới", score: 2 },
      { value: "realistic", label: "Thực tế nếu tôi giữ kỷ luật", score: 3 },
      { value: "very_realistic", label: "Rất thực tế và hoàn toàn có thể làm", score: 4 },
    ],
  },
  {
    id: 3,
    question: "Trở ngại lớn nhất có thể ngăn bạn hoàn thành mục tiêu này là gì?",
    options: [
      { value: "motivation", label: "Thiếu động lực hoặc dễ mất đà", score: 1 },
      { value: "time", label: "Khó quản lý thời gian", score: 2 },
      { value: "resources", label: "Thiếu nguồn lực hoặc kiến thức", score: 2 },
      { value: "none", label: "Hiện chưa thấy trở ngại lớn nào", score: 4 },
    ],
  },
  {
    id: 4,
    question: "Bạn thường duy trì những thói quen phát triển bản thân ổn định đến mức nào?",
    options: [
      { value: "rarely", label: "Hiếm khi theo đến cùng", score: 1 },
      { value: "sometimes", label: "Có cố gắng nhưng hay mất nhịp", score: 2 },
      { value: "mostly", label: "Khá kiên trì, đôi lúc chệch nhịp", score: 3 },
      { value: "always", label: "Rất kỷ luật và duy trì tốt", score: 4 },
    ],
  },
  {
    id: 5,
    question: "Bạn cam kết biến mục tiêu này thành hiện thực đến mức nào?",
    options: [
      { value: "exploring", label: "Mới chỉ đang cân nhắc", score: 1 },
      { value: "interested", label: "Quan tâm nhưng chưa cấp bách", score: 2 },
      { value: "ready", label: "Sẵn sàng bắt đầu sớm", score: 3 },
      { value: "committed", label: "Cam kết hoàn toàn và bắt đầu ngay", score: 4 },
    ],
  },
];

type ResultType = "realistic" | "challenging" | "too_ambitious";

interface ResultData {
  type: ResultType;
  title: string;
  summary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
}

interface PendingFeasibilityResult {
  resultType: ResultType;
  resultTitle: string;
  resultSummary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
}

function getWheelPenalty(score: number): number {
  if (score <= 3) return 3;
  if (score <= 5) return 2;
  if (score <= 7) return 1;
  return 0;
}

function buildResult(readinessScore: number, wheelScore: number): ResultData {
  const wheelPenalty = getWheelPenalty(wheelScore);
  const adjustedScore = readinessScore - wheelPenalty;

  if (adjustedScore >= 15) {
    return {
      type: "realistic",
      title: "Mục tiêu này khá phù hợp với bạn ở thời điểm hiện tại.",
      summary:
        "Độ sẵn sàng của bạn và bối cảnh cuộc sống hiện tại đang cho thấy đây là một mục tiêu đủ thực tế để bắt đầu.",
      recommendation:
        "Bạn có thể tiến tới bước thiết kế hệ 12 tuần và giữ nhịp đều ngay từ đầu.",
      readinessScore,
      adjustedScore,
      wheelScore,
    };
  }

  if (adjustedScore >= 10) {
    return {
      type: "challenging",
      title: "Mục tiêu này có tính thách thức cao nhưng vẫn khả thi.",
      summary:
        "Bạn có thể đạt được mục tiêu này nếu chia nhỏ đủ tốt và giữ được sự nhất quán trong 12 tuần tới.",
      recommendation:
        "Nên tập trung vào một số hành động dẫn dắt cốt lõi và review hằng tuần thật nghiêm túc.",
      readinessScore,
      adjustedScore,
      wheelScore,
    };
  }

  return {
    type: "too_ambitious",
    title: "Mục tiêu này có thể đang hơi quá sức vào thời điểm hiện tại.",
    summary:
      "Dựa trên độ sẵn sàng và điểm bánh xe cuộc sống của bạn, mục tiêu này có rủi ro cao nếu bắt đầu với quy mô như hiện tại.",
    recommendation:
      "Hãy thu nhỏ phạm vi, kéo dài thời hạn hoặc chọn một bước đệm gần hơn trước khi tăng tốc.",
    readinessScore,
    adjustedScore,
    wheelScore,
  };
}

function isPendingSMARTGoal(value: unknown): value is PendingSMARTGoal {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;

  return (
    typeof draft.focusArea === "string" &&
    typeof draft.specific === "string" &&
    typeof draft.measurable === "string" &&
    typeof draft.achievable === "string" &&
    typeof draft.relevant === "string" &&
    typeof draft.timeBound === "string"
  );
}

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

  useEffect(() => {
    if (hasGuardedRef.current) return;
    hasGuardedRef.current = true;

    const storedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const draft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);

    if (!storedFocusArea || !draft) {
      toast.info("Vui lòng hoàn thành mục tiêu SMART của bạn trước.");
      navigate("/smart-goal-setup");
      return;
    }

    let parsedDraft: unknown;
    try {
      parsedDraft = JSON.parse(draft);
    } catch {
      toast.info("Bản nháp mục tiêu SMART của bạn không hợp lệ. Vui lòng kiểm tra lại.");
      navigate("/smart-goal-setup");
      return;
    }

    if (!isPendingSMARTGoal(parsedDraft)) {
      toast.info("Bản nháp mục tiêu SMART của bạn chưa hoàn chỉnh. Vui lòng hoàn thành nó.");
      navigate("/smart-goal-setup");
      return;
    }

    const data = getUserData();
    const areaData = data.currentWheelOfLife.find((area) => area.name === storedFocusArea);

    if (!areaData) {
      toast.info("Vui lòng hoàn thành phần góc nhìn cuộc sống trước.");
      navigate("/life-insight");
      return;
    }

    setFocusArea(storedFocusArea);
    setWheelScore(areaData.score);
    setPendingGoal({
      ...parsedDraft,
      focusArea: parsedDraft.focusArea || storedFocusArea,
    });
    setIsInitializing(false);
  }, [navigate]);

  if (isInitializing || !pendingGoal || wheelScore === null) {
    return null;
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

    const readinessScore = QUESTIONS.reduce((sum, question) => {
      const answer = answers[question.id];
      const option = question.options.find((choice) => choice.value === answer);
      return sum + (option?.score || 0);
    }, 0);

    setResult(buildResult(readinessScore, wheelScore));
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
    };

    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityResult, JSON.stringify(pendingFeasibilityResult));
    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers, JSON.stringify(answers));

    toast.success("Đã kiểm tra tính khả thi", {
      description: "Tiếp tục thiết kế hệ 12 tuần cho mục tiêu của bạn.",
    });

    navigate("/12-week-setup");
  };

  const handleAdjustGoal = () => {
    navigate("/smart-goal-setup");
  };

  if (result) {
    const iconMap: Record<ResultType, ReactNode> = {
      realistic: <CheckCircle2 className="h-10 w-10 text-white" />,
      challenging: <TrendingUp className="h-10 w-10 text-white" />,
      too_ambitious: <AlertTriangle className="h-10 w-10 text-white" />,
    };

    const styleMap: Record<ResultType, { glow: string; badge: string; title: string }> = {
      realistic: {
        glow: "from-emerald-500/18 to-teal-500/10 text-emerald-700",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
        title: "border-emerald-200/70 bg-[linear-gradient(135deg,_rgba(236,253,245,0.9)_0%,_rgba(240,253,250,0.85)_100%)]",
      },
      challenging: {
        glow: "from-amber-500/18 to-orange-500/10 text-amber-700",
        badge: "border-amber-200 bg-amber-50 text-amber-800",
        title: "border-amber-200/70 bg-[linear-gradient(135deg,_rgba(255,251,235,0.92)_0%,_rgba(255,247,237,0.88)_100%)]",
      },
      too_ambitious: {
        glow: "from-rose-500/18 to-orange-500/10 text-rose-700",
        badge: "border-rose-200 bg-rose-50 text-rose-800",
        title: "border-rose-200/70 bg-[linear-gradient(135deg,_rgba(255,241,242,0.92)_0%,_rgba(255,247,237,0.88)_100%)]",
      },
    };

    const styles = styleMap[result.type];

    return (
      <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-6xl space-y-6"
        >
          <Card className="hero-surface overflow-hidden border-0 text-white">
            <CardContent className="relative p-8 lg:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.1),_transparent_22%)] opacity-90" />

              <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_340px]">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                    <ShieldCheck className="h-4 w-4" />
                    Feasibility Result
                  </div>
                  <div className="space-y-4">
                    <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                      {result.title}
                    </h1>
                    <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                      {result.summary}
                    </p>
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/12">
                    {iconMap[result.type]}
                  </div>
                  <div className={`mt-5 inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${styles.badge}`}>
                    {result.type === "realistic"
                      ? "Đủ thực tế để bắt đầu"
                      : result.type === "challenging"
                        ? "Khó nhưng làm được"
                        : "Cần thu nhỏ hoặc điều chỉnh"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className={`overflow-hidden ${styles.title}`}>
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Lĩnh vực trọng tâm
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {getLifeAreaLabel(focusArea)}
                </p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Điểm bánh xe cuộc sống
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-900">{result.wheelScore}/10</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Độ sẵn sàng
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-900">{result.readinessScore}/20</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card>
              <CardContent className="p-6 lg:p-7">
                <div className="rounded-[26px] border border-white/70 bg-white/72 p-5">
                  <div className="flex items-center gap-2 text-violet-700">
                    <Gauge className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Khuyến nghị</p>
                  </div>
                  <p className="mt-4 text-base leading-8 text-slate-700">{result.recommendation}</p>
                </div>

                <div className="mt-5 rounded-[26px] border border-white/70 bg-white/72 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Mục tiêu bạn đang đánh giá
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">{pendingGoal.specific}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Thời hạn: {pendingGoal.timeBound}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Hướng đi tiếp theo
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    "Nếu tiếp tục, bạn sẽ sang bước dựng hệ 12 tuần.",
                    "Nếu thấy mục tiêu quá nặng, hãy quay lại SMART và chỉnh phạm vi.",
                    "Kế hoạch tốt là kế hoạch bạn có thể giữ nhịp, không phải kế hoạch nghe thật lớn.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[20px] border border-white/70 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button onClick={handleContinueToPlan}>
                    {result.type === "too_ambitious"
                      ? "Dựng hệ 12 tuần nhỏ hơn"
                      : "Dựng hệ 12 tuần"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleAdjustGoal}>
                    <ArrowLeft className="h-4 w-4" />
                    Điều chỉnh mục tiêu SMART
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
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
        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Feasibility Assessment
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Kiểm tra xem mục tiêu này có thực tế với bạn ở thời điểm hiện tại hay không.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Đây không phải là bài kiểm tra để ngăn bạn lại. Nó giúp bạn biết nên giữ nguyên,
                    chia nhỏ hay điều chỉnh mục tiêu để hành trình phía sau bền vững hơn.
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

              <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>Câu hỏi {currentStep + 1} / {totalSteps}</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="mt-3 h-2.5 bg-white/20" />

                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Mục tiêu SMART</p>
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <CardContent className="p-6 lg:p-7">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="rounded-[28px] bg-[linear-gradient(135deg,_rgba(245,243,255,0.95)_0%,_rgba(252,231,243,0.78)_100%)] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                    Câu hỏi {currentStep + 1}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-slate-900">{currentQuestion.question}</h2>
                </div>

                <RadioGroup value={selectedAnswer} onValueChange={handleAnswerChange} className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <motion.div
                      key={option.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Label
                        htmlFor={option.value}
                        className={`flex cursor-pointer items-center gap-4 rounded-[24px] border px-5 py-4 transition-all ${
                          selectedAnswer === option.value
                            ? "border-violet-300 bg-violet-50/90 shadow-[0_18px_36px_-28px_rgba(109,40,217,0.35)]"
                            : "border-white/70 bg-white/72 hover:border-violet-200"
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <p className="text-base font-medium text-slate-800">{option.label}</p>
                        </div>
                        {selectedAnswer === option.value && (
                          <CheckCircle2 className="h-5 w-5 text-violet-600" />
                        )}
                      </Label>
                    </motion.div>
                  ))}
                </RadioGroup>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại
                  </Button>
                  <Button className="flex-1" onClick={handleNext} disabled={!selectedAnswer}>
                    {currentStep < totalSteps - 1 ? "Tiếp theo" : "Hoàn thành đánh giá"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <div className="space-y-6 xl:sticky xl:top-28">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Mục đích của bài này
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    "Biết mục tiêu hiện tại đang vừa sức hay quá tải.",
                    "Nhìn rõ độ sẵn sàng trước khi bước vào system 12 tuần.",
                    "Giảm rủi ro đặt mục tiêu nghe hay nhưng khó duy trì.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[20px] border border-white/70 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
