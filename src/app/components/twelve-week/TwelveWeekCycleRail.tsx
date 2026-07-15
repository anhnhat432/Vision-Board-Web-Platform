export interface CycleRailWeek {
  weekNumber: number;
  state: "reviewed" | "current" | "upcoming";
  score: number | null;
  checkpoint: boolean;
}

export function buildCycleRailWeeks(input: {
  totalWeeks: number;
  currentWeek: number;
  reviewedWeeks: number[];
  scoreByWeek: Record<number, number>;
  checkpoints: number[];
}): CycleRailWeek[] {
  const totalWeeks = Math.max(0, Math.floor(input.totalWeeks));
  const reviewed = new Set(input.reviewedWeeks);
  const checkpoints = new Set(input.checkpoints);

  return Array.from({ length: totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    return {
      weekNumber,
      state: weekNumber === input.currentWeek ? "current" : reviewed.has(weekNumber) ? "reviewed" : "upcoming",
      score: input.scoreByWeek[weekNumber] ?? null,
      checkpoint: checkpoints.has(weekNumber),
    };
  });
}

function getWeekLabel(week: CycleRailWeek): string {
  const stateLabel =
    week.state === "reviewed" ? "đã chốt review" : week.state === "current" ? "tuần hiện tại" : "sắp tới";
  const checkpointLabel = week.checkpoint ? ", checkpoint" : "";
  const scoreLabel = week.score === null ? "" : `, ${week.score}%`;
  return `Tuần ${week.weekNumber}, ${stateLabel}${checkpointLabel}${scoreLabel}`;
}

function getWeekClassName(week: CycleRailWeek, selected: boolean): string {
  const stateClassName =
    week.state === "current"
      ? "border-app-accent bg-app-accent text-app-ink-on-accent"
      : week.state === "reviewed"
        ? "border-app-accent/35 bg-app-accent-soft text-app-accent"
        : "border-app-line-strong bg-app-surface text-app-ink-soft";
  const selectedClassName = selected
    ? "ring-2 ring-app-highlight/80 ring-offset-2 ring-offset-app-bg"
    : "hover:border-app-accent/45 hover:bg-app-accent-subtle";
  return `${stateClassName} ${selectedClassName}`;
}

export function TwelveWeekCycleRail({
  weeks,
  selectedWeek,
  onSelectWeek,
  label,
  compact = false,
}: {
  weeks: CycleRailWeek[];
  selectedWeek?: number;
  onSelectWeek?: (weekNumber: number) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <section
      aria-label={label}
      data-testid="twelve-week-cycle-rail"
      className="min-w-0 overflow-x-auto overscroll-x-contain pb-2"
    >
      <ol className={`grid grid-cols-12 gap-2 p-0 ${compact ? "min-w-[560px]" : "min-w-[680px]"}`}>
        {weeks.map((week) => {
          const selected = selectedWeek === week.weekNumber;
          const labelText = getWeekLabel(week);
          const className = getWeekClassName(week, selected);
          const content = (
            <>
              <span className="font-mono text-sm font-bold leading-none tabular-nums">{week.weekNumber}</span>
              {!compact && week.score !== null ? (
                <span className="mt-1 text-[11px] font-semibold tabular-nums">{week.score}%</span>
              ) : null}
              {week.checkpoint ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 right-1 h-1.5 w-1.5 rotate-45 bg-app-highlight shadow-[0_0_0_1px_var(--app-accent)]"
                />
              ) : null}
            </>
          );

          return (
            <li key={week.weekNumber} className="min-w-0 list-none">
              {onSelectWeek ? (
                <button
                  type="button"
                  aria-label={labelText}
                  aria-current={week.state === "current" ? "step" : undefined}
                  aria-pressed={selected}
                  data-selected={selected || undefined}
                  onClick={() => onSelectWeek(week.weekNumber)}
                  className={`relative flex min-h-11 w-full flex-col items-center justify-center rounded-control border px-2 transition-[background-color,color,border-color,box-shadow,transform] duration-200 active:scale-[0.98] ${className}`}
                >
                  {content}
                </button>
              ) : (
                <output
                  aria-label={labelText}
                  aria-current={week.state === "current" ? "step" : undefined}
                  className={`relative flex min-h-11 flex-col items-center justify-center rounded-control border px-2 ${className}`}
                >
                  {content}
                </output>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
