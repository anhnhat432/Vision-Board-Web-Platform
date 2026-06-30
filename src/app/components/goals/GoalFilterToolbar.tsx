/**
 * GoalFilterToolbar — Search + Filter Chips (Command Center)
 *
 * Gọn hơn bản cũ: search input nhỏ hơn, chips inline,
 * tích hợp vào fleet header thay vì đứng riêng.
 *
 * Mobile: chips cuộn ngang, search full width.
 */

import { Search, X } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

export type GoalFilterType = "all" | "12week" | "simple" | "dueSoon" | "atRisk" | "completed";

interface GoalFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: GoalFilterType;
  onFilterChange: (filter: GoalFilterType) => void;
  counts: {
    all: number;
    twelveWeek: number;
    simple: number;
    dueSoon: number;
    atRisk: number;
    completed: number;
  };
}

const FILTER_CHIPS: Array<{ id: GoalFilterType; label: string; countKey: keyof GoalFilterToolbarProps["counts"] }> = [
  { id: "all", label: "Tất cả", countKey: "all" },
  { id: "12week", label: "12 tuần", countKey: "twelveWeek" },
  { id: "simple", label: "Thường", countKey: "simple" },
  { id: "dueSoon", label: "Sắp đến hạn", countKey: "dueSoon" },
  { id: "atRisk", label: "Cần chú ý", countKey: "atRisk" },
  { id: "completed", label: "Hoàn thành", countKey: "completed" },
];

export function GoalFilterToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  counts,
}: GoalFilterToolbarProps) {
  const hasActiveFilter = activeFilter !== "all" || searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Search + clear */}
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-ink-muted" />
        <input
          type="search"
          aria-label="Tìm kiếm mục tiêu"
          placeholder="Tìm mục tiêu…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-[38px] w-full rounded-control border border-app-line bg-app-surface pl-[34px] pr-8 text-[13px] text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent transition-all duration-200"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-app-ink-muted hover:text-app-ink hover:bg-app-bg transition-colors"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Filter chips — slightly larger */}
      <div className="relative w-full overflow-x-auto">
        <div className="flex gap-1.5 pb-0.5 max-w-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeFilter === chip.id;
            const count = counts[chip.countKey];
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onFilterChange(chip.id)}
                className={cn(
                  "inline-flex min-h-[34px] items-center justify-center px-3 py-1 text-xs font-bold rounded-full border transition-all duration-200 gap-1.5 shrink-0",
                  isActive
                    ? "border-app-accent bg-app-accent text-white shadow-app-sm"
                    : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/30 hover:bg-app-bg",
                )}
                aria-pressed={isActive}
              >
                <span>{chip.label}</span>
                <span
                  className={cn(
                    "text-[11px] px-1.5 py-0 rounded-full font-bold tabular-nums min-w-[18px] text-center",
                    isActive ? "bg-white/20 text-white" : "bg-app-bg text-app-ink-muted",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {/* Fade gradient for mobile scroll indication */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-app-bg to-transparent sm:hidden"
          aria-hidden="true"
        />
      </div>

      {/* Active filter indicator */}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-app-ink-muted">
            Hiển thị {counts[activeFilter as keyof typeof counts]} mục tiêu
          </span>
          {activeFilter !== "all" && (
            <button
              type="button"
              onClick={() => onFilterChange("all")}
              className="text-xs font-semibold text-app-accent hover:underline"
            >
              Bỏ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}