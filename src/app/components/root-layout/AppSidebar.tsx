"use client";

import type { CSSProperties } from "react";
import {
  ChevronsUpDown,
  Compass,
  HelpCircle,
  LogOut,
  Moon,
  Settings as SettingsIcon,
  Sun,
  User as UserIcon,
} from "lucide-react";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { NavItem } from "./navConfig";

export interface AppSidebarUser {
  email: string | null;
  displayName: string | null;
  avatarLetter: string;
  planLabel: string;
}

export interface AppSidebarProps {
  primaryNavItems: NavItem[];
  secondaryNavItems: NavItem[];
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
  onPrefetch: (path: string) => void;
  onOpenGuide: () => void;
  resolvedTheme: "light" | "dark";
  onToggleTheme: () => void;
  user: AppSidebarUser | null;
  onAuthNavigate: (mode: "signin" | "signup") => void;
  onOpenSettings: () => void;
  onOpenAccountInfo: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  shellBadgeStyle: CSSProperties;
}

export function AppSidebar({
  primaryNavItems,
  secondaryNavItems,
  isActive,
  onNavigate,
  onPrefetch,
  onOpenGuide,
  resolvedTheme,
  onToggleTheme,
  user,
  onAuthNavigate,
  onOpenSettings,
  onOpenAccountInfo,
  onSignOut,
  isSigningOut,
}: AppSidebarProps) {
  return (
    <aside
      aria-label="Điều hướng chính"
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[272px] lg:flex-col border-r border-app-line bg-app-surface"
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-app-line px-5">
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="flex items-center gap-2.5 rounded-lg text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          aria-label="Về trang chủ Dear Our Future"
        >
          <img
            src="/favicon-512.png"
            alt="Dear Our Future"
            width={36}
            height={36}
            className="size-9 rounded-lg"
          />
          <div className="min-w-0">
            <span className="block truncate text-[16px] font-semibold tracking-tight text-app-ink">
              Dear Our Future
            </span>
            <span className="block truncate text-[12px] text-app-ink-muted">12-tuần · Vision</span>
          </div>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mục điều hướng">
        <p className="px-2.5 pb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Đi nhanh</p>
        <ul className="space-y-0.5">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-opacity ${
                    active ? "bg-app-accent opacity-100" : "opacity-0"
                  }`}
                />
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.path)}
                  onPointerEnter={() => onPrefetch(item.path)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium tracking-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                    active ? "bg-app-accent-soft text-app-accent" : "text-app-ink hover:bg-app-bg"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      active ? "text-app-accent" : "text-app-ink-muted group-hover:text-app-ink"
                    }`}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {secondaryNavItems.length > 0 ? (
          <>
            <p className="mt-6 px-2.5 pb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
              Thêm
            </p>
            <ul className="space-y-0.5">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path} className="relative">
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-opacity ${
                        active ? "bg-app-accent opacity-100" : "opacity-0"
                      }`}
                    />
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => onNavigate(item.path)}
                      onPointerEnter={() => onPrefetch(item.path)}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium tracking-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                        active
                          ? "bg-app-accent-soft text-app-accent"
                          : "text-app-ink-soft hover:bg-app-bg hover:text-app-ink"
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          active ? "text-app-accent" : "text-app-ink-muted group-hover:text-app-ink"
                        }`}
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </nav>

      <div className="shrink-0 border-t border-app-line p-3">
        <div className="flex items-center gap-1.5 pb-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-app-line bg-app-surface text-[13px] font-medium text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            aria-label={resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {resolvedTheme === "dark" ? "Sáng" : "Tối"}
          </button>
          <button
            type="button"
            onClick={onOpenGuide}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-app-line bg-app-surface text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            aria-label="Mở hướng dẫn sử dụng"
            title="Hướng dẫn"
          >
            <Compass className="h-3.5 w-3.5" />
          </button>
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg border border-app-line bg-app-surface px-2.5 py-2 text-left transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-app-accent text-[13px] font-semibold text-white"
                  aria-hidden="true"
                >
                  {user.avatarLetter}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-app-ink">
                    {user.displayName ?? user.email ?? "Tài khoản"}
                  </p>
                  <p className="truncate text-[12px] text-app-ink-muted">{user.planLabel}</p>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-app-ink-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-[228px] rounded-card border border-app-line bg-app-surface p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
            >
              <DropdownMenuLabel className="px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-app-ink-muted">
                Tài khoản
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onOpenAccountInfo();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[14px] text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink"
              >
                <UserIcon className="h-4 w-4 text-app-ink-muted" />
                Thông tin tài khoản
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onOpenSettings();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[14px] text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink"
              >
                <SettingsIcon className="h-4 w-4 text-app-ink-muted" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onOpenGuide();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[14px] text-app-ink hover:bg-app-bg focus:bg-app-bg focus:text-app-ink"
              >
                <HelpCircle className="h-4 w-4 text-app-ink-muted" />
                Hướng dẫn nhanh
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-app-line" />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onSignOut();
                }}
                disabled={isSigningOut}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[14px] text-[color:var(--color-danger-fg)] focus:bg-[color:var(--color-danger-bg)]"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-full rounded-lg bg-app-accent text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#284f45] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              onClick={() => onAuthNavigate("signup")}
            >
              Đăng ký
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-full rounded-lg border border-app-line bg-app-surface text-[14px] font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              onClick={() => onAuthNavigate("signin")}
            >
              Đăng nhập
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
