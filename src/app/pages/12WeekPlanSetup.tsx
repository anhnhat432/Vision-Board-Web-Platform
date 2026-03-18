import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, ArrowRight, CalendarDays, Target } from "lucide-react";
import { motion } from "motion/react";
import { addGoal } from "../utils/storage";
import { toast } from "sonner";

interface PendingSMARTGoal {
  focusArea: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

type ResultType = "realistic" | "challenging" | "too_ambitious";

interface PendingFeasibilityResult {
  resultType: ResultType;
  resultTitle: string;
  resultSummary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
}

interface TwelveWeekPlanDraft {
  week12Outcome: string;
  weeklyAction1: string;
  weeklyAction2: string;
  weeklyAction3: string;
  successMetric: string;
  reviewDay: string;
}

const REVIEW_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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

function isPendingFeasibilityResult(value: unknown): value is PendingFeasibilityResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;

  return (
    (result.resultType === "realistic" || result.resultType === "challenging" || result.resultType === "too_ambitious") &&
    typeof result.resultTitle === "string" &&
    typeof result.resultSummary === "string" &&
    typeof result.recommendation === "string" &&
    typeof result.readinessScore === "number" &&
    typeof result.adjustedScore === "number" &&
    typeof result.wheelScore === "number"
  );
}

