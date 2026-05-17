import { useMemo, type JSX } from "react";
import {
  BookOpen,
  Briefcase,
  HeartPulse,
  Home,
  Sparkles,
  Sprout,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/app/components/ui/card";
import { LIFE_AREAS, LIFE_AREA_LABELS } from "@/app/utils/storage-constants";
import type { VisionBoardItem } from "@/app/utils/storage-types";

const LIFE_AREA_ICONS: Record<string, LucideIcon> = {
  Career: Briefcase,
  Finance: Wallet,
  Health: HeartPulse,
  Education: BookOpen,
  Relationships: Users,
  Family: Home,
  "Personal Growth": Sprout,
  Leisure: Sparkles,
};

export interface VisionBoardSidebarProps {
  items: VisionBoardItem[];
  focusAreaIds?: string[];
  className?: string;
}

export function VisionBoardSidebar({ items, focusAreaIds, className }: VisionBoardSidebarProps): JSX.Element {
  const stats = useMemo(() => {
    const counters: Record<VisionBoardItem["type"], number> = {
      image: 0,
      quote: 0,
      icon: 0,
      goal_card: 0,
    };
    const byArea: Record<string, number> = {};

    items.forEach((item) => {
      counters[item.type] = (counters[item.type] ?? 0) + 1;
      if (item.lifeAreaId) {
        byArea[item.lifeAreaId] = (byArea[item.lifeAreaId] ?? 0) + 1;
      }
    });

    return { counters, byArea, total: items.length };
  }, [items]);

  const sortedAreas = useMemo(() => {
    const focusOrder = new Map((focusAreaIds ?? []).map((areaId, index) => [areaId, index]));

    return [...LIFE_AREAS].sort((a, b) => {
      const aFocusIndex = focusOrder.get(a.name);
      const bFocusIndex = focusOrder.get(b.name);
      const aIsFocus = aFocusIndex !== undefined;
      const bIsFocus = bFocusIndex !== undefined;

      if (aIsFocus !== bIsFocus) return aIsFocus ? -1 : 1;
      if (aIsFocus && bIsFocus) return aFocusIndex - bFocusIndex;

      const aCount = stats.byArea[a.name] ?? 0;
      const bCount = stats.byArea[b.name] ?? 0;
      if (aCount !== bCount) return bCount - aCount;

      return 0;
    });
  }, [focusAreaIds, stats.byArea]);

  return (
    <div className={`stack-stack ${className ?? ""}`}>
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-bold text-slate-900">Câu chuyện theo life area</h3>
          <p className="mt-1 text-xs text-slate-500">
            Mỗi vùng đại diện một mảng cuộc sống. Vùng trống = cảm hứng đang thiếu.
          </p>
          <div className="mt-4 space-y-3">
            {sortedAreas.map((area) => {
              const count = stats.byArea[area.name] ?? 0;
              const isFocus = focusAreaIds?.includes(area.name) ?? false;
              const Icon = LIFE_AREA_ICONS[area.name] ?? Sparkles;
              const fillRatio = Math.min(1, count / 4);

              return (
                <div
                  key={area.name}
                  className="rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                  data-testid={`life-area-row-${area.name}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${area.color}1F`, color: area.color }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-semibold text-slate-700">{LIFE_AREA_LABELS[area.name]}</span>
                      {isFocus && (
                        <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-700">
                          Trọng tâm
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{count}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" aria-hidden="true">
                    <div
                      className="h-full rounded-full transition-all"
                      data-testid={`life-area-fill-${area.name}`}
                      style={{ width: `${fillRatio * 100}%`, backgroundColor: area.color }}
                    />
                  </div>
                  {count === 0 && (
                    <p className="mt-2 text-[11px] italic text-slate-400">Thêm 1 ảnh hoặc câu nói cho vùng này.</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-bold text-slate-900">Tóm tắt nhanh</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SummaryStat label="Hình ảnh" value={stats.counters.image} />
            <SummaryStat label="Câu nói" value={stats.counters.quote} />
            <SummaryStat label="Mục tiêu ghim" value={stats.counters.goal_card} />
            <SummaryStat label="Biểu tượng" value={stats.counters.icon} />
          </div>
          <div className="mt-3 rounded-lg bg-gradient-to-r from-violet-50 to-pink-50 p-3 text-xs text-slate-700">
            <span className="font-semibold">{stats.total}</span> phần tử đang có trên bảng
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-bold text-slate-900">Gợi ý bố cục</h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            <li>Đặt hình ảnh quan trọng nhất ở trung tâm hoặc góc trái trên.</li>
            <li>Dùng 1-2 câu nói đủ mạnh thay vì rải quá nhiều câu chữ.</li>
            <li>Để mỗi life area trọng tâm có ít nhất 1 hình ảnh hoặc 1 goal card.</li>
            <li>Khoảng trắng giữa các phần tử giúp bảng dễ nhìn hơn.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
