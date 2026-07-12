import {
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Percent,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router";

import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { getAppMode, type AppMode } from "../../utils/app-mode";

export interface AdminNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Optional pending badge count. Hidden when 0 / undefined. */
  badge?: number;
}

export function getAdminNavItems(appMode: AppMode = getAppMode()): AdminNavItem[] {
  return [
    { to: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { to: "/admin/users", label: "Người dùng", icon: Users },
    { to: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
    { to: "/admin/subscriptions", label: "Subscription", icon: CreditCard },
    { to: "/admin/payments", label: "Thanh toán", icon: WalletCards },
    ...(appMode === "real"
      ? [{ to: "/admin/reports/sales", label: "Báo cáo kinh doanh", icon: ChartNoAxesCombined }]
      : []),
    { to: "/admin/refunds", label: "Hoàn tiền", icon: FileText },
    { to: "/admin/discounts", label: "Giảm giá", icon: Percent },
    { to: "/admin/catalog", label: "Catalog", icon: Package },
    { to: "/admin/email-history", label: "Email", icon: Mail },
    { to: "/admin/settings", label: "Cài đặt", icon: Settings },
    { to: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  ];
}

export const ADMIN_NAV_ITEMS = getAdminNavItems();

interface AdminSidebarProps {
  email: string;
  onLogout: () => void;
  /** Map của route → số pending để gắn badge. */
  pendingCounts?: Partial<Record<string, number>>;
  /** Khi user chọn một item trên mobile, đóng sheet. */
  onNavigate?: () => void;
}

/**
 * Persistent left rail for admin pages.
 *
 * Renders a 240px column on `lg+`. On mobile this component is rendered inside
 * a Sheet by the layout, so it doesn't gate its own visibility.
 */
export function AdminSidebar({
  email,
  onLogout,
  pendingCounts,
  onNavigate,
}: AdminSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-app-line bg-app-bg">
      {/* ── Brand header ── */}
      <div className="relative overflow-hidden border-b border-app-line px-5 py-5">
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-app-accent/8 via-transparent to-transparent" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-app-accent to-app-accent/70 text-white shadow-sm">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-app-ink">
              Admin Panel
            </p>
            <p className="truncate text-xs text-app-ink-muted">{email}</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 space-y-0.5 px-3 py-4"
        aria-label="Admin navigation"
      >
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted/70">
          Điều hướng
        </p>
        {ADMIN_NAV_ITEMS.map((item) => {
          const badge = pendingCounts?.[item.to];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              end={item.to === "/admin/dashboard"}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-app-accent-soft/80 text-app-ink shadow-sm"
                    : "text-app-ink-muted hover:bg-app-bg-subtle hover:text-app-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active left accent bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-app-accent" />
                  )}
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors duration-150",
                      isActive
                        ? "text-app-accent"
                        : "text-app-ink-muted group-hover:text-app-ink-soft",
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {typeof badge === "number" && badge > 0 ? (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-app-accent px-1.5 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="border-t border-app-line p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 rounded-xl text-app-ink-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors duration-150"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
