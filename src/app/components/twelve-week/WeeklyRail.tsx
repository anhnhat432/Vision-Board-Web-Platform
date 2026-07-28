import { buildCycleRailWeeks, TwelveWeekCycleRail } from "./TwelveWeekCycleRail";

interface WeeklyRailProps {
  totalWeeks: number;
  currentWeek: number;
  selectedWeek: number;
  reviews: Array<{ weekNumber: number; reviewCompleted?: boolean }>;
  getCompletion: (weekNo: number) => { completed: number; total: number; percent: number; isEmpty: boolean };
  onSelectWeek: (weekNo: number) => void;
}

export function WeeklyRail({
  totalWeeks,
  currentWeek,
  selectedWeek,
  reviews,
  getCompletion,
  onSelectWeek,
}: WeeklyRailProps) {
  const weeks = buildCycleRailWeeks({
    totalWeeks,
    currentWeek,
    reviewedWeeks: reviews.filter((review) => review.reviewCompleted).map((review) => review.weekNumber),
    scoreByWeek: Object.fromEntries(
      Array.from({ length: totalWeeks }, (_, index) => index + 1).flatMap((weekNumber) => {
        const completion = getCompletion(weekNumber);
        return completion.isEmpty ? [] : [[weekNumber, completion.percent]];
      }),
    ),
    checkpoints: [4, 8, 12].filter((weekNumber) => weekNumber <= totalWeeks),
  });

  return (
    <section
      data-testid="weekly-week-selector"
      aria-labelledby="weekly-cycle-rail-heading"
      className="rounded-card border border-app-line bg-app-surface p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="weekly-cycle-rail-heading" className="text-[15px] font-bold text-app-ink">
          Nhịp độ chu kỳ 12 tuần
        </h2>
        <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-bold text-app-accent">
          Tuần {currentWeek} đang là trọng tâm
        </span>
      </div>
      <TwelveWeekCycleRail
        weeks={weeks}
        selectedWeek={selectedWeek}
        onSelectWeek={onSelectWeek}
        label="Nhịp độ chu kỳ 12 tuần"
      />
    </section>
  );
}
