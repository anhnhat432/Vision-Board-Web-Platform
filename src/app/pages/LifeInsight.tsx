import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Check,
  Compass,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  CheckSquare,
  Activity,
  GraduationCap,
  Dumbbell,
  Award,
  PiggyBank,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

const INTENT_ICONS: Record<UserIntentId, LucideIcon> = {
  complete_project: CheckSquare,
  build_habit: Activity,
  learn_skill: GraduationCap,
  improve_health: Dumbbell,
  prepare_exam: Award,
  grow_finance: PiggyBank,
  find_direction: Compass,
  unsure: Sparkles,
};

interface AreaColorConfig {
  bgLight: string;
  text: string;
  border: string;
  accent: string;
  hoverBg: string;
  selectedBg: string;
  iconBg: string;
  iconSelectedBg: string;
}

const getAreaColorConfig = (name: string): AreaColorConfig => {
  switch (name) {
    case "Career":
      return {
        bgLight: "bg-blue-50 dark:bg-blue-950/20",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-900/30",
        accent: "text-blue-700 dark:text-blue-300",
        hoverBg: "hover:bg-blue-50/50 hover:border-blue-300 dark:hover:bg-blue-950/10",
        selectedBg: "border-blue-500 bg-gradient-to-br from-blue-500/10 to-blue-500/5 ring-1 ring-blue-500/20 shadow-md shadow-blue-500/10",
        iconBg: "bg-blue-100/60 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 group-hover:bg-blue-100",
        iconSelectedBg: "bg-blue-600 text-white",
      };
    case "Finance":
      return {
        bgLight: "bg-amber-50 dark:bg-amber-950/20",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-900/30",
        accent: "text-amber-700 dark:text-amber-300",
        hoverBg: "hover:bg-amber-50/50 hover:border-amber-300 dark:hover:bg-amber-950/10",
        selectedBg: "border-amber-500 bg-gradient-to-br from-amber-500/10 to-amber-500/5 ring-1 ring-amber-500/20 shadow-md shadow-amber-500/10",
        iconBg: "bg-amber-100/60 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 group-hover:bg-amber-100",
        iconSelectedBg: "bg-amber-500 text-white",
      };
    case "Health":
      return {
        bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-900/30",
        accent: "text-emerald-700 dark:text-emerald-300",
        hoverBg: "hover:bg-emerald-50/50 hover:border-emerald-300 dark:hover:bg-emerald-950/10",
        selectedBg: "border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 ring-1 ring-emerald-500/20 shadow-md shadow-emerald-500/10",
        iconBg: "bg-emerald-100/60 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:bg-emerald-100",
        iconSelectedBg: "bg-emerald-600 text-white",
      };
    case "Education":
      return {
        bgLight: "bg-indigo-50 dark:bg-indigo-950/20",
        text: "text-indigo-600 dark:text-indigo-400",
        border: "border-indigo-200 dark:border-indigo-900/30",
        accent: "text-indigo-700 dark:text-indigo-300",
        hoverBg: "hover:bg-indigo-50/50 hover:border-indigo-300 dark:hover:bg-indigo-950/10",
        selectedBg: "border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 ring-1 ring-indigo-500/20 shadow-md shadow-indigo-500/10",
        iconBg: "bg-indigo-100/60 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 group-hover:bg-indigo-100",
        iconSelectedBg: "bg-indigo-600 text-white",
      };
    case "Relationships":
      return {
        bgLight: "bg-rose-50 dark:bg-rose-950/20",
        text: "text-rose-600 dark:text-rose-400",
        border: "border-rose-200 dark:border-rose-900/30",
        accent: "text-rose-700 dark:text-rose-300",
        hoverBg: "hover:bg-rose-50/50 hover:border-rose-300 dark:hover:bg-rose-950/10",
        selectedBg: "border-rose-500 bg-gradient-to-br from-rose-500/10 to-rose-500/5 ring-1 ring-rose-500/20 shadow-md shadow-rose-500/10",
        iconBg: "bg-rose-100/60 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 group-hover:bg-rose-100",
        iconSelectedBg: "bg-rose-600 text-white",
      };
    case "Family":
      return {
        bgLight: "bg-teal-50 dark:bg-teal-950/20",
        text: "text-teal-600 dark:text-teal-400",
        border: "border-teal-200 dark:border-teal-900/30",
        accent: "text-teal-700 dark:text-teal-300",
        hoverBg: "hover:bg-teal-50/50 hover:border-teal-300 dark:hover:bg-teal-950/10",
        selectedBg: "border-teal-500 bg-gradient-to-br from-teal-500/10 to-teal-500/5 ring-1 ring-teal-500/20 shadow-md shadow-teal-500/10",
        iconBg: "bg-teal-100/60 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 group-hover:bg-teal-100",
        iconSelectedBg: "bg-teal-600 text-white",
      };
    case "Personal Growth":
      return {
        bgLight: "bg-orange-50 dark:bg-orange-950/20",
        text: "text-orange-600 dark:text-orange-400",
        border: "border-orange-200 dark:border-orange-900/30",
        accent: "text-orange-700 dark:text-orange-300",
        hoverBg: "hover:bg-orange-50/50 hover:border-orange-300 dark:hover:bg-orange-950/10",
        selectedBg: "border-orange-500 bg-gradient-to-br from-orange-500/10 to-orange-500/5 ring-1 ring-orange-500/20 shadow-md shadow-orange-500/10",
        iconBg: "bg-orange-100/60 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 group-hover:bg-orange-100",
        iconSelectedBg: "bg-orange-600 text-white",
      };
    case "Leisure":
      return {
        bgLight: "bg-sky-50 dark:bg-sky-950/20",
        text: "text-sky-600 dark:text-sky-400",
        border: "border-sky-200 dark:border-sky-900/30",
        accent: "text-sky-700 dark:text-sky-300",
        hoverBg: "hover:bg-sky-50/50 hover:border-sky-300 dark:hover:bg-sky-950/10",
        selectedBg: "border-sky-500 bg-gradient-to-br from-sky-500/10 to-sky-500/5 ring-1 ring-sky-500/20 shadow-md shadow-sky-500/10",
        iconBg: "bg-sky-100/60 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 group-hover:bg-sky-100",
        iconSelectedBg: "bg-sky-600 text-white",
      };
    default:
      return {
        bgLight: "bg-app-accent-soft",
        text: "text-app-accent",
        border: "border-app-line",
        accent: "text-app-accent",
        hoverBg: "hover:bg-app-bg hover:border-app-ink-muted",
        selectedBg: "border-app-accent bg-gradient-to-br from-app-accent-soft/30 to-app-accent-soft/10 ring-1 ring-app-accent/20 shadow-md shadow-app-accent/15",
        iconBg: "bg-app-line text-app-ink-muted group-hover:bg-app-line/80",
        iconSelectedBg: "bg-app-accent text-white",
      };
  }
};

