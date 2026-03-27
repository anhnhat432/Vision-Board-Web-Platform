import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  AlertTriangle,
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
import { Reveal } from "../components/ui/reveal";
import { SimpleRadarChart } from "../components/SimpleRadarChart";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  type LifeArea,
  type UserData,
  getLifeAreaLabel,
  getUserData,
  updateWheelOfLife,
} from "../utils/storage";

const LifeBalanceHistoryChart = lazy(async () => ({
  default: (await import("../components/LifeBalanceHistoryChart")).LifeBalanceHistoryChart,
}));

export function LifeBalance() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Warn user before navigating away with unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  const loadData = useCallback(() => {
    const data = getUserData();
    setUserData(data);
    setLifeAreas([...data.currentWheelOfLife]);
    setHasChanges(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScoreChange = (index: number, value: number[]) => {
    const updated = [...lifeAreas];
    updated[index] = { ...updated[index], score: value[0] };
    setLifeAreas(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateWheelOfLife(lifeAreas);
    toast.success("Đã cập nhật cân bằng cuộc sống!", {
      description: "Điểm số bánh xe cuộc sống của bạn đã được lưu.",
    });
    loadData();
  };

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

  // Empty state: onboarding not yet completed or wheel not set
  if (!userData || userData.currentWheelOfLife.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="relative">
          <div className="absolute -inset-4 animate-pulse rounded-full border-2 border-dashed border-violet-200" />
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-50 text-violet-600">
            <CompassIcon className="h-9 w-9" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Chưa có dữ liệu bánh xe cuộc sống</h2>
          <p className="max-w-sm text-sm leading-7 text-slate-500">
            Bạn cần hoàn thành đánh giá ban đầu trước. Chỉ mất khoảng 3 phút để tạo bức tranh nền cho hành trình phát triển.
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
    <div className="space-y-8 pb-12">
      {/* Unsaved changes navigation blocker dialog */}
      {blocker.state === "blocked" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.35)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Bạn có thay đổi chưa lưu</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Nếu rời khỏi trang này ngay bây giờ, điểm số vừa điều chỉnh sẽ không được lưu lại.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => {
                  updateWheelOfLife(lifeAreas);
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
      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="relative p-5 sm:p-6 lg:p-8">

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Compass className="h-4 w-4" />
                Life Balance Center
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  Theo dõi và tinh chỉnh bánh xe cuộc sống của bạn như một hệ điều hành cá nhân.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                  Trang này giúp bạn nhìn rõ mặt bằng hiện tại, cập nhật điểm số theo cảm nhận thật
                  và theo dõi sự thay đổi qua thời gian để ưu tiên đúng nơi cần thiết.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {hasChanges ? (
                  <Button
                    variant="outline"
                    className="hero-cta border-white/18 bg-white text-slate-900 hover:bg-white/92"
                    onClick={handleSave}
                  >
                    <Save className="h-4 w-4" />
                    Lưu thay đổi
                  </Button>
                ) : (
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    Không có thay đổi chưa lưu
                  </Badge>
                )}
              </div>
            </div>

            <div className="hidden xl:block rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                Snapshot hiện tại
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Điểm cân bằng chung</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    <CountUp value={averageScore} precision={1} />
                    <span className="text-white/68">/10</span>
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Khía cạnh mạnh nhất</p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {getLifeAreaLabel(strongestArea.name)}
                  </p>
                  <p className="mt-1 text-sm text-white/68">
                    <CountUp value={strongestArea.score} />
                    <span>/10</span>
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Nên ưu tiên tiếp theo</p>
                  <p className="mt-2 text-xl font-bold text-white">
                    {getLifeAreaLabel(weakestArea.name)}
                  </p>
                  <p className="mt-1 text-sm text-white/68">
                    <CountUp value={weakestArea.score} />
                    <span>/10</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color}`}
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
                    className="rounded-[24px] border p-4"
                    style={{
                      borderColor: `${strongestArea.color}33`,
                      background: `${strongestArea.color}12`,
                    }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: strongestArea.color }}>
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
                    className="rounded-[24px] border p-4"
                    style={{
                      borderColor: `${weakestArea.color}33`,
                      background: `${weakestArea.color}12`,
                    }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: weakestArea.color }}>
                      Cần ưu tiên
                    </p>
                    <p className="mt-3 text-lg font-semibold text-slate-900">
                      {getLifeAreaLabel(weakestArea.name)}
                    </p>
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
                  <CardDescription>Đánh giá lại từng khía cạnh từ 1 đến 10 theo cảm nhận trung thực nhất của bạn.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {lifeAreas.map((area, index) => (
                    <div
                      key={area.name}
                      className="rounded-[24px] border border-white/70 bg-white/72 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-4 w-4 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.85)] dark:shadow-[0_0_0_6px_rgba(0,0,0,0.35)]"
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
                    <div className="rounded-[24px] border border-white/70 bg-white/72 py-12 text-center text-slate-500">
                      <Calendar className="mx-auto mb-3 h-12 w-12 opacity-50" />
                      <p>Đang mở biểu đồ lịch sử...</p>
                      <p className="mt-1 text-sm">Dữ liệu xu hướng sẽ hiện ra ngay sau khi tải xong.</p>
                    </div>
                  }
                >
                  <LifeBalanceHistoryChart data={historicalData} />
                </Suspense>
              ) : (
                <div className="rounded-[24px] border border-white/70 bg-white/72 py-12 text-center text-slate-500">
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
