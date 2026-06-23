import { AlertTriangle, ArrowRight, Compass, Save, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { getLifeAreaIcon } from "../components/illustrations";
import type { LifeBalanceHistoryChartPoint } from "../components/LifeBalanceHistoryChart";
import { PageShell } from "../components/PageShell";
import { ScreenGuide } from "../components/ScreenGuide";
import { SCREEN_GUIDES } from "../components/screen-guides";
import { SimpleRadarChart } from "../components/SimpleRadarChart";
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
import { CountUp } from "../components/ui/count-up";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { cn } from "../components/ui/utils";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { trackAnalyticsEvent } from "../utils/analytics";
import { loadWithChunkReload } from "../utils/chunkLoad";
import { getAreaColorConfig } from "../utils/life-area-theme";
import { getFocusInsight } from "../utils/life-balance-insight";
import { getSmartGoalStarter } from "../utils/smart-goal-starters";
import { APP_STORAGE_KEYS, getLifeAreaLabel, type LifeArea, updateWheelOfLife } from "../utils/storage";

const LifeBalanceHistoryChart = lazy(() =>
  loadWithChunkReload(async () => ({
    default: (await import("../components/LifeBalanceHistoryChart")).LifeBalanceHistoryChart,
  })),
);

const LIFE_AREA_DETAILS: Record<string, string> = {
  Career: "Việc học, công việc, hướng đi nghề nghiệp và cảm giác tiến triển.",
  Finance: "Thu nhập, chi tiêu, tiết kiệm và mức an tâm với tiền bạc.",
  Health: "Năng lượng, giấc ngủ, vận động và cách bạn chăm cơ thể.",
  Education: "Việc học thêm, kỹ năng mới và khả năng duy trì nhịp phát triển.",
  Relationships: "Bạn bè, người yêu, cộng đồng và chất lượng kết nối gần đây.",
  Family: "Sự hiện diện, hỗ trợ và cảm giác bình yên trong gia đình.",
  "Personal Growth": "Tự hiểu mình, thói quen cá nhân và khả năng giữ lời với bản thân.",
  Leisure: "Nghỉ ngơi, vui chơi, sở thích và khoảng trống để hồi phục.",
};

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [isCheckInMode, setIsCheckInMode] = useState(false);
  const [initialScores, setInitialScores] = useState<Record<string, number>>({});
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"current" | "focus" | "history">(() => {
    if (tabParam === "focus" || tabParam === "history") {
      return tabParam;
    }
    return "current";
  });
  const [selectedFocusAreaName, setSelectedFocusAreaName] = useState<string | null>(null);

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

  const focusArea = useMemo(() => {
    if (lifeAreas.length === 0) return null;
    if (selectedFocusAreaName) {
      return lifeAreas.find((a) => a.name === selectedFocusAreaName) ?? weakestArea;
    }
    return weakestArea;
  }, [lifeAreas, selectedFocusAreaName, weakestArea]);

  const focusSmartGoalStarter = useMemo(() => (focusArea ? getSmartGoalStarter(focusArea.name) : null), [focusArea]);

  const changedAreaCount = useMemo(() => {
    if (!isCheckInMode) return 0;
    return lifeAreas.filter((area) => area.score !== (initialScores[area.name] ?? area.score)).length;
  }, [isCheckInMode, lifeAreas, initialScores]);

  useEffect(() => {
    const nextTab = tabParam === "focus" || tabParam === "history" ? tabParam : "current";
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [tabParam]);

  const historicalData = useMemo<LifeBalanceHistoryChartPoint[]>(() => {
    if (!userData) return [];
    return userData.wheelOfLifeHistory.slice(-6).map((record) => {
      const dateObj = new Date(record.date);
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      const dataPoint: LifeBalanceHistoryChartPoint = {
        date: `${day}/${month}/${year}`,
      };

      record.areas.forEach((area) => {
        dataPoint[getLifeAreaLabel(area.name)] = area.score;
      });

      return dataPoint;
    });
  }, [userData]);

  const formattedLastSaved = useMemo(() => {
    const lastHistoryRecord =
      userData?.wheelOfLifeHistory && userData.wheelOfLifeHistory.length > 0
        ? userData.wheelOfLifeHistory[userData.wheelOfLifeHistory.length - 1]
        : null;
    const dateToFormat = lastSavedAt || (lastHistoryRecord ? new Date(lastHistoryRecord.date) : null);
    if (!dateToFormat) return null;
    const day = String(dateToFormat.getDate()).padStart(2, "0");
    const month = String(dateToFormat.getMonth() + 1).padStart(2, "0");
    const year = dateToFormat.getFullYear();
    const hours = String(dateToFormat.getHours()).padStart(2, "0");
    const minutes = String(dateToFormat.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} lúc ${hours}:${minutes}`;
  }, [lastSavedAt, userData?.wheelOfLifeHistory]);

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

  const handleStartCheckIn = () => {
    const scores: Record<string, number> = {};
    lifeAreas.forEach((area) => {
      scores[area.name] = area.score;
    });
    setInitialScores(scores);
    setIsCheckInMode(true);
  };

  const handleCancelCheckIn = () => {
    const restored = lifeAreas.map((area) => ({
      ...area,
      score: initialScores[area.name] ?? area.score,
    }));
    setLifeAreas(restored);
    setIsCheckInMode(false);
  };

  const handleFinishCheckIn = () => {
    handleSave();
    setIsCheckInMode(false);
    handleTabChange("focus");
  };

  const handleTabChange = useCallback(
    (value: string) => {
      const nextTab = value === "focus" || value === "history" ? value : "current";
      setActiveTab(nextTab);

      const nextParams = new URLSearchParams(searchParams);
      if (nextTab === "current") {
        nextParams.delete("tab");
      } else {
        nextParams.set("tab", nextTab);
      }

      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleContinueToGoalSetup = () => {
    if (!focusArea) return;
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, focusArea.name);
    navigate("/smart-goal-setup");
  };

  if (!userData || !hasLifeBalanceData) {
    return (
      <PageShell maxWidth="xl">
        <div ref={pageTopRef} className="pb-12">
          <ScreenGuide {...SCREEN_GUIDES.lifeBalance} autoOpen />
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Bánh xe cuộc sống</p>
            <h1 className="mt-3 font-[family-name:var(--app-font-serif)] text-4xl font-extrabold leading-tight tracking-tight text-app-ink">
              Bức tranh hiện tại của bạn
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-app-ink-soft">
              Nhìn 8 lĩnh vực để biết bạn đang mạnh ở đâu, mỏng ở đâu.
            </p>
          </header>

          <section className="mt-8 surface-empty rounded-2xl border border-dashed border-app-line bg-app-bg/50 p-8 text-center">
            <Compass className="mx-auto h-12 w-12 text-app-accent" aria-hidden="true" />
            <h2 className="mt-4 font-[family-name:var(--app-font-serif)] text-2xl font-bold text-app-ink">
              Chưa có dữ liệu bánh xe
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-app-ink-soft">
              Bắt đầu bằng cách chấm điểm 8 lĩnh vực để xem bức tranh.
            </p>
            <Link
              to="/onboarding"
              className="mt-6 inline-flex items-center gap-2 rounded-card bg-app-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-app-accent-hover"
            >
              Bắt đầu chấm điểm
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </div>
      </PageShell>
    );
  }

  if (!strongestArea || !weakestArea) return null;
  const historyCount = userData.wheelOfLifeHistory.length;
  const avgPercent = Math.round((averageScore / 10) * 100);

  return (
    <PageShell maxWidth="xl">
      <ScreenGuide {...SCREEN_GUIDES.lifeBalance} autoOpen />
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent className="surface-elevated rounded-2xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]">
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-status-warning/15 text-app-status-warning">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="font-[family-name:var(--app-font-serif)] text-app-ink">
              Bạn có thay đổi chưa lưu
            </AlertDialogTitle>
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
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Lưu rồi rời trang
            </AlertDialogAction>
            <button
              type="button"
              onClick={() => blocker.proceed?.()}
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-app-line bg-app-surface px-4 py-2 text-sm text-app-ink hover:bg-app-bg-subtle"
            >
              Rời trang
            </button>
            <AlertDialogCancel
              onClick={() => blocker.reset?.()}
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-app-line bg-app-surface px-4 py-2 text-sm text-app-ink hover:bg-app-bg-subtle"
            >
              Ở lại trang này
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div ref={pageTopRef} className="pb-10 sm:pb-12">
        {/* HERO */}
        <header className="page-enter max-w-3xl">
          <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0C5E3A]" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0C5E3A]">Bánh xe cuộc sống</p>
          </div>
          <h1 className="mb-2.5 font-[family-name:var(--app-font-serif)] text-[clamp(28px,3.2vw,38px)] font-extrabold leading-[1.06] text-app-ink sm:mb-3 sm:leading-[1.02]">
            Bức tranh hiện tại của bạn
          </h1>
          <p className="mb-3.5 max-w-[54ch] text-[13px] leading-[1.55] text-app-ink-soft sm:mb-4 sm:text-sm">
            Nhìn 8 lĩnh vực để biết bạn đang mạnh ở đâu, mỏng ở đâu.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {formattedLastSaved ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-white dark:bg-app-surface px-3 py-1.5 text-xs font-medium text-app-ink-soft">
                <svg
                  aria-hidden="true"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                Cập nhật lần cuối: <span className="font-mono text-app-ink">{formattedLastSaved}</span>
              </span>
            ) : null}
            {historyCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF7E0] dark:bg-[#1A2216] border border-[rgba(12,94,58,0.18)] dark:border-[rgba(91,165,144,0.25)] px-3 py-1.5 text-xs font-semibold text-[#0C5E3A] dark:text-[#5BA590]">
                <span className="font-mono">{historyCount}</span> lần ghi nhận
              </span>
            ) : null}
            <AutoSaveIndicator
              status={hasChanges ? autoSaveStatus : "saved"}
              lastSavedAt={lastSavedAt}
              variant="prominent"
              className="bg-white dark:bg-app-surface"
            />
          </div>
        </header>

        {/* KPI ROW */}
        <section data-life-balance-kpi-grid className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-4">
          <div className="min-w-0 overflow-hidden rounded-[16px] border border-app-line bg-white p-3 dark:bg-app-surface sm:rounded-[18px] sm:p-5 md:p-6">
            <p className="mb-2 text-[8.5px] font-bold uppercase leading-[1.35] tracking-[0.12em] text-app-ink-muted sm:mb-3.5 sm:text-[10px]">
              Trung bình
            </p>
            <p className="font-[family-name:var(--app-font-serif)] text-[25px] font-extrabold leading-none text-app-ink sm:text-[38px]">
              <CountUp value={averageScore} precision={1} />
              <span className="ml-0.5 text-xs font-bold text-app-ink-muted sm:ml-1 sm:text-lg">/10</span>
            </p>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-app-bg sm:mt-3.5 sm:h-[7px]">
              <div
                className="h-full rounded-full bg-[#0C5E3A] transition-all duration-700 ease-out"
                style={{ width: `${avgPercent}%` }}
              />
            </div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-[16px] border border-app-line bg-white p-3 dark:bg-app-surface sm:rounded-[18px] sm:p-5 md:p-6">
            <p className="mb-2 text-[8.5px] font-bold uppercase leading-[1.35] tracking-[0.12em] text-app-ink-muted sm:mb-3.5 sm:text-[10px]">
              <span className="sm:hidden">Mạnh nhất</span>
              <span className="hidden sm:inline">Lĩnh vực mạnh nhất</span>
            </p>
            <p className="font-[family-name:var(--app-font-serif)] text-[25px] font-extrabold leading-none text-app-ink sm:text-[38px]">
              <CountUp value={strongestArea.score} />
              <span className="ml-0.5 text-xs font-bold text-app-ink-muted sm:ml-1 sm:text-lg">/10</span>
            </p>
            <p className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold leading-snug text-[#0C5E3A] sm:mt-3.5 sm:text-[13px]">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: getAreaColorConfig(strongestArea.name).accent }}
              />
              <span className="truncate">{getLifeAreaLabel(strongestArea.name)}</span>
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-[16px] border border-[rgba(176,103,60,0.22)] bg-[#F4ECDD] p-3 dark:border-app-line dark:bg-app-bg-subtle sm:rounded-[18px] sm:p-5 md:p-6">
            <p className="mb-2 text-[8.5px] font-bold uppercase leading-[1.35] tracking-[0.12em] text-[#A07A4A] sm:mb-3.5 sm:text-[10px]">
              <span className="sm:hidden">Ưu tiên</span>
              <span className="hidden sm:inline">Lĩnh vực cần ưu tiên</span>
            </p>
            <p className="font-[family-name:var(--app-font-serif)] text-[25px] font-extrabold leading-none text-[#8A5A2B] sm:text-[38px]">
              <CountUp value={weakestArea.score} />
              <span className="ml-0.5 text-xs font-bold text-[#B79B72] sm:ml-1 sm:text-lg">/10</span>
            </p>
            <p className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold leading-snug text-[#8A5A2B] sm:mt-3.5 sm:text-[13px]">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: getAreaColorConfig(weakestArea.name).accent }}
              />
              <span className="truncate">{getLifeAreaLabel(weakestArea.name)}</span>
            </p>
          </div>
        </section>

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-5 sm:mt-6">
          <TabsList
            data-life-balance-tabs-list
            className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-app-line bg-white p-1 dark:bg-app-surface sm:inline-grid sm:w-auto sm:p-1.5"
          >
            <TabsTrigger
              value="current"
              className="min-h-11 rounded-xl px-3 py-2 text-[13px] font-semibold data-[state=active]:bg-app-bg data-[state=active]:text-app-ink data-[state=active]:shadow-none sm:px-4 sm:text-[13.5px]"
            >
              Hiện tại
            </TabsTrigger>
            <TabsTrigger
              value="focus"
              className="min-h-11 rounded-xl px-3 py-2 text-[13px] font-semibold data-[state=active]:bg-app-bg data-[state=active]:text-app-ink data-[state=active]:shadow-none sm:px-4 sm:text-[13.5px]"
            >
              <Target className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Trọng tâm
            </TabsTrigger>
            <TabsTrigger
              value="history"
              disabled={historicalData.length === 0}
              className="min-h-11 rounded-xl px-3 py-2 text-[13px] font-semibold data-[state=active]:bg-app-bg data-[state=active]:text-app-ink data-[state=active]:shadow-none sm:px-4 sm:text-[13.5px]"
            >
              Lịch sử
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4 sm:mt-5">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_400px] lg:gap-5">
              {/* LEFT COLUMN */}
              <div className="min-w-0 space-y-4 lg:space-y-5">
                {/* Radar chart card */}
                <section className="rounded-[20px] border border-app-line bg-white p-4 dark:bg-app-surface md:p-6">
                  <header className="mb-2.5 sm:mb-3">
                    <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-app-ink">
                      Bản đồ Cân bằng cuộc sống
                    </h2>
                    <p className="text-xs text-app-ink-muted mt-0.5">Trạng thái hiện tại của 8 khía cạnh cốt lõi</p>
                  </header>
                  <div className="flex min-h-[230px] justify-center overflow-hidden sm:min-h-[280px]">
                    <SimpleRadarChart data={radarData} />
                  </div>
                </section>

                {/* Priority insight card */}
                <section className="relative overflow-hidden rounded-[20px] border border-[rgba(176,103,60,0.2)] bg-[#F4ECDD] p-4 dark:border-app-line dark:bg-app-bg-subtle md:p-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(176,103,60,0.06)] rounded-full blur-3xl pointer-events-none" />
                  <header className="mb-3.5 flex items-start gap-3 sm:mb-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(176,103,60,0.22)] bg-white text-[#B0673C] dark:bg-app-surface sm:h-10 sm:w-10">
                      <Target className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8A5A2B]">
                        Trọng tâm hành động đề xuất
                      </h2>
                      <p className="text-xs text-[#A07A4A] mt-0.5">Tìm ra điểm nghẽn cuộc sống</p>
                    </div>
                  </header>
                  <p className="text-[13.5px] text-app-ink-soft mb-3 flex items-center gap-2 flex-wrap">
                    Khía cạnh cần ưu tiên cải thiện:{" "}
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border"
                      style={{
                        color: getAreaColorConfig(weakestArea.name).accent,
                        backgroundColor: `color-mix(in oklab, ${getAreaColorConfig(weakestArea.name).accent} 10%, var(--app-bg))`,
                        borderColor: `color-mix(in oklab, ${getAreaColorConfig(weakestArea.name).accent} 25%, transparent)`,
                      }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: getAreaColorConfig(weakestArea.name).accent }}
                      />
                      {getLifeAreaLabel(weakestArea.name)} ({weakestArea.score}đ)
                    </span>
                  </p>
                  <p className="text-[13px] leading-relaxed text-app-ink-muted mb-4">
                    {getFocusInsight(weakestArea, lifeAreas, getLifeAreaLabel(weakestArea.name)).reason}
                  </p>
                  <div className="flex items-start gap-3 bg-white dark:bg-app-surface border border-[rgba(12,94,58,0.16)] rounded-[13px] p-3.5">
                    <Sparkles className="h-4.5 w-4.5 shrink-0 text-[#0C5E3A] mt-0.5" aria-hidden="true" />
                    <p className="max-w-[68ch] break-words text-xs leading-relaxed text-[#3F4A3F]">
                      <strong className="text-[#0C5E3A]">Hành động đề xuất:</strong>{" "}
                      {getFocusInsight(weakestArea, lifeAreas, getLifeAreaLabel(weakestArea.name)).tip}
                    </p>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN */}
              <div className="min-w-0 space-y-4 lg:space-y-5">
                {!isCheckInMode ? (
                  <>
                    {/* Check-in banner */}
                    <section className="rounded-[20px] border border-[rgba(12,94,58,0.18)] bg-[#EDF5EA] p-4 dark:border-[rgba(91,165,144,0.25)] dark:bg-[#1A2218] md:p-6">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0C5E3A] mb-3">
                        Check-in cân bằng
                      </p>
                      <div className="flex items-center gap-2.5 mb-3">
                        <Compass className="h-5 w-5 shrink-0 text-[#0C5E3A]" aria-hidden="true" />
                        <h3 className="font-[family-name:var(--app-font-serif)] text-lg font-bold text-app-ink tracking-[-0.01em]">
                          Cập nhật Bánh xe cuộc sống hằng tuần
                        </h3>
                      </div>
                      <p className="text-[13px] leading-relaxed text-[#5C6B58] mb-4">
                        Dành 1 phút phản tư nhanh và chấm điểm lại 8 khía cạnh để luôn làm chủ nhịp điệu cuộc sống.
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleStartCheckIn}
                        className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-[13px] bg-[#0C5E3A] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_26px_-14px_rgba(12,94,58,0.75)] transition-colors hover:bg-[#0a4f30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                      >
                        Bắt đầu Check-in nhanh
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </motion.button>
                    </section>

                    {/* Area scores (static) */}
                    <section className="rounded-[20px] border border-app-line bg-white p-4 dark:bg-app-surface md:p-6">
                      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-app-ink mb-4">
                        Điểm số hiện tại của 8 lĩnh vực
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {lifeAreas.map((area) => {
                          const AreaIcon = getLifeAreaIcon(area.name);
                          const colorConfig = getAreaColorConfig(area.name);
                          const label = getLifeAreaLabel(area.name);

                          return (
                            <div
                              key={area.name}
                              className="flex min-w-0 items-center gap-2.5 rounded-[13px] border p-2.5"
                              style={{
                                backgroundColor: `color-mix(in oklab, ${colorConfig.accent} 14%, var(--app-bg))`,
                                borderColor: `color-mix(in oklab, ${colorConfig.accent} 25%, transparent)`,
                              }}
                            >
                              <span
                                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-white"
                                style={{ backgroundColor: colorConfig.accent }}
                              >
                                <AreaIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1 break-words text-xs font-semibold leading-tight text-app-ink">
                                {label}
                              </span>
                              <span
                                className="shrink-0 font-[family-name:var(--app-font-serif)] text-base font-extrabold"
                                style={{ color: colorConfig.accent }}
                              >
                                {area.score}đ
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end mt-4 pt-3 border-t border-app-line/50">
                        <Link
                          to="/onboarding"
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 py-2 text-xs font-bold text-[#0C5E3A] hover:text-[#0a4f30] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                        >
                          Làm lại khảo sát toàn diện
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </section>
                  </>
                ) : (
                  /* CHECK-IN EDIT MODE */
                  <section className="rounded-[20px] border border-[rgba(12,94,58,0.18)] bg-white p-4 shadow-md dark:bg-app-surface md:p-6">
                    <header className="mb-1 border-b border-app-line/60 pb-3.5 sm:pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0C5E3A]">
                          Đang Check-in
                        </h3>
                        <span className="text-[10px] font-bold text-app-ink-muted font-mono">
                          {changedAreaCount}/{lifeAreas.length} mục đã cập nhật
                        </span>
                      </div>
                      <div className="w-full bg-app-line rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#0C5E3A] h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round((changedAreaCount / lifeAreas.length) * 100)}%` }}
                        />
                      </div>
                    </header>

                    <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
                      {lifeAreas.map((area, index) => {
                        const AreaIcon = getLifeAreaIcon(area.name);
                        const colorConfig = getAreaColorConfig(area.name);
                        const label = getLifeAreaLabel(area.name);
                        const isChanged = area.score !== (initialScores[area.name] ?? area.score);

                        return (
                          <div
                            key={area.name}
                            className="space-y-3 rounded-xl border p-3.5 transition-all sm:p-4"
                            style={{
                              borderColor: isChanged
                                ? `color-mix(in oklab, ${colorConfig.accent} 40%, transparent)`
                                : "var(--app-line)",
                              backgroundColor: isChanged
                                ? `color-mix(in oklab, ${colorConfig.accent} 14%, var(--app-bg))`
                                : "var(--app-bg)",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-2.5">
                                <span
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                  style={{ backgroundColor: colorConfig.accent }}
                                >
                                  <AreaIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                  <h4 className="break-words text-xs font-bold text-app-ink">{label}</h4>
                                  <p className="mt-0.5 max-w-[58ch] break-words text-[10px] font-medium leading-normal text-app-ink-muted">
                                    {LIFE_AREA_DETAILS[area.name]}
                                  </p>
                                </div>
                              </div>
                              <div
                                className="flex shrink-0 items-baseline gap-1 rounded-lg border px-2.5 py-1 text-sm"
                                style={{
                                  borderColor: `color-mix(in oklab, ${colorConfig.accent} 25%, transparent)`,
                                  backgroundColor: `color-mix(in oklab, ${colorConfig.accent} 16%, var(--app-bg))`,
                                }}
                              >
                                <span
                                  className="font-[family-name:var(--app-font-serif)] text-lg font-extrabold"
                                  style={{ color: colorConfig.accent }}
                                >
                                  {area.score}
                                </span>
                                <span className="text-[10px] font-bold text-app-ink-muted">/10</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                className="flex h-11 w-11 shrink-0 cursor-pointer select-none items-center justify-center rounded-full border border-app-line bg-white text-lg font-bold text-app-ink transition-all hover:bg-app-bg active:scale-95 dark:bg-app-surface"
                                onClick={() => handleScoreChange(index, [Math.max(1, area.score - 1)])}
                                aria-label={`Giảm ${label}`}
                              >
                                −
                              </motion.button>

                              <div className="grow px-1">
                                <Slider
                                  value={[area.score]}
                                  onValueChange={(value) => handleScoreChange(index, value)}
                                  min={1}
                                  max={10}
                                  step={1}
                                  trackColor={colorConfig.accent}
                                  className="w-full cursor-pointer"
                                  aria-label={`Điểm ${label}`}
                                />
                              </div>

                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                className="flex h-11 w-11 shrink-0 cursor-pointer select-none items-center justify-center rounded-full border border-app-line bg-white text-lg font-bold text-app-ink transition-all hover:bg-app-bg active:scale-95 dark:bg-app-surface"
                                onClick={() => handleScoreChange(index, [Math.min(10, area.score + 1)])}
                                aria-label={`Tăng ${label}`}
                              >
                                +
                              </motion.button>
                            </div>

                            <div className="grid grid-cols-2 gap-1 px-1 text-[9px] font-bold uppercase leading-tight tracking-wider text-app-ink-muted sm:grid-cols-5">
                              <span
                                className={cn(
                                  "break-words rounded-full px-1.5 py-0.5 transition-colors",
                                  area.score <= 2 && "bg-[#0C5E3A]/15 text-[#0C5E3A]",
                                )}
                              >
                                1–2 Rất chật vật
                              </span>
                              <span
                                className={cn(
                                  "break-words rounded-full px-1.5 py-0.5 transition-colors",
                                  area.score >= 3 && area.score <= 4 && "bg-[#0C5E3A]/15 text-[#0C5E3A]",
                                )}
                              >
                                3–4 Thiếu ổn định
                              </span>
                              <span
                                className={cn(
                                  "break-words rounded-full px-1.5 py-0.5 transition-colors",
                                  area.score >= 5 && area.score <= 6 && "bg-[#0C5E3A]/15 text-[#0C5E3A]",
                                )}
                              >
                                5–6 Tạm ổn
                              </span>
                              <span
                                className={cn(
                                  "break-words rounded-full px-1.5 py-0.5 transition-colors",
                                  area.score >= 7 && area.score <= 8 && "bg-[#0C5E3A]/15 text-[#0C5E3A]",
                                )}
                              >
                                7–8 Khá tốt
                              </span>
                              <span
                                className={cn(
                                  "break-words rounded-full px-1.5 py-0.5 transition-colors",
                                  area.score >= 9 && "bg-[#0C5E3A]/15 text-[#0C5E3A]",
                                )}
                              >
                                9–10 Rất tốt
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <footer className="mt-5 flex flex-col-reverse gap-2.5 border-t border-app-line/60 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                      <motion.button
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        type="button"
                        onClick={handleCancelCheckIn}
                        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full border border-app-line bg-white px-5 py-2.5 text-xs font-semibold text-app-ink-soft transition-colors hover:bg-app-bg hover:text-app-ink dark:bg-app-surface sm:w-auto"
                      >
                        Hủy bỏ
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        type="button"
                        onClick={handleFinishCheckIn}
                        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#0C5E3A] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#0a4f30] sm:w-auto"
                      >
                        Lưu & Xem kết quả
                        <Save className="h-4 w-4" aria-hidden="true" />
                      </motion.button>
                    </footer>
                  </section>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4 sm:mt-5">
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

          <TabsContent value="focus" className="mt-4 sm:mt-5">
            {focusArea && focusSmartGoalStarter ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5">
                <div className="space-y-4 lg:space-y-5">
                  <section className="surface-raised rounded-2xl border border-app-status-success/20 bg-app-status-success/5 p-4 sm:p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-app-ink">
                      <Target className="h-4 w-4 shrink-0 text-app-status-success" aria-hidden="true" />
                      {focusArea.name === weakestArea?.name ? "Đề xuất trọng tâm" : "Trọng tâm bạn chọn"}
                    </h3>
                    <p className="mt-2 text-xs text-app-ink-soft leading-relaxed">
                      {getFocusInsight(focusArea, lifeAreas, getLifeAreaLabel(focusArea.name)).headline}
                    </p>
                    <p className="mt-2 text-xs text-app-ink-muted leading-relaxed">
                      {getFocusInsight(focusArea, lifeAreas, getLifeAreaLabel(focusArea.name)).reason}
                    </p>
                  </section>

                  <section className="surface-raised rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5">
                    <header className="pb-3 border-b border-app-line/60">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-app-ink">
                        Hoặc tự chọn lĩnh vực khác
                      </h3>
                      <p className="mt-1 text-xs text-app-ink-muted">Nhấp vào lĩnh vực bạn muốn đặt mục tiêu</p>
                    </header>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                      {lifeAreas.map((area) => {
                        const isSelected = focusArea.name === area.name;
                        const AreaIcon = getLifeAreaIcon(area.name);
                        const colors = getAreaColorConfig(area.name);
                        return (
                          <button
                            key={area.name}
                            type="button"
                            onClick={() => setSelectedFocusAreaName(area.name === weakestArea.name ? null : area.name)}
                            aria-pressed={isSelected}
                            className={cn(
                              "group min-h-12 cursor-pointer select-none rounded-xl border p-2.5 text-left outline-none transition-all duration-200",
                              isSelected
                                ? colors.selectedBg
                                : "border-app-line bg-app-surface hover:bg-app-bg hover:border-app-line/80 active:scale-[0.97]",
                              "focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg focus-visible:outline-none",
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                                  isSelected
                                    ? colors.iconSelectedBg
                                    : "bg-app-bg text-app-ink-muted group-hover:bg-app-line group-hover:text-app-ink",
                                )}
                              >
                                <AreaIcon className="h-4 w-4" aria-hidden="true" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "break-words text-xs font-bold leading-tight",
                                    isSelected ? colors.text : "text-app-ink-soft group-hover:text-app-ink",
                                  )}
                                >
                                  {getLifeAreaLabel(area.name)}
                                </p>
                                <p
                                  className={cn(
                                    "mt-0.5 text-xs font-semibold",
                                    isSelected ? colors.text : "text-app-ink-muted",
                                  )}
                                >
                                  {area.score}/10
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="space-y-4 lg:sticky lg:top-6 lg:space-y-5">
                  <section className="surface-raised relative overflow-hidden rounded-2xl border border-app-accent/20 bg-app-bg-subtle p-4 shadow-app-md sm:p-5 lg:p-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-app-accent">
                      LĨNH VỰC TRỌNG TÂM
                    </span>
                    <h2 className="mt-2 font-[family-name:var(--app-font-serif)] text-[26px] font-bold leading-tight text-app-ink sm:text-3xl">
                      {getLifeAreaLabel(focusArea.name)}
                    </h2>
                    <p className="mt-1 text-xs text-app-ink-soft">Điểm hiện tại: {focusArea.score}/10</p>

                    <div className="mt-4 space-y-2 rounded-xl border border-app-line bg-app-surface p-3.5 sm:p-4">
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-app-accent">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        Gợi ý mục tiêu 12 tuần
                      </span>
                      <p className="break-words text-xs font-[family-name:var(--app-font-serif)] italic leading-relaxed text-app-ink">
                        "{focusSmartGoalStarter.specificGoalStatement}"
                      </p>
                      <p className="break-words text-xs italic text-app-ink-muted">
                        Lý do: {focusSmartGoalStarter.motivationReason}
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      type="button"
                      onClick={handleContinueToGoalSetup}
                      className="group mt-5 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-card bg-app-accent px-5 py-3 text-sm font-bold text-white shadow-app-sm transition-all hover:bg-app-accent-hover active:scale-[0.97] sm:mt-6 sm:min-h-12 sm:px-6"
                    >
                      Tạo mục tiêu SMART
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </motion.button>
                    <p className="mt-2 text-[11px] text-app-ink-muted text-center">
                      Bước tiếp: biến trọng tâm thành mục tiêu 12 tuần rõ ràng.
                    </p>

                    <div className="mt-4 flex justify-center border-t border-app-line/60 pt-4">
                      <Link
                        to="/life-insight"
                        className="inline-flex min-h-11 items-center gap-1 px-3 py-2 text-center text-xs font-medium text-app-ink-soft transition-colors hover:text-app-ink"
                      >
                        Xem bản đầy đủ trang Góc nhìn
                      </Link>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="surface-raised rounded-2xl border border-app-line p-8 text-center">
                <Compass className="mx-auto h-10 w-10 text-app-accent" aria-hidden="true" />
                <p className="mt-3 text-sm text-app-ink-soft">Chưa có dữ liệu để gợi ý trọng tâm.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
