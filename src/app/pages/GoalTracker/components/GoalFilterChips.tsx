import { cn } from "@/app/components/ui/utils";

interface GoalFilterChipsProps {
  activeFilter: string;
  setActiveFilter: (filter: "all" | "12week" | "simple" | "dueSoon" | "atRisk" | "completed") => void;
  counts: {
    all: number;
    twelveWeek: number;
    simple: number;
    dueSoon: number;
    atRisk: number;
    completed: number;
  };
}

export function GoalFilterChips({ activeFilter, setActiveFilter, counts }: GoalFilterChipsProps) {
  const chips = [
    { id: "all", label: "Tất cả", count: counts.all },
    { id: "12week", label: "12 tuần", count: counts.twelveWeek },
    { id: "simple", label: "Mục tiêu thường", count: counts.simple },
    { id: "dueSoon", label: "Sắp đến hạn", count: counts.dueSoon },
    { id: "atRisk", label: "Cần chỉnh nhịp", count: counts.atRisk },
    { id: "completed", label: "Hoàn thành", count: counts.completed },
  ] as const;

  return (
    <div className="flex gap-2 overflow-x-auto rounded-card border border-app-line/70 bg-app-surface/80 p-1.5 shadow-[var(--app-shadow-sm)] scrollbar-none sm:flex-wrap sm:overflow-visible">
      {chips.map((chip) => {
        const isActive = activeFilter === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => setActiveFilter(chip.id)}
            className={cn(
              "inline-flex min-h-10 flex-none items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-150 sm:flex-initial",
              "active:scale-[0.98]",
              isActive
                ? "border-app-accent bg-app-accent text-white shadow-[var(--app-shadow-sm)]"
                : "border-transparent bg-transparent text-app-ink-soft hover:bg-app-bg hover:text-app-ink",
            )}
          >
            <span>{chip.label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                isActive ? "bg-white/20 text-white" : "bg-app-bg-subtle text-app-ink-muted",
              )}
            >
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
