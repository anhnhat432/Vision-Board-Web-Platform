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

import { getAppMode, type AppMode } from "../../utils/app-mode";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

export interface AdminNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
}

export interface AdminNavGroup {
  id: "overview" | "customers" | "business" | "operations" | "system";
  label: string;
  items: AdminNavItem[];
}

export function getAdminNavGroups(appMode: AppMode = getAppMode()): AdminNavGroup[] {
  return [
    {
      id: "overview",
      label: "Tổng quan",
      items: [{ to: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard }],
    },
    {
      id: "customers",
      label: "Khách hàng",
      items: [
        { to: "/admin/users", label: "Người dùng", icon: Users },
        { to: "/admin/subscriptions", label: "Subscription", icon: CreditCard },
        { to: "/admin/email-history", label: "Email", icon: Mail },
      ],
    },
    {
      id: "business",
      label: "Kinh doanh",
      items: [
        ...(appMode === "real"
          ? [
              {
                to: "/admin/reports/sales",
                label: "Báo cáo kinh doanh",
                icon: ChartNoAxesCombined,
              },
            ]
          : []),
        { to: "/admin/payments", label: "Thanh toán", icon: WalletCards },
        { to: "/admin/refunds", label: "Hoàn tiền", icon: FileText },
        { to: "/admin/discounts", label: "Giảm giá", icon: Percent },
      ],
    },
    {
      id: "operations",
      label: "Vận hành",
      items: [
        { to: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
        { to: "/admin/catalog", label: "Catalog", icon: Package },
      ],
    },
    {
      id: "system",
      label: "Hệ thống",
      items: [
        { to: "/admin/settings", label: "Cài đặt", icon: Settings },
        { to: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
      ],
    },
  ];
}

export function getAdminNavItems(appMode: AppMode = getAppMode()): AdminNavItem[] {
  return getAdminNavGroups(appMode).flatMap((group) => group.items);
}

export const ADMIN_NAV_GROUPS = getAdminNavGroups();
export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

interface AdminSidebarProps {
  email: string;
  onLogout: () => void;
  pendingCounts?: Partial<Record<string, number>>;
  onNavigate?: () => void;
}

export function AdminSidebar({ email, onLogout, pendingCounts, onNavigate }: AdminSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col bg-app-bg">
      <div className="border-b border-app-line px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-app-accent text-white">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-app-ink">Admin Panel</p>
            <p className="truncate text-xs text-app-ink-muted">{email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Điều hướng quản trị">
        <div className="space-y-5">
          {ADMIN_NAV_GROUPS.map((group) => {
            const headingId = `admin-nav-${group.id}`;
            return (
              <section key={group.id} aria-labelledby={headingId}>
                <h2
                  id={headingId}
                  className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted"
                >
                  {group.label}
                </h2>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const badge = pendingCounts?.[item.to];
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        end={item.to === "/admin/dashboard"}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
                            isActive
                              ? "bg-app-accent-soft text-app-ink"
                              : "text-app-ink-muted hover:bg-app-bg-subtle hover:text-app-ink",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive ? (
                              <span
                                className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-app-accent"
                                aria-hidden="true"
                              />
                            ) : null}
                            <item.icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isActive ? "text-app-accent" : "text-app-ink-muted",
                              )}
                            />
                            <span className="flex-1 truncate">{item.label}</span>
                            {typeof badge === "number" && badge > 0 ? (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-app-accent px-1.5 text-[10px] font-bold text-white">
                                {badge}
                              </span>
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-app-line p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 rounded-lg text-app-ink-muted transition-colors duration-150 hover:bg-app-status-error/10 hover:text-app-status-error motion-reduce:transition-none"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
