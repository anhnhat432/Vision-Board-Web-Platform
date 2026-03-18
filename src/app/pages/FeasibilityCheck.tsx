import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { getUserData } from "../utils/storage";
import { toast } from "sonner";

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
    question: "How much time can you realistically commit to this goal each week?",
    options: [
      { value: "lt1", label: "Less than 1 hour per week", score: 1 },
      { value: "1to3", label: "1-3 hours per week", score: 2 },
      { value: "3to5", label: "3-5 hours per week", score: 3 },
      { value: "gt5", label: "More than 5 hours per week", score: 4 },
    ],
  },
  {
    id: 2,
    question: "How realistic does this goal feel for you right now?",
    options: [
      { value: "overwhelming", label: "It feels too big and overwhelming", score: 1 },
      { value: "challenging", label: "It feels challenging and hard to sustain", score: 2 },
      { value: "realistic", label: "It feels realistic with effort", score: 3 },
      { value: "very_realistic", label: "It feels very realistic and actionable", score: 4 },
    ],
  },
  {
    id: 3,
    question: "What is the biggest obstacle that may stop you from completing this goal?",
    options: [
      { value: "motivation", label: "Lack of motivation", score: 1 },
      { value: "time", label: "Time management", score: 2 },
      { value: "resources", label: "Limited resources or knowledge", score: 2 },
      { value: "none", label: "No major obstacles", score: 4 },
    ],
  },
  {
    id: 4,
    question: "How consistent are you currently with similar habits or self-improvement efforts?",
    options: [
      { value: "rarely", label: "Rarely follow through", score: 1 },
      { value: "sometimes", label: "Sometimes, but often lose momentum", score: 2 },
      { value: "mostly", label: "Mostly consistent with some setbacks", score: 3 },
      { value: "always", label: "Very consistent and disciplined", score: 4 },
    ],
  },
  {
    id: 5,
    question: "How committed are you to making this specific goal happen?",
    options: [
      { value: "exploring", label: "Just exploring, not serious yet", score: 1 },
      { value: "interested", label: "Interested, but not urgent", score: 2 },
      { value: "ready", label: "Ready to start soon", score: 3 },
      { value: "committed", label: "Fully committed, starting now", score: 4 },
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
      title: "This goal looks realistic for you right now.",
      summary: "Your current readiness and life context suggest that this goal is well matched to your situation.",
      recommendation: "You can move forward with this goal as planned.",
      readinessScore,
      adjustedScore,
      wheelScore,
    };
  }

  if (adjustedScore >= 10) {
    return {
      type: "challenging",
      title: "This goal is challenging but possible.",
      summary: "You can likely achieve this goal, but it may require structure, consistency, and small milestones.",
      recommendation: "Consider breaking this goal into smaller milestones and tracking progress weekly.",
      readinessScore,
      adjustedScore,
      wheelScore,
    };
  }

  return {
    type: "too_ambitious",
    title: "This goal may be too ambitious right now.",
    summary: "Based on your current readiness and life balance, this goal may be too demanding at the moment.",
    recommendation: "Consider reducing the scope, extending the timeline, or starting with a smaller first step.",
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

    const storedFocusArea = localStorage.getItem("selected_focus_area");
    const draft = localStorage.getItem("pending_smart_goal");

    if (!storedFocusArea || !draft) {
      toast.info("Please complete your SMART goal first.");
      navigate("/smart-goal-setup");
      return;
    }

    let parsedDraft: unknown;
    try {
      parsedDraft = JSON.parse(draft);
    } catch {
      toast.info("Your SMART goal draft was invalid. Please review it.");
      navigate("/smart-goal-setup");
      return;
    }

    if (!isPendingSMARTGoal(parsedDraft)) {
      toast.info("Your SMART goal draft is incomplete. Please complete it.");
      navigate("/smart-goal-setup");
      return;
    }

    const data = getUserData();
    const areaData = data.currentWheelOfLife.find((area) => area.name === storedFocusArea);

    if (!areaData) {
      toast.info("Please complete your life insight first.");
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

    localStorage.setItem("pending_feasibility_result", JSON.stringify(pendingFeasibilityResult));
    localStorage.setItem("pending_feasibility_answers", JSON.stringify(answers));

    toast.success("Feasibility checked", {
      description: "Continue to build your 12-week execution plan.",
    });

    navigate("/12-week-plan-setup");
  };

  const handleAdjustGoal = () => {
    navigate("/smart-goal-setup");
  };

  const isAnswered = answers[currentQuestion.id] !== undefined;

  if (result) {
    const iconMap: Record<ResultType, JSX.Element> = {
      realistic: <CheckCircle2 className="w-10 h-10 text-white" />,
      challenging: <TrendingUp className="w-10 h-10 text-white" />,
      too_ambitious: <AlertTriangle className="w-10 h-10 text-white" />,
    };

    const colorMap: Record<ResultType, { bg: string; badge: string; border: string }> = {
      realistic: {
        bg: "from-green-500 to-emerald-500",
        badge: "bg-green-50 border-green-200 text-green-800",
        border: "border-green-400",
      },
      challenging: {
        bg: "from-yellow-500 to-orange-400",
        badge: "bg-yellow-50 border-yellow-200 text-yellow-800",
        border: "border-yellow-400",
      },
      too_ambitious: {
        bg: "from-orange-500 to-red-500",
        badge: "bg-orange-50 border-orange-200 text-orange-800",
        border: "border-orange-400",
      },
    };

    const colors = colorMap[result.type];

    return (
      <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <Card className={`bg-white rounded-3xl shadow-2xl border-2 ${colors.border}`}>
            <CardHeader className="text-center space-y-4 pb-6">
              <div className={`mx-auto w-20 h-20 bg-gradient-to-br ${colors.bg} rounded-2xl flex items-center justify-center`}>
                {iconMap[result.type]}
              </div>
              <CardTitle className="text-3xl">{result.title}</CardTitle>
              <p className="text-gray-600 text-base">{result.summary}</p>
            </CardHeader>

            <CardContent className="space-y-6 p-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <Target className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                  <p className="text-xs text-gray-500 mb-1">Focus Area</p>
                  <p className="font-semibold text-sm text-gray-800">{focusArea}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs text-gray-500 mb-1">Wheel Score</p>
                  <p className="font-semibold text-2xl text-gray-800">
                    {result.wheelScore}
                    <span className="text-xs text-gray-400">/10</span>
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
                  <p className="text-xs text-gray-500 mb-1">Readiness</p>
                  <p className="font-semibold text-2xl text-gray-800">
                    {result.readinessScore}
                    <span className="text-xs text-gray-400">/20</span>
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl p-5 border-2 ${colors.badge}`}>
                <p className="font-semibold mb-1">Recommendation</p>
                <p className="text-sm">{result.recommendation}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button
                  className="flex-1 h-12 text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-lg"
                  onClick={handleContinueToPlan}
                >
                  <ArrowRight className="mr-2 w-4 h-4" />
                  {result.type === "too_ambitious" ? "Build a Smaller 12-Week Plan" : "Continue to 12-Week Plan"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-base border-2 border-gray-300 hover:bg-gray-50 rounded-2xl"
                  onClick={handleAdjustGoal}
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Adjust Goal
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-white rounded-3xl shadow-2xl border-0">
          <CardHeader className="space-y-4 pb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Question {currentStep + 1} of {totalSteps}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <CardTitle className="text-3xl text-center">Is this goal realistic for you right now?</CardTitle>

            <p className="text-center text-base text-gray-600">
              For your <span className="font-semibold text-purple-600">{focusArea}</span> goal, answer a few quick
              questions so we can check whether this goal is realistic, challenging, or too ambitious right now.
            </p>
          </CardHeader>

          <CardContent className="space-y-8 p-8">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-semibold text-gray-800">{currentQuestion.question}</h3>

              <RadioGroup
                value={answers[currentQuestion.id]}
                onValueChange={handleAnswerChange}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <motion.div
                    key={option.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Label
                      htmlFor={option.value}
                      className={`flex items-center space-x-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        answers[currentQuestion.id] === option.value
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <span className="flex-1 text-base">{option.label}</span>
                      {answers[currentQuestion.id] === option.value && (
                        <CheckCircle2 className="w-5 h-5 text-purple-500" />
                      )}
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </motion.div>

            <div className="flex gap-4 pt-6">
              <Button
                variant="outline"
                className="flex-1 h-12 text-base border-2 border-gray-300 hover:bg-gray-50 rounded-2xl"
                onClick={handleBack}
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>

              <Button
                className="flex-1 h-12 text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleNext}
                disabled={!isAnswered}
              >
                {currentStep < totalSteps - 1 ? "Next" : "Complete Assessment"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
