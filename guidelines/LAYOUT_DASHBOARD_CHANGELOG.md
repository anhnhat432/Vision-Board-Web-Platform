# Dashboard Layout Changelog

Date: 2026-05-06  
Engineer: Senior UX/UI Frontend Engineer  
Plugin: `frontend-design@claude-plugins-official` (evaluated — not used for audit)

---

## Plugin Review Summary

**Plugin**: `frontend-design@claude-plugins-official`  
**Capability**: Creation tool for distinctive interfaces — **cannot audit existing layouts**  
**Verdict**: Plugin not suitable for Dashboard review. It lacks audit/analyze commands. Its "bold/unforgettable" design philosophy conflicts with our "calm/predictable" productivity app tone.

**Method**: Manual code review following LAYOUT_SYSTEM_GUIDE.md principles.

---

## Dashboard Before (Current State)

### Layout Structure

```
Dashboard.tsx (1742 lines)
├── Hero section (conditional)
│   ├── PublicVisitorHero (signed-out)
│   └── QuickActionCards (3-4 cards) + OverviewStats (4 cards) (signed-in)
├── Attention panels (2 cards)
│   ├── "Dữ liệu demo" notice (if demo mode)
│   └── Setup prompt / EmptyState (if no active plan)
├── Performance section (if active plan)
│   ├── GoalProgressCard
│   ├── ExecutionScoreCard
│   ├── StreakCard
│   └── MetricsSummary + WeeklyProgressChart (lazy)
├── Sidebar (sticky on desktop)
│   └── Plan card (current plan info)
└── PublicVisitorAccountCard (bottom)
```

### Issues Identified

| Issue | Impact | Evidence |
|-------|--------|----------|
| **8-12 cards competing** | Critical | Hero + 3 quick actions + 4 stats + 2 attention + 3 performance + plan card |
| **Primary CTA not prominent** | High | "Mở trung tâm 12 tuần" is one of 3-4 quick action cards |
| **Stats cards always visible** | Medium | 4 stats cards take 25% of above-fold space on mobile |
| **Attention panels compete** | Medium | Demo notice and setup prompt are full cards |
| **Mobile scroll fatigue** | High | 6-8 viewport heights to reach performance section |
| **Login/Signup not secondary** | Low | Public visitor auth cards compete with "start" CTA |

### Card Count Above Fold

| User State | Cards Above Fold |
|------------|------------------|
| Signed-out (demo) | Hero (1) + Stats (4) + Account card (1) = 6 |
| Signed-in, no plan | Quick actions (3) + Stats (4) + EmptyState (1) = 8 |
| Signed-in, active plan | Quick actions (3) + Stats (4) + Plan card (1) = 8 |

---

## Dashboard After (Proposed Redesign)

### Layout Principles Applied

1. **One primary action per screen** — Hero card only
2. **Primary content before secondary** — Hero → Stats (collapsible) → Performance → Tools
3. **Card hierarchy** — Hero (border-2 primary) > Performance (glass) > Secondary (muted)
4. **Fewer panels above fold** — Max 3 on mobile
5. **Progressive disclosure** — Stats collapsed by default, attention panels collapsible
6. **Mobile-first stacking** — Full-width cards, 1 col

### New Structure

```
<DashboardRedesigned>
├── 1. HERO SECTION (PrimaryActionCard)
│   ├── Signed-out: "Dùng thử không cần đăng nhập" + 2 CTAs
│   ├── Signed-in no plan: "Bắt đầu tạo mục tiêu SMART" + CTA
│   └── Signed-in active plan: "Việc quan trọng nhất hôm nay" + CTA to 12-week
│
├── 2. DEMO NOTICE (SecondaryPanel, collapsible, only if demo mode)
│   └── "Demo local-first" + Export button
│
├── 3. STATS SECTION (SectionBlock, collapsible)
│   └── Grid 4 stats cards (Goal count, Tasks completed, Achievements, Journal)
│
├── 4. PERFORMANCE GRID (SectionBlock, only if active plan)
│   ├── GoalProgressCard
│   ├── ExecutionScoreCard
│   ├── StreakCard
│   └── Details (WeeklyProgressChart + MetricsSummary, collapsible)
│
├── 5. ATTENTION PANELS (SectionBlock, collapsible)
│   ├── Review due (if due today)
│   └── Weakest area (if exists)
│
├── 6. TOOLS SECTION (SectionBlock)
│   └── Quick actions as outline buttons grid (Goals, Journal, Backup, etc.)
│
└── 7. FOOTER / PLAN CARD
    └── Current plan info (moved from sidebar)
```

### Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| Cards above fold (mobile) | 6-8 | 2-3 |
| Primary CTA clarity | Low (blends with 3-4 others) | High (only gradient-brand button visible) |
| Stats visibility | Always visible | Collapsible, hidden by default on mobile |
| Performance section depth | 5+ cards | 3 cards + collapsible details |
| Scroll depth to performance | 6-8 viewport heights | 3-4 viewport heights |
| Auth CTA prominence | High (competes with start) | Low (tools section or footer) |

