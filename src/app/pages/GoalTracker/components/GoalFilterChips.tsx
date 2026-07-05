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
    <div className="flex flex-wrap gap-[9px]">
      {chips.map((chip) => {
        const isActive = activeFilter === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => setActiveFilter(chip.id)}
            className={cn(
              "inline-flex min-h-9 items-center justify-center px-[14px] py-2 text-[12.5px] font-semibold rounded-full border transition-all duration-150 gap-2 shrink-0",
              "active:scale-[0.97]",
              isActive
                ? "border-app-accent bg-app-accent text-white"
                : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/30 hover:bg-app-bg",
            )}
          >
            <span>{chip.label}</span>
            <span
              className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-full font-bold tabular-nums",
                isActive ? "bg-white/20 text-white" : "bg-app-bg text-app-ink-muted",
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
