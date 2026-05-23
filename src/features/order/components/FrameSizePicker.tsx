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
              "rounded-[var(--r-card)] border bg-card p-4 text-left transition",
              isSelected
                ? "border-app-accent ring-2 ring-app-accent/30"
                : "border-[color:var(--border)] hover:border-app-accent/50",
            )}
          >
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
                className="mb-3 aspect-[3/4] w-full rounded-[var(--r-card-sm)] bg-gradient-to-br from-app-accent/10 to-app-accent/5"
              />
            )}
            <div className="text-base font-semibold">{frame.label}</div>
            {frame.description && (
              <div className="mt-1 text-xs text-muted-foreground">{frame.description}</div>
            )}
            <div className="mt-2 text-sm font-medium text-app-accent">
              {formatVnd(frame.priceVnd)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
