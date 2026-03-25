import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  Compass,
  Save,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import { Reveal } from "../components/ui/reveal";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  LIFE_AREAS,
  LifeArea,
  UserData,
  getLifeAreaLabel,
  getUserData,
  updateWheelOfLife,
} from "../utils/storage";

export function LifeBalance() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = getUserData();
    setUserData(data);
    setLifeAreas([...data.currentWheelOfLife]);
    setHasChanges(false);
  };

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

  const historicalData = useMemo(() => {
    if (!userData) return [];
    return userData.wheelOfLifeHistory.slice(-6).map((record) => {
      const dataPoint: Record<string, string | number> = {
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

  if (!userData || !strongestArea || !weakestArea) return null;

  return (
    <div className="space-y-8 pb-12">
      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="relative p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Compass className="h-4 w-4" />
                Life Balance Center
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
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
                    className="border-white/18 bg-white text-slate-900 hover:bg-white/92"
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

            <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
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
            color: "from-violet-500/18 to-fuchsia-500/10 text-violet-700",
          },
          {
            title: "Điểm cao nhất",
            value: strongestArea.score,
            note: getLifeAreaLabel(strongestArea.name),
            icon: Sparkles,
            color: "from-emerald-500/18 to-teal-500/10 text-emerald-700",
          },
          {
            title: "Điểm thấp nhất",
            value: weakestArea.score,
            note: getLifeAreaLabel(weakestArea.name),
            icon: Compass,
            color: "from-amber-500/18 to-orange-500/10 text-amber-700",
          },
          {
            title: "Lần đo đã lưu",
            value: userData.wheelOfLifeHistory.length,
            note: "mốc lịch sử hiện có",
            icon: Calendar,
            color: "from-sky-500/18 to-cyan-500/10 text-sky-700",
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Bánh xe cuộc đời</CardTitle>
                <CardDescription>
                  Một góc nhìn trực quan để thấy toàn bộ hệ thống cuộc sống của bạn đang cân bằng ra sao.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={420}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#dbe3f1" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#5b6473", fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: "#94a3b8" }} />
                    <Radar
                      name="Điểm"
                      dataKey="value"
                      stroke="#7c3aed"
                      fill="#7c3aed"
                      fillOpacity={0.55}
                    />
                  </RadarChart>
                </ResponsiveContainer>

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
                            className="h-4 w-4 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.85)]"
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
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    {LIFE_AREAS.map((area) => (
                      <Line
                        key={area.name}
                        type="monotone"
                        dataKey={getLifeAreaLabel(area.name)}
                        stroke={area.color}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
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
