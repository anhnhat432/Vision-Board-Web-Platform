import { Link } from "react-router";

interface DashboardTopBarProps {
  currentWeek: number | null;
  displayName?: string;
}

function getInitials(displayName?: string): string {
  const normalized = displayName?.trim();
  if (!normalized) return "VB";

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function DashboardTopBar({ currentWeek, displayName }: DashboardTopBarProps) {
  const navItems = [
    { label: "Trang chính", href: "/", active: true },
    { label: "Today", href: "/today-v2", active: false },
    { label: currentWeek ? `Tuần ${currentWeek}` : "Tuần", href: "/12-week-system?tab=week", active: false },
    { label: "12 tuần", href: "/12-week-system", active: false },
    { label: "Phản tư", href: "/journal", active: false },
  ];

  return (
    <header className="sticky top-3 z-30 mx-auto max-w-6xl px-6">
      <div className="flex h-14 items-center justify-between gap-4 rounded-card border border-app-line bg-app-surface/95 px-3 shadow-[0_1px_2px_rgba(26,26,26,0.04)] backdrop-blur sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-app-accent text-[13px] font-semibold text-white">
            V
          </span>
          <span className="truncate text-[15px] font-semibold text-app-ink">Vision Board</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Dashboard">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`relative py-2 text-[14px] font-medium transition-colors duration-150 ${
                item.active ? "text-app-ink" : "text-app-ink-muted hover:text-app-ink"
              }`}
            >
              {item.label}
              {item.active ? <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-app-accent" /> : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-app-accent-soft px-3 py-1 text-[12px] font-medium text-app-accent md:hidden">
            Trang chính{currentWeek ? ` · Tuần ${currentWeek}` : ""}
          </span>
          <div className="flex size-8 items-center justify-center rounded-full bg-app-accent-soft text-[12px] font-semibold text-app-accent">
            {getInitials(displayName)}
          </div>
        </div>
      </div>
    </header>
  );
}
