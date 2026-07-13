# Admin UI System Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Editorial Operations Admin shell and shared presentation contract, then fully migrate Dashboard and Users as the reference pages for later Admin phases.

**Architecture:** Keep every API call, auth guard, route, filter contract, request ID, and mutation inside its existing page or service. The shared layer owns only navigation structure, page chrome, responsive layout, data surfaces, status presentation, and persistent feedback. Dashboard and Users consume these presentational components without moving business logic into a generic table or shell abstraction.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, existing Radix-based UI components, Lucide icons, Vitest, Testing Library, Biome, Vite 6.

## Global Constraints

- Frontend-only Shell work; do not change backend models, APIs, auth, billing, entitlement, localStorage, sync, or operational-classification persistence.
- Keep all current `/admin/*` routes and the real-mode-only `/admin/reports/sales` boundary unchanged.
- Use existing `app-*` semantic tokens so light and dark themes remain aligned with the application.
- Optimize for desktop operations while keeping important navigation, search, filters, and actions usable at approximately 390px.
- Do not add a dependency.
- Do not create a universal data-table abstraction that owns query, pagination, selection, or mutation state.
- Preserve Dashboard metric definitions; do not add or claim active-user or DAU metrics.
- Preserve Users URL normalization, category filters, request IDs, idempotent retry behavior, audit semantics, and navigation race protections.
- Do not touch or restore the dirty primary checkout at `D:\Projects\Vision Board Web Platform`; work only in `D:\Projects\Vision-Board-admin-data-classification-spec`.

---

## File Structure

### Shared shell

- Modify `src/app/components/admin/AdminLayout.tsx`: apply the 256px desktop rail, wide content frame, and restrained background.
- Modify `src/app/components/admin/AdminSidebar.tsx`: define grouped navigation and render accessible group labels.
- Modify `src/app/components/admin/AdminSidebar.test.tsx`: cover group order, mode gating, active state, and pending badges.
- Modify `src/app/components/admin/AdminTopbar.tsx`: omit search entirely when no page registers a handler.
- Create `src/app/components/admin/AdminTopbar.test.tsx`: cover registered and absent search states.
- Modify `src/app/components/admin/AdminSearchContext.tsx`: align documentation with omission rather than a disabled fallback.

### Shared Editorial Operations primitives

- Modify `src/app/components/admin/tokens.ts`: reduce decorative gradients, lift, and shadow while retaining semantic theme tokens.
- Modify `src/app/components/admin/AdminPageHeader.tsx`: support optional metadata and remove decorative accent-line styling.
- Modify `src/app/components/admin/AdminEmptyState.tsx`: use a restrained semantic icon surface.
- Modify `src/app/components/admin/AdminStatCard.tsx`: use a restrained status accent instead of a full decorative gradient bar.
- Create `src/app/components/admin/AdminToolbar.tsx`: presentational filter/search/action wrapper.
- Create `src/app/components/admin/AdminDataPanel.tsx`: presentational table/list surface with heading, actions, footer, and busy state.
- Create `src/app/components/admin/AdminUiPrimitives.test.tsx`: cover headings, regions, metadata, toolbar labels, and busy state.

### Feedback and status

- Modify `src/app/components/admin/AdminStatusBadge.tsx`: add the neutral tone required by default-real Users.
- Create `src/app/components/admin/AdminFeedbackBanner.tsx`: persistent summary, optional action, dismiss control, and details outside the live region.
- Create `src/app/components/admin/AdminFeedbackBanner.test.tsx`: cover tone semantics, dismissal, and bounded live-region content.

### Reference pages

- Modify `src/app/pages/AdminDashboardPage.tsx`: consume shared panels and feedback without changing data loading or metrics.
- Modify `src/app/pages/AdminDashboardPage.test.tsx`: cover reference layout, retained stale data on refresh error, and empty state.
- Modify `src/app/components/admin/AdminOperationalClassificationBadge.tsx`: render explicit labels for confirmed and default real data.
- Modify `src/app/components/admin/AdminOperationalClassification.test.tsx`: cover confirmed, default, legacy, test, and internal states.
- Modify `src/app/pages/AdminUsersPage.tsx`: consume shared toolbar/data panel, expose a dedicated classification column, and hide inactive bulk controls.
- Modify `src/app/pages/AdminUsersPage.test.tsx`: cover table semantics, accessible filters, topbar/mobile search binding, and conditional bulk controls.
- Create `src/app/components/admin/AdminBulkClassificationFeedback.tsx`: adapt classification results to the shared feedback banner.
- Create `src/app/components/admin/AdminBulkClassificationFeedback.test.tsx`: cover summary, expandable failures, transport failure, and dismissal.

---

### Task 1: Group The Admin Shell And Remove Disabled Search

**Files:**
- Modify: `src/app/components/admin/AdminSidebar.tsx`
- Modify: `src/app/components/admin/AdminSidebar.test.tsx`
- Modify: `src/app/components/admin/AdminTopbar.tsx`
- Create: `src/app/components/admin/AdminTopbar.test.tsx`
- Modify: `src/app/components/admin/AdminSearchContext.tsx`
- Modify: `src/app/components/admin/AdminLayout.tsx`

**Interfaces:**
- Produces `AdminNavGroup` and `getAdminNavGroups(appMode?: AppMode): AdminNavGroup[]`.
- Preserves `getAdminNavItems(appMode?: AppMode): AdminNavItem[]` for current consumers.
- Preserves `AdminTopbar({ onOpenSidebar }: AdminTopbarProps)` and `useAdminSearch(...)` signatures.

- [ ] **Step 1: Write failing grouped-navigation tests**

Replace `AdminSidebar.test.tsx` with coverage that keeps the existing mode assertion and verifies rendered navigation:

