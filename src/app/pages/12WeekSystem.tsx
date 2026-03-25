import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { CountUp } from "../components/ui/count-up";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Reveal } from "../components/ui/reveal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  APP_STORAGE_KEYS,
  Goal,
  UniversalDailyCheckIn,
  UniversalScoreboardWeek,
  UniversalWeeklyReview,
  formatCalendarDate,
  formatDateInputValue,
  getCalendarDateKey,
  getFeasibilityResultLabel,
  getLifeAreaLabel,
  getReviewDayLabel,
  getUserData,
  upgradeLegacyGoalToSystem,
  updateGoal,
} from "../utils/storage";
import { celebrateSpark, celebrateSpotlight } from "../utils/experience";
import {
  BarChart3,
  CalendarDays,
  CheckCheck,
  CircleHelp,
  Compass,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface DailyFormState {
  didWorkToday: boolean;
  whichLeadIndicatorWorkedOn: string;
  amountDone: string;
  outputCreated: string;
  obstacleOrIssue: string;
  dailySelfRating: number;
  optionalNote: string;
}

interface WeeklyFormState {
  leadCompletionPercent: string;
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  nextWeekPriority: string;
  workloadDecision: UniversalWeeklyReview["workloadDecision"];
  reviewCompleted: boolean;
  progressScore: number;
  disciplineScore: number;
  focusScore: number;
  improvementScore: number;
  outputQualityScore: number;
}

const TEXT = {
  pageTitle: "Hệ thống 12 tuần",
  guideBtn: "Hướng dẫn sử dụng",
  sectionVision: "Tầm nhìn 12 tuần",
  sectionSmart: "Mục tiêu SMART 12 tuần",
  sectionMainMetric: "Chỉ số kết quả chính",
  sectionLead: "Chỉ số hành động dẫn dắt",
  sectionMilestones: "Các cột mốc 4–8–12 tuần",
  sectionDaily: "Cập nhật mỗi ngày",
  sectionWeekly: "Đánh giá hằng tuần",
  sectionScore: "Bảng điểm 12 tuần",
  sectionPlans: "Kế hoạch theo từng tuần",
  emptyTitle: "Bạn chưa có hệ thống 12 tuần",
  emptyMessage:
    "Hãy tạo hệ thống 12 tuần từ mục tiêu của bạn để bắt đầu theo dõi tiến trình.",
  emptyButton: "Tạo hệ thống 12 tuần",
  tip:
    "Trang này giúp bạn biến mục tiêu thành một hệ thống hành động trong 12 tuần. Hãy dùng phần Cập nhật mỗi ngày để ghi nhận tiến trình hàng ngày và phần Đánh giá hàng tuần để kiểm tra xem bạn có đang đi đúng hướng hay không.",
};

const WORKLOAD_OPTIONS: Array<{ value: UniversalWeeklyReview["workloadDecision"]; label: string }> = [
  { value: "keep same", label: "Giữ nguyên" },
  { value: "reduce slightly", label: "Giảm nhẹ" },
  { value: "increase slightly", label: "Tăng nhẹ" },
];

const PHASE_ORDER = ["Foundation", "Build / Acceleration", "Finish / Execution"];

const PHASE_LABELS: Record<string, string> = {
  Foundation: "Nền tảng",
  "Build / Acceleration": "Tăng tốc",
  "Finish / Execution": "Về đích",
};

function createDefaultScoreboard(): UniversalScoreboardWeek[] {
  return Array.from({ length: 12 }, (_, index) => ({
    weekNumber: index + 1,
    leadCompletionPercent: 0,
    mainMetricProgress: "",
    outputDone: "",
    reviewDone: false,
    weeklyScore: 0,
  }));
}

function getActiveGoalWithSystem(goals: Goal[], preferredGoalId: string | null): Goal | null {
  const goalsWithSystem = goals.filter((goal) => Boolean(goal.twelveWeekSystem));
  if (goalsWithSystem.length === 0) return null;

  if (preferredGoalId) {
    const preferred = goalsWithSystem.find((goal) => goal.id === preferredGoalId);
    if (preferred) return preferred;
  }

  return goalsWithSystem.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  })[0];
}

function getActiveGoalWithPlan(goals: Goal[], preferredGoalId: string | null): Goal | null {
  const goalsWithPlan = goals.filter((goal) => Boolean(goal.twelveWeekPlan));
  if (goalsWithPlan.length === 0) return null;

  if (preferredGoalId) {
    const preferred = goalsWithPlan.find((goal) => goal.id === preferredGoalId);
    if (preferred) return preferred;
  }

  return goalsWithPlan.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  })[0];
}

function formatDate(dateString: string): string {
  return formatCalendarDate(dateString);
}

