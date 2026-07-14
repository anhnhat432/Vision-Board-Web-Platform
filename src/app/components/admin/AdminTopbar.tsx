import { ArrowLeft, ChevronRight, Menu, Search } from "lucide-react";
import { Link, useLocation } from "react-router";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../ui/utils";
import { useAdminSearchSlot } from "./AdminSearchContext";
import { ADMIN_NAV_ITEMS } from "./AdminSidebar";
import { adminInput } from "./tokens";

interface AdminTopbarProps {
  onOpenSidebar: () => void;
}

function findAdminLabel(pathname: string): string {
  const match = ADMIN_NAV_ITEMS.find((item) => pathname.startsWith(item.to));
  return match?.label ?? "Tổng quan";
}

/**
 * Sticky topbar shared by every admin page.
 *
 * Mobile shows a burger that opens the sidebar Sheet; desktop shows a
 * breadcrumb. The search input is bound to whichever page registered itself
 * via `useAdminSearch`. When no page registers, the input falls back to a
 * disabled stub so the layout stays aligned.
 */
export function AdminTopbar({ onOpenSidebar }: AdminTopbarProps) {
  const location = useLocation();
  const label = findAdminLabel(location.pathname);
  const { handler } = useAdminSearchSlot();
  const searchActive = handler !== null;

  const isDashboard = location.pathname === "/admin" || location.pathname === "/admin/dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-app-line bg-app-bg/85 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: mobile menu + breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-app-ink-soft hover:bg-app-accent-soft hover:text-app-ink lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Mở menu admin"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop breadcrumb with chevron */}
          <nav
            aria-label="Breadcrumb"
            className="hidden min-w-0 items-center gap-1.5 text-sm lg:flex"
          >
            <Link
              to="/admin/dashboard"
              className="rounded-md bg-app-accent-soft/50 px-2 py-0.5 text-xs font-semibold text-app-accent hover:bg-app-accent-soft transition-colors"
            >
              Admin
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-app-ink-muted" />
            <span className="truncate font-semibold text-app-ink">{label}</span>
          </nav>

          {/* Mobile page label with optional back link */}
          <div className="flex min-w-0 items-center gap-1.5 lg:hidden">
            {!isDashboard && (
              <Link
                to="/admin/dashboard"
                aria-label="Quay lại tổng quan quản trị"
                className="inline-flex items-center text-app-ink-muted hover:text-app-ink transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            <span className="truncate text-sm font-semibold text-app-ink">{label}</span>
          </div>
        </div>

        {/* Right: search */}
        <div className="hidden w-full max-w-xs md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
            {searchActive && handler ? (
              <Input
                type="search"
                value={handler.value}
                onChange={(event) => handler.onChange(event.target.value)}
                placeholder={handler.placeholder}
                className={cn(
                  adminInput,
                  "h-9 rounded-lg pl-9 border-app-line/60 bg-app-bg-subtle/60",
                )}
                aria-label="Tìm kiếm trên trang admin"
              />
            ) : (
              <Input
                type="search"
                disabled
                placeholder="Tìm kiếm (chọn trang để mở)"
                className={cn(
                  adminInput,
                  "h-9 rounded-lg pl-9 border-app-line/60 bg-app-bg-subtle/60 disabled:cursor-not-allowed disabled:opacity-60",
                )}
                aria-label="Tìm kiếm trên trang admin"
                title="Tìm kiếm hoạt động khi trang hỗ trợ"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}