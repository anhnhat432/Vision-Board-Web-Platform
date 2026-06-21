import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Circle,
  Lock,
  Mail,
  MailOpen,
  Plus,
  RotateCcw,
  Search,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/app/components/states/EmptyState";
import { useOptionalAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { enqueueStoredMutation } from "@/features/plan12week/persistence/mutationQueue";
import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { getTwelveWeekClientPlanId } from "@/features/plan12week/persistence/twelveWeekImportPayload";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { getBackendGoalId } from "@/lib/api/goalLinkStore";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { getGoalArchetypeIcon, MountainMoonIllustration } from "../components/illustrations";
import { PageHero } from "../components/layout/PageHero";
import { SpotlightTour, type SpotlightTourStep } from "../components/SpotlightTour";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
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
import { Button } from "../components/ui/button";
import { CountUp } from "../components/ui/count-up";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";
import { SpotlightCard } from "../components/ui/spotlight-card";
import { cn } from "../components/ui/utils";
import { useBackendProgressOverlayMap } from "../hooks/useBackendProgressOverlay";
import { usePageTour } from "../hooks/usePageTour";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { soundService } from "../services/soundService";
import { isRealMode, shouldEnable12WeekGoalTombstoneSync } from "../utils/app-mode";
import { celebrateSpark, celebrateSpotlight } from "../utils/experience";
import { hasReachedLimit } from "../utils/feature-entitlements";
import {
  APP_STORAGE_KEYS,
  calculateGoalProgress,
  clearGoalPlanningDrafts,
  deleteGoal as deleteLocalGoal,
  type Goal,
  getCalendarDayDifference,
  getGoalExecutionStats,
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
  getUserData,
  type PricingPlanCode,
  recomputeGoalProgressFromWeeks,
  saveUserData,
  type TwelveWeekSystem,
  type TwelveWeekTaskInstance,
  toggleTwelveWeekTask,
  type UserData,
  updateGoal,
} from "../utils/storage";
import { getPlanLabel } from "../utils/twelve-week-premium";

const CATEGORY_STYLES: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    bar: string;
  }
> = {
  default: {
    bg: "bg-app-accent-soft text-app-accent",
    text: "text-app-accent",
    border: "border-app-accent/15",
    bar: "from-app-accent/80 to-app-accent",
  },
};

const GOALTRACKER_TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "hero",
    targetId: "goaltracker-hero",
    title: "Bắt đầu mục tiêu ở đây",
    description:
      "Khi chưa biết đi tiếp thế nào, dùng hai nút đầu trang để vào luồng 12 tuần có hướng dẫn hoặc tạo nhanh một mục tiêu SMART.",
  },
  {
    id: "summary",
    targetId: "goaltracker-summary",
    title: "Xem sức khỏe mục tiêu trong một hàng",
    description:
      "Dải số liệu này cho biết bạn đang có bao nhiêu mục tiêu, bao nhiêu việc đã chốt và mục tiêu nào cần chú ý trước.",
  },
  {
    id: "goals",
    targetId: "goaltracker-goals",
    title: "Quản lý mục tiêu chính ở khu vực này",
    description:
      "Danh sách bên dưới là nơi mở hệ 12 tuần, đánh dấu việc nhỏ, hoặc xử lý mục tiêu quá hạn mà không phải quét toàn bộ trang.",
  },
];

