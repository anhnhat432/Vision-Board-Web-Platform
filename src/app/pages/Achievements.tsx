import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Award,
  BookOpen,
  Crown,
  Flame,
  Sparkles,
  Target,
  Trophy,
  LucideIcon,
  LockKeyhole,
  ArrowRight,
} from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import { InteractiveSurface } from "../components/ui/interactive-surface";
import { Reveal } from "../components/ui/reveal";
import { calculateGoalProgress, getUserData, UserData } from "../utils/storage";

const ICON_MAP: Record<string, LucideIcon> = {
  Target,
  Trophy,
  Award,
  Crown,
  Sparkles,
  BookOpen,
  Flame,
};

const ACHIEVEMENT_COPY: Record<string, { title: string; description: string; icon: keyof typeof ICON_MAP }> = {
  "First Step": {
    title: "Bước Đầu Tiên",
    description: "Tạo mục tiêu đầu tiên của bạn.",
    icon: "Target",
  },
  "Goal Setter": {
    title: "Người Đặt Mục Tiêu",
    description: "Tạo 5 mục tiêu trong hành trình của bạn.",
    icon: "Trophy",
  },
  Achiever: {
    title: "Người Hoàn Thành",
    description: "Hoàn thành mục tiêu đầu tiên của bạn.",
    icon: "Award",
  },
  "Master Achiever": {
    title: "Bậc Thầy Hoàn Thành",
    description: "Hoàn thành 5 mục tiêu và giữ vững đà phát triển.",
    icon: "Crown",
  },
  Visionary: {
    title: "Người Tầm Nhìn",
    description: "Tạo bảng tầm nhìn đầu tiên của bạn.",
    icon: "Sparkles",
  },
  "Reflective Mind": {
    title: "Tâm Trí Suy Ngẫm",
    description: "Viết bài nhật ký phản tư đầu tiên.",
    icon: "BookOpen",
  },
  Dedicated: {
    title: "Bền Bỉ",
    description: "Duy trì 30 ngày viết nhật ký phản tư.",
    icon: "Flame",
  },
};

const ACHIEVEMENT_ORDER = Object.keys(ACHIEVEMENT_COPY);

