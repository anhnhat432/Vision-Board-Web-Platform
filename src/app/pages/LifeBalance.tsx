import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  RotateCcw,
  Save,
  Sparkles,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { getLifeAreaIcon } from "../components/illustrations";
import type { LifeBalanceHistoryChartPoint } from "../components/LifeBalanceHistoryChart";
import { MotionFadeIn, MotionStaggerItem, MotionStaggerList } from "../components/motion";
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

const CORE_CLUSTERS = [
  {
    id: "personal",
    title: "Phát triển & Sự nghiệp",
    description: "Sự nghiệp, tài chính và trí tuệ nâng tầm bản thân.",
    areas: ["Career", "Finance", "Education"],
  },
  {
    id: "vitality",
    title: "Thân - Tâm - Trí",
    description: "Sức khỏe thể chất, tinh thần và giải trí tái tạo.",
    areas: ["Health", "Personal Growth", "Leisure"],
  },
  {
    id: "social",
    title: "Gia đình & Kết nối",
    description: "Các mối quan hệ thân cận và tổ ấm gia đình.",
    areas: ["Family", "Relationships"],
  },
];

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
  const [activeClusterIndex, setActiveClusterIndex] = useState(0);
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
  const historyCount = userData.wheelOfLifeHistory.length;

  return (
    <PageShell maxWidth="xl">
      <ScreenGuide {...SCREEN_GUIDES.lifeBalance} autoOpen />
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent className="surface-elevated rounded-2xl border border-app-line bg-app-surface shadow-[var(--shadow-3)]">
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-status-warning/15 text-app-status-warning">
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
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent"
            >
              <Save className="h-4 w-4" />
              Lưu rồi rời trang
            </AlertDialogAction>
            <button
              type="button"
              onClick={() => blocker.proceed?.()}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm text-app-ink hover:bg-app-bg"
            >
              Rời trang
            </button>
            <AlertDialogCancel
              onClick={() => blocker.reset?.()}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-app-line bg-app-surface px-4 py-2 text-sm text-app-ink hover:bg-app-bg"
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
          <MotionFadeIn
            delay={0.05}
            className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 transition-all duration-300 hover:shadow-md hover:border-app-accent/30"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Trung bình</p>
            <p className="mt-3 font-serif text-4xl font-medium leading-none tabular-nums text-app-ink">
              <CountUp value={averageScore} precision={1} />
              <span className="ml-1 text-lg font-medium text-app-ink-muted">/10</span>
            </p>
          </MotionFadeIn>
          <MotionFadeIn
            delay={0.1}
            className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 transition-all duration-300 hover:shadow-md hover:border-app-accent/30"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Lĩnh vực mạnh nhất</p>
            <p className="mt-3 font-serif text-4xl font-medium leading-none tabular-nums text-app-ink">
              <CountUp value={strongestArea.score} />
              <span className="ml-1 text-lg font-medium text-app-ink-muted">/10</span>
            </p>
            <p className="mt-1.5 text-xs font-medium text-app-ink-soft">{getLifeAreaLabel(strongestArea.name)}</p>
          </MotionFadeIn>
          <MotionFadeIn
            delay={0.15}
            className="surface-raised rounded-xl border border-app-status-warning/30 bg-app-status-warning/10 p-5 transition-all duration-300 hover:shadow-md hover:border-app-status-warning/50"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-status-warning">
              Lĩnh vực cần ưu tiên
            </p>
            <p className="mt-3 font-serif text-4xl font-medium leading-none tabular-nums text-app-ink">
              <CountUp value={weakestArea.score} />
              <span className="ml-1 text-lg font-medium text-app-ink-muted">/10</span>
            </p>
            <p className="mt-1.5 text-xs font-medium text-app-status-warning">{getLifeAreaLabel(weakestArea.name)}</p>
          </MotionFadeIn>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
          <TabsList>
            <TabsTrigger value="current">Hiện tại</TabsTrigger>
            <TabsTrigger value="focus">
              <Target className="mr-1 h-3.5 w-3.5" />
              Trọng tâm
            </TabsTrigger>
            <TabsTrigger value="history" disabled={historicalData.length === 0}>
              Lịch sử
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 w-full max-w-full overflow-hidden">
              <div className="space-y-6">
                <section className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 md:p-6 shadow-sm">
                  <header className="pb-3 border-b border-app-line/60 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-app-ink uppercase tracking-wider">
                        Bản đồ Cân bằng cuộc sống
                      </h2>
                      <p className="text-[10px] text-app-ink-muted mt-0.5">
                        Trạng thái hiện tại của 8 khía cạnh cốt lõi
                      </p>
                    </div>
                    {isCheckInMode && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-app-accent bg-app-accent-subtle border border-app-accent/15 px-2 py-0.5 rounded-full">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        Đang Check-in...
                      </span>
                    )}
                  </header>
                  <div className="mt-4">
                    <SimpleRadarChart className="mx-auto max-w-[420px]" data={radarData} height={340} />
                  </div>
                </section>

                {/* Box Giải thích & Nhận định Tiêu điểm Chuyên sâu */}
                <section className="surface-raised rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] p-5 md:p-6 shadow-3xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                  <header className="flex items-center gap-2 pb-3 border-b border-app-line/20">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Target className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                        Trọng tâm Hành động đề xuất
                      </h2>
                      <p className="text-[10px] text-app-ink-muted font-semibold mt-0.5">Tìm ra điểm nghẽn cuộc sống</p>
                    </div>
                  </header>

                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-bold text-app-ink-soft leading-normal">
                      Khía cạnh cần ưu tiên cải thiện:{" "}
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/50">
                        {getLifeAreaLabel(weakestArea.name)} ({weakestArea.score}đ)
                      </span>
                    </p>

                    <p className="text-xs text-app-ink-muted leading-relaxed font-medium">
                      {getFocusInsight(weakestArea, lifeAreas, getLifeAreaLabel(weakestArea.name)).reason}
                    </p>

                    <div className="bg-app-surface border border-app-line rounded-xl p-3 text-[11px] text-app-accent font-semibold flex gap-2 items-start shadow-3xs">
                      <Sparkles className="h-4 w-4 shrink-0 text-app-accent animate-pulse mt-0.5" />
                      <p className="leading-relaxed">
                        <strong>Hành động đề xuất:</strong> {getFocusInsight(weakestArea, lifeAreas, getLifeAreaLabel(weakestArea.name)).tip}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-6 min-w-0 w-full max-w-full overflow-hidden">
                {!isCheckInMode ? (
                  // BẢNG ĐIỀU KHIỂN DASHBOARD CHÍNH (Tĩnh, click để check-in)
                  <div className="space-y-6 animate-fade-in w-full max-w-full overflow-hidden">
                    {/* Banner Bắt đầu Check-in */}
                    <div className="surface-raised rounded-2xl border border-app-accent/10 bg-gradient-to-br from-app-accent-subtle via-app-surface to-app-bg-subtle dark:from-app-accent-subtle dark:via-app-surface dark:to-app-bg p-6 shadow-3xs flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-app-accent">
                          Check-in Cân bằng
                        </span>
                        <h3 className="font-serif text-lg font-bold text-app-ink leading-tight flex items-center gap-1.5">
                          <Compass className="h-5 w-5 text-app-accent animate-spin-slow" />
                          Cập nhật Bánh xe cuộc sống hằng tuần
                        </h3>
                        <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                          Dành 1 phút phản tư nhanh và chấm điểm lại 8 khía cạnh qua 3 chặng tương tác nhẹ để luôn làm
                          chủ nhịp điệu cuộc sống.
                        </p>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => {
                          setIsCheckInMode(true);
                          setActiveClusterIndex(0);
                        }}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-app-accent hover:bg-app-accent-hover px-6 py-2.5 text-xs font-bold text-app-ink-on-accent shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer w-full sm:w-auto font-sans"
                      >
                        Bắt đầu Check-in nhanh
                        <ChevronRight className="h-4 w-4" />
                      </motion.button>
                    </div>

                    {/* Danh sách 8 khía cạnh tĩnh (đẹp mắt, màu pastel) */}
                    <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5 md:p-6 shadow-3xs">
                      <header className="pb-3 border-b border-app-line/60">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-app-ink">
                          Điểm số hiện tại của 8 lĩnh vực
                        </h3>
                      </header>
                      <MotionStaggerList className="mt-4 grid gap-2 sm:grid-cols-2">
                        {lifeAreas.map((area) => {
                          const AreaIcon = getLifeAreaIcon(area.name);
                          const colorConfig = getAreaColorConfig(area.name);
                          const label = getLifeAreaLabel(area.name);

                          return (
                            <MotionStaggerItem
                              key={area.name}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-colors shadow-3xs",
                                colorConfig.bgLight,
                                colorConfig.border,
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-xs",
                                  )}
                                  style={{ backgroundColor: colorConfig.accent }}
                                >
                                  <AreaIcon className="h-4 w-4" />
                                </span>
                                <span className="text-xs font-bold text-neutral-700">{label}</span>
                              </div>
                              <span className="font-serif text-lg font-extrabold text-neutral-800">{area.score}đ</span>
                            </MotionStaggerItem>
                          );
                        })}
                      </MotionStaggerList>

                      <div className="mt-4 pt-4 border-t border-app-line/45 flex justify-end">
                        <Link
                          to="/onboarding"
                          className="text-xs font-bold text-app-accent hover:text-app-accent-hover hover:underline"
                        >
                          Làm lại khảo sát toàn diện →
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  // WIZARD CHECK-IN 3 CHẶNG TƯƠNG TÁC
                  (() => {
                    const cluster = CORE_CLUSTERS[activeClusterIndex];
                    if (!cluster) return null;

                    return (
                      <MotionFadeIn
                        key={activeClusterIndex}
                        className="surface-raised rounded-2xl border border-app-accent/20 bg-app-surface p-5 md:p-6 shadow-md w-full max-w-full overflow-hidden"
                      >
                        {/* Progress Header */}
                        <header className="pb-4 border-b border-app-line/60 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            <span>Chặng {activeClusterIndex + 1} / 3</span>
                            <span>{Math.round(((activeClusterIndex + 1) / 3) * 100)}% Hoàn thành</span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${((activeClusterIndex + 1) / 3) * 100}%` }}
                            />
                          </div>

                          <h3 className="font-serif text-lg font-bold text-app-ink mt-2">{cluster.title}</h3>
                          <p className="text-xs text-neutral-400 font-semibold">{cluster.description}</p>
                        </header>

                        {/* Danh sách thẻ slider trong cụm */}
                        <div className="mt-5 space-y-4">
                          {cluster.areas.map((areaName) => {
                            const areaIndex = lifeAreas.findIndex((a) => a.name === areaName);
                            const area = lifeAreas[areaIndex];
                            if (!area) return null;

                            const AreaIcon = getLifeAreaIcon(area.name);
                            const colorConfig = getAreaColorConfig(area.name);
                            const label = getLifeAreaLabel(area.name);

                            return (
                              <div
                                key={area.name}
                                className={cn(
                                  "rounded-xl border p-4 shadow-3xs space-y-4",
                                  colorConfig.bgLight,
                                  colorConfig.border,
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <span
                                      className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
                                      style={{ backgroundColor: colorConfig.accent }}
                                    >
                                      <AreaIcon className="h-5 w-5" />
                                    </span>
                                    <div>
                                      <h4 className="text-xs font-bold text-neutral-800">{label}</h4>
                                      <p className="text-[10px] text-neutral-500 font-semibold leading-normal">
                                        {LIFE_AREA_DETAILS[area.name]}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-baseline gap-1 bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 px-2.5 py-1 rounded-lg">
                                    <span
                                      className="font-serif text-lg font-extrabold text-neutral-800"
                                      style={{ color: colorConfig.accent }}
                                    >
                                      {area.score}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 font-bold">/10</span>
                                  </div>
                                </div>

                                {/* Slider + Button di động */}
                                <div className="space-y-3 pt-1">
                                  <div className="flex items-center gap-3">
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      type="button"
                                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg font-bold text-neutral-700 hover:bg-neutral-50 active:scale-95 transition-all select-none font-sans"
                                      onClick={() => handleScoreChange(areaIndex, [Math.max(1, area.score - 1)])}
                                      aria-label={`Giảm ${label}`}
                                    >
                                      −
                                    </motion.button>

                                    <div className="grow px-1">
                                      <Slider
                                        value={[area.score]}
                                        onValueChange={(value) => handleScoreChange(areaIndex, value)}
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
                                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg font-bold text-neutral-700 hover:bg-neutral-50 active:scale-95 transition-all select-none font-sans"
                                      onClick={() => handleScoreChange(areaIndex, [Math.min(10, area.score + 1)])}
                                      aria-label={`Tăng ${label}`}
                                    >
                                      +
                                    </motion.button>
                                  </div>

                                  <div className="flex justify-between text-[9px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                                    {[
                                      { range: "1–2", label: "Rất chật vật" },
                                      { range: "3–4", label: "Thiếu ổn định" },
                                      { range: "5–6", label: "Tạm ổn" },
                                      { range: "7–8", label: "Khá tốt" },
                                      { range: "9–10", label: "Rất tốt" },
                                    ].map((anchor) => {
                                      const isActive =
                                        (area.score <= 2 && anchor.range === "1–2") ||
                                        (area.score >= 3 && area.score <= 4 && anchor.range === "3–4") ||
                                        (area.score >= 5 && area.score <= 6 && anchor.range === "5–6") ||
                                        (area.score >= 7 && area.score <= 8 && anchor.range === "7–8") ||
                                        (area.score >= 9 && anchor.range === "9–10");
                                      return (
                                        <span
                                          key={anchor.range}
                                          className={cn(
                                            "rounded-full px-1.5 py-0.5 transition-colors",
                                            isActive ? "bg-app-accent/15 text-app-accent" : "",
                                          )}
                                        >
                                          {anchor.range} {anchor.label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Chân Wizard */}
                        <div className="mt-6 pt-4 border-t border-app-line/65 flex items-center justify-between gap-3">
                          <motion.button
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                            type="button"
                            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-app-line bg-app-surface px-5 py-2.5 text-xs font-bold text-app-ink-soft hover:bg-app-bg hover:text-app-ink active:scale-[0.97] transition-all cursor-pointer font-sans"
                            onClick={() => {
                              if (activeClusterIndex > 0) {
                                setActiveClusterIndex(activeClusterIndex - 1);
                              } else {
                                setIsCheckInMode(false);
                              }
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Quay lại
                          </motion.button>

                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.015 }}
                              whileTap={{ scale: 0.985 }}
                              type="button"
                              className="inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700 cursor-pointer font-sans"
                              onClick={() => setIsCheckInMode(false)}
                            >
                              Hủy bỏ
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.015 }}
                              whileTap={{ scale: 0.985 }}
                              type="button"
                              className="inline-flex min-h-11 sm:min-h-12 items-center justify-center gap-1.5 rounded-full bg-app-accent hover:bg-app-accent-hover px-6 py-2.5 text-xs font-bold text-white transition-all active:scale-[0.97] shadow-md cursor-pointer font-sans"
                              onClick={() => {
                                if (activeClusterIndex < 2) {
                                  setActiveClusterIndex(activeClusterIndex + 1);
                                  // Tự động cuộn lên đầu card wizard để người dùng không bị lệch focus
                                  const cardHeader = document.querySelector("h3[class*='font-serif text-lg']");
                                  if (cardHeader) {
                                    cardHeader.scrollIntoView({ behavior: "smooth" });
                                  }
                                } else {
                                  handleSave();
                                  setIsCheckInMode(false);
                                  handleTabChange("focus");
                                }
                              }}
                            >
                              {activeClusterIndex < 2 ? (
                                <>
                                  Tiếp tục
                                  <ChevronRight className="h-4 w-4" />
                                </>
                              ) : (
                                <>
                                  Lưu & Xem kết quả
                                  <Save className="h-4 w-4" />
                                </>
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </MotionFadeIn>
                    );
                  })()
                )}
              </div>
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

          {/* 2B-1: Tab Trọng tâm — chọn lĩnh vực + CTA tới SMART Goal */}
          <TabsContent value="focus" className="mt-6">
            {focusArea && focusSmartGoalStarter ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left: Chọn trọng tâm */}
                <div className="space-y-5">
                  {/* Insight card cá nhân hóa */}
                  <section className="surface-raised rounded-2xl border border-app-status-success/20 bg-app-status-success/5 p-5">
                    <h3 className="text-sm font-bold text-app-ink flex items-center gap-2">
                      <Target className="h-4 w-4 text-app-status-success" />
                      {focusArea.name === weakestArea?.name ? "Đề xuất trọng tâm" : "Trọng tâm bạn chọn"}
                    </h3>
                    <p className="mt-2 text-xs text-app-ink-soft leading-relaxed">
                      {getFocusInsight(focusArea, lifeAreas, getLifeAreaLabel(focusArea.name)).headline}
                    </p>
                    <p className="mt-2 text-xs text-app-ink-muted leading-relaxed">
                      {getFocusInsight(focusArea, lifeAreas, getLifeAreaLabel(focusArea.name)).reason}
                    </p>
                  </section>

                  {/* Picker chọn area khác */}
                  <section className="surface-raised rounded-2xl border border-app-line bg-app-surface p-5">
                    <header className="pb-3 border-b border-app-line/60">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-app-ink">
                        Hoặc tự chọn lĩnh vực khác
                      </h3>
                      <p className="mt-1 text-xs text-app-ink-muted">Nhấp vào lĩnh vực bạn muốn đặt mục tiêu</p>
                    </header>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                      {lifeAreas.map((area) => {
                        const isSelected = focusArea.name === area.name;
                        const AreaIcon = getLifeAreaIcon(area.name);
                        const colors = getAreaColorConfig(area.name);
                        return (
                          <button
                            key={area.name}
                            type="button"
                            onClick={() => setSelectedFocusAreaName(area.name === weakestArea.name ? null : area.name)}
                            className={cn(
                              "group min-h-12 rounded-xl border p-2.5 text-left transition-all duration-200 outline-none cursor-pointer select-none",
                              isSelected
                                ? colors.selectedBg
                                : "border-app-line bg-app-surface hover:bg-app-bg hover:border-app-line/80 active:scale-[0.97]",
                              "focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg focus-visible:outline-none",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
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
                                    "truncate text-xs font-bold",
                                    isSelected ? colors.text : "text-app-ink-soft group-hover:text-app-ink",
                                  )}
                                >
                                  {getLifeAreaLabel(area.name)}
                                </p>
                                <p
                                  className={cn(
                                    "text-xs font-semibold",
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

                {/* Right: CTA + gợi ý */}
                <div className="space-y-5 lg:sticky lg:top-6">
                  {/* Focus Card */}
                  <section className="surface-raised rounded-2xl border border-app-accent/20 bg-app-bg-subtle p-6 shadow-app-md relative overflow-hidden">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-app-accent">
                      LĨNH VỰC TRỌNG TÂM
                    </span>
                    <h2 className="mt-2 font-serif text-2xl font-bold text-app-ink">
                      {getLifeAreaLabel(focusArea.name)}
                    </h2>
                    <p className="mt-1 text-xs text-app-ink-soft">Điểm hiện tại: {focusArea.score}/10</p>

                    {/* Gợi ý mục tiêu */}
                    <div className="mt-4 p-4 rounded-xl border border-app-line bg-app-surface space-y-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-app-accent flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Gợi ý mục tiêu 12 tuần
                      </span>
                      <p className="text-xs font-serif italic text-app-ink leading-relaxed">
                        "{focusSmartGoalStarter.specificGoalStatement}"
                      </p>
                      <p className="text-xs text-app-ink-muted italic">
                        Lý do: {focusSmartGoalStarter.motivationReason}
                      </p>
                    </div>

                    {/* CTA */}
                    <motion.button
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      type="button"
                      onClick={handleContinueToGoalSetup}
                      className="mt-6 group inline-flex min-h-12 w-full items-center justify-center gap-2 bg-app-accent px-6 py-3 rounded-xl text-sm font-bold text-white shadow-app-sm hover:bg-app-accent-hover active:scale-[0.97] transition-all cursor-pointer"
                    >
                      Tạo mục tiêu SMART
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </motion.button>
                    <p className="mt-2 text-[11px] text-app-ink-muted text-center">
                      Bước tiếp: biến trọng tâm thành mục tiêu 12 tuần rõ ràng.
                    </p>

                    {/* Link sang LifeInsight đầy đủ */}
                    <div className="mt-4 pt-4 border-t border-app-line/60 flex justify-center">
                      <Link
                        to="/life-insight"
                        className="inline-flex min-h-11 items-center gap-1 px-3 py-2 text-xs font-medium text-app-ink-soft hover:text-app-ink transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Xem bản đầy đủ trang Góc nhìn
                      </Link>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="surface-raised rounded-2xl border border-app-line p-8 text-center">
                <Compass className="mx-auto h-10 w-10 text-app-accent" />
                <p className="mt-3 text-sm text-app-ink-soft">Chưa có dữ liệu để gợi ý trọng tâm.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
