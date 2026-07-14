# Admin Sidebar Section Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Admin navigation group headings easier to scan with a restrained tinted marker while preserving every navigation behavior.

**Architecture:** Keep the current `AdminSidebar` data and semantic structure. Change only the group-heading presentation and protect it with one focused rendering test.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Frontend Shell change only.
- No route, mode boundary, badge, active-state, auth, API, or data changes.
- Use existing `app-*` tokens and add no dependency.
- Work only in the isolated Admin worktree.

### Task 1: Add The Editorial Group Marker

**Files:**
- Modify: `src/app/components/admin/AdminSidebar.test.tsx`
- Modify: `src/app/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Write the failing presentation test**

Render the sidebar and assert every level-two group heading has the neutral marker classes and a decorative accent child:

```tsx
it("renders each group title as a distinct editorial marker", () => {
  render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <AdminSidebar email="admin@example.com" onLogout={vi.fn()} />
    </MemoryRouter>,
  );

  for (const name of ["Tổng quan", "Khách hàng", "Kinh doanh", "Vận hành", "Hệ thống"]) {
    const heading = screen.getByRole("heading", { level: 2, name });
    expect(heading).toHaveClass("border-app-line/60", "bg-app-bg-subtle/70", "text-app-ink-soft");
    expect(heading.querySelector("span[aria-hidden='true']")).toHaveClass("bg-app-accent");
  }
});
```

- [ ] **Step 2: Run RED**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminSidebar.test.tsx
```

Expected: the new test fails because headings are plain text and have no accent child.

- [ ] **Step 3: Implement the minimal marker**

Replace the current group heading with:

```tsx
<h2
  id={headingId}
  className="mb-2 flex items-center gap-2 rounded-[var(--r-control)] border border-app-line/60 bg-app-bg-subtle/70 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-app-ink-soft"
>
  <span className="h-3 w-0.5 rounded-full bg-app-accent" aria-hidden="true" />
  {group.label}
</h2>
```

- [ ] **Step 4: Run GREEN and static gates**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminSidebar.test.tsx
npm.cmd run typecheck
.\node_modules\.bin\biome.cmd lint src/app/components/admin/AdminSidebar.tsx src/app/components/admin/AdminSidebar.test.tsx
```

- [ ] **Step 5: Commit**

```powershell
git add -- src/app/components/admin/AdminSidebar.tsx src/app/components/admin/AdminSidebar.test.tsx
git commit -m "style(admin): strengthen sidebar section hierarchy"
```

### Task 2: Verify Scope

- [ ] Run `git diff --check` and confirm only the approved sidebar files plus design/plan docs changed.
- [ ] Record the manual visual-QA blocker if no authenticated Admin session exists.
