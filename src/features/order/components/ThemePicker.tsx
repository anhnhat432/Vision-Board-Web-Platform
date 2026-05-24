import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

import { cn } from "@/app/components/ui/utils";
import { Input } from "@/app/components/ui/input";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";

export interface ThemePickerProps {
  themes: CatalogItem[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function ThemePicker({ themes, selected, onChange }: ThemePickerProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return themes;
    const q = query.toLowerCase();
    return themes.filter((t) => t.label.toLowerCase().includes(q));
  }, [themes, query]);

  function toggle(itemId: string) {
    if (selected.includes(itemId)) {
      onChange(selected.filter((id) => id !== itemId));
    } else {
      onChange([...selected, itemId]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--order-text-muted)]" />
        <Input
          placeholder="Tìm chủ đề..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((theme) => {
          const isOn = selected.includes(theme.itemId);
          return (
            <button
              type="button"
              key={theme.itemId}
              onClick={() => toggle(theme.itemId)}
              aria-pressed={isOn}
              className={cn(
                "group relative rounded-[var(--r-card)] border bg-[var(--order-card)] p-3 text-left transition-all duration-150",
                isOn
                  ? "border-[var(--order-accent)] ring-2 ring-[var(--order-accent-soft)]"
                  : "border-[var(--order-border)] hover:-translate-y-[2px] hover:border-[var(--order-accent)]/60",
              )}
            >
              {isOn && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--order-accent)] text-white shadow-sm">
                  <Check className="h-3 w-3" />
                </span>
              )}
              {theme.thumbnail ? (
                <img
                  src={theme.thumbnail}
                  alt={theme.label}
                  className="mb-2 aspect-square w-full rounded-[var(--r-card-sm)] object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  data-testid="catalog-thumbnail-placeholder"
                  aria-hidden="true"
                  className="mb-2 aspect-square w-full rounded-[var(--r-card-sm)] bg-gradient-to-br from-[var(--order-accent-soft)]/40 to-[var(--order-bg)]"
                />
              )}
              <div className="text-sm font-medium">{theme.label}</div>
              <div className="mt-1 text-xs font-medium text-[var(--order-accent)]">
                {formatVnd(theme.priceVnd)}
              </div>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="inline-flex items-center gap-1 rounded-full bg-[var(--order-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--order-eyebrow)]">
          Đã chọn {selected.length} set
        </div>
      )}
    </div>
  );
}