interface IntentColorConfig {
  hoverBorder: string;
  hoverBg: string;
  selectedBg: string;
  selectedText: string;
  iconBg: string;
  iconSelectedBg: string;
  accent: string;
}

const getIntentColorConfig = (id: UserIntentId): IntentColorConfig => {
  switch (id) {
    case "complete_project":
      return {
        hoverBorder: "hover:border-blue-400",
        hoverBg: "hover:bg-blue-50/30 dark:hover:bg-blue-950/10",
        selectedBg: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 ring-1 ring-blue-500/20",
        selectedText: "text-blue-700 dark:text-blue-300",
        iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:bg-blue-200",
        iconSelectedBg: "bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300",
        accent: "text-blue-600 dark:text-blue-400",
      };
    case "build_habit":
      return {
        hoverBorder: "hover:border-orange-400",
        hoverBg: "hover:bg-orange-50/30 dark:hover:bg-orange-950/10",
        selectedBg: "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 ring-1 ring-orange-500/20",
        selectedText: "text-orange-700 dark:text-orange-300",
        iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 group-hover:bg-orange-200",
        iconSelectedBg: "bg-orange-500/20 text-orange-700 dark:bg-orange-500/30 dark:text-orange-300",
        accent: "text-orange-600 dark:text-orange-400",
      };
    case "learn_skill":
      return {
        hoverBorder: "hover:border-purple-400",
        hoverBg: "hover:bg-purple-50/30 dark:hover:bg-purple-950/10",
        selectedBg: "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 ring-1 ring-purple-500/20",
        selectedText: "text-purple-700 dark:text-purple-300",
        iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 group-hover:bg-purple-200",
        iconSelectedBg: "bg-purple-500/20 text-purple-700 dark:bg-purple-500/30 dark:text-purple-300",
        accent: "text-purple-600 dark:text-purple-400",
      };
    case "improve_health":
      return {
        hoverBorder: "hover:border-emerald-400",
        hoverBg: "hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10",
        selectedBg: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 ring-1 ring-emerald-500/20",
        selectedText: "text-emerald-700 dark:text-emerald-300",
        iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 group-hover:bg-emerald-200",
        iconSelectedBg: "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-300",
        accent: "text-emerald-600 dark:text-emerald-400",
      };
    case "prepare_exam":
      return {
        hoverBorder: "hover:border-rose-400",
        hoverBg: "hover:bg-rose-50/30 dark:hover:bg-rose-950/10",
        selectedBg: "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 ring-1 ring-rose-500/20",
        selectedText: "text-rose-700 dark:text-rose-300",
        iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 group-hover:bg-rose-200",
        iconSelectedBg: "bg-rose-500/20 text-rose-700 dark:bg-rose-500/30 dark:text-rose-300",
        accent: "text-rose-600 dark:text-rose-400",
      };
    case "grow_finance":
      return {
        hoverBorder: "hover:border-amber-400",
        hoverBg: "hover:bg-amber-50/30 dark:hover:bg-amber-950/10",
        selectedBg: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 ring-1 ring-amber-500/20",
        selectedText: "text-amber-700 dark:text-amber-300",
        iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 group-hover:bg-amber-200",
        iconSelectedBg: "bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300",
        accent: "text-amber-600 dark:text-amber-400",
      };
    case "find_direction":
      return {
        hoverBorder: "hover:border-cyan-400",
        hoverBg: "hover:bg-cyan-50/30 dark:hover:bg-cyan-950/10",
        selectedBg: "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300 ring-1 ring-cyan-500/20",
        selectedText: "text-cyan-700 dark:text-cyan-300",
        iconBg: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 group-hover:bg-cyan-200",
        iconSelectedBg: "bg-cyan-500/20 text-cyan-700 dark:bg-cyan-500/30 dark:text-cyan-300",
        accent: "text-cyan-600 dark:text-cyan-400",
      };
    default:
      return {
        hoverBorder: "hover:border-violet-400",
        hoverBg: "hover:bg-violet-50/30 dark:hover:bg-violet-950/10",
        selectedBg: "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300 ring-1 ring-violet-500/20",
        selectedText: "text-violet-700 dark:text-violet-300",
        iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 group-hover:bg-violet-200",
        iconSelectedBg: "bg-violet-500/20 text-violet-700 dark:bg-violet-500/30 dark:text-violet-300",
        accent: "text-violet-600 dark:text-violet-400",
      };
  }
};

