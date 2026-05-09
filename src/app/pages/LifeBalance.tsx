import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router";
import { motion } from "motion/react";
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

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import type { LifeBalanceHistoryChartPoint } from "../components/LifeBalanceHistoryChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import { ProductVisual } from "../components/visuals/ProductVisual";
import { Reveal } from "../components/ui/reveal";
import { SimpleRadarChart } from "../components/SimpleRadarChart";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { loadWithChunkReload } from "../utils/chunkLoad";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { type LifeArea, getLifeAreaLabel, updateWheelOfLife } from "../utils/storage";

const LifeBalanceHistoryChart = lazy(() =>
  loadWithChunkReload(async () => ({
    default: (await import("../components/LifeBalanceHistoryChart")).LifeBalanceHistoryChart,
  })),
);

export function LifeBalance() {
  const navigate = useNavigate();
  const { userData, reloadUserData } = useSyncedUserData();
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const lifeBalanceStartedRef = useRef(false);
  const pageTopRef = useRef<HTMLDivElement | null>(null);

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
    setLifeAreas(userData.currentWheelOfLife.map((area) => ({ ...area })));
  }, [hasChanges, userData]);

  useEffect(() => {
    if (!userData || lifeBalanceStartedRef.current) return;

    const hasExistingScores = hasRealLifeBalance(userData);
    if (!hasExistingScores) return;

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

  const hasLifeBalanceData = hasRealLifeBalance(userData);
  const balanceTone =
    averageScore < 5
      ? "Mặt bằng hiện tại còn thấp. Hãy chọn một lĩnh vực nhỏ để tạo lực kéo trước."
      : averageScore < 7
        ? "Bạn đã có nền ổn định. Điểm thấp nhất là nơi đáng chuyển thành Life Insight ngay."
        : "Nền hiện tại khá tốt. Life Insight nên tập trung vào điểm lệch để duy trì đà.";

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

  const saveLifeBalance = () => {
    updateWheelOfLife(lifeAreas);
    trackCompletion();
    setHasChanges(false);
    reloadUserData();
  };

  const handleScoreChange = (index: number, value: number[]) => {
    const updated = [...lifeAreas];
    updated[index] = { ...updated[index], score: value[0] };
    setLifeAreas(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveLifeBalance();
    toast.success("Đã cập nhật Life Balance", {
      description: "Điểm mới đã được lưu vào bánh xe cuộc sống của bạn.",
    });
  };

  const handleContinueToInsight = () => {
    if (hasChanges) {
      saveLifeBalance();
      toast.success("Đã lưu Life Balance trước khi mở Life Insight.");
      window.setTimeout(() => navigate("/life-insight"), 0);
      return;
    }

    navigate("/life-insight");
  };

  if (!userData || !hasLifeBalanceData) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="relative">
          <div className="absolute -inset-4 animate-pulse rounded-full border-2 border-dashed border-violet-200" />
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <CompassIcon className="h-9 w-9" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Chưa có dữ liệu bánh xe cuộc sống</h2>
          <p className="max-w-sm text-sm leading-7 text-slate-500">
            Bạn cần hoàn thành đánh giá ban đầu trước. Chỉ mất khoảng 3 phút để tạo bức tranh nền cho hành trình phát
            triển.
          </p>
        </div>
        <Button onClick={() => navigate("/onboarding")}>
          Bắt đầu đánh giá
          <TrendingUp className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!strongestArea || !weakestArea) return null;

  return (
    <div ref={pageTopRef} className="space-y-8 pb-12">
      {blocker.state === "blocked" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-lg border border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Bạn có thay đổi chưa lưu</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Nếu rời khỏi trang này ngay bây giờ, điểm số vừa điều chỉnh sẽ không được lưu lại.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => {
                  saveLifeBalance();
                  toast.success("Đã lưu trước khi rời trang.");
                  blocker.proceed();
                }}
              >
                <Save className="h-4 w-4" />
                Lưu rồi rời trang
              </Button>
              <Button variant="outline" onClick={() => blocker.proceed()}>
                Rời trang không lưu
              </Button>
              <Button variant="ghost" onClick={() => blocker.reset()}>
                Ở lại trang này
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="ops-surface overflow-hidden border border-slate-200/80 bg-white/94 text-slate-950 shadow-sm">
        <CardContent className="relative p-5 sm:p-6">
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <Compass className="h-4 w-4" />
                Life Balance Center
              </div>

              <div className="space-y-3">
                <h1 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
                  Cập nhật bánh xe cuộc sống để chọn đúng trọng tâm tiếp theo.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Mỗi điểm bạn chỉnh sẽ cập nhật ngay phần tín hiệu bên dưới. Sau đó bạn có thể lưu riêng hoặc lưu rồi
                  mở Life Insight để chọn vấn đề đáng ưu tiên nhất.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {hasChanges ? (
                  <Button
                    variant="outline"
                    className="border-slate-950 bg-slate-950 text-white hover:bg-slate-800 hover:text-white"
                    onClick={handleSave}
                  >
                    <Save className="h-4 w-4" />
                    Lưu thay đổi
                  </Button>
                ) : (
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-4 py-2 text-slate-600">
                    Không có thay đổi chưa lưu
                  </Badge>
                )}
              </div>
            </div>

            <div className="hidden rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm lg:block">
              <ProductVisual variant="balance" className="mb-4 min-h-[160px]" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Snapshot hiện tại</p>

              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Điểm cân bằng chung</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    <CountUp value={averageScore} precision={1} />
                    <span className="text-slate-400">/10</span>
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mạnh nhất</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{getLifeAreaLabel(strongestArea.name)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    <CountUp value={strongestArea.score} />
                    <span>/10</span>
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Nên ưu tiên</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{getLifeAreaLabel(weakestArea.name)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    <CountUp value={weakestArea.score} />
                    <span>/10</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Reveal delay={0.02}>
        <Card
          data-testid="life-balance-next-step-card"
          className="border border-slate-200/80 bg-white/92 shadow-lg"
        >
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div data-testid="life-balance-signal-summary" className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Tiếp theo trong luồng chính
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">Tín hiệu từ Life Balance</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                    {balanceTone} Life Insight sẽ dùng tín hiệu này để nối sang SMART Goal và kế hoạch 12 tuần.
                  </p>
                  {hasChanges && (
                    <p className="mt-2 text-sm font-medium text-amber-700">
                      Bạn đang xem tín hiệu từ điểm mới chưa lưu. Khi đi tiếp, hệ thống sẽ lưu điểm này trước.
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div
                    data-testid="life-balance-signal-weakest"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Ưu tiên</p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{getLifeAreaLabel(weakestArea.name)}</p>
                    <p className="mt-1 text-sm font-semibold text-amber-800">{weakestArea.score}/10</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trung bình</p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{averageScore.toFixed(1)}/10</p>
                    <p className="mt-1 text-sm text-slate-500">mặt bằng hiện tại</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Điểm tựa</p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{getLifeAreaLabel(strongestArea.name)}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-800">{strongestArea.score}/10</p>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto">
                <Button className="w-full sm:w-auto" onClick={handleContinueToInsight}>
                  {hasChanges ? "Lưu và xem Life Insight" : "Mở Life Insight"}
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
        <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Điểm trung bình",
              value: averageScore.toFixed(1),
              note: "mặt bằng hiện tại",
              icon: TrendingUp,
              color: "from-violet-500/18 to-fuchsia-500/10 text-violet-700 dark:text-violet-400",
            },
            {
              title: "Điểm cao nhất",
              value: strongestArea.score,
              note: getLifeAreaLabel(strongestArea.name),
              icon: Sparkles,
              color: "from-emerald-500/18 to-teal-500/10 text-emerald-700 dark:text-emerald-400",
            },
            {
              title: "Điểm thấp nhất",
              value: weakestArea.score,
              note: getLifeAreaLabel(weakestArea.name),
              icon: Compass,
              color: "from-amber-500/18 to-orange-500/10 text-amber-700 dark:text-amber-400",
            },
            {
              title: "Lần đo đã lưu",
              value: userData.wheelOfLifeHistory.length,
              note: "mốc lịch sử hiện có",
              icon: Calendar,
              color: "from-sky-500/18 to-cyan-500/10 text-sky-700 dark:text-sky-400",
            },
          ].map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index }}
              >
                <Card className="relative overflow-hidden">
                  <div
                    className={`absolute inset-x-5 top-0 h-20 rounded-b-[28px] bg-gradient-to-br ${item.color} blur-2xl`}
                  />
                  <CardHeader className="relative flex flex-row items-start justify-between pb-3">
                    <div>
                      <CardDescription>{item.title}</CardDescription>
                      <CardTitle className="mt-2 text-4xl">
                        {typeof item.value === "number" ? (
                          <CountUp value={item.value} />
                        ) : (
                          <CountUp value={Number(item.value)} precision={1} />
                        )}
                      </CardTitle>
                    </div>
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${item.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-sm text-slate-500">{item.note}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <Tabs defaultValue="current" className="space-y-6">
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

          <TabsContent value="current" className="space-y-6">
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
                      className="rounded-lg border p-4"
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
                      <p className="mt-3 text-lg font-semibold text-slate-900">
                        {getLifeAreaLabel(strongestArea.name)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Đây là phần đang tạo lực đỡ tốt cho bạn ở thời điểm này.
                      </p>
                    </div>

                    <div
                      className="rounded-lg border p-4"
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
                      <p className="mt-3 text-lg font-semibold text-slate-900">{getLifeAreaLabel(weakestArea.name)}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Chỉ cần cải thiện đúng điểm này, toàn bộ bánh xe sẽ cân hơn đáng kể.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Điều chỉnh điểm số</CardTitle>
                    <CardDescription>
                      Đánh giá lại từng khía cạnh từ 1 đến 10 theo cảm nhận trung thực nhất của bạn.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {lifeAreas.map((area, index) => (
                      <div key={area.name} className="rounded-lg border border-white/70 bg-white/72 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-4 w-4 rounded-full ring-4 ring-white/85 dark:ring-black/35"
                              style={{ backgroundColor: area.color }}
                            />
                            <div>
                              <p className="font-semibold text-slate-900">{getLifeAreaLabel(area.name)}</p>
                              <p className="text-sm text-slate-500">
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

                        <div className="mt-4 space-y-2">
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
                          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                            <span>Cần chú ý</span>
                            <span>Xuất sắc</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {hasChanges && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">Bạn có thay đổi chưa lưu</h3>
                          <p className="text-sm text-slate-500">
                            Lưu lại để cập nhật bánh xe hiện tại và thêm một mốc vào lịch sử theo dõi.
                          </p>
                        </div>
                        <Button onClick={handleSave}>
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
                      <div className="rounded-lg border border-white/70 bg-white/72 py-12 text-center text-slate-500">
                        <Calendar className="mx-auto mb-3 h-12 w-12 opacity-50" />
                        <p>Đang mở biểu đồ lịch sử...</p>
                        <p className="mt-1 text-sm">Dữ liệu xu hướng sẽ hiện ra ngay sau khi tải xong.</p>
                      </div>
                    }
                  >
                    <LifeBalanceHistoryChart data={historicalData} />
                  </Suspense>
                ) : (
                  <div className="rounded-lg border border-white/70 bg-white/72 py-12 text-center text-slate-500">
                    <Calendar className="mx-auto mb-3 h-12 w-12 opacity-50" />
                    <p>Chưa có dữ liệu lịch sử.</p>
                    <p className="mt-1 text-sm">Hãy lưu một vài lần cập nhật để bắt đầu thấy xu hướng.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Reveal>
    </div>
  );
}
