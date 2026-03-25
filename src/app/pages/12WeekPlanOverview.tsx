import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { ArrowRight, CalendarDays, LayoutGrid, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import {
  APP_STORAGE_KEYS,
  Goal,
  getFeasibilityResultLabel,
  getLifeAreaLabel,
  getReviewDayLabel,
  getUserData,
} from "../utils/storage";

export function TwelveWeekPlanOverview() {
  const navigate = useNavigate();
  const hasInitializedRef = useRef(false);
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const goalId =
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekPlanGoalId) ??
      localStorage.getItem(APP_STORAGE_KEYS.latest12WeekGoalId);
    if (!goalId) {
      navigate("/goals");
      return;
    }

    const data = getUserData();
    const matchedGoal = data.goals.find((item) => item.id === goalId && item.twelveWeekPlan);

    if (!matchedGoal) {
      navigate("/goals");
      return;
    }

    setGoal(matchedGoal);
  }, [navigate]);

  if (!goal || !goal.twelveWeekPlan) return null;

  const weekProgress = Math.round((goal.twelveWeekPlan.currentWeek / goal.twelveWeekPlan.totalWeeks) * 100);

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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_22%)] opacity-90" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_340px]">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Sparkles className="h-4 w-4" />
                  12-Week Plan Ready
                </div>
                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Kế hoạch 12 tuần của bạn đã sẵn sàng để chuyển từ ý tưởng sang nhịp thực thi.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Đây là bức tranh cô đọng nhất của kế hoạch: mục tiêu, kết quả tuần 12, các hành động lặp lại
                    và chỉ số giúp bạn kiểm tra mình có đang đi đúng hướng hay không.
                  </p>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                  Tiến độ hiện tại
                </p>
                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Tuần hiện tại</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {goal.twelveWeekPlan.currentWeek}/{goal.twelveWeekPlan.totalWeeks}
                  </p>
                </div>
                <div className="mt-4 rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <div className="flex items-center justify-between text-sm text-white/72">
                    <span>Tiến độ theo tuần</span>
                    <span className="font-semibold text-white">{weekProgress}%</span>
                  </div>
                  <Progress value={weekProgress} className="mt-3 h-2.5 bg-white/20" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bức tranh tổng quan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full border-white/70 bg-white/72 px-4 py-2">
                  <Target className="mr-1 h-3.5 w-3.5" />
                  {getLifeAreaLabel(goal.focusArea || goal.category)}
                </Badge>
                {goal.feasibilityResult && (
                  <Badge variant="outline" className="rounded-full border-white/70 bg-white/72 px-4 py-2">
                    <CalendarDays className="mr-1 h-3.5 w-3.5" />
                    {getFeasibilityResultLabel(goal.feasibilityResult)}
                  </Badge>
                )}
              </div>

              <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mục tiêu SMART</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{goal.title}</p>
              </div>

              <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Kết quả tuần 12</p>
                <p className="mt-2 text-base leading-7 text-slate-700">{goal.twelveWeekPlan.week12Outcome}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nhịp hành động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
                <div className="flex items-center gap-2 text-violet-700">
                  <LayoutGrid className="h-4 w-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">Hành động hàng tuần</p>
                </div>
                <div className="mt-4 space-y-3">
                  {goal.twelveWeekPlan.weeklyActions.map((action, index) => (
                    <div
                      key={`${goal.id}_action_${index}`}
                      className="rounded-[20px] border border-white/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-700"
                    >
                      {action}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Chỉ số thành công</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{goal.twelveWeekPlan.successMetric}</p>
                </div>
                <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ngày review</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {getReviewDayLabel(goal.twelveWeekPlan.reviewDay)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button className="w-full sm:w-auto" onClick={() => navigate("/goals")}>
          Đi tới Theo Dõi Mục Tiêu
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