function extractDeadline(_timeBound: string): string {
  const timeBound = (_timeBound || "").trim();
  const now = new Date();

  const isoDateMatch = timeBound.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoDateMatch) {
    const parsed = new Date(`${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  }

  const monthYearMatch = timeBound.match(
    /\b(?:by\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i
  );
  if (monthYearMatch) {
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const monthIndex = monthNames.indexOf(monthYearMatch[1].toLowerCase());
    const year = Number(monthYearMatch[2]);
    if (monthIndex >= 0 && year > 1900) {
      const parsed = new Date(Date.UTC(year, monthIndex, 1));
      return parsed.toISOString().split("T")[0];
    }
  }

  const monthsMatch = timeBound.match(/\b(?:within|in)\s+(\d+)\s+months?\b/i);
  if (monthsMatch) {
    const months = Number(monthsMatch[1]);
    if (!Number.isNaN(months) && months > 0) {
      const parsed = new Date(now);
      parsed.setMonth(parsed.getMonth() + months);
      return parsed.toISOString().split("T")[0];
    }
  }

  const weeksMatch = timeBound.match(/\b(?:within|in)\s+(\d+)\s+weeks?\b/i);
  if (weeksMatch) {
    const weeks = Number(weeksMatch[1]);
    if (!Number.isNaN(weeks) && weeks > 0) {
      const parsed = new Date(now);
      parsed.setDate(parsed.getDate() + weeks * 7);
      return parsed.toISOString().split("T")[0];
    }
  }

  const daysMatch = timeBound.match(/\b(?:within|in)\s+(\d+)\s+days?\b/i);
  if (daysMatch) {
    const days = Number(daysMatch[1]);
    if (!Number.isNaN(days) && days > 0) {
      const parsed = new Date(now);
      parsed.setDate(parsed.getDate() + days);
      return parsed.toISOString().split("T")[0];
    }
  }

  const fallback = new Date(now);
  fallback.setMonth(fallback.getMonth() + 6);
  return fallback.toISOString().split("T")[0];
}

function generateInitialTasks() {
  return [
    { id: `task_${Date.now()}_1`, title: "Break down main goal into smaller milestones", completed: false },
    { id: `task_${Date.now()}_2`, title: "Identify and gather necessary resources", completed: false },
    { id: `task_${Date.now()}_3`, title: "Set up progress tracking system", completed: false },
  ];
}

export function TwelveWeekPlanSetup() {
  const navigate = useNavigate();
  const hasInitializedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [smartGoal, setSmartGoal] = useState<PendingSMARTGoal | null>(null);
  const [feasibility, setFeasibility] = useState<PendingFeasibilityResult | null>(null);
  const [focusArea, setFocusArea] = useState("");

  const [planDraft, setPlanDraft] = useState<TwelveWeekPlanDraft>({
    week12Outcome: "",
    weeklyAction1: "",
    weeklyAction2: "",
    weeklyAction3: "",
    successMetric: "",
    reviewDay: "",
  });

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const selectedFocusArea = localStorage.getItem("selected_focus_area");
    const pendingSmartGoal = localStorage.getItem("pending_smart_goal");
    const pendingFeasibilityResult = localStorage.getItem("pending_feasibility_result");

    if (!selectedFocusArea || !pendingSmartGoal) {
      toast.info("Please complete SMART goal setup first.");
      navigate("/smart-goal-setup");
      return;
    }

    if (!pendingFeasibilityResult) {
      toast.info("Please complete feasibility check first.");
      navigate("/feasibility");
      return;
    }

    let parsedSmart: unknown;
    let parsedFeasibility: unknown;

    try {
      parsedSmart = JSON.parse(pendingSmartGoal);
      parsedFeasibility = JSON.parse(pendingFeasibilityResult);
    } catch {
      toast.info("We could not load your draft. Please try again.");
      navigate("/smart-goal-setup");
      return;
    }

    if (!isPendingSMARTGoal(parsedSmart) || !isPendingFeasibilityResult(parsedFeasibility)) {
      toast.info("Your planning data is incomplete. Please retry from SMART goal setup.");
      navigate("/smart-goal-setup");
      return;
    }

    const pendingDraftRaw = localStorage.getItem("pending_12_week_plan_draft");
    if (pendingDraftRaw) {
      try {
        const pendingDraft = JSON.parse(pendingDraftRaw) as Partial<TwelveWeekPlanDraft>;
        setPlanDraft((prev) => ({
          ...prev,
          week12Outcome: typeof pendingDraft.week12Outcome === "string" ? pendingDraft.week12Outcome : prev.week12Outcome,
          weeklyAction1: typeof pendingDraft.weeklyAction1 === "string" ? pendingDraft.weeklyAction1 : prev.weeklyAction1,
          weeklyAction2: typeof pendingDraft.weeklyAction2 === "string" ? pendingDraft.weeklyAction2 : prev.weeklyAction2,
          weeklyAction3: typeof pendingDraft.weeklyAction3 === "string" ? pendingDraft.weeklyAction3 : prev.weeklyAction3,
          successMetric: typeof pendingDraft.successMetric === "string" ? pendingDraft.successMetric : prev.successMetric,
          reviewDay: typeof pendingDraft.reviewDay === "string" ? pendingDraft.reviewDay : prev.reviewDay,
        }));
      } catch {
        // Ignore malformed optional draft.
      }
    }

    setSmartGoal(parsedSmart);
    setFeasibility(parsedFeasibility);
    setFocusArea(selectedFocusArea);
    setIsLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem("pending_12_week_plan_draft", JSON.stringify(planDraft));
  }, [isLoading, planDraft]);

  const handleChange = (key: keyof TwelveWeekPlanDraft, value: string) => {
    setPlanDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!smartGoal || !feasibility) return;

    const weeklyActions = [planDraft.weeklyAction1, planDraft.weeklyAction2, planDraft.weeklyAction3]
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (!planDraft.week12Outcome.trim()) {
      toast.error("Week 12 outcome is required.");
      return;
    }

    if (weeklyActions.length === 0) {
      toast.error("Add at least one weekly action.");
      return;
    }

    if (!planDraft.successMetric.trim()) {
      toast.error("Success metric is required.");
      return;
    }

    if (!planDraft.reviewDay.trim()) {
      toast.error("Please choose a weekly review day.");
      return;
    }

    const description = `This goal focuses on ${smartGoal.specific}. Progress will be measured by ${smartGoal.measurable}, using resources and capabilities such as ${smartGoal.achievable}. It matters because ${smartGoal.relevant}, with a target timeline of ${smartGoal.timeBound}. The feasibility result is: ${feasibility.resultTitle} (readiness score: ${feasibility.readinessScore}/20).`;

    const goalId = addGoal({
      category: smartGoal.focusArea || focusArea,
      title: smartGoal.specific,
      description,
      deadline: extractDeadline(smartGoal.timeBound),
      tasks: generateInitialTasks(),
      feasibilityResult: feasibility.resultTitle,
      readinessScore: feasibility.readinessScore,
      focusArea: smartGoal.focusArea || focusArea,
      twelveWeekPlan: {
        week12Outcome: planDraft.week12Outcome.trim(),
        weeklyActions,
        successMetric: planDraft.successMetric.trim(),
        reviewDay: planDraft.reviewDay,
        currentWeek: 1,
        totalWeeks: 12,
        weeklyCheckIns: [],
      },
    });

    localStorage.setItem("latest_12_week_goal_id", goalId);

    localStorage.removeItem("pending_smart_goal");
    localStorage.removeItem("pending_feasibility_result");
    localStorage.removeItem("readiness_level");
    localStorage.removeItem("readiness_score");
    localStorage.removeItem("pending_feasibility_answers");
    localStorage.removeItem("pending_12_week_plan_draft");

    toast.success("12-week plan created", {
      description: "Your goal and execution plan are now in Goal Tracker.",
    });

    navigate("/12-week-plan-overview");
  };

  const handleBack = () => {
    navigate("/feasibility");
  };

  if (isLoading || !smartGoal || !feasibility) return null;

  return (
    <div className="min-h-screen bg-[#FDF2F8] flex items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <Card className="bg-white rounded-3xl shadow-2xl border-0">
          <CardHeader className="space-y-4 pb-6">
            <CardTitle className="text-3xl text-center">Build Your 12-Week Plan</CardTitle>
            <p className="text-center text-gray-600">
              Turn your SMART goal into a focused 12-week execution plan.
            </p>
          </CardHeader>

          <CardContent className="space-y-6 p-8">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Goal Summary</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-2">
                  <Target className="w-3 h-3 mr-1" />
                  Focus: {focusArea}
                </Badge>
                <Badge variant="outline" className="border-2">
                  <CalendarDays className="w-3 h-3 mr-1" />
                  Feasibility: {feasibility.resultType}
                </Badge>
              </div>
              <p className="text-sm text-gray-700 font-medium">{smartGoal.specific}</p>
              <p className="text-sm text-gray-600">{feasibility.resultTitle}</p>
            </div>

            <div className="space-y-2">
              <Label>By the end of 12 weeks, what result do you want to achieve?</Label>
              <Textarea
                value={planDraft.week12Outcome}
                onChange={(e) => handleChange("week12Outcome", e.target.value)}
                placeholder="Example: Complete my portfolio and submit 20 quality applications"
                className="min-h-[90px] rounded-2xl border-2"
              />
            </div>

            <div className="space-y-3">
              <Label>What 1-3 actions will you repeat each week to move toward this goal?</Label>
              <Input
                value={planDraft.weeklyAction1}
                onChange={(e) => handleChange("weeklyAction1", e.target.value)}
                placeholder="Weekly action 1 (required)"
                className="rounded-xl"
              />
              <Input
                value={planDraft.weeklyAction2}
                onChange={(e) => handleChange("weeklyAction2", e.target.value)}
                placeholder="Weekly action 2 (optional)"
                className="rounded-xl"
              />
              <Input
                value={planDraft.weeklyAction3}
                onChange={(e) => handleChange("weeklyAction3", e.target.value)}
                placeholder="Weekly action 3 (optional)"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>How will you measure your progress each week?</Label>
              <Input
                value={planDraft.successMetric}
                onChange={(e) => handleChange("successMetric", e.target.value)}
                placeholder="Example: Study sessions completed, workouts completed, hours practiced"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Which day will you review your progress each week?</Label>
              <Select value={planDraft.reviewDay} onValueChange={(value) => handleChange("reviewDay", value)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose a review day" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 border-2 border-gray-300 hover:bg-gray-50 rounded-2xl"
                onClick={handleBack}
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
              <Button
                className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl shadow-lg"
                onClick={handleSubmit}
              >
                Create My 12-Week Plan
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
