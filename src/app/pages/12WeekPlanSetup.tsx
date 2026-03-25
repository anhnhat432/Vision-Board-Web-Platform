import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  Sparkles,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import {
  APP_STORAGE_KEYS,
  addGoal,
  clearGoalPlanningDrafts,
  formatDateInputValue,
  getFeasibilityResultLabel,
  getLifeAreaLabel,
  getReviewDayLabel,
  parseCalendarDate,
} from "../utils/storage";
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
    const parsed = parseCalendarDate(`${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`);
    if (parsed) return formatDateInputValue(parsed);
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
      return formatDateInputValue(new Date(year, monthIndex, 1));
    }
  }

  const monthsMatch = timeBound.match(/\b(?:within|in)\s+(\d+)\s+months?\b/i);
  if (monthsMatch) {
    const months = Number(monthsMatch[1]);
    if (!Number.isNaN(months) && months > 0) {
      const parsed = new Date(now);
      parsed.setMonth(parsed.getMonth() + months);
      return formatDateInputValue(parsed);
    }
  }

  const weeksMatch = timeBound.match(/\b(?:within|in)\s+(\d+)\s+weeks?\b/i);
  if (weeksMatch) {
    const weeks = Number(weeksMatch[1]);
    if (!Number.isNaN(weeks) && weeks > 0) {
      const parsed = new Date(now);
      parsed.setDate(parsed.getDate() + weeks * 7);
      return formatDateInputValue(parsed);
    }
  }

  const daysMatch = timeBound.match(/\b(?:within|in)\s+(\d+)\s+days?\b/i);
  if (daysMatch) {
    const days = Number(daysMatch[1]);
    if (!Number.isNaN(days) && days > 0) {
      const parsed = new Date(now);
      parsed.setDate(parsed.getDate() + days);
      return formatDateInputValue(parsed);
    }
  }

  const fallback = new Date(now);
  fallback.setMonth(fallback.getMonth() + 6);
  return formatDateInputValue(fallback);
}

