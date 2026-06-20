"use client";

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
import type { CSSProperties } from "react";

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
          className="-mx-1 flex items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-colors duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-app-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
          aria-label="Về trang chủ Dear Our Future"
        >
          <img
            src="/favicon-512.png"
            alt="Dear Our Future"
            width={36}
            height={36}
            className="size-9 rounded-lg object-cover shadow-sm ring-1 ring-app-accent/20"
          />
          <div className="min-w-0">
            <span className="block truncate text-base font-semibold tracking-tight text-app-ink">Dear Our Future</span>
            <span className="block truncate text-xs text-app-ink-muted">12-tuần · Vision</span>
          </div>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Mục điều hướng">
        <p className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted/80">Đi nhanh</p>
        <ul className="space-y-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200 ${
                    active ? "bg-app-accent opacity-100" : "opacity-0"
                  }`}
                />
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.path)}
                  onPointerEnter={() => onPrefetch(item.path)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium tracking-tight transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                    active
                      ? "bg-app-accent-soft text-app-accent font-semibold shadow-xs"
                      : "text-app-ink hover:bg-app-bg hover:translate-x-0.5"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${
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
            <p className="mt-7 px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted/80">
              Thêm
            </p>
            <ul className="space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path} className="relative">
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200 ${
                        active ? "bg-app-accent opacity-100" : "opacity-0"
                      }`}
                    />
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => onNavigate(item.path)}
                      onPointerEnter={() => onPrefetch(item.path)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium tracking-tight transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                        active
                          ? "bg-app-accent-soft text-app-accent font-semibold shadow-xs"
                          : "text-app-ink-soft hover:bg-app-bg hover:text-app-ink hover:translate-x-0.5"
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${
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

      <div className="shrink-0 border-t border-app-line/75 p-4 bg-app-bg-subtle/30">
        <div className="flex items-center gap-2 pb-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface text-xs font-semibold text-app-ink-soft transition-all duration-200 hover:bg-app-bg hover:text-app-ink hover:shadow-xs active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            aria-label={resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 text-app-warm animate-pulse" />
            ) : (
              <Moon className="h-4 w-4 text-app-ink-muted" />
            )}
            {resolvedTheme === "dark" ? "Sáng" : "Tối"}
          </button>
          <button
            type="button"
            onClick={onOpenGuide}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-line bg-app-surface text-app-ink-soft transition-all duration-200 hover:bg-app-bg hover:text-app-ink hover:shadow-xs active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            aria-label="Mở hướng dẫn sử dụng"
            title="Hướng dẫn"
          >
            <Compass className="h-4 w-4" />
          </button>
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl border border-app-line/80 bg-app-surface p-2.5 text-left transition-all duration-200 hover:bg-app-bg hover:border-app-accent/20 hover:shadow-xs active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-app-accent to-app-accent-hover text-xs font-bold text-white shadow-xs"
                  aria-hidden="true"
                >
                  {user.avatarLetter}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-app-ink leading-tight">
                    {user.displayName ?? user.email ?? "Tài khoản"}
                  </p>
                  <p className="truncate text-[10px] font-bold text-app-ink-muted/95 uppercase tracking-wider mt-0.5">
                    {user.planLabel}
                  </p>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-app-ink-muted/80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-[240px] rounded-card border border-app-line bg-app-surface p-1.5 shadow-app-lg"
            >
              <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted/90 border-b border-app-line/45 mb-1">
                Tài khoản
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onOpenAccountInfo();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-app-ink transition-all duration-150 hover:bg-app-bg focus:bg-app-bg focus:text-app-ink"
              >
                <UserIcon className="h-4 w-4 text-app-ink-muted" />
                Thông tin tài khoản
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onOpenSettings();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-app-ink transition-all duration-150 hover:bg-app-bg focus:bg-app-bg focus:text-app-ink"
              >
                <SettingsIcon className="h-4 w-4 text-app-ink-muted" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onOpenGuide();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-app-ink transition-all duration-150 hover:bg-app-bg focus:bg-app-bg focus:text-app-ink"
              >
                <HelpCircle className="h-4 w-4 text-app-ink-muted" />
                Hướng dẫn nhanh
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5 bg-app-line" />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onSignOut();
                }}
                disabled={isSigningOut}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-app-status-error transition-all duration-150 focus:bg-app-status-error/10 dark:focus:bg-app-status-error/20"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-full rounded-xl bg-app-accent text-sm font-semibold text-white transition-all duration-200 hover:bg-app-accent-hover hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 shadow-xs"
              onClick={() => onAuthNavigate("signup")}
            >
              Đăng ký
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-full rounded-xl border border-app-line bg-app-surface text-sm font-semibold text-app-ink transition-all duration-200 hover:bg-app-bg hover:text-app-ink hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 shadow-3xs"
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
