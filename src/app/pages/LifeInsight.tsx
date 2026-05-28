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
          {/* Hero card */}
          <div className="surface-raised rounded-2xl border border-app-line bg-gradient-to-br from-app-surface to-app-bg p-6 shadow-sm">
            {/* Header section */}
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent">
                BƯỚC 2 / 6 · GÓC NHÌN CUỘC SỐNG
              </p>
              <h1
                className="mt-3.5 text-4xl font-medium leading-tight tracking-tight text-app-ink"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Chọn nơi đáng ưu tiên trong 12 tuần tới.
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-app-ink-soft">
                Dữ liệu cân bằng cho thấy đâu là điểm mỏng và mạnh nhất. Chọn 1 lĩnh vực để biến thành mục tiêu SMART.
              </p>
            </div>

            {/* Status pills row */}
            <div className="mt-5 flex flex-wrap gap-2.5">
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

            {/* Visualization row */}
            <div className="mt-6.5 grid gap-6 lg:grid-cols-[1fr_1fr]">
              {/* Radar chart */}
              <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 md:p-6 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-app-line/60">
                  <h3 className="text-sm font-bold tracking-wide text-app-ink">Bánh xe của bạn</h3>
                  <p className="text-xs font-semibold text-app-ink-muted">8 lĩnh vực hiện tại</p>
                </div>
                <div className="mt-4 flex items-center justify-center">
                  <SimpleRadarChart
                    data={radarData}
                    height={360}
                    stroke="var(--app-accent)"
                    fill="var(--app-accent)"
                    fillOpacity={0.24}
                  />
                </div>
                <div className="mt-4 pt-3 border-t border-app-line/60">
                  <button
                    type="button"
                    onClick={() => navigate("/life-balance")}
                    className="group inline-flex items-center gap-1.5 text-xs font-semibold text-app-accent transition-colors hover:text-app-accent"
                  >
                    <RotateCcw className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-[-45deg]" />
                    Chấm lại điểm
                  </button>
                </div>
              </div>

              {/* Selection summary */}
              <div className="surface-raised rounded-2xl border border-app-line bg-gradient-to-br from-app-accent-soft/20 via-app-surface to-app-accent-soft/5 p-5 md:p-6 transition-all duration-300 hover:shadow-md flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">Đang chọn</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-app-accent text-white shadow-md shadow-app-accent/20">
                      <FocusAreaIcon className="h-5 w-5" />
                    </div>
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
                  
                  {/* Motivations block */}
                  <div className="mt-6 relative rounded-xl border border-app-line/60 bg-app-surface/60 p-4 leading-relaxed">
                    <div className="absolute top-2 left-3 text-3xl font-serif text-app-accent/20 leading-none select-none">“</div>
                    <p className="text-sm font-serif italic text-app-ink pl-4 pt-1">
                      {smartGoalStarter.motivationReason}
                    </p>
                  </div>
                </div>

                {selectedIntent && (
                  <div className="mt-6 pt-4 border-t border-app-line/60 flex items-center justify-between">
                    <span className="text-xs text-app-ink-muted">Mục đích đã chọn:</span>
                    <span className="inline-flex items-center rounded-full border border-app-accent/20 bg-app-accent-soft px-3 py-1 text-xs font-semibold text-app-accent shadow-sm">
                      {intentOptions.find((o) => o.id === selectedIntent)?.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Life areas grid */}
          <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-6 shadow-sm">
            <div className="pb-3 border-b border-app-line/60">
              <h3 className="text-base font-bold text-app-ink">Hoặc chọn lĩnh vực khác</h3>
              <p className="mt-1 text-xs text-app-ink-muted">Click để đặt làm trọng tâm</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
              {lifeAreas.map((area) => {
                const isSelected = focusArea.name === area.name;
                const AreaIcon = getLifeAreaIcon(area.name);
                return (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => setSelectedAreaName(area.name === lowestArea.name ? null : area.name)}
                    className={`group rounded-xl border p-3.5 text-left transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                      isSelected
                        ? "border-app-accent bg-gradient-to-br from-app-accent-soft/30 to-app-accent-soft/10 ring-1 ring-app-accent/20 shadow-sm shadow-app-accent/15"
                        : "border-app-line bg-app-surface hover:border-app-ink-muted hover:bg-app-bg"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isSelected ? "bg-app-accent text-white" : "bg-app-line text-app-ink-muted group-hover:bg-app-line/80"
                        }`}
                      >
                        <AreaIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-bold ${isSelected ? "text-app-accent" : "text-app-ink"}`}
                        >
                          {getLifeAreaLabel(area.name)}
                        </p>
                        <p className={`mt-0.5 text-xs font-semibold ${isSelected ? "text-app-accent/80" : "text-app-ink-muted"}`}>
                          {area.score}/10
                        </p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-app-accent shrink-0 mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intent options */}
          <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-6 shadow-sm">
            <div className="pb-3 border-b border-app-line/60">
              <h3 className="text-base font-bold text-app-ink">Mục đích chính của bạn với lĩnh vực này</h3>
              <p className="mt-1 text-xs text-app-ink-muted">Chọn 1 — sẽ định hình kiểu mục tiêu SMART</p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {intentOptions.map((option) => {
                const isSelected = selectedIntent === option.id;
                const OptionIcon = INTENT_ICONS[option.id];
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleIntentSelect(option.id)}
                    className={`group flex flex-col items-start gap-2.5 rounded-xl border p-4.5 text-left transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                      isSelected
                        ? "border-app-accent bg-app-accent-soft text-app-accent shadow-sm shadow-app-accent/10"
                        : "border-app-line bg-app-surface text-app-ink hover:border-app-ink-muted hover:bg-app-bg"
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2.5">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <span className={`p-1.5 rounded-lg transition-colors ${
                          isSelected ? "bg-app-accent/15 text-app-accent" : "bg-app-line text-app-ink-muted group-hover:bg-app-line/80"
                        }`}>
                          <OptionIcon className="h-4 w-4" />
                        </span>
                        {option.label}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 mt-1" />}
                    </div>
                    <p
                      className={`text-xs leading-relaxed pl-8 ${isSelected ? "text-app-accent/90" : "text-app-ink-soft"}`}
                    >
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {selectedIntent !== null && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-app-line/60">
                <p className="text-xs text-app-ink-muted">
                  Lựa chọn này được lưu trên thiết bị này để gợi ý bước SMART và kế hoạch 12 tuần.
                </p>
                <button
                  type="button"
                  onClick={handleIntentClear}
                  className="rounded-lg border border-app-line bg-app-surface px-3 py-1.5 text-xs font-bold text-app-ink-soft hover:bg-app-bg hover:text-app-ink transition-colors"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </div>

          {/* CTA card */}
          <div className="surface-raised rounded-2xl border border-app-line bg-gradient-to-r from-app-surface to-app-bg p-5 md:p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-accent">TIẾP THEO</p>
                <h3 className="mt-1 text-base font-bold text-app-ink">Biến trọng tâm này thành mục tiêu SMART</h3>
                <p className="mt-1 text-xs text-app-ink-muted">Khoảng 4 phút thực hiện</p>
              </div>
              <Button
                onClick={handleStartGoalSetup}
                className="group inline-flex items-center gap-2 bg-app-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-app-accent shadow-md shadow-app-accent/15"
              >
                Tiếp → Viết mục tiêu
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