function parseLagMetricPercent(current: string, target: string): number | null {
  // Try "N/M" pattern
  const fractionMatch = current.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[2]);
    if (den > 0) return Math.min(100, Math.round((num / den) * 100));
  }

  // Try "N%" pattern
  const percentMatch = current.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) return Math.min(100, Math.round(parseFloat(percentMatch[1])));

  // Try plain number against target
  const numVal = parseFloat(current);
  const tgtVal = parseFloat(target);
  if (!isNaN(numVal) && !isNaN(tgtVal) && tgtVal > 0) {
    return Math.min(100, Math.round((numVal / tgtVal) * 100));
  }

  return null;
}

export function TwelveWeekSystem() {
  const navigate = useNavigate();
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [legacyPlanGoal, setLegacyPlanGoal] = useState<Goal | null>(null);
  const [allGoalsWithSystem, setAllGoalsWithSystem] = useState<Goal[]>([]);

  const [dailyForm, setDailyForm] = useState<DailyFormState>({
    didWorkToday: false,
    whichLeadIndicatorWorkedOn: "",
    amountDone: "",
    outputCreated: "",
    obstacleOrIssue: "",
    dailySelfRating: 3,
    optionalNote: "",
  });

  const [weeklyForm, setWeeklyForm] = useState<WeeklyFormState>({
    leadCompletionPercent: "",
    lagProgressValue: "",
    biggestOutputThisWeek: "",
    mainObstacle: "",
    nextWeekPriority: "",
    workloadDecision: "",
    reviewCompleted: true,
    progressScore: 5,
    disciplineScore: 5,
    focusScore: 5,
    improvementScore: 5,
    outputQualityScore: 5,
  });

  const loadGoalData = (preferredId?: string) => {
    const data = getUserData();
    const goalsWithSystem = data.goals.filter((g) => Boolean(g.twelveWeekSystem));
    setAllGoalsWithSystem(goalsWithSystem);

    const preferredSystemGoalId =
      preferredId ??
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId) ??
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekGoalId);
    const goal = getActiveGoalWithSystem(data.goals, preferredSystemGoalId);

    if (goal) {
      setActiveGoal(goal);
      setLegacyPlanGoal(null);
      localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goal.id);
      localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goal.id);

      const firstLeadIndicator = goal.twelveWeekSystem?.leadIndicators?.[0]?.name ?? "";
      setDailyForm((prev) => ({
        ...prev,
        whichLeadIndicatorWorkedOn: prev.whichLeadIndicatorWorkedOn || firstLeadIndicator,
      }));
      return;
    }

    const preferredPlanGoalId =
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekPlanGoalId) ??
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekGoalId);
    const legacyGoal = getActiveGoalWithPlan(data.goals, preferredPlanGoalId);

    if (legacyGoal && upgradeLegacyGoalToSystem(legacyGoal.id)) {
      const refreshedData = getUserData();
      const upgradedGoal = getActiveGoalWithSystem(refreshedData.goals, legacyGoal.id);
      if (upgradedGoal) {
        setActiveGoal(upgradedGoal);
        setLegacyPlanGoal(null);
        setAllGoalsWithSystem(refreshedData.goals.filter((g) => Boolean(g.twelveWeekSystem)));
        localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, upgradedGoal.id);
        localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, upgradedGoal.id);
        toast.success("Đã khôi phục kế hoạch 12 tuần cũ sang command center mới.");
        return;
      }
    }

    setLegacyPlanGoal(legacyGoal);
    if (legacyGoal) {
      localStorage.setItem(APP_STORAGE_KEYS.latest12WeekPlanGoalId, legacyGoal.id);
    }
    setActiveGoal(null);
  };

  const handleUpgradeLegacyPlan = () => {
    if (!legacyPlanGoal) return;
    if (!upgradeLegacyGoalToSystem(legacyPlanGoal.id)) {
      toast.error("Không thể nâng cấp kế hoạch cũ này.");
      return;
    }

    toast.success("Đã nâng cấp kế hoạch cũ sang hệ thống 12 tuần mới.");
    loadGoalData(legacyPlanGoal.id);
  };

  useEffect(() => {
    loadGoalData();
  }, []);

  const system = activeGoal?.twelveWeekSystem;
  const currentWeek = Math.min(Math.max(system?.currentWeek ?? 1, 1), 12);

  const currentWeekReview = useMemo(() => {
    if (!system) return null;
    return system.weeklyReviews.find((review) => review.weekNumber === currentWeek) ?? null;
  }, [system, currentWeek]);

  const currentWeekScore = useMemo(() => {
    if (!system) return null;
    return system.scoreboard.find((week) => week.weekNumber === currentWeek) ?? null;
  }, [system, currentWeek]);

  const latestDailyCheckIn = useMemo(() => {
    if (!system || system.dailyCheckIns.length === 0) return null;
    const sorted = [...system.dailyCheckIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0];
  }, [system]);

  const completedReviewsCount = useMemo(() => {
    if (!system) return 0;
    return system.weeklyReviews.filter((review) => review.reviewCompleted).length;
  }, [system]);

  const averageWeeklyScore = useMemo(() => {
    if (!system || system.scoreboard.length === 0) return 0;
    const reviewedWeeks = system.scoreboard.filter(
      (week) =>
        week.reviewDone ||
        week.weeklyScore > 0 ||
        week.leadCompletionPercent > 0 ||
        Boolean(week.mainMetricProgress) ||
        Boolean(week.outputDone),
    );

    if (reviewedWeeks.length === 0) return 0;

    const total = reviewedWeeks.reduce((sum, week) => sum + week.weeklyScore, 0);
    return Math.round(total / reviewedWeeks.length);
  }, [system]);

  const groupedPlans = useMemo(() => {
    if (!system) return {};
    return system.weeklyPlans.reduce<Record<string, typeof system.weeklyPlans>>((acc, plan) => {
      if (!acc[plan.phaseName]) acc[plan.phaseName] = [];
      acc[plan.phaseName].push(plan);
      return acc;
    }, {});
  }, [system]);

  useEffect(() => {
    if (!system) return;
    if (currentWeekReview) {
      setWeeklyForm({
        leadCompletionPercent: String(currentWeekReview.leadCompletionPercent),
        lagProgressValue: currentWeekReview.lagProgressValue ?? system.lagMetric.currentValue ?? "",
        biggestOutputThisWeek: currentWeekReview.biggestOutputThisWeek,
        mainObstacle: currentWeekReview.mainObstacle,
        nextWeekPriority: currentWeekReview.nextWeekPriority,
        workloadDecision: currentWeekReview.workloadDecision,
        reviewCompleted: currentWeekReview.reviewCompleted,
        progressScore: currentWeekReview.progressScore ?? 5,
        disciplineScore: currentWeekReview.disciplineScore ?? 5,
        focusScore: currentWeekReview.focusScore ?? 5,
        improvementScore: currentWeekReview.improvementScore ?? 5,
        outputQualityScore: currentWeekReview.outputQualityScore ?? 5,
      });
      return;
    }

    setWeeklyForm({
      leadCompletionPercent: "",
      lagProgressValue: system.lagMetric.currentValue ?? "",
      biggestOutputThisWeek: "",
      mainObstacle: "",
      nextWeekPriority: "",
      workloadDecision: "",
      reviewCompleted: true,
      progressScore: 5,
      disciplineScore: 5,
      focusScore: 5,
      improvementScore: 5,
      outputQualityScore: 5,
    });
  }, [system, currentWeek, currentWeekReview]);

  const handleDailySubmit = () => {
    if (!activeGoal || !system) return;

    const todayKey = formatDateInputValue(new Date());
    const dailyCheckIn: UniversalDailyCheckIn = {
      date: new Date().toISOString(),
      didWorkToday: dailyForm.didWorkToday,
      whichLeadIndicatorWorkedOn: dailyForm.whichLeadIndicatorWorkedOn.trim(),
      amountDone: dailyForm.amountDone.trim(),
      outputCreated: dailyForm.outputCreated.trim(),
      obstacleOrIssue: dailyForm.obstacleOrIssue.trim(),
      dailySelfRating: dailyForm.dailySelfRating,
      optionalNote: dailyForm.optionalNote.trim(),
    };

    const existingTodayIndex = system.dailyCheckIns.findIndex(
      (c) => getCalendarDateKey(c.date) === todayKey,
    );
    const updatedCheckIns =
      existingTodayIndex >= 0
        ? system.dailyCheckIns.map((c, i) => (i === existingTodayIndex ? dailyCheckIn : c))
        : [dailyCheckIn, ...system.dailyCheckIns].slice(0, 120);

    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        dailyCheckIns: updatedCheckIns,
      },
    });

    if (dailyForm.didWorkToday) {
      celebrateSpark({ x: 0.84, y: 0.14 });
    }

    toast.success("Đã khóa lại nhịp làm việc hôm nay.", {
      description: dailyForm.didWorkToday
        ? "Một tín hiệu hành động mới vừa được ghi vào hệ 12 tuần của bạn."
        : "Bạn vẫn có một mốc check-in rõ ràng để nhìn lại ngày hôm nay.",
    });
    setDailyForm((prev) => ({
      ...prev,
      didWorkToday: false,
      amountDone: "",
      outputCreated: "",
      obstacleOrIssue: "",
      optionalNote: "",
    }));
    loadGoalData();
  };

  const handleTogglePlanCompleted = (weekNumber: number) => {
    if (!activeGoal || !system) return;
    const updatedPlans = system.weeklyPlans.map((plan) =>
      plan.weekNumber === weekNumber ? { ...plan, completed: !plan.completed } : plan,
    );
    updateGoal(activeGoal.id, {
      twelveWeekSystem: { ...system, weeklyPlans: updatedPlans },
    });
    loadGoalData();
  };

  const handleWeeklySubmit = () => {
    if (!activeGoal || !system) return;

    const leadCompletionPercent = Number(weeklyForm.leadCompletionPercent);
    if (Number.isNaN(leadCompletionPercent) || leadCompletionPercent < 0 || leadCompletionPercent > 100) {
      toast.error("Vui lòng nhập tỷ lệ hoàn thành hành động từ 0 đến 100.");
      return;
    }
    if (!weeklyForm.lagProgressValue.trim()) {
      toast.error("Vui lòng cập nhật giá trị chỉ số kết quả chính.");
      return;
    }

    const outputCompletionPercent = weeklyForm.biggestOutputThisWeek.trim() ? 100 : 0;
    const reviewCompletionPercent = weeklyForm.reviewCompleted ? 100 : 0;
    const weeklyScore = Math.round(
      leadCompletionPercent * 0.5 + outputCompletionPercent * 0.3 + reviewCompletionPercent * 0.2,
    );

    const existingReview = system.weeklyReviews.find((review) => review.weekNumber === currentWeek);
    const updatedReview: UniversalWeeklyReview = {
      weekNumber: currentWeek,
      leadCompletionPercent,
      lagProgressValue: weeklyForm.lagProgressValue.trim(),
      biggestOutputThisWeek: weeklyForm.biggestOutputThisWeek.trim(),
      mainObstacle: weeklyForm.mainObstacle.trim(),
      nextWeekPriority: weeklyForm.nextWeekPriority.trim(),
      workloadDecision: weeklyForm.workloadDecision,
      reviewCompleted: weeklyForm.reviewCompleted,
      progressScore: weeklyForm.progressScore,
      disciplineScore: weeklyForm.disciplineScore,
      focusScore: weeklyForm.focusScore,
      improvementScore: weeklyForm.improvementScore,
      outputQualityScore: weeklyForm.outputQualityScore,
    };

    const updatedReviews = [
      ...system.weeklyReviews.filter((item) => item.weekNumber !== currentWeek),
      updatedReview,
    ].sort((a, b) => a.weekNumber - b.weekNumber);

    const normalizedScoreboard = system.scoreboard.length === 12 ? system.scoreboard : createDefaultScoreboard();
    const updatedScoreboard = normalizedScoreboard.map((item) =>
      item.weekNumber !== currentWeek
        ? item
        : {
            weekNumber: currentWeek,
            leadCompletionPercent,
            mainMetricProgress: weeklyForm.lagProgressValue.trim(),
            outputDone: weeklyForm.biggestOutputThisWeek.trim(),
            reviewDone: weeklyForm.reviewCompleted,
            weeklyScore,
          },
    );

    let nextWeek = system.currentWeek;
    const wasReviewCompleted = existingReview?.reviewCompleted ?? false;
    if (weeklyForm.reviewCompleted && !wasReviewCompleted && currentWeek < 12) {
      nextWeek = currentWeek + 1;
    }
    const progressedToNextWeek = nextWeek > currentWeek;

    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        lagMetric: {
          ...system.lagMetric,
          currentValue: weeklyForm.lagProgressValue.trim(),
        },
        weeklyReviews: updatedReviews,
        scoreboard: updatedScoreboard,
        currentWeek: nextWeek,
      },
    });

    if (weeklyForm.reviewCompleted || weeklyScore >= 80) {
      celebrateSpotlight({ x: 0.84, y: 0.14 });
    } else {
      celebrateSpark({ x: 0.84, y: 0.14 });
    }

    toast.success("Đánh giá tuần đã được chốt.", {
      description: progressedToNextWeek
        ? `Tuần ${currentWeek} đã khóa lại. Bạn đang bước sang tuần ${nextWeek} với một nhịp rõ ràng hơn.`
        : `Điểm tuần hiện tại là ${weeklyScore}/100. Bạn có thể tiếp tục tinh chỉnh trước khi sang tuần mới.`,
    });
    loadGoalData();
  };

  return (
    <div className="space-y-8 pb-12">
      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="relative p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_22%)] opacity-90" />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Compass className="h-4 w-4" />
                12-Week Command Center
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                  Theo dõi một mục tiêu 12 tuần như đang điều hành một hệ thống, không chỉ đánh dấu checklist.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                  Bạn có thể cập nhật mỗi ngày, review mỗi tuần, xem bảng điểm và toàn bộ kế hoạch theo giai đoạn
                  trong cùng một nơi. Mục tiêu là giữ nhịp thực thi rõ ràng và ổn định.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => setGuideOpen(true)}
                  className="border-white/18 bg-white text-slate-900 hover:bg-white/92"
                >
                  <CircleHelp className="h-4 w-4" />
                  {TEXT.guideBtn}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/18 bg-white/12 text-white hover:bg-white/18 hover:text-white"
                  onClick={() => navigate("/goals")}
                >
                  Xem tất cả goal
                </Button>
              </div>

              {allGoalsWithSystem.length > 1 && (
                <div className="mt-4">
                  <Label className="text-xs text-white/60">Chuyển mục tiêu 12 tuần</Label>
                  <Select
                    value={activeGoal?.id ?? ""}
                    onValueChange={(value) => loadGoalData(value)}
                  >
                    <SelectTrigger className="mt-1 border-white/18 bg-white/10 text-white">
                      <SelectValue placeholder="Chọn mục tiêu" />
                    </SelectTrigger>
                    <SelectContent>
                      {allGoalsWithSystem.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                Tại sao trang này quan trọng
              </p>
              <div className="mt-5 space-y-3 text-sm leading-7 text-white/74">
                <div className="rounded-[22px] border border-white/10 bg-black/12 p-4">
                  Ghi lại tín hiệu hành động mỗi ngày thay vì chỉ chờ kết quả cuối kỳ.
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/12 p-4">
                  Review hàng tuần để điều chỉnh tải công việc và ưu tiên.
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/12 p-4">
                  Theo dõi bảng điểm 12 tuần để nhìn rõ nhịp độ thật, không phán đoán cảm tính.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!activeGoal || !system ? (
        <Reveal delay={0.04}>
          <Card className="overflow-hidden">
          <CardContent className="p-10 text-center lg:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-50 text-violet-700">
              <Sparkles className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900">
              {legacyPlanGoal ? "Bạn đang có một kế hoạch 12 tuần theo flow cũ" : TEXT.emptyTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
              {legacyPlanGoal
                ? "Trang command center hiện chỉ hiển thị system 12 tuần đầy đủ. Kế hoạch cũ của bạn vẫn còn nguyên và có thể mở từ overview legacy."
                : TEXT.emptyMessage}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {legacyPlanGoal && (
                <Button variant="outline" onClick={() => navigate("/12-week-plan-overview")}>
                  Mở kế hoạch legacy
                </Button>
              )}
              {legacyPlanGoal && (
                <Button variant="outline" onClick={handleUpgradeLegacyPlan}>
                  Khôi phục vào command center mới
                </Button>
              )}
              <Button onClick={() => navigate("/life-insight")}>
                {legacyPlanGoal ? "Tạo system 12 tuần mới" : TEXT.emptyButton}
              </Button>
            </div>
          </CardContent>
          </Card>
        </Reveal>
      ) : (
        <>
          <Reveal>
            <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Tuần hiện tại",
                value: (
                  <>
                    <CountUp value={currentWeek} />
                    <span className="text-slate-400">/12</span>
                  </>
                ),
                note: `Review vào ${getReviewDayLabel(system.reviewDay)}`,
                icon: CalendarDays,
                color: "from-violet-500/18 to-fuchsia-500/10 text-violet-700",
              },
              {
                title: "Điểm tuần này",
                value: currentWeekScore?.reviewDone
                  ? <CountUp value={currentWeekScore.weeklyScore} />
                  : <span className="text-slate-400">--</span>,
                note: currentWeekScore?.reviewDone ? "trên thang 100" : "Chưa có review tuần này",
                icon: TrendingUp,
                color: "from-emerald-500/18 to-teal-500/10 text-emerald-700",
              },
              {
                title: "Review đã xong",
                value: <CountUp value={completedReviewsCount} />,
                note: "tuần đã hoàn tất",
                icon: CheckCheck,
                color: "from-sky-500/18 to-cyan-500/10 text-sky-700",
              },
              {
                title: "Điểm trung bình",
                value: <CountUp value={averageWeeklyScore} />,
                note: "toàn bộ chu kỳ hiện tại",
                icon: BarChart3,
                color: "from-amber-500/18 to-orange-500/10 text-amber-700",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title}>
                  <Card className="relative overflow-hidden">
                    <div
                      className={`absolute inset-x-5 top-0 h-20 rounded-b-[28px] bg-gradient-to-br ${item.color} blur-2xl`}
                    />
                    <CardHeader className="relative flex flex-row items-start justify-between pb-3">
                      <div>
                        <CardDescription>{item.title}</CardDescription>
                        <CardTitle className="mt-2 text-4xl">{item.value}</CardTitle>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <p className="text-sm text-slate-500">{item.note}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            </div>
          </Reveal>

          <Reveal delay={0.04} className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{TEXT.sectionVision}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-gray-700">{system.vision12Week}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{TEXT.sectionSmart}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Mục tiêu: {activeGoal.title}</Badge>
                <Badge variant="outline">Lĩnh vực: {getLifeAreaLabel(activeGoal.focusArea || activeGoal.category)}</Badge>
                <Badge variant="outline">Độ khả thi: {activeGoal.feasibilityResult ? getFeasibilityResultLabel(activeGoal.feasibilityResult) : "Chưa có"}</Badge>
              </div>
              <p className="text-sm text-gray-600">Hạn mục tiêu: {formatDate(activeGoal.deadline)}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{TEXT.sectionMainMetric}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Tên chỉ số</p>
                <p className="mt-1 font-semibold text-gray-800">{system.lagMetric.name}</p>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Mục tiêu</p>
                <p className="mt-1 font-semibold text-gray-800">{system.lagMetric.target} {system.lagMetric.unit}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Tiến độ hiện tại</p>
                <p className="mt-1 font-semibold text-gray-800">{system.lagMetric.currentValue || "Chưa cập nhật"}</p>
                {(() => {
                  const pct = parseLagMetricPercent(system.lagMetric.currentValue ?? "", system.lagMetric.target ?? "");
                  return pct !== null ? (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Tiến độ</span>
                        <span className="font-semibold text-gray-700">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2.5" />
                    </div>
                  ) : null;
                })()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{TEXT.sectionLead}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {system.leadIndicators.map((indicator, index) => (
                <div key={`${indicator.name}-${index}`} className="rounded-xl border bg-white p-4">
                  <p className="font-medium text-gray-800">{indicator.name}</p>
                  <p className="mt-1 text-sm text-gray-600">Mục tiêu: {indicator.target} {indicator.unit}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{TEXT.sectionMilestones}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase tracking-wide text-gray-500">Tuần 4</p><p className="mt-1 text-sm text-gray-700">{system.milestones.week4 || "Chưa đạt cột mốc"}</p></div>
              <div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase tracking-wide text-gray-500">Tuần 8</p><p className="mt-1 text-sm text-gray-700">{system.milestones.week8 || "Chưa đạt cột mốc"}</p></div>
              <div className="rounded-xl border bg-white p-4"><p className="text-xs uppercase tracking-wide text-gray-500">Tuần 12</p><p className="mt-1 text-sm text-gray-700">{system.milestones.week12 || "Chưa đạt cột mốc"}</p></div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{TEXT.sectionDaily}</CardTitle>
              <CardDescription>Ghi nhanh hôm nay bạn đã làm gì cho mục tiêu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
                <Checkbox id="did-work-today" checked={dailyForm.didWorkToday} onCheckedChange={(checked) => setDailyForm((prev) => ({ ...prev, didWorkToday: checked === true }))} />
                <Label htmlFor="did-work-today">Hôm nay tôi đã hành động cho mục tiêu này</Label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Hành động đã làm</Label>
                  <Select value={dailyForm.whichLeadIndicatorWorkedOn} onValueChange={(value) => setDailyForm((prev) => ({ ...prev, whichLeadIndicatorWorkedOn: value }))}>
                    <SelectTrigger><SelectValue placeholder="Chọn hành động" /></SelectTrigger>
                    <SelectContent>
                      {system.leadIndicators.map((indicator, index) => (
                        <SelectItem key={`${indicator.name}-${index}`} value={indicator.name}>{indicator.name}</SelectItem>
                      ))}
                      <SelectItem value="Khác">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Khối lượng đã làm</Label>
                  <Input value={dailyForm.amountDone} onChange={(event) => setDailyForm((prev) => ({ ...prev, amountDone: event.target.value }))} placeholder="Ví dụ: 2 buổi, 45 phút..." />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kết quả tạo ra hôm nay</Label>
                <Textarea rows={2} value={dailyForm.outputCreated} onChange={(event) => setDailyForm((prev) => ({ ...prev, outputCreated: event.target.value }))} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Trở ngại / vấn đề</Label>
                  <Textarea rows={2} value={dailyForm.obstacleOrIssue} onChange={(event) => setDailyForm((prev) => ({ ...prev, obstacleOrIssue: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tự chấm mức tập trung (1-5)</Label>
                  <Select value={String(dailyForm.dailySelfRating)} onValueChange={(value) => setDailyForm((prev) => ({ ...prev, dailySelfRating: Number(value) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1, 2, 3, 4, 5].map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ghi chú thêm (tùy chọn)</Label>
                <Textarea rows={2} value={dailyForm.optionalNote} onChange={(event) => setDailyForm((prev) => ({ ...prev, optionalNote: event.target.value }))} />
              </div>

              <Button onClick={handleDailySubmit} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                Lưu cập nhật mỗi ngày
              </Button>

              {latestDailyCheckIn && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-sm text-purple-800">
                  Cập nhật gần nhất: {formatDate(latestDailyCheckIn.date)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{TEXT.sectionWeekly}</CardTitle>
              <CardDescription>Tuần hiện tại: <span className="font-semibold">Tuần {currentWeek}/12</span> | Ngày đánh giá: <span className="font-semibold">{getReviewDayLabel(system.reviewDay)}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tỷ lệ hoàn thành hành động dẫn dắt (%)</Label>
                  <Input type="number" min={0} max={100} value={weeklyForm.leadCompletionPercent} onChange={(event) => setWeeklyForm((prev) => ({ ...prev, leadCompletionPercent: event.target.value }))} placeholder="0 - 100" />
                </div>
                <div className="space-y-2">
                  <Label>Tiến độ chỉ số kết quả chính</Label>
                  <Input value={weeklyForm.lagProgressValue} onChange={(event) => setWeeklyForm((prev) => ({ ...prev, lagProgressValue: event.target.value }))} placeholder="Ví dụ: 45%, 6kg, 20 đơn..." />
                </div>
              </div>

              <div className="space-y-2">
                  <Label>Kết quả nổi bật nhất trong tuần</Label>
                <Textarea rows={2} value={weeklyForm.biggestOutputThisWeek} onChange={(event) => setWeeklyForm((prev) => ({ ...prev, biggestOutputThisWeek: event.target.value }))} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2"><Label>Trở ngại chính</Label><Textarea rows={2} value={weeklyForm.mainObstacle} onChange={(event) => setWeeklyForm((prev) => ({ ...prev, mainObstacle: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Ưu tiên cho tuần sau</Label><Textarea rows={2} value={weeklyForm.nextWeekPriority} onChange={(event) => setWeeklyForm((prev) => ({ ...prev, nextWeekPriority: event.target.value }))} /></div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quyết định khối lượng</Label>
                  <Select value={weeklyForm.workloadDecision} onValueChange={(value) => setWeeklyForm((prev) => ({ ...prev, workloadDecision: value as UniversalWeeklyReview["workloadDecision"] }))}>
                    <SelectTrigger><SelectValue placeholder="Chọn quyết định" /></SelectTrigger>
                    <SelectContent>{WORKLOAD_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
                  <Checkbox id="weekly-review-completed" checked={weeklyForm.reviewCompleted} onCheckedChange={(checked) => setWeeklyForm((prev) => ({ ...prev, reviewCompleted: checked === true }))} />
                  <Label htmlFor="weekly-review-completed">Đã hoàn thành đánh giá tuần này</Label>
                </div>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
                <p className="mb-3 text-sm font-semibold text-violet-700">Chấm điểm 5 chiều (1–10)</p>
                <div className="grid gap-3 md:grid-cols-5">
                  {[
                    { key: "progressScore" as const, label: "Tiến độ" },
                    { key: "disciplineScore" as const, label: "Kỷ luật" },
                    { key: "focusScore" as const, label: "Tập trung" },
                    { key: "improvementScore" as const, label: "Cải thiện" },
                    { key: "outputQualityScore" as const, label: "Chất lượng" },
                  ].map((dim) => (
                    <div key={dim.key} className="space-y-1">
                      <Label className="text-xs">{dim.label}</Label>
                      <Select
                        value={String(weeklyForm[dim.key])}
                        onValueChange={(v) => setWeeklyForm((prev) => ({ ...prev, [dim.key]: Number(v) }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-800">
                Điểm tuần: <span className="font-semibold">{currentWeekScore?.weeklyScore ?? 0}</span> / 100
              </div>

              <Button onClick={handleWeeklySubmit} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                Lưu đánh giá hàng tuần
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader><CardTitle className="text-xl">{TEXT.sectionScore}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {system.scoreboard.map((week) => (
                <div key={week.weekNumber} className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center justify-between"><p className="font-semibold text-gray-800">Tuần {week.weekNumber}</p><Badge variant="outline">{week.weeklyScore} điểm</Badge></div>
                  <p className="text-xs text-gray-600">Tỷ lệ hoàn thành: <span className="font-medium">{week.leadCompletionPercent}%</span></p>
                  <p className="text-xs text-gray-600">Chỉ số chính: <span className="font-medium">{week.mainMetricProgress || "Chưa cập nhật"}</span></p>
                  <p className="text-xs text-gray-600">Đầu ra: <span className="font-medium">{week.outputDone || "Chưa có"}</span></p>
                  <p className="text-xs text-gray-600">Đã review: <span className="font-medium">{week.reviewDone ? "Có" : "Chưa"}</span></p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-lg">
            <CardHeader><CardTitle className="text-xl">{TEXT.sectionPlans}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {PHASE_ORDER.map((phase) => {
                const plans = groupedPlans[phase] ?? [];
                if (plans.length === 0) return null;

                return (
                  <div key={phase} className="space-y-3">
                    <h3 className="text-base font-semibold text-gray-800">{PHASE_LABELS[phase] || phase}</h3>
                    <div className="space-y-2">
                      {plans.map((plan) => (
                        <div key={plan.weekNumber} className={`rounded-xl border bg-white p-4 ${plan.completed ? "border-emerald-200 bg-emerald-50/50" : ""}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={Boolean(plan.completed)}
                              onCheckedChange={() => handleTogglePlanCompleted(plan.weekNumber)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium ${plan.completed ? "text-emerald-700 line-through" : "text-gray-800"}`}>Tuần {plan.weekNumber}</p>
                              <p className={`mt-1 text-sm ${plan.completed ? "text-emerald-600/70 line-through" : "text-gray-600"}`}>{plan.focus}</p>
                              {plan.milestone && <p className="mt-2 text-xs text-purple-700">Cột mốc: <span className="font-medium">{plan.milestone}</span></p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          </Reveal>
        </>
      )}

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>{TEXT.guideBtn}</DialogTitle>
            <DialogDescription>Hướng dẫn chi tiết cho người mới bắt đầu với hệ thống 12 tuần.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1 text-sm leading-7 text-gray-700">
            <section>
              <h3 className="text-base font-semibold text-gray-900">1. Hệ thống 12 tuần là gì?</h3>
              <p>Hệ thống 12 tuần là nơi bạn biến mục tiêu của mình thành kế hoạch hành động rõ ràng trong 12 tuần. Thay vì chỉ đặt mục tiêu rồi bỏ đó, bạn sẽ theo dõi mỗi ngày, đánh giá mỗi tuần và thấy tiến trình theo từng giai đoạn.</p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-gray-900">2. Cách dùng từng phần</h3>
              <div className="space-y-2">
                <p><span className="font-semibold">A. {TEXT.sectionVision}:</span> Bức tranh bạn muốn đạt được sau 12 tuần.</p>
                <p><span className="font-semibold">B. {TEXT.sectionSmart}:</span> Mục tiêu cụ thể, rõ ràng và đo được.</p>
                <p><span className="font-semibold">C. {TEXT.sectionMainMetric}:</span> Kết quả quan trọng nhất để đo tiến độ.</p>
                <p><span className="font-semibold">D. {TEXT.sectionLead}:</span> Các hành động lặp lại mỗi tuần để tạo kết quả.</p>
                <p><span className="font-semibold">E. {TEXT.sectionMilestones}:</span> Điểm kiểm tra giữa chặng để điều chỉnh kịp thời.</p>
                <p><span className="font-semibold">F. {TEXT.sectionDaily}:</span> Ghi nhanh hôm nay bạn đã làm gì cho mục tiêu.</p>
                <p><span className="font-semibold">G. {TEXT.sectionWeekly}:</span> Nhìn lại tiến độ, khó khăn và ưu tiên tuần tiếp theo.</p>
                <p><span className="font-semibold">H. {TEXT.sectionScore}:</span> Xem tiến trình từng tuần một cách rõ ràng.</p>
                <p><span className="font-semibold">I. {TEXT.sectionPlans}:</span> Danh sách 12 tuần gồm trọng tâm và cột mốc.</p>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold text-gray-900">3. Cách sử dụng hàng ngày và hàng tuần</h3>
              <div className="space-y-2">
                <p><span className="font-semibold">Hàng ngày:</span> Cuối ngày, mở phần cập nhật mỗi ngày, đánh dấu bạn có hành động hay không và ghi ngắn gọn kết quả hoặc vấn đề gặp phải.</p>
                <p><span className="font-semibold">Hàng tuần:</span> Đến ngày đánh giá, cập nhật chỉ số kết quả chính, tỷ lệ hoàn thành hành động và chọn 1 ưu tiên rõ nhất cho tuần sau.</p>
                <p><span className="font-semibold">Tuần 4 / 8 / 12:</span> Xem lại cột mốc, điều chỉnh khối lượng công việc nếu cần và tiếp tục duy trì.</p>
              </div>
            </section>

            <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <h3 className="mb-2 text-base font-semibold text-amber-900">4. Lưu ý cho người mới bắt đầu</h3>
              <p className="text-amber-900">Bạn không cần làm mọi thứ hoàn hảo ngay từ ngày đầu tiên.</p>
              <p className="text-amber-900">Hãy bắt đầu đơn giản: cập nhật mỗi ngày thật ngắn, đánh giá mỗi tuần thật đều.</p>
              <p className="text-amber-900">Mục tiêu của hệ thống này là giúp bạn duy trì sự nhất quán, không tạo áp lực quá mức.</p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-gray-900">5. Nếu bạn chưa có hệ thống 12 tuần</h3>
              <p>Trước tiên hãy tạo mục tiêu, sau đó tạo hệ thống 12 tuần.</p>
              <p>Khi đã có hệ thống, hãy quay lại trang này thường xuyên để cập nhật và đánh giá tiến trình.</p>
            </section>
          </div>

          <DialogFooter>
            <Button onClick={() => setGuideOpen(false)} className="bg-gradient-to-r from-purple-500 to-pink-500">
              Đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
