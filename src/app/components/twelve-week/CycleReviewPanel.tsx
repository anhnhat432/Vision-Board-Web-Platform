import { BarChart3, CheckCircle2, Flag, RefreshCw, Save, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

import { calculateCycleSummary } from "@/features/plan12week/logic/cycleReview";
import type { CycleSummary } from "@/features/plan12week/logic/cycleReview";
import type { Goal, TwelveWeekSystem } from "@/app/utils/storage-types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface CycleReviewPanelProps {
  goal: Goal;
  system: TwelveWeekSystem;
  onSaveCycleReview: (input: { lessons: string[]; summary: CycleSummary }) => void;
  onStartNewCycle: (input: { lessons: string[]; summary: CycleSummary }) => void;
  onOpenSettings: () => void;
}

const LESSON_FIELD_IDS = ["lesson-one", "lesson-two", "lesson-three"] as const;

function sanitizeLessons(lessons: readonly string[]): string[] {
  return lessons.map((lesson) => lesson.trim()).filter(Boolean).slice(0, 3);
}

function EmptyListItem({ children }: { children: string }) {
  return <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">{children}</li>;
}

export function CycleReviewPanel({
  goal,
  system,
  onSaveCycleReview,
  onStartNewCycle,
  onOpenSettings,
}: CycleReviewPanelProps) {
  const [lessons, setLessons] = useState(["", "", ""]);
  const summary = useMemo(
    () => calculateCycleSummary(system, system.lagMetric, system.weeklyReviews),
    [system],
  );
  const sanitizedLessons = sanitizeLessons(lessons);
  const kpis = [
    { label: "Lag cuối cycle", value: `${summary.finalLagPercent}%`, icon: Trophy },
    { label: "Lead trung bình", value: `${summary.averageLeadScore}%`, icon: BarChart3 },
    { label: "Giữ cam kết", value: `${summary.commitmentsKeptRate}%`, icon: CheckCircle2 },
    { label: "Tuần đạt 85%+", value: `${summary.weeksWith85Plus}/12`, icon: Flag },
  ];

  const updateLesson = (index: number, value: string) => {
    setLessons((previous) => previous.map((lesson, lessonIndex) => (lessonIndex === index ? value : lesson)));
  };

  return (
    <section data-testid="cycle-review-panel" className="space-y-6">
      <Card className="border border-emerald-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                Cycle {system.cycleNumber ?? 1}
              </Badge>
              <CardTitle className="mt-3 text-2xl text-slate-950">Cycle 12 tuần đã kết thúc</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                Đây là tuần 13: nhìn lại cycle cũ, chốt bài học, rồi chuẩn bị cycle tiếp theo cho mục tiêu
                {" "}
                <span className="font-semibold text-slate-900">{goal.title}</span>.
              </p>
            </div>
            <Button variant="outline" className="bg-white" onClick={onOpenSettings}>
              Mở cài đặt
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Icon className="h-3.5 w-3.5 text-emerald-700" />
                  {label}
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-950">Biggest wins</h2>
              <ul className="space-y-2">
                {summary.biggestWins.length > 0 ? (
                  summary.biggestWins.map((win) => (
                    <li key={win} className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      {win}
                    </li>
                  ))
                ) : (
                  <EmptyListItem>Chưa có insight nào được ghi trong 12 review.</EmptyListItem>
                )}
              </ul>
            </div>
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-950">Top adjustments</h2>
              <ul className="space-y-2">
                {summary.topAdjustments.length > 0 ? (
                  summary.topAdjustments.map((adjustment) => (
                    <li key={adjustment} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {adjustment}
                    </li>
                  ))
                ) : (
                  <EmptyListItem>Chưa có cam kết bỏ lỡ lặp lại đủ rõ.</EmptyListItem>
                )}
              </ul>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-950">3 bài học lớn nhất</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {LESSON_FIELD_IDS.map((lessonId, index) => {
                const lesson = lessons[index] ?? "";
                return (
                  <div key={lessonId} className="space-y-2">
                    <Label htmlFor={`cycle-lesson-${index + 1}`}>Bài học lớn nhất {index + 1}</Label>
                    <Textarea
                      id={`cycle-lesson-${index + 1}`}
                      value={lesson}
                      onChange={(event) => updateLesson(index, event.target.value)}
                      rows={3}
                      placeholder="Một bài học ngắn để áp dụng vào cycle sau"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              onClick={() => onSaveCycleReview({ lessons: sanitizedLessons, summary })}
            >
              <Save className="mr-2 h-4 w-4" />
              Lưu báo cáo cycle
            </Button>
            <Button
              variant="outline"
              className="w-full bg-white sm:w-auto"
              onClick={() => onStartNewCycle({ lessons: sanitizedLessons, summary })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Bắt đầu cycle mới
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