import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { getLifeAreaIcon } from "../components/illustrations/mini/lifeAreaMap";
import { PageShell } from "../components/PageShell";
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
import { FormSkeleton } from "../components/ui/skeleton";
import { SimpleRadarChart } from "../components/SimpleRadarChart";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { FocusLantern } from "./LifeInsight/components/FocusLantern";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { getSmartGoalStarter } from "../utils/smart-goal-starters";
import { APP_STORAGE_KEYS, getLifeAreaLabel } from "../utils/storage";
import {
  clearUserIntent,
  getUserIntentId,
  getUserIntentOptions,
  setUserIntent,
  type UserIntentId,
} from "../utils/user-intent";

function getPendingSmartGoalStatement(): string {
  const rawDraft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
  if (!rawDraft) return "";

  try {
    const parsedDraft = JSON.parse(rawDraft) as {
      specific?: string | { goal_statement?: unknown };
    };
    if (typeof parsedDraft.specific === "string") return parsedDraft.specific.trim();
    if (parsedDraft.specific && typeof parsedDraft.specific.goal_statement === "string") {
      return parsedDraft.specific.goal_statement.trim();
    }
  } catch {
    return "";
  }

  return "";
}

export function LifeInsight() {
  const navigate = useNavigate();
  const { userData } = useSyncedUserData();
  const lifeAreas = userData?.currentWheelOfLife ?? [];
  const hasLifeBalance = hasRealLifeBalance(userData);
  const [selectedAreaName, setSelectedAreaName] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<UserIntentId | null>(null);
  const [pendingFocusAreaName, setPendingFocusAreaName] = useState<string | null>(null);
  const pageTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedIntent(getUserIntentId());
  }, []);

  // Reset scroll on mount (page navigation)
  useScrollToTopOnChange(0, {
    targetRef: pageTopRef,
    focusRef: pageTopRef,
    skipInitial: false,
  });

  useEffect(() => {
    setSelectedIntent(getUserIntentId());
  }, []);

  const handleIntentSelect = (intent: UserIntentId) => {
    setSelectedIntent(intent);
    setUserIntent(intent);
    trackAnalyticsEvent("user_intent_selected", {
      source: "life_balance",
      intent_id: intent,
    });
  };

  const handleIntentClear = () => {
    setSelectedIntent(null);
    clearUserIntent();
    trackAnalyticsEvent("user_intent_cleared", { source: "life_balance" });
  };

  const intentOptions = getUserIntentOptions();

  const lowestArea = useMemo(() => {
    if (lifeAreas.length === 0) return null;
    return [...lifeAreas].sort((a, b) => a.score - b.score)[0];
  }, [lifeAreas]);

  const strongestArea = useMemo(() => {
    if (lifeAreas.length === 0) return null;
    return [...lifeAreas].sort((a, b) => b.score - a.score)[0];
  }, [lifeAreas]);

  const focusArea = useMemo(() => {
    if (!lowestArea) return null;
    if (!selectedAreaName) return lowestArea;
    return lifeAreas.find((a) => a.name === selectedAreaName) ?? lowestArea;
  }, [lowestArea, selectedAreaName, lifeAreas]);

  const radarData = useMemo(
    () =>
      lifeAreas.map((area) => ({
        subject: getLifeAreaLabel(area.name),
        value: area.score,
        fullMark: 10,
      })),
    [lifeAreas],
  );

  const smartGoalStarter = useMemo(() => (focusArea ? getSmartGoalStarter(focusArea.name) : null), [focusArea]);

  if (!userData) {
    return (
      <PageShell maxWidth="xl">
        <CoreFlowProgress currentStepId="life_insight" onExit={() => navigate("/")} />
        <FormSkeleton className="mt-6" aria-label="Đang tải dữ liệu góc nhìn" />
      </PageShell>
    );
  }

  if (!hasLifeBalance || !lowestArea || !strongestArea || !focusArea || !smartGoalStarter) {
    return (
      <CoreFlowGateState
        currentStepId="life_insight"
        eyebrow="Góc nhìn cuộc sống"
        title="Hoàn thành bước cân bằng trước"
        description="Cần dữ liệu 8 lĩnh vực trước khi đề xuất trọng tâm."
        actionLabel="Bắt đầu cân bằng"
        onAction={() => navigate("/onboarding")}
      />
    );
  }

  const continueToGoalSetup = (areaName: string) => {
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, areaName);
    navigate("/smart-goal-setup");
  };

  const handleStartGoalSetup = () => {
    const currentDraftFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const existingDraftStatement = getPendingSmartGoalStatement();
    const isChangingFocusArea = Boolean(currentDraftFocusArea && currentDraftFocusArea !== focusArea.name);
    
    // If there's an existing draft from a different focus area, ask to clear it
    if (existingDraftStatement.length > 0 && isChangingFocusArea) {
      setPendingFocusAreaName(focusArea.name);
      return;
    }
    
    // If there's a draft but no selectedFocusArea (user came back via Back button),
    // keep the draft and just navigate to continue where they left off
    // If there's no draft, proceed normally
    continueToGoalSetup(focusArea.name);
  };

  const handleConfirmDraftClear = () => {
    const nextFocusAreaName = pendingFocusAreaName ?? focusArea.name;
    localStorage.removeItem(APP_STORAGE_KEYS.pendingSmartGoal);
    setPendingFocusAreaName(null);
    continueToGoalSetup(nextFocusAreaName);
  };

  const isCustomSelection = selectedAreaName !== null && selectedAreaName !== lowestArea.name;
  const focusAreaLabel = getLifeAreaLabel(focusArea.name);
  const FocusAreaIcon = getLifeAreaIcon(focusArea.name);

  return (
    <PageShell maxWidth="xl">
      <div ref={pageTopRef}>
        <AlertDialog
          open={pendingFocusAreaName !== null}
          onOpenChange={(open) => !open && setPendingFocusAreaName(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bạn có bản nháp mục tiêu chưa lưu</AlertDialogTitle>
              <AlertDialogDescription>Đổi lĩnh vực sẽ xoá bản nháp hiện tại. Tiếp tục?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button
                type="button"
                variant="ghost"
                className="sm:mr-auto"
                onClick={() => setPendingFocusAreaName(null)}
              >
                Huỷ
              </Button>
              <AlertDialogCancel>Giữ bản nháp</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDraftClear}>Xoá bản nháp và đổi lĩnh vực</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CoreFlowProgress currentStepId="life_insight" onExit={() => navigate("/")} />

        <div className="space-y-6">
          {/* Header section */}
          <div className="max-w-3xl animate-fade-in">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent">
              BƯỚC 2 / 6 · GÓC NHÌN CUỘC SỐNG
            </p>
            <h1
              className="mt-3 text-4xl font-medium leading-tight tracking-tight text-app-ink"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Chọn nơi đáng ưu tiên trong 12 tuần tới.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-app-ink-soft">
              Dữ liệu cân bằng cho thấy đâu là điểm mỏng và mạnh nhất. Chọn 1 lĩnh vực để biến thành mục tiêu SMART.
            </p>
          </div>

          {/* Status pills row */}
          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex items-center rounded-full bg-app-accent-soft px-3 py-1.5 text-xs font-semibold text-app-accent shadow-sm shadow-app-accent/5">
              <Target className="mr-1.5 h-3.5 w-3.5" />
              Đề xuất ưu tiên: {focusAreaLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-app-line bg-app-surface px-3 py-1.5 text-xs font-medium text-app-ink-soft">
              <Compass className="mr-1.5 h-3.5 w-3.5 text-app-ink-muted" />
              Đang chọn tự động
            </span>
            {isCustomSelection && (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 shadow-sm">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Bạn đã chọn thủ công
              </span>
            )}
          </div>

          {/* Main layout: 2 columns on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
            
            {/* LEFT COLUMN: VISUALIZATION & AREA SWITCHER */}
            <div className="space-y-6">
              {/* Radar chart */}
              <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 md:p-6 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-app-line/60">
                  <h3 className="text-sm font-bold tracking-wide text-app-ink">Bánh xe của bạn</h3>
                  <p className="text-xs font-semibold text-app-ink-muted">8 lĩnh vực hiện tại</p>
                </div>
                <div className="mt-4 flex items-center justify-center">
                  <SimpleRadarChart
                    data={radarData}
                    height={320}
                    stroke="var(--app-accent)"
                    fill="var(--app-accent)"
                    fillOpacity={0.24}
                  />
                </div>
                <div className="mt-4 pt-3 border-t border-app-line/60 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => navigate("/life-balance")}
                    className="group inline-flex items-center gap-1.5 text-xs font-semibold text-app-accent transition-colors hover:text-app-accent"
                  >
                    <RotateCcw className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-[-45deg]" />
                    Chấm lại điểm
                  </button>
                  <span className="text-[11px] text-app-ink-muted font-medium">
                    Đề xuất mặc định: {getLifeAreaLabel(lowestArea.name)}
                  </span>
                </div>
              </div>

              {/* Life areas grid switcher */}
              <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 md:p-6 shadow-sm">
                <div className="pb-3 border-b border-app-line/60">
                  <h3 className="text-sm font-bold text-app-ink">Hoặc chọn lĩnh vực khác</h3>
                  <p className="mt-1 text-xs text-app-ink-muted">Click để đặt làm trọng tâm</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {lifeAreas.map((area) => {
                    const isSelected = focusArea.name === area.name;
                    const AreaIcon = getLifeAreaIcon(area.name);
                    const colors = getAreaColorConfig(area.name);
                    return (
                      <button
                        key={area.name}
                        type="button"
                        onClick={() => setSelectedAreaName(area.name === lowestArea.name ? null : area.name)}
                        className={`group rounded-xl border p-3 text-left transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 ${
                          isSelected
                            ? colors.selectedBg
                            : `border-app-line bg-app-surface ${colors.hoverBg} hover:shadow-sm`
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isSelected ? colors.iconSelectedBg : colors.iconBg
                            }`}
                          >
                            <AreaIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-xs font-bold ${isSelected ? colors.text : "text-app-ink"}`}
                            >
                              {getLifeAreaLabel(area.name)}
                            </p>
                            <p className={`text-[10px] font-semibold ${isSelected ? colors.text : "text-app-ink-muted"}`}>
                              {area.score}/10
                            </p>
                          </div>
                          {isSelected && <Check className={`h-3.5 w-3.5 shrink-0 ${colors.text}`} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: INSIGHT REPORT & INTENT & CTA */}
            <div className="lg:sticky lg:top-6 space-y-6">
              <div className="surface-raised rounded-2xl border border-[#E6DFD3] dark:border-slate-800 bg-[#FCFAF6] dark:bg-slate-900/40 p-6 shadow-md relative overflow-hidden transition-all duration-300">
                {/* Paperclip sticker mockup */}
                <div className="absolute -top-1.5 right-6 z-10 rotate-[-12deg] text-amber-600/70 dark:text-amber-500/50">
                  <svg width="24" height="30" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                    <title>Góc kẹp giấy</title>
                    <path d="M12 2C8.686 2 6 4.686 6 8v12c0 2.209 1.791 4 4 4s4-1.791 4-4V8c0-1.103-.897-2-2-2s-2 .897-2 2v10c0 .553.447 1 1 1s1-.447 1-1V8c0-.552.448-1 1-1s1 .448 1 1v12c0 3.309-2.691 6-6 6s-6-2.691-6-6V8c0-4.963 4.037-9 9-9s9 4.037 9 9v12c0 .553-.447 1-1 1s-1-.447-1-1V8c0-3.859-3.141-7-7-7Z" fill="currentColor" />
                  </svg>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-app-accent">BÁO CÁO GÓC NHÌN CÁ NHÂN</p>
                  
                  {/* Selected Focus Area Info */}
                  <div className="mt-4 flex items-center gap-3.5">
                    <FocusLantern Icon={FocusAreaIcon} label={focusArea.name} />
                    <div>
                      <h2 className="text-2xl font-serif font-medium text-app-ink leading-tight">
                        {focusAreaLabel}
                      </h2>
                      <p className="mt-1 text-xs text-app-ink-soft">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          {focusArea.score === lowestArea.score ? (
                            <TrendingDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <TrendingUp className="h-3.5 w-3.5 text-app-accent" />
                          )}
                          Điểm hiện tại: {focusArea.score}/10
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Motivations memo block */}
                  <div className="mt-5 relative rounded-xl border border-amber-200/50 bg-[#F7F3E9] dark:bg-slate-900/60 dark:border-slate-800 p-4 leading-relaxed shadow-sm">
                    {/* Tape sticker decoration */}
                    <div className="absolute -top-2 left-6 z-10">
                      <div className="h-3.5 w-14 bg-amber-200/30 dark:bg-amber-850/20 backdrop-blur-[1px] transform rotate-2 border-x border-amber-300/20" />
                    </div>
                    <p className="text-sm font-serif italic text-app-ink leading-relaxed">
                      "{smartGoalStarter.motivationReason}"
                    </p>
                  </div>

                  {/* Intent Options */}
                  <div className="mt-6 pt-5 border-t border-[#E6DFD3] dark:border-slate-800">
                    <h3 className="text-sm font-bold text-app-ink">Mục đích chính của bạn với lĩnh vực này</h3>
                    <p className="mt-1 text-xs text-app-ink-muted">Chọn định hướng giúp gợi ý viết mục tiêu SMART</p>
                    
                    <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {intentOptions.map((option) => {
                        const isSelected = selectedIntent === option.id;
                        const OptionIcon = INTENT_ICONS[option.id];
                        const colors = getIntentColorConfig(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleIntentSelect(option.id)}
                            className={`group flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left w-full transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 ${
                              isSelected
                                ? `bg-app-accent-soft ${colors.selectedBg}`
                                : `border-app-line bg-app-surface/60 text-app-ink ${colors.hoverBorder} ${colors.hoverBg} hover:shadow-sm`
                            }`}
                          >
                            <div className="flex w-full items-start justify-between gap-2">
                              <span className="flex items-center gap-2 text-xs font-bold">
                                <span className={`p-1 rounded-md transition-colors ${
                                  isSelected ? colors.iconSelectedBg : colors.iconBg
                                }`}>
                                  <OptionIcon className="h-3.5 w-3.5" />
                                </span>
                                {option.label}
                              </span>
                              {isSelected && <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${colors.selectedText}`} />}
                            </div>
                            <p
                              className={`text-[11px] leading-normal pl-7 ${isSelected ? colors.selectedText : "text-app-ink-soft"}`}
                            >
                              {option.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {selectedIntent !== null && (
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#E6DFD3] dark:border-slate-800">
                        <p className="text-[10px] text-app-ink-muted">
                          Lựa chọn này được lưu để gợi ý bước SMART và kế hoạch 12 tuần.
                        </p>
                        <button
                          type="button"
                          onClick={handleIntentClear}
                          className="rounded-lg border border-[#E6DFD3] dark:border-slate-800 bg-[#FCFAF6] dark:bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-app-ink-soft hover:bg-[#F7F3E9] hover:text-app-ink transition-colors"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main CTA Section */}
                <div className="mt-6 pt-5 border-t border-[#E6DFD3] dark:border-slate-800">
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-app-accent">TIẾP THEO</p>
                      <h4 className="mt-1 text-sm font-bold text-app-ink">Biến trọng tâm này thành mục tiêu SMART</h4>
                      <p className="mt-0.5 text-xs text-app-ink-muted">Khoảng 4 phút thực hiện</p>
                    </div>
                    <Button
                      onClick={handleStartGoalSetup}
                      className="group inline-flex items-center justify-center gap-2 bg-app-accent py-3 text-sm font-bold text-white shadow-lg shadow-app-accent/20 transition-all duration-150 hover:brightness-105 hover:shadow-xl active:scale-[0.98] w-full"
                    >
                      Tiếp → Viết mục tiêu
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageShell>
  );
}