```tsx
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AdminSidebar, getAdminNavGroups, getAdminNavItems } from "./AdminSidebar";

describe("AdminSidebar", () => {
  it("groups every real-mode destination in the approved order", () => {
    expect(getAdminNavGroups("real").map((group) => [
      group.label,
      group.items.map((item) => item.label),
    ])).toEqual([
      ["Tổng quan", ["Tổng quan"]],
      ["Khách hàng", ["Người dùng", "Subscription", "Email"]],
      ["Kinh doanh", ["Báo cáo kinh doanh", "Thanh toán", "Hoàn tiền", "Giảm giá"]],
      ["Vận hành", ["Đơn hàng", "Catalog"]],
      ["Hệ thống", ["Cài đặt", "Audit Logs"]],
    ]);

    expect(getAdminNavItems("demo").some((item) => item.to === "/admin/reports/sales")).toBe(false);
  });

  it("marks the current destination and shows pending counts", () => {
    render(
      <MemoryRouter initialEntries={["/admin/payments"]}>
        <AdminSidebar
          email="admin@example.test"
          onLogout={vi.fn()}
          pendingCounts={{ "/admin/payments": 3 }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Kinh doanh" })).toBeInTheDocument();
    const paymentLink = screen.getByRole("link", { name: /Thanh toán/ });
    expect(paymentLink).toHaveAttribute("aria-current", "page");
    expect(within(paymentLink).getByText("3")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the sidebar test and verify RED**

Run:

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminSidebar.test.tsx
```

Expected: FAIL because `getAdminNavGroups` and grouped headings do not exist.

- [ ] **Step 3: Implement grouped navigation**

Add the group type and derive the flat list from it in `AdminSidebar.tsx`:

```tsx
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
          ? [{ to: "/admin/reports/sales", label: "Báo cáo kinh doanh", icon: ChartNoAxesCombined }]
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
```

Replace the single flat navigation loop with labelled groups:

```tsx
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
                        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-app-accent" aria-hidden="true" />
                      ) : null}
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-app-accent" : "text-app-ink-muted")} />
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
```

- [ ] **Step 4: Write failing topbar search tests**

Create `AdminTopbar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AdminSearchProvider, useAdminSearch } from "./AdminSearchContext";
import { AdminTopbar } from "./AdminTopbar";

function RegisteredSearch() {
  const [value, setValue] = useState("");
  useAdminSearch(value, setValue, "Tìm người dùng");
  return <AdminTopbar onOpenSidebar={vi.fn()} />;
}

describe("AdminTopbar", () => {
  it("omits search when the page has no registered handler", () => {
    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <AdminSearchProvider>
          <AdminTopbar onOpenSidebar={vi.fn()} />
        </AdminSearchProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Tổng quan");
  });

  it("binds a registered page search handler", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <AdminSearchProvider>
          <RegisteredSearch />
        </AdminSearchProvider>
      </MemoryRouter>,
    );

    const input = await screen.findByRole("searchbox", { name: "Tìm kiếm trên trang admin" });
    await user.type(input, "an@example.com");
    expect(input).toHaveValue("an@example.com");
  });
});
```

- [ ] **Step 5: Run the topbar test and verify RED**

Run:

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminTopbar.test.tsx
```

Expected: the no-handler test fails because the disabled searchbox is rendered.

- [ ] **Step 6: Omit inactive search and refine the shell frame**

In `AdminTopbar.tsx`, render the search area only for a registered handler:

```tsx
{handler ? (
  <div className="hidden w-full max-w-sm md:block">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
      <Input
        type="search"
        value={handler.value}
        onChange={(event) => handler.onChange(event.target.value)}
        placeholder={handler.placeholder}
        className={cn(adminInput, "h-9 rounded-lg border-app-line/60 bg-app-surface pl-9")}
        aria-label="Tìm kiếm trên trang admin"
      />
    </div>
  </div>
) : null}
```

Remove the now-unused `searchActive` variable from `AdminTopbar.tsx`. Update `AdminSearchContext.tsx` comments so disabled fallback wording is removed. In `AdminLayout.tsx`, replace the `AdminLayoutShell` return value with the complete shell below; this removes the dotted fixed background, changes the desktop rail to `w-64`, keeps the mobile Sheet at `w-72`, and widens main content:

```tsx
<div className="min-h-screen bg-app-bg text-app-ink">
  <div className="flex min-h-screen">
    <div className="hidden w-64 shrink-0 border-r border-app-line lg:block">
      <div className="sticky top-0 h-screen">
        <AdminSidebar email={email} onLogout={onLogout} pendingCounts={pendingCounts} />
      </div>
    </div>

    <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
      <SheetContent side="left" className="w-72 border-r border-app-line bg-app-bg p-0 text-app-ink">
        <AdminSidebar
          email={email}
          onLogout={onLogout}
          onNavigate={() => onMobileOpenChange(false)}
          pendingCounts={pendingCounts}
        />
      </SheetContent>
    </Sheet>

    <div className="flex min-w-0 flex-1 flex-col">
      <AdminTopbar onOpenSidebar={() => onMobileOpenChange(true)} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  </div>
</div>
```

- [ ] **Step 7: Run shell tests and verify GREEN**

Run:

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminSidebar.test.tsx src/app/components/admin/AdminTopbar.test.tsx
```

Expected: both files pass.

- [ ] **Step 8: Commit the shell task**

```powershell
git add -- src/app/components/admin/AdminLayout.tsx src/app/components/admin/AdminSearchContext.tsx src/app/components/admin/AdminSidebar.tsx src/app/components/admin/AdminSidebar.test.tsx src/app/components/admin/AdminTopbar.tsx src/app/components/admin/AdminTopbar.test.tsx
git commit -m "feat(admin): establish grouped editorial shell"
```

### Task 2: Add Editorial Toolbar And Data Panel Primitives

**Files:**
- Create: `src/app/components/admin/AdminToolbar.tsx`
- Create: `src/app/components/admin/AdminDataPanel.tsx`
- Create: `src/app/components/admin/AdminUiPrimitives.test.tsx`
- Modify: `src/app/components/admin/AdminPageHeader.tsx`
- Modify: `src/app/components/admin/AdminEmptyState.tsx`
- Modify: `src/app/components/admin/AdminStatCard.tsx`
- Modify: `src/app/components/admin/tokens.ts`

