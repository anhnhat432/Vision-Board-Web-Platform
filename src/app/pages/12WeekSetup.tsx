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
  Flag,
  Sparkles,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import {
  APP_STORAGE_KEYS,
  addGoal,
  clearGoalPlanningDrafts,
  formatDateInputValue,
  getLifeAreaLabel,
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

interface LeadIndicatorDraft {
  name: string;
  target: string;
  unit: string;
}

interface TwelveWeekSetupDraft {
  goalType: string;
  vision12Week: string;
  lagMetricName: string;
  lagMetricUnit: string;
  lagMetricTarget: string;
  leadIndicators: LeadIndicatorDraft[];
  week4Milestone: string;
  week8Milestone: string;
  week12Milestone: string;
  reviewDay: string;
  successEvidence: string;
}

const GOAL_TYPES = [
  { value: "Skill Learning", label: "Học kỹ năng" },
  { value: "Habit Building", label: "Xây dựng thói quen" },
  { value: "Fitness / Health", label: "Thể chất / sức khỏe" },
  { value: "Exam / Study", label: "Thi cử / học tập" },
  { value: "Career / Job Search", label: "Sự nghiệp / tìm việc" },
  { value: "Finance / Saving", label: "Tài chính / tiết kiệm" },
  { value: "Project Completion", label: "Hoàn thành dự án" },
  { value: "Personal Growth", label: "Phát triển bản thân" },
  { value: "Other", label: "Khác" },
];

const REVIEW_DAYS = [
  { value: "Monday", label: "Thứ Hai" },
  { value: "Tuesday", label: "Thứ Ba" },
  { value: "Wednesday", label: "Thứ Tư" },
  { value: "Thursday", label: "Thứ Năm" },
  { value: "Friday", label: "Thứ Sáu" },
  { value: "Saturday", label: "Thứ Bảy" },
  { value: "Sunday", label: "Chủ Nhật" },
];

const FEASIBILITY_LABELS: Record<ResultType, string> = {
  realistic: "Khả thi",
  challenging: "Thách thức nhưng làm được",
  too_ambitious: "Hơi quá sức lúc này",
};

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

  // Vietnamese: "tháng N năm YYYY" or "tháng N/YYYY"
  const viMonthYear = timeBound.match(/tháng\s+(\d{1,2})(?:\s+năm\s+|\/)(\d{4})/);
  if (viMonthYear) {
    const month = Number(viMonthYear[1]);
    const year = Number(viMonthYear[2]);
    if (month >= 1 && month <= 12 && year > 1900) {
      return formatDateInputValue(new Date(year, month - 1, 1));
    }
  }

  // Vietnamese: "cuối năm YYYY"
  const viEndYear = timeBound.match(/cuối\s+năm\s+(\d{4})/);
  if (viEndYear) {
    const year = Number(viEndYear[1]);
    if (year > 1900) return formatDateInputValue(new Date(year, 11, 31));
  }

  // Vietnamese: "đầu năm YYYY"
  const viStartYear = timeBound.match(/đầu\s+năm\s+(\d{4})/);
  if (viStartYear) {
    const year = Number(viStartYear[1]);
    if (year > 1900) return formatDateInputValue(new Date(year, 0, 1));
  }

  // Vietnamese: "N tháng nữa" or "trong N tháng" or "trong vòng N tháng"
  const viMonths = timeBound.match(/(?:trong(?:\s+vòng)?\s+)?(\d+)\s+tháng/);
  if (viMonths) {
    const parsed = new Date(now);
    parsed.setMonth(parsed.getMonth() + Number(viMonths[1]));
    return formatDateInputValue(parsed);
  }

  // Vietnamese: "N tuần nữa" or "trong N tuần"
  const viWeeks = timeBound.match(/(?:trong\s+)?(\d+)\s+tuần/);
  if (viWeeks) {
    const parsed = new Date(now);
    parsed.setDate(parsed.getDate() + Number(viWeeks[1]) * 7);
    return formatDateInputValue(parsed);
  }

  const monthYearMatch = timeBound.match(
    /\b(?:by\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i
  );
  if (monthYearMatch) {
    const months = [
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
    const monthIndex = months.indexOf(monthYearMatch[1].toLowerCase());
    const year = Number(monthYearMatch[2]);
    if (monthIndex >= 0 && year > 1900) {
      return formatDateInputValue(new Date(year, monthIndex, 1));
    }
  }

  const monthsMatch = timeBound.match(/\b(?:within|in)\s+(\d+)\s+months?\b/i);
  if (monthsMatch) {
    const parsed = new Date(now);
    parsed.setMonth(parsed.getMonth() + Number(monthsMatch[1]));
    return formatDateInputValue(parsed);
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

function generateWeeklyPlans(week4Milestone: string, week8Milestone: string, week12Milestone: string) {
  return Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    const phaseName = weekNumber <= 4 ? "Foundation" : weekNumber <= 8 ? "Build / Acceleration" : "Finish / Execution";

    const focus =
      weekNumber <= 4
        ? "Xây nền tảng, tạo sự đều đặn và bắt đầu các hành động cốt lõi mỗi tuần."
        : weekNumber <= 8
          ? "Tăng chất lượng hoặc khối lượng thực hiện và củng cố đà tiến lên."
          : "Về đích mạnh mẽ và hoàn tất kết quả hoặc đầu ra quan trọng nhất.";

    const milestone = weekNumber === 4 ? week4Milestone : weekNumber === 8 ? week8Milestone : weekNumber === 12 ? week12Milestone : "";

    return {
      weekNumber,
      phaseName,
      focus,
      milestone,
      completed: false,
    };
  });
}

export function TwelveWeekSetup() {
  const navigate = useNavigate();
  const hasInitializedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [smartGoal, setSmartGoal] = useState<PendingSMARTGoal | null>(null);
  const [feasibility, setFeasibility] = useState<PendingFeasibilityResult | null>(null);
  const [focusArea, setFocusArea] = useState("");

  const [draft, setDraft] = useState<TwelveWeekSetupDraft>({
    goalType: "",
    vision12Week: "",
    lagMetricName: "",
    lagMetricUnit: "",
    lagMetricTarget: "",
    leadIndicators: [
      { name: "", target: "", unit: "" },
      { name: "", target: "", unit: "" },
      { name: "", target: "", unit: "" },
    ],
    week4Milestone: "",
    week8Milestone: "",
    week12Milestone: "",
    reviewDay: "",
    successEvidence: "",
  });

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const selectedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const pendingSmartGoal = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    const pendingFeasibilityResult = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult);

    if (!selectedFocusArea) {
      toast.info("Vui lòng hoàn thành phần góc nhìn cuộc sống trước.");
      navigate("/life-insight");
      return;
    }

    if (!pendingSmartGoal || !pendingFeasibilityResult) {
      toast.info("Vui lòng hoàn thành mục tiêu SMART và phần kiểm tra tính khả thi trước.");
      navigate("/smart-goal-setup");
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
      toast.info("Dữ liệu của bạn chưa đầy đủ. Vui lòng thiết lập lại mục tiêu SMART.");
      navigate("/smart-goal-setup");
      return;
    }

    const draftRaw = localStorage.getItem(APP_STORAGE_KEYS.pending12WeekSetupDraft);
    if (draftRaw) {
      try {
        const parsedDraft = JSON.parse(draftRaw) as Partial<TwelveWeekSetupDraft>;
        setDraft((prev) => ({
          ...prev,
          goalType: typeof parsedDraft.goalType === "string" ? parsedDraft.goalType : prev.goalType,
          vision12Week: typeof parsedDraft.vision12Week === "string" ? parsedDraft.vision12Week : prev.vision12Week,
          lagMetricName: typeof parsedDraft.lagMetricName === "string" ? parsedDraft.lagMetricName : prev.lagMetricName,
          lagMetricUnit: typeof parsedDraft.lagMetricUnit === "string" ? parsedDraft.lagMetricUnit : prev.lagMetricUnit,
          lagMetricTarget: typeof parsedDraft.lagMetricTarget === "string" ? parsedDraft.lagMetricTarget : prev.lagMetricTarget,
          week4Milestone: typeof parsedDraft.week4Milestone === "string" ? parsedDraft.week4Milestone : prev.week4Milestone,
          week8Milestone: typeof parsedDraft.week8Milestone === "string" ? parsedDraft.week8Milestone : prev.week8Milestone,
          week12Milestone: typeof parsedDraft.week12Milestone === "string" ? parsedDraft.week12Milestone : prev.week12Milestone,
          reviewDay: typeof parsedDraft.reviewDay === "string" ? parsedDraft.reviewDay : prev.reviewDay,
          successEvidence: typeof parsedDraft.successEvidence === "string" ? parsedDraft.successEvidence : prev.successEvidence,
          leadIndicators:
            Array.isArray(parsedDraft.leadIndicators) && parsedDraft.leadIndicators.length === 3
              ? parsedDraft.leadIndicators.map((item) => ({
                  name: typeof item?.name === "string" ? item.name : "",
                  target: typeof item?.target === "string" ? item.target : "",
                  unit: typeof item?.unit === "string" ? item.unit : "",
                }))
              : prev.leadIndicators,
        }));
      } catch {
        // Ignore malformed draft.
      }
    }

    setSmartGoal(parsedSmart);
    setFeasibility(parsedFeasibility);
    setFocusArea(selectedFocusArea);
    setIsLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem(APP_STORAGE_KEYS.pending12WeekSetupDraft, JSON.stringify(draft));
  }, [isLoading, draft]);

  const handleChange = (key: keyof TwelveWeekSetupDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleLeadIndicatorChange = (index: number, key: keyof LeadIndicatorDraft, value: string) => {
    setDraft((prev) => {
      const nextIndicators = [...prev.leadIndicators];
      nextIndicators[index] = { ...nextIndicators[index], [key]: value };
      return { ...prev, leadIndicators: nextIndicators };
    });
  };

  const handleSubmit = () => {
    if (!smartGoal || !feasibility) return;

    const leadIndicators = draft.leadIndicators
      .map((indicator) => ({
        name: indicator.name.trim(),
        target: indicator.target.trim(),
        unit: indicator.unit.trim(),
      }))
      .filter((indicator) => indicator.name && indicator.target)
      .slice(0, 3);

    if (!draft.goalType.trim()) {
      toast.error("Vui lòng chọn loại mục tiêu.");
      return;
    }

    if (!draft.vision12Week.trim()) {
      toast.error("Vui lòng nhập tầm nhìn 12 tuần.");
      return;
    }

    if (!draft.lagMetricName.trim()) {
      toast.error("Vui lòng nhập tên chỉ số kết quả chính.");
      return;
    }

    if (!draft.lagMetricTarget.trim()) {
      toast.error("Vui lòng nhập mục tiêu cho chỉ số kết quả chính.");
      return;
    }

    if (leadIndicators.length === 0) {
      toast.error("Vui lòng nhập ít nhất một chỉ số hành động dẫn dắt.");
      return;
    }

    if (!draft.reviewDay.trim()) {
      toast.error("Vui lòng chọn ngày đánh giá hằng tuần.");
      return;
    }

    if (!draft.week12Milestone.trim()) {
      toast.error("Vui lòng nhập cột mốc tuần 12.");
      return;
    }

    if (!draft.successEvidence.trim()) {
      toast.error("Vui lòng nhập bằng chứng thành công.");
      return;
    }

    const weeklyPlans = generateWeeklyPlans(draft.week4Milestone.trim(), draft.week8Milestone.trim(), draft.week12Milestone.trim());
    const scoreboard = Array.from({ length: 12 }, (_, index) => ({
      weekNumber: index + 1,
      leadCompletionPercent: 0,
      mainMetricProgress: "",
      outputDone: "",
      reviewDone: false,
      weeklyScore: 0,
    }));

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
      twelveWeekSystem: {
        goalType: draft.goalType,
        vision12Week: draft.vision12Week.trim(),
        lagMetric: {
          name: draft.lagMetricName.trim(),
          unit: draft.lagMetricUnit.trim(),
          target: draft.lagMetricTarget.trim(),
          currentValue: "",
        },
        leadIndicators,
        milestones: {
          week4: draft.week4Milestone.trim(),
          week8: draft.week8Milestone.trim(),
          week12: draft.week12Milestone.trim(),
        },
        successEvidence: draft.successEvidence.trim(),
        reviewDay: draft.reviewDay,
        week12Outcome: draft.week12Milestone.trim(),
        weeklyActions: leadIndicators.map((item) => item.name),
        successMetric: draft.lagMetricName.trim(),
        currentWeek: 1,
        totalWeeks: 12,
        weeklyPlans,
        dailyCheckIns: [],
        weeklyReviews: [],
        scoreboard,
      },
    });

    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goalId);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goalId);
    clearGoalPlanningDrafts();

    toast.success("Đã tạo hệ thống 12 tuần", {
      description: "Bạn có thể bắt đầu theo dõi tiến độ ngay trong trang Hệ thống 12 tuần.",
    });

    navigate("/12-week-system");
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.1),_transparent_24%)] opacity-90" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  12-Week System Builder
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Dựng một hệ thống đủ rõ để bạn không chỉ có mục tiêu, mà còn có nhịp thực thi thật sự.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Tại đây, mục tiêu SMART của bạn sẽ được chuyển thành tầm nhìn 12 tuần, chỉ số kết quả,
                    hành động dẫn dắt và cột mốc kiểm tra để mọi tuần đều có hướng rõ ràng.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    Trọng tâm: {getLifeAreaLabel(focusArea)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <CalendarDays className="mr-1 h-3.5 w-3.5" />
                    Khả thi: {FEASIBILITY_LABELS[feasibility.resultType]}
                  </Badge>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                  Tóm tắt từ bước trước
                </p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Mục tiêu SMART</p>
                    <p className="mt-2 text-lg font-semibold text-white">{smartGoal.specific}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Khung thời gian</p>
                    <p className="mt-2 text-lg font-semibold text-white">{smartGoal.timeBound}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Điểm sẵn sàng</p>
                    <p className="mt-2 text-3xl font-bold text-white">{feasibility.readinessScore}/20</p>
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
                    <h3 className="text-xl font-semibold text-slate-900">Tầm nhìn 12 tuần</h3>
                    <p className="text-sm text-slate-500">Xác định bức tranh bạn muốn thấy vào cuối chu kỳ này.</p>
                  </div>
                </div>

                <div className="grid gap-5">
                  <div className="space-y-2">
                    <Label>Loại mục tiêu</Label>
                    <Select value={draft.goalType} onValueChange={(value) => handleChange("goalType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại mục tiêu" />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_TYPES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bạn muốn cuộc sống hoặc năng lực của mình trông như thế nào sau 12 tuần?</Label>
                    <Textarea
                      value={draft.vision12Week}
                      onChange={(event) => handleChange("vision12Week", event.target.value)}
                      placeholder="Mô tả kết quả, cảm giác và tiêu chuẩn mới bạn muốn chạm tới sau 12 tuần."
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 lg:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-sky-50 text-sky-700">
                    <Flag className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Chỉ số kết quả chính</h3>
                    <p className="text-sm text-slate-500">Đây là thước đo quan trọng nhất để biết bạn có tiến gần mục tiêu hay không.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Tên chỉ số</Label>
                    <Input
                      value={draft.lagMetricName}
                      onChange={(event) => handleChange("lagMetricName", event.target.value)}
                      placeholder="Ví dụ: số đơn ứng tuyển chất lượng, điểm thi thử, kg giảm được"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Giá trị mục tiêu</Label>
                    <Input
                      value={draft.lagMetricTarget}
                      onChange={(event) => handleChange("lagMetricTarget", event.target.value)}
                      placeholder="Ví dụ: 20, 8.0, 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Đơn vị đo</Label>
                    <Input
                      value={draft.lagMetricUnit}
                      onChange={(event) => handleChange("lagMetricUnit", event.target.value)}
                      placeholder="Ví dụ: đơn, điểm, kg, %"
                    />
                  </div>
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
                    <h3 className="text-xl font-semibold text-slate-900">Chỉ số dẫn dắt hàng tuần</h3>
                    <p className="text-sm text-slate-500">Nhập 1 đến 3 hành động lặp lại mỗi tuần để tạo ra kết quả chính.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {draft.leadIndicators.map((indicator, index) => (
                    <div
                      key={`lead_indicator_${index}`}
                      className="rounded-[24px] border border-white/70 bg-white/72 p-4"
                    >
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Hành động {index + 1}
                      </p>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input
                          value={indicator.name}
                          onChange={(event) => handleLeadIndicatorChange(index, "name", event.target.value)}
                          placeholder={`Tên hành động ${index + 1}`}
                        />
                        <Input
                          value={indicator.target}
                          onChange={(event) => handleLeadIndicatorChange(index, "target", event.target.value)}
                          placeholder="Mức mục tiêu"
                        />
                        <Input
                          value={indicator.unit}
                          onChange={(event) => handleLeadIndicatorChange(index, "unit", event.target.value)}
                          placeholder="Đơn vị"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 lg:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-amber-50 text-amber-700">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Cột mốc và nhịp review</h3>
                    <p className="text-sm text-slate-500">Đặt các checkpoint rõ ràng để 12 tuần không bị trôi qua một cách mơ hồ.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Cột mốc tuần 4</Label>
                    <Input
                      value={draft.week4Milestone}
                      onChange={(event) => handleChange("week4Milestone", event.target.value)}
                      placeholder="Điểm đích mini sau 4 tuần"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cột mốc tuần 8</Label>
                    <Input
                      value={draft.week8Milestone}
                      onChange={(event) => handleChange("week8Milestone", event.target.value)}
                      placeholder="Điểm kiểm tra giữa chặng"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cột mốc tuần 12</Label>
                    <Input
                      value={draft.week12Milestone}
                      onChange={(event) => handleChange("week12Milestone", event.target.value)}
                      placeholder="Kết quả cuối chu kỳ"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label>Bạn sẽ review vào ngày nào mỗi tuần?</Label>
                    <Select value={draft.reviewDay} onValueChange={(value) => handleChange("reviewDay", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn ngày review" />
                      </SelectTrigger>
                      <SelectContent>
                        {REVIEW_DAYS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 lg:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-fuchsia-50 text-fuchsia-700">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Bằng chứng thành công</h3>
                    <p className="text-sm text-slate-500">Hãy xác định thật cụ thể điều gì chứng minh bạn đã đạt được kết quả.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bằng chứng nào cho thấy bạn đã đạt được mục tiêu 12 tuần này?</Label>
                  <Textarea
                    value={draft.successEvidence}
                    onChange={(event) => handleChange("successEvidence", event.target.value)}
                    placeholder="Ví dụ: ảnh chụp màn hình kết quả, chứng nhận, portfolio hoàn chỉnh, báo cáo trước/sau..."
                    className="min-h-[120px]"
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/feasibility")}>
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit}>
                    Tạo hệ thống 12 tuần
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
                  Blueprint hiện tại
                </p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-[22px] border border-white/70 bg-white/72 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">SMART goal</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{smartGoal.specific}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/70 bg-white/72 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Độ khả thi</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{feasibility.resultTitle}</p>
                    <p className="mt-2 text-sm text-slate-500">{feasibility.recommendation}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/70 bg-white/72 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Checklist nên có</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p>1. Một chỉ số kết quả rõ ràng và đo được.</p>
                      <p>2. Tối đa 3 hành động dẫn dắt để giữ nhịp đơn giản.</p>
                      <p>3. Cột mốc tuần 4, 8, 12 đủ cụ thể để biết bạn có đi đúng hướng không.</p>
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
