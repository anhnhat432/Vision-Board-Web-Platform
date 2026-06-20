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
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[248px] lg:flex-col border-r border-white/10 bg-[#17150F] text-[#E4E2DB]"
    >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17150F]"
          aria-label="Về trang chủ Dear Our Future"
        >
          <span
            aria-hidden="true"
            className="flex size-[38px] shrink-0 -rotate-6 items-center justify-center rounded-[11px] bg-[#0C5E3A] font-serif text-[19px] font-extrabold text-[#C6F24E]"
          >
            D
          </span>
          <div className="min-w-0 leading-tight">
            <span className="block truncate font-serif text-[15px] font-bold tracking-tight text-white">
              Dear Our Future
            </span>
            <span className="block truncate text-[10.5px] font-medium tracking-[0.04em] text-[#8C887C]">
              12 tuần · Vision
            </span>
          </div>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3.5 py-4" aria-label="Mục điều hướng">
        <p className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E6A5E]">Đi nhanh</p>
        <ul className="space-y-0.5">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#C6F24E] transition-all duration-200 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.path)}
                  onPointerEnter={() => onPrefetch(item.path)}
                  className={`group flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13.5px] tracking-tight transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]/30 ${
                    active
                      ? "bg-[#C6F24E]/10 font-semibold text-white"
                      : "font-medium text-[#B5B1A6] hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      active ? "text-[#C6F24E]" : "text-[#8C887C] group-hover:text-[#E4E2DB]"
                    }`}
                    strokeWidth={2}
                  />
                  <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {secondaryNavItems.length > 0 ? (
          <>
            <p className="mt-5 px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6E6A5E]">Thêm</p>
            <ul className="space-y-0.5">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path} className="relative">
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#C6F24E] transition-all duration-200 ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => onNavigate(item.path)}
                      onPointerEnter={() => onPrefetch(item.path)}
                      className={`group flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13.5px] tracking-tight transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]/30 ${
                        active
                          ? "bg-[#C6F24E]/10 font-semibold text-white"
                          : "font-medium text-[#B5B1A6] hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          active ? "text-[#C6F24E]" : "text-[#8C887C] group-hover:text-[#E4E2DB]"
                        }`}
                        strokeWidth={2}
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

      <div className="shrink-0 border-t border-white/10 p-3.5">
        <div className="flex items-center gap-2 pb-2.5">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-[38px] flex-1 items-center justify-center gap-2 rounded-[11px] border border-white/10 bg-white/[0.06] text-[12.5px] font-semibold text-[#E4E2DB] transition-all duration-200 hover:bg-white/[0.1] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]/30"
            aria-label={resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-[15px] w-[15px] text-[#C6F24E]" />
            ) : (
              <Moon className="h-[15px] w-[15px]" />
            )}
            {resolvedTheme === "dark" ? "Sáng" : "Tối"}
          </button>
          <button
            type="button"
            onClick={onOpenGuide}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.06] text-[#E4E2DB] transition-all duration-200 hover:bg-white/[0.1] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]/30"
            aria-label="Mở hướng dẫn sử dụng"
            title="Hướng dẫn"
          >
            <Compass className="h-[15px] w-[15px]" />
          </button>
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-[11px] p-1.5 text-left transition-all duration-200 hover:bg-white/[0.06] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]/30"
              >
                <div
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#C6F24E] font-serif text-[15px] font-extrabold text-[#17150F]"
                  aria-hidden="true"
                >
                  {user.avatarLetter}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white leading-tight">
                    {user.displayName ?? user.email ?? "Tài khoản"}
                  </p>
                  <p className="truncate text-[10px] font-semibold text-[#8C887C] uppercase tracking-[0.06em] mt-0.5">
                    {user.planLabel}
                  </p>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-[#8C887C]" />
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
              className="h-10 w-full rounded-xl bg-[#C6F24E] text-sm font-semibold text-[#17150F] transition-all duration-200 hover:bg-[#d4f76e] hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]/40"
              onClick={() => onAuthNavigate("signup")}
            >
              Đăng ký
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-[#E4E2DB] transition-all duration-200 hover:bg-white/[0.1] hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]/30"
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