const completedGoalStyle = `
  @keyframes completedBorderGlow {
    0%, 100% {
      border-color: rgba(16, 185, 129, 0.35);
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.08), inset 0 0 4px rgba(16, 185, 129, 0.02);
    }
    50% {
      border-color: rgba(52, 211, 153, 0.7);
      box-shadow: 0 0 20px rgba(52, 211, 153, 0.22), inset 0 0 6px rgba(52, 211, 153, 0.04);
    }
  }
  .completed-goal-glow {
    animation: completedBorderGlow 4s infinite ease-in-out;
  }
  .perspective-1000 {
    perspective: 1000px;
  }
  .preserve-3d {
    transform-style: preserve-3d;
  }
  .backface-hidden {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
  .card-transition {
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

interface GoalCompletionDetails {
  completedAtStr: string;
  completedTasks: number;
  totalTasks: number;
}

const getGoalCompletionDetails = (goal: Goal): GoalCompletionDetails => {
  const stats = getGoalExecutionStats(goal);
  let latestDate: Date | null = null;

  if (goal.twelveWeekSystem) {
    for (const task of goal.twelveWeekSystem.taskInstances) {
      if (task.completed && task.completedAt) {
        try {
          const d = new Date(task.completedAt);
          if (!Number.isNaN(d.getTime())) {
            if (!latestDate || d > latestDate) {
              latestDate = d;
            }
          }
        } catch {}
      }
    }
  } else {
    for (const task of goal.tasks) {
      if (task.completed && task.lastModifiedAt) {
        try {
          const d = new Date(task.lastModifiedAt);
          if (!Number.isNaN(d.getTime())) {
            if (!latestDate || d > latestDate) {
              latestDate = d;
            }
          }
        } catch {}
      }
    }
  }

  let completedAtStr = "Vừa hoàn thành";
  if (latestDate) {
    const day = String(latestDate.getDate()).padStart(2, "0");
    const month = String(latestDate.getMonth() + 1).padStart(2, "0");
    const year = latestDate.getFullYear();
    completedAtStr = `${day}/${month}/${year}`;
  }

  return {
    completedAtStr,
    completedTasks: stats.completed,
    totalTasks: stats.total,
  };
};

interface HealthStatus {
  label: string;
  bgClass: string;
}

const getGoalHealthStatus = (
  goal: Goal,
  progress: number,
  isOverdue: boolean,
  isNearDeadline: boolean,
): HealthStatus => {
  const stats = getGoalExecutionStats(goal);

  if (progress === 100) {
    return {
      label: "Hoàn thành ✨",
      bgClass:
        "bg-app-status-success/10 text-app-status-success border border-app-status-success/30"
    };
  }
  if (isOverdue) {
    return {
      label: "Cần chỉnh nhịp 🌊",
      bgClass:
        "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30",
    };
  }
  if (stats.reviewDueToday) {
    return {
      label: "Đến ngày review 📋",
      bgClass:
        "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/30"
    };
  }
  if (isNearDeadline) {
    return {
      label: "Sắp đến hạn ⏳",
      bgClass: "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/30",
    };
  }
  return {
    label: "Đang đi đều 🌱",
    bgClass: "bg-app-status-info/10 text-app-status-info border border-app-status-info/30",
  };
};

interface FocusGoalData {
  goal: Goal;
  progress: number;
  isOverdue: boolean;
  isNearDeadline: boolean;
  isTwelveWeek: boolean;
  type: "today_tasks" | "review_due" | "due_warning" | "first_active_12week";
}

interface GoalMetadata {
  goal: Goal;
  progress: number;
  daysLeft: number | null;
  isOverdue: boolean;
  isNearDeadline: boolean;
  isAtRisk: boolean;
  isCompleted: boolean;
  isTwelveWeek: boolean;
  isSimple: boolean;
}

const getTodayFocusGoal = (goalsWithMetadata: GoalMetadata[]): FocusGoalData | null => {
  const activeGoals = goalsWithMetadata.filter((m) => !m.isCompleted);
  if (activeGoals.length === 0) return null;

  const p1 = activeGoals.find((m) => {
    if (!m.isTwelveWeek || !m.goal.twelveWeekSystem) return false;
    const todayTasks = getTwelveWeekTodayTasks(m.goal.twelveWeekSystem);
    return todayTasks.some((t) => !t.completed);
  });
  if (p1) {
    return {
      goal: p1.goal,
      progress: p1.progress,
      isOverdue: p1.isOverdue,
      isNearDeadline: p1.isNearDeadline,
      isTwelveWeek: p1.isTwelveWeek,
      type: "today_tasks",
    };
  }

  const p2 = activeGoals.find((m) => getGoalExecutionStats(m.goal).reviewDueToday);
  if (p2) {
    return {
      goal: p2.goal,
      progress: p2.progress,
      isOverdue: p2.isOverdue,
      isNearDeadline: p2.isNearDeadline,
      isTwelveWeek: p2.isTwelveWeek,
      type: "review_due",
    };
  }

  const p3 = activeGoals.find((m) => m.isOverdue || m.isNearDeadline);
  if (p3) {
    return {
      goal: p3.goal,
      progress: p3.progress,
      isOverdue: p3.isOverdue,
      isNearDeadline: p3.isNearDeadline,
      isTwelveWeek: p3.isTwelveWeek,
      type: "due_warning",
    };
  }

  const p4 = activeGoals.find((m) => m.isTwelveWeek && m.goal.twelveWeekSystem?.status === "active");
  if (p4) {
    return {
      goal: p4.goal,
      progress: p4.progress,
      isOverdue: p4.isOverdue,
      isNearDeadline: p4.isNearDeadline,
      isTwelveWeek: p4.isTwelveWeek,
      type: "first_active_12week",
    };
  }

  return null;
};

interface WeeklyQuestDetails {
  completedDays: number;
  targetDays: number;
  hasSchedule: boolean;
}

const getWeeklyQuestDetails = (system: TwelveWeekSystem): WeeklyQuestDetails => {
  const currentWeek = getTwelveWeekCurrentWeek(system);
  const weekTasks = getTwelveWeekTasksForWeek(system, currentWeek);
  const activeTasks = weekTasks.filter((t) => !t.skipped);
  const uniqueScheduledDays = Array.from(new Set(activeTasks.map((t) => t.scheduledDate).filter(Boolean)));
  const completedDays = uniqueScheduledDays.filter((date) =>
    activeTasks.some((t) => t.scheduledDate === date && t.completed),
  ).length;
  const targetDays = Math.min(3, uniqueScheduledDays.length);

  return {
    completedDays,
    targetDays,
    hasSchedule: uniqueScheduledDays.length > 0,
  };
};

interface TodayFocusCardProps {
  focusData: FocusGoalData | null;
  openTwelveWeekCenter: (goalId: string) => void;
  handleToggleTask: (goalId: string, taskId: string) => void;
  onStartGuidedGoalFlow: () => void;
}

function TodayFocusCard({
  focusData,
  openTwelveWeekCenter,
  handleToggleTask,
  onStartGuidedGoalFlow,
}: TodayFocusCardProps) {
  if (!focusData) {
    return (
      <div className="rounded-[18px] border border-app-line bg-app-surface p-5 shadow-app-sm text-center py-6 space-y-3 relative overflow-hidden">
        {/* Washi tape decoration */}
        <div className="absolute -top-2 left-6 w-12 h-3.5 bg-app-accent/10 dark:bg-app-accent/20 backdrop-blur-[1px] rotate-[-2deg] border border-dashed border-app-accent/15 z-10" />
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
          <Target className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-app-ink">Tất cả mục tiêu đã hoàn tất!</h3>
          <p className="text-xs text-app-ink-soft leading-relaxed max-w-md mx-auto">
            Không có tiêu điểm hành động cần xử lý. Hãy thiết lập một chu kỳ 12 tuần mới hoặc thêm mục tiêu thường để
            tiếp tục hành trình.
          </p>
        </div>
        <Button
          onClick={onStartGuidedGoalFlow}
          className="bg-app-accent hover:bg-app-accent-hover text-white text-xs font-bold rounded-lg px-4 py-2"
        >
          Thiết lập mục tiêu mới
        </Button>
      </div>
    );
  }

  const { goal, isTwelveWeek, type } = focusData;
  const system = goal.twelveWeekSystem;
  const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;
  const areaStyle = CATEGORY_STYLES.default;

  let recommendedAction = "";
  let ctaLabel = "Tiếp tục chu kỳ";
  let showTaskCheckbox = false;
  let firstOpenTask: TwelveWeekTaskInstance | null = null;

  if (isTwelveWeek && system) {
    const todayTasks = getTwelveWeekTodayTasks(system);
    firstOpenTask = todayTasks.find((t) => !t.completed) || null;
  }

  if (type === "today_tasks" && firstOpenTask) {
    recommendedAction = `Nhiệm vụ tiếp theo: ${firstOpenTask.title}`;
    showTaskCheckbox = true;
  } else if (type === "review_due") {
    recommendedAction = "Đã đến ngày đánh giá. Hãy hoàn thành review tuần này để đúc kết bài học.";
    ctaLabel = "Đánh giá tuần";
  } else if (type === "due_warning") {
    recommendedAction = "Mục tiêu sắp hoặc đã trễ hạn. Hãy rà soát lại các hành động để tránh trễ hạn.";
    ctaLabel = isTwelveWeek ? "Tiếp tục chu kỳ" : "Xem chi tiết";
  } else {
    recommendedAction = isTwelveWeek
      ? "Lên kế hoạch các hành động tiếp theo cho tuần này."
      : "Cập nhật các nhiệm vụ của bạn.";
    ctaLabel = isTwelveWeek ? "Tiếp tục chu kỳ" : "Xem chi tiết";
  }

  const handleCtaClick = () => {
    if (isTwelveWeek) {
      openTwelveWeekCenter(goal.id);
    } else {
      const el = document.getElementById(`goal-card-${goal.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-app-accent/40");
        setTimeout(() => el.classList.remove("ring-2", "ring-app-accent/40"), 2000);
      }
    }
  };

  return (
    <div className="rounded-[18px] bg-[#EDF7E0] dark:bg-[#1a2e1a] border border-[#0C5E3A]/20 p-5 sm:p-[22px_24px] shadow-app-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
      <div className="space-y-3 min-w-0 flex-1 z-10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-app-accent shrink-0" />
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-accent">Tiêu điểm hôm nay</p>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-app-ink leading-snug break-words">
            {goal.title}
          </h3>
          <p className="text-xs text-[#5C7A5C] dark:text-green-400/80 font-semibold">
            {isTwelveWeek ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"} ·{" "}
            <span className={cn("font-bold", areaStyle.text)}>{getLifeAreaLabel(goal.category)}</span>
          </p>
        </div>

        <div className="flex items-start gap-2 pt-0.5 min-w-0">
          {showTaskCheckbox && firstOpenTask ? (
            <div className="inline-flex items-center gap-2.5 rounded-[11px] border border-app-accent/20 bg-white/70 dark:bg-white/10 px-[15px] py-[11px] transition-all duration-300">
              <button
                type="button"
                onClick={() => handleToggleTask(goal.id, firstOpenTask.id)}
                className="flex shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                aria-label="Chốt việc"
              >
                <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-app-accent hover:bg-app-accent/10 transition-all duration-200">
                  <Circle className="size-3 text-app-ink-muted hover:text-app-accent shrink-0 opacity-0" />
                </span>
              </button>
              <span className="text-[13px] font-semibold truncate text-app-ink">{firstOpenTask.title}</span>
            </div>
          ) : (
            <p className="text-sm text-app-ink-soft leading-relaxed font-medium">💡 {recommendedAction}</p>
          )}
        </div>
      </div>

      <div className="shrink-0 z-10 self-end sm:self-center">
        <Button
          onClick={handleCtaClick}
          className="bg-app-accent text-white hover:bg-app-accent-hover font-bold rounded-full px-[22px] py-[13px] text-[13.5px] shadow-app-sm transition-all duration-200 flex items-center gap-2"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface WeeklyQuestLineProps {
  system: TwelveWeekSystem;
}

function WeeklyQuestLine({ system }: WeeklyQuestLineProps) {
  const quest = useMemo(() => getWeeklyQuestDetails(system), [system]);

  if (!quest.hasSchedule) {
    return (
      <div className="bg-app-bg-subtle/20 rounded-lg p-2.5 border border-app-line/20 text-[11px] text-app-ink-muted/80 italic">
        Không có lịch trình tuần này.
      </div>
    );
  }

  const { completedDays, targetDays } = quest;

  return (
    <div className="bg-app-bg-subtle/30 rounded-lg p-2.5 border border-app-line/30 text-xs flex justify-between items-center transition-all duration-300">
      <div className="min-w-0 flex-1 truncate">
        <span className="font-bold text-app-ink-soft">Nhiệm vụ tuần:</span>{" "}
        <span className="text-app-ink-muted">Hoàn thành {targetDays} ngày hành động</span>
      </div>
      <div className="font-bold text-app-accent shrink-0 pl-2 tabular-nums">
        {completedDays}/{targetDays} ngày đã chốt
      </div>
    </div>
  );
}

export function GoalTracker() {
  const { userData, reloadUserData } = useSyncedUserData();
  const authContext = useOptionalAuthContext();
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  if (!userData) {
    return <GoalTrackerSkeleton />;
  }

  return (
    <GoalTrackerContent
      userData={userData}
      goalToDelete={goalToDelete}
      setGoalToDelete={setGoalToDelete}
      onReload={reloadUserData}
      canSyncRemoteDelete={isRealMode() && isApiBaseUrlConfigured() && Boolean(authContext?.user)}
    />
  );
}

function GoalTrackerContent({
  userData,
  goalToDelete,
  setGoalToDelete,
  onReload,
  canSyncRemoteDelete,
}: {
  userData: UserData;
  goalToDelete: string | null;
  setGoalToDelete: (value: string | null) => void;
  onReload: () => void;
  canSyncRemoteDelete: boolean;
}) {
  const navigate = useNavigate();
  const { isTourOpen, setIsTourOpen } = usePageTour("goaltracker");
  const autoCloudSync = useOptionalAutoCloudSyncContext();
  const reload = onReload;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "12week" | "simple" | "dueSoon" | "atRisk" | "completed">(
    "all",
  );
  const [viewUserData, setViewUserData] = useState(userData);
  const [isGoalLimitPaywallOpen, setIsGoalLimitPaywallOpen] = useState(false);
  const [locallyUpdatedSystemGoalIds, setLocallyUpdatedSystemGoalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setViewUserData(userData);
  }, [userData]);

  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  const { currentPlanCode } = usePlanEntitlements(viewUserData);

  const goals = useMemo(
    () =>
      [...viewUserData.goals].sort((left, right) => {
        const leftProgress = calculateGoalProgress(left);
        const rightProgress = calculateGoalProgress(right);
        if ((leftProgress === 100) !== (rightProgress === 100)) {
          return leftProgress === 100 ? 1 : -1;
        }
        const leftDays = getCalendarDayDifference(left.deadline) ?? Number.MAX_SAFE_INTEGER;
        const rightDays = getCalendarDayDifference(right.deadline) ?? Number.MAX_SAFE_INTEGER;
        if (leftDays !== rightDays) return leftDays - rightDays;
        return left.title.localeCompare(right.title, "vi");
      }),
    [viewUserData.goals],
  );

  const backendSystemsByGoalId = useBackendProgressOverlayMap(
    useMemo(
      () =>
        goals
          .filter((goal) => Boolean(goal.twelveWeekSystem))
          .map((goal) => ({
            goalId: goal.id,
            system: goal.twelveWeekSystem,
          })),
      [goals],
    ),
  );

  const effectiveGoals = useMemo(
    () =>
      goals.map((goal) => {
        if (!goal.twelveWeekSystem) return goal;

        if (locallyUpdatedSystemGoalIds.has(goal.id)) return goal;

        const effectiveSystem = backendSystemsByGoalId.get(goal.id);
        if (!effectiveSystem) return goal;

        return {
          ...goal,
          twelveWeekSystem: effectiveSystem,
        };
      }),
    [backendSystemsByGoalId, goals, locallyUpdatedSystemGoalIds],
  );

  const goalsWithMetadata = useMemo(() => {
    return effectiveGoals.map((goal) => {
      const progress = calculateGoalProgress(goal);
      const daysLeft = getCalendarDayDifference(goal.deadline);
      const isOverdue = daysLeft !== null && daysLeft < 0 && progress < 100;
      const isNearDeadline = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && progress < 100;
      const stats = getGoalExecutionStats(goal);
      const isAtRisk = isOverdue || stats.reviewDueToday;
      const isCompleted = progress === 100;
      const isTwelveWeek = Boolean(goal.twelveWeekSystem);
      const isSimple = !isTwelveWeek;

      return {
        goal,
        progress,
        daysLeft,
        isOverdue,
        isNearDeadline,
        isAtRisk,
        isCompleted,
        isTwelveWeek,
        isSimple,
      };
    });
  }, [effectiveGoals]);

  const filteredGoalsWithMetadata = useMemo(() => {
    let result = goalsWithMetadata;

    // Lọc theo tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        ({ goal }) => goal.title.toLowerCase().includes(q) || goal.description?.toLowerCase().includes(q),
      );
    }

    // Lọc theo filter chip
    if (activeFilter === "12week") {
      result = result.filter(({ isTwelveWeek }) => isTwelveWeek);
    } else if (activeFilter === "simple") {
      result = result.filter(({ isSimple }) => isSimple);
    } else if (activeFilter === "dueSoon") {
      result = result.filter(({ isNearDeadline }) => isNearDeadline);
    } else if (activeFilter === "atRisk") {
      result = result.filter(({ isAtRisk }) => isAtRisk);
    } else if (activeFilter === "completed") {
      result = result.filter(({ isCompleted }) => isCompleted);
    }

    return result;
  }, [goalsWithMetadata, searchQuery, activeFilter]);

  const focusGoal = useMemo(() => getTodayFocusGoal(goalsWithMetadata), [goalsWithMetadata]);
  const hasGoals = effectiveGoals.length > 0;
  const hasRealLifeBalance =
    viewUserData.onboardingCompleted && viewUserData.currentWheelOfLife.some((area) => area.score > 0);
  const goalFlowStartHref = hasRealLifeBalance ? "/life-insight" : "/onboarding";

  const displayTwelveWeekGoals = useMemo(
    () => filteredGoalsWithMetadata.filter(({ isTwelveWeek }) => isTwelveWeek).map(({ goal }) => goal),
    [filteredGoalsWithMetadata],
  );

  const displayStandardGoals = useMemo(
    () => filteredGoalsWithMetadata.filter(({ isSimple }) => isSimple).map(({ goal }) => goal),
    [filteredGoalsWithMetadata],
  );

  const openTwelveWeekCenter = (goalId: string) => {
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goalId);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goalId);
    navigate("/12-week-system");
  };

  const handleStartGuidedGoalFlow = () => {
    if (hasReachedLimit(viewUserData, "maxActiveGoals")) {
      setIsGoalLimitPaywallOpen(true);
      return;
    }

    clearGoalPlanningDrafts();
    navigate(goalFlowStartHref);
  };

  const handleStartDirectGoalFlow = () => {
    if (hasReachedLimit(viewUserData, "maxActiveGoals")) {
      setIsGoalLimitPaywallOpen(true);
      return;
    }

    clearGoalPlanningDrafts();
    navigate("/smart-goal-setup");
  };

  const handleToggleTask = (goalId: string, taskId: string) => {
    const goal = viewUserData.goals.find((item) => item.id === goalId);
    if (!goal) return;

    if (goal.twelveWeekSystem) {
      const task = goal.twelveWeekSystem.taskInstances.find((item) => item.id === taskId);
      if (!task) return;

      const previousProgress = calculateGoalProgress(goal);
      const nextCompleted = !task.completed;
      const now = Date.now();
      const previousViewUserData = viewUserData;
      const nextSystem = {
        ...goal.twelveWeekSystem,
        taskInstances: goal.twelveWeekSystem.taskInstances.map((item) =>
          item.id === taskId
            ? {
                ...item,
                completed: nextCompleted,
                completedAt: nextCompleted ? new Date(now).toISOString() : undefined,
                lastModifiedAt: now,
              }
            : item,
        ),
      };

      setLocallyUpdatedSystemGoalIds((current) => new Set(current).add(goalId));
      setViewUserData((current) => ({
        ...current,
        goals: current.goals.map((item) =>
          item.id === goalId
            ? {
                ...item,
                twelveWeekSystem: nextSystem,
              }
            : item,
        ),
      }));

      try {
        if (!toggleTwelveWeekTask(goalId, taskId, nextCompleted, now)) {
          throw new Error("Unable to toggle 12-week task");
        }
      } catch {
        setViewUserData(previousViewUserData);
        toast.error("Không thể cập nhật, vui lòng thử lại");
        return;
      }

      const afterData = getUserData();
      setViewUserData(afterData);
      const refreshedProgress = recomputeGoalProgressFromWeeks(goalId) ?? previousProgress;
      const justCompletedGoal = previousProgress < 100 && refreshedProgress === 100;

      if (nextCompleted) {
        if (justCompletedGoal) {
          celebrateSpotlight({ x: 0.82, y: 0.14 });
          soundService.success();
        } else {
          celebrateSpark({ x: 0.82, y: 0.14 });
          soundService.click();
        }
        toast.success(justCompletedGoal ? "Mục tiêu vừa chạm mốc 100%." : "Đã chốt thêm một bước nhỏ.");
      }

      return;
    }

    const previousProgress = calculateGoalProgress(goal);
    const taskWasCompleted = Boolean(goal.tasks.find((task) => task.id === taskId)?.completed);
    const nextCompleted = !taskWasCompleted;
    const now = Date.now();
    const previousViewUserData = viewUserData;
    const nextTasks = goal.tasks.map((task) =>
      task.id === taskId ? { ...task, completed: nextCompleted, lastModifiedAt: now } : task,
    );

    setViewUserData((current) => ({
      ...current,
      goals: current.goals.map((item) => (item.id === goalId ? { ...item, tasks: nextTasks } : item)),
    }));

    try {
      const latestGoal = getUserData().goals.find((item) => item.id === goalId) ?? goal;
      updateGoal(goalId, {
        tailwindClass: "update-goal",
        tasks: latestGoal.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: nextCompleted, lastModifiedAt: now } : task,
        ),
      } as Partial<Goal>);
    } catch {
      setViewUserData(previousViewUserData);
      toast.error("Không thể cập nhật, vui lòng thử lại");
      return;
    }

    const afterData = getUserData();
    const refreshedGoal = afterData.goals.find((item) => item.id === goalId);
    const refreshedProgress = refreshedGoal ? calculateGoalProgress(refreshedGoal) : previousProgress;
    const justCompletedGoal = previousProgress < 100 && refreshedProgress === 100;

    if (!taskWasCompleted) {
      if (justCompletedGoal) {
        celebrateSpotlight({ x: 0.82, y: 0.14 });
        soundService.success();
      } else {
        celebrateSpark({ x: 0.82, y: 0.14 });
        soundService.click();
      }
      toast.success(justCompletedGoal ? "Mục tiêu vừa chạm mốc 100%." : "Đã chốt thêm một bước nhỏ.");
    }

    reload();
  };

  const handleConfirmDeleteGoal = () => {
    if (!goalToDelete) return;
    const deletedGoalId = goalToDelete;
    const snapshot = getUserData();
    const backendGoalId = getBackendGoalId(deletedGoalId);
    const backendPlanId = getPlanLink(deletedGoalId)?.planId ?? null;
    const clientPlanId = getTwelveWeekClientPlanId(deletedGoalId);
    const shouldQueueRemoteDelete =
      canSyncRemoteDelete && shouldEnable12WeekGoalTombstoneSync() && Boolean(backendPlanId || backendGoalId);

    deleteLocalGoal(deletedGoalId);
    setViewUserData((current) => ({
      ...current,
      goals: current.goals.filter((goal) => goal.id !== deletedGoalId),
    }));
    setGoalToDelete(null);
    reload();
    if (shouldQueueRemoteDelete) {
      const deletedAt = new Date().toISOString();
      if (backendGoalId) {
        enqueueStoredMutation({
          kind: "goal_deleted",
          goalId: deletedGoalId,
          planId: clientPlanId,
          payload: {
            clientGoalId: deletedGoalId,
            backendGoalId,
            backendPlanId: backendPlanId ?? undefined,
            deletedAt,
          },
        });
      }
      if (backendPlanId) {
        enqueueStoredMutation({
          kind: "plan_deleted",
          goalId: deletedGoalId,
          planId: clientPlanId,
          payload: {
            clientPlanId,
            backendPlanId,
            clientGoalId: deletedGoalId,
            deletedAt,
          },
        });
      }
      void autoCloudSync?.triggerDrainOnly();
      toast.success("Mục tiêu đã được xóa.");
      return;
    }

    toast.success("Mục tiêu đã được xóa.", {
      action: {
        label: "Hoàn tác",
        onClick: () => {
          saveUserData(snapshot);
          setViewUserData(snapshot);
          reload();
          toast.info("Đã khôi phục mục tiêu.");
        },
      },
    });
  };

  const summary = useMemo(() => {
    const totalGoals = effectiveGoals.length;
    const completedGoals = effectiveGoals.filter((goal) => calculateGoalProgress(goal) === 100).length;
    const completedTasks = effectiveGoals.reduce((sum, goal) => sum + getGoalExecutionStats(goal).completed, 0);
    const totalTasks = effectiveGoals.reduce((sum, goal) => sum + getGoalExecutionStats(goal).total, 0);
    const activeSystems = effectiveGoals.filter((goal) => Boolean(goal.twelveWeekSystem)).length;

    const dueSoon = effectiveGoals.filter((goal) => {
      const daysLeft = getCalendarDayDifference(goal.deadline);
      return calculateGoalProgress(goal) < 100 && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    }).length;

    const overdue = effectiveGoals.filter((goal) => {
      const daysLeft = getCalendarDayDifference(goal.deadline);
      return calculateGoalProgress(goal) < 100 && daysLeft !== null && daysLeft < 0;
    }).length;

    const reviewDue = effectiveGoals.filter((goal) => getGoalExecutionStats(goal).reviewDueToday).length;

    return {
      totalGoals,
      completedGoals,
      completedTasks,
      totalTasks,
      activeSystems,
      dueSoon,
      overdue,
      reviewDue,
      needsAttention: dueSoon + overdue + reviewDue,
    };
  }, [effectiveGoals]);

  const filterCounts = useMemo(() => {
    return {
      all: goalsWithMetadata.length,
      twelveWeek: goalsWithMetadata.filter(({ isTwelveWeek }) => isTwelveWeek).length,
      simple: goalsWithMetadata.filter(({ isSimple }) => isSimple).length,
      dueSoon: goalsWithMetadata.filter(({ isNearDeadline }) => isNearDeadline).length,
      atRisk: goalsWithMetadata.filter(({ isAtRisk }) => isAtRisk).length,
      completed: goalsWithMetadata.filter(({ isCompleted }) => isCompleted).length,
    };
  }, [goalsWithMetadata]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 lg:px-8">
      <style>{completedGoalStyle}</style>
      <UpgradePaywallDialog
        open={isGoalLimitPaywallOpen}
        onOpenChange={setIsGoalLimitPaywallOpen}
        context="plan"
        currentPlan={currentPlanCode}
        title="Bạn đã có 3 mục tiêu"
        description="Nâng cấp Plus để tạo thêm mục tiêu. Dữ liệu hiện có vẫn được giữ nguyên."
        source="goal_tracker"
      />
      <AlertDialog
        open={Boolean(goalToDelete)}
        onOpenChange={(open) => {
          if (!open) setGoalToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa mục tiêu này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Mục tiêu và toàn bộ việc liên quan sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteGoal}
              className="bg-app-status-error hover:bg-app-status-error/90 text-white"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grid Layout 2 Cột trên Desktop, 1 Cột trên Mobile */}
      <div className="space-y-8 lg:space-y-10">
        {/* HERO + FOCUS RAIL - 2 cột */}
        <section className="grid gap-5 lg:grid-cols-[1fr_320px] lg:gap-6">
          {/* Hero Section gọn gàng & chuyên nghiệp */}
          <PageHero
            tourId="goaltracker-hero"
            className="bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/20 dark:from-app-bg dark:via-app-bg dark:to-app-accent-soft/5 border-app-line/80 rounded-[18px]"
            eyebrow="MỤC TIÊU"
            title={
              <span className="font-serif text-3xl font-semibold leading-tight tracking-normal text-app-ink sm:text-4xl">
                Hành trình mục tiêu
              </span>
            }
            description="Tập trung vào những gì cốt lõi nhất. Chia nhỏ mục tiêu lớn thành các chu kỳ 12 tuần để hành động đều đặn."
            primaryCta={
              <Button
                className="bg-app-accent text-white rounded-full px-5 py-2.5 text-sm font-bold hover:bg-app-accent-hover transition-all duration-200 shadow-app-sm hover:shadow-app-md hover:scale-[1.01] inline-flex items-center justify-center gap-2 w-full sm:w-auto !whitespace-normal sm:!whitespace-nowrap !h-auto sm:!h-10"
                onClick={handleStartGuidedGoalFlow}
              >
                <Zap className="h-4.5 w-4.5" />
                Bắt đầu chu kỳ 12 tuần
              </Button>
            }
            secondaryCta={
              <Button
                variant="outline"
                className="rounded-full border border-app-line bg-app-surface text-app-ink hover:bg-app-bg px-5 py-2.5 text-sm font-bold transition-all duration-200 shadow-app-sm hover:shadow-app-md hover:scale-[1.01] inline-flex items-center justify-center gap-2 w-full sm:w-auto !whitespace-normal sm:!whitespace-nowrap !h-auto sm:!h-10"
                onClick={handleStartDirectGoalFlow}
              >
                <Plus className="h-4.5 w-4.5" />
                Tạo nhanh mục tiêu
              </Button>
            }
            aside={
              <div className="relative overflow-hidden rounded-card border border-app-line bg-app-bg shadow-xs aspect-[4/3] w-full max-w-[240px] shrink-0">
                <img
                  src="/vision_board_canvas.png"
                  alt="Bản đồ tầm nhìn và mục tiêu"
                  className="w-full h-full object-cover dark:brightness-[0.85] dark:contrast-[1.05]"
                  loading="lazy"
                />
              </div>
            }
          />

          {/* Focus Rail bên phải */}
          <div className="flex flex-col gap-3.5">
            {/* Tiêu điểm hôm nay mini */}
            <div className="rounded-[18px] border border-app-line/30 bg-app-surface p-5 shadow-[0_16px_36px_-28px_rgba(23,21,15,0.3)]">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="w-1.5 h-1.5 rounded-full bg-app-accent shrink-0" />
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-accent">Tiêu điểm hôm nay</p>
              </div>
              {focusGoal ? (
                (() => {
                  const { goal, isTwelveWeek } = focusGoal;
                  const system = goal.twelveWeekSystem;
                  const firstOpenTask = (isTwelveWeek && system)
                    ? getTwelveWeekTodayTasks(system).find((t) => !t.completed) || null
                    : null;
                  return (
                    <div className="flex items-start gap-[11px]">
                      <span className="w-5 h-5 rounded-full border-2 border-app-line/60 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        {firstOpenTask ? (
                          <>
                            <p className="text-[13.5px] font-semibold text-app-ink leading-[1.35] line-clamp-2">
                              {firstOpenTask.title}
                            </p>
                            <p className="text-[11.5px] text-app-ink-muted mt-1 line-clamp-1">
                              {goal.title}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-[13.5px] font-semibold text-app-ink leading-[1.35] line-clamp-2">
                              {goal.title}
                            </p>
                            <p className="text-[11.5px] text-app-ink-muted mt-1">
                              {isTwelveWeek && system
                                ? `Tuần ${getTwelveWeekCurrentWeek(system)}/12 · ${getLifeAreaLabel(goal.category)}`
                                : getLifeAreaLabel(goal.category)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs text-app-ink-muted italic">Không có tiêu điểm hành động cần xử lý.</p>
              )}
            </div>

            {/* Quote card */}
            <div className="rounded-[18px] bg-app-ink p-5 text-white relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 0%, rgba(198,242,78,0.16), transparent 60%)" }} />
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6F24E" strokeWidth="2" className="relative mb-2.5" aria-hidden="true">
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
              </svg>
              <p className="relative font-serif italic text-[13.5px] leading-relaxed text-[#E4E2DB]">
                Đừng cố gắng làm mọi thứ. Hãy làm những điều thực sự quan trọng một cách trọn vẹn nhất.
              </p>
            </div>
          </div>
        </section>

        {/* KPI Row - Dải số liệu sức khỏe mục tiêu */}
        <GoalSummaryStrip
          totalGoals={summary.totalGoals}
          completedGoals={summary.completedGoals}
          completedTasks={summary.completedTasks}
          totalTasks={summary.totalTasks}
          activeSystems={summary.activeSystems}
          needsAttention={summary.needsAttention}
        />

          {/* Tiêu điểm hôm nay / Next Best Action */}
          <TodayFocusCard
            focusData={focusGoal}
            openTwelveWeekCenter={openTwelveWeekCenter}
            handleToggleTask={handleToggleTask}
            onStartGuidedGoalFlow={handleStartGuidedGoalFlow}
          />

          {/* Search + Filter Container dạng Toolbar sạch sẽ */}
          <div className="rounded-[18px] border border-app-line/75 bg-app-surface p-4 shadow-app-sm flex flex-col gap-3.5">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-app-ink-muted" />
              <input
                type="search"
                placeholder="Tìm theo tên hoặc mô tả mục tiêu…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-app-line bg-app-bg pl-11 pr-4 py-2.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent transition-all duration-200"
              />
            </div>

            {/* Filter Chips */}
            <div className="w-full overflow-x-auto">
              <GoalFilterChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} counts={filterCounts} />
            </div>
          </div>

          {/* Danh sách mục tiêu / Trạng thái trống */}
          <div data-tour-id="goaltracker-goals" className="space-y-6">
            {!hasGoals ? (
              <EmptyState
                variant="card"
                illustration={<MountainMoonIllustration className="w-full text-app-ink-muted" />}
                title="Bắt đầu với một trọng tâm"
                description="Tạo mục tiêu đầu tiên của bạn để biến những mong muốn mơ hồ thành hành động cụ thể."
                actions={
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <Button
                      className="bg-app-accent text-white hover:bg-app-accent-hover font-bold shadow-app-sm hover:scale-[1.01] transition-all px-6 py-2.5 rounded-lg text-sm"
                      onClick={handleStartGuidedGoalFlow}
                    >
                      Bắt đầu từ trọng tâm →
                    </Button>
                    <Button
                      variant="outline"
                      className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg px-6 py-2.5 rounded-lg font-bold text-sm"
                      onClick={handleStartDirectGoalFlow}
                    >
                      Tạo mục tiêu thường
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="space-y-8">
                {displayTwelveWeekGoals.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between border-b border-app-line/50 pb-2.5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                          CHU KỲ 12 TUẦN
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-normal text-app-ink">
                          Mục tiêu đang chạy
                        </h2>
                        <p className="mt-1 text-xs text-app-ink-muted font-bold">
                          {displayTwelveWeekGoals.length} mục tiêu
                        </p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      {displayTwelveWeekGoals.map((goal) => {
                        const meta = goalsWithMetadata.find((m) => m.goal.id === goal.id);
                        return (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            currentPlanCode={currentPlanCode}
                            progress={meta?.progress ?? 0}
                            isOverdue={meta?.isOverdue ?? false}
                            isNearDeadline={meta?.isNearDeadline ?? false}
                            handleToggleTask={handleToggleTask}
                            openTwelveWeekCenter={openTwelveWeekCenter}
                            setGoalToDelete={setGoalToDelete}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {displayStandardGoals.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between border-b border-app-line/50 pb-2.5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                          MỤC TIÊU THƯỜNG
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-normal text-app-ink">
                          {displayStandardGoals.length} mục tiêu thường
                        </h2>
                      </div>
                    </div>
                    <div className="space-y-5">
                      {displayStandardGoals.map((goal) => {
                        const meta = goalsWithMetadata.find((m) => m.goal.id === goal.id);
                        return (
                          <GoalCard
                            key={goal.id}
                            goal={goal}
                            currentPlanCode={currentPlanCode}
                            progress={meta?.progress ?? 0}
                            isOverdue={meta?.isOverdue ?? false}
                            isNearDeadline={meta?.isNearDeadline ?? false}
                            handleToggleTask={handleToggleTask}
                            openTwelveWeekCenter={openTwelveWeekCenter}
                            setGoalToDelete={setGoalToDelete}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredGoalsWithMetadata.length === 0 && (
                  <EmptyState
                    variant="dashed"
                    title="Không tìm thấy mục tiêu"
                    description={
                      searchQuery.trim()
                        ? `Không tìm thấy mục tiêu nào khớp với “${searchQuery}”`
                        : "Không tìm thấy mục tiêu nào phù hợp với bộ lọc hiện tại."
                    }
                    actions={
                      <Button
                        variant="outline"
                        className="mt-2 border-app-line bg-app-surface text-app-accent hover:bg-app-accent-soft font-bold rounded-lg px-4 py-2 text-sm"
                        onClick={() => {
                          setSearchQuery("");
                          setActiveFilter("all");
                        }}
                      >
                        Xóa tìm kiếm & bộ lọc
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </div>
      </div>
      <SpotlightTour
        open={isTourOpen}
        onOpenChange={setIsTourOpen}
        title="Tour Mục tiêu"
        description="Ba điểm quan trọng để bạn biết nên tạo, theo dõi và xử lý mục tiêu ở đâu."
        steps={GOALTRACKER_TOUR_STEPS}
      />
    </div>
  );
}

// -------------------------------------------------------------
// COMPONENTS PHỤ CHO TRANG GOAL TRACKER
// -------------------------------------------------------------

interface GoalSummaryStripProps {
  totalGoals: number;
  completedGoals: number;
  completedTasks: number;
  totalTasks: number;
  activeSystems: number;
  needsAttention: number;
}

function GoalSummaryStrip({
  totalGoals,
  completedGoals,
  completedTasks,
  totalTasks,
  activeSystems,
  needsAttention,
}: GoalSummaryStripProps) {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const items = [
    {
      title: "Mục tiêu",
      value: totalGoals,
      note: `${completedGoals} hoàn thành`,
      icon: Target,
      iconBg: "bg-[#EDF7E0] text-[#0C5E3A]",
      monoNoteNum: completedGoals,
    },
    {
      title: "Việc đã chốt",
      value: `${completedTasks}/${totalTasks}`,
      isFraction: true,
      note: `${completionRate}% hoàn thành`,
      icon: CheckCircle2,
      iconBg: "bg-[#EDF7E0] text-[#0C5E3A]",
      monoNoteNum: completionRate,
    },
    {
      title: "Chu kỳ",
      value: activeSystems,
      note: "đang chạy",
      icon: Zap,
      iconBg: "bg-[#FFF8DE] text-[#E7B400]",
    },
    {
      title: "Cần chú ý",
      value: needsAttention,
      note: "quá hạn / review",
      icon: AlertTriangle,
      iconBg: "bg-[#FFEDE8] text-[#FF5C3E]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch" data-tour-id="goaltracker-summary">
      {items.map((item) => {
        const Icon = item.icon;
        const isFractionItem = (item as typeof item & { isFraction?: boolean }).isFraction;
        const hasFraction = isFractionItem && typeof item.value === "string" && item.value.includes("/");
        const fracParts = hasFraction ? String(item.value).split("/") : [];
        const fracNum = fracParts[0] ?? "";
        const fracDen = fracParts[1] ?? "";
        const monoNoteNumVal = (item as typeof item & { monoNoteNum?: number }).monoNoteNum;
        return (
          <div
            key={item.title}
            className="h-full rounded-[18px] border border-app-line/30 bg-app-surface p-[18px_20px] flex flex-col shadow-app-sm hover:border-app-accent/20 hover:shadow-app-md transition-all duration-300"
          >
            <div
              className={cn(
                "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] mb-3",
                item.iconBg,
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-app-ink-muted mb-1">{item.title}</p>
            <p className="font-serif text-[28px] font-extrabold text-app-ink leading-none">
              {hasFraction ? (
                <>
                  {fracNum}
                  <span className="text-base text-[#A8A296] dark:text-app-ink-muted">/{fracDen}</span>
                </>
              ) : (
                item.value
              )}
            </p>
            <p className="mt-1.5 text-[11px] font-medium text-app-ink-muted leading-tight">
              {monoNoteNumVal !== undefined ? (
                <>
                  <span className="font-mono">{monoNoteNumVal}</span>
                  {item.note.replace(/^\d+/, "")}
                </>
              ) : (
                item.note
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}

interface GoalFilterChipsProps {
  activeFilter: string;
  setActiveFilter: (filter: "all" | "12week" | "simple" | "dueSoon" | "atRisk" | "completed") => void;
  counts: {
    all: number;
    twelveWeek: number;
    simple: number;
    dueSoon: number;
    atRisk: number;
    completed: number;
  };
}

function GoalFilterChips({ activeFilter, setActiveFilter, counts }: GoalFilterChipsProps) {
  const chips = [
    { id: "all", label: "Tất cả", count: counts.all },
    { id: "12week", label: "12 tuần", count: counts.twelveWeek },
    { id: "simple", label: "Mục tiêu thường", count: counts.simple },
    { id: "dueSoon", label: "Sắp đến hạn", count: counts.dueSoon },
    { id: "atRisk", label: "Cần chỉnh nhịp 🌊", count: counts.atRisk },
    { id: "completed", label: "Hoàn thành", count: counts.completed },
  ] as const;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((chip) => {
        const isActive = activeFilter === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => setActiveFilter(chip.id)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all duration-200 gap-2 shadow-app-sm shrink-0",
              isActive
                ? "bg-app-accent text-white border-app-accent"
                : "bg-app-bg text-app-ink-soft border-app-line hover:border-app-accent/25 hover:bg-app-surface",
            )}
          >
            <span>{chip.label}</span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-bold tabular-nums",
                isActive ? "bg-white/20 text-white" : "bg-app-line text-app-ink-soft",
              )}
            >
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  currentPlanCode: PricingPlanCode;
  progress: number;
  isOverdue: boolean;
  isNearDeadline: boolean;
  handleToggleTask: (goalId: string, taskId: string) => void;
  openTwelveWeekCenter: (goalId: string) => void;
  setGoalToDelete: (goalId: string) => void;
}

function GoalCard({
  goal,
  currentPlanCode,
  progress,
  isOverdue,
  isNearDeadline,
  handleToggleTask,
  openTwelveWeekCenter,
  setGoalToDelete,
}: GoalCardProps) {
  const system = goal.twelveWeekSystem;
  const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;
  const GoalArchetypeIcon = getGoalArchetypeIcon(system?.goalType ?? goal.category);
  const areaStyle = CATEGORY_STYLES.default;

  const displayTasks = useMemo(() => {
    if (system) {
      const todayTasks = getTwelveWeekTodayTasks(system);
      return todayTasks.filter((task) => !task.completed).slice(0, 2);
    }
    return (goal.tasks || []).filter((task) => !task.completed).slice(0, 2);
  }, [system, goal.tasks]);

  const completedTasksCount = useMemo(() => {
    if (system) {
      const todayTasks = getTwelveWeekTodayTasks(system);
      return todayTasks.filter((t) => t.completed).length;
    }
    return (goal.tasks || []).filter((t) => t.completed).length;
  }, [system, goal.tasks]);

  const totalTasksCount = useMemo(() => {
    if (system) {
      const todayTasks = getTwelveWeekTodayTasks(system);
      return todayTasks.length;
    }
    return (goal.tasks || []).length;
  }, [system, goal.tasks]);

  const [isFlipped, setIsFlipped] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const completionDetails = useMemo(() => getGoalCompletionDetails(goal), [goal]);
  const health = useMemo(
    () => getGoalHealthStatus(goal, progress, isOverdue, isNearDeadline),
    [goal, progress, isOverdue, isNearDeadline],
  );

  const glowClass =
    progress === 100
      ? prefersReducedMotion
        ? "border-app-accent/40 shadow-[0_0_12px_rgba(47,163,107,0.1)] bg-app-accent-subtle"
        : "completed-goal-glow bg-app-accent-subtle border-app-accent/25"
      : "bg-app-surface border-app-line/70";

  return (
    <div id={`goal-card-${goal.id}`} className="perspective-1000 w-full relative">
      <div className={cn("preserve-3d card-transition w-full relative", isFlipped ? "rotate-y-180" : "")}>
        {/* FRONT SIDE */}
        <div className="backface-hidden w-full" aria-hidden={isFlipped} inert={isFlipped ? true : undefined}>
          <SpotlightCard
            className={cn(
              "rounded-[18px] border p-5 sm:p-6 transition-all duration-300 hover:border-app-accent/30 hover:shadow-app-md relative",
              glowClass,
            )}
          >
            {/* Washi tape decoration */}
            <div className="absolute -top-2 left-6 w-12 h-3.5 bg-app-accent/10 dark:bg-app-accent/20 backdrop-blur-[1px] rotate-[-2deg] border border-dashed border-app-accent/15 z-10" />
            {/* Nút xóa thùng rác nhỏ ở góc trên bên phải, visually quieter */}
            <button
              type="button"
              className="absolute top-2 right-2 h-11 w-11 rounded-lg text-app-ink-muted/30 hover:text-app-status-error hover:bg-app-status-error/5 transition-all duration-200 flex items-center justify-center z-20"
              onClick={() => setGoalToDelete(goal.id)}
              aria-label={`Xóa mục tiêu ${goal.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-0">
              {/* Cột trái: Goal Info */}
              <div className="space-y-3.5 min-w-0 border-r border-app-line/30 pr-5">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 rounded-xl items-center justify-center shadow-app-sm mt-0.5",
                      areaStyle.bg,
                      areaStyle.text,
                    )}
                  >
                    <GoalArchetypeIcon className="h-5.5 w-5.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-serif text-lg md:text-xl font-bold text-app-ink leading-snug break-words pr-8 line-clamp-3">
                      {goal.title}
                    </h3>
                    <p className="text-xs text-app-ink-soft font-semibold flex flex-wrap items-center gap-1.5">
                      <span>{system ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"}</span>
                      <span>·</span>
                      <span className={cn("font-bold", areaStyle.text)}>{getLifeAreaLabel(goal.category)}</span>
                      {goal.deadline && (
                        <>
                          <span>·</span>
                          <span className="text-app-ink-muted font-normal">
                            📅 Hạn: {new Date(goal.deadline).toLocaleDateString("vi-VN")}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <span
                    className={cn(
                      "border text-xs font-bold rounded-full px-3 py-0.5 inline-flex items-center gap-1 shadow-app-sm",
                      areaStyle.bg,
                      areaStyle.border,
                      areaStyle.text,
                    )}
                  >
                    {getLifeAreaLabel(goal.category)}
                  </span>

                  {/* Health status badge */}
                  <span
                    className={cn("border text-xs font-bold rounded-full px-3 py-0.5 shadow-app-sm", health.bgClass)}
                  >
                    {health.label}
                  </span>

                  {system && (
                    <span className="bg-app-bg border border-app-line text-app-ink-soft text-xs font-bold rounded-full px-3 py-0.5 shadow-app-sm">
                      {getPlanLabel(currentPlanCode)}
                    </span>
                  )}
                </div>

                {/* Streak Heatmap (chỉ cho mục tiêu 12 tuần) */}
                {system && (
                  <div className="pt-1 space-y-2.5">
                    <StreakHeatmap system={system} />
                    <WeeklyQuestLine system={system} />
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-app-ink-soft">Tiến độ</span>
                    <span className={cn("tabular-nums text-sm", areaStyle.text)}>
                      <CountUp value={progress} suffix="%" />
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full bg-app-line/40 overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
                        areaStyle.bar,
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Action chính */}
                <div className="pt-1.5 flex flex-wrap items-center gap-2.5">
                  {system && (
                    <Button
                      type="button"
                      className="rounded-full bg-app-accent text-white hover:bg-app-accent-hover px-[18px] py-2.5 text-xs font-bold shadow-app-sm transition-all duration-200 inline-flex items-center gap-2 h-auto"
                      onClick={() => openTwelveWeekCenter(goal.id)}
                    >
                      Tiếp tục chu kỳ
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {system ? <FutureSelfLetter goalId={goal.id} progress={progress} system={system} /> : null}
                  {progress === 100 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFlipped(true)}
                      className="rounded-lg border border-app-accent/30 text-app-accent hover:bg-app-accent-subtle px-3.5 py-2 text-xs font-bold transition-all h-9 flex items-center gap-1.5"
                      aria-pressed={isFlipped}
                    >
                      <Award className="h-4 w-4 text-app-accent" />
                      Vinh danh
                    </Button>
                  )}
                </div>
              </div>

              {/* Cột phải: Nhiệm vụ */}
              <div className="pl-5 flex flex-col justify-between min-w-0 pt-0.5">
                <div>
                  <div className="flex items-center justify-between border-b border-app-line/50 pb-2 mb-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-app-ink-muted">
                      {system ? "Việc hôm nay" : "Nhiệm vụ chưa xong"}
                    </p>
                    <span className="text-xs font-black tabular-nums text-app-accent">
                      {completedTasksCount}/{totalTasksCount}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {displayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group/task flex items-center gap-2.5 rounded-lg border border-app-line/40 bg-app-bg-subtle/30 px-3 py-2 hover:border-app-accent/20 hover:bg-app-accent-subtle/20 transition-all duration-300"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTask(goal.id, task.id)}
                          className="flex h-11 w-11 -my-3 -ml-3 shrink-0 items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                          aria-label={task.completed ? "Hủy chốt việc" : "Chốt việc"}
                        >
                          <span className="flex size-4.5 items-center justify-center">
                            {task.completed ? (
                              <CheckCircle2 className="size-4.5 text-app-accent shrink-0" />
                            ) : (
                              <span className="flex size-4.5 items-center justify-center rounded-full border border-app-line bg-app-surface hover:border-app-accent transition-all duration-200">
                                <Circle className="size-3.5 text-app-ink-muted hover:text-app-accent shrink-0" />
                              </span>
                            )}
                          </span>
                        </button>
                        <span
                          className={cn(
                            "text-sm font-medium truncate transition-all duration-200",
                            task.completed ? "line-through text-app-ink-muted opacity-70" : "text-app-ink",
                          )}
                        >
                          {task.title}
                        </span>
                      </div>
                    ))}

                    {displayTasks.length === 0 && (
                      <p className="text-xs italic leading-relaxed text-app-ink-muted/70 mt-1 pl-1">
                        {system ? "Không có việc hôm nay." : "Đã chốt hết việc chưa xong."}
                      </p>
                    )}
                  </div>
                </div>

                {system && (
                  <button
                    type="button"
                    className="group/more mt-3 text-app-accent text-xs sm:text-sm font-bold hover:text-app-accent-hover transition-colors duration-150 inline-flex items-center gap-0.5 self-start"
                    onClick={() => openTwelveWeekCenter(goal.id)}
                  >
                    <span>Xem toàn bộ</span>
                    <ArrowRight className="h-3 w-3 transform transition-transform duration-200 group-hover/more:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* BACK SIDE */}
        <div
          className="backface-hidden rotate-y-180 absolute inset-0 w-full h-full z-10"
          aria-hidden={!isFlipped}
          inert={!isFlipped ? true : undefined}
        >
          <SpotlightCard
            className={cn(
              "h-full rounded-[18px] border p-5 sm:p-6 bg-gradient-to-br from-app-bg-subtle via-app-surface to-app-accent-subtle shadow-app-lg flex flex-col justify-between overflow-y-auto",
              progress === 100 &&
                (prefersReducedMotion
                  ? "border-app-accent/40 shadow-[0_0_12px_rgba(47,163,107,0.1)]"
                  : "completed-goal-glow"),
            )}
          >
            <div className="space-y-4">
              {/* Certificate Header */}
              <div className="flex items-center gap-3 border-b border-app-line pb-3">
                <div className="flex h-10 w-10 shrink-0 rounded-xl items-center justify-center bg-app-energy/10 text-app-energy shadow-app-sm">
                  <Award className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-app-energy">
                    Thành tích xuất sắc
                  </h4>
                  <p className="text-sm font-semibold text-app-ink-soft">Mục tiêu đã hoàn thành</p>
                </div>
              </div>

              {/* Goal Title & Completion Metadata */}
              <div className="space-y-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-app-ink leading-snug break-words line-clamp-3">
                  {goal.title}
                </h3>

                <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                  <div className="bg-app-bg/50 rounded-lg p-2.5 border border-app-line/40">
                    <p className="text-app-ink-muted font-medium">Hoàn thành ngày</p>
                    <p className="mt-1 font-bold text-app-ink text-sm">{completionDetails.completedAtStr}</p>
                  </div>
                  <div className="bg-app-bg/50 rounded-lg p-2.5 border border-app-line/40">
                    <p className="text-app-ink-muted font-medium">Nhiệm vụ đã chốt</p>
                    <p className="mt-1 font-bold text-app-accent text-sm tabular-nums">
                      {completionDetails.completedTasks}/{completionDetails.totalTasks} việc
                    </p>
                  </div>
                </div>
              </div>

              {/* Encouragement message */}
              <p className="text-sm italic leading-relaxed text-app-ink-soft bg-app-accent-subtle border border-app-accent/10 rounded-xl p-3 font-serif">
                “Bạn đã biến một mục tiêu lớn thành kết quả cụ thể. Hãy ghi nhận nỗ lực này.”
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-app-line/50 flex flex-wrap gap-2.5 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFlipped(false)}
                className="rounded-lg border border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg px-4 py-2 text-xs sm:text-sm font-bold transition-all h-9 flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Quay lại mục tiêu
              </Button>
              {system && (
                <Button
                  size="sm"
                  onClick={() => openTwelveWeekCenter(goal.id)}
                  className="rounded-lg bg-app-accent hover:bg-app-accent-hover text-app-ink-on-accent px-4 py-2 text-xs sm:text-sm font-bold transition-all h-9 flex items-center gap-1.5"
                >
                  Mở chu kỳ
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
  );
}

function GoalTrackerSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải danh sách mục tiêu...</span>
      <Skeleton className="h-40 rounded-[18px] bg-app-line/60" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-20 rounded-[18px] bg-app-line/60" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-32 rounded-[18px] bg-app-line/60" />
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STREAK HEATMAP & FUTURE SELF CAPSULE FOR GOAL COMMAND CENTER
// -------------------------------------------------------------

interface StreakHeatmapProps {
  system: TwelveWeekSystem;
}

const parseDateStr = (str: string) => {
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const r = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${r}`;
};

const formatDayLabel = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

function StreakHeatmap({ system }: StreakHeatmapProps) {
  const startDate = useMemo(() => {
    try {
      return parseDateStr(system.startDate);
    } catch {
      return new Date();
    }
  }, [system.startDate]);

  const weeks = useMemo(() => {
    const weeksList: Array<
      Array<{
        dateStr: string;
        total: number;
        completed: number;
        colorClass: string;
        label: string;
      }>
    > = [];

    const tasksMap = new Map<string, { total: number; completed: number }>();
    for (const task of system.taskInstances) {
      if (!task.scheduledDate) continue;
      const current = tasksMap.get(task.scheduledDate) || { total: 0, completed: 0 };
      current.total += 1;
      if (task.completed) {
        current.completed += 1;
      }
      tasksMap.set(task.scheduledDate, current);
    }

    for (let w = 0; w < 12; w++) {
      const days: Array<{
        dateStr: string;
        total: number;
        completed: number;
        colorClass: string;
        label: string;
      }> = [];

      for (let d = 0; d < 7; d++) {
        const dayIdx = w * 7 + d;
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + dayIdx);
        const dateKey = formatDateStr(targetDate);
        const stats = tasksMap.get(dateKey) || { total: 0, completed: 0 };

        let colorClass = "bg-app-bg-subtle dark:bg-app-bg-subtle/40 border border-transparent";
        if (stats.total > 0) {
          if (stats.completed === stats.total) {
            colorClass = "bg-app-accent border border-app-accent-hover/10";
          } else if (stats.completed > 0) {
            colorClass = "bg-app-accent-soft border border-app-accent/10";
          } else {
            colorClass = "bg-rose-100/80 border border-rose-200/20 dark:bg-rose-950/20 dark:border-rose-900/10";
          }
        }

        const formattedDate = formatDayLabel(dateKey);
        const label =
          stats.total > 0
            ? `${formattedDate}: Chốt ${stats.completed}/${stats.total} việc`
            : `${formattedDate}: Không có việc lên lịch`;

        days.push({
          dateStr: dateKey,
          total: stats.total,
          completed: stats.completed,
          colorClass,
          label,
        });
      }
      weeksList.push(days);
    }
    return weeksList;
  }, [startDate, system.taskInstances]);

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-xs font-bold text-app-ink-soft">
        <span>Nhịp độ hành động</span>
        <span className="text-xs text-app-ink-muted font-normal">Hover xem chi tiết</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        {/* Nhãn hàng Thứ 2 - CN */}
        <div className="flex flex-col justify-between h-[96px] text-[9px] font-bold text-app-ink-muted pr-1 select-none leading-none pt-0.5 pb-0.5">
          <span>T2</span>
          <span>T4</span>
          <span>T6</span>
          <span>CN</span>
        </div>

        {/* Cột tuần */}
        <div className="flex gap-1">
          {weeks.map((weekDays) => (
            <div key={`week-${weekDays[0].dateStr}`} className="flex flex-col gap-1">
              {weekDays.map((day) => (
                <div key={day.dateStr} className="relative group flex justify-center">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-[2.5px] transition-all duration-150 cursor-pointer hover:scale-110",
                      day.colorClass,
                    )}
                  />
                  {/* Custom CSS Tooltip */}
                  <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-30 bg-app-ink text-app-bg text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-app-md pointer-events-none transform -translate-y-0.5 border border-app-line/40 leading-normal">
                    {day.label}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-app-ink dark:border-t-app-ink" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface FutureSelfLetterProps {
  goalId: string;
  progress: number;
  system?: TwelveWeekSystem;
}

function FutureSelfLetter({ goalId, progress, system }: FutureSelfLetterProps) {
  const [letterText, setLetterText] = useState<string | null>(null);
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [isReadOpen, setIsReadOpen] = useState(false);
  const [tempText, setTempText] = useState("");
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const handleWriteOpenChange = (open: boolean) => {
    if (!open) {
      const isDirty = tempText.trim() !== (letterText || "").trim();
      if (isDirty) {
        setDiscardConfirmOpen(true);
        return;
      }
    }
    setIsWriteOpen(open);
  };

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false);
    setIsWriteOpen(false);
  };

  const discardLetterAlertDialog = (
    <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bỏ thay đổi trên thư?</AlertDialogTitle>
          <AlertDialogDescription>
            Nội dung thư thay đổi chưa được lưu/niêm phong sẽ bị mất. Bạn vẫn muốn đóng chứ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Tiếp tục viết</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDiscard}
            className="bg-app-status-error hover:bg-app-status-error/90 text-white"
          >
            Bỏ thay đổi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  useEffect(() => {
    const saved = localStorage.getItem(`future_letter_${goalId}`);
    setLetterText(saved);
  }, [goalId]);

  const handleOpenWrite = () => {
    setTempText(letterText || "");
    setIsReadOpen(false);
    setIsWriteOpen(true);
  };

  const handleSave = () => {
    if (!tempText.trim()) {
      localStorage.removeItem(`future_letter_${goalId}`);
      setLetterText(null);
      toast.info("Đã xóa thư nháp.");
    } else {
      localStorage.setItem(`future_letter_${goalId}`, tempText);
      setLetterText(tempText);
      toast.success("Bức thư gửi tương lai đã được niêm phong!");
    }
    setIsWriteOpen(false);
  };

  const isUnlocked = useMemo(() => {
    if (progress === 100) return true;
    if (!system) return false;

    if (system.currentWeek >= 12) return true;
    try {
      const today = new Date();
      const end = new Date(system.endDate);
      if (today > end) return true;
    } catch {}

    return false;
  }, [progress, system]);

  const handleReadClick = () => {
    if (!isUnlocked) {
      toast.info("Thư đang được niêm phong 🔒", {
        description: "Đạt 100% tiến độ hoặc hoàn thành tuần 12 để mở.",
      });
      return;
    }
    setIsReadOpen(true);
  };

  if (!letterText) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenWrite}
          className="rounded-lg border border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg px-3.5 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 h-9"
        >
          <Mail className="h-4 w-4 text-app-accent" />
          Viết thư tuần 12
        </Button>

        <Dialog open={isWriteOpen} onOpenChange={handleWriteOpenChange}>
          <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[18px] shadow-app-lg">
            <DialogHeader className="space-y-1.5 text-left border-b border-app-line/45 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-app-accent shrink-0" />
                <DialogTitle className="font-serif text-lg font-bold text-app-ink">Gửi tôi ở tuần thứ 12</DialogTitle>
              </div>
            </DialogHeader>
            <DialogDescription className="text-sm text-app-ink-soft leading-relaxed mt-2">
              Viết một vài dòng nhắn nhủ, cam kết hoặc khích lệ bản thân lúc này. Bức thư sẽ được khóa lại và chỉ mở ra
              khi bạn đạt 100% tiến độ hoặc hoàn thành chu kỳ 12 tuần.
            </DialogDescription>

            <div className="pt-2">
              <textarea
                className="w-full min-h-[160px] rounded-xl border border-app-line bg-app-bg p-3.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/25 resize-none transition-all"
                placeholder="Gửi bản thân thân mến ở tuần 12…"
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                maxLength={500}
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-3">
              <span className="text-xs sm:text-sm text-app-ink-muted w-full sm:w-auto text-left font-medium">
                {tempText.length}/500 ký tự
              </span>
              <div className="flex gap-2.5 w-full sm:w-auto justify-end shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWriteOpen(false)}
                  className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg h-9 px-4 py-2 font-bold text-xs sm:text-sm"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover font-bold h-9 px-4 py-2 text-xs sm:text-sm"
                >
                  Niêm phong thư
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {discardLetterAlertDialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={isUnlocked ? () => setIsReadOpen(true) : handleReadClick}
        className={cn(
          "rounded-lg border px-3.5 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 h-9",
          isUnlocked
            ? "border-app-accent/30 bg-app-accent-soft text-app-accent hover:bg-app-accent-subtle"
            : "border-app-status-warning/30 bg-app-status-warning/10 text-app-status-warning hover:bg-app-status-warning/20",
        )}
      >
        {isUnlocked ? (
          <>
            <MailOpen className="h-4 w-4 text-app-accent" />
            Đọc thư
          </>
        ) : (
          <>
            <Lock className="h-3.5 w-3.5 text-app-status-warning" />
            Thư tuần 12 (Khóa)
          </>
        )}
      </button>

      {/* Dialog Đọc thư */}
      <Dialog open={isReadOpen} onOpenChange={setIsReadOpen}>
        <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[18px] shadow-app-lg">
          <DialogHeader className="space-y-1.5 text-left border-b border-app-line pb-3">
            <div className="flex items-center gap-2">
              <MailOpen className="h-5 w-5 text-app-accent shrink-0" />
              <DialogTitle className="font-serif text-lg font-bold text-app-ink">Thư gửi từ quá khứ</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-app-ink-soft mt-2">
            Bức thư bạn tự tay viết khi bắt đầu hành trình chinh phục mục tiêu này.
          </DialogDescription>

          <div className="bg-app-bg-subtle dark:bg-app-bg-subtle/40 rounded-xl p-4 border border-app-line/60 my-2">
            <p className="text-sm italic leading-relaxed text-app-ink whitespace-pre-wrap font-serif">“{letterText}”</p>
          </div>

          <DialogFooter className="flex flex-row justify-between items-center gap-3 w-full mt-2">
            <button
              type="button"
              onClick={handleOpenWrite}
              className="text-xs sm:text-sm text-app-accent hover:underline font-bold"
            >
              Chỉnh sửa thư
            </button>
            <Button
              size="sm"
              onClick={() => setIsReadOpen(false)}
              className="rounded-lg bg-app-accent hover:bg-app-accent-hover text-app-ink-on-accent font-bold h-9 px-4 py-2 text-xs sm:text-sm"
            >
              Tuyệt vời
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Chỉnh sửa khi đã có thư */}
      <Dialog open={isWriteOpen} onOpenChange={handleWriteOpenChange}>
        <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[18px] shadow-app-lg">
          <DialogHeader className="space-y-1.5 text-left border-b border-app-line/45 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-app-accent shrink-0" />
              <DialogTitle className="font-serif text-lg font-bold text-app-ink">Chỉnh sửa thư gửi tuần 12</DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-app-ink-soft leading-relaxed mt-2">
            Chỉnh sửa hoặc xóa bức thư gửi cho chính bạn ở cuối hành trình mục tiêu.
          </DialogDescription>

          <div className="pt-2">
            <textarea
              className="w-full min-h-[160px] rounded-xl border border-app-line bg-app-bg p-3.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/25 resize-none transition-all"
              placeholder="Gửi bản thân thân mến…"
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              maxLength={500}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-3">
            <span className="text-xs sm:text-sm text-app-ink-muted w-full sm:w-auto text-left font-medium">
              {tempText.length}/500 ký tự
            </span>
            <div className="flex gap-2.5 w-full sm:w-auto justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWriteOpen(false)}
                className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg h-9 px-4 py-2 font-bold text-xs sm:text-sm"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover font-bold h-9 px-4 py-2 text-xs sm:text-sm"
              >
                Lưu thay đổi
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {discardLetterAlertDialog}
    </>
  );
}