export function Achievements() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const data = getUserData();
    setUserData(data);
  }, []);

  const sortedAchievements = useMemo(() => {
    if (!userData) return [];
    return [...userData.achievements].sort(
      (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime(),
    );
  }, [userData]);

  const lockedAchievements = useMemo(() => {
    if (!userData) return [];
    const unlockedSet = new Set(userData.achievements.map((achievement) => achievement.title));
    return ACHIEVEMENT_ORDER.filter((key) => !unlockedSet.has(key)).map((key) => ({
      key,
      ...ACHIEVEMENT_COPY[key],
    }));
  }, [userData]);

  if (!userData) return null;

  const completedGoals = userData.goals.filter(
    (goal) => calculateGoalProgress(goal) === 100,
  ).length;
  const completionRate = Math.round(
    (userData.achievements.length / ACHIEVEMENT_ORDER.length) * 100,
  );
  const latestAchievement = sortedAchievements[0];

  return (
    <div className="space-y-8 pb-12">
      <InteractiveSurface className="rounded-[28px]" intensity={9} translate={22}>
        <Card interactive={false} className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="interactive-layer interactive-layer--medium relative p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="space-y-6">
              <div className="interactive-layer interactive-layer--soft inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Trophy className="h-4 w-4" />
                Trophy Room
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                  Mọi cột mốc nhỏ bạn mở khóa ở đây đều là bằng chứng rằng hành trình đang thật sự diễn ra.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                  Thành tựu không chỉ là huy hiệu. Chúng là những mốc xác nhận bạn đã bắt đầu,
                  đã duy trì, đã hoàn thành và đang trưởng thành theo cách có thể nhìn thấy được.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="border-white/18 bg-white text-slate-900 hover:bg-white/92"
                  onClick={() => navigate("/goals")}
                >
                  Tiếp tục mục tiêu
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="border-white/18 bg-white/12 text-white hover:bg-white/18 hover:text-white"
                  onClick={() => navigate("/gallery")}
                >
                  Mở thư viện tầm nhìn
                </Button>
              </div>
            </div>

            <div className="interactive-layer interactive-layer--strong rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                Tình trạng hiện tại
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Đã mở khóa</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    <CountUp value={userData.achievements.length} />
                    <span className="text-white/68">/{ACHIEVEMENT_ORDER.length}</span>
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Tiến độ bộ sưu tập</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    <CountUp value={completionRate} suffix="%" />
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Mới nhất</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {latestAchievement
                      ? (ACHIEVEMENT_COPY[latestAchievement.title]?.title ?? latestAchievement.title)
                      : "Chưa có thành tựu nào"}
                  </p>
                  <p className="mt-1 text-sm text-white/68">
                    {latestAchievement
                      ? `Đạt được ${new Date(latestAchievement.earnedAt).toLocaleDateString("vi-VN")}`
                      : "Hãy hành động để mở huy hiệu đầu tiên."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </InteractiveSurface>

      <Reveal>
        <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Tổng thành tựu",
            value: userData.achievements.length,
            note: "huy hiệu đã mở khóa",
            icon: Trophy,
            color: "from-amber-500/18 to-orange-500/10 text-amber-700",
          },
          {
            title: "Mục tiêu hoàn thành",
            value: completedGoals,
            note: "goal đã đi trọn hành trình",
            icon: Target,
            color: "from-violet-500/18 to-fuchsia-500/10 text-violet-700",
          },
          {
            title: "Board tầm nhìn",
            value: userData.visionBoards.length,
            note: "bảng đã tạo",
            icon: Sparkles,
            color: "from-sky-500/18 to-cyan-500/10 text-sky-700",
          },
          {
            title: "Nhật ký phản tư",
            value: userData.reflections.length,
            note: "bài viết đã lưu",
            icon: BookOpen,
            color: "from-emerald-500/18 to-teal-500/10 text-emerald-700",
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
                      <CountUp value={item.value} />
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

      {sortedAchievements.length === 0 ? (
        <Reveal delay={0.04}>
          <Card className="overflow-hidden">
          <CardContent className="p-10 text-center lg:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-amber-50 text-amber-700">
              <Trophy className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900">Chưa có huy hiệu nào được mở khóa</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
              Cột mốc đầu tiên thường đến rất nhanh. Hãy bắt đầu bằng một mục tiêu, một board tầm nhìn hoặc một bài viết phản tư.
            </p>
          </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={0.04} className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Đã mở khóa</h2>
            <p className="mt-1 text-sm text-slate-500">Những cột mốc bạn đã thực sự chạm tới trên hành trình này.</p>
          </div>

          <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedAchievements.map((achievement, index) => {
              const localized = ACHIEVEMENT_COPY[achievement.title] ?? {
                title: achievement.title,
                description: achievement.description,
                icon: achievement.icon as keyof typeof ICON_MAP,
              };
              const Icon = ICON_MAP[localized.icon] ?? Trophy;

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,_rgba(245,158,11,0.14)_0%,_rgba(249,115,22,0.12)_100%)] text-amber-700 shadow-[0_18px_36px_-28px_rgba(245,158,11,0.42)]">
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold text-slate-900">{localized.title}</h3>
                            <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                              Đã mở khóa
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{localized.description}</p>
                          <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                            {new Date(achievement.earnedAt).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.08}>
        <Card>
        <CardHeader>
          <CardTitle>Còn đang chờ mở khóa</CardTitle>
          <CardDescription>Những cột mốc tiếp theo để bạn có thêm động lực và hướng tiến rõ ràng.</CardDescription>
        </CardHeader>
        <CardContent>
          {lockedAchievements.length === 0 ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-900">
              Bạn đã mở khóa toàn bộ bộ thành tựu hiện có. Đây là một cột mốc rất đẹp.
            </div>
          ) : (
            <div className="stagger-hover-grid grid grid-cols-1 gap-4 md:grid-cols-2">
              {lockedAchievements.map((achievement) => {
                const Icon = ICON_MAP[achievement.icon] ?? Trophy;

                return (
                  <div
                    key={achievement.key}
                    className="flex items-start gap-4 rounded-[24px] border border-white/70 bg-white/72 p-5"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-100 text-slate-400">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-700">{achievement.title}</h4>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-500">
                          <LockKeyhole className="mr-1 h-3.5 w-3.5" />
                          Locked
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{achievement.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
