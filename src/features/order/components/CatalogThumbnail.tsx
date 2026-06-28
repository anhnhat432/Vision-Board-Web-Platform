import { Package, Sparkles } from "lucide-react";

import { cn } from "@/app/components/ui/utils";
import type { CatalogItem } from "@/features/order/catalog/types";

const ICON_BY_TYPE: Record<CatalogItem["type"], typeof Sparkles> = {
  frame: Package,
  theme: Sparkles,
  sticker: Sparkles,
};

export interface CatalogThumbnailProps {
  item: Pick<CatalogItem, "label" | "thumbnail" | "type">;
  className?: string;
  compact?: boolean;
  loading?: "eager" | "lazy";
  showLabel?: boolean;
}

export function CatalogThumbnail({
  item,
  className,
  compact = false,
  loading = "lazy",
  showLabel = false,
}: CatalogThumbnailProps) {
  if (item.thumbnail) {
    return (
      <img
        src={item.thumbnail}
        alt={item.label}
        className={cn("rounded-[var(--r-card-sm)] bg-[var(--order-bg)] object-cover", className)}
        loading={loading}
        decoding="async"
      />
    );
  }

  const Icon = ICON_BY_TYPE[item.type] ?? Sparkles;

  return (
    <div
      data-testid="catalog-thumbnail-placeholder"
      role="img"
      aria-label={`Chưa có ảnh sản phẩm cho ${item.label}`}
      className={cn(
        "relative flex overflow-hidden rounded-[var(--r-card-sm)] border border-[var(--order-border)] bg-[var(--order-bg)] text-[var(--order-text-muted)]",
        "items-center justify-center p-3 text-center",
        "before:absolute before:inset-3 before:rounded-full before:border before:border-dashed before:border-[var(--order-border)] before:opacity-70",
        className,
      )}
    >
      <div className="relative z-10 flex max-w-full flex-col items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--order-border)] bg-[var(--order-card)] text-[var(--order-accent)] shadow-sm">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span
          className={cn(
            "max-w-full font-semibold leading-snug text-[var(--order-text)]",
            compact ? "line-clamp-2 text-[11px]" : "text-xs",
          )}
        >
          {showLabel ? item.label : "Ảnh sắp cập nhật"}
        </span>
      </div>
    </div>
  );
}
