import { ArrowDown, ArrowUp, BarChart3, CalendarDays, Flag, Lock, Minus, TrendingUp } from "lucide-react";

import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
import type { TwelveWeekSystem } from "../../utils/storage-types";
import type {
  HeatmapCell,
  TacticBreakdownItem,
  WeekTrendPoint,
} from "../../utils/twelve-week-system-ui";

interface WeekRange {
  start: string;
  end: string;
}

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
}

interface MilestoneItem {
  label: string;
  value: string;
}

interface TwelveWeekProgressTabProps {
  system: TwelveWeekSystem;
  currentWeek: number;
  currentWeekRange: WeekRange | null;
  currentWeekScoreValue: number;
  averageScore: number;
  reviewDoneCount: number;
  weekCompletion: WeekCompletionSummary;
  milestoneItems: MilestoneItem[];
  hasAdvancedAnalytics: boolean;
  executionHeatmap: HeatmapCell[];
  weeklyTrend: WeekTrendPoint[];
  tacticBreakdown: TacticBreakdownItem[];
}

export function TwelveWeekProgressTab({
  system,
  currentWeek,
  currentWeekRange,
  currentWeekScoreValue,
  averageScore,
  reviewDoneCount,
  weekCompletion,
  milestoneItems,
  hasAdvancedAnalytics,
  executionHeatmap,
  weeklyTrend,
  tacticBreakdown,
}: TwelveWeekProgressTabProps) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.94)_100%)] text-white shadow-[0_30px_70px_-40px_rgba(15,23,42,0.7)]"
        >
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Tuần đang chạy</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-white">Tuần {currentWeek}</p>
                <p className="mt-1 text-sm text-white/68">
                  {currentWeekRange
                    ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                    : "Đang cập nhật phạm vi tuần"}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(219,234,254,0.94)_0%,_rgba(191,219,254,0.78)_100%)] shadow-[0_24px_60px_-36px_rgba(37,99,235,0.26)]"
        >
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Điểm hiện tại</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-slate-950">{currentWeekScoreValue}</p>
                <p className="mt-1 text-sm text-slate-600">Trung bình toàn chu kỳ: {averageScore}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 text-sky-700">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(236,253,245,0.95)_0%,_rgba(209,250,229,0.82)_100%)] shadow-[0_24px_60px_-36px_rgba(5,150,105,0.22)]"
        >
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Review đã khóa</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-slate-950">
                  {reviewDoneCount}/{system.totalWeeks}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {weekCompletion.completed}/{weekCompletion.total} việc tuần này đã xong
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 text-emerald-700">
                <Flag className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.95)_100%)] text-white shadow-[0_34px_80px_-42px_rgba(15,23,42,0.72)]"
        >
          <CardHeader>
            <CardTitle className="text-white">Bảng điểm 12 tuần</CardTitle>
            <CardDescription className="text-white/68">
              Mỗi tuần được chấm từ hành vi thật: mức hoàn thành việc cốt lõi, check-in, hoàn thành đúng lịch và việc đã
              chốt review hay chưa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[24px] border border-sky-300/22 bg-[linear-gradient(135deg,_rgba(14,116,144,0.28)_0%,_rgba(30,41,59,0.14)_100%)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Tuần {currentWeek} đang là trọng tâm</p>
                  <p className="mt-1 text-sm text-white/68">
                    Ưu tiên giữ nhịp việc cốt lõi và chốt review vào {getReviewDayLabel(system.reviewDay)}.
                  </p>
                </div>
                <Badge className="border-white/12 bg-white/10 text-white hover:bg-white/10">
                  {currentWeekScoreValue} điểm
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {system.scoreboard.map((week) => (
                <div
                  key={week.weekNumber}
                  className={`rounded-[24px] border p-5 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.35)] ${
                    week.weekNumber === currentWeek
                      ? "border-sky-300/22 bg-[linear-gradient(135deg,_rgba(8,47,73,0.95)_0%,_rgba(3,105,161,0.88)_100%)]"
                      : week.reviewDone
                        ? "border-emerald-300/20 bg-[linear-gradient(180deg,_rgba(6,78,59,0.3)_0%,_rgba(255,255,255,0.05)_100%)]"
                        : "border-white/10 bg-white/6"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                          week.weekNumber === currentWeek ? "text-sky-100" : "text-white/55"
                        }`}
                      >
                        Tuần {week.weekNumber}
                      </p>
                      <p
                        className={`mt-2 text-3xl font-bold ${
                          week.weekNumber === currentWeek ? "text-white" : "text-slate-100"
                        }`}
                      >
                        {week.weeklyScore}
                      </p>
                    </div>
                    <Badge
                      variant={week.reviewDone ? "default" : "outline"}
                      className={
                        week.weekNumber === currentWeek
                          ? "border-white/15 bg-white/10 text-white hover:bg-white/10"
                          : week.reviewDone
                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                            : "border-white/12 bg-transparent text-white/80"
                      }
                    >
                      {week.weekNumber === currentWeek ? "Đang chạy" : week.reviewDone ? "Đã review" : "Chưa review"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div
                        className={`flex items-center justify-between text-sm ${
                          week.weekNumber === currentWeek ? "text-sky-100/88" : "text-white/68"
                        }`}
                      >
                        <span>Hoàn thành cốt lõi</span>
                        <span
                          className={`font-semibold ${
                            week.weekNumber === currentWeek ? "text-white" : "text-slate-100"
                          }`}
                        >
                          {week.leadCompletionPercent}%
                        </span>
                      </div>
                      <Progress
                        value={week.leadCompletionPercent}
                        className={`mt-2 h-2.5 ${week.weekNumber === currentWeek ? "bg-white/18" : "bg-white/10"}`}
                      />
                    </div>

                    <div
                      className={`rounded-2xl border px-4 py-3 ${
                        week.weekNumber === currentWeek ? "border-white/12 bg-black/16" : "border-white/10 bg-white/8"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                          week.weekNumber === currentWeek ? "text-sky-100/76" : "text-white/55"
                        }`}
                      >
                        Chỉ số chính
                      </p>
                      <p
                        className={`mt-1 text-sm font-medium ${
                          week.weekNumber === currentWeek ? "text-white" : "text-slate-100"
                        }`}
                      >
                        {week.mainMetricProgress || "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card
          interactive={false}
          className="border-0 bg-[linear-gradient(180deg,_rgba(226,232,240,0.94)_0%,_rgba(203,213,225,0.84)_100%)] shadow-[0_28px_70px_-38px_rgba(15,23,42,0.28)]"
        >
          <CardHeader>
            <CardTitle className="text-slate-950">Cột mốc và đích đến</CardTitle>
            <CardDescription className="text-slate-700">
              Phần này giúp bạn nhìn lại những mốc quan trọng của chu kỳ thay vì chỉ nhìn điểm số.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-white/45 bg-white/62 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <div className="space-y-5">
                {milestoneItems.map((item, index) => {
                  const isLastItem = index === milestoneItems.length - 1;

                  return (
                    <div key={item.label} className={`relative pl-12 ${isLastItem ? "" : "pb-5"}`}>
                      {!isLastItem && <div className="absolute left-[17px] top-9 h-full w-px bg-slate-300/70" />}
                      <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── B4: Premium Analytics Section ── */}
      {hasAdvancedAnalytics ? (
        <div className="space-y-6">
          {/* Execution Heatmap */}
          {executionHeatmap.length > 0 && (
            <Card
              interactive={false}
              className="border-0 bg-[linear-gradient(180deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.95)_100%)] text-white shadow-[0_34px_80px_-42px_rgba(15,23,42,0.72)]"
            >
              <CardHeader>
                <CardTitle className="text-white">Bản đồ thực thi</CardTitle>
                <CardDescription className="text-white/68">
                  Mỗi ô là một ngày. Xanh đậm = hoàn thành tốt, nhạt = chưa xong hết, trống = không có việc.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex gap-1 pl-10">
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                      <div key={d} className="w-9 text-center text-[10px] font-medium text-white/45">
                        {d}
                      </div>
                    ))}
                  </div>
                  {Array.from({ length: system.totalWeeks }, (_, w) => {
                    const week = w + 1;
                    const cells = executionHeatmap.filter((c) => c.weekNumber === week);
                    return (
                      <div key={week} className="flex items-center gap-1">
                        <span className="w-8 text-right text-[10px] font-medium text-white/45">T{week}</span>
                        {cells.map((cell) => {
                          const bg =
                            cell.total === 0
                              ? "bg-white/6"
                              : cell.percent >= 80
                                ? "bg-emerald-500"
                                : cell.percent >= 50
                                  ? "bg-emerald-500/50"
                                  : cell.percent > 0
                                    ? "bg-amber-500/50"
                                    : "bg-rose-500/40";
                          return (
                            <div
                              key={cell.dateKey}
                              className={`h-9 w-9 rounded-lg ${bg} ${week === currentWeek ? "ring-1 ring-sky-400/40" : ""}`}
                              title={`${cell.dateKey}: ${cell.completed}/${cell.total} xong`}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                  <div className="mt-3 flex items-center gap-3 text-[10px] text-white/55">
                    <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-500" /> ≥80%</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-500/50" /> 50–79%</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-500/50" /> 1–49%</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-rose-500/40" /> 0%</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-white/6 ring-1 ring-white/15" /> Trống</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Execution Trend */}
          {weeklyTrend.length > 0 && (
            <Card
              interactive={false}
              className="border-0 bg-[linear-gradient(180deg,_rgba(219,234,254,0.94)_0%,_rgba(191,219,254,0.78)_100%)] shadow-[0_24px_60px_-36px_rgba(37,99,235,0.26)]"
            >
              <CardHeader>
                <CardTitle className="text-slate-950">Xu hướng thực thi theo tuần</CardTitle>
                <CardDescription className="text-slate-600">
                  So sánh mức hoàn thành cốt lõi, tùy chọn và điểm qua các tuần.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklyTrend.map((point) => {
                    const isCurrent = point.weekNumber === currentWeek;
                    return (
                      <div
                        key={point.weekNumber}
                        className={`rounded-2xl border p-4 ${
                          isCurrent
                            ? "border-sky-300 bg-white/90 shadow-[0_8px_25px_-12px_rgba(37,99,235,0.25)]"
                            : "border-slate-200/70 bg-white/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${isCurrent ? "text-sky-700" : "text-slate-700"}`}>
                              Tuần {point.weekNumber}
                            </span>
                            {isCurrent && (
                              <Badge className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50">Đang chạy</Badge>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{point.score} điểm</span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>Cốt lõi</span>
                              <span className="font-semibold text-slate-900">{point.corePercent}%</span>
                            </div>
                            <Progress value={point.corePercent} className="mt-1 h-2" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>Tùy chọn</span>
                              <span className="font-semibold text-slate-900">{point.optionalPercent}%</span>
                            </div>
                            <Progress value={point.optionalPercent} className="mt-1 h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tactic Breakdown */}
          {tacticBreakdown.length > 0 && (
            <Card
              interactive={false}
              className="border-0 bg-[linear-gradient(180deg,_rgba(236,253,245,0.95)_0%,_rgba(209,250,229,0.82)_100%)] shadow-[0_24px_60px_-36px_rgba(5,150,105,0.22)]"
            >
              <CardHeader>
                <CardTitle className="text-slate-950">Phân tích theo tactic</CardTitle>
                <CardDescription className="text-slate-600">
                  Chi tiết hoàn thành và xu hướng từng tactic đến tuần {currentWeek}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tacticBreakdown.map((item) => (
                  <div
                    key={item.tacticId}
                    className="flex items-center gap-4 rounded-2xl border border-white/65 bg-white/76 px-4 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-950">{item.tacticName}</p>
                        <Badge
                          variant="outline"
                          className={
                            item.type === "core"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }
                        >
                          {item.type === "core" ? "Cốt lõi" : "Tùy chọn"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={item.percent} className="h-2 flex-1" />
                        <span className="text-sm font-semibold text-slate-800">{item.percent}%</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.completedTasks}/{item.totalTasks} lần hoàn thành
                      </p>
                    </div>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        item.trend === "up"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.trend === "down"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.trend === "up" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : item.trend === "down" ? (
                        <ArrowDown className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Locked teaser for Free users */
        <Card
          interactive={false}
          className="border border-violet-200/60 bg-[linear-gradient(180deg,_rgba(245,243,255,0.95)_0%,_rgba(237,233,254,0.85)_100%)] shadow-[0_24px_55px_-34px_rgba(124,58,237,0.18)]"
        >
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-950">Phân tích thực thi nâng cao</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-600">
                Bản đồ nhiệt hoàn thành, xu hướng thực thi theo tuần và breakdown từng tactic — giúp bạn biết chỗ nào đang mạnh, chỗ nào cần cứu trước.
              </p>
            </div>
            <Badge className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              Tính năng Plus
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