---

## Component Usage (Layout Primitives)

| Component | Usage | Props |
|-----------|-------|-------|
| `PrimaryActionCard` | Hero section | `title`, `description`, `action`, `hero` |
| `SectionBlock` | Stats, Performance, Attention, Tools | `title`, `eyebrow`, `collapsible`, `defaultOpen` |
| `SecondaryPanel` | Demo notice, attention items | `icon`, `title`, `children`, `collapsible` |
| `PageHeader` | Not used on Dashboard (Dashboard has custom hero) | — |
| `ReviewSummaryGrid` | Not used on Dashboard | — |
| `EmptyStateLayout` | Empty state when no plan | `icon`, `title`, `description`, `actions` |
| `StatusRow` | Inline status badges | `icon`, `text`, `badge` |

---

## Migration Steps

### Step 1: Prepare
- [x] Layout primitives created (`src/app/components/layout/`)
- [ ] Fix syntax errors in current `Dashboard.tsx` (unblock build)
- [ ] Add tests for new components if needed

### Step 2: Create Redesigned Component
- [ ] Create `DashboardRedesigned.tsx` (demo only, not replace yet)
- [ ] Copy business logic from `DashboardContent` function
- [ ] Apply new layout structure using primitives
- [ ] Verify visual in browser

### Step 3: Testing
- [ ] `npm run typecheck`
- [ ] `npm run build` (after fixing Dashboard.tsx)
- [ ] Run Dashboard tests (update if selectors changed)
- [ ] Mobile responsive test (375px, 768px, 1024px)

### Step 4: Swap
- [ ] Replace `DashboardContent` with `DashboardRedesigned` in `Dashboard.tsx`
- [ ] Update imports
- [ ] Remove old unused components (quickActionCards, attentionPanels arrays)
- [ ] Keep plan card in sidebar or move to footer per new design

### Step 5: Post-launch
- [ ] Monitor analytics: time-to-first-action, bounce rate
- [ ] Check rescue triggers still fire correctly
- [ ] Verify tour steps still target correct elements

---

## What Stays the Same

- **Auth behavior**: No changes to `useAuthContext`, `handleAuthNavigate`
- **Routes**: No new routes, same `/onboarding`, `/life-balance`, `/12-week-system`
- **Storage**: No changes to localStorage keys or shapes
- **Business logic**: `getGoalExecutionStats`, `buildGoalProgressSnapshot`, etc. unchanged
- **Charts**: `WeeklyProgressChart` still lazy-loaded
- **Motion**: No new animations, respect `prefers-reduced-motion`

---

## Risks & Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| Build fails (Dashboard syntax) | High | Fix syntax errors before swapping |
| Tests fail (selectors changed) | Medium | Update test IDs, keep tour step IDs stable |
| Mobile overflow | Medium | Test on 375px width, adjust padding |
| Performance regression | Low | Lazy load chart already, no new heavy components |
| User confusion (layout change) | Low | Keep copy identical, only structure changes |

---

## File Changes

| File | Change | Reason |
|------|--------|--------|
| `src/app/components/layout/*.tsx` | ✅ Created | New primitives |
| `src/app/pages/DashboardRedesigned.tsx` | ➕ New | Demo of new layout (not replacing yet) |
| `src/app/pages/Dashboard.tsx` | 🔄 Future | Replace `DashboardContent` with redesigned |
| `guidelines/LAYOUT_SYSTEM_GUIDE.md` | 📝 Updated | Add usage examples, migration order |
| `guidelines/LAYOUT_DASHBOARD_CHANGELOG.md` | 📝 New | This document |

---

## Acceptance Checklist

- [ ] Signed-out demo user sees clear "Dùng thử ngay" CTA (no login required)
- [ ] Signed-in user with active plan sees "Mở trung tâm 12 tuần" as only gradient-brand button
- [ ] Dashboard shows ≤3 cards above fold on mobile
- [ ] Stats section collapses by default on mobile
- [ ] Demo notice is subtle, not a full competing card
- [ ] All existing analytics events still fire
- [ ] Tour steps still work (data-tour-id preserved)
- [ ] No new dependencies added
- [ ] No new motion effects added
- [ ] Typecheck passes
- [ ] Build passes

---

## Next Prompt

After implementing `DashboardRedesigned.tsx` and verifying visually:

```
Bạn là layout architect.

Nhiệm vụ: Replace DashboardContent với DashboardRedesigned trong Dashboard.tsx.

- Copy business logic từ DashboardContent sang DashboardRedesigned (đã làm)
- Thay <DashboardContent> bằng <DashboardRedesigned />
- Xóa các array cũ: quickActions, attentionPanels, overviewCards (nếu không dùng nữa)
- Giữ nguyên auth behavior, routes, storage
- Chạy npm run typecheck và build
- Cập nhật test nếu selector thay đổi

Không đổi copy, không đổi business logic.
```

---

*End of Dashboard Layout Changelog*
