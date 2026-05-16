import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Compass,
  Compass as CompassIcon,
  Save,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/states/EmptyState";
import { InlineStatusMessage } from "../components/states/InlineStatusMessage";

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
import type { LifeBalanceHistoryChartPoint } from "../components/LifeBalanceHistoryChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import { LifeBalanceWheelIllustration, getLifeAreaIcon } from "../components/illustrations";
import { ProductVisual } from "../components/visuals/ProductVisual";
import { Reveal } from "../components/ui/reveal";
import { SimpleRadarChart } from "../components/SimpleRadarChart";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { loadWithChunkReload } from "../utils/chunkLoad";
import { type LifeArea, getLifeAreaLabel, updateWheelOfLife } from "../utils/storage";

const LifeBalanceHistoryChart = lazy(() =>
  loadWithChunkReload(async () => ({
    default: (await import("../components/LifeBalanceHistoryChart")).LifeBalanceHistoryChart,
  })),
);

type FlushableDebouncedSave<T> = {
  schedule: (value: T) => void;
  flush: () => void;
  cancel: () => void;
};

function createFlushableDebouncedSave<T>(callback: (value: T) => void, delayMs: number): FlushableDebouncedSave<T> {
  let timer: ReturnType<typeof window.setTimeout> | null = null;
  let pendingValue: T | null = null;

  const flush = () => {
    if (pendingValue === null) return;

    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }

    const value = pendingValue;
    pendingValue = null;
    callback(value);
  };

  return {
    schedule: (value) => {
      pendingValue = value;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(flush, delayMs);
    },
    flush,
    cancel: () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
      pendingValue = null;
    },
  };
}

function createLifeBalanceSnapshot(lifeAreas: LifeArea[]) {
  return JSON.stringify(lifeAreas.map(({ name, score }) => ({ name, score })));
}

