import { Check } from "lucide-react";

import { cn } from "@/app/components/ui/utils";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";

export interface FrameSizePickerProps {
  frames: CatalogItem[];
  selected: string | null;
  onChange: (itemId: string) => void;
}

export function FrameSizePicker({ frames, selected, onChange }: FrameSizePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {frames.map((frame) => {
        const isSelected = selected === frame.itemId;
        return (
          <button
            type="button"
            key={frame.itemId}
            onClick={() => onChange(frame.itemId)}
            aria-pressed={isSelected}
            className={cn(
              "group relative rounded-[var(--r-card)] border bg-[var(--order-card)] p-4 text-left transition-all duration-150",
              isSelected
                ? "border-[var(--order-accent)] ring-2 ring-[var(--order-accent-soft)]"
                : "border-[var(--order-border)] hover:-translate-y-[2px] hover:border-[var(--order-accent)]/60 hover:shadow-sm",
            )}
          >
            {isSelected && (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--order-accent)] text-white shadow-sm">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            {frame.thumbnail ? (
              <img
                src={frame.thumbnail}
                alt={frame.label}
                className="mb-3 aspect-[3/4] w-full rounded-[var(--r-card-sm)] object-cover"
                loading="lazy"
              />
            ) : (
              <div
                data-testid="catalog-thumbnail-placeholder"
                aria-hidden="true"
                className="mb-3 aspect-[3/4] w-full rounded-[var(--r-card-sm)] bg-gradient-to-br from-[var(--order-accent-soft)]/40 to-[var(--order-bg)]"
              />
            )}
            <div className="text-base font-semibold">{frame.label}</div>
            {frame.description && (
              <div className="mt-1 text-xs text-[var(--order-text-muted)]">{frame.description}</div>
            )}
            <div className="mt-2 text-sm font-semibold text-[var(--order-accent)]">{formatVnd(frame.priceVnd)}</div>
          </button>
        );
      })}
    </div>
  );
}
