import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, Compass, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";

import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { LifeInsightIllustration, getLifeAreaIcon } from "../components/illustrations";
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
  const className = "stack-section";

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
      <LifeInsightPageMotion>
        <CoreFlowProgress currentStepId="life_insight" />

        <Card>
          <CardContent className="relative p-5 sm:p-7 lg:p-8">
            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="stack-stack">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <Compass className="h-3.5 w-3.5 text-[color:var(--tone-shell-secondary)]" aria-hidden="true" />
                  Góc nhìn cuộc sống
                </p>

                <div className="stack-tight">
                  <h1 className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-4xl">
                    Bạn đã có một tín hiệu rất rõ.{" "}
                    <span className="text-gradient-vibrant">Đây là 3 trọng tâm hiện ra</span> để chọn bước tiếp theo.
                  </h1>
                  <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                    Hệ thống gợi ý lĩnh vực có điểm thấp nhất. Bạn cũng có thể chọn lại bên dưới nếu muốn tập trung vào
                    một khu vực khác phù hợp hơn với lúc này.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="brand">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    Ưu tiên: {getLifeAreaLabel(focusArea.name)}
                  </Badge>
                  <Badge variant="neutral">
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />
                    Điểm trung bình: {averageScore.toFixed(1)}/10
                  </Badge>
                  {isCustomSelection && <Badge variant="warning">Bạn đã chọn thủ công</Badge>}
                </div>

                <div
                  data-testid="life-insight-decision-card"
                  className="grid gap-3 rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--tone-shell-primary)]">
                      Quyết định tiếp theo
                    </p>
                    <h2 className="mt-2 text-xl font-semibold leading-snug tracking-[-0.014em] text-foreground sm:text-2xl">
                      Tạo mục tiêu SMART cho {focusAreaLabel} trong khung 12 tuần.
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {isCustomSelection
                        ? `Bạn đang ưu tiên thủ công ${focusAreaLabel}; gợi ý hệ thống vẫn là ${lowestAreaLabel}.`
                        : `${focusAreaLabel} đang là điểm thấp nhất, nên đây là nơi đáng biến thành mục tiêu rõ trước.`}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Trọng tâm</p>
                      <p className="mt-1 font-bold text-foreground">
                        {focusAreaLabel} · {focusArea.score}/10
                      </p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Gợi ý SMART</p>
                      <p className="mt-1 font-semibold text-foreground">{smartGoalStarter.metricName}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{smartGoalStarter.specificGoalStatement}</p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Điểm tựa</p>
                      <p className="mt-1 font-semibold text-foreground">{strongestAreaLabel}</p>
                    </div>
                  </div>
                </div>

                <div
                  data-testid="life-insight-recommendation-card"
                  className="grid gap-3 rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-5 sm:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Vì sao chọn trọng tâm này?
                    </p>
                    <h2 className="mt-2 text-xl font-bold tracking-[-0.014em] text-foreground">
                      {isCustomSelection
                        ? `Bạn đang chọn ${focusAreaLabel} thay cho gợi ý ${lowestAreaLabel}.`
                        : `${focusAreaLabel} là điểm thấp nhất trong bánh xe hiện tại.`}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Dùng một lĩnh vực đủ cụ thể giúp bước mục tiêu SMART không bị rộng. Sau khi chọn xong, phần tiếp theo
                      sẽ ép trọng tâm này thành mục tiêu đo được và có thời hạn.
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-4 py-3">
                      <p className="text-muted-foreground">Điểm hiện tại</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{focusArea.score}/10</p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-4 py-3">
                      <p className="text-muted-foreground">Lệch so với trung bình</p>
                      <p className="mt-1 text-lg font-bold text-foreground">
                        {scoreGapFromAverage > 0 ? `-${scoreGapFromAverage.toFixed(1)}` : "0.0"}
                      </p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-4 py-3">
                      <p className="text-muted-foreground">Lực đỡ hiện có</p>
                      <p className="mt-1 font-semibold text-foreground">{strongestAreaLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    glow
                    data-testid="life-insight-primary-cta"
                    className="w-full justify-center sm:w-auto"
                    onClick={handleStartGoalSetup}
                  >
                    Tạo mục tiêu SMART từ quyết định này
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" className="w-full sm:w-auto" onClick={() => navigate("/")}>
                    Về Trang chính
                  </Button>
                </div>
              </div>

              <div
                className="pointer-events-none hidden min-h-[220px] items-center justify-center lg:flex"
                aria-hidden="true"
              >
                <LifeInsightIllustration className="w-56 text-[color:var(--tone-shell-primary)] opacity-80" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="stack-stack">
          <details className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-5 shadow-[var(--shadow-1)] lg:p-6">
            <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
              Đổi lĩnh vực trọng tâm
            </summary>
            <p className="mt-[var(--space-inline)] text-sm leading-7 text-muted-foreground">
              Hệ thống gợi ý <strong>{getLifeAreaLabel(lowestArea.name)}</strong> vì đây là điểm thấp nhất. Nếu lúc này
              bạn muốn ưu tiên khu vực khác, chọn lại bên dưới.
            </p>
            <div
              className="mt-[var(--space-stack)] grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
              role="radiogroup"
              aria-label="Chọn lĩnh vực trọng tâm"
            >
              {lifeAreas.map((area) => {
                const isSelected = focusArea.name === area.name;
                const isRecommended = area.name === lowestArea.name;
                const AreaIcon = getLifeAreaIcon(area.name);
                return (
                  <label
                    key={area.name}
                    className={`card-hover-lift relative cursor-pointer overflow-hidden rounded-[var(--r-tile)] border border-l-4 p-4 text-left transition-colors transition-transform duration-150 ${
                      isSelected
                        ? "border-[color:var(--ring)] bg-[color:var(--muted)] shadow-[var(--shadow-2)]"
                        : "border-[color:var(--border)] bg-card hover:bg-[color:var(--muted)]"
                    }`}
                    style={{ borderLeftColor: area.color }}
                  >
                    <input
                      type="radio"
                      name="life-insight-focus-area"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => setSelectedAreaName(area.name === lowestArea.name ? null : area.name)}
                      aria-label={`${getLifeAreaLabel(area.name)} ${area.score}/10${isRecommended ? ", gợi ý" : ""}`}
                    />
                    {isRecommended && (
                      <span className="absolute -top-2 left-3 rounded-[var(--r-pill)] bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                        Gợi ý
                      </span>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AreaIcon className="h-7 w-7 shrink-0" style={{ color: area.color }} />
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-[var(--r-tile)]"
                          style={{
                            background: `linear-gradient(135deg, ${area.color}24, ${area.color}12)`,
                            color: area.color,
                          }}
                        >
                          <Target className="h-4 w-4" aria-hidden="true" />
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="mt-[var(--space-inline)] text-sm font-semibold text-foreground">
                      {getLifeAreaLabel(area.name)}
                    </p>
                    <p className="mt-1 text-xs font-medium" style={{ color: area.color }}>
                      {area.score}/10
                    </p>
                  </label>
                );
              })}
            </div>
          </details>

          <details
            data-testid="life-insight-intent-picker"
            className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-5 shadow-[var(--shadow-1)] lg:p-6"
            open={selectedIntent !== null}
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
              Bạn đang muốn làm điều gì trong 12 tuần tới?
            </summary>
            <p className="mt-[var(--space-inline)] text-sm leading-7 text-muted-foreground">
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
                    className={`cursor-pointer rounded-[var(--r-tile)] border p-4 text-left transition-colors transition-transform duration-150 hover:-translate-y-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[color:var(--ring)] ${
                      isSelected
                        ? "border-[color:var(--ring)] bg-[color:var(--muted)] shadow-[var(--shadow-2)]"
                        : "border-[color:var(--border)] bg-card hover:bg-[color:var(--muted)]"
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
                      <p className="text-sm font-semibold text-foreground">{option.label}</p>
                      {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                  </label>
                );
              })}
            </div>
            {selectedIntent !== null && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  Lựa chọn này được lưu trên thiết bị này để gợi ý bước SMART và kế hoạch 12 tuần.
                </p>
                <button
                  type="button"
                  onClick={handleIntentClear}
                  className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </details>

          <details className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-5 shadow-[var(--shadow-1)] lg:p-6">
            <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
              Xem bức tranh tổng thể
            </summary>
            <p className="mt-[var(--space-inline)] text-sm leading-7 text-muted-foreground">
              Biểu đồ này cho thấy toàn bộ bánh xe cuộc sống hiện tại để bạn không nhìn một chiều.
            </p>
            <SimpleRadarChart
              className="mx-auto mt-[var(--space-stack)] max-w-[460px]"
              data={radarData}
              height={320}
              fillOpacity={0.2}
            />

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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Nút thắt hiện tại</p>
                </div>
                <p className="mt-[var(--space-inline)] text-lg font-semibold text-foreground">
                  {getLifeAreaLabel(lowestArea.name)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Đây là khu vực nên trở thành trọng tâm tiếp theo.</p>
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Lực đỡ hiện có</p>
                </div>
                <p className="mt-[var(--space-inline)] text-lg font-semibold text-foreground">
                  {getLifeAreaLabel(strongestArea.name)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tận dụng điểm mạnh này để kéo khu vực đang yếu lên cùng.
                </p>
              </div>
            </div>
          </details>

          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Trọng tâm hiện tại
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {getLifeAreaLabel(focusArea.name)} ({focusArea.score}/10)
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Tiếp theo là biến trọng tâm này thành một mục tiêu SMART đủ rõ để hành động.
                </p>
              </div>
              <Button glow className="w-full sm:w-auto" onClick={handleStartGoalSetup}>
                Tạo mục tiêu SMART từ quyết định này
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </LifeInsightPageMotion>
      </div>
    </PageShell>
  );
}
