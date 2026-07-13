import { ChevronRight, Menu, Search } from "lucide-react";
import { useLocation } from "react-router";

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
            <span className="rounded-md bg-app-accent-soft/50 px-2 py-0.5 text-xs font-semibold text-app-accent">
              Admin
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-app-ink-muted" />
            <span className="truncate font-semibold text-app-ink">{label}</span>
          </nav>

          {/* Mobile page label */}
          <span className="truncate text-sm font-semibold text-app-ink lg:hidden">
            {label}
          </span>
        </div>

        {handler ? (
          <div className="hidden w-full max-w-sm md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
              <Input
                type="search"
                value={handler.value}
                onChange={(event) => handler.onChange(event.target.value)}
                placeholder={handler.placeholder}
                className={cn(
                  adminInput,
                  "h-9 rounded-lg border-app-line/60 bg-app-surface pl-9",
                )}
                aria-label="Tìm kiếm trên trang admin"
              />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