**Interfaces:**
- Produces `AdminToolbar({ label, children, meta?, actions?, className? })`.
- Produces `AdminDataPanel({ title?, description?, actions?, children, footer?, busy?, className?, contentClassName? })`.
- Extends `AdminPageHeaderProps` with `meta?: ReactNode`.

- [ ] **Step 1: Write failing primitive tests**

Create `AdminUiPrimitives.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminDataPanel } from "./AdminDataPanel";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminToolbar } from "./AdminToolbar";

describe("Admin UI primitives", () => {
  it("exposes page metadata, labelled tools, and a busy data region", () => {
    render(
      <>
        <AdminPageHeader title="Người dùng" description="Quản lý tài khoản" meta="20 kết quả" />
        <AdminToolbar label="Bộ lọc người dùng" meta="Đang xem dữ liệu thật" actions={<button type="button">Xuất CSV</button>}>
          <label>Tìm kiếm <input /></label>
        </AdminToolbar>
        <AdminDataPanel title="Danh sách người dùng" description="Dữ liệu vận hành" busy footer="Trang 1 / 2">
          <p>Nội dung bảng</p>
        </AdminDataPanel>
      </>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Người dùng" })).toBeInTheDocument();
    expect(screen.getByText("20 kết quả")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bộ lọc người dùng" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Danh sách người dùng" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Trang 1 / 2")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the primitive test and verify RED**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminUiPrimitives.test.tsx
```

Expected: FAIL because `AdminToolbar`, `AdminDataPanel`, and `meta` do not exist.

- [ ] **Step 3: Implement `AdminToolbar`**

Create `AdminToolbar.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "../ui/utils";

interface AdminToolbarProps {
  label: string;
  children: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function AdminToolbar({ label, children, meta, actions, className }: AdminToolbarProps) {
  return (
    <section
      aria-label={label}
      className={cn(
        "flex flex-col gap-3 rounded-[var(--r-card)] border border-app-line bg-app-surface p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>
      {meta || actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {meta ? <div className="text-sm text-app-ink-muted">{meta}</div> : null}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Implement `AdminDataPanel`**

Create `AdminDataPanel.tsx`:

```tsx
import { useId, type ReactNode } from "react";

import { cn } from "../ui/utils";
import { adminSurface } from "./tokens";

interface AdminDataPanelProps {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  className?: string;
  contentClassName?: string;
}

