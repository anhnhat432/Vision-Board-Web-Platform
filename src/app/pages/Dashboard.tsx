import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Suspense, lazy } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Crown,
  Download,
  Images,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
} from "lucide-react";

import { toast } from "sonner";

import { SpotlightTour, type SpotlightTourStep } from "../components/SpotlightTour";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { NewUserGuideBanner } from "../components/NewUserGuide";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { CountUp } from "../components/ui/count-up";
import { Progress } from "../components/ui/progress";
import { Reveal } from "../components/ui/reveal";
import { Skeleton } from "../components/ui/skeleton";
import { usePageTour } from "../hooks/usePageTour";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useUpgradeDialog } from "../hooks/useUpgradeDialog";
import {
  type UserData,
  calculateGoalProgress,
  exportUserDataSnapshot,
  formatCalendarDate,
  getActiveTwelveWeekGoal,
  getGoalExecutionStats,
  getLifeAreaLabel,
  getRandomMotivationalQuote,
  getReviewDayLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekCompletion,
  getTwelveWeekWeekRange,
  getUserData,
  isTwelveWeekReviewDueToday,
  parseStoredUserData,
  saveUserData,
  sortReflectionsByDateDesc,
} from "../utils/storage";
import {
  getEntitlementLabel,
  getPlanLabel,
} from "../utils/twelve-week-premium";
import {
  dismissRescueTrigger,
  evaluateRescueTriggers,
} from "../utils/twelve-week-system-ui";
import {
  trackRescueActionTaken,
  trackRescueTriggerDismissed,
  trackRescueTriggerFired,
} from "../utils/monetization-analytics";

const DashboardLifeAreaRadar = lazy(async () => {
  const module = await import("../components/DashboardLifeAreaRadar");
  return { default: module.DashboardLifeAreaRadar };
});

const DASHBOARD_TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "start",
    targetId: "dashboard-start-card",
    title: "Bắt đầu từ khối này",
    description:
      "Nếu chưa có chu kỳ, hãy nhìn khối này trước. Đây là nơi dẫn bạn qua đúng flow: insight, SMART, feasibility rồi mới vào 12 tuần.",
  },
  {
    id: "attention",
    targetId: "dashboard-next-card",
    title: "Nhìn khối này trước khi quét cả màn",
    description:
      "Phần 'Đi tiếp ngay' gom ba tín hiệu quan trọng nhất để bạn biết nên mở vào đâu tiếp theo.",
  },
  {
    id: "plan",
    targetId: "dashboard-plan-card",
    title: "Phân biệt Free và Plus ở đây",
    description:
      "Khối này cho biết bạn đang ở gói nào, quyền nào đã mở và chỗ để quản lý hoặc khôi phục lại nếu cần.",
  },
];

