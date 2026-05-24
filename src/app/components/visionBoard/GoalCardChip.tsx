import type { JSX } from "react";
import { Calendar } from "lucide-react";

import { LIFE_AREAS, LIFE_AREA_LABELS } from "@/app/utils/storage-constants";

export interface GoalCardChipProps {
  goal?: {
    title: string;
    category: string;
    deadline: string;
    progress: number;
  };
  lifeAreaId?: string;
  width: number;
}

export function GoalCardChip({ goal, lifeAreaId, width }: GoalCardChipProps): JSX.Element {
  const areaName = lifeAreaId ?? goal?.category;
  const area = LIFE_AREAS.find((item) => item.name === areaName);
  const areaLabel = areaName ? (LIFE_AREA_LABELS[areaName] ?? areaName) : null;

  if (!goal) {
    return (
      <div
        className="rounded-[var(--r-card)] border border-app-warm-border bg-app-warm-soft p-4 text-center"
        style={{ width: `${width}px` }}
      >
        <p className="text-sm font-semibold text-app-warm">Mục tiêu không còn tồn tại</p>
        <p className="mt-1 text-xs text-app-warm">Phần tử này sẽ tự gỡ khi bạn xóa.</p>
      </div>
    );
  }

  const deadlineDisplay = formatShortDate(goal.deadline);
  const progress = Math.max(0, Math.min(100, Math.round(goal.progress)));

  return (
    <div
      className="rounded-[var(--r-card)] border border-app-accent/30 bg-app-accent-soft text-app-accent p-3 text-left"
      style={{ width: `${width}px` }}
    >
      {areaLabel && area && (
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: `${area.color}1F`, color: area.color }}
        >
          {areaLabel}
        </span>
      )}
      <h4 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-app-ink">{goal.title}</h4>
      {deadlineDisplay && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-app-ink-soft">
          <Calendar className="h-3 w-3" />
          <span>{deadlineDisplay}</span>
        </div>
      )}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-app-ink-soft">
          <span>Tiến độ</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-app-bg">
          <div className="h-full rounded-full bg-app-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

function formatShortDate(iso: string): string | null {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return null;
  }
}