export function LifeBalance() {
  const navigate = useNavigate();
  const { userData, reloadUserData } = useSyncedUserData();
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([]);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("saved");
  const lifeBalanceStartedRef = useRef(false);
  const pageTopRef = useRef<HTMLDivElement | null>(null);
  const currentSnapshot = useMemo(() => createLifeBalanceSnapshot(lifeAreas), [lifeAreas]);
  const hasChanges = lifeAreas.length > 0 && lastSavedSnapshot !== null && currentSnapshot !== lastSavedSnapshot;
  const debouncedSaveRef = useRef<FlushableDebouncedSave<LifeArea[]> | null>(null);

  useScrollToTopOnChange(0, {
    targetRef: pageTopRef,
    focusRef: pageTopRef,
    skipInitial: false,
  });

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => hasChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!userData || hasChanges) return;

    const nextLifeAreas = userData.currentWheelOfLife.map((area) => ({ ...area }));
    setLifeAreas(nextLifeAreas);
    setLastSavedSnapshot(createLifeBalanceSnapshot(nextLifeAreas));
    setAutoSaveStatus("saved");
  }, [hasChanges, userData]);

  useEffect(() => {
    if (!userData?.onboardingCompleted || lifeBalanceStartedRef.current) return;

    const hasExistingScores = userData.currentWheelOfLife.some((area) => area.score > 0);
    lifeBalanceStartedRef.current = true;
    trackAnalyticsEvent("life_balance_started", {
      source: "life_balance",
      returning_user: hasExistingScores,
      has_existing_scores: hasExistingScores,
    });
  }, [userData]);

  const radarData = useMemo(
    () =>
      lifeAreas.map((area) => ({
        subject: getLifeAreaLabel(area.name),
        value: area.score,
        fullMark: 10,
      })),
    [lifeAreas],
  );

  const averageScore = useMemo(() => {
    if (lifeAreas.length === 0) return 0;
    return lifeAreas.reduce((sum, area) => sum + area.score, 0) / lifeAreas.length;
  }, [lifeAreas]);

  const strongestArea = useMemo(() => {
    if (lifeAreas.length === 0) return null;
    return [...lifeAreas].sort((a, b) => b.score - a.score)[0];
  }, [lifeAreas]);

  const weakestArea = useMemo(() => {
    if (lifeAreas.length === 0) return null;
    return [...lifeAreas].sort((a, b) => a.score - b.score)[0];
  }, [lifeAreas]);

  const historicalData = useMemo<LifeBalanceHistoryChartPoint[]>(() => {
    if (!userData) return [];
    return userData.wheelOfLifeHistory.slice(-6).map((record) => {
      const dataPoint: LifeBalanceHistoryChartPoint = {
        date: new Date(record.date).toLocaleDateString("vi-VN", {
          month: "short",
          day: "numeric",
        }),
      };

      record.areas.forEach((area) => {
        dataPoint[getLifeAreaLabel(area.name)] = area.score;
      });

      return dataPoint;
    });
  }, [userData]);

  const hasLifeBalanceData = Boolean(userData?.onboardingCompleted);
  const hasAnyScore = lifeAreas.some((area) => area.score > 0);
  const balanceTone =
    averageScore < 5
      ? "Mặt bằng hiện tại còn thấp. Hãy chọn một lĩnh vực nhỏ để tạo lực kéo trước."
      : averageScore < 7
        ? "Bạn đã có nền ổn định. Điểm thấp nhất là nơi đáng chuyển thành Góc nhìn cuộc sống ngay."
        : "Nền hiện tại khá tốt. Góc nhìn cuộc sống nên tập trung vào điểm lệch để duy trì đà.";

  const trackCompletion = () => {
    if (!strongestArea || !weakestArea) return;

    trackAnalyticsEvent("life_balance_completed", {
      source: "life_balance",
      area_count: lifeAreas.length,
      average_score: Number(averageScore.toFixed(1)),
      weakest_area: getLifeAreaLabel(weakestArea.name),
      strongest_area: getLifeAreaLabel(strongestArea.name),
    });
  };

  const saveLifeBalanceAreas = useCallback(
    (areasToSave: LifeArea[]) => {
      if (areasToSave.length === 0) return;

      setAutoSaveStatus("saving");
      updateWheelOfLife(areasToSave);
      setLastSavedSnapshot(createLifeBalanceSnapshot(areasToSave));
      setLastSavedAt(new Date());
      setAutoSaveStatus("saved");
      reloadUserData();
    },
    [reloadUserData],
  );

  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = createFlushableDebouncedSave(saveLifeBalanceAreas, 600);
  }

  useEffect(() => {
    if (!hasChanges) return;

    setAutoSaveStatus("idle");
    debouncedSaveRef.current?.schedule(lifeAreas.map((area) => ({ ...area })));
  }, [hasChanges, lifeAreas]);

  useDirtyFormGuard(hasChanges, () => debouncedSaveRef.current?.flush());

  const saveLifeBalance = () => {
    debouncedSaveRef.current?.cancel();
    saveLifeBalanceAreas(lifeAreas);
    trackCompletion();
  };

  const handleScoreChange = (index: number, value: number[]) => {
    const updated = [...lifeAreas];
    updated[index] = { ...updated[index], score: value[0] };
    setLifeAreas(updated);
  };

  const handleSave = () => {
    saveLifeBalance();
    toast.success("Đã cập nhật Cân bằng cuộc sống", {
      description: "Điểm mới đã được lưu vào bánh xe cuộc sống của bạn.",
    });
  };

  const handleContinueToInsight = () => {
    if (hasChanges) {
      saveLifeBalance();
      toast.success("Đã lưu Cân bằng cuộc sống trước khi mở Góc nhìn cuộc sống.");
      window.setTimeout(() => navigate("/life-insight"), 0);
      return;
    }

    navigate("/life-insight");
  };

  if (!userData || !hasLifeBalanceData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <EmptyState
          icon={<CompassIcon className="h-7 w-7" />}
          headingLevel={2}
          title="Chưa có dữ liệu bánh xe cuộc sống"
          description="Bạn cần hoàn thành đánh giá ban đầu trước. Chỉ mất khoảng 3 phút để tạo bức tranh nền cho hành trình phát triển."
          actions={
            <Button onClick={() => navigate("/onboarding")}>
              Bắt đầu đánh giá
              <TrendingUp className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    );
  }

  if (!strongestArea || !weakestArea) return null;

  return (
    <div ref={pageTopRef} className="stack-section pb-12">
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-control)] bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle>Bạn có thay đổi chưa lưu</AlertDialogTitle>
            <AlertDialogDescription>
              Nếu rời khỏi trang này ngay bây giờ, hệ thống sẽ cố lưu điểm số vừa điều chỉnh trước khi đóng trang.

            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col sm:items-stretch sm:justify-start">
            <AlertDialogAction
              onClick={() => {
                saveLifeBalance();
                toast.success("Đã lưu trước khi rời trang.");
                blocker.proceed?.();
              }}
              className="w-full"
            >
              <Save className="h-4 w-4" />
              Lưu rồi rời trang
            </AlertDialogAction>
            <Button variant="outline" onClick={() => blocker.proceed?.()}>
              Rời trang
            </Button>

            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              Ở lại trang này
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="relative p-5 sm:p-7 lg:p-8">
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="stack-stack">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Compass className="h-3.5 w-3.5 text-[color:var(--tone-shell-secondary)]" aria-hidden="true" />
                Trung tâm Cân bằng cuộc sống
              </p>

              <div className="stack-tight">
                <h1 className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-4xl">
                  Cập nhật <span className="text-gradient-vibrant">8 lĩnh vực sống</span> để chọn đúng trọng tâm tiếp theo.
                </h1>
                <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                  Mỗi điểm bạn chỉnh sẽ cập nhật ngay phần tín hiệu bên dưới. Sau đó bạn có thể lưu riêng hoặc lưu rồi
                  mở Góc nhìn cuộc sống để chọn vấn đề đáng ưu tiên nhất.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="outline"
                  className="rounded-[var(--r-pill)] border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2 text-muted-foreground"
                >
                  <AutoSaveIndicator status={hasChanges ? autoSaveStatus : "saved"} lastSavedAt={lastSavedAt} />
                </Badge>
                {hasChanges ? (
                  <Button glow onClick={handleSave}>
                    <Save className="h-4 w-4" />
                    Lưu ngay
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="hidden rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4 lg:block">
              <ProductVisual variant="balance" className="mb-4 min-h-[160px]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Snapshot hiện tại</p>

              <div className="mt-4 stack-tight">
                <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Điểm cân bằng chung</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    <CountUp value={averageScore} precision={1} />
                    <span className="text-muted-foreground">/10</span>
                  </p>
                </div>
                <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Mạnh nhất</p>
                  <p className="mt-2 text-xl font-bold text-foreground">{getLifeAreaLabel(strongestArea.name)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <CountUp value={strongestArea.score} />
                    <span>/10</span>
                  </p>
                </div>
                <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Nên ưu tiên</p>
                  <p className="mt-2 text-xl font-bold text-foreground">{getLifeAreaLabel(weakestArea.name)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <CountUp value={weakestArea.score} />
                    <span>/10</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasAnyScore ? (
        <InlineStatusMessage tone="warning">
          Bạn chưa chấm điểm — hãy chỉnh các thanh để bắt đầu
        </InlineStatusMessage>
      ) : null}

      <Reveal delay={0.02}>
        <Card data-testid="life-balance-next-step-card">
          <CardContent className="p-5 sm:p-7">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-center">
              <div data-testid="life-balance-signal-summary" className="stack-stack">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Tiếp theo trong luồng chính
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-[-0.014em] text-foreground sm:text-2xl">
                    Tín hiệu từ Cân bằng cuộc sống
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                    {balanceTone} Góc nhìn cuộc sống sẽ dùng tín hiệu này để nối sang mục tiêu SMART và kế hoạch 12 tuần.
                  </p>
                  {hasChanges && (
                    <p className="mt-2 text-sm font-medium text-[color:var(--color-warning-fg)]">
                      Bạn đang xem tín hiệu từ điểm mới chưa lưu. Khi đi tiếp, hệ thống sẽ lưu điểm này trước.
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div
                    data-testid="life-balance-signal-weakest"
                    className="rounded-[var(--r-control)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-warning-fg)]">
                      Ưu tiên
                    </p>
                    <p className="mt-2 text-lg font-bold text-foreground">{getLifeAreaLabel(weakestArea.name)}</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-warning-fg)]">{weakestArea.score}/10</p>
                  </div>
                  <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Trung bình
                    </p>
                    <p className="mt-2 text-lg font-bold text-foreground">{averageScore.toFixed(1)}/10</p>
                    <p className="mt-1 text-sm text-muted-foreground">mặt bằng hiện tại</p>
                  </div>
                  <div className="rounded-[var(--r-control)] border border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-success-fg)]">
                      Điểm tựa
                    </p>
                    <p className="mt-2 text-lg font-bold text-foreground">{getLifeAreaLabel(strongestArea.name)}</p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-success-fg)]">{strongestArea.score}/10</p>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none hidden justify-center lg:flex" aria-hidden="true">
                <LifeBalanceWheelIllustration className="w-44 text-[color:var(--tone-shell-primary)] opacity-70" />
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto">
                <Button glow className="w-full sm:w-auto" onClick={handleContinueToInsight}>
                  {hasChanges ? "Lưu và xem Góc nhìn cuộc sống" : "Mở Góc nhìn cuộc sống"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {hasChanges && (
                  <Button variant="outline" className="w-full sm:w-auto" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                    Chỉ lưu điểm
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Điểm trung bình",
              value: averageScore.toFixed(1),
              note: "mặt bằng hiện tại",
              icon: TrendingUp,
              tone: "primary" as const,
            },
            {
              title: "Điểm cao nhất",
              value: strongestArea.score,
              note: getLifeAreaLabel(strongestArea.name),
              icon: Sparkles,
              tone: "success" as const,
            },
            {
              title: "Điểm thấp nhất",
              value: weakestArea.score,
              note: getLifeAreaLabel(weakestArea.name),
              icon: Compass,
              tone: "warning" as const,
            },
            {
              title: "Lần đo đã lưu",
              value: userData.wheelOfLifeHistory.length,
              note: "mốc lịch sử hiện có",
              icon: Calendar,
              tone: "info" as const,
            },
          ].map((item) => {
            const Icon = item.icon;
            const iconBg = {
              primary: "bg-[color:var(--muted)] text-[color:var(--tone-shell-primary)]",
              success: "bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]",
              warning: "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]",
              info: "bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]",
            }[item.tone];

            return (
              <Card key={item.title}>
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <CardDescription>{item.title}</CardDescription>
                    <CardTitle className="mt-2 text-3xl tracking-[-0.014em]">
                      {typeof item.value === "number" ? (
                        <CountUp value={item.value} />
                      ) : (
                        <CountUp value={Number(item.value)} precision={1} />
                      )}
                    </CardTitle>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-[var(--r-control)] ${iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.note}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <Tabs defaultValue="current" className="stack-section">
          <TabsList>
            <TabsTrigger value="current">
              <TrendingUp className="h-4 w-4" />
              Cân bằng hiện tại
            </TabsTrigger>
            <TabsTrigger value="history" disabled={historicalData.length === 0}>
              <Calendar className="h-4 w-4" />
              Xu hướng lịch sử
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="stack-section">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
              <Card>
                <CardHeader>
                  <CardTitle>Bánh xe cuộc đời</CardTitle>
                  <CardDescription>
                    Một góc nhìn trực quan để thấy toàn bộ hệ thống cuộc sống của bạn đang cân bằng ra sao.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SimpleRadarChart className="mx-auto max-w-[540px]" data={radarData} height={420} />

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div
                      className="rounded-[var(--r-control)] border p-4"
                      style={{
                        borderColor: `${strongestArea.color}33`,
                        background: `${strongestArea.color}12`,
                      }}
                    >
                      <p
                        className="text-xs font-semibold uppercase tracking-[0.16em]"
                        style={{ color: strongestArea.color }}
                      >
                        Điểm mạnh hiện tại
                      </p>
                      <p className="mt-[var(--space-inline)] text-lg font-semibold text-slate-900">
                        {getLifeAreaLabel(strongestArea.name)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Đây là phần đang tạo lực đỡ tốt cho bạn ở thời điểm này.
                      </p>
                    </div>

                    <div
                      className="rounded-[var(--r-control)] border p-4"
                      style={{
                        borderColor: `${weakestArea.color}33`,
                        background: `${weakestArea.color}12`,
                      }}
                    >
                      <p
                        className="text-xs font-semibold uppercase tracking-[0.16em]"
                        style={{ color: weakestArea.color }}
                      >
                        Cần ưu tiên
                      </p>
                      <p className="mt-[var(--space-inline)] text-lg font-semibold text-slate-900">{getLifeAreaLabel(weakestArea.name)}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Chỉ cần cải thiện đúng điểm này, toàn bộ bánh xe sẽ cân hơn đáng kể.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="stack-section">
                <Card>
                  <CardHeader>
                    <CardTitle>Điều chỉnh điểm số</CardTitle>
                    <CardDescription>
                      Đánh giá lại từng khía cạnh từ 1 đến 10 theo cảm nhận trung thực nhất của bạn.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="stack-stack">
                    {lifeAreas.map((area, index) => {
                      const AreaIcon = getLifeAreaIcon(area.name);

                      return (
                        <div
                          key={area.name}
                          className="card-hover-lift rounded-[var(--r-control)] border border-[color:var(--border)] bg-card p-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <AreaIcon className="h-7 w-7 shrink-0" style={{ color: area.color }} />
                              <div
                                className="h-4 w-4 rounded-[var(--r-pill)] ring-4 ring-[color:var(--muted)]"
                                style={{ backgroundColor: area.color }}
                              />
                              <div>
                                <p className="font-semibold text-foreground">{getLifeAreaLabel(area.name)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {area.score <= 4
                                    ? "Đang cần thêm sự chăm sóc."
                                    : area.score <= 7
                                      ? "Có nền nhưng vẫn còn dư địa cải thiện."
                                      : "Đây đang là một khu vực ổn định."}
                                </p>
                              </div>
                            </div>
                            <span className="text-2xl font-bold" style={{ color: area.color }}>
                              {area.score}
                            </span>
                          </div>

                          <div className="mt-4 stack-tight">
                            <Slider
                              value={[area.score]}
                              onValueChange={(value) => handleScoreChange(index, value)}
                              min={1}
                              max={10}
                              step={1}
                              className="w-full"
                              trackColor={area.color}
                              aria-label={`Điểm ${getLifeAreaLabel(area.name)}`}
                            />
                            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                              <span>Cần chú ý</span>
                              <span>Xuất sắc</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {hasChanges && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Bạn có thay đổi chưa lưu</h3>
                          <p className="text-sm text-muted-foreground">
                            Lưu lại để cập nhật bánh xe hiện tại và thêm một mốc vào lịch sử theo dõi.
                          </p>
                        </div>
                        <Button glow onClick={handleSave}>
                          <Save className="h-4 w-4" />
                          Lưu thay đổi
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Cân bằng theo thời gian</CardTitle>
                <CardDescription>
                  Theo dõi cách từng khía cạnh phát triển qua các lần đánh giá gần đây nhất.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historicalData.length > 0 ? (
                  <Suspense
                    fallback={
                      <EmptyState
                        variant="dashed"
                        icon={<Calendar className="h-6 w-6" />}
                        title="Đang mở biểu đồ lịch sử..."
                        description="Dữ liệu xu hướng sẽ hiện ra ngay sau khi tải xong."
                      />
                    }
                  >
                    <LifeBalanceHistoryChart data={historicalData} />
                  </Suspense>
                ) : (
                  <EmptyState
                    variant="dashed"
                    icon={<Calendar className="h-6 w-6" />}
                    title="Chưa có dữ liệu lịch sử."
                    description="Hãy lưu một vài lần cập nhật để bắt đầu thấy xu hướng."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Reveal>
    </div>
  );
}
