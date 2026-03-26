import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { BarChart3, CalendarDays, Compass, ListTodo, Settings2, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";

import { useTwelveWeekSystemSnapshot } from "../hooks/useTwelveWeekSystemSnapshot";
import { NewUserGuideBanner } from "../components/NewUserGuide";
import { SpotlightTour, type SpotlightTourStep } from "../components/SpotlightTour";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import {
  trackPaywallCtaClicked,
  trackPremiumInsightOpened,
} from "../utils/monetization-analytics";
import { PAGE_TOUR_EVENT } from "../utils/page-tour";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { TwelveWeekTodayTab } from "../components/twelve-week/TwelveWeekTodayTab";
import { CountUp } from "../components/ui/count-up";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  getBrowserNotificationStatus,
  openBillingCustomerPortal,
  requestBrowserNotificationPermission,
  restorePlanAccess,
  sendTestBrowserNotification,
  syncEntitlementsWithProvider,
  syncPendingOutbox,
} from "../utils/production";
import {
  type AppPreferences,
  type InAppReminder,
  type PricingPlanCode,
  type SyncOutboxItem,
  type UniversalDailyCheckIn,
  type UniversalWeeklyReview,
  archiveOutboxItem,
  clearLocalDeviceSignals,
  clearArchivedOutbox,
  clearEventLog,
  exportUserDataSnapshot,
  formatCalendarDate,
  formatDateInputValue,
  getCalendarDateKey,
  getFeasibilityResultLabel,
  getLifeAreaLabel,
  getReviewDayLabel,
  getUserData,
  resetTwelveWeekGoalCycle,
  restoreArchivedOutbox,
  restoreOutboxItem,
  trackAppEvent,
  updateAppPreferences,
  updateGoal,
  upsertReflection,
} from "../utils/storage";
import {
  type DailyMood,
  addDaysToDateKey,
  getCurrentWeekStartDate,
  getMoodScore,
  getWorkloadDecisionLabel,
} from "../utils/twelve-week-system-ui";
import {
  getPlanLabel,
  type PremiumFeatureContext,
} from "../utils/twelve-week-premium";

interface WeeklyReviewForm {
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  nextWeekPriority: string;
  workloadDecision: UniversalWeeklyReview["workloadDecision"];
}

const TWELVE_WEEK_TOUR_STEPS_CLEAN: SpotlightTourStep[] = [
  {
    id: "tabs",
    targetId: "system-tabs",
    title: "Đổi góc nhìn bằng dải tab này",
    description:
      "Bạn không cần đọc cả màn. Chỉ cần nhớ: Hôm nay để làm việc, Tuần để review, Tiến độ để nhìn score, Cài đặt để chỉnh nhịp.",
  },
  {
    id: "today",
    targetId: "system-today-queue",
    title: "Bắt đầu từ hàng việc hôm nay",
    description: "Nếu đang phân vân, hãy chỉ nhìn đúng khối này và bắt đầu từ việc ưu tiên số 1 trước.",
  },
  {
    id: "week",
    targetId: "system-week-review",
    title: "Review tuần nằm ở đây",
    description:
      "Khi tới cuối tuần, bạn chỉ cần mở tab Tuần để chốt 3 câu reflection và quyết định tuần sau.",
  },
  {
    id: "settings",
    targetId: "system-settings-panel",
    title: "Cài đặt để chỉnh nhịp cho hợp bạn",
    description:
      "Tab Cài đặt là nơi đổi ngày review, mức tải, thứ tự tactic và xử lý các phần local như nhắc việc hay khôi phục quyền.",
  },
];

const TwelveWeekWeekTab = lazy(async () => ({
  default: (await import("../components/twelve-week/TwelveWeekWeekTab")).TwelveWeekWeekTab,
}));

const TwelveWeekProgressTab = lazy(async () => ({
  default: (await import("../components/twelve-week/TwelveWeekProgressTab")).TwelveWeekProgressTab,
}));

const TwelveWeekSettingsTab = lazy(async () => ({
  default: (await import("../components/twelve-week/TwelveWeekSettingsTab")).TwelveWeekSettingsTab,
}));

function TwelveWeekTabFallback({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border border-white/70 bg-white/80 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.32)]">
      <CardContent className="flex min-h-[220px] flex-col justify-center gap-3 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <p className="text-base font-semibold text-slate-900">Đang mở phần này...</p>
        <p className="mx-auto max-w-xl text-sm leading-7 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

