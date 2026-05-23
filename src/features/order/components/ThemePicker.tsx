import { useMemo, useState } from "react";

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
      <Input
        placeholder="Tìm chủ đề..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
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
                "rounded-[var(--r-card)] border bg-card p-3 text-left transition",
                isOn
                  ? "border-app-accent ring-2 ring-app-accent/30"
                  : "border-[color:var(--border)] hover:border-app-accent/50",
              )}
            >
              <div className="text-sm font-medium">{theme.label}</div>
              <div className="mt-1 text-xs text-app-accent">{formatVnd(theme.priceVnd)}</div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground">Đã chọn {selected.length} set</div>
    </div>
  );
}
