"use client";

import type { CSSProperties } from "react";
import {
  ChevronsUpDown,
  Compass,
  HelpCircle,
  LogOut,
  Moon,
  Settings as SettingsIcon,
  Sparkles,
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
  shellBadgeStyle,
}: AppSidebarProps) {
  return (
    <aside
      aria-label="Điều hướng chính"
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[272px] lg:flex-col lg:border-r lg:border-[color:var(--border)] lg:bg-card"
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[color:var(--border)] px-5">
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="flex items-center gap-2.5 rounded-[var(--r-control)] text-left transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          aria-label="Về trang chủ Dear Our Future"
        >
          <div
            className="flex size-9 items-center justify-center rounded-[var(--r-control)] shadow-[0_2px_8px_-4px_var(--tone-shell-shadow)]"
            style={shellBadgeStyle}
          >
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-[15px] font-bold tracking-[-0.012em] text-foreground">
              Dear Our Future
            </span>
            <span className="block truncate text-xs text-muted-foreground">12-tuần · Vision</span>
          </div>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mục điều hướng">
        <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Đi nhanh
        </p>
        <ul className="space-y-0.5">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                  style={active ? { background: "linear-gradient(180deg, var(--tone-shell-primary), var(--tone-shell-secondary))" } : undefined}
                />
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.path)}
                  onPointerEnter={() => onPrefetch(item.path)}
                  className={`group flex w-full items-center gap-3 rounded-[var(--r-control)] px-3 py-2.5 text-sm font-semibold tracking-tight transition-colors ${
                    active
                      ? "bg-[color-mix(in_srgb,var(--tone-shell-primary)_10%,transparent)] text-[color:var(--tone-shell-primary)]"
                      : "text-foreground hover:bg-[color:var(--muted)]"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[color:var(--tone-shell-primary)]" : "text-muted-foreground group-hover:text-foreground"}`}
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
            <p className="mt-6 px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                        active ? "opacity-100" : "opacity-0"
                      }`}
                      style={active ? { background: "linear-gradient(180deg, var(--tone-shell-primary), var(--tone-shell-secondary))" } : undefined}
                    />
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => onNavigate(item.path)}
                      onPointerEnter={() => onPrefetch(item.path)}
                      className={`group flex w-full items-center gap-3 rounded-[var(--r-control)] px-3 py-2.5 text-sm font-medium tracking-tight transition-colors ${
                        active
                          ? "bg-[color-mix(in_srgb,var(--tone-shell-primary)_10%,transparent)] text-[color:var(--tone-shell-primary)]"
                          : "text-muted-foreground hover:bg-[color:var(--muted)] hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[color:var(--tone-shell-primary)]" : "text-muted-foreground group-hover:text-foreground"}`}
                        strokeWidth={active ? 2.2 : 1.7}
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

      <div className="shrink-0 border-t border-[color:var(--border)] p-3">
        <div className="flex items-center gap-1.5 pb-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-[color:var(--border)] bg-[color:var(--muted)] text-xs font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label={resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {resolvedTheme === "dark" ? "Sáng" : "Tối"}
          </button>
          <button
            type="button"
            onClick={onOpenGuide}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--r-control)] border border-[color:var(--border)] bg-[color:var(--muted)] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
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
                className="flex w-full items-center gap-2.5 rounded-[var(--r-control)] border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-2 text-left transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={shellBadgeStyle}
                  aria-hidden="true"
                >
                  {user.avatarLetter}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user.displayName ?? user.email ?? "Tài khoản"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user.planLabel}</p>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-[228px] rounded-[var(--r-soft)] border border-[color:var(--border)] bg-popover p-1.5 shadow-[0_4px_8px_-2px_rgba(15,23,42,0.06),0_16px_32px_-12px_rgba(15,23,42,0.16)]"
            >
              <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Tài khoản
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onOpenAccountInfo();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-[calc(var(--r-control)-3px)] px-2.5 py-2 text-sm text-foreground"
              >
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                Thông tin tài khoản
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onOpenSettings();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-[calc(var(--r-control)-3px)] px-2.5 py-2 text-sm text-foreground"
              >
                <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onOpenGuide();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-[calc(var(--r-control)-3px)] px-2.5 py-2 text-sm text-foreground"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Hướng dẫn nhanh
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-[color:var(--border)]" />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onSignOut();
                }}
                disabled={isSigningOut}
                className="flex cursor-pointer items-center gap-2 rounded-[calc(var(--r-control)-3px)] px-2.5 py-2 text-sm text-[color:var(--color-danger-fg)] focus:bg-[color:var(--color-danger-bg)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Button
              variant="default"
              size="sm"
              className="h-10 w-full rounded-[var(--r-control)] text-sm"
              onClick={() => onAuthNavigate("signup")}
            >
              Đăng ký
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full rounded-[var(--r-control)] text-sm"
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
