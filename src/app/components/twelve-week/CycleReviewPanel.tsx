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
  return lessons
    .map((lesson) => lesson.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function EmptyListItem({ children }: { children: string }) {
  return (
    <li className="rounded-lg border border-dashed border-app-line bg-app-bg px-4 py-3 text-sm text-app-ink-muted">
      {children}
    </li>
  );
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
  const summary = useMemo(() => calculateCycleSummary(system, system.lagMetric, system.weeklyReviews), [system]);
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
        tone="primary"
        eyebrow={`Chu kỳ ${system.cycleNumber ?? 1} đã kết thúc`}
        icon={<Trophy className="h-4 w-4" />}
        title="Nhìn lại chu kỳ 12 tuần"
        titleAs="h2"
        description={`Đây là tuần 13: nhìn lại chu kỳ cũ, chốt bài học, rồi chuẩn bị chu kỳ tiếp theo cho mục tiêu ${goal.title}.`}
        titleClassName="font-serif text-2xl font-medium text-app-ink"
        descriptionClassName="max-w-3xl text-sm leading-7 text-app-ink-soft"
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
            <Button variant="outline" className="w-full sm:w-auto" onClick={onOpenSettings}>
              Mở cài đặt
            </Button>
          </>
        }
      >
        <div className="pointer-events-none hidden justify-end sm:flex">
          <WeeklyReviewIllustration className="-my-6 w-40 text-app-accent opacity-60" />
        </div>
        {aspirationalVisionSummary ? (
          <div className="rounded-lg border border-app-warm/30 bg-app-warm-soft px-4 py-3 text-sm text-app-ink-soft">
            <p className="font-serif text-base font-medium text-app-ink">
              Chu kỳ này đã đưa bạn gần hơn với tầm nhìn 3 năm chưa?
            </p>
            <p className="mt-1 text-app-ink-soft">{aspirationalVisionSummary}</p>
          </div>
        ) : null}
      </PrimaryActionCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-card border border-app-line bg-app-surface p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
              <Icon className="h-3.5 w-3.5 text-app-accent" />
              {label}
            </p>
            <p className="mt-3 font-serif text-2xl font-medium text-app-ink">{value}</p>
          </div>
        ))}
      </div>

      <Card className="border border-app-line bg-app-surface">
        <CardContent className="stack-section p-6 md:p-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="stack-tight">
              <h2 className="font-serif text-lg font-medium text-app-ink">Thắng lớn nhất</h2>
              <ul className="stack-tight">
                {summary.biggestWins.length > 0 ? (
                  summary.biggestWins.map((win) => (
                    <li
                      key={win}
                      className="rounded-lg border border-app-accent/20 bg-app-accent-soft px-4 py-3 text-sm text-app-accent"
                    >
                      {win}
                    </li>
                  ))
                ) : (
                  <EmptyListItem>Chưa có góc nhìn nào được ghi trong 12 review.</EmptyListItem>
                )}
              </ul>
            </div>
            <div className="stack-tight">
              <h2 className="font-serif text-lg font-medium text-app-ink">Điều cần điều chỉnh</h2>
              <ul className="stack-tight">
                {summary.topAdjustments.length > 0 ? (
                  summary.topAdjustments.map((adjustment) => (
                    <li
                      key={adjustment}
                      className="rounded-lg border border-app-warm/30 bg-app-warm-soft px-4 py-3 text-sm text-app-warm"
                    >
                      {adjustment}
                    </li>
                  ))
                ) : (
                  <EmptyListItem>Chưa có cam kết bỏ lỡ lặp lại đủ rõ.</EmptyListItem>
                )}
              </ul>
            </div>
          </div>

          <div className="stack-tight rounded-lg border border-app-warm/30 bg-app-warm-soft p-5">
            <h2 className="font-serif text-lg font-medium text-app-ink">3 bài học lớn nhất</h2>
            <p className="text-sm text-app-ink-soft">Viết ngắn gọn những gì bạn muốn mang sang chu kỳ sau.</p>
            <div className="grid gap-3 md:grid-cols-3">
              {LESSON_FIELD_IDS.map((lessonId, index) => {
                const lesson = lessons[index] ?? "";
                return (
                  <div key={lessonId} className="stack-tight">
                    <Label htmlFor={`cycle-lesson-${index + 1}`}>Bài học {index + 1}</Label>
                    <Textarea
                      id={`cycle-lesson-${index + 1}`}
                      value={lesson}
                      onChange={(event) => updateLesson(index, event.target.value)}
                      rows={3}
                      placeholder="Một bài học ngắn để áp dụng vào chu kỳ sau"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full bg-app-accent text-white hover:bg-app-accent/90 sm:w-auto"
              onClick={() => onSaveCycleReview({ lessons: sanitizedLessons, summary })}
            >
              <Save className="mr-2 h-4 w-4" />
              Lưu báo cáo chu kỳ
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