export function TwelveWeekSystem() {
  const navigate = useNavigate();
  const {
    activeGoal,
    allGoals,
    activeTab,
    setActiveTab,
    activePlanCode,
    activeEntitlementKeys,
    appPreferences,
    activeReminders,
    recentOutboxItems,
    funnelSteps,
    monetizationSteps,
    billingProviderStatus,
    browserNotificationStatus,
    setBrowserNotificationStatus,
    lastSyncSnapshot,
    setLastSyncSnapshot,
    lastEntitlementSyncSnapshot,
    lastRestoreAccessSnapshot,
    pendingOutboxCount,
    archivedOutboxCount,
    eventCount,
    system,
    currentWeek,
    currentWeekRange,
    currentWeekTasks,
    todayQueue,
    missedTasks,
    weekCompletion,
    currentReview,
    currentScore,
    currentPlanFocus,
    currentPlanMilestone,
    currentLagMetricValue,
    latestCheckIn,
    reviewDoneCount,
    coreTacticCount,
    optionalTacticCount,
    todayCompletedCount,
    todayRemainingCount,
    overdueOpenCount,
    currentWeekOpenTasks,
    optionalOpenThisWeekCount,
    firstPriorityTask,
    secondaryTodayTasks,
    averageScore,
    reviewDueToday,
    currentWeekScoreValue,
    reviewStatusLabel,
    coreIndicators,
    optionalIndicators,
    hasSmartRescue,
    rescuePlanSummary,
    hasPremiumReviewInsights,
    premiumReviewInsight,
    suggestedNextWeekPlan,
    milestoneItems,
    loadGoalData,
  } = useTwelveWeekSystemSnapshot();
  const [dailyMood, setDailyMood] = useState<DailyMood>("steady");
  const [dailyNote, setDailyNote] = useState("");
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<PremiumFeatureContext>("review");
  const [upgradeRecommendedPlan, setUpgradeRecommendedPlan] = useState<Exclude<PricingPlanCode, "FREE">>("PLUS");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isClearLocalDialogOpen, setIsClearLocalDialogOpen] = useState(false);
  const [isSyncingEntitlements, setIsSyncingEntitlements] = useState(false);
  const [isRestoringPlanAccess, setIsRestoringPlanAccess] = useState(false);
  const [weeklyForm, setWeeklyForm] = useState<WeeklyReviewForm>({
    lagProgressValue: "",
    biggestOutputThisWeek: "",
    mainObstacle: "",
    nextWeekPriority: "",
    workloadDecision: "keep same",
  });

  const todayDateKey = formatDateInputValue(new Date());

  useEffect(() => {
    if (!system) return;

    setWeeklyForm({
      lagProgressValue: currentReview?.lagProgressValue ?? currentLagMetricValue ?? "",
      biggestOutputThisWeek: currentReview?.biggestOutputThisWeek ?? "",
      mainObstacle: currentReview?.mainObstacle ?? "",
      nextWeekPriority: currentReview?.nextWeekPriority ?? "",
      workloadDecision: currentReview?.workloadDecision ?? "keep same",
    });
    setDailyMood((latestCheckIn?.mood as DailyMood | undefined) ?? "steady");
    setDailyNote(latestCheckIn?.optionalNote ?? "");
  }, [system, currentReview, currentLagMetricValue, latestCheckIn]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTourStart = (event: Event) => {
      const detail = (event as CustomEvent<{ tour?: string }>).detail;
      if (detail?.tour === "twelve_week_system") {
        setIsTourOpen(true);
      }
    };

    window.addEventListener(PAGE_TOUR_EVENT, handleTourStart);

    return () => {
      window.removeEventListener(PAGE_TOUR_EVENT, handleTourStart);
    };
  }, []);

  if (!activeGoal || !system) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-10 text-center lg:p-14">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-50 text-violet-700">
            <Sparkles className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-slate-900">Bạn chưa có hệ thống 12 tuần</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
            Tạo một chu kỳ 12 tuần để gom nhịp thực thi mỗi ngày, review tuần và điểm vào cùng một nơi.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("/life-insight")}>Tạo mục tiêu</Button>
            <Button variant="outline" onClick={() => navigate("/goals")}>Mở mục tiêu</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const refreshAfterGoalUpdate = () => loadGoalData(activeGoal.id);

  const handleOpenUpgradeDialog = (
    context: PremiumFeatureContext,
    recommendedPlan: Exclude<PricingPlanCode, "FREE"> = "PLUS",
  ) => {
    trackPaywallCtaClicked({
      goalId: activeGoal.id,
      context,
      source: activeTab === "settings" ? "settings" : context === "review" ? "review_teaser" : "12_week_system",
      currentPlan: activePlanCode,
      recommendedPlan,
      targetPlan: recommendedPlan,
      placement: activeTab === "settings" ? "settings_plan_card" : context === "review" ? "weekly_review_teaser" : "inline_upgrade",
    });
    setUpgradeContext(context);
    setUpgradeRecommendedPlan(recommendedPlan);
    setIsUpgradeDialogOpen(true);
  };

  const handleCheckoutComplete = () => {
    loadGoalData(activeGoal.id);
  };

  const handleRestorePlanAccess = async () => {
    setIsRestoringPlanAccess(true);

    try {
      const result = await restorePlanAccess(activeGoal.id);

      if (result.ok && result.planCode !== "FREE") {
        trackAppEvent("plan_access_restored", activeGoal.id, {
          plan: result.planCode,
          providerMode: result.providerMode,
        });
        toast.success(result.message);
      } else if (result.ok) {
        toast.info(result.message);
      } else {
        toast.error(result.message);
      }

      loadGoalData(activeGoal.id);
    } finally {
      setIsRestoringPlanAccess(false);
    }
  };

  const handleSyncEntitlements = async () => {
    setIsSyncingEntitlements(true);

    try {
      const result = await syncEntitlementsWithProvider(activeGoal.id);

      if (result.ok) {
        trackAppEvent("billing_access_synced", activeGoal.id, {
          plan: result.planCode,
          providerMode: result.providerMode,
          entitlementCount: String(result.entitlementKeys.length),
        });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      loadGoalData(activeGoal.id);
    } finally {
      setIsSyncingEntitlements(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    const result = await openBillingCustomerPortal(activeGoal.id);

    if (result.ok && result.url && typeof window !== "undefined") {
      const isSameOriginTarget = result.url.startsWith("/") || result.url.startsWith(window.location.origin);

      if (isSameOriginTarget) {
        window.location.assign(result.url);
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }

      toast.success(result.message);
      return;
    }

    if (result.ok) {
      toast.success(result.message);
    } else if (result.status === "local_only" || result.status === "not_configured") {
      toast.info(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    if (value === "week" && hasPremiumReviewInsights) {
      trackPremiumInsightOpened({
        goalId: activeGoal.id,
        source: "12_week_system",
        currentPlan: activePlanCode,
        weekNumber: currentWeek,
      });
    }
  };

  const handleTourStepChange = (step: SpotlightTourStep) => {
    if (step.id === "week" && activeTab !== "week") {
      handleTabChange("week");
      return;
    }

    if (step.id === "settings" && activeTab !== "settings") {
      handleTabChange("settings");
      return;
    }

    if ((step.id === "tabs" || step.id === "today") && activeTab !== "today") {
      handleTabChange("today");
    }
  };

  const handleToggleTask = (taskId: string, completed: boolean) => {
    const nextTaskInstances = system.taskInstances.map((task) =>
      task.id === taskId ? { ...task, completed, completedAt: completed ? new Date().toISOString() : undefined } : task,
    );

    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        taskInstances: nextTaskInstances,
      },
    });

    if (completed) {
      trackAppEvent("12_week_task_completed", activeGoal.id, { weekNumber: String(currentWeek), taskId });
    }

    toast.success(completed ? "Việc đã được chốt." : "Việc đã được mở lại.");
    refreshAfterGoalUpdate();
  };

  const handleSaveCheckIn = () => {
    const todayKey = formatDateInputValue(new Date());
    const completedTodayCount = todayQueue.filter((task) => task.completed).length;
    const completedTitles = todayQueue.filter((task) => task.completed).map((task) => task.title).join(", ");
    const dailyCheckIn: UniversalDailyCheckIn = {
      date: todayKey,
      didWorkToday: completedTodayCount > 0 || dailyNote.trim().length > 0,
      whichLeadIndicatorWorkedOn: completedTitles || todayQueue[0]?.leadIndicatorName || "",
      amountDone: `${completedTodayCount}/${todayQueue.length || currentWeekTasks.length || 1} việc`,
      outputCreated: completedTitles,
      obstacleOrIssue: "",
      dailySelfRating: getMoodScore(dailyMood),
      optionalNote: dailyNote.trim(),
      mood: dailyMood,
    };

    const filteredCheckIns = system.dailyCheckIns.filter((item) => getCalendarDateKey(item.date) !== todayKey);
    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        dailyCheckIns: [dailyCheckIn, ...filteredCheckIns].slice(0, 120),
      },
    });

    trackAppEvent("12_week_daily_checkin_submitted", activeGoal.id, {
      mood: dailyMood,
      completedTasks: String(completedTodayCount),
    });
    toast.success("Check-in hôm nay đã được lưu.");
    refreshAfterGoalUpdate();
  };

  const handleSaveWeeklyReview = () => {
    const nextWeekPriorityValue =
      weeklyForm.nextWeekPriority.trim() ||
      (hasPremiumReviewInsights ? suggestedNextWeekPlan.focus : "");
    const workloadDecisionValue =
      weeklyForm.workloadDecision ||
      (hasPremiumReviewInsights ? suggestedNextWeekPlan.workloadDecision : "keep same");
    const nextReview: UniversalWeeklyReview = {
      weekNumber: currentWeek,
      leadCompletionPercent: weekCompletion.percent,
      lagProgressValue: weeklyForm.lagProgressValue.trim(),
      biggestOutputThisWeek: weeklyForm.biggestOutputThisWeek.trim(),
      mainObstacle: weeklyForm.mainObstacle.trim(),
      nextWeekPriority: nextWeekPriorityValue,
      workloadDecision: workloadDecisionValue,
      reviewCompleted: true,
      progressScore: Math.max(5, Math.round(weekCompletion.percent / 20)),
      disciplineScore: Math.max(5, Math.round(weekCompletion.percent / 20)),
      focusScore: weekCompletion.percent >= 70 ? 8 : 6,
      improvementScore: weeklyForm.mainObstacle.trim() ? 8 : 6,
      outputQualityScore: weeklyForm.biggestOutputThisWeek.trim() ? 8 : 6,
      completedLeadIndicators: weekCompletion.completed,
    };

    const updatedReviews = [
      ...system.weeklyReviews.filter((review) => review.weekNumber !== currentWeek),
      nextReview,
    ].sort((left, right) => left.weekNumber - right.weekNumber);

    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        lagMetric: {
          ...system.lagMetric,
          currentValue: weeklyForm.lagProgressValue.trim(),
        },
        weeklyReviews: updatedReviews,
      },
    });

    upsertReflection({
      date: formatDateInputValue(new Date()),
      title: `Review tuần - ${activeGoal.title} - tuần ${currentWeek}`,
      content: [
        `Điều hiệu quả: ${weeklyForm.biggestOutputThisWeek.trim() || "--"}`,
        `Điều cản trở: ${weeklyForm.mainObstacle.trim() || "--"}`,
        `Ưu tiên tuần sau: ${nextWeekPriorityValue || "--"}`,
        `Quyết định: ${getWorkloadDecisionLabel(workloadDecisionValue)}`,
        hasPremiumReviewInsights ? `Gợi ý hệ thống: ${suggestedNextWeekPlan.firstMove}` : "",
      ]
        .filter(Boolean)
        .join("\\n\\n"),
      mood: weekCompletion.percent >= 70 ? "happy" : weekCompletion.percent >= 40 ? "neutral" : "sad",
      entryType: "weekly-review",
      linkedGoalId: activeGoal.id,
      linkedWeekNumber: currentWeek,
    });

    trackAppEvent("12_week_weekly_review_submitted", activeGoal.id, {
      weekNumber: String(currentWeek),
      score: String(currentScore?.weeklyScore ?? weekCompletion.percent),
      decision: workloadDecisionValue || "keep same",
      usedSuggestedPlan: String(
        hasPremiumReviewInsights && weeklyForm.nextWeekPriority.trim().length === 0,
      ),
    });
    toast.success("Review tuần đã được chốt.", {
      description:
        hasPremiumReviewInsights && weeklyForm.nextWeekPriority.trim().length === 0
          ? "Mình đã dùng luôn gợi ý Plus để khóa ưu tiên tuần sau cho bạn."
          : "Tuần sau giờ đã có ưu tiên đủ rõ để bắt đầu gọn hơn.",
    });
    refreshAfterGoalUpdate();
  };

  const handleReviewDayChange = (value: string) => {
    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        reviewDay: value,
      },
    });
    toast.success("Ngày review đã được cập nhật.");
    refreshAfterGoalUpdate();
  };

  const handleReminderTimeChange = (value: string) => {
    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        dailyReminderTime: value,
      },
    });
    updateAppPreferences({ preferredReminderHour: Number.parseInt(value.split(":")[0] ?? "19", 10) || 19 });
    refreshAfterGoalUpdate();
  };

  const handleLoadPreferenceChange = (value: string) => {
    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        tacticLoadPreference: value as typeof system.tacticLoadPreference,
      },
    });
    refreshAfterGoalUpdate();
  };

  const handleStatusChange = (value: string) => {
    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        status: value as typeof system.status,
      },
    });
    refreshAfterGoalUpdate();
  };

  const handleTacticPriorityChange = (tacticId: string | undefined, value: string) => {
    if (!tacticId) return;

    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        leadIndicators: system.leadIndicators.map((indicator, index) => {
          const indicatorId = indicator.id ?? `tactic_${index}`;
          return indicatorId === tacticId
            ? { ...indicator, priority: Number.parseInt(value, 10) || index + 1 }
            : indicator;
        }),
      },
    });
    trackAppEvent("12_week_tactic_updated", activeGoal.id, { tacticId, field: "priority", value });
    refreshAfterGoalUpdate();
  };

  const handleTacticTypeChange = (tacticId: string | undefined, value: string) => {
    if (!tacticId) return;

    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        leadIndicators: system.leadIndicators.map((indicator, index) => {
          const indicatorId = indicator.id ?? `tactic_${index}`;
          return indicatorId === tacticId
            ? { ...indicator, type: value === "optional" ? "optional" : "core" }
            : indicator;
        }),
      },
    });
    trackAppEvent("12_week_tactic_updated", activeGoal.id, { tacticId, field: "type", value });
    refreshAfterGoalUpdate();
  };

  const handlePreferenceToggle = <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K],
  ) => {
    updateAppPreferences({ [key]: value } as Pick<AppPreferences, K>);
    refreshAfterGoalUpdate();
  };

  const handleArchivePendingOutbox = () => {
    const data = getUserData();
    data.syncOutbox
      .filter((item) => item.status === "pending")
      .forEach((item) => {
        archiveOutboxItem(item.id);
      });
    refreshAfterGoalUpdate();
  };

  const handleOutboxItemToggle = (item: SyncOutboxItem) => {
    if (item.status === "pending") {
      archiveOutboxItem(item.id);
      toast.success("Mục outbox đã được lưu lại.");
    } else {
      restoreOutboxItem(item.id);
      toast.success("Mục outbox đã được khôi phục về hàng chờ.");
    }
    refreshAfterGoalUpdate();
  };

  const handleRestoreArchivedOutbox = () => {
    restoreArchivedOutbox();
    toast.success("Các mục outbox đã lưu đã được đưa lại về hàng chờ.");
    refreshAfterGoalUpdate();
  };

  const handleOpenReminder = (reminder: InAppReminder) => {
    if (reminder.goalId && reminder.goalId !== activeGoal.id) {
      loadGoalData(reminder.goalId);
    }
    handleTabChange(reminder.kind === "review" ? "week" : "today");
  };

  const handleExportLocalData = () => {
    const blob = new Blob([exportUserDataSnapshot()], { type: "application/json;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vision-board-local-${formatDateInputValue(new Date())}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    toast.success("Đã tải bản sao dữ liệu local.");
  };

  const handleClearLocalSignals = () => {
    clearLocalDeviceSignals();
    setIsClearLocalDialogOpen(false);
    toast.success("Đã xóa log, outbox và trạng thái nhắc việc trên thiết bị này.");
    refreshAfterGoalUpdate();
  };

  const handleBrowserNotificationToggle = async (value: boolean) => {
    updateAppPreferences({ enableBrowserNotifications: value });

    if (value) {
      const permission = await requestBrowserNotificationPermission();
      setBrowserNotificationStatus(permission);

      if (permission === "granted") {
        sendTestBrowserNotification();
        toast.success("Thông báo ngoài trình duyệt đã được bật.");
      } else if (permission === "denied") {
        toast.error("Trình duyệt đang chặn thông báo ngoài trình duyệt.");
      } else if (permission === "unsupported") {
        toast.info("Trình duyệt hiện tại không hỗ trợ thông báo ngoài trình duyệt.");
      }
    } else {
      toast.success("Đã tắt thông báo ngoài trình duyệt.");
      setBrowserNotificationStatus(getBrowserNotificationStatus());
    }

    refreshAfterGoalUpdate();
  };

  const handleRunOutboxSync = async () => {
    const snapshot = await syncPendingOutbox();
    setLastSyncSnapshot(snapshot);
    refreshAfterGoalUpdate();

    if (snapshot.status === "success") {
      toast.success(snapshot.message);
      return;
    }

    if (snapshot.status === "partial") {
      toast.info(snapshot.message);
      return;
    }

    if (snapshot.status === "offline" || snapshot.status === "not_configured" || snapshot.status === "idle") {
      toast.info(snapshot.message);
      return;
    }

    toast.error(snapshot.message);
  };

  const handleReentry = (mode: "restart" | "lighten" | "push") => {
    if (!currentWeekRange) return;
    const todayKey = formatDateInputValue(new Date());
    const weekEnd = currentWeekRange.end;
    const nextWeekStart = addDaysToDateKey(weekEnd, 1);
    const targets =
      mode === "restart"
        ? Array.from({ length: 4 }, (_, index) => addDaysToDateKey(todayKey, index))
        : mode === "lighten"
          ? [weekEnd, addDaysToDateKey(weekEnd, -1), addDaysToDateKey(weekEnd, -2)].filter((value) => value >= todayKey)
          : Array.from({ length: 4 }, (_, index) => addDaysToDateKey(nextWeekStart, index));

    let moved = 0;
    const nextTaskInstances = system.taskInstances.map((task) => {
      const isMissed = missedTasks.some((item) => item.id === task.id);
      const isOptionalThisWeek = mode === "lighten" && task.weekNumber === currentWeek && !task.isCore && !task.completed && task.scheduledDate <= weekEnd;
      if (!isMissed && !isOptionalThisWeek) return task;

      const date = targets[Math.min(moved, Math.max(targets.length - 1, 0))] ?? todayKey;
      moved += 1;
      return {
        ...task,
        scheduledDate: date,
        rescheduledFrom: task.rescheduledFrom ?? task.scheduledDate,
      };
    });

    updateGoal(activeGoal.id, {
      twelveWeekSystem: {
        ...system,
        tacticLoadPreference: mode === "lighten" ? "lighter" : system.tacticLoadPreference,
        reentryCount: (system.reentryCount ?? 0) + 1,
        taskInstances: nextTaskInstances,
      },
    });

    trackAppEvent("12_week_reentry_used", activeGoal.id, { mode, weekNumber: String(currentWeek) });
    toast.success(
      mode === "restart"
        ? "Đã sắp lại để bắt đầu lại tuần này."
        : mode === "lighten"
          ? "Đã giảm tải cho phần còn lại của tuần."
          : "Đã đẩy việc trễ sang tuần sau.",
    );
    refreshAfterGoalUpdate();
  };

  const handleApplyRecommendedReentry = () => {
    if (!rescuePlanSummary) return;

    trackAppEvent("12_week_reentry_recommended_applied", activeGoal.id, {
      mode: rescuePlanSummary.recommendedMode,
      weekNumber: String(currentWeek),
    });
    handleReentry(rescuePlanSummary.recommendedMode);
  };

  const handleApplySuggestedPlan = () => {
    setWeeklyForm((previousForm) => ({
      ...previousForm,
      nextWeekPriority: suggestedNextWeekPlan.focus,
      workloadDecision: suggestedNextWeekPlan.workloadDecision,
    }));
    trackAppEvent("12_week_review_suggestion_applied", activeGoal.id, {
      weekNumber: String(currentWeek),
      decision: suggestedNextWeekPlan.workloadDecision,
    });
    toast.success("Đã áp dụng gợi ý cho tuần sau.", {
      description: "Bạn có thể chỉnh lại thêm trước khi chốt review.",
    });
  };

  const handleResetCycle = () => {
    const resetFrom = getCurrentWeekStartDate(system.weekStartsOn ?? "Monday");
    const didReset = resetTwelveWeekGoalCycle(activeGoal.id, resetFrom);

    if (!didReset) {
      toast.error("Không thể reset chu kỳ lúc này.");
      return;
    }

    trackAppEvent("12_week_cycle_reset", activeGoal.id, {
      resetFrom: formatDateInputValue(resetFrom),
      totalWeeks: String(system.totalWeeks),
    });
    setIsResetDialogOpen(false);
    setActiveTab("today");
    toast.success("Chu kỳ đã được reset từ tuần này.", {
      description: "Việc, check-in và review tuần của chu kỳ hiện tại đã được làm mới để bạn bắt đầu lại gọn hơn.",
    });
    refreshAfterGoalUpdate();
  };

  return (
    <div className="space-y-8 pb-12">
      <UpgradePaywallDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        context={upgradeContext}
        currentPlan={activePlanCode}
        goalId={activeGoal.id}
        recommendedPlan={upgradeRecommendedPlan}
        source={activeTab === "settings" ? "settings" : upgradeContext === "review" ? "review_teaser" : "12_week_system"}
        onCheckoutComplete={handleCheckoutComplete}
      />

      <NewUserGuideBanner userData={getUserData()} variant="compact" />
      <SpotlightTour
        open={isTourOpen}
        onOpenChange={setIsTourOpen}
        title="Tour trung tâm 12 tuần"
        description="Bốn điểm chính để người mới biết nên làm gì trong chu kỳ đang chạy."
        steps={TWELVE_WEEK_TOUR_STEPS_CLEAN}
        onStepChange={handleTourStepChange}
      />

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Làm mới chu kỳ 12 tuần?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ bắt đầu lại tuần 1 từ tuần hiện tại, xóa việc đã hoàn thành, check-in hằng ngày,
              review tuần và nhật ký review tuần đã liên kết của chu kỳ đang chạy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetCycle}>Làm mới từ tuần này</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearLocalDialogOpen} onOpenChange={setIsClearLocalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa dấu vết local trên thiết bị này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này chỉ xóa nhật ký sự kiện, outbox và trạng thái nhắc việc local. Mục tiêu,
              review tuần, nhật ký và vision board của bạn vẫn được giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearLocalSignals}>Xóa dấu vết local</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="relative p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_22%)] opacity-90" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_360px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Compass className="h-4 w-4" />
                Nhịp 12 tuần
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                  Đây là nơi giữ nhịp thực thi mỗi ngày của chu kỳ 12 tuần.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                  Hôm nay, review tuần, tiến độ và cài đặt cùng ở một chỗ để bạn luôn trả lời được câu hỏi: hôm nay mình cần làm gì tiếp?
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  <Target className="mr-1 h-3.5 w-3.5" />
                  {activeGoal.title}
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  {getLifeAreaLabel(activeGoal.focusArea || activeGoal.category)}
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  Gói: {getPlanLabel(activePlanCode)}
                </Badge>
                {activeGoal.feasibilityResult && (
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    {getFeasibilityResultLabel(activeGoal.feasibilityResult)}
                  </Badge>
                )}
                {reviewDueToday && (
                  <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-100/90 px-4 py-2 text-amber-900">
                    Review hôm nay
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="border-white/18 bg-white text-slate-900 hover:bg-white/92" onClick={() => handleTabChange("today")}>
                  Mở Hôm nay
                </Button>
                <Button variant="outline" className="border-white/18 bg-white/12 text-white hover:bg-white/18 hover:text-white" onClick={() => navigate("/goals")}>
                  Mở Mục tiêu
                </Button>
              </div>
            </div>
            <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">Việc kế tiếp</p>
              <div className="mt-5 rounded-[24px] border border-white/12 bg-black/14 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-white/55">
                  {reviewDueToday ? "Ưu tiên ngay" : firstPriorityTask ? "Ưu tiên số 1" : "Trạng thái hôm nay"}
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {reviewDueToday
                    ? "Chốt review tuần"
                    : firstPriorityTask
                      ? firstPriorityTask.title
                      : "Hôm nay đang khá gọn"}
                </p>
                <p className="mt-2 text-sm leading-7 text-white/74">
                  {reviewDueToday
                    ? "Nếu chốt review ngay hôm nay, tuần sau sẽ bắt đầu nhẹ đầu hơn nhiều."
                    : firstPriorityTask
                      ? `${firstPriorityTask.leadIndicatorName} • ${
                          firstPriorityTask.isCore ? "Việc cốt lõi nên làm trước." : "Việc tùy chọn nếu bạn còn sức."
                        }`
                      : "Bạn đã đi qua phần việc mở của hôm nay. Có thể tranh thủ xem lại tuần hoặc chuẩn bị review."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 border-white/15 bg-white text-slate-900 hover:bg-white/92"
                  onClick={() => handleTabChange(reviewDueToday ? "week" : "today")}
                >
                  {reviewDueToday ? "Mở tab Tuần" : "Mở tab Hôm nay"}
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[22px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Tuần hiện tại</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    <CountUp value={currentWeek} />/{system.totalWeeks}
                  </p>
                  {currentWeekRange && (
                    <p className="mt-1 text-sm text-white/68">
                      {formatCalendarDate(currentWeekRange.start)} - {formatCalendarDate(currentWeekRange.end)}
                    </p>
                  )}
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Việc mở hôm nay</p>
                  <p className="mt-2 text-3xl font-bold text-white">{todayRemainingCount}</p>
                  <p className="mt-1 text-sm text-white/68">
                    {overdueOpenCount > 0
                      ? `${overdueOpenCount} việc đang bị trễ`
                      : `${todayCompletedCount}/${todayQueue.length || currentWeekTasks.length || 1} việc đã chốt`}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Review tuần</p>
                  <p className="mt-2 text-xl font-bold text-white">{reviewDueToday ? "Hôm nay" : getReviewDayLabel(system.reviewDay)}</p>
                  <p className="mt-1 text-sm text-white/68">{reviewStatusLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {allGoals.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Đổi mục tiêu 12 tuần</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={activeGoal.id} onValueChange={(value) => loadGoalData(value)}>
              <SelectTrigger className="max-w-xl" aria-label="Chọn mục tiêu 12 tuần">
                <SelectValue placeholder="Chọn mục tiêu" />
              </SelectTrigger>
              <SelectContent>
                {allGoals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>{goal.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList
          data-tour-id="system-tabs"
          aria-label="Điều hướng trung tâm 12 tuần"
          className="sticky top-3 z-20 flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-[22px] border border-white/80 bg-white/86 p-1.5 shadow-[0_22px_48px_-30px_rgba(15,23,42,0.34)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsTrigger value="today" className="min-w-[120px] shrink-0 justify-center gap-2 rounded-2xl px-4 py-2.5 sm:min-w-0 sm:flex-1 md:flex-none md:justify-start">
            <ListTodo className="h-4 w-4" />
            Hôm nay
          </TabsTrigger>
          <TabsTrigger value="week" className="min-w-[120px] shrink-0 justify-center gap-2 rounded-2xl px-4 py-2.5 sm:min-w-0 sm:flex-1 md:flex-none md:justify-start">
            <CalendarDays className="h-4 w-4" />
            Tuần
          </TabsTrigger>
          <TabsTrigger value="progress" className="min-w-[120px] shrink-0 justify-center gap-2 rounded-2xl px-4 py-2.5 sm:min-w-0 sm:flex-1 md:flex-none md:justify-start">
            <BarChart3 className="h-4 w-4" />
            Tiến độ
          </TabsTrigger>
          <TabsTrigger value="settings" className="min-w-[120px] shrink-0 justify-center gap-2 rounded-2xl px-4 py-2.5 sm:min-w-0 sm:flex-1 md:flex-none md:justify-start">
            <Settings2 className="h-4 w-4" />
            Cài đặt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6 pt-4">
          <TwelveWeekTodayTab
            system={system}
            currentWeek={currentWeek}
            currentWeekRange={currentWeekRange}
            currentPlanFocus={currentPlanFocus}
            reviewDueToday={reviewDueToday}
            reviewStatusLabel={reviewStatusLabel}
            currentWeekScoreValue={currentWeekScoreValue}
            weekCompletion={weekCompletion}
            coreTacticCount={coreTacticCount}
            optionalTacticCount={optionalTacticCount}
            missedTasks={missedTasks}
            todayQueue={todayQueue}
            currentWeekTasksCount={currentWeekOpenTasks.length}
            todayDateKey={todayDateKey}
            todayCompletedCount={todayCompletedCount}
            todayRemainingCount={todayRemainingCount}
            overdueOpenCount={overdueOpenCount}
            optionalOpenThisWeekCount={optionalOpenThisWeekCount}
            firstPriorityTask={firstPriorityTask}
            secondaryTodayTasks={secondaryTodayTasks}
            hasSmartRescue={hasSmartRescue}
            rescuePlanSummary={rescuePlanSummary}
            dailyMood={dailyMood}
            dailyNote={dailyNote}
            latestCheckIn={latestCheckIn}
            onReentry={handleReentry}
            onApplyRecommendedReentry={handleApplyRecommendedReentry}
            onOpenSmartRescue={() => handleOpenUpgradeDialog("plan", "PLUS")}
            onToggleTask={handleToggleTask}
            onDailyMoodChange={setDailyMood}
            onDailyNoteChange={setDailyNote}
            onSaveCheckIn={handleSaveCheckIn}
          />
        </TabsContent>

        <TabsContent value="week" className="space-y-6 pt-4">
          <Suspense
            fallback={
              <TwelveWeekTabFallback
                title="Đang mở tab Tuần"
                description="Phần review tuần và gợi ý cho tuần sau sẽ hiện ra ngay sau khi tải xong."
              />
            }
          >
            <TwelveWeekWeekTab
              system={system}
              currentWeekRange={currentWeekRange}
              currentPlanFocus={currentPlanFocus}
              currentPlanMilestone={currentPlanMilestone}
              reviewDueToday={reviewDueToday}
              reviewStatusLabel={reviewStatusLabel}
              currentScoreValue={currentWeekScoreValue}
              weekCompletion={weekCompletion}
              currentLagMetricValue={currentLagMetricValue}
              coreIndicators={coreIndicators}
              optionalIndicators={optionalIndicators}
              currentPlanCode={activePlanCode}
              hasPremiumInsights={hasPremiumReviewInsights}
              premiumInsight={premiumReviewInsight}
              suggestedNextWeekPlan={suggestedNextWeekPlan}
              weeklyForm={weeklyForm}
              onWeeklyFormChange={(field, value) =>
                setWeeklyForm((previousForm) => ({
                  ...previousForm,
                  [field]: value,
                }))
              }
              onApplySuggestedPlan={handleApplySuggestedPlan}
              onOpenPremiumInsights={() => handleOpenUpgradeDialog("review", "PLUS")}
              onSaveWeeklyReview={handleSaveWeeklyReview}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="progress">
          <Suspense
            fallback={
              <TwelveWeekTabFallback
                title="Đang mở tab Tiến độ"
                description="Bảng điểm và cột mốc của chu kỳ đang được chuẩn bị cho bạn."
              />
            }
          >
            <TwelveWeekProgressTab
              system={system}
              currentWeek={currentWeek}
              currentWeekRange={currentWeekRange}
              currentWeekScoreValue={currentWeekScoreValue}
              averageScore={averageScore}
              reviewDoneCount={reviewDoneCount}
              weekCompletion={weekCompletion}
              milestoneItems={milestoneItems}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings">
          <Suspense
            fallback={
              <TwelveWeekTabFallback
                title="Đang mở tab Cài đặt"
                description="Phần chỉnh nhịp chu kỳ, dữ liệu local và quyền gói đang được tải."
              />
            }
          >
            <TwelveWeekSettingsTab
              system={system}
              currentPlanCode={activePlanCode}
              entitlementKeys={activeEntitlementKeys}
              billingProviderStatus={billingProviderStatus}
              lastEntitlementSyncSnapshot={lastEntitlementSyncSnapshot}
              lastRestoreAccessSnapshot={lastRestoreAccessSnapshot}
              appPreferences={appPreferences}
              funnelSteps={funnelSteps}
              monetizationSteps={monetizationSteps}
              browserNotificationStatus={browserNotificationStatus}
              lastSyncSnapshot={lastSyncSnapshot}
              pendingOutboxCount={pendingOutboxCount}
              archivedOutboxCount={archivedOutboxCount}
              eventCount={eventCount}
              activeReminders={activeReminders}
              recentOutboxItems={recentOutboxItems}
              isSyncingEntitlements={isSyncingEntitlements}
              isRestoringPlanAccess={isRestoringPlanAccess}
              onReviewDayChange={handleReviewDayChange}
              onReminderTimeChange={handleReminderTimeChange}
              onLoadPreferenceChange={handleLoadPreferenceChange}
              onStatusChange={handleStatusChange}
              onTacticPriorityChange={handleTacticPriorityChange}
              onTacticTypeChange={handleTacticTypeChange}
              onPreferenceToggle={handlePreferenceToggle}
              onArchivePendingOutbox={handleArchivePendingOutbox}
              onRestoreArchivedOutbox={handleRestoreArchivedOutbox}
              onOpenReminder={handleOpenReminder}
              onExportLocalData={handleExportLocalData}
              onBrowserNotificationToggle={handleBrowserNotificationToggle}
              onRunOutboxSync={handleRunOutboxSync}
              onOutboxItemToggle={handleOutboxItemToggle}
              onClearEventLog={() => {
                clearEventLog();
                refreshAfterGoalUpdate();
              }}
              onClearArchivedOutbox={() => {
                clearArchivedOutbox();
                refreshAfterGoalUpdate();
              }}
              onOpenClearLocalDialog={() => setIsClearLocalDialogOpen(true)}
              onOpenResetDialog={() => setIsResetDialogOpen(true)}
              onOpenUpgradePlan={(planCode) => handleOpenUpgradeDialog("plan", planCode)}
              onSyncEntitlements={handleSyncEntitlements}
              onRestorePlanAccess={handleRestorePlanAccess}
              onOpenBillingPortal={handleOpenBillingPortal}
              onNavigateGoals={() => navigate("/goals")}
              onNavigateJournal={() => navigate("/journal")}
              onNavigateSetup={() => navigate("/life-insight")}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

