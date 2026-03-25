import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Images,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  calculateGoalProgress,
  formatCalendarDate,
  getLifeAreaLabel,
  getRandomMotivationalQuote,
  getUserData,
  sortReflectionsByDateDesc,
  UserData,
} from "../utils/storage";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import { InteractiveSurface } from "../components/ui/interactive-surface";
import { Progress } from "../components/ui/progress";
import { Reveal } from "../components/ui/reveal";

export function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const data = getUserData();
    setUserData(data);
    setQuote(getRandomMotivationalQuote());
  }, []);

  if (!userData) return null;

  const recentGoals = userData.goals.slice(0, 3);
  const recentReflections = sortReflectionsByDateDesc(userData.reflections).slice(0, 2);
  const latestVisionBoard = userData.visionBoards[userData.visionBoards.length - 1];
  const completedGoalsCount = userData.goals.filter(
    (goal) => calculateGoalProgress(goal) === 100,
  ).length;
  const totalTasks = userData.goals.reduce((sum, goal) => sum + goal.tasks.length, 0);
  const completedTasks = userData.goals.reduce(
    (sum, goal) => sum + goal.tasks.filter((task) => task.completed).length,
    0,
  );
  const averageLifeScore =
    userData.currentWheelOfLife.reduce((sum, area) => sum + area.score, 0) /
    userData.currentWheelOfLife.length;
  const weakestArea = [...userData.currentWheelOfLife].sort((a, b) => a.score - b.score)[0];

  const radarData = userData.currentWheelOfLife.map((area) => ({
    subject: getLifeAreaLabel(area.name),
    value: area.score,
    fullMark: 10,
  }));

  return (
    <div className="space-y-8 pb-12">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <InteractiveSurface className="rounded-[28px]" intensity={9} translate={22}>
            <Card interactive={false} className="hero-surface relative overflow-hidden border-0 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-80" />
            <CardContent className="interactive-layer interactive-layer--medium relative p-8 lg:p-10">
              <div className="interactive-layer interactive-layer--soft flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/75">
                  Vision Board
                </span>
                {latestVisionBoard && (
                  <span className="rounded-full border border-white/16 bg-white/10 px-4 py-1.5 text-sm text-white/85">
                    Board mới nhất: {latestVisionBoard.name}
                  </span>
                )}
              </div>

              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_300px]">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h2 className="max-w-2xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                      Chào mừng trở lại với hành trình bạn đang kiến tạo.
                    </h2>
                    <p className="max-w-2xl text-base leading-8 text-white/84 lg:text-lg">
                      "{quote}"
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className="border-white/15 bg-white text-slate-900 hover:bg-white/92"
                      onClick={() => navigate("/goals")}
                    >
                      Tiếp tục mục tiêu
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/22 bg-white/12 text-white hover:bg-white/18 hover:text-white"
                      onClick={() => navigate("/gallery")}
                    >
                      Mở thư viện tầm nhìn
                    </Button>
                  </div>
                </div>

                <div className="interactive-layer interactive-layer--strong rounded-[28px] border border-white/15 bg-white/12 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                    Tổng quan nhanh
                  </p>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Mục tiêu mở</p>
                      <p className="mt-1 text-3xl font-bold">
                        <CountUp value={userData.goals.length} />
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Điểm cân bằng</p>
                      <p className="mt-1 text-3xl font-bold">
                        <CountUp value={averageLifeScore} precision={1} />
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Hoàn thành task</p>
                      <p className="mt-1 text-3xl font-bold">
                        <CountUp value={completedTasks} />
                        <span className="ml-2 text-base font-medium text-white/62">/ {totalTasks}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </InteractiveSurface>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full overflow-hidden">
            <CardHeader>
              <CardTitle>Nhịp phát triển hiện tại</CardTitle>
              <CardDescription>Nhìn nhanh vào trạng thái và ưu tiên tiếp theo của bạn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[22px] border border-white/70 bg-white/68 p-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.42)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Trung bình bánh xe
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-4xl font-bold text-slate-900">
                      <CountUp value={averageLifeScore} precision={1} />
                    </span>
                    <span className="pb-1 text-sm text-slate-400">/10</span>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/70 bg-white/68 p-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.42)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Ưu tiên ngay
                    </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {getLifeAreaLabel(weakestArea.name)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Điểm hiện tại: {weakestArea.score}/10</p>
                </div>
              </div>

              <div className="rounded-[24px] bg-[linear-gradient(135deg,_rgba(15,23,42,0.96)_0%,_rgba(59,130,246,0.86)_100%)] p-5 text-white shadow-[0_28px_55px_-28px_rgba(15,23,42,0.62)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                      Tầm nhìn gần nhất
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {latestVisionBoard ? latestVisionBoard.name : "Chưa có board nào"}
                    </p>
                    <p className="mt-1 text-sm text-white/72">
                      {latestVisionBoard
                        ? `Năm ${latestVisionBoard.year} • ${latestVisionBoard.items.length} phần tử`
                        : "Hãy tạo một bảng tầm nhìn mới để trực quan hóa điều bạn đang hướng tới."}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
                    <Images className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-white/18 bg-white/12 text-white hover:bg-white/18 hover:text-white"
                    onClick={() => navigate("/life-insight")}
                  >
                    Xem ưu tiên
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/18 bg-white text-slate-900 hover:bg-white/92"
                    onClick={() => navigate("/vision-board")}
                  >
                    Tạo board mới
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Reveal>
        <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Mục tiêu đang thực hiện",
            value: userData.goals.length,
            note: `${completedGoalsCount} đã hoàn thành`,
            icon: Target,
            color: "from-violet-500/18 to-fuchsia-500/10 text-violet-700",
          },
          {
            title: "Nhiệm vụ hoàn thành",
            value: completedTasks,
            note: `trên tổng số ${totalTasks}`,
            icon: TrendingUp,
            color: "from-emerald-500/18 to-teal-500/10 text-emerald-700",
          },
          {
            title: "Thành tựu",
            value: userData.achievements.length,
            note: "huy hiệu đã mở khóa",
            icon: Award,
            color: "from-amber-500/18 to-orange-500/10 text-amber-700",
          },
          {
            title: "Nhật ký",
            value: userData.reflections.length,
            note: "bài viết đã lưu lại",
            icon: BookOpen,
            color: "from-sky-500/18 to-cyan-500/10 text-sky-700",
          },
        ].map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 + index * 0.08 }}
            >
              <InteractiveSurface className="rounded-[28px]" intensity={5} translate={10}>
                <Card interactive={false} className="relative overflow-hidden">
                  <div className={`absolute inset-x-5 top-0 h-20 rounded-b-[28px] bg-gradient-to-br ${item.color} blur-2xl`} />
                  <CardHeader className="relative flex flex-row items-start justify-between pb-3">
                    <div>
                      <CardDescription>{item.title}</CardDescription>
                      <CardTitle className="mt-2 text-4xl">
                        <CountUp value={item.value} />
                      </CardTitle>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-sm text-slate-500">{item.note}</p>
                  </CardContent>
                </Card>
              </InteractiveSurface>
            </motion.div>
          );
        })}
        </div>
      </Reveal>

      {userData.isHydratedFromDemo && (
        <Reveal delay={0.02}>
          <div className="flex flex-wrap items-center gap-4 rounded-[22px] border border-amber-200 bg-amber-50/90 px-5 py-4 shadow-[0_8px_24px_-16px_rgba(245,158,11,0.28)]">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Dữ liệu đang hiển thị là ví dụ demo</p>
              <p className="mt-0.5 text-sm text-amber-700">
                Cập nhật bánh xe cuộc sống của bạn để thay dữ liệu mẫu bằng thông tin thật của bạn.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
              onClick={() => navigate("/life-balance")}
            >
              Cập nhật ngay
            </Button>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.04}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="h-full overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Cân bằng cuộc sống</CardTitle>
                  <CardDescription>Bức tranh tổng quan của bánh xe cuộc đời hiện tại.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/life-balance")}>
                  Xem chi tiết
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#dbe3f1" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#546071" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Radar
                    name="Điểm"
                    dataKey="value"
                    stroke="#7c3aed"
                    fill="#7c3aed"
                    fillOpacity={0.55}
                  />
                </RadarChart>
              </ResponsiveContainer>

              <div className="mt-4 rounded-[24px] border border-violet-200/70 bg-violet-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-violet-900">Ưu tiên cải thiện hiện tại</p>
                    <p className="text-sm text-violet-700">
                      Tập trung vào {getLifeAreaLabel(weakestArea.name)} để kéo toàn bộ bánh xe cân bằng hơn.
                    </p>
                  </div>
                  <Button onClick={() => navigate("/life-insight")}>Cải thiện ngay</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Mục tiêu gần đây</CardTitle>
                  <CardDescription>Các mục tiêu mới nhất và tiến độ đang diễn ra.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/goals")}>
                  <Plus className="h-4 w-4" />
                  Thêm mục tiêu
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentGoals.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center text-slate-500">
                  <Target className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p>Chưa có mục tiêu nào. Hãy bắt đầu bằng mục tiêu đầu tiên của bạn.</p>
                  <Button className="mt-5" onClick={() => navigate("/goals")}>
                    Tạo mục tiêu
                  </Button>
                </div>
              ) : (
                recentGoals.map((goal) => {
                  const progress = calculateGoalProgress(goal);

                  return (
                    <div
                      key={goal.id}
                      className="rounded-[24px] border border-white/70 bg-white/65 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.32)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-semibold text-slate-900">{goal.title}</h4>
                          <p className="mt-1 text-sm text-slate-500">
                            {getLifeAreaLabel(goal.category)}
                          </p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">
                          <CountUp value={progress} suffix="%" />
                        </span>
                      </div>
                      <Progress value={progress} className="mt-4 h-2.5" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>Nhảy vào đúng công việc bạn muốn làm chỉ trong một chạm.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="stagger-hover-grid grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-auto min-h-36 flex-col items-start gap-4 rounded-[28px] px-6 py-6 text-left"
                onClick={() => navigate("/vision-board")}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Tạo bảng tầm nhìn</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Xây dựng một không gian trực quan cho điều bạn đang theo đuổi.
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto min-h-36 flex-col items-start gap-4 rounded-[28px] px-6 py-6 text-left"
                onClick={() => navigate("/goals")}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Theo dõi mục tiêu</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Cập nhật tiến độ, chia nhỏ công việc và giữ nhịp thực thi đều đặn.
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto min-h-36 flex-col items-start gap-4 rounded-[28px] px-6 py-6 text-left"
                onClick={() => navigate("/journal")}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Viết nhật ký</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Lưu lại bài học, cảm xúc và những chuyển động nhỏ mỗi ngày.
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {recentReflections.length > 0 && (
        <Reveal delay={0.1}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Nhật ký gần đây</CardTitle>
                  <CardDescription>Những suy ngẫm mới nhất trên hành trình phát triển của bạn.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/journal")}>
                  Xem tất cả
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentReflections.map((reflection) => (
                <div
                  key={reflection.id}
                  className="rounded-[24px] border border-white/70 bg-white/65 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.32)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <h4 className="font-semibold text-slate-900">{reflection.title}</h4>
                    <span className="text-xs font-medium text-slate-400">
                      {formatCalendarDate(reflection.date)}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-slate-600">{reflection.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  );
}
