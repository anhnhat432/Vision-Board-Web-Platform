import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, Compass, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";

import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { ProductVisual } from "../components/visuals/ProductVisual";
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
import { Card, CardContent } from "../components/ui/card";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
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

function LifeInsightPageMotion({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const className = "mx-auto w-full max-w-6xl stack-section";

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
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

  const averageScore = useMemo(() => {
    if (lifeAreas.length === 0) return 0;
    return lifeAreas.reduce((sum, area) => sum + area.score, 0) / lifeAreas.length;
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
        currentStepId="life_balance"
        eyebrow="Góc nhìn cuộc sống"
        title="Chưa có dữ liệu cân bằng cuộc sống"
        description="Trước khi tạo mục tiêu SMART, bạn cần hoàn thành Cân bằng cuộc sống để hệ thống biết nên ưu tiên khu vực nào."
        actionLabel="Đi tới Bắt đầu"
        onAction={() => navigate("/onboarding")}
        secondaryActionLabel="Mở Cân bằng cuộc sống"
        onSecondaryAction={() => navigate("/life-balance")}
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
  const lowestAreaLabel = getLifeAreaLabel(lowestArea.name);
  const strongestAreaLabel = getLifeAreaLabel(strongestArea.name);
  const scoreGapFromAverage = Math.max(0, averageScore - focusArea.score);

  return (
    <div ref={pageTopRef} className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <AlertDialog open={pendingFocusAreaName !== null} onOpenChange={(open) => !open && setPendingFocusAreaName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có bản nháp mục tiêu chưa lưu</AlertDialogTitle>
            <AlertDialogDescription>Đổi lĩnh vực sẽ xoá bản nháp hiện tại. Tiếp tục?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ bản nháp</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDraftClear}>Xoá bản nháp và đổi lĩnh vực</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <LifeInsightPageMotion>
        <CoreFlowProgress currentStepId="life_insight" />

        <Card className="ops-surface overflow-hidden border border-slate-200/80 bg-white/94 text-slate-950 shadow-sm">
          <CardContent className="relative p-5 sm:p-6">
            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="stack-stack">
                <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <Compass className="h-4 w-4" />
                  Góc nhìn cuộc sống
                </div>

                <div className="stack-tight">
                  <h1 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
                    Bạn đã có một tín hiệu rất rõ.{" "}
                    <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent">
                      Đây là 3 trọng tâm hiện ra
                    </span>{" "}
                    để chọn bước tiếp theo.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    Hệ thống gợi ý lĩnh vực có điểm thấp nhất. Bạn cũng có thể chọn lại bên dưới nếu muốn tập trung vào
                    một khu vực khác phù hợp hơn với lúc này.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge
                    variant="outline"
                    className="rounded-[var(--r-pill)] border-violet-200 bg-violet-50 px-4 py-2 text-violet-700"
                  >
                    <Target className="mr-1 h-3.5 w-3.5" />
                    Ưu tiên: {getLifeAreaLabel(focusArea.name)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-[var(--r-pill)] border-slate-200 bg-slate-50 px-4 py-2 text-slate-600"
                  >
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />
                    Điểm trung bình: {averageScore.toFixed(1)}/10
                  </Badge>
                  {isCustomSelection && (
                    <Badge
                      variant="outline"
                      className="rounded-[var(--r-pill)] border-amber-200 bg-amber-50 px-4 py-2 text-amber-700"
                    >
                      Bạn đã chọn thủ công
                    </Badge>
                  )}
                </div>

                <div
                  data-testid="life-insight-decision-card"
                  className="grid gap-3 rounded-[var(--r-tile)] border border-violet-200 bg-violet-50/85 p-4 shadow-sm lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                      Quyết định tiếp theo
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">
                      Tạo mục tiêu SMART cho {focusAreaLabel} trong khung 12 tuần.
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {isCustomSelection
                        ? `Bạn đang ưu tiên thủ công ${focusAreaLabel}; gợi ý hệ thống vẫn là ${lowestAreaLabel}.`
                        : `${focusAreaLabel} đang là điểm thấp nhất, nên đây là nơi đáng biến thành mục tiêu rõ trước.`}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="rounded-[var(--r-control)] border border-white bg-white/85 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trọng tâm</p>
                      <p className="mt-1 font-bold text-slate-950">
                        {focusAreaLabel} · {focusArea.score}/10
                      </p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-white bg-white/85 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Gợi ý SMART</p>
                      <p className="mt-1 font-semibold text-slate-950">{smartGoalStarter.metricName}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{smartGoalStarter.specificGoalStatement}</p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-white bg-white/85 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Điểm tựa</p>
                      <p className="mt-1 font-semibold text-slate-950">{strongestAreaLabel}</p>
                    </div>
                  </div>
                </div>

                <div
                  data-testid="life-insight-recommendation-card"
                  className="grid gap-3 rounded-[var(--r-tile)] border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Vì sao chọn trọng tâm này?
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">
                      {isCustomSelection
                        ? `Bạn đang chọn ${focusAreaLabel} thay cho gợi ý ${lowestAreaLabel}.`
                        : `${focusAreaLabel} là điểm thấp nhất trong bánh xe hiện tại.`}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Dùng một lĩnh vực đủ cụ thể giúp bước mục tiêu SMART không bị rộng. Sau khi chọn xong, phần tiếp theo
                      sẽ ép trọng tâm này thành mục tiêu đo được và có thời hạn.
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="rounded-[var(--r-tile)] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-slate-500">Điểm hiện tại</p>
                      <p className="mt-1 text-lg font-bold text-slate-950">{focusArea.score}/10</p>
                    </div>
                    <div className="rounded-[var(--r-tile)] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-slate-500">Lệch so với trung bình</p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {scoreGapFromAverage > 0 ? `-${scoreGapFromAverage.toFixed(1)}` : "0.0"}
                      </p>
                    </div>
                    <div className="rounded-[var(--r-tile)] border border-slate-200 bg-white px-4 py-3">
                      <p className="text-slate-500">Lực đỡ hiện có</p>
                      <p className="mt-1 font-semibold text-slate-950">{strongestAreaLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    data-testid="life-insight-primary-cta"
                    className="w-full justify-center bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-fuchsia-700 sm:w-auto"
                    onClick={handleStartGoalSetup}
                  >
                    Tạo mục tiêu SMART từ quyết định này
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-violet-700 hover:bg-violet-50 hover:text-violet-800 dark:text-violet-200 dark:hover:bg-violet-950/40 sm:w-auto"
                    onClick={() => navigate("/")}
                  >
                    Về bảng điều khiển
                  </Button>
                </div>
              </div>

              <ProductVisual variant="balance" className="hidden min-h-[220px] lg:block" />

              <div className="hidden rounded-[var(--r-card)] border border-white/14 bg-white/12 p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">Snapshot hiện tại</p>

                <div className="mt-6 stack-stack">
                  <div className="rounded-[var(--r-card)] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Đang tập trung vào</p>
                    <p className="mt-2 text-2xl font-bold text-white">{getLifeAreaLabel(focusArea.name)}</p>
                    <p className="mt-1 text-sm text-white/68">{focusArea.score}/10</p>
                  </div>
                  <div className="rounded-[var(--r-card)] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Điểm mạnh hiện tại</p>
                    <p className="mt-2 text-2xl font-bold text-white">{getLifeAreaLabel(strongestArea.name)}</p>
                    <p className="mt-1 text-sm text-white/68">{strongestArea.score}/10</p>
                  </div>
                  <div className="rounded-[var(--r-card)] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Thông điệp</p>
                    <p className="mt-2 text-sm leading-7 text-white/74">
                      Đừng cố sửa mọi thứ cùng lúc. Chỉ cần chọn một điểm yếu nhất, rồi biến nó thành một hướng đi đủ rõ
                      để hành động.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mx-auto max-w-5xl stack-stack">
          <details className="rounded-[var(--r-card)] border border-white/70 bg-white/82 p-5 shadow-lg lg:p-6">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Đổi lĩnh vực trọng tâm
            </summary>
            <p className="mt-[var(--space-inline)] text-sm leading-7 text-slate-600">
              Hệ thống gợi ý <strong>{getLifeAreaLabel(lowestArea.name)}</strong> vì đây là điểm thấp nhất. Nếu lúc này
              bạn muốn ưu tiên khu vực khác, chọn lại bên dưới.
            </p>
            <div className="mt-[var(--space-stack)] grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {lifeAreas.map((area) => {
                const isSelected = focusArea.name === area.name;
                const isRecommended = area.name === lowestArea.name;
                return (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => setSelectedAreaName(area.name === lowestArea.name ? null : area.name)}
                    className={`card-hover-lift glass-surface-sm relative overflow-hidden rounded-[var(--r-tile)] border border-l-4 p-4 text-left transition-colors transition-transform duration-150 ${
                      isSelected
                        ? "border-violet-300 bg-violet-50 shadow-md dark:bg-violet-950/30"
                        : "border-white/70 bg-white/72 hover:border-white hover:bg-white dark:bg-slate-950/50"
                    }`}
                    style={{ borderLeftColor: area.color }}
                  >
                    {isRecommended && (
                      <span className="absolute -top-2 left-3 rounded-[var(--r-pill)] bg-violet-600 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-white">
                        Gợi ý
                      </span>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--r-tile)]"
                        style={{
                          background: `linear-gradient(135deg, ${area.color}24, ${area.color}12)`,
                          color: area.color,
                        }}
                      >
                        <Target className="h-4 w-4" aria-hidden="true" />
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-violet-600" />}
                    </div>
                    <p className="mt-[var(--space-inline)] text-sm font-semibold text-slate-900">{getLifeAreaLabel(area.name)}</p>
                    <p className="mt-1 text-xs font-medium" style={{ color: area.color }}>
                      {area.score}/10
                    </p>
                  </button>
                );
              })}
            </div>
          </details>

          <details
            data-testid="life-insight-intent-picker"
            className="rounded-[var(--r-card)] border border-white/70 bg-white/82 p-5 shadow-lg lg:p-6"
            open={selectedIntent !== null}
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Bạn đang muốn làm điều gì trong 12 tuần tới?
            </summary>
            <p className="mt-[var(--space-inline)] text-sm leading-7 text-slate-600">
              Chọn một mô tả gần nhất để app gợi ý cho sát hơn. Không bắt buộc — bạn có thể bỏ qua, thay đổi hoặc xoá
              bất cứ lúc nào.
            </p>
            <div
              role="radiogroup"
              aria-label="Chọn điều bạn muốn làm trong 12 tuần tới"
              className="mt-[var(--space-stack)] grid gap-2 sm:grid-cols-2"
            >
              {intentOptions.map((option) => {
                const isSelected = selectedIntent === option.id;
                return (
                  <label
                    key={option.id}
                    data-intent-id={option.id}
                    className={`cursor-pointer rounded-[var(--r-tile)] border p-4 text-left transition-colors transition-transform duration-150 hover:-translate-y-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-300 ${
                      isSelected
                        ? "border-violet-300 bg-violet-50 shadow-md"
                        : "border-white/70 bg-white/72 hover:border-white hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="life-insight-intent"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => handleIntentSelect(option.id)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                      {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                  </label>
                );
              })}
            </div>
            {selectedIntent !== null && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-xs text-slate-500">
                  Lựa chọn này được lưu trên trình duyệt này để gợi ý bước SMART và kế hoạch 12 tuần.
                </p>
                <button
                  type="button"
                  onClick={handleIntentClear}
                  className="text-xs font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </details>

          <details className="rounded-[var(--r-card)] border border-white/70 bg-white/82 p-5 shadow-lg lg:p-6">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Xem bức tranh tổng thể
            </summary>
            <p className="mt-[var(--space-inline)] text-sm leading-7 text-slate-600">
              Biểu đồ này cho thấy toàn bộ bánh xe cuộc sống hiện tại để bạn không nhìn một chiều.
            </p>
            <SimpleRadarChart className="mx-auto mt-[var(--space-stack)] max-w-[460px]" data={radarData} height={320} fillOpacity={0.2} />

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div
                className="rounded-[var(--r-tile)] border p-4"
                style={{
                  borderColor: `${lowestArea.color}33`,
                  background: `${lowestArea.color}12`,
                }}
              >
                <div className="flex items-center gap-2" style={{ color: lowestArea.color }}>
                  <TrendingDown className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">Nút thắt hiện tại</p>
                </div>
                <p className="mt-[var(--space-inline)] text-lg font-semibold text-slate-900">{getLifeAreaLabel(lowestArea.name)}</p>
                <p className="mt-1 text-sm text-slate-600">Đây là khu vực nên trở thành trọng tâm tiếp theo.</p>
              </div>

              <div
                className="rounded-[var(--r-tile)] border p-4"
                style={{
                  borderColor: `${strongestArea.color}33`,
                  background: `${strongestArea.color}12`,
                }}
              >
                <div className="flex items-center gap-2" style={{ color: strongestArea.color }}>
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">Lực đỡ hiện có</p>
                </div>
                <p className="mt-[var(--space-inline)] text-lg font-semibold text-slate-900">{getLifeAreaLabel(strongestArea.name)}</p>
                <p className="mt-1 text-sm text-slate-600">Tận dụng điểm mạnh này để kéo khu vực đang yếu lên cùng.</p>
              </div>
            </div>
          </details>

          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Trọng tâm hiện tại</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {getLifeAreaLabel(focusArea.name)} ({focusArea.score}/10)
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Tiếp theo là biến trọng tâm này thành một mục tiêu SMART đủ rõ để hành động.
                </p>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-fuchsia-700 sm:w-auto"
                onClick={handleStartGoalSetup}
              >
                Tạo mục tiêu SMART từ quyết định này
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </LifeInsightPageMotion>
    </div>
  );
}