export function Dashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [quote, setQuote] = useState("");
  const { isTourOpen, setIsTourOpen } = usePageTour("dashboard");

  useEffect(() => {
    const data = getUserData();
    setUserData(data);
    setQuote(getRandomMotivationalQuote());

    // Reload user data when the user navigates back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setUserData(getUserData());
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (!userData) {
    return (
      <div className="space-y-8 pb-12">
        {/* Hero card skeleton */}
        <Skeleton className="h-56 rounded-[28px]" />
        {/* Quick action tiles skeleton */}
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-[22px]" />
          ))}
        </div>
        {/* Stat cards skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-[22px]" />
          ))}
        </div>
        {/* Content cards skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-[28px]" />
          <Skeleton className="h-48 rounded-[28px]" />
        </div>
      </div>
    );
  }


  const activeTwelveWeekGoal = getActiveTwelveWeekGoal(userData.goals);

  return <DashboardContent userData={userData} quote={quote} activeTwelveWeekGoal={activeTwelveWeekGoal} isTourOpen={isTourOpen} setIsTourOpen={setIsTourOpen} onReload={() => setUserData(getUserData())} />;
}

function DashboardContent({
  userData,
  quote,
  activeTwelveWeekGoal,
  isTourOpen,
  setIsTourOpen,
  onReload,
}: {
  userData: UserData;
  quote: string;
  activeTwelveWeekGoal: ReturnType<typeof getActiveTwelveWeekGoal>;
  isTourOpen: boolean;
  setIsTourOpen: (open: boolean) => void;
  onReload: () => void;
}) {
  const navigate = useNavigate();
  const [dismissedTrigger, setDismissedTrigger] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const { currentPlanCode, currentPlanDefinition, entitlementKeys, premiumStatusItems } = usePlanEntitlements(userData);
  const { isUpgradeDialogOpen, setIsUpgradeDialogOpen, upgradeContext, recommendedPlan, openUpgradeDialog } =
    useUpgradeDialog({
      source: "dashboard",
      placement: "dashboard_plan_card",
      currentPlanCode,
      goalId: activeTwelveWeekGoal?.id,
    });

  const recentGoals = userData.goals.slice(0, 3);
  const recentReflections = sortReflectionsByDateDesc(userData.reflections).slice(0, 2);

  const handleExport = () => {
    const snapshot = exportUserDataSnapshot();
    const blob = new Blob([snapshot], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dear-our-future-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã tải bản sao lưu dữ liệu.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") { toast.error("Không đọc được file."); return; }
      const parsed = parseStoredUserData(text);
      if (!parsed) { toast.error("File không hợp lệ hoặc bị hỏng."); return; }
      saveUserData(parsed);
      onReload();
      toast.success("Đã khôi phục dữ liệu thành công!");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const latestVisionBoard = userData.visionBoards[userData.visionBoards.length - 1];
  const completedGoalsCount = userData.goals.filter((goal) => calculateGoalProgress(goal) === 100).length;
  const executionTotals = userData.goals.reduce(
    (sum, goal) => {
      const execution = getGoalExecutionStats(goal);
      return {
        total: sum.total + execution.total,
        completed: sum.completed + execution.completed,
      };
    },
    { total: 0, completed: 0 },
  );
  const totalTasks = executionTotals.total;
  const completedTasks = executionTotals.completed;
  const averageLifeScore =
    userData.currentWheelOfLife.length > 0
      ? userData.currentWheelOfLife.reduce((sum, area) => sum + area.score, 0) / userData.currentWheelOfLife.length
      : 0;

  // Compute journal writing streak
  const journalStreak = (() => {
    const sorted = [...userData.reflections].sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length === 0) return 0;
    const dates = [...new Set(sorted.map((r) => r.date.slice(0, 10)))];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    if (dates[0] !== todayKey && dates[0] !== yesterdayKey) return 0;
    let streak = 0;
    let check = new Date(dates[0]);
    for (const d of dates) {
      const expected = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, "0")}-${String(check.getDate()).padStart(2, "0")}`;
      if (d !== expected) break;
      streak++;
      check.setDate(check.getDate() - 1);
    }
    return streak;
  })();

  const weakestArea = userData.currentWheelOfLife.length > 0
    ? [...userData.currentWheelOfLife].sort((a, b) => a.score - b.score)[0]
    : null;
  const activeSystem = activeTwelveWeekGoal?.twelveWeekSystem ?? null;
  const activeSystemWeek = activeSystem ? getTwelveWeekCurrentWeek(activeSystem) : null;
  const activeSystemTodayTasks = activeSystem ? getTwelveWeekTodayTasks(activeSystem) : [];
  const activeSystemTodayOpenTasks = activeSystemTodayTasks.filter((task) => !task.completed);
  const activeSystemTodayCompletedCount = activeSystemTodayTasks.length - activeSystemTodayOpenTasks.length;
  const activeSystemWeekCompletion =
    activeSystem && activeSystemWeek ? getTwelveWeekWeekCompletion(activeSystem, activeSystemWeek) : null;
  const activeSystemWeekRange =
    activeSystem && activeSystemWeek ? getTwelveWeekWeekRange(activeSystem, activeSystemWeek) : null;
  const reviewDueToday = Boolean(activeSystem && isTwelveWeekReviewDueToday(activeSystem));
  const activeSystemTaskPreview =
    activeSystem && activeSystemWeek
      ? (activeSystemTodayOpenTasks.length > 0
          ? activeSystemTodayOpenTasks
          : getTwelveWeekTasksForWeek(activeSystem, activeSystemWeek).filter((task) => !task.completed)
        ).slice(0, 3)
      : [];

  const radarData = userData.currentWheelOfLife.map((area) => ({
    subject: getLifeAreaLabel(area.name),
    value: area.score,
    fullMark: 10,
  }));

  const overviewCards = [
    {
      title: "Mục tiêu đang theo",
      value: userData.goals.length,
      note: `${completedGoalsCount} đã hoàn thành`,
      icon: Target,
      cardClass:
        "border-0 gradient-dark text-white shadow-[0_28px_65px_-38px_rgba(15,23,42,0.65)]",
      iconClass: "bg-white/10 text-white",
      titleClass: "text-white/56",
      noteClass: "text-white/68",
    },
    {
      title: "Việc đã chốt",
      value: completedTasks,
      note: `trên tổng số ${totalTasks}`,
      icon: TrendingUp,
      cardClass:
        "border-0 gradient-blue shadow-[0_24px_55px_-34px_rgba(37,99,235,0.22)]",
      iconClass: "bg-white/80 text-sky-700",
      titleClass: "text-slate-500",
      noteClass: "text-slate-600",
    },
    {
      title: "Thành tựu",
      value: userData.achievements.length,
      note: "huy hiệu đã mở khóa",
      icon: Award,
      cardClass:
        "border-0 gradient-emerald shadow-[0_24px_55px_-34px_rgba(5,150,105,0.18)]",
      iconClass: "bg-white/80 text-emerald-700",
      titleClass: "text-slate-500",
      noteClass: "text-slate-600",
    },
    {
      title: "Nhật ký",
      value: userData.reflections.length,
      note: journalStreak > 0 ? `streak ${journalStreak} ngày` : "bài viết đã lưu",
      icon: BookOpen,
      cardClass:
        "border-0 gradient-violet shadow-[0_24px_55px_-34px_rgba(124,58,237,0.18)]",
      iconClass: "bg-white/80 text-violet-700",
      titleClass: "text-slate-500",
      noteClass: "text-slate-600",
    },
  ];

  const quickActions = [
    {
      title: activeSystem ? "Mở trung tâm 12 tuần" : "Tạo mục tiêu",
      description: activeSystem ? "Vào thẳng hàng việc hôm nay." : "Đi lại đúng funnel: insight, SMART, feasibility rồi mới vào 12 tuần.",
      icon: CalendarDays,
      onClick: () => navigate(activeSystem ? "/12-week-system" : "/life-insight"),
    },
    {
      title: "Mở mục tiêu",
      description: "Xem tiến độ và hạn chót hiện tại.",
      icon: Target,
      onClick: () => navigate("/goals"),
    },
    {
      title: "Mở nhật ký",
      description: "Ghi lại suy ngẫm gần đây.",
      icon: BookOpen,
      onClick: () => navigate("/journal"),
    },
  ];

  const attentionPanels = activeSystem
    ? [
        {
          eyebrow: "Chu kỳ đang chạy",
          title: activeTwelveWeekGoal?.title ?? "Chu kỳ 12 tuần hiện tại",
          description:
            activeSystemTodayOpenTasks.length > 0
              ? `${activeSystemTodayOpenTasks.length} việc đang mở hôm nay. Đi thẳng vào trung tâm để chạm tiếp đúng việc cần làm.`
              : `Tuần ${activeSystemWeek}/${activeSystem.totalWeeks} đang khá gọn. Đây là lúc đẹp để nhìn lại tuần hoặc chuẩn bị review.`,
          cardClass:
            "rounded-[22px] gradient-dark p-4 text-white shadow-[0_24px_48px_-34px_rgba(15,23,42,0.58)]",
          eyebrowClass: "text-white/60",
          titleClass: "text-white",
          descriptionClass: "text-white/72",
          buttonClass: "hero-cta mt-4 border-white/12 bg-white text-slate-900 hover:bg-white/92",
          buttonVariant: "outline" as const,
          buttonLabel: "Mở trung tâm 12 tuần",
          icon: CalendarDays,
          onClick: () => navigate("/12-week-system"),
        },
        {
          eyebrow: "Review tuần",
          title: reviewDueToday ? "Đến hạn hôm nay" : getReviewDayLabel(activeSystem.reviewDay),
          description: reviewDueToday
            ? "Nên chốt trước khi sang nhịp tuần mới để dashboard quay về trạng thái gọn đầu."
            : "Chu kỳ đang có ngày review cố định. Khi tới hạn, thẻ cảnh báo sẽ nổi lên ở đầu màn.",
          cardClass: `rounded-[22px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] ${
            reviewDueToday ? "border-amber-200 bg-amber-50/92" : "border-white/55 bg-white/72"
          }`,
          eyebrowClass: reviewDueToday ? "text-amber-700" : "text-slate-400",
          titleClass: "text-slate-900",
          descriptionClass: "text-slate-600",
          buttonClass: reviewDueToday
            ? "mt-4 border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
            : "mt-4 border-white/70 bg-white/82 text-slate-900 hover:bg-white",
          buttonVariant: "outline" as const,
          buttonLabel: reviewDueToday ? "Chốt review tuần" : "Xem chu kỳ",
          icon: AlertTriangle,
          onClick: () => navigate("/12-week-system"),
        },
        ...(weakestArea ? [{
          eyebrow: "Lĩnh vực nên chăm lại",
          title: getLifeAreaLabel(weakestArea.name),
          description: `Điểm hiện tại ${weakestArea.score}/10. Nếu hôm nay còn thời gian, đây là nơi đáng quay lại trước.`,
          cardClass:
            "rounded-[22px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]",
          eyebrowClass: "text-slate-400",
          titleClass: "text-slate-900",
          descriptionClass: "text-slate-600",
          buttonClass: "mt-4 border-white/70 bg-white/82 text-slate-900 hover:bg-white",
          buttonVariant: "outline" as const,
          buttonLabel: "Mở cân bằng cuộc sống",
          icon: TrendingUp,
          onClick: () => navigate("/life-balance"),
        }] : []),
      ]
    : [
        {
          eyebrow: "Thiết lập nhịp 12 tuần",
          title: "Chưa có chu kỳ đang chạy",
          description: "Tạo một chu kỳ để web luôn trả lời rõ hôm nay nên làm gì, tuần này đang ở đâu và review khi nào đến hạn.",
          cardClass:
            "rounded-[22px] gradient-dark p-4 text-white shadow-[0_24px_48px_-34px_rgba(15,23,42,0.58)]",
          eyebrowClass: "text-white/60",
          titleClass: "text-white",
          descriptionClass: "text-white/72",
          buttonClass: "hero-cta mt-4 border-white/12 bg-white text-slate-900 hover:bg-white/92",
          buttonVariant: "outline" as const,
          buttonLabel: "Tạo mục tiêu",
          icon: CalendarDays,
          onClick: () => navigate("/life-insight"),
        },
        ...(weakestArea ? [{
          eyebrow: "Lĩnh vực nên chăm lại",
          title: getLifeAreaLabel(weakestArea.name),
          description: `Điểm hiện tại ${weakestArea.score}/10. Nếu muốn bắt đầu nhẹ hơn, hãy cải thiện một góc nhỏ ở đây trước.`,
          cardClass:
            "rounded-[22px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]",
          eyebrowClass: "text-slate-400",
          titleClass: "text-slate-900",
          descriptionClass: "text-slate-600",
          buttonClass: "mt-4 border-white/70 bg-white/82 text-slate-900 hover:bg-white",
          buttonVariant: "outline" as const,
          buttonLabel: "Mở cân bằng cuộc sống",
          icon: TrendingUp,
          onClick: () => navigate("/life-balance"),
        }] : []),
        {
          eyebrow: "Bảng tầm nhìn",
          title: latestVisionBoard ? latestVisionBoard.name : "Chưa có bảng tầm nhìn",
          description: latestVisionBoard
            ? `Năm ${latestVisionBoard.year} • ${latestVisionBoard.items.length} phần tử đang được lưu lại.`
            : "Tạo một bảng tầm nhìn để trực quan hóa điều bạn đang hướng tới và quay lại nó dễ hơn mỗi ngày.",
          cardClass:
            "rounded-[22px] border border-white/55 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]",
          eyebrowClass: "text-slate-400",
          titleClass: "text-slate-900",
          descriptionClass: "text-slate-600",
          buttonClass: "mt-4 border-white/70 bg-white/82 text-slate-900 hover:bg-white",
          buttonVariant: "outline" as const,
          buttonLabel: latestVisionBoard ? "Mở thư viện tầm nhìn" : "Tạo bảng tầm nhìn",
          icon: Images,
          onClick: () => navigate(latestVisionBoard ? "/gallery" : "/vision-board"),
        },
      ];
  const dashboardAttentionPanels = attentionPanels.slice(0, 2);

  const overdueCount = activeSystem
    ? activeSystemTodayTasks.filter((t) => !t.completed).length
    : 0;
  const activeTriggers = evaluateRescueTriggers({
    system: activeSystem,
    subscription: userData.subscription ?? null,
    missedTasksCount: overdueCount,
    weekCompletionPercent: activeSystemWeekCompletion?.percent ?? 0,
  }).filter((t) => t.kind !== dismissedTrigger);
  const topTrigger = activeTriggers[0] ?? null;

  return (
    <div className="space-y-8 pb-12">
      <UpgradePaywallDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        context={upgradeContext}
        currentPlan={currentPlanCode}
        goalId={activeTwelveWeekGoal?.id}
        recommendedPlan={recommendedPlan}
        source="dashboard"
        onCheckoutComplete={onReload}
      />
      <NewUserGuideBanner userData={userData} variant="compact" />

      {/* Rescue trigger nudge banner */}
      {topTrigger && (() => {
        const severityStyles = {
          urgent: {
            wrapper: "border-rose-200 bg-rose-50",
            icon: "bg-rose-100 text-rose-600",
            headline: "text-rose-800",
            detail: "text-rose-700",
          },
          caution: {
            wrapper: "border-amber-200 bg-amber-50",
            icon: "bg-amber-100 text-amber-600",
            headline: "text-amber-800",
            detail: "text-amber-700",
          },
          watch: {
            wrapper: "border-slate-200 bg-slate-50",
            icon: "bg-slate-100 text-slate-500",
            headline: "text-slate-800",
            detail: "text-slate-600",
          },
        } as const;
        const s = severityStyles[topTrigger.severity];
        const ctaHref = topTrigger.kind === "trial_ending" ? "/billing/plan" : "/12-week-system";
        const ctaLabel = topTrigger.kind === "trial_ending" ? "Nâng cấp ngay" : "Xem ngay";
        // Fire analytics once when first rendered (effect not available here; use key trick)
        return (
          <Reveal key={topTrigger.kind}>
            <div
              className={`rounded-xl border px-4 py-3 text-sm flex flex-wrap items-start gap-3 ${s.wrapper}`}
              onAnimationStart={() => {
                trackRescueTriggerFired({ kind: topTrigger.kind, severity: topTrigger.severity, currentPlan: currentPlanCode });
              }}
            >
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.icon}`}>
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${s.headline}`}>{topTrigger.headline}</p>
                <p className={`mt-0.5 text-xs ${s.detail}`}>{topTrigger.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  onClick={() => {
                    trackRescueActionTaken({ kind: topTrigger.kind, action: topTrigger.kind === "trial_ending" ? "upgrade" : "navigate_system", currentPlan: currentPlanCode });
                    navigate(ctaHref);
                  }}
                >
                  {ctaLabel}
                </Button>
                <button
                  type="button"
                  className="text-xs opacity-60 hover:opacity-100 transition-opacity px-1"
                  aria-label="Đóng thông báo"
                  onClick={() => {
                    dismissRescueTrigger(topTrigger.kind);
                    trackRescueTriggerDismissed({ kind: topTrigger.kind, currentPlan: currentPlanCode });
                    setDismissedTrigger(topTrigger.kind);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </Reveal>
        );
      })()}

      {/* Trial countdown banner */}
      {userData.subscription?.status === "trialing" &&
        userData.subscription.renewsAt &&
        new Date(userData.subscription.renewsAt) >= new Date() && (() => {
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(userData.subscription.renewsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          );
          return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center gap-3">
              <Crown className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <span className="font-semibold">Dùng thử Plus miễn phí:</span>{" "}
                còn {daysLeft} ngày — nâng cấp để giữ toàn bộ tính năng Plus.
              </span>
              <Button
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => navigate("/billing/plan")}
              >
                Nâng cấp ngay
              </Button>
            </div>
          );
        })()}
      <SpotlightTour
        open={isTourOpen}
        onOpenChange={setIsTourOpen}
        title="Tour bảng điều khiển"
        description="Ba điểm chính để người mới mở vào là biết nên bắt đầu từ đâu."
        steps={DASHBOARD_TOUR_STEPS}
      />

      {activeSystem && reviewDueToday && (
        <Reveal>
          <Card className="border-amber-200 bg-amber-50/92 shadow-[0_24px_55px_-34px_rgba(217,119,6,0.4)]">
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Review đến hạn hôm nay
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-950">Hôm nay là lúc chốt review tuần.</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {activeTwelveWeekGoal?.title}. Khóa tuần {activeSystemWeek} và quyết định nhịp cho tuần tiếp theo.
                  </p>
                </div>
              </div>
              <Button className="w-full min-w-[180px] sm:w-auto" onClick={() => navigate("/12-week-system")}>
                Mở review tuần
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,400px)]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-4">
            <Card className="hero-surface overflow-hidden border-0 text-white">
              <CardContent className="relative p-5 sm:p-8 lg:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-80" />
                <div className="relative space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/75">
                    Hôm nay nên làm gì
                  </span>
                  <span className="rounded-full border border-white/16 bg-white/10 px-4 py-1.5 text-sm text-white/85">
                    Gói {getPlanLabel(currentPlanCode)}
                  </span>
                  {activeSystem && activeSystemWeek && (
                    <span className="rounded-full border border-white/16 bg-white/10 px-4 py-1.5 text-sm text-white/85">
                      Tuần {activeSystemWeek} của chu kỳ hiện tại
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <h1 className="max-w-3xl break-words text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                    {activeSystem
                      ? `Hôm nay bạn chỉ cần quay lại đúng nhịp của "${activeTwelveWeekGoal?.title}".`
                      : "Bắt đầu từ một bước rất rõ, thay vì mở app rồi lại phân vân nên làm gì."}
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/84 lg:text-lg">"{quote}"</p>
                </div>

                  {activeSystem && activeSystemWeekCompletion && activeSystemWeekRange ? (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div data-tour-id="dashboard-start-card" className="rounded-2xl border border-white/12 bg-white/10 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Làm tiếp ngay</p>
                          <h2 className="mt-2 text-2xl font-bold text-white">
                            {activeSystemTodayOpenTasks.length > 0
                              ? `${activeSystemTodayOpenTasks.length} việc đang mở hôm nay`
                              : "Hôm nay đang khá gọn"}
                          </h2>
                        </div>
                        <Button
                          data-tour-id="dashboard-primary-action"
                          variant="outline"
                          className="hero-cta w-full border-white/15 bg-white text-slate-900 hover:bg-white/92 sm:w-auto"
                          onClick={() => navigate("/12-week-system")}
                        >
                          Mở trung tâm 12 tuần
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {activeSystemTaskPreview.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {activeSystemTaskPreview.map((task, index) => (
                            <div
                              key={task.id}
                              className={`flex items-center gap-4 rounded-[22px] border px-4 py-4 ${
                                index === 0
                                  ? "border-white/12 gradient-dark-sky"
                                  : "border-white/10 bg-slate-950/18"
                              }`}
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-950">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">{task.title}</p>
                                <p className="mt-1 text-xs text-white/60">
                                  {index === 0 ? "Việc nên chạm vào đầu tiên" : "Việc đang chờ phía sau"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-950/18 p-4">
                          <p className="font-semibold text-white">Bạn đã chốt xong phần mở của hôm nay.</p>
                          <p className="mt-1 text-sm leading-7 text-white/72">
                            Nếu còn sức, hãy mở trung tâm 12 tuần để xem phần còn lại của tuần hoặc chốt review khi đến hạn.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="hidden lg:block space-y-3">
                      <div className="rounded-[24px] border border-white/12 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Việc hôm nay</p>
                        <p className="mt-2 text-3xl font-bold text-white">{activeSystemTodayOpenTasks.length}</p>
                        <p className="mt-1 text-sm text-white/68">{activeSystemTodayCompletedCount} việc đã chốt</p>
                      </div>
                      <div className="rounded-[24px] border border-white/12 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Tiến độ tuần này</p>
                        <p className="mt-2 text-3xl font-bold text-white">{activeSystemWeekCompletion.percent}%</p>
                        <Progress value={activeSystemWeekCompletion.percent} className="mt-3 h-2.5 bg-white/18" />
                        <p className="mt-2 text-sm text-white/68">
                          {formatCalendarDate(activeSystemWeekRange.start)} - {formatCalendarDate(activeSystemWeekRange.end)}
                        </p>
                      </div>
                      <div
                        className={`rounded-[24px] border p-4 ${
                          reviewDueToday ? "border-amber-200 bg-amber-50 text-slate-950" : "border-white/12 bg-white/10 text-white"
                        }`}
                      >
                        <p className={`text-xs uppercase tracking-[0.18em] ${reviewDueToday ? "text-amber-700" : "text-white/55"}`}>
                          Review tuần
                        </p>
                        <p className="mt-2 text-2xl font-bold">
                          {reviewDueToday ? "Đến hạn hôm nay" : getReviewDayLabel(activeSystem.reviewDay)}
                        </p>
                        <p className={`mt-1 text-sm ${reviewDueToday ? "text-slate-600" : "text-white/68"}`}>
                          {reviewDueToday ? "Nên chốt trước khi sang nhịp tuần mới." : "Ngày review cố định của chu kỳ."}
                        </p>
                      </div>
                    </div>
                    </div>
                  ) : (
                    <div
                      data-tour-id="dashboard-start-card"
                      className="rounded-[26px] border border-white/12 bg-white/10 p-5"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Bắt đầu nhanh nhất</p>
                      <h2 className="mt-2 text-2xl font-bold text-white">Đi qua insight rồi chốt mục tiêu SMART.</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-white/72">
                        Đây là funnel gốc của web: insight trước, SMART sau, rồi mới sang feasibility và hệ 12 tuần.
                      </p>
                      <Button
                        data-tour-id="dashboard-primary-action"
                        className="hero-cta mt-4 w-full bg-white text-slate-900 hover:bg-white/92 sm:w-auto"
                        onClick={() => navigate("/life-insight")}
                      >
                        Tạo mục tiêu
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.title}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal rounded-[22px] border-white/65 bg-white/78 px-4 py-4 text-left shadow-[0_18px_34px_-30px_rgba(15,23,42,0.2)] hover:bg-white"
                    onClick={action.onClick}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-900">{action.title}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-slate-500">{action.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {overviewCards.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.div
                    key={`top-${item.title}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index }}
                  >
                    <Card className={item.cardClass}>
                      <CardHeader className="flex flex-row items-start justify-between pb-3">
                        <div>
                          <CardDescription className={item.titleClass}>{item.title}</CardDescription>
                          <CardTitle className="mt-2 text-3xl">
                            <CountUp value={item.value} />
                          </CardTitle>
                        </div>
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className={`text-sm ${item.noteClass}`}>{item.note}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card
              data-tour-id="dashboard-plan-card"
              className="border-0 gradient-indigo-purple text-white shadow-[0_28px_70px_-38px_rgba(76,29,149,0.42)]"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Crown className="h-5 w-5" />
                  Gói 12 tuần hiện tại
                </CardTitle>
                <CardDescription className="text-white/72">
                  Free đủ để chạy một chu kỳ. Plus dành cho lúc bạn muốn bắt đầu nhanh hơn và giữ nhịp chắc hơn.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Đang dùng</p>
                  <p className="mt-2 text-3xl font-bold text-white">{getPlanLabel(currentPlanCode)}</p>
                  <p className="mt-2 text-sm leading-7 text-white/72">{currentPlanDefinition.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {premiumStatusItems.map((key) => {
                    const isUnlocked = entitlementKeys.includes(key);

                    return (
                      <span
                        key={key}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                          isUnlocked
                            ? "border-emerald-200/70 bg-emerald-50 text-emerald-900"
                            : "border-white/15 bg-white/8 text-white/70"
                        }`}
                      >
                        {isUnlocked ? "Đang mở" : "Đang khóa"} · {getEntitlementLabel(key)}
                      </span>
                    );
                  })}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {currentPlanCode === "FREE" ? (
                    <>
                      <Button className="hero-cta bg-white text-slate-900 hover:bg-white/92" onClick={() => openUpgradeDialog("plan", "PLUS")}>
                        Mở Plus để đi nhanh hơn
                      </Button>
                      <Button variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/16" onClick={() => navigate(activeSystem ? "/12-week-system?tab=settings" : "/life-insight")}>
                        Xem Free đang có gì
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/16 sm:col-span-2" onClick={() => navigate(activeSystem ? "/12-week-system?tab=settings" : "/life-insight")}>
                      Quản lý gói và quyền
                    </Button>
                  )}
                </div>

                <p className="text-sm text-white/68">
                  Nếu bạn đã từng mở quyền trên thiết bị này, có thể vào tab Cài đặt của trung tâm 12 tuần để khôi phục lại ngay.
                </p>
              </CardContent>
            </Card>

            <Card
              data-tour-id="dashboard-next-card"
              className="border-0 gradient-slate shadow-[0_28px_70px_-38px_rgba(15,23,42,0.26)]"
            >
              <CardHeader>
                <CardTitle className="text-slate-950">Đi tiếp ngay</CardTitle>
                <CardDescription className="text-slate-700">Chỉ giữ hai tín hiệu quan trọng nhất để bạn quyết định nhanh.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardAttentionPanels.map((panel) => {
                  const Icon = panel.icon;
                  return (
                    <div key={panel.eyebrow} className={panel.cardClass}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/10 text-current">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs uppercase tracking-[0.16em] ${panel.eyebrowClass}`}>{panel.eyebrow}</p>
                          <p className={`mt-2 text-lg font-semibold ${panel.titleClass}`}>{panel.title}</p>
                          <p className={`mt-1 text-sm leading-7 ${panel.descriptionClass}`}>{panel.description}</p>
                          <Button variant={panel.buttonVariant} className={panel.buttonClass} onClick={panel.onClick}>
                            {panel.buttonLabel}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>

      {userData.isHydratedFromDemo && (
        <Reveal>
          <div className="flex flex-wrap items-center gap-4 rounded-[22px] border border-amber-200 bg-amber-50/92 px-5 py-4 shadow-[0_20px_45px_-34px_rgba(217,119,6,0.25)]">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Dữ liệu đang hiển thị là ví dụ demo</p>
              <p className="mt-0.5 text-sm text-amber-700">
                Cập nhật bánh xe cuộc sống của bạn để thay dữ liệu mẫu bằng thông tin thật.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
              onClick={() => navigate("/life-balance")}
            >
              Cập nhật ngay
            </Button>
          </div>
        </Reveal>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <Reveal>
          <Card className="h-full border-0 gradient-indigo shadow-[0_28px_70px_-38px_rgba(99,102,241,0.22)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-slate-950">Mục tiêu gần đây</CardTitle>
                  <CardDescription className="text-slate-700">Đủ ít để bạn nhìn một lượt là hiểu.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => navigate("/life-insight")}>
                  <Plus className="h-4 w-4" />
                  Tạo mục tiêu
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentGoals.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/65 bg-white/74 px-6 py-10 text-center text-slate-500">
                  <Target className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p>Chưa có mục tiêu nào. Hãy bắt đầu bằng mục tiêu đầu tiên của bạn.</p>
                  <Button className="mt-5 w-full sm:w-auto" onClick={() => navigate("/life-insight")}>
                    Tạo mục tiêu
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-white/65 bg-white/76 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.2)]">
                  <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(120px,0.6fr)_minmax(120px,0.6fr)_minmax(100px,0.5fr)] gap-4 border-b border-slate-200/80 bg-slate-50/90 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:grid">
                    <span>Mục tiêu</span>
                    <span>Loại</span>
                    <span>Tiến độ</span>
                    <span className="text-right">Hành động</span>
                  </div>

                  <div className="divide-y divide-slate-200/80">
                    {recentGoals.map((goal) => {
                      const progress = calculateGoalProgress(goal);
                      const execution = getGoalExecutionStats(goal);

                      return (
                        <div
                          key={goal.id}
                          className={`px-4 py-4 lg:px-5 ${
                            goal.twelveWeekSystem ? "bg-violet-50/55" : "bg-white/40"
                          }`}
                        >
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(120px,0.6fr)_minmax(120px,0.6fr)_minmax(100px,0.5fr)] lg:items-center">
                            <div className="min-w-0">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                  <Target className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="truncate font-semibold text-slate-900">{goal.title}</h4>
                                    {goal.twelveWeekSystem && (
                                      <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-700">
                                        12 tuần
                                      </span>
                                    )}
                                    {progress === 100 && (
                                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                        Hoàn thành
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500">
                                    <span>{getLifeAreaLabel(goal.category)}</span>
                                    {goal.deadline && <span>• Đích {formatCalendarDate(goal.deadline)}</span>}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 lg:hidden">
                                    <span className="rounded-full bg-slate-100 px-3 py-1">
                                      {goal.twelveWeekSystem ? "Chu kỳ 12 tuần" : "Mục tiêu thường"}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1">
                                      {execution.completed}/{execution.total} việc đã chốt
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1">{progress}% tiến độ</span>
                                  </div>
                                </div>
                                <CheckCircle2 aria-hidden="true" className={`h-5 w-5 shrink-0 ${progress === 100 ? "text-emerald-600" : "text-slate-300"}`} />
                              </div>
                            </div>

                            <div className="hidden min-w-0 lg:block">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {goal.twelveWeekSystem ? "Chu kỳ 12 tuần" : "Mục tiêu thường"}
                              </p>
                              <p className="mt-1 truncate text-sm text-slate-500">
                                {goal.twelveWeekSystem ? `Gói ${getPlanLabel(currentPlanCode)}` : "Theo dõi tổng quan"}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-slate-900">{progress}%</span>
                                <span className="text-slate-500">
                                  {execution.completed}/{execution.total} việc
                                </span>
                              </div>
                              <Progress value={progress} className="h-2.5" />
                              {goal.twelveWeekSystem && !entitlementKeys.includes("premium_review_insights") && (
                                <p className="text-xs font-medium text-violet-700">Insight review đang khóa</p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 lg:justify-end">
                              <Button
                                size="sm"
                                variant={goal.twelveWeekSystem ? "default" : "outline"}
                                className={goal.twelveWeekSystem ? "" : "border-white/70 bg-white hover:bg-slate-50"}
                                onClick={() => navigate(goal.twelveWeekSystem ? "/12-week-system" : "/goals")}
                                aria-label={goal.twelveWeekSystem ? `Mở 12 tuần: ${goal.title}` : `Mở mục tiêu: ${goal.title}`}
                              >
                                {goal.twelveWeekSystem ? "Mở 12 tuần" : "Mở mục tiêu"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="h-full border-0 gradient-slate shadow-[0_28px_70px_-38px_rgba(15,23,42,0.24)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-slate-950">Bánh xe cuộc sống</CardTitle>
                  <CardDescription className="text-slate-700">Nhìn nhanh bức tranh tổng quan hiện tại.</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Điểm trung bình</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    <CountUp value={averageLifeScore} precision={1} />
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-white/55 bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
                <Suspense
                  fallback={
                    <div className="flex h-[300px] items-center justify-center rounded-[20px] bg-slate-100/88 text-sm text-slate-500">
                      Đang tải biểu đồ cân bằng cuộc sống...
                    </div>
                  }
                >
                  <DashboardLifeAreaRadar data={radarData} />
                </Suspense>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/65 bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cần ưu tiên tiếp</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{weakestArea ? getLifeAreaLabel(weakestArea.name) : "Chưa có dữ liệu"}</p>
                  <p className="mt-1 text-sm text-slate-500">{weakestArea ? `${weakestArea.score}/10` : "--"}</p>
                </div>
                <Button
                  variant="outline"
                  className="h-auto justify-start whitespace-normal rounded-[20px] border-white/65 bg-white/76 px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] hover:bg-white"
                  onClick={() => navigate("/life-balance")}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900">Mở cân bằng cuộc sống</div>
                    <div className="mt-1 line-clamp-2 text-sm text-slate-500">Xem chi tiết và cập nhật lại bánh xe cuộc đời.</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {recentReflections.length > 0 && (
        <Reveal>
          <Card className="border-0 gradient-purple shadow-[0_28px_70px_-38px_rgba(168,85,247,0.18)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-slate-950">Nhật ký gần đây</CardTitle>
                  <CardDescription className="text-slate-700">Những suy ngẫm mới nhất trên hành trình của bạn.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/journal")}>
                  Xem tất cả
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              {recentReflections.map((reflection, index) => (
                <div
                  key={reflection.id}
                  className={`rounded-[24px] border p-5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)] ${
                    index === 0
                      ? "border-slate-900/10 gradient-dark text-white"
                      : "border-white/65 bg-white/76"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <h4 className={`min-w-0 truncate font-semibold ${index === 0 ? "text-white" : "text-slate-900"}`}>{reflection.title}</h4>
                    <span className={`text-xs font-medium ${index === 0 ? "text-white/56" : "text-slate-400"}`}>
                      {formatCalendarDate(reflection.date)}
                    </span>
                  </div>
                  <p className={`line-clamp-3 text-sm ${index === 0 ? "text-white/72" : "text-slate-600"}`}>
                    {reflection.content}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* Data backup section */}
      <Reveal>
        <Card className="glass-surface-sm mt-8 rounded-[28px] border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sao lưu & khôi phục dữ liệu</CardTitle>
            <CardDescription>Tải bản sao lưu hoặc khôi phục từ file JSON.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2 rounded-full" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Xuất bản sao lưu
            </Button>
            <Button variant="outline" className="gap-2 rounded-full" onClick={() => importFileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Nhập dữ liệu
            </Button>
            <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
