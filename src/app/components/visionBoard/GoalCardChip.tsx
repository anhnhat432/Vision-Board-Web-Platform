import type { JSX } from "react";
import { Calendar } from "lucide-react";

import { LIFE_AREAS, LIFE_AREA_LABELS } from "@/app/utils/storage-constants";

export const LIFE_AREA_COLORS: Record<string, { bg: string; border: string; text: string; accentClass: string; accentHex: string; softBg: string }> = {
  Career: { bg: "bg-mood-mint-soft/40", border: "border-mood-mint/20", text: "text-mood-mint", accentClass: "bg-mood-mint", accentHex: "#5CA08E", softBg: "bg-mood-mint-soft" },
  Finance: { bg: "bg-mood-amber-soft/40", border: "border-mood-amber/20", text: "text-mood-amber", accentClass: "bg-mood-amber", accentHex: "#E29E4B", softBg: "bg-mood-amber-soft" },
  Health: { bg: "bg-mood-sky-soft/40", border: "border-mood-sky/20", text: "text-mood-sky", accentClass: "bg-mood-sky", accentHex: "#6BA4E8", softBg: "bg-mood-sky-soft" },
  Education: { bg: "bg-mood-lavender-soft/40", border: "border-mood-lavender/20", text: "text-mood-lavender", accentClass: "bg-mood-lavender", accentHex: "#9F92EC", softBg: "bg-mood-lavender-soft" },
  Relationships: { bg: "bg-mood-rose-soft/40", border: "border-mood-rose/20", text: "text-mood-rose", accentClass: "bg-mood-rose", accentHex: "#E88BA4", softBg: "bg-mood-rose-soft" },
  Family: { bg: "bg-mood-rose-soft/40", border: "border-mood-rose/20", text: "text-mood-rose", accentClass: "bg-mood-rose", accentHex: "#E88BA4", softBg: "bg-mood-rose-soft" },
  "Personal Growth": { bg: "bg-mood-lavender-soft/40", border: "border-mood-lavender/20", text: "text-mood-lavender", accentClass: "bg-mood-lavender", accentHex: "#9F92EC", softBg: "bg-mood-lavender-soft" },
  Leisure: { bg: "bg-mood-amber-soft/40", border: "border-mood-amber/20", text: "text-mood-amber", accentClass: "bg-mood-amber", accentHex: "#E29E4B", softBg: "bg-mood-amber-soft" },
};

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
        className="surface-empty rounded-2xl border border-dashed border-app-line bg-app-bg/50 p-4 text-center"
        style={{ width: `${width}px` }}
      >
        <p className="text-sm font-semibold text-app-warm">Mục tiêu không còn tồn tại</p>
        <p className="mt-1 text-xs text-app-warm">Phần tử này sẽ tự gỡ khi bạn xóa.</p>
      </div>
    );
  }

  const deadlineDisplay = formatShortDate(goal.deadline);
  const progress = Math.max(0, Math.min(100, Math.round(goal.progress)));
  const areaColor = areaName ? (LIFE_AREA_COLORS[areaName] ?? { bg: "bg-app-accent-soft", border: "border-app-accent/20", text: "text-app-accent", accentHex: "#2A5447", softBg: "bg-app-accent-soft" }) : { bg: "bg-app-accent-soft", border: "border-app-accent/20", text: "text-app-accent", accentHex: "#2A5447", softBg: "bg-app-accent-soft" };

  return (
    <div
      className={`rounded-2xl border p-3.5 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md ${areaColor.bg} ${areaColor.border}`}
      style={{ width: `${width}px` }}
    >
      {areaLabel && area && (
        <span
          className="inline-flex items-center rounded-full border border-white/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm"
          style={{ backgroundColor: `${area.color}26`, color: area.color }}
        >
          {areaLabel}
        </span>
      )}
      <h4 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-app-ink">{goal.title}</h4>
      {deadlineDisplay && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-app-ink-soft opacity-80">
          <Calendar className="h-3.5 w-3.5" />
          <span>{deadlineDisplay}</span>
        </div>
      )}
      <div className="mt-3.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-app-ink-soft opacity-80">
          <span>Tiến độ</span>
          <span className={areaColor.text}>{progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/60 border border-white/15">
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%`, backgroundColor: areaColor.accentHex }} 
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
