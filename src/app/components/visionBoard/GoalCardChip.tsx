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
  const areaLabel = areaName ? LIFE_AREA_LABELS[areaName] ?? areaName : null;

  if (!goal) {
    return (
      <div
        className="rounded-[var(--r-card)] border border-amber-200 bg-amber-50/90 p-4 text-center shadow-2xl"
        style={{ width: `${width}px` }}
      >
        <p className="text-sm font-semibold text-amber-700">Mục tiêu không còn tồn tại</p>
        <p className="mt-1 text-xs text-amber-600">Phần tử này sẽ tự gỡ khi bạn xóa.</p>
      </div>
    );
  }

  const deadlineDisplay = formatShortDate(goal.deadline);
  const progress = Math.max(0, Math.min(100, Math.round(goal.progress)));

  return (
    <div
      className="rounded-[var(--r-card)] border border-white/85 bg-white/95 p-4 shadow-2xl backdrop-blur"
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
      <h4 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-slate-900">{goal.title}</h4>
      {deadlineDisplay && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="h-3 w-3" />
          <span>{deadlineDisplay}</span>
        </div>
      )}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Tiến độ</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
            style={{ width: `${progress}%` }}
          />
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
