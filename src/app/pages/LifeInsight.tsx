import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Compass,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { SimpleRadarChart } from "../components/SimpleRadarChart";
import {
  APP_STORAGE_KEYS,
  LifeArea,
  clearGoalPlanningDrafts,
  getLifeAreaLabel,
  getUserData,
} from "../utils/storage";

export function LifeInsight() {
  const navigate = useNavigate();
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([]);

  useEffect(() => {
    const data = getUserData();
    setLifeAreas(data.currentWheelOfLife);
  }, []);

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

  const radarData = useMemo(
    () =>
      lifeAreas.map((area) => ({
        subject: getLifeAreaLabel(area.name),
        value: area.score,
        fullMark: 10,
      })),
    [lifeAreas],
  );

  if (!lowestArea || !strongestArea) return null;

  const handleStartGoalSetup = () => {
    clearGoalPlanningDrafts();
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, lowestArea.name);
    navigate("/smart-goal-setup");
  };

  return (
    <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-6xl space-y-6"
      >
        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.1),_transparent_24%)] opacity-90" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_360px]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Life Insight
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Bạn đã có một tín hiệu rất rõ về nơi mình nên ưu tiên tiếp theo.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Dựa trên bánh xe cuộc sống hiện tại, hệ thống đang chỉ ra một khu vực cần được
                    chăm sóc nhiều hơn để kéo toàn bộ hành trình của bạn cân bằng và mạnh hơn.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    Ưu tiên: {getLifeAreaLabel(lowestArea.name)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />
                    Điểm trung bình: {averageScore.toFixed(1)}/10
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-white/18 bg-white text-slate-900 hover:bg-white/92"
                    onClick={handleStartGoalSetup}
                  >
                    Tạo mục tiêu
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/18 bg-white/12 text-white hover:bg-white/18 hover:text-white"
                    onClick={() => navigate("/")}
                  >
                    Về bảng điều khiển
                  </Button>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                  Snapshot hiện tại
                </p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Cần ưu tiên</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {getLifeAreaLabel(lowestArea.name)}
                    </p>
                    <p className="mt-1 text-sm text-white/68">{lowestArea.score}/10</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Điểm mạnh hiện tại</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {getLifeAreaLabel(strongestArea.name)}
                    </p>
                    <p className="mt-1 text-sm text-white/68">{strongestArea.score}/10</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Thông điệp</p>
                    <p className="mt-2 text-sm leading-7 text-white/74">
                      Đừng cố sửa mọi thứ cùng lúc. Chỉ cần chọn một điểm yếu nhất, rồi biến nó
                      thành một hướng đi đủ rõ để hành động.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Bức tranh tổng thể của bạn</CardTitle>
              <CardDescription>
                Biểu đồ này cho thấy toàn bộ bánh xe cuộc sống hiện tại để bạn không nhìn một chiều.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleRadarChart className="mx-auto max-w-[460px]" data={radarData} height={340} fillOpacity={0.2} />

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div
                  className="rounded-[24px] border p-4"
                  style={{
                    borderColor: `${lowestArea.color}33`,
                    background: `${lowestArea.color}12`,
                  }}
                >
                  <div className="flex items-center gap-2" style={{ color: lowestArea.color }}>
                    <TrendingDown className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Nút thắt hiện tại</p>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    {getLifeAreaLabel(lowestArea.name)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Đây là khu vực nên trở thành trọng tâm tiếp theo của bạn.
                  </p>
                </div>

                <div
                  className="rounded-[24px] border p-4"
                  style={{
                    borderColor: `${strongestArea.color}33`,
                    background: `${strongestArea.color}12`,
                  }}
                >
                  <div className="flex items-center gap-2" style={{ color: strongestArea.color }}>
                    <Sparkles className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Lực đỡ hiện có</p>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    {getLifeAreaLabel(strongestArea.name)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Bạn có thể tận dụng sự tự tin ở đây để kéo khu vực đang yếu lên cùng.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 xl:sticky xl:top-28">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-violet-50 text-violet-700">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Bước tiếp theo</h3>
                    <p className="text-sm text-slate-500">
                      Chúng ta sẽ biến insight này thành một mục tiêu SMART đủ rõ để hành động.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    "Chọn đúng một lĩnh vực để tập trung.",
                    "Biến nó thành mục tiêu cụ thể, đo được và có thời hạn.",
                    "Tiếp tục sang feasibility rồi hệ 12 tuần.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[20px] border border-white/70 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <Button className="mt-6 w-full" onClick={handleStartGoalSetup}>
                  Tạo mục tiêu
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
