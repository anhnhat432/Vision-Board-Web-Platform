import { BookOpen, Briefcase, HeartPulse, Home, type LucideIcon, Sparkles, Sprout, Users, Wallet } from "lucide-react";
import { type JSX, useMemo } from "react";

import type { VisionBoardItem } from "@/app/utils/storage-types";
import { LIFE_AREA_LABELS, LIFE_AREAS } from "@/app/utils/storage-constants";

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
      sticker: 0,
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
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      {/* Life Areas */}
      <div className="rounded-[18px] border border-app-line/10 bg-white p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-ink">Câu chuyện theo life area</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-app-ink-soft">
          Mỗi vùng đại diện một mảng cuộc sống. Vùng trống = cảm hứng đang thiếu.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {sortedAreas.map((area, index) => {
            const count = stats.byArea[area.name] ?? 0;
            const isFocus = focusAreaIds?.includes(area.name) ?? false;
            const Icon = LIFE_AREA_ICONS[area.name] ?? Sparkles;

            return (
              <button
                key={area.name}
                type="button"
                className="w-full text-left rounded-[13px] border border-app-line/10 bg-[#FAF8F3] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-26px_rgba(23,21,15,0.3)]"
                style={{ animationDelay: `${0.05 + index * 0.04}s`, animation: "dof-rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both" }}
                data-testid={`life-area-row-${area.name}`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <span className="flex items-center gap-2.5 text-[13px] font-bold text-app-ink">
                    <span
                      className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[7px]"
                      style={{ backgroundColor: `${area.color}26`, color: area.color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {LIFE_AREA_LABELS[area.name] ?? area.name}
                    {isFocus && (
                      <span className="rounded-full bg-app-accent-soft px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-app-accent">
                        Trọng tâm
                      </span>
                    )}
                  </span>
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-app-line/10 bg-white font-mono text-[11px] font-bold text-app-ink-muted">
                    {count}
                  </span>
                </div>
                {count === 0 && (
                  <p className="mt-1.5 pl-[33px] text-[11px] text-app-ink-soft">Thêm 1 ảnh hoặc câu nói cho vùng này.</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Summary */}
      <div className="rounded-[18px] border border-app-line/10 bg-white p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-ink">Tóm tắt nhanh</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <SummaryStat label="Hình ảnh" value={stats.counters.image} />
          <SummaryStat label="Câu nói" value={stats.counters.quote} />
          <SummaryStat label="Mục tiêu ghim" value={stats.counters.goal_card} />
          <SummaryStat label="Biểu tượng" value={stats.counters.icon} />
          <div className="col-span-2">
            <SummaryStat label="Sticker" value={stats.counters.sticker} />
          </div>
        </div>
        <div className="mt-3 rounded-[11px] border border-app-accent/20 bg-app-accent-subtle px-3.5 py-3 text-center text-xs font-semibold text-app-accent">
          <span className="font-mono">{stats.total}</span> phần tử đang có trên bảng
        </div>
      </div>

      {/* Layout Tips */}
      <div className="relative overflow-hidden rounded-[18px] bg-[#17150F] p-5 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(198,242,78,0.14),transparent_55%)]" />
        <div className="relative">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C6F24E]">Gợi ý bố cục</p>
          <div className="mt-4 flex flex-col gap-3.5">
            <Tip num="01">
              Đặt hình ảnh quan trọng nhất ở trung tâm hoặc góc trái trên.
            </Tip>
            <Tip num="02">
              Dùng 1–2 câu nói đủ mạnh thay vì rải quá nhiều câu chữ.
            </Tip>
            <Tip num="03">
              Để mỗi life area trọng tâm có ít nhất 1 hình ảnh hoặc 1 goal card.
            </Tip>
            <Tip num="04">
              Khoảng trắng giữa các phần tử giúp bảng dễ nhìn hơn.
            </Tip>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-[12px] border border-app-line/10 bg-[#FAF8F3] px-3 py-3">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-app-ink-muted">{label}</p>
      <p className="mt-1 font-serif text-[22px] font-extrabold leading-none text-app-ink">{value}</p>
    </div>
  );
}

function Tip({ num, children }: { num: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex gap-2.5">
      <span className="flex-shrink-0 font-mono text-xs font-bold text-[#C6F24E]">{num}</span>
      <p className="text-[12.5px] leading-relaxed text-[#D6D3C8] m-0">{children}</p>
    </div>
  );
}
