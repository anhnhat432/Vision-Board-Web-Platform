import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker } from "react-router";
import { AlertTriangle, ArrowRight, Compass, Save } from "lucide-react";
import { toast } from "sonner";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
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
import type { LifeBalanceHistoryChartPoint } from "../components/LifeBalanceHistoryChart";
import { CountUp } from "../components/ui/count-up";
import { getLifeAreaIcon } from "../components/illustrations";
import { PageShell } from "../components/PageShell";
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
  let timer: number | null = null;
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

  if (!userData || !hasLifeBalanceData) {
    return (
      <PageShell maxWidth="xl">
        <div ref={pageTopRef} className="pb-12">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
              Bánh xe cuộc sống
            </p>
            <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-app-ink">
              Bức tranh hiện tại của bạn
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-app-ink-soft">
              Nhìn 8 lĩnh vực để biết bạn đang mạnh ở đâu, mỏng ở đâu.
            </p>
          </header>

          <section className="mt-8 surface-empty rounded-2xl border border-dashed border-app-line bg-app-bg/50 p-8 text-center">
            <Compass className="mx-auto h-12 w-12 text-app-accent" aria-hidden="true" />
            <h2 className="mt-4 font-serif text-2xl font-medium text-app-ink">Chưa có dữ liệu bánh xe</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-app-ink-soft">
              Bắt đầu bằng cách chấm điểm 8 lĩnh vực để xem bức tranh.
            </p>
            <Link
              to="/onboarding"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-app-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-app-accent"
            >
              Bắt đầu chấm điểm
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </PageShell>
    );
  }

  if (!strongestArea || !weakestArea) return null;

  const formattedLastSaved = lastSavedAt
    ? lastSavedAt.toLocaleString("vi-VN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;
  const historyCount = userData.wheelOfLifeHistory.length;

  return (
    <PageShell maxWidth="xl">
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent className="surface-elevated rounded-2xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]">
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-warm-soft text-app-warm">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="font-serif text-app-ink">Bạn có thay đổi chưa lưu</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-app-ink-soft">
              Nếu rời khỏi trang này, hệ thống sẽ cố lưu điểm vừa chỉnh trước khi đóng trang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col sm:items-stretch sm:justify-start">
            <AlertDialogAction
              onClick={() => {
                saveLifeBalance();
                toast.success("Đã lưu trước khi rời trang.");
                blocker.proceed?.();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent"
            >
              <Save className="h-4 w-4" />
              Lưu rồi rời trang
            </AlertDialogAction>
            <button
              type="button"
              onClick={() => blocker.proceed?.()}
              className="rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm text-app-ink hover:bg-app-bg"
            >
              Rời trang
            </button>
            <AlertDialogCancel
              onClick={() => blocker.reset?.()}
              className="rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm text-app-ink hover:bg-app-bg"
            >
              Ở lại trang này
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div ref={pageTopRef} className="pb-12">
        <header className="page-enter">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Bánh xe cuộc sống</p>
          <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-app-ink">
            Bức tranh hiện tại của bạn
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-app-ink-soft">
            Nhìn 8 lĩnh vực để biết bạn đang mạnh ở đâu, mỏng ở đâu.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {formattedLastSaved ? (
              <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg px-3 py-1 text-xs text-app-ink-soft">
                Cập nhật lần cuối: {formattedLastSaved}
              </span>
            ) : null}
            {historyCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-app-accent-soft px-3 py-1 text-xs text-app-accent">
                {historyCount} lần ghi nhận
              </span>
            ) : null}
            <AutoSaveIndicator status={autoSaveStatus} lastSavedAt={lastSavedAt} variant="prominent" />
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:border-app-accent/30">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Trung bình</p>
            <p className="mt-3 font-serif text-4xl font-medium leading-none tabular-nums text-app-ink">
              <CountUp value={averageScore} precision={1} />
              <span className="ml-1 text-lg font-medium text-app-ink-muted">/10</span>
            </p>
          </article>
          <article className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:border-app-accent/30">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
              Lĩnh vực mạnh nhất
            </p>
            <p className="mt-3 font-serif text-4xl font-medium leading-none tabular-nums text-app-ink">
              <CountUp value={strongestArea.score} />
              <span className="ml-1 text-lg font-medium text-app-ink-muted">/10</span>
            </p>
            <p className="mt-1.5 text-xs font-medium text-app-ink-soft">{getLifeAreaLabel(strongestArea.name)}</p>
          </article>
          <article className="surface-raised rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.03] to-transparent p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:border-amber-500/50">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
              Lĩnh vực cần ưu tiên
            </p>
            <p className="mt-3 font-serif text-4xl font-medium leading-none tabular-nums text-app-ink">
              <CountUp value={weakestArea.score} />
              <span className="ml-1 text-lg font-medium text-app-ink-muted">/10</span>
            </p>
            <p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">{getLifeAreaLabel(weakestArea.name)}</p>
          </article>
        </div>

        <Tabs defaultValue="current" className="mt-8">
          <TabsList>
            <TabsTrigger value="current">Hiện tại</TabsTrigger>
            <TabsTrigger value="history" disabled={historicalData.length === 0}>
              Lịch sử
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6">
                <header>
                  <h2 className="text-base font-semibold text-app-ink">Bánh xe cuộc đời</h2>
                  <p className="text-xs text-app-ink-muted">8 lĩnh vực hiện tại</p>
                </header>
                <div className="mt-4">
                  <SimpleRadarChart className="mx-auto max-w-[600px]" data={radarData} height={460} />
                </div>
                <div className="mt-3 text-right">
                  <Link to="/onboarding" className="text-sm text-app-accent hover:underline">
                    Chấm lại điểm →
                  </Link>
                </div>
              </section>

              <section className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6">
                <header>
                  <h2 className="text-base font-semibold text-app-ink">Cập nhật điểm</h2>
                  <p className="text-xs text-app-ink-muted">Kéo thanh để chấm lại</p>
                </header>
                <ul className="mt-5">
                  {lifeAreas.map((area, index) => {
                    const AreaIcon = getLifeAreaIcon(area.name);

                    return (
                      <li key={area.name} className="group border-b border-app-line py-3.5 last:border-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6.5 w-6.5 items-center justify-center rounded bg-app-accent-soft text-app-accent transition-colors duration-250 group-hover:bg-app-accent group-hover:text-white">
                              <AreaIcon className="h-4 w-4" />
                            </span>
                            <span className="text-sm font-medium text-app-ink">{getLifeAreaLabel(area.name)}</span>
                          </div>
                          <span className="font-serif text-xl font-medium tabular-nums text-app-ink">
                            {area.score}
                          </span>
                        </div>
                        <Slider
                          className="mt-2.5"
                          value={[area.score]}
                          onValueChange={(value) => handleScoreChange(index, value)}
                          min={1}
                          max={10}
                          step={1}
                          aria-label={`Điểm ${getLifeAreaLabel(area.name)}`}
                        />
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className={
                      hasChanges
                        ? "inline-flex items-center gap-2 rounded-lg bg-app-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:brightness-105 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                        : "inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-app-ink-muted/50 px-5 py-2.5 text-sm font-medium text-app-ink-muted opacity-60"
                    }
                  >
                    <Save className="h-4 w-4" />
                    Lưu thay đổi
                  </button>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <section className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6">
              <header>
                <h2 className="text-base font-semibold text-app-ink">Diễn biến 6 đợt gần nhất</h2>
                <p className="text-xs text-app-ink-muted">Mỗi đường là một lĩnh vực; trục đứng là điểm 0–10.</p>
              </header>
              <div className="mt-4">
                {historicalData.length > 0 ? (
                  <Suspense
                    fallback={
                      <div className="rounded-card border border-dashed border-app-line p-8 text-center text-sm text-app-ink-muted">
                        Đang mở biểu đồ lịch sử...
                      </div>
                    }
                  >
                    <LifeBalanceHistoryChart data={historicalData} />
                  </Suspense>
                ) : (
                  <div className="rounded-card border border-dashed border-app-line p-8 text-center">
                    <p className="text-sm text-app-ink-soft">Chưa có lịch sử. Hãy lưu thay đổi để xem diễn biến.</p>
                  </div>
                )}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
