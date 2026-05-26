import type { ComponentType } from "react";
import { NavLink } from "react-router";
import { LayoutDashboard, ClipboardList, CreditCard, WalletCards, Package, LogOut } from "lucide-react";

import { Button } from "../ui/button";
import { cn } from "../ui/utils";

export interface AdminNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Optional pending badge count. Hidden when 0 / undefined. */
  badge?: number;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { to: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
  { to: "/admin/payments", label: "Thanh toán", icon: CreditCard },
  { to: "/admin/refunds", label: "Hoàn tiền", icon: WalletCards },
  { to: "/admin/catalog", label: "Catalog", icon: Package },
];

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
export function AdminSidebar({ email, onLogout, pendingCounts, onNavigate }: AdminSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-slate-950">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[var(--r-tile)] bg-cyan-500/15 text-cyan-300">
          <LayoutDashboard className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Admin</p>
          <p className="truncate text-xs text-slate-400">{email}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin navigation">
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
                  "group flex items-center gap-3 rounded-[var(--r-control)] px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {typeof badge === "number" && badge > 0 ? (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-[var(--r-pill)] bg-cyan-500/20 px-1.5 text-xs font-semibold text-cyan-200">
                  {badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
