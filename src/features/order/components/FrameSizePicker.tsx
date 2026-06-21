import { Check } from "lucide-react";

import { cn } from "@/app/components/ui/utils";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";

import { CatalogThumbnail } from "./CatalogThumbnail";

export interface FrameSizePickerProps {
  frames: CatalogItem[];
  selected: string | null;
  onChange: (itemId: string) => void;
}

/** Kích thước khung phổ biến nhất (dùng cho badge) */
const POPULAR_FRAME_ID = "frame-m";

function frameDimensions(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("lớn") || lower.includes("large")) return "60×40 cm";
  if (lower.includes("nhỏ") || lower.includes("small")) return "30×20 cm";
  // Use label directly if it looks like dimensions (e.g. "20×30", "30×40")
  if (/^\d+\s*[×x]\s*\d+/.test(label.trim())) return `${label.trim()} cm`;
  return "45×30 cm";
}

export function FrameSizePicker({ frames, selected, onChange }: FrameSizePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
      {frames.map((frame) => {
        const isSelected = selected === frame.itemId;
        const isPopular = frame.itemId === POPULAR_FRAME_ID;
        return (
          <button
            type="button"
            key={frame.itemId}
            onClick={() => onChange(frame.itemId)}
            aria-pressed={isSelected}
            className={cn(
              "group relative rounded-[var(--r-card)] border p-4 text-left transition-all duration-[0.16s] ease-[cubic-bezier(0.2,0.7,0.2,1)]",
              isSelected
                ? "border-[var(--order-accent)] ring-2 ring-[var(--order-accent-soft)] -translate-y-[3px] shadow-[0_20px_40px_-28px_rgba(23,21,15,0.4)]"
                : "border-[var(--order-border)] bg-[var(--order-card)] hover:-translate-y-[3px] hover:shadow-[0_20px_40px_-28px_rgba(23,21,15,0.4)]",
            )}
          >
            {isSelected && (
              <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--order-accent)] text-white shadow-sm z-10">
                <Check className="h-3 w-3" />
              </span>
            )}
            {isPopular && (
              <span className="absolute top-[11px] right-[11px] text-[9.5px] font-bold tracking-[0.04em] uppercase text-[var(--order-success)] bg-[var(--order-success-soft)] px-2 py-[3px] rounded-full z-10">
                Phổ biến
              </span>
            )}
            {frame.thumbnail ? (
              <CatalogThumbnail item={frame} className="mb-[13px] aspect-[4/3] w-full rounded-[9px]" />
            ) : (
              <div className="relative aspect-[4/3] rounded-[9px] bg-[#C9A87E] border-4 border-white shadow-[inset_0_0_0_1px_rgba(23,21,15,0.1),0_4px_12px_-6px_rgba(23,21,15,0.3)] overflow-hidden mb-[13px]">
                <div className="absolute inset-[7px] rounded-[4px] opacity-85"
                  style={{ background: "repeating-linear-gradient(135deg, #BE9B6E 0 3px, #B59166 3px 6px)" }}
                />
                <span className="absolute bottom-[6px] left-1/2 -translate-x-1/2 font-mono text-[8.5px] text-black/55 bg-white/70 px-[6px] py-px rounded">
                  {frameDimensions(frame.label)}
                </span>
              </div>
            )}
            <div className="text-left">
              <div className="text-sm font-bold text-[var(--order-text)] mb-[3px]">{frame.label}</div>
              {frame.description && (
                <div className="text-[11.5px] text-[var(--order-text-muted)] mb-[9px]">{frame.description}</div>
              )}
              <div className="font-mono text-sm font-semibold text-[var(--order-accent)]">{formatVnd(frame.priceVnd)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
