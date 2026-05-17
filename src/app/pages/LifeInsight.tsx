import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Check, Compass, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";

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
import { SimpleRadarChart } from "../components/SimpleRadarChart";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { getSmartGoalStarter } from "../utils/smart-goal-starters";
import { APP_STORAGE_KEYS, clearGoalPlanningDrafts, getLifeAreaLabel } from "../utils/storage";
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
      <CoreFlowGateState
        currentStepId="life_insight"
        eyebrow="Góc nhìn cuộc sống"
        title="Đang tải dữ liệu góc nhìn"
        description="Mình đang đọc dữ liệu bánh xe cuộc sống để gợi ý lĩnh vực bạn nên ưu tiên tiếp theo."
        loading
      />
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
    clearGoalPlanningDrafts();
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, areaName);
    navigate("/smart-goal-setup");
  };

  const handleStartGoalSetup = () => {
    const currentDraftFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const isChangingFocusArea = Boolean(currentDraftFocusArea && currentDraftFocusArea !== focusArea.name);
    if (isChangingFocusArea && getPendingSmartGoalStatement().length > 0) {
      setPendingFocusAreaName(focusArea.name);
      return;
    }

    continueToGoalSetup(focusArea.name);
  };

  const handleConfirmDraftClear = () => {
    const nextFocusAreaName = pendingFocusAreaName ?? focusArea.name;
    setPendingFocusAreaName(null);
    continueToGoalSetup(nextFocusAreaName);
  };

  const isCustomSelection = selectedAreaName !== null && selectedAreaName !== lowestArea.name;
  const focusAreaLabel = getLifeAreaLabel(focusArea.name);
  const FocusAreaIcon = getLifeAreaIcon(focusArea.name);

  return (
    <PageShell maxWidth="xl">
      <div ref={pageTopRef}>
        <AlertDialog open={pendingFocusAreaName !== null} onOpenChange={(open) => !open && setPendingFocusAreaName(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bạn có bản nháp mục tiêu chưa lưu</AlertDialogTitle>
              <AlertDialogDescription>Đổi lĩnh vực sẽ xoá bản nháp hiện tại. Tiếp tục?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button type="button" variant="ghost" className="sm:mr-auto" onClick={() => setPendingFocusAreaName(null)}>
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
          <div className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
            {/* Header section */}
            <div className="max-w-2xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                BƯỚC 2 / 6 · GÓC NHÌN CUỘC SỐNG
              </p>
              <h1 className="mt-3 text-[30px] font-medium leading-tight tracking-tight text-app-ink" style={{ fontFamily: "var(--font-serif)" }}>
                Chọn nơi đáng ưu tiên trong 12 tuần tới.
              </h1>
              <p className="mt-2 text-[14px] text-app-ink-soft">
                Dữ liệu cân bằng cho thấy đâu là điểm mỏng và mạnh nhất. Chọn 1 lĩnh vực để biến thành mục tiêu SMART.
              </p>
            </div>

            {/* Status pills row */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-app-accent-soft px-3 py-1 text-[12px] font-medium text-app-accent">
                <Target className="mr-1 h-3.5 w-3.5" />
                Đề xuất ưu tiên: {focusAreaLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg px-3 py-1 text-[12px] text-app-ink-soft">
                <Compass className="mr-1 h-3.5 w-3.5" />
                Đang chọn tự động
              </span>
              {isCustomSelection && (
                <span className="inline-flex items-center rounded-full bg-app-warm-soft px-3 py-1 text-[12px] font-medium text-app-warm">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Bạn đã chọn thủ công
                </span>
              )}
            </div>

            {/* Visualization row */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              {/* Radar chart */}
              <div className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-app-ink">Bánh xe của bạn</h3>
                  <p className="text-[12px] text-app-ink-muted">8 lĩnh vực hiện tại</p>
                </div>
                <div className="mt-4">
                  <SimpleRadarChart
                    data={radarData}
                    height={280}
                    stroke="var(--app-accent)"
                    fill="var(--app-accent)"
                    fillOpacity={0.24}
                  />
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => navigate("/life-balance")}
                    className="text-[13px] text-app-accent hover:underline"
                  >
                    Chấm lại điểm →
                  </button>
                </div>
              </div>

              {/* Selection summary */}
              <div className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
                <p className="text-[12px] text-app-ink-muted">Đang chọn</p>
                <div className="mt-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
                    <FocusAreaIcon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-3 text-[22px] font-medium text-app-ink" style={{ fontFamily: "var(--font-serif)" }}>
                    {focusAreaLabel}
                  </h2>
                  <p className="mt-2 text-[13px] text-app-ink-soft">
                    <span className="inline-flex items-center gap-1">
                      {focusArea.score === lowestArea.score ? (
                        <TrendingDown className="h-3.5 w-3.5 text-app-warm" />
                      ) : (
                        <TrendingUp className="h-3.5 w-3.5 text-app-accent" />
                      )}
                      Điểm hiện tại: {focusArea.score}/10
                    </span>
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-app-ink">
                    {smartGoalStarter.motivationReason}
                  </p>
                  {selectedIntent && (
                    <div className="mt-3">
                      <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg px-2.5 py-1 text-[11px] text-app-ink-soft">
                        {intentOptions.find((o) => o.id === selectedIntent)?.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Life areas grid */}
          <div className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
            <div>
              <h3 className="text-[15px] font-semibold text-app-ink">Hoặc chọn lĩnh vực khác</h3>
              <p className="mt-1 text-[12px] text-app-ink-muted">Click để đặt làm trọng tâm</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
              {lifeAreas.map((area) => {
                const isSelected = focusArea.name === area.name;
                const AreaIcon = getLifeAreaIcon(area.name);
                return (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => setSelectedAreaName(area.name === lowestArea.name ? null : area.name)}
                    className={`group rounded-lg border p-3 text-left transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                      isSelected
                        ? "border-app-accent bg-app-accent-soft"
                        : "border-app-line bg-app-surface hover:border-app-ink-muted"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                          isSelected ? "bg-app-accent text-white" : "bg-app-bg text-app-ink-muted"
                        }`}
                      >
                        <AreaIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[13px] font-medium ${isSelected ? "text-app-accent" : "text-app-ink"}`}>
                          {getLifeAreaLabel(area.name)}
                        </p>
                        <p className={`mt-0.5 text-[11px] ${isSelected ? "text-app-accent" : "text-app-ink-muted"}`}>
                          {area.score}/10
                        </p>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-app-accent shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intent options */}
          <div className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
            <div>
              <h3 className="text-[15px] font-semibold text-app-ink">
                Mục đích chính của bạn với lĩnh vực này
              </h3>
              <p className="mt-1 text-[12px] text-app-ink-muted">Chọn 1 — sẽ định hình kiểu mục tiêu SMART</p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {intentOptions.map((option) => {
                const isSelected = selectedIntent === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleIntentSelect(option.id)}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                      isSelected
                        ? "border-app-accent bg-app-accent-soft text-app-accent"
                        : "border-app-line bg-app-surface text-app-ink"
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="text-[14px] font-medium">{option.label}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </div>
                    <p className={`text-[12px] leading-relaxed ${isSelected ? "text-app-accent" : "text-app-ink-soft"}`}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {selectedIntent !== null && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-[12px] text-app-ink-soft">
                  Lựa chọn này được lưu trên thiết bị này để gợi ý bước SMART và kế hoạch 12 tuần.
                </p>
                <button
                  type="button"
                  onClick={handleIntentClear}
                  className="text-[12px] font-semibold text-app-ink-soft underline-offset-2 hover:text-app-ink hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </div>

          {/* CTA card */}
          <div className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking text-app-ink-muted">TIẾP THEO</p>
                <h3 className="mt-1 text-[15px] font-medium text-app-ink">
                  Biến trọng tâm này thành mục tiêu SMART
                </h3>
                <p className="mt-1 text-[12px] text-app-ink-muted">Khoảng 4 phút</p>
              </div>
              <Button
                onClick={handleStartGoalSetup}
                className="inline-flex items-center gap-2 bg-app-accent px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#284f45]"
              >
                Tiếp → Viết mục tiêu
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}