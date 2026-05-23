import { useLocation } from "react-router";
import { Menu, Search } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAdminSearchSlot } from "./AdminSearchContext";
import { ADMIN_NAV_ITEMS } from "./AdminSidebar";
import { adminInput } from "./tokens";
import { cn } from "../ui/utils";

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

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-white/10 bg-slate-950/92 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Mở menu admin"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
            <span className="text-slate-500">Admin</span>
            <span className="text-slate-600">/</span>
            <span className="truncate font-medium text-white">{label}</span>
          </nav>
          <span className="truncate text-sm font-semibold text-white lg:hidden">{label}</span>
        </div>

        <div className="hidden w-full max-w-xs md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            {searchActive && handler ? (
              <Input
                type="search"
                value={handler.value}
                onChange={(event) => handler.onChange(event.target.value)}
                placeholder={handler.placeholder}
                className={cn(adminInput, "h-9 pl-9")}
                aria-label="Tìm kiếm trên trang admin"
              />
            ) : (
              <Input
                type="search"
                disabled
                placeholder="Tìm kiếm (chọn trang để mở)"
                className={cn(adminInput, "h-9 pl-9 disabled:cursor-not-allowed disabled:opacity-70")}
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