export function AdminDataPanel({
  title,
  description,
  actions,
  children,
  footer,
  busy = false,
  className,
  contentClassName,
}: AdminDataPanelProps) {
  const headingId = useId();
  const labelled = Boolean(title);

  return (
    <section
      aria-labelledby={labelled ? headingId : undefined}
      aria-busy={busy || undefined}
      className={cn(adminSurface.card, "overflow-hidden", className)}
    >
      {title || description || actions ? (
        <header className="flex flex-col gap-3 border-b border-app-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            {title ? <h2 id={headingId} className="text-sm font-semibold text-app-ink">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs leading-5 text-app-ink-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
      {footer ? <footer className="border-t border-app-line px-4 py-3 sm:px-5">{footer}</footer> : null}
    </section>
  );
}
```

- [ ] **Step 5: Refine shared Editorial Operations styling**

Extend `AdminPageHeaderProps` with `meta?: ReactNode`, render it below the description, and remove the decorative gradient line:

```tsx
<header className={cn("border-b border-app-line pb-5", className)}>
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0 space-y-1">
      <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-app-ink">{title}</h1>
      {description ? <p className="max-w-2xl text-sm leading-6 text-app-ink-muted">{description}</p> : null}
      {meta ? <div className="pt-1 text-xs font-medium text-app-ink-soft">{meta}</div> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
</header>
```

Update `tokens.ts` to remove hover lift and gradient accent bars:

```ts
export const adminSurface = {
  card: "rounded-[var(--r-card)] border border-app-line bg-app-surface shadow-sm",
  cardHover: "transition-colors duration-150 motion-reduce:transition-none hover:border-app-line-strong hover:bg-app-bg-subtle/30",
  cardAccent: "relative overflow-hidden rounded-[var(--r-card)] border border-app-line bg-app-surface shadow-sm",
  muted: "rounded-[var(--r-control)] border border-app-line bg-app-bg-subtle",
  divider: "border-app-line",
  glass: "rounded-[var(--r-card)] border border-app-line bg-app-surface/90 shadow-sm backdrop-blur-sm",
} as const;

export const statAccentBars = {
  users: "bg-emerald-500/70",
  plus: "bg-sky-500/70",
  revenue: "bg-amber-500/70",
  orders: "bg-app-accent/70",
} as const;

export const statIconBg = {
  users: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  plus: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  revenue: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  orders: "bg-app-accent-soft text-app-accent",
} as const;
```

In `AdminStatCard.tsx`, replace the top bar with a restrained left indicator:

```tsx
{accent ? (
  <span className={cn("absolute inset-y-5 left-0 w-0.5 rounded-r-full", statAccentBars[accent])} aria-hidden="true" />
) : null}
```

In `AdminEmptyState.tsx`, replace the gradient icon wrapper with:

```tsx
<span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] border border-app-line bg-app-surface text-app-accent">
  <Icon className="h-6 w-6" />
</span>
```

- [ ] **Step 6: Run primitive tests and verify GREEN**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminUiPrimitives.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the shared primitive task**

```powershell
git add -- src/app/components/admin/AdminToolbar.tsx src/app/components/admin/AdminDataPanel.tsx src/app/components/admin/AdminUiPrimitives.test.tsx src/app/components/admin/AdminPageHeader.tsx src/app/components/admin/AdminEmptyState.tsx src/app/components/admin/AdminStatCard.tsx src/app/components/admin/tokens.ts
git commit -m "feat(admin): add editorial data primitives"
```

### Task 3: Add Bounded Persistent Feedback And Neutral Status

**Files:**
- Modify: `src/app/components/admin/AdminStatusBadge.tsx`
- Create: `src/app/components/admin/AdminFeedbackBanner.tsx`
- Create: `src/app/components/admin/AdminFeedbackBanner.test.tsx`

**Interfaces:**
- Extends `AdminBadgeTone` with `neutral`.
- Produces `AdminFeedbackBanner({ tone, summary, action?, detailsLabel?, details?, onDismiss?, dismissLabel?, className? })`.

- [ ] **Step 1: Write failing feedback tests**

Create `AdminFeedbackBanner.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminFeedbackBanner } from "./AdminFeedbackBanner";

describe("AdminFeedbackBanner", () => {
  it("keeps verbose details outside the live summary", () => {
    render(
      <AdminFeedbackBanner
        tone="warning"
        summary="1 đã cập nhật, 1 thất bại."
        detailsLabel="1 mục thất bại"
        details={<p>missing-user · user_not_found</p>}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1 đã cập nhật, 1 thất bại");
    expect(screen.getByRole("status")).not.toHaveTextContent("missing-user");
    expect(screen.getByText("missing-user · user_not_found")).toBeInTheDocument();
  });

  it("supports a labelled dismiss action", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <AdminFeedbackBanner
        tone="success"
        summary="Đã cập nhật."
        onDismiss={onDismiss}
        dismissLabel="Đóng thông báo cập nhật"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Đóng thông báo cập nhật" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the feedback test and verify RED**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminFeedbackBanner.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Add the neutral badge tone**

Add `neutral` to `AdminBadgeTone`, `DOT_CLASS`, and `TONE_CLASS`:

```tsx
neutral: "bg-slate-400",
```

```tsx
neutral: "border-app-line bg-app-bg-subtle text-app-ink-soft",
```

Keep every existing tone and mapping unchanged.

- [ ] **Step 4: Implement `AdminFeedbackBanner`**

Create `AdminFeedbackBanner.tsx`:

```tsx
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { InlineStatusMessage, type InlineStatusTone } from "../states";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface AdminFeedbackBannerProps {
  tone: InlineStatusTone;
  summary: ReactNode;
  action?: ReactNode;
  detailsLabel?: ReactNode;
  details?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

export function AdminFeedbackBanner({
  tone,
  summary,
  action,
  detailsLabel,
  details,
  onDismiss,
  dismissLabel = "Đóng thông báo",
  className,
}: AdminFeedbackBannerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <InlineStatusMessage tone={tone}>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">{summary}</div>
          {action || onDismiss ? (
            <div className="flex shrink-0 items-center gap-2">
              {action}
              {onDismiss ? (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={dismissLabel} onClick={onDismiss}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </InlineStatusMessage>
      {details ? (
        <details className="rounded-[var(--r-control)] border border-app-line bg-app-surface px-3.5 py-2.5 text-sm text-app-ink-soft">
          <summary className="cursor-pointer font-medium text-app-ink">{detailsLabel ?? "Xem chi tiết"}</summary>
          <div className="mt-2">{details}</div>
        </details>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Run the feedback test and verify GREEN**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminFeedbackBanner.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the feedback task**

```powershell
git add -- src/app/components/admin/AdminStatusBadge.tsx src/app/components/admin/AdminFeedbackBanner.tsx src/app/components/admin/AdminFeedbackBanner.test.tsx
git commit -m "feat(admin): add persistent feedback pattern"
```

### Task 4: Migrate Dashboard To The Reference Layout

**Files:**
- Modify: `src/app/pages/AdminDashboardPage.tsx`
- Modify: `src/app/pages/AdminDashboardPage.test.tsx`

**Interfaces:**
- Consumes `AdminDataPanel`, `AdminFeedbackBanner`, and the updated shared tokens.
- Preserves `adminGetOverview()`, `adminGetOrders({ operationalScope: "real", page: 1, limit: 12 })`, and `adminSendExpiringBillingReminders({ daysAhead: 7 })` behavior.

- [ ] **Step 1: Write failing Dashboard reference-layout tests**

Extend `AdminDashboardPage.test.tsx` imports with `userEvent` and add:

```tsx
it("uses labelled operational panels without adding unsupported active-user claims", async () => {
  render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

  expect(await screen.findByRole("region", { name: "Thanh toán gần đây" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Người dùng mới" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Đơn in mới nhất" })).toBeInTheDocument();
  expect(screen.queryByText(/active user|DAU/i)).not.toBeInTheDocument();
});

it("keeps rendered KPIs visible when a refresh fails", async () => {
  const user = userEvent.setup();
  adminServiceMock.adminGetOverview
    .mockResolvedValueOnce(overview)
    .mockRejectedValueOnce(new Error("network unavailable"));

  render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
  expect(await screen.findByText("20")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Tải lại" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("network unavailable");
  expect(screen.getByText("20")).toBeInTheDocument();
});

it("shows the shared empty state when no overview is returned", async () => {
  adminServiceMock.adminGetOverview.mockResolvedValueOnce(null);
  render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);

  expect(await screen.findByText("Chưa có dữ liệu")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run Dashboard tests and verify RED**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminDashboardPage.test.tsx
```

Expected: labelled region assertions fail because current cards are unlabeled `div` elements.

- [ ] **Step 3: Use shared retryable feedback**

Replace the custom error box with:

```tsx
{error ? (
  <AdminFeedbackBanner
    tone="error"
    summary={
      <div>
        <p className="font-semibold">Không tải được dữ liệu</p>
        <p className="mt-1 font-normal">{error}</p>
      </div>
    }
    action={
      <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}>
        Thử lại
      </Button>
    }
  />
) : null}
```

Do not clear `overview` or `orders` at the start of `loadData`; existing rendered data must remain visible while refresh is in flight or fails.

- [ ] **Step 4: Convert Dashboard sections to data panels**

Import `AdminDataPanel` and wrap the three operational previews:

```tsx
<section className="grid gap-4 lg:grid-cols-2">
  <AdminDataPanel
    title="Thanh toán gần đây"
    description="Các đơn thanh toán tự động mới nhất."
    contentClassName="px-5 py-1"
  >
    <RecentPaymentList payments={overview?.recentPayments ?? []} />
  </AdminDataPanel>

  <AdminDataPanel
    title="Người dùng mới"
    description={`Email: ${overview?.email.configured ? "đã cấu hình" : "chưa cấu hình"}`}
    contentClassName="px-5 py-1"
  >
    <RecentUserList users={overview?.recentUsers ?? []} />
  </AdminDataPanel>
</section>
```

Refactor `RecentOrdersPreview` to return:

```tsx
return (
  <AdminDataPanel
    title="Đơn in mới nhất"
    description="5 đơn gần đây nhất."
    actions={
      <Button type="button" variant="ghost" size="sm" className="gap-1 text-app-accent" onClick={onSeeAll}>
        Xem tất cả <span aria-hidden="true">→</span>
      </Button>
    }
    contentClassName="px-5 py-1"
  >
    {orders.length === 0 ? (
      <p className="py-4 text-center text-sm text-app-ink-muted">Chưa có đơn in nào.</p>
    ) : (
      <ul className="divide-y divide-app-line/60">
        {orders.slice(0, 5).map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-ink">{order.fullName}</p>
              <p className="mt-1 truncate text-xs text-app-ink-muted">{order.email} · {formatDate(order.createdAt)}</p>
            </div>
            <AdminStatusBadge tone={ORDER_STATUS_TONES[order.status]}>{ORDER_STATUS_LABELS[order.status]}</AdminStatusBadge>
          </li>
        ))}
      </ul>
    )}
  </AdminDataPanel>
);
```

Replace the revenue card with the complete panel below, preserving the exact metric values and percentage calculation:

```tsx
{summary ? (
  <AdminDataPanel
    title="Doanh thu"
    description="Tổng và 30 ngày gần nhất."
    contentClassName="space-y-4 p-5"
  >
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-app-ink-soft">Tổng doanh thu</span>
        <span className="font-semibold text-app-ink">{formatVnd(summary.revenueTotalVnd)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-app-bg-subtle">
        <div className="h-full w-full rounded-full bg-app-accent" />
      </div>
    </div>
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-app-ink-soft">30 ngày qua</span>
        <span className="font-semibold text-app-ink">{formatVnd(summary.revenueLast30DaysVnd)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-app-bg-subtle">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{
            width: `${summary.revenueTotalVnd > 0
              ? Math.min(100, Math.round((summary.revenueLast30DaysVnd / summary.revenueTotalVnd) * 100))
              : 0}%`,
          }}
        />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 pt-2">
      <div className="rounded-[var(--r-control)] bg-app-bg-subtle p-3 text-center">
        <p className="text-xs text-app-ink-muted">Plus đang dùng</p>
        <p className="text-lg font-bold text-app-ink">{summary.activePlusSubscriptions}</p>
      </div>
      <div className="rounded-[var(--r-control)] bg-app-bg-subtle p-3 text-center">
        <p className="text-xs text-app-ink-muted">Đơn in</p>
        <p className="text-lg font-bold text-app-ink">{summary.physicalOrders}</p>
      </div>
    </div>
  </AdminDataPanel>
) : null}
```

In `ReminderBanner`, replace the outer wrapper, decorative icon, and button classes with the restrained semantic treatment:

```tsx
<div className={`${adminSurface.card} border-app-accent/25 p-5`}>
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent">
        <Bell className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-base font-semibold text-app-ink">Nhắc gia hạn Plus</p>
        <p className="mt-1 text-sm leading-6 text-app-ink-soft">
          {expiringCount > 0
            ? `${expiringCount.toLocaleString("vi-VN")} gói Plus sẽ hết hạn trong 7 ngày.`
            : "Không có gói Plus nào sắp hết hạn trong 7 ngày."}{" "}
          Email: <span>{emailConfigured ? "đã cấu hình" : (overview?.email.reason ?? "chưa cấu hình")}</span>.
        </p>
        {result ? (
          <p className="mt-2 text-xs leading-5 text-app-ink-muted">
            Lần chạy gần nhất: quét {result.scanned}, gửi {result.sent}, trùng {result.duplicate}, bỏ qua {result.skipped}, lỗi {result.failed}.
          </p>
        ) : null}
      </div>
    </div>
    <Button
      type="button"
      className="gap-2"
      disabled={loading || !emailConfigured || expiringCount === 0}
      onClick={onRun}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
      Gửi email nhắc hạn
    </Button>
  </div>
</div>
```

- [ ] **Step 5: Add a semantic loading marker**

Wrap the initial stat skeleton grid:

```tsx
<div role="status" aria-label="Đang tải tổng quan quản trị" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <span className="sr-only">Đang tải tổng quan quản trị</span>
  <StatSkeleton />
  <StatSkeleton />
  <StatSkeleton />
  <StatSkeleton />
</div>
```

- [ ] **Step 6: Run Dashboard tests and verify GREEN**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminDashboardPage.test.tsx
```

Expected: all Dashboard tests pass and existing KPI/filter behavior remains covered.

- [ ] **Step 7: Commit the Dashboard task**

```powershell
git add -- src/app/pages/AdminDashboardPage.tsx src/app/pages/AdminDashboardPage.test.tsx
git commit -m "feat(admin): align dashboard reference layout"
```

### Task 5: Make Users Search, Filters, Table, And Selection Explicit

**Files:**
- Modify: `src/app/components/admin/AdminOperationalClassificationBadge.tsx`
- Modify: `src/app/components/admin/AdminOperationalClassification.test.tsx`
- Modify: `src/app/pages/AdminUsersPage.tsx`
- Modify: `src/app/pages/AdminUsersPage.test.tsx`

**Interfaces:**
- Consumes `AdminToolbar`, `AdminDataPanel`, `AdminStatusBadge` neutral tone, and `useAdminSearch`.
- Preserves all current `AdminUserListParams`, `PendingBulkClassification`, URL-category, pagination, request-generation, and retry behavior.

- [ ] **Step 1: Write failing classification-state tests**

Replace the first two badge tests in `AdminOperationalClassification.test.tsx` with:

```tsx
it("distinguishes confirmed and default real classifications", () => {
  const { rerender } = render(
    <AdminOperationalClassificationBadge classification={{ effectiveCategory: "real", source: "user" }} />,
  );
  expect(screen.getByText("Dữ liệu thật · Đã xác nhận")).toBeInTheDocument();

  rerender(
    <AdminOperationalClassificationBadge classification={{ effectiveCategory: "real", source: "default" }} />,
  );
  expect(screen.getByText("Dữ liệu thật · Mặc định")).toBeInTheDocument();
  expect(screen.queryByText("Dữ liệu thật · Đã xác nhận")).not.toBeInTheDocument();
});

it("renders default real for legacy data and explicit excluded states", () => {
  const { rerender } = render(<AdminOperationalClassificationBadge classification={undefined} />);
  expect(screen.getByText("Dữ liệu thật · Mặc định")).toBeInTheDocument();

  rerender(
    <AdminOperationalClassificationBadge classification={{ effectiveCategory: "test", source: "user", reason: "test_account" }} />,
  );
  expect(screen.getByText("Test")).toBeInTheDocument();

  rerender(
    <AdminOperationalClassificationBadge classification={{ effectiveCategory: "internal", source: "user", reason: "internal_team" }} />,
  );
  expect(screen.getByText("Nội bộ")).toBeInTheDocument();
  expect(getAdminOperationalClassificationSourceLabel("record")).toBe("Đánh dấu trực tiếp");
});
```

- [ ] **Step 2: Write failing Users structure tests**

Add to `AdminUsersPage.test.tsx`:

```tsx
it("shows classification as a dedicated accessible table column", async () => {
  await renderPage();

  expect(await screen.findByRole("table", { name: "Danh sách người dùng" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Trạng thái dữ liệu" })).toHaveAttribute("scope", "col");
  expect(screen.getAllByText("Dữ liệu thật · Mặc định")).toHaveLength(2);
});

it("exposes accessible search and filters while hiding inactive bulk controls", async () => {
  const user = userEvent.setup();
  await renderPage();

  expect(await screen.findByRole("searchbox", { name: "Tìm kiếm người dùng" })).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Lọc theo vai trò" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tất cả" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByText(/Đã chọn 0\/100 người dùng/)).not.toBeInTheDocument();

  await user.click(screen.getByRole("checkbox", { name: /u1@example\.test/ }));
  expect(screen.getByText("Đã chọn 1/100 người dùng.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Phân loại 1 người dùng" })).toBeEnabled();
});
```

Update the two navigation-state tests to assert:

```tsx
expect(screen.queryByText("Đã chọn 0/100 người dùng.")).not.toBeInTheDocument();
```

- [ ] **Step 3: Run focused Users tests and verify RED**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: failures for missing default-real badge, dedicated column, table caption, search semantics, pressed state, and hidden zero-selection panel.

- [ ] **Step 4: Render every classification state**

Change the real branch in `AdminOperationalClassificationBadge.tsx`:

```tsx
if (effectiveCategory === "real") {
  return classification?.source === "user" ? (
    <AdminStatusBadge tone="confirmed">Dữ liệu thật · Đã xác nhận</AdminStatusBadge>
  ) : (
    <AdminStatusBadge tone="neutral">Dữ liệu thật · Mặc định</AdminStatusBadge>
  );
}
```

Keep the existing Test and Nội bộ mappings.

- [ ] **Step 5: Bind desktop topbar search and mobile toolbar search**

Import `useAdminSearch`, `AdminToolbar`, and `AdminDataPanel`. Convert `handleSearch` to a stable callback:

```tsx
const handleSearch = useCallback((value: string) => {
  setSearch(value);
  setPage(1);
  clearClassificationState();
}, [clearClassificationState]);

useAdminSearch(search, handleSearch, "Tìm theo email, tên hoặc UID…");
```

Replace the current filter row with:

```tsx
<AdminToolbar
  label="Bộ lọc người dùng"
  meta={`${total.toLocaleString("vi-VN")} kết quả`}
>
  <div className="relative w-full sm:max-w-md md:hidden">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
    <Input
      type="search"
      name="admin-user-search"
      aria-label="Tìm kiếm người dùng"
      autoComplete="off"
      placeholder="Tìm theo email, tên hoặc UID…"
      value={search}
      onChange={(event) => handleSearch(event.target.value)}
      className="pl-9"
    />
  </div>
  <label className="flex items-center gap-2 text-sm text-app-ink-soft">
    Phân loại vận hành
    <select
      aria-label="Phân loại vận hành"
      value={operationalCategory}
      onChange={(event) => handleCategoryChange(event.target.value)}
      className="rounded-lg border border-app-line bg-app-surface px-2 py-1.5 text-sm text-app-ink"
    >
      <option value="real">Dữ liệu thật</option>
      <option value="test">Test</option>
      <option value="internal">Nội bộ</option>
      <option value="all">Tất cả</option>
    </select>
  </label>
  <div className="flex gap-2" role="group" aria-label="Lọc theo vai trò">
    {(["all", "user", "admin"] as const).map((role) => (
      <Button
        key={role}
        type="button"
        aria-pressed={roleFilter === role}
        variant={roleFilter === role ? "default" : "outline"}
        size="sm"
        onClick={() => handleRoleFilter(role)}
      >
        {role === "all" ? "Tất cả" : role === "admin" ? "Admin" : "User"}
      </Button>
    ))}
  </div>
</AdminToolbar>
```

Change the export action text to `Xuất CSV`.

- [ ] **Step 6: Hide inactive bulk actions**

Derive:

```tsx
const showBulkActions = selectedUids.size > 0 || pendingBulk?.viewKey === activeViewKey;
```

Replace the always-visible bulk block with:

```tsx
{showBulkActions ? (
  <div className="flex flex-wrap items-center gap-3 rounded-[var(--r-card)] border border-app-line bg-app-bg-subtle/40 p-3">
    <p className="text-sm text-app-ink-soft">
      Đã chọn {selectedUids.size}/{MAX_BULK_SELECTION} người dùng.
    </p>
    <Button
      type="button"
      size="sm"
      disabled={selectedUids.size === 0 || classificationBusy}
      onClick={() => {
        setClassificationError(undefined);
        setClassificationOpen(true);
      }}
    >
      Phân loại {selectedUids.size} người dùng
    </Button>
    {pendingBulk?.viewKey === activeViewKey ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={classificationBusy}
        onClick={retryPendingClassification}
      >
        {retryUnknownCommit ? "Thử lại mục chưa rõ kết quả" : "Thử lại phân loại"}
      </Button>
    ) : null}
    {selectionMessage ? (
      <p role="status" aria-live="polite" className="text-sm text-amber-700">
        {selectionMessage}
      </p>
    ) : null}
  </div>
) : null}
```

- [ ] **Step 7: Move classification into a dedicated data-panel table column**

Replace the current outer card and `overflow-x-auto` wrappers with this opening structure:

```tsx
<AdminDataPanel busy={loading} contentClassName="overflow-x-auto">
  <table className="w-full text-left text-sm">
    <caption className="sr-only">Danh sách người dùng</caption>
```

After the existing `</tbody>`, replace the current wrapper closing tags with:

```tsx
  </table>
</AdminDataPanel>
```

Use six scoped headers:

```tsx
<th scope="col" className="px-4 py-3">
  <label className="inline-flex min-h-6 min-w-6 items-center justify-center">
    <input
      type="checkbox"
      aria-label="Chọn tất cả người dùng trên trang"
      checked={allVisibleSelected}
      disabled={loading || items.length === 0}
      onChange={toggleVisibleUsers}
    />
  </label>
</th>
<th scope="col" className="px-4 py-3">Người dùng</th>
<th scope="col" className="px-4 py-3">Trạng thái dữ liệu</th>
<th scope="col" className="px-4 py-3">Vai trò</th>
<th scope="col" className="px-4 py-3">Gói</th>
<th scope="col" className="px-4 py-3">Ngày tạo</th>
```

Remove the classification badge from the identity cell and add:

```tsx
<td className="px-4 py-3.5">
  <AdminOperationalClassificationBadge classification={user.operationalClassification} />
</td>
```

Wrap every row checkbox in the same 24px target:

```tsx
<label className="inline-flex min-h-6 min-w-6 items-center justify-center">
  <input
    type="checkbox"
    aria-label={`Chọn ${user.email || user.firebaseUid}`}
    checked={selectedUids.has(user.firebaseUid)}
    onChange={() => toggleUser(user.firebaseUid)}
  />
</label>
```

Add this classification skeleton cell between the identity and role skeleton cells:

```tsx
<td className="px-4 py-3.5">
  <div className="h-5 w-32 animate-pulse rounded-full bg-app-accent-soft" />
</td>
```

Change the empty-state `colSpan` from `5` to `6`. Remove the avatar `group-hover:scale-105` transform, and add `motion-reduce:transition-none` to modified row/link transition classes.

- [ ] **Step 8: Run focused Users tests and verify GREEN**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: both files pass, including all existing navigation, request-ID, and retry tests.

- [ ] **Step 9: Commit the Users structure task**

```powershell
git add -- src/app/components/admin/AdminOperationalClassificationBadge.tsx src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminUsersPage.tsx src/app/pages/AdminUsersPage.test.tsx
git commit -m "feat(admin): clarify users data workspace"
```

### Task 6: Integrate Clear Bulk Classification Feedback

**Files:**
- Create: `src/app/components/admin/AdminBulkClassificationFeedback.tsx`
- Create: `src/app/components/admin/AdminBulkClassificationFeedback.test.tsx`
- Modify: `src/app/pages/AdminUsersPage.tsx`
- Modify: `src/app/pages/AdminUsersPage.test.tsx`

**Interfaces:**
- Produces `AdminBulkClassificationResult` and `AdminBulkClassificationFeedback({ result, onDismiss })`.
- Consumes `AdminFeedbackBanner` from Task 3.

- [ ] **Step 1: Write failing component tests**

Create `AdminBulkClassificationFeedback.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminBulkClassificationFeedback } from "./AdminBulkClassificationFeedback";

describe("AdminBulkClassificationFeedback", () => {
  it("summarizes counts and keeps failed UIDs in expandable details", () => {
    render(
      <AdminBulkClassificationFeedback
        result={{
          updated: 1,
          unchanged: 1,
          failed: [{ userUid: "missing-user", errorCode: "user_not_found" }],
        }}
        onDismiss={() => undefined}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1 đã cập nhật, 1 không thay đổi, 1 thất bại");
    expect(screen.getByRole("status")).not.toHaveTextContent("missing-user");
    expect(screen.getByText("1 mục thất bại")).toBeInTheDocument();
    expect(screen.getByText("missing-user · user_not_found")).toBeInTheDocument();
  });

  it("renders transport failure and supports dismissal", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <AdminBulkClassificationFeedback
        result={{ updated: 0, unchanged: 0, failed: [], transportFailed: true }}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Không thể gửi yêu cầu phân loại");
    await user.click(screen.getByRole("button", { name: "Đóng thông báo kết quả phân loại" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Update the mixed-result page test for bounded feedback**

Change the current mixed-result assertions in `AdminUsersPage.test.tsx` to:

```tsx
expect(screen.getByRole("status")).toHaveTextContent("1 đã cập nhật, 1 không thay đổi, 1 thất bại");
expect(screen.getByRole("status")).not.toHaveTextContent("missing-user");
expect(screen.getByText("missing-user · user_not_found")).toBeInTheDocument();
expect(screen.queryByText(/Đã chọn 0\/100 người dùng/)).not.toBeInTheDocument();
```

- [ ] **Step 3: Run feedback tests and verify RED**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminBulkClassificationFeedback.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: the new component is missing and the existing live summary still contains raw UIDs.

- [ ] **Step 4: Implement the classification feedback adapter**

Create `AdminBulkClassificationFeedback.tsx`:

```tsx
import { AdminFeedbackBanner } from "./AdminFeedbackBanner";

export interface AdminBulkClassificationResult {
  updated: number;
  unchanged: number;
  failed: Array<{ userUid: string; errorCode: string }>;
  transportFailed?: boolean;
}

interface AdminBulkClassificationFeedbackProps {
  result: AdminBulkClassificationResult;
  onDismiss: () => void;
}

export function AdminBulkClassificationFeedback({ result, onDismiss }: AdminBulkClassificationFeedbackProps) {
  const hasFailures = result.failed.length > 0;
  const summary = result.transportFailed
    ? "Không thể gửi yêu cầu phân loại. Bạn có thể thử lại."
    : `${result.updated} đã cập nhật, ${result.unchanged} không thay đổi, ${result.failed.length} thất bại.`;

  return (
    <AdminFeedbackBanner
      tone={result.transportFailed ? "error" : hasFailures ? "warning" : "success"}
      summary={summary}
      onDismiss={onDismiss}
      dismissLabel="Đóng thông báo kết quả phân loại"
      detailsLabel={hasFailures ? `${result.failed.length} mục thất bại` : undefined}
      details={
        hasFailures ? (
          <ul className="space-y-1 break-all">
            {result.failed.map((item) => (
              <li key={`${item.userUid}:${item.errorCode}`}>{item.userUid} · {item.errorCode}</li>
            ))}
          </ul>
        ) : undefined
      }
    />
  );
}
```

- [ ] **Step 5: Integrate the adapter into Users**

Import the component and type. Remove the page-local `BulkResult` interface and type state as `AdminBulkClassificationResult | null`.

Replace the inline result paragraph with:

```tsx
{bulkResult ? (
  <AdminBulkClassificationFeedback result={bulkResult} onDismiss={() => setBulkResult(null)} />
) : null}
```

In the transport catch, keep the pending command and selected UIDs for retry, set the transport result, close the dialog, and avoid a duplicate page-level error:

```tsx
if (submissionViewKey === currentViewRef.current.key) {
  setBulkResult({ updated: 0, unchanged: 0, failed: [], transportFailed: true });
  setClassificationError(undefined);
  setClassificationOpen(false);
}
```

- [ ] **Step 6: Run all focused Users feedback tests and verify GREEN**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminFeedbackBanner.test.tsx src/app/components/admin/AdminBulkClassificationFeedback.test.tsx src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: all files pass, including retry with original request IDs and navigation race coverage.

- [ ] **Step 7: Commit the feedback integration**

```powershell
git add -- src/app/components/admin/AdminBulkClassificationFeedback.tsx src/app/components/admin/AdminBulkClassificationFeedback.test.tsx src/app/pages/AdminUsersPage.tsx src/app/pages/AdminUsersPage.test.tsx
git commit -m "feat(admin): present bulk results clearly"
```

### Task 7: Verify Phase 1 Across The Shared Admin Surface

**Files:**
- Verify the Phase 1 implementation; do not expand production scope.

**Interfaces:**
- Consumes all completed Phase 1 tasks.
- Produces verification evidence required before Phase 2 begins.

- [ ] **Step 1: Run the complete focused Admin UI set**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminSidebar.test.tsx src/app/components/admin/AdminTopbar.test.tsx src/app/components/admin/AdminUiPrimitives.test.tsx src/app/components/admin/AdminFeedbackBanner.test.tsx src/app/components/admin/AdminBulkClassificationFeedback.test.tsx src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminDashboardPage.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: zero failures.

- [ ] **Step 2: Run the frontend typecheck**

```powershell
npm.cmd run typecheck
```

Expected: exit code `0`.

- [ ] **Step 3: Run Biome lint without fixes**

```powershell
npm.cmd run lint
```

Expected: exit code `0`; do not run autofix or formatting commands.

- [ ] **Step 4: Run the broad frontend regression suite**

```powershell
npm.cmd run test:run
```

Expected: exit code `0`. If a failure is unrelated and already present on `origin/main`, record exact evidence before deciding whether it blocks Phase 1.

- [ ] **Step 5: Run the production build**

```powershell
npm.cmd run build
```

Expected: exit code `0`; chunk-size warnings are acceptable only if no new build error is introduced.

- [ ] **Step 6: Run route and manual shell checks**

Run the focused route test:

```powershell
npm.cmd run test:ui -- src/app/routes.test.tsx
```

Then verify Dashboard and Users at approximately 1440px, 1024px, and 390px in both light and dark themes. Check:

- grouped sidebar order and active state;
- mobile Sheet navigation and important actions;
- topbar with no search on Dashboard and real search on Users;
- keyboard focus order and visible focus indicators;
- Dashboard loading, populated, empty, refresh-error, and retry states;
- Users search, filters, default/confirmed/test/internal badges, selection, partial failure, retry, and dismissal;
- shell rendering on every other Admin destination without horizontal page overflow caused by the shell.

If authenticated local manual QA is unavailable, record the missing Firebase/admin credential blocker and rely only on component/route evidence for the affected checks; do not claim visual QA passed.

- [ ] **Step 7: Review final scope and commit any verification-only documentation**

```powershell
git -c core.pager=cat diff --check origin/main...HEAD
git -c core.pager=cat status --short
git -c core.pager=cat log --oneline origin/main..HEAD
```

Expected: no whitespace errors, no backend or dependency changes, and only approved Phase 1 Admin files plus design/plan documentation differ from `origin/main`.

If verification required a documentation note, commit only that note:

```powershell
git add -- docs/superpowers/plans/2026-07-14-admin-ui-system-phase-1.md
git commit -m "docs(admin): record phase 1 verification"
```

Do not create an empty commit when no verification documentation changed.
