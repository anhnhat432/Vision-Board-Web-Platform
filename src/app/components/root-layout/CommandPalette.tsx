"use client";

import { ArrowRight, CalendarDays, CornerDownLeft, Search, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import type { NavItem } from "./navConfig";

export interface CommandPaletteGoal {
  id: string;
  title: string;
  hasTwelveWeek: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: NavItem[];
  goals: CommandPaletteGoal[];
  onNavigate: (path: string) => void;
  onOpenGoal: (goalId: string) => void;
  onOpenTwelveWeek: (goalId: string) => void;
}

type Action =
  | { kind: "nav"; key: string; label: string; description?: string; path: string; icon: NavItem["icon"] }
  | { kind: "goal"; key: string; label: string; description: string; goalId: string }
  | { kind: "twelve"; key: string; label: string; description: string; goalId: string };

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function CommandPalette({
  open,
  onOpenChange,
  navItems,
  goals,
  onNavigate,
  onOpenGoal,
  onOpenTwelveWeek,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    const navActions: Action[] = navItems.map((item) => ({
      kind: "nav",
      key: `nav:${item.path}`,
      label: item.label,
      description: `Đi đến ${item.label.toLowerCase()}`,
      path: item.path,
      icon: item.icon,
    }));
    const goalActions: Action[] = goals.flatMap((goal) => {
      const base: Action = {
        kind: "goal",
        key: `goal:${goal.id}`,
        label: goal.title,
        description: "Mở mục tiêu",
        goalId: goal.id,
      };
      if (!goal.hasTwelveWeek) return [base];
      return [
        base,
        {
          kind: "twelve",
          key: `twelve:${goal.id}`,
          label: `Mở 12 tuần — ${goal.title}`,
          description: "Vào trung tâm 12 tuần",
          goalId: goal.id,
        },
      ];
    });
    return [...navActions, ...goalActions];
  }, [navItems, goals]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return actions;
    return actions.filter(
      (action) => normalize(action.label).includes(q) || normalize(action.description ?? "").includes(q),
    );
  }, [actions, query]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  const runAction = (action: Action) => {
    onOpenChange(false);
    if (action.kind === "nav") onNavigate(action.path);
    if (action.kind === "goal") onOpenGoal(action.goalId);
    if (action.kind === "twelve") onOpenTwelveWeek(action.goalId);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const action = filtered[highlight];
      if (action) runAction(action);
    }
  };

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLButtonElement>(`[data-cmd-index="${highlight}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-app-line bg-app-surface p-0 sm:max-w-[560px]">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-2 border-b border-app-line px-3.5 py-2.5">
          <Search className="h-4 w-4 text-app-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Tìm trang hoặc mục tiêu…"
            className="flex-1 bg-transparent text-sm tracking-tight text-app-ink placeholder:text-app-ink-muted focus:outline-none"
            aria-label="Tìm kiếm command palette"
          />
          <kbd className="hidden rounded border border-app-line bg-app-bg px-1.5 py-0.5 text-xs font-medium text-app-ink-muted sm:inline-block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-app-ink-muted">Không có kết quả phù hợp.</div>
          ) : (
            filtered.map((action, index) => {
              const isActive = index === highlight;
              const Icon = action.kind === "nav" ? action.icon : action.kind === "twelve" ? CalendarDays : Target;
              return (
                <button
                  key={action.key}
                  type="button"
                  data-cmd-index={index}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => runAction(action)}
                  className={`group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-150 ${
                    isActive ? "bg-app-accent-soft text-app-accent" : "text-app-ink hover:bg-app-bg"
                  }`}
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-app-surface text-app-accent" : "bg-app-bg text-app-ink-muted"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{action.label}</span>
                    {action.description ? (
                      <span className="block truncate text-xs text-app-ink-muted">{action.description}</span>
                    ) : null}
                  </span>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-app-ink-muted">
                      Enter
                      <CornerDownLeft className="h-3 w-3" />
                    </span>
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 text-transparent group-hover:text-app-ink-muted" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-app-line bg-app-bg px-3.5 py-2 text-xs text-app-ink-muted">
          <span className="inline-flex items-center gap-2">
            <kbd className="rounded border border-app-line bg-app-surface px-1.5 py-0.5 font-medium">↑</kbd>
            <kbd className="rounded border border-app-line bg-app-surface px-1.5 py-0.5 font-medium">↓</kbd>
            điều hướng
          </span>
          <span className="inline-flex items-center gap-2">{filtered.length} kết quả</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