function generateInitialTasks() {
  return [
    { id: `task_${Date.now()}_1`, title: "Chia mục tiêu chính thành các cột mốc nhỏ hơn", completed: false },
    { id: `task_${Date.now()}_2`, title: "Xác định và chuẩn bị các nguồn lực cần thiết", completed: false },
    { id: `task_${Date.now()}_3`, title: "Thiết lập cách theo dõi tiến độ", completed: false },
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

    const selectedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const pendingSmartGoal = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    const pendingFeasibilityResult = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult);

    if (!selectedFocusArea || !pendingSmartGoal) {
      toast.info("Vui lòng hoàn thành phần thiết lập mục tiêu SMART trước.");
      navigate("/smart-goal-setup");
      return;
    }

    if (!pendingFeasibilityResult) {
      toast.info("Vui lòng hoàn thành phần kiểm tra tính khả thi trước.");
      navigate("/feasibility");
      return;
    }

    let parsedSmart: unknown;
    let parsedFeasibility: unknown;

    try {
      parsedSmart = JSON.parse(pendingSmartGoal);
      parsedFeasibility = JSON.parse(pendingFeasibilityResult);
    } catch {
      toast.info("Không thể tải bản nháp hiện tại. Vui lòng thử lại.");
      navigate("/smart-goal-setup");
      return;
    }

    if (!isPendingSMARTGoal(parsedSmart) || !isPendingFeasibilityResult(parsedFeasibility)) {
      toast.info("Dữ liệu lập kế hoạch của bạn chưa đầy đủ. Vui lòng thiết lập lại từ phần SMART.");
      navigate("/smart-goal-setup");
      return;
    }

    const pendingDraftRaw = localStorage.getItem(APP_STORAGE_KEYS.pending12WeekPlanDraft);
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
    localStorage.setItem(APP_STORAGE_KEYS.pending12WeekPlanDraft, JSON.stringify(planDraft));
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
      toast.error("Vui lòng nhập kết quả bạn muốn đạt vào tuần 12.");
      return;
    }

    if (weeklyActions.length === 0) {
      toast.error("Vui lòng nhập ít nhất một hành động hằng tuần.");
      return;
    }

    if (!planDraft.successMetric.trim()) {
      toast.error("Vui lòng nhập chỉ số thành công.");
      return;
    }

    if (!planDraft.reviewDay.trim()) {
      toast.error("Vui lòng chọn ngày đánh giá hằng tuần.");
      return;
    }

    const description = `Mục tiêu này tập trung vào ${smartGoal.specific}. Tiến độ sẽ được đo bằng ${smartGoal.measurable}, với các nguồn lực hoặc điều kiện cần thiết như ${smartGoal.achievable}. Mục tiêu này quan trọng vì ${smartGoal.relevant}. Kết quả đánh giá tính khả thi: ${feasibility.resultTitle} với điểm sẵn sàng ${feasibility.readinessScore}/20.`;

    const goalId = addGoal({
      category: smartGoal.focusArea || focusArea,
      title: smartGoal.specific,
      description,
      deadline: extractDeadline(smartGoal.timeBound),
      tasks: generateInitialTasks(),
      feasibilityResult: feasibility.resultType,
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

    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goalId);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekPlanGoalId, goalId);
    clearGoalPlanningDrafts();

    toast.success("Đã tạo kế hoạch 12 tuần", {
      description: "Mục tiêu và kế hoạch thực thi của bạn đã có trong phần Theo dõi mục tiêu.",
    });

    navigate("/12-week-plan-overview");
  };

  const handleBack = () => {
    navigate("/feasibility");
  };

  if (isLoading || !smartGoal || !feasibility) return null;

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
                  Legacy 12-Week Plan Builder
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Biến mục tiêu SMART thành một kế hoạch 12 tuần gọn, rõ và đủ dễ để duy trì đều.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Flow này giữ tinh thần đơn giản hơn system đầy đủ, nhưng vẫn đủ các yếu tố quan trọng:
                    kết quả tuần 12, các hành động lặp lại và nhịp review cố định.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    Trọng tâm: {getLifeAreaLabel(focusArea)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <CalendarDays className="mr-1 h-3.5 w-3.5" />
                    Khả thi: {getFeasibilityResultLabel(feasibility.resultType)}
                  </Badge>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                  Mục tiêu đầu vào
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">SMART goal</p>
                    <p className="mt-2 text-lg font-semibold text-white">{smartGoal.specific}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Độ khả thi</p>
                    <p className="mt-2 text-lg font-semibold text-white">{feasibility.resultTitle}</p>
                    <p className="mt-1 text-sm text-white/68">{feasibility.resultSummary}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 lg:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-violet-50 text-violet-700">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Kết quả tuần 12</h3>
                    <p className="text-sm text-slate-500">Mô tả thật cụ thể thứ bạn muốn có trong tay khi chu kỳ kết thúc.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Vào cuối 12 tuần, bạn muốn đạt được kết quả gì?</Label>
                  <Textarea
                    value={planDraft.week12Outcome}
                    onChange={(event) => handleChange("week12Outcome", event.target.value)}
                    placeholder="Ví dụ: Hoàn thiện hồ sơ năng lực và nộp 20 đơn ứng tuyển chất lượng."
                    className="min-h-[120px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 lg:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">1-3 hành động lặp lại</h3>
                    <p className="text-sm text-slate-500">Giữ kế hoạch thật gọn để bạn có thể lặp lại đều mỗi tuần.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input
                    value={planDraft.weeklyAction1}
                    onChange={(event) => handleChange("weeklyAction1", event.target.value)}
                    placeholder="Hành động tuần 1"
                  />
                  <Input
                    value={planDraft.weeklyAction2}
                    onChange={(event) => handleChange("weeklyAction2", event.target.value)}
                    placeholder="Hành động tuần 2"
                  />
                  <Input
                    value={planDraft.weeklyAction3}
                    onChange={(event) => handleChange("weeklyAction3", event.target.value)}
                    placeholder="Hành động tuần 3"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 lg:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-sky-50 text-sky-700">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Đo lường và review</h3>
                    <p className="text-sm text-slate-500">Xác định một chỉ số rõ ràng và một ngày review cố định để duy trì nhịp.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Bạn sẽ đo lường tiến độ mỗi tuần như thế nào?</Label>
                    <Input
                      value={planDraft.successMetric}
                      onChange={(event) => handleChange("successMetric", event.target.value)}
                      placeholder="Ví dụ: số buổi học đã hoàn thành, số giờ luyện tập, số đơn đã gửi"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Bạn sẽ xem xét tiến độ vào ngày nào mỗi tuần?</Label>
                    <Select value={planDraft.reviewDay} onValueChange={(value) => handleChange("reviewDay", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn một ngày đánh giá" />
                      </SelectTrigger>
                      <SelectContent>
                        {REVIEW_DAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {getReviewDayLabel(day)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit}>
                    Tạo kế hoạch 12 tuần
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 xl:sticky xl:top-28">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Checklist nhanh
                </p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-[22px] border border-white/70 bg-white/72 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Bạn nên có</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p>1. Một kết quả tuần 12 đủ cụ thể để nhận ra ngay.</p>
                      <p>2. Tối đa 3 hành động hằng tuần, không ôm quá nhiều.</p>
                      <p>3. Một chỉ số đo tiến độ và một ngày review cố định.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
