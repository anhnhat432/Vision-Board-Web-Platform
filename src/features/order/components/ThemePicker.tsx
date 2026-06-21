import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/app/components/ui/utils";
import type { CatalogItem } from "@/features/order/catalog/types";
import { formatVnd } from "@/features/order/lib/pricing";

import { CatalogThumbnail } from "./CatalogThumbnail";

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
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-[15px] top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--order-text-muted)]" />
        <input
          type="text"
          placeholder="Tìm chủ đề…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-[42px] border border-[var(--order-border)] rounded-[11px] pl-10 pr-[14px] text-[13px] text-[var(--order-text)] bg-[var(--order-surface)] outline-none font-[inherit] transition-all focus:border-[var(--order-accent)] focus:shadow-[0_0_0_3px_var(--order-accent-soft)]"
        />
      </div>
      <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-3">
        {filtered.map((theme) => {
          const isOn = selected.includes(theme.itemId);
          return (
            <button
              type="button"
              key={theme.itemId}
              onClick={() => toggle(theme.itemId)}
              aria-pressed={isOn}
              className={cn(
                "group relative rounded-[var(--r-card)] border p-3.5 text-left transition-all duration-[0.15s] ease-[cubic-bezier(0.2,0.7,0.2,1)]",
                isOn
                  ? "border-[var(--order-accent)] ring-2 ring-[var(--order-accent-soft)] -translate-y-[2px] shadow-[0_16px_34px_-26px_rgba(23,21,15,0.4)]"
                  : "border-[var(--order-border)] bg-[var(--order-card)] hover:-translate-y-[2px] hover:shadow-[0_16px_34px_-26px_rgba(23,21,15,0.4)]",
              )}
            >
              {isOn && (
                <span className="absolute left-[7px] top-[7px] flex h-5 w-5 items-center justify-center rounded-full bg-[var(--order-accent)] text-white shadow-sm z-10">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <CatalogThumbnail item={theme} className="mb-[10px] aspect-square w-full rounded-[9px]" compact />
              <div className="text-left flex items-center justify-between gap-[6px]">
                <span className="text-xs font-bold text-[var(--order-text)]">{theme.label}</span>
              </div>
              <div className="text-left font-mono text-xs font-semibold text-[var(--order-accent)] mt-[2px]">
                {formatVnd(theme.priceVnd)}
              </div>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--order-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--order-eyebrow)]">
          Đã chọn {selected.length} set
        </div>
      )}
    </div>
  );
}
