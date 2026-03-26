import { BarChart3, CalendarDays, Flag } from "lucide-react";

import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
import type { TwelveWeekSystem } from "../../utils/storage-types";

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
    </div>
  );
}
