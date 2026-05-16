import { BarChart3, CheckCircle2, Flag, RefreshCw, Save, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

import { calculateCycleSummary } from "@/features/plan12week/logic/cycleReview";
import type { CycleSummary } from "@/features/plan12week/logic/cycleReview";
import type { Goal, TwelveWeekSystem } from "@/app/utils/storage-types";
import { WeeklyReviewIllustration } from "../illustrations";
import { Button } from "../ui/button";
import { PrimaryActionCard } from "../layout/PrimaryActionCard";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface CycleReviewPanelProps {
  goal: Goal;
  system: TwelveWeekSystem;
  onSaveCycleReview: (input: { lessons: string[]; summary: CycleSummary }) => void;
  onStartNewCycle: (input: { lessons: string[]; summary: CycleSummary }) => void;
  onOpenSettings: () => void;
  aspirationalVisionSummary?: string | null;
}

const LESSON_FIELD_IDS = ["lesson-one", "lesson-two", "lesson-three"] as const;

function sanitizeLessons(lessons: readonly string[]): string[] {
  return lessons.map((lesson) => lesson.trim()).filter(Boolean).slice(0, 3);
}

function EmptyListItem({ children }: { children: string }) {
  return <li className="rounded-[var(--r-control)] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">{children}</li>;
}

export function CycleReviewPanel({
  goal,
  system,
  onSaveCycleReview,
  onStartNewCycle,
  onOpenSettings,
  aspirationalVisionSummary,
}: CycleReviewPanelProps) {
  const [lessons, setLessons] = useState(["", "", ""]);
  const summary = useMemo(
    () => calculateCycleSummary(system, system.lagMetric, system.weeklyReviews),
    [system],
  );
  const sanitizedLessons = sanitizeLessons(lessons);
  const kpis = [
    { label: "Lag cuối cycle", value: `${summary.finalLagPercent}%`, icon: Trophy },
    { label: "Việc lặp lại trung bình", value: `${summary.averageLeadScore}%`, icon: BarChart3 },
    { label: "Giữ cam kết", value: `${summary.commitmentsKeptRate}%`, icon: CheckCircle2 },
    { label: "Tuần đạt 85%+", value: `${summary.weeksWith85Plus}/12`, icon: Flag },
  ];

  const updateLesson = (index: number, value: string) => {
    setLessons((previous) => previous.map((lesson, lessonIndex) => (lessonIndex === index ? value : lesson)));
  };

  return (
    <section data-testid="cycle-review-panel" className="stack-section">
      <PrimaryActionCard
        hero
        tone="emerald"
        eyebrow={`Cycle ${system.cycleNumber ?? 1} đã kết thúc`}
        icon={<Trophy className="h-4 w-4" />}
        title="Cycle 12 tuần đã kết thúc"
        titleAs="h2"
        description={`Đây là tuần 13: nhìn lại chu kỳ cũ, chốt bài học, rồi chuẩn bị chu kỳ tiếp theo cho mục tiêu ${goal.title}.`}
        titleClassName="text-2xl font-semibold text-foreground"
        descriptionClassName="max-w-3xl text-sm leading-7 text-muted-foreground"
        contentClassName="stack-stack"
        actionClassName="flex flex-col gap-3 sm:flex-row"
        action={
          <>
            <Button
              className="w-full sm:w-auto"
              onClick={() => onStartNewCycle({ lessons: sanitizedLessons, summary })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Bắt đầu cycle mới
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onOpenSettings}
            >
              Mở cài đặt
            </Button>
          </>
        }
      >
        <div className="pointer-events-none hidden justify-end sm:flex">
          <WeeklyReviewIllustration className="-my-6 w-40 text-emerald-400 opacity-60" />
        </div>
        {aspirationalVisionSummary ? (
          <div className="rounded-[var(--r-control)] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Chu kỳ này đã đưa bạn gần hơn với tầm nhìn 3 năm chưa?</p>
            <p className="mt-1 text-muted-foreground">{aspirationalVisionSummary}</p>
          </div>
        ) : null}
      </PrimaryActionCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-[var(--r-control)] border border-slate-200/80 bg-white/92 p-4 shadow-sm ring-1 ring-slate-200"
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Icon className="h-3.5 w-3.5 text-emerald-700" />
              {label}
            </p>
            <p className="mt-[var(--space-inline)] text-3xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <Card className="border border-slate-200/80 bg-white/92 shadow-sm ring-1 ring-slate-200">
        <CardContent className="stack-section p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="stack-tight">
              <h2 className="text-base font-semibold text-slate-950">Biggest wins</h2>
              <ul className="stack-tight">
                {summary.biggestWins.length > 0 ? (
                  summary.biggestWins.map((win) => (
                    <li key={win} className="rounded-[var(--r-control)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      {win}
                    </li>
                  ))
                ) : (
                  <EmptyListItem>Chưa có góc nhìn nào được ghi trong 12 review.</EmptyListItem>
                )}
              </ul>
            </div>
            <div className="stack-tight">
              <h2 className="text-base font-semibold text-slate-950">Top adjustments</h2>
              <ul className="stack-tight">
                {summary.topAdjustments.length > 0 ? (
                  summary.topAdjustments.map((adjustment) => (
                    <li key={adjustment} className="rounded-[var(--r-control)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {adjustment}
                    </li>
                  ))
                ) : (
                  <EmptyListItem>Chưa có cam kết bỏ lỡ lặp lại đủ rõ.</EmptyListItem>
                )}
              </ul>
            </div>
          </div>

          <div className="stack-tight rounded-[var(--r-control)] border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-950">3 bài học lớn nhất</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {LESSON_FIELD_IDS.map((lessonId, index) => {
                const lesson = lessons[index] ?? "";
                return (
                  <div key={lessonId} className="stack-tight">
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
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => onSaveCycleReview({ lessons: sanitizedLessons, summary })}
            >
              <Save className="mr-2 h-4 w-4" />
              Lưu báo cáo cycle
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
