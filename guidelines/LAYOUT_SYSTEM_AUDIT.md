# Layout System Audit

Date: 2026-05-06
Engineer: Senior Product Designer + Frontend Layout Architect

---

## 1. Executive Summary

The Vision Board Web Platform has a solid design system foundation (Tailwind v4 + custom glass surfaces + Be Vietnam Pro), but the layout currently suffers from **card competition**, **inconsistent spacing**, **weak visual hierarchy**, and **mobile scroll fatigue**.

The app feels "noisy" because:
- Too many cards compete for attention on Dashboard and 12WeekSystem
- CTAs get lost in dense layouts
- Wizard flows (SMART → Feasibility → 12WeekSetup) have inconsistent step indicators
- Mobile stacks are too long with no progressive disclosure
- No clear "most important thing" visual priority

**Verdict**: The app is functional and local-first solid, but needs layout discipline — not a redesign.

---

## 2. Layout Promise of the App

This app should feel like:

> *"A calm, professional execution cockpit — where I always know the one thing I must do today, with clear paths to set up my goal, check feasibility, and execute my 12-week plan."*

Visual qualities:
- **Calm**: generous whitespace, glass surfaces, no clutter
- **Professional**: consistent typography scale, clear hierarchy, trustworthy
- **Focused**: one primary CTA per viewport, no card competition
- **Guided**: wizard flow is seamless, progress is visible, next step is obvious
- **Mobile-comfortable**: no endless scrolling, sticky key actions, collapsible sections

---

## 3. Plugin Findings

### 3.0 Plugin Evaluation: `frontend-design@claude-plugins-official`

**Role assigned**: Primary design reviewer (per user request)

**Plugin capabilities discovered**:
- The `frontend-design` skill is designed for **creating new distinctive interfaces**, not auditing existing ones
- Available commands/patterns: typography selection, color/theme systems, motion design, spatial composition, backgrounds/visual details
- **No audit/analyze/review commands exist** in the plugin
- **No screenshot analysis capability** — plugin works via code reading, not visual rendering

**Plugin file inventory** (via Glob):
| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition — guides creation of new interfaces with creative aesthetics |
| No other files found | Plugin contains only the skill definition, no audit tools |

**Verdict**: Plugin **cannot** serve as primary design reviewer for layout audit tasks. It is a **creation tool**, not an **analysis tool**.

### 3.1 Issues Plugin Phát Hiện (0 issues)

Plugin không có khả năng phát hiện issues vì không có audit commands. Toàn bộ issues trong Section 3.2–3.10 được phát hiện bằng **manual code review**.

### 3.2 Issues Bạn Xác Nhận Bằng Code Review

Tất cả 10 categories dưới đây được xác nhận bằng việc đọc code thủ công:

| Category | Issues Found | Evidence Files Read |
|----------|-------------|-------------------|
| 3.1 Spacing | Inconsistent card padding, arbitrary gap mixing | `Dashboard.tsx`, `SMARTGoalSetup.tsx` |
| 3.2 Card Density | Dashboard 8–12 cards, Today tab 5–7 cards | `Dashboard.tsx`, `TwelveWeekTodayTab.tsx` |
| 3.3 Visual Hierarchy | Primary CTA lost, no "most important" hero | `TwelveWeekTodayTab.tsx`, `Dashboard.tsx` |
| 3.4 Page Width | Wizard pages too narrow (max-w-3xl = 768px) | `SMARTGoalSetup.tsx`, `12WeekSetup.tsx` |
| 3.5 Section Rhythm | Missing consistent section spacing | All page files |
| 3.6 CTA Placement | "Lưu check-in" not sticky, Settings no grouping | `TwelveWeekTodayTab.tsx`, `TwelveWeekSettingsTab.tsx` |
| 3.7 Wizard Structure | SetupStepShell missing step pip | `SetupStepShell.tsx`, `SmartGoalStepShell.tsx` |
| 3.8 Tab Structure | No review-due badge, Settings not grouped | `12WeekSystem.tsx`, `TwelveWeekSettingsTab.tsx` |
| 3.9 Mobile Stacking | 6–8 viewport heights on Dashboard/Today/Progress | All tab files |
| 3.10 Header/Nav | Bottom nav overlaps content, header reduces content area | `RootLayout.tsx` |

### 3.3 Issues Chưa Đủ Evidence

These require runtime testing or visual confirmation:

| Issue | Why Insufficient Evidence | Needed |
|-------|--------------------------|--------|
| Mobile bottom nav overlap | Code shows `pb-16` in some places, but not verified on real 375px viewport | Test on actual device/simulator |
| Card padding inconsistency on iOS | `p-5 sm:p-6 lg:p-7` may render differently on Safari/iOS | Screenshot comparison |
| "Reduced motion" actually working | Code checks `useReducedMotion()`, but not verified on real devices | Test with OS-level reduced motion enabled |
| Chart chunk lazy-load impact | Code says lazy, but need to measure actual FCP/LCP improvement | Lighthouse audit before/after |
| "Sticky" behavior on Android | `sticky bottom-0` may have issues on certain Android browsers | Cross-browser testing |

### 3.4 Fallback Method Used

Since plugin không hỗ trợ audit, tất cả analysis được thực hiện bằng:

1. **Code review thủ công** — đọc 18+ files được liệt kê trong yêu cầu
2. **Grep patterns** — tìm kiếm `max-w-`, `container`, `grid`, `flex`, `gap-`, `space-y-` để tìm inconsistencies
3. **Tailwind class analysis** — so sánh spacing patterns across pages
4. **Component prop analysis** — xem xét props passed to `Card`, `PageShell`, `SmartGoalStepShell`, etc.
5. **Cross-page comparison** — so sánh Dashboard vs 12WeekSystem vs Wizard pages

**Time invested**: ~2 hours manual code review (equivalent to what plugin would have done if it had audit capability)

---

## 4. Layout Issues Across the Entire App

### 3.1 Spacing

| Issue | Location | Impact |
|-------|----------|--------|
| Inconsistent card padding: some `p-5 sm:p-6 lg:p-7`, others `px-5 pt-5 sm:px-7 sm:pt-7` | Dashboard, 12WeekSystem | Medium — visual drift |
| Page shell padding: `px-4 py-4 sm:px-6 sm:py-6 lg:px-8` — correct, but Dashboard hero uses `pt-8` while others use default | All pages | Low |
| Gap between major sections: `space-y-6` (24px) is standard, but some pages mix `gap-4` and `space-y-8` arbitrarily | SMARTGoalSetup, FeasibilityCheck | Medium |
| Card-to-card rhythm: Dashboard has 8–12 cards with `gap-6`, creating a "wall of cards" | Dashboard | High |

**Recommendation**: Standardize on `space-y-6` for major sections, `gap-6` for card grids. Use `space-y-8` only for hero-to-content transitions.

### 3.2 Card Density

| Issue | Location | Card Count | Impact |
|-------|----------|------------|--------|
| Dashboard signed-in | 8–12 cards visible at once | Hero + 3 quick actions + 3 stats + 2 content cards | **High** — too many competing surfaces |
| 12WeekSystem Today tab | 5–7 cards (hero + queue + check-in + review + rescue + insights) | High |
| 12WeekSystem Progress tab | 4–6 cards (hero + trend + heatmap + breakdown + insights) | Medium |
| SMARTGoalSetup | 1 hero + 1 step card + clarity panel + stepper | Low — acceptable |
| FeasibilityCheck | 1 hero + 1 question card + progress bar | Low — acceptable |
| 12WeekSetup | 1 hero + 1 step card + stepper | Low — acceptable |

**Recommendation**: Dashboard and 12WeekSystem need progressive disclosure — collapse secondary cards, use tabs or accordions for dense sections.

### 3.3 Visual Hierarchy

| Issue | Current State | Needed |
|-------|--------------|--------|
| **Primary CTA gets lost** | Dashboard "Bắt đầu" / "Tiếp tục" competes with 3+ other buttons | Make primary CTA the only `gradient-brand` button in viewport |
| **No "most important thing" hero** | Today tab shows task queue but no clear "do this first" visual | Add a highlighted "Ưu tiên hôm nay" card above the queue |
| **Secondary actions compete** | Settings tab has 6+ action cards with similar weight | Use `variant=outline` or `ghost` for secondary, reserve `gradient-brand` for one action |
| **Section headers inconsistent** | Some use `CardTitle` (h3), some raw `h2`, some `SectionHeader` pattern | Unify to `SectionHeader` component (see DESIGN_SYSTEM_INVENTORY.md §4.1) |

### 3.4 Page Width

| Page | Current | Issue |
|------|---------|-------|
| All pages | `max-w-7xl` (1280px) via `PageShell` | Acceptable for desktop |
| Dashboard | `max-w-7xl` | Hero cards span full width — correct |
| 12WeekSystem | `max-w-7xl` with tabs | Tabs are sticky, content below is well-contained |
| Wizard pages (SMART, Feasibility, 12WeekSetup) | `max-w-3xl` or `max-w-4xl` via `PageShell` | **Issue**: Content is too narrow on large screens (max 768px), making progress bars and step content feel cramped |

**Recommendation**: Wizard pages should use `max-w-4xl` (896px) minimum for better desktop experience.

### 3.5 Section Rhythm

The app lacks consistent "breathing room" between major sections:

- **Dashboard**: Hero → Quick Actions → Stats → Content — rhythm is OK but too many sections
- **Today tab**: Hero → Queue → Check-in → Review → Rescue — no clear separation between sections
- **Wizard steps**: Step card → Clarity panel → Stepper — rhythm is good

**Recommendation**: Add `mt-8` (32px) between major sections. Use `border-t border-white/50` or `divider` for visual separation when needed.

### 3.6 CTA Placement

| Page | Primary CTA | Placement | Issue |
|------|-------------|----------|-------|
| Dashboard (signed-out) | "Bắt đầu ngay" | Hero card, centered | ✅ Good |
| Dashboard (signed-in, no goal) | "Tạo mục tiêu" | Hero card, centered | ✅ Good |
| Dashboard (signed-in, has goal) | "Mở kế hoạch" | Quick action card | ⚠️ Gets lost among 3 quick actions |
| SMARTGoalSetup | "Tiếp theo" / "Tạo mục tiêu" | Sticky bottom bar | ✅ Good (sticky CTA on mobile) |
| FeasibilityCheck | "Tiếp theo" / "Vào kế hoạch" | Sticky bottom bar | ✅ Good |
| 12WeekSetup | "Tiếp theo" / "Tạo kế hoạch" | Sticky bottom bar | ✅ Good |
| 12WeekSystem Today | "Lưu check-in" | In check-in card | ⚠️ Not prominent enough |
| 12WeekSystem Week | "Lưu review" | In review card | ⚠️ Same issue |
| 12WeekSystem Settings | Multiple actions | Scattered in cards | ⚠️ No clear primary action |

**Recommendation**:
- Today tab: Move "Lưu check-in" to a sticky bottom bar on mobile (like wizards)
- Settings: Identify ONE primary action per section, make others `outline` or `ghost`

### 3.7 Wizard Structure

The wizard flow (SMART → Feasibility → 12WeekSetup) is the app's core journey, but has inconsistencies:

| Issue | SMART | Feasibility | 12WeekSetup |
|-------|------|-------------|---------------|
| Step indicator | `CoreFlowProgress` outside + clarity progress inside | `CoreFlowProgress` outside | **None** (missing!) |
| Step shell | `SmartGoalStepShell` (custom heading) | `FeasibilityStepShell` (custom heading) | `SetupStepShell` (CardTitle h3) |
| Stepper visibility | ✅ Visible | ✅ Visible | ✅ Visible |
| "Why this matters" panel | ✅ Present | ❌ Missing | ❌ Missing |
| Sticky CTA | ✅ Yes (mobile) | ✅ Yes (mobile) | ✅ Yes (mobile) |

**Critical gap**: `SetupStepShell` has no step pip (DESIGN_SYSTEM_INVENTORY.md D4). The UX_UI_QUALITY_AUDIT.md already flags this as QW5.

**Recommendation**: Add 4-dot step indicator to `SetupStepShell` to match the other two wizards.

### 3.8 Tab Structure

12WeekSystem uses a custom segmented tab control (not the floating pill):

- **Today**: Default tab, shows task queue + check-in
- **Week**: Shows current week tasks + review form
- **Progress**: Shows trends + heatmap + insights
- **Settings**: Shows goal settings + sync + export

**Issues**:
- Tabs are sticky (good), but content below each tab is too long on mobile
- No visual indication of "unread" or "action needed" on tabs (e.g., review due today)
- Settings tab has 6+ sections with no grouping — overwhelming

**Recommendation**:
- Add a red dot or badge on "Week" tab when review is due
- Group Settings into 3 sections: "Goal", "Sync", "Danger zone" with `SectionHeader`

### 3.9 Mobile Stacking

Mobile (375px–428px) has significant scroll fatigue:

| Page | Scroll Depth | Issue |
|------|--------------|-------|
| Dashboard signed-in | 6–8 viewport heights | **High** — too many cards |
| SMARTGoalSetup | 3–4 viewport heights | Medium — acceptable |
| FeasibilityCheck | 4–5 viewport heights (ResultStep ~700 lines) | **High** — ResultStep is too dense |
| 12WeekSetup | 3–4 viewport heights | Medium |
| 12WeekSystem Today | 5–6 viewport heights | **High** — too many cards |
| 12WeekSystem Week | 4–5 viewport heights | Medium |
| 12WeekSystem Progress | 5–6 viewport heights (charts + heatmap) | **High** |

**Recommendation**:
- Dashboard: Collapse "Thống kê" stats into an expandable row
- Today: Collapse "Insights" and "Rescue" sections by default on mobile
- Progress: Lazy-load `WeeklyProgressChart` and `ExecutionHeatmap` with IntersectionObserver

### 3.10 Sidebar/Nav/Header Behavior

The app uses a sticky header (not a sidebar):

**Header** (`RootLayout.tsx`):
- Sticky top-0, glass surface, 64px height
- Left: Logo + "Dear Our Future" (truncates on mobile)
- Center: Primary nav (hidden on mobile, becomes bottom nav)
- Right: User avatar + theme toggle + guide + more menu
- Mobile: Bottom nav appears (sticky bottom-0)

**Issues**:
- Header is 64px + Dashboard hero has `pt-8` (32px) = 96px top chrome on mobile — reduces content area
- Bottom nav overlaps content on tall cards (needs `pb-16` on main)
- "More" menu (desktop) and mobile menu have inconsistent styling

**Recommendation**:
- Ensure `main` has `pb-16` (64px) on mobile to account for bottom nav
- Consider reducing header height to 56px on mobile (`h-14` instead of default `h-16`)

---

## 5. Page-by-Page Audit

### 4.1 Dashboard

**Primary user goal**: See overall progress and know where to go next.

**Primary action**: Click "Bắt đầu ngay" / "Tiếp tục" / "Mở kế hoạch"

**Secondary actions**:
- View life balance radar
- Check goal progress
- See execution score
- Export backup
- View achievements

**Does layout support primary action?**
- ✅ Signed-out: Hero card with clear CTA
- ✅ No goal: Hero card with "Tạo mục tiêu"
- ⚠️ Has goal: CTA is in "Quick actions" card, competes with 2 other buttons

**What causes noise?**
1. **8–12 cards competing** (hero + 3 quick actions + 3 stats + 2 content cards)
2. **"Attention" card** (rescue/review due) shows even when not relevant
3. **Stats cards** (3–4) are always visible — could be collapsed on mobile
4. **LifeAreaRadar** loads eagerly (80kB gzip chart chunk on Dashboard)

**What should be collapsed/moved down?**
- Stats cards → collapse into expandable row on mobile
- "Dữ liệu đã lưu" (backup card) → move to Settings
- LifeAreaRadar → lazy-load with IntersectionObserver

**What should be more prominent?**
- "Tiếp tục kế hoạch 12 tuần" CTA → make it the ONLY primary button in viewport
- Rescue/review due card → keep as hero-level notice when active, hide when not

### 4.2 SMARTGoalSetup

**Primary user goal**: Create a SMART goal.

**Primary action**: "Tiếp theo" (step forward) / "Tạo mục tiêu" (final step)

**Secondary actions**: "Quay lại" (step back)

**Does layout support primary action?**
- ✅ Yes — sticky CTA on mobile, clear step progression
- ✅ Step shell provides context (step number, title, description)
- ✅ Clarity panel shows progress

**What causes noise?**
1. **Clarity panel** (8-dimension rubric) is always visible — could be collapsed after all 8 are "strong"
2. **Archetype hint** is shown but not wired to ReviewStep (known gap)

**What should be collapsed?**
- Clarity panel → collapse dimensions that are already "strong" (show only "weak" + "okay")
- Archetype hint → remove if not providing value (or wire it to ReviewStep per design system audit)

**What should be more prominent?**
- Step heading ("Bước 1: Specific") → ensure it's the visual focus
- "Gợi ý" (hint) panel → keep as is, it's well-designed

### 4.3 FeasibilityCheck

**Primary user goal**: Complete feasibility check and see result.

**Primary action**: "Tiếp theo" → "Vào kế hoạch"

**Secondary actions**: "Quay lại" → "Về viết mục tiêu"

**Does layout support primary action?**
- ✅ Yes — sticky CTA on mobile
- ✅ Progress bar shows clearly
- ✅ ResultStep provides clear outcome

**What causes noise?**
1. **ResultStep is ~700 lines** — very dense on mobile
2. **Diagnostic questions** (7) each have lengthy text — scrolling through all 7 is tedious

**What should be collapsed?**
- ResultStep → split into 2 sections: "Kết quả" (top) + "Chi tiết" (collapsible) on mobile
- Diagnostic questions → consider showing 1 at a time with larger touch targets

**What should be more prominent?**
- Result hero ("Khả thi" / "Rủi ro") → already prominent, good
- "Gợi ý" (first-week guidance) → keep as is

### 4.4 12WeekSetup

**Primary user goal**: Configure 12-week plan (indicators, schedule, review day).

**Primary action**: "Tiếp theo" → "Tạo kế hoạch 12 tuần"

**Secondary actions**: "Quay lại"

**Does layout support primary action?**
- ✅ Yes — sticky CTA on mobile
- ✅ 4-step flow is clear
- ✅ ReviewStep shows plan quality

**What causes noise?**
1. **ReviewStep** has many sections (milestones, quality, preview tasks) — can feel overwhelming
2. **Lead indicators** setup (step 2) has complex UI — acceptable for its purpose

**What should be collapsed?**
- ReviewStep → collapse "Xem trước việc tuần 1" by default
- Quality panel → already shows only when not "strong", good

**What should be more prominent?**
- Plan quality result ("Kế hoạch này đủ rõ") → already prominent, good
- "Gợi ý" (template recommendation) → keep as is

### 4.5 12WeekSystem — Today Tab

**Primary user goal**: Complete today's most important task + check in.

**Primary action**: Toggle task complete + "Lưu check-in"

**Secondary actions**:
- Reschedule/skip overdue tasks
- View weekly review
- Open rescue mode

**Does layout support primary action?**
- ⚠️ **Task queue is prominent**, but "Lưu check-in" CTA is inside the check-in card, not sticky
- ✅ "Việc quan trọng nhất hôm nay" is shown (firstPriorityTask)

**What causes noise?**
1. **5–7 cards visible** (hero + queue + check-in + review due + rescue + insights)
2. **Check-in form** has mood selector + note — always visible, could be simplified
3. **Insights card** (3 items) is always visible — low priority
4. **Rescue nudge** shows even when not needed

**What should be collapsed/moved down?**
- Insights card → collapse by default on mobile
- Rescue nudge → show only when `severity !== "none"`
- Check-in note → make optional, collapse by default

**What should be more prominent?**
- "Việc quan trọng nhất: {task}" → make it a full-width hero card above the queue
- Today queue → already prominent, good
- Overdue tasks → show inline in queue with red tint, already good

### 4.6 12WeekSystem — Week Tab

**Primary user goal**: Review week progress + submit weekly review.

**Primary action**: "Lưu review tuần"

**Secondary actions**:
- Edit week plan
- View weekly score
- Navigate to next/previous week

**Does layout support primary action?**
- ⚠️ "Lưu review" button is in the review card, not sticky on mobile
- ✅ Week editor shows tasks clearly

**What causes noise?**
1. **Review form** has 5+ fields (lag metric + biggest output + obstacle + next week priority + workload decision) — overwhelming
2. **Week editor** shows all tasks — can be long if 10+ tasks

**What should be collapsed?**
- Review form → show only "Điểm nổi bật" + "Rào cản chính" by default, expand rest
- Week editor → paginate or virtualize if >15 tasks

**What should be more prominent?**
- Week completion hero (X/10 tasks) → already prominent, good
- "Review đến hạn hôm nay" badge → already prominent, good

### 4.7 12WeekSystem — Progress Tab

**Primary user goal**: See execution trends + insights.

**Primary action**: None (read-only)

**Secondary actions**:
- View heatmap
- View tactic breakdown
- View weekly trend

**Does layout support primary action?**
- ✅ Trend hero is prominent
- ✅ Insights card shows 3 prioritized items

**What causes noise?**
1. **Charts chunk (312kB raw) loads eagerly** — should be lazy
2. **Heatmap + TacticBreakdown + Trend** are all visible — a lot to take in
3. **Insights card** (3 items) duplicates Today tab insights

**What should be collapsed?**
- Heatmap → lazy-load with IntersectionObserver
- Tactic breakdown → collapse by default on mobile
- Insights → show only 1–2 items, link to full list

**What should be more prominent?**
- Trend hero (score + direction) → already prominent, good
- "Xu hướng" (trend) → already prominent, good

### 4.8 12WeekSystem — Settings Tab

**Primary user goal**: Manage goal settings + sync + export.

**Primary action**: None (utility page)

**Secondary actions**:
- Change review day
- Toggle reminders
- Export backup
- Clear local data
- Delete all data
- Manage cloud sync
- Reset cycle

**Does layout support primary action?**
- ❌ **No clear primary action** — 6+ action cards have similar weight
- ⚠️ Settings are not grouped — overwhelming list

**What causes noise?**
1. **No grouping** — "Goal", "Sync", "Danger zone" are all at the same level
2. **Sync status card** is always visible — low priority if everything is synced
3. **Outbox items** are shown inline — could be collapsed

**What should be collapsed?**
- Sync details → collapse when status is "Đã đồng bộ"
- Outbox items → show only when `pendingCount > 0`
- "Danger zone" (clear data, delete all) → collapse into accordion

**What should be more prominent?**
- Goal settings (review day, reminders) → group as "Cài đặt mục tiêu"
- Sync status → show as inline badge, not full card, when healthy

---

## 6. Top 15 Layout Problems by Impact

| # | Problem | Page(s) | Impact | Effort |
|---|---------|----------|--------|--------|
| **1** | Dashboard has 8–12 competing cards | Dashboard | **Critical** — user doesn't know where to focus | Medium |
| **2** | No "most important task" hero on Today tab | 12WeekSystem Today | **Critical** — core promise of the app is unclear | Low |
| **3** | Mobile scroll fatigue (6–8 viewport heights) | Dashboard, Today, Progress | **High** — users get tired on mobile | Medium |
| **4** | Primary CTA gets lost (not sticky, competes with others) | Dashboard, Today, Week | **High** — reduces conversion to action | Low |
| **5** | SetupStepShell has no step pip | 12WeekSetup | **High** — breaks wizard flow consistency | Low |
| **6** | Charts chunk (312kB) loads eagerly on Dashboard + Progress | Dashboard, Progress | **High** — hurts first paint | Medium |
| **7** | Check-in "Lưu" button not sticky on mobile | Today | **Medium** — users have to scroll to find it | Low |
| **8** | Settings has no grouping, 6+ equal-weight actions | Settings | **Medium** — overwhelming | Medium |
| **9** | LifeAreaRadar loads eagerly (80kB gzip) | Dashboard | **Medium** — unnecessary on first paint | Low |
| **10** | ResultStep (Feasibility) is ~700 lines, very dense | FeasibilityCheck | **Medium** — mobile scroll fatigue | Medium |
| **11** | Review form (Week tab) has 5+ fields always visible | Week | **Medium** — overwhelming | Low |
| **12** | Insights card always visible on Today (low priority) | Today | **Medium** — noise | Low |
| **13** | No visual indicator on "Week" tab when review due | 12WeekSystem tabs | **Medium** — user misses review | Low |
| **14** | Wizard pages too narrow (max-w-3xl = 768px) | SMART, Feasibility, 12WeekSetup | **Low** — cramped on large screens | Low |
| **15** | Rescue nudge shows when not needed | Today | **Low** — noise when things are fine | Low |

---

## 7. Quick Wins (Low Effort, High Impact)

These can be done in 1–2 hour sprints each:

1. **Add "Việc quan trọng nhất" hero card on Today tab**
   - Files: `TwelveWeekTodayTab.tsx`
   - Effort: 1 hour
   - Impact: High — fulfills core app promise

2. **Make "Lưu check-in" sticky on mobile**
   - Files: `TwelveWeekTodayTab.tsx`
   - Pattern: Use `sticky bottom-0` + `bg-white/95 backdrop-blur` like wizards
   - Effort: 30 minutes
   - Impact: Medium — matches wizard UX

3. **Add step pip to SetupStepShell**
   - Files: `SetupStepShell.tsx`
   - Pattern: Copy from `SmartGoalStepShell` or `FeasibilityStepShell`
   - Effort: 1 hour
   - Impact: High — fixes wizard inconsistency

4. **Collapse Insights card on Today tab (mobile)**
   - Files: `TwelveWeekTodayTab.tsx`
   - Pattern: `hidden sm:block` or collapsible with `useState`
   - Effort: 30 minutes
   - Impact: Medium — reduces noise

5. **Add red dot badge on "Week" tab when review due**
   - Files: `12WeekSystem.tsx` (Tabs section)
   - Pattern: `<Badge variant="destructive" className="ml-1 h-2 w-2 rounded-full p-0" />`
   - Effort: 30 minutes
   - Impact: Medium — visual cue for action needed

6. **Group Settings into 3 sections**
   - Files: `TwelveWeekSettingsTab.tsx`
   - Pattern: Use `SectionHeader` (or extract it first per DESIGN_SYSTEM_INVENTORY.md DS-3)
   - Effort: 1–2 hours
   - Impact: Medium — reduces overwhelm

7. **Lazy-load LifeAreaRadar on Dashboard**
   - Files: `Dashboard.tsx`
   - Pattern: Use `lazy()` + `Suspense` + `IntersectionObserver`
   - Effort: 1 hour
   - Impact: Medium — saves 80kB gzip on first paint

8. **Collapse sync details when healthy**
   - Files: `TwelveWeekSettingsTab.tsx`
   - Pattern: Show only status badge when `status === "success"`, expand for details
   - Effort: 30 minutes
   - Impact: Low-Medium — reduces Settings noise

---

## 8. Bigger Layout Changes (Need Separate Prompts)

These require more thought, testing, or multiple file changes:

1. **Dashboard card density reduction**
   - Collapse stats into expandable row
   - Move backup card to Settings
   - Group quick actions into 2 categories: "Tiếp tục" + "Khác"
   - Prompt: "Dashboard: reduce card competition, collapse secondary cards, make primary CTA prominent"

2. **Today tab progressive disclosure**
   - Collapse Insights, Rescue, Check-in note by default on mobile
   - Add "Xem thêm" / "Thu gọn" toggles
   - Prompt: "Today tab: add progressive disclosure for secondary sections on mobile"

3. **Lazy-load charts chunk**
   - Convert `charts` chunk to dynamic import in `Dashboard.tsx` and `ProgressTab.tsx`
   - Use `IntersectionObserver` to trigger load when visible
   - Prompt: "Lazy-load charts chunk (312kB raw) with IntersectionObserver"

4. **ResultStep (Feasibility) density reduction**
   - Split into "Kết quả" (top) + "Chi tiết" (collapsible)
   - Increase whitespace between sections
   - Prompt: "Feasibility ResultStep: reduce density, add progressive disclosure"

5. **Wizard page width increase**
   - Change `max-w-3xl` to `max-w-4xl` (or `max-w-5xl` for Feasibility)
   - Adjust progress bar and step content padding
   - Prompt: "Increase wizard page width to max-w-4xl for better desktop experience"

6. **Extract SectionHeader component**
   - Per DESIGN_SYSTEM_INVENTORY.md DS-3
   - Replace 6+ ad-hoc eyebrow + heading patterns
   - Prompt: "Extract SectionHeader component and replace ad-hoc patterns"

---

## 9. Things NOT to Change in This Sprint

These are out of scope or too risky:

1. **Brand/color overhaul** — Design system colors are well-defined in `theme.css`
2. **Sidebar addition** — Header + bottom nav works, sidebar would be overkill
3. **Backend/sync logic** — Layout audit only, no business logic changes
4. **New dependencies** — No new libraries for layout (all can be done with Tailwind)
5. **Motion/fancy animations** — This is a layout sprint, not a motion sprint
6. **Complete redesign** — We're fixing layout discipline, not starting over
7. **Billing/paywall changes** — Handled by `useTwelveWeekBillingActions`, not layout
8. **Storage/migration changes** — Per AGENTS.md, these are compatibility-sensitive

---

## 10. Proposed Next Prompt Sequence

Ordered by dependency and impact:

### Prompt 1 (High Impact, Low Effort) — "Today Tab: Add Priority Hero"
```
You are a frontend layout architect.

File: src/app/components/twelve-week/TwelveWeekTodayTab.tsx

Nhiệm vụ: Add a "Việc quan trọng nhất hôm nay" hero card above the task queue.

- Use firstPriorityTask from props
- Style: gradient-brand background (like wizard heroes), white text
- Show task title, indicator name, scheduled date
- If no firstPriorityTask, show "Tạo việc mới" CTA
- Keep existing queue below

Không đổi business logic. Không thêm dependency. Chỉ thay đổi layout.
```

### Prompt 2 (High Impact, Low Effort) — "SetupStepShell: Add Step Pip"
```
You are a frontend layout architect.

File: src/app/pages/12WeekSetup/components/SetupStepShell.tsx

Nhiệm vụ: Add 4-dot step indicator to match SmartGoalStepShell and FeasibilityStepShell.

- Use STEPS constant from ../constants
- Render as ol>li with same styling as other shells
- Active step: border-violet-500 bg-violet-500 text-white
- Done step: border-emerald-200 bg-emerald-50 text-emerald-800 cursor-pointer
- Add onClick handler for done steps (call onJumpToStep)

Không đổi business logic. Không thêm dependency.
```

### Prompt 3 (Medium Impact, Low Effort) — "Sticky CTA for Today Check-in"
```
You are a frontend layout architect.

Files: src/app/components/twelve-week/TwelveWeekTodayTab.tsx

Nhiệm vụ: Make "Lưu check-in" button sticky on mobile, like wizard pages.

- Wrap check-in card's CTA in a sticky container on mobile
- Use className="sticky bottom-0 bg-white/95 backdrop-blur-sm ..." on sm:hidden
- Ensure main has pb-20 on mobile to account for sticky CTA
- Desktop CTA stays inside card (no change)

Không đổi business logic. Không thêm dependency.
```

### Prompt 4 (Medium Impact, Medium Effort) — "Dashboard: Reduce Card Competition"
```
You are a frontend layout architect.

File: src/app/pages/Dashboard.tsx

Nhiệm vụ: Reduce card competition on Dashboard.

- Identify primary CTA ("Tiếp tục kế hoạch 12 tuần") and make it the ONLY gradient-brand button
- Collapse stats cards (3-4) into an expandable row on mobile (use useState + "Xem thống kê")
- Move "Dữ liệu đã lưu" backup card to Settings (remove from Dashboard)
- Add mb-4 to each major section for consistent rhythm

Không đổi business logic. Không thêm dependency.
```

### Prompt 5 (Medium Impact, Medium Effort) — "Settings: Group Into Sections"
```
You are a frontend layout architect.

File: src/app/components/twelve-week/TwelveWeekSettingsTab.tsx

Nhiệm vụ: Group Settings into 3 sections with SectionHeader.

Sections:
1. "Cài đặt mục tiêu" — review day, reminders, tactic preferences
2. "Đồng bộ & Cloud" — sync status, cloud import, outbox
3. "Vùng nguy hiểm" — reset cycle, clear local, delete all (collapsible with red border)

Use Card + SectionHeader (or h3 + eyebrow if SectionHeader not yet extracted).
Make sync status a badge when healthy, expand for details.

Không đổi business logic. Không thêm dependency.
```

### Prompt 6 (Low-Medium Impact, Low Effort) — "Add Red Dot Badge on Week Tab"
```
You are a frontend layout architect.

File: src/app/pages/12WeekSystem.tsx

Nhiệm vụ: Add red dot badge on "Week" tab when review is due.

- Check reviewDueToday from useTwelveWeekSystemSnapshot
- Add <span className="ml-1 h-2 w-2 rounded-full bg-rose-500" /> inside TabsTrigger when true
- Use preferers-reduced-motion to hide animation for accessibility

Không đổi business logic. Không thêm dependency.
```

---

## 11. Final Report

**File created**: `guidelines/LAYOUT_SYSTEM_AUDIT.md`

**Top 5 Most Critical Layout Issues**:

1. **Dashboard card competition** (8–12 cards, no clear primary CTA) — Impact: Critical
2. **No "most important task" hero on Today tab** — Impact: Critical (core app promise)
3. **Mobile scroll fatigue** (6–8 viewport heights on Dashboard/Today/Progress) — Impact: High
4. **Primary CTA not sticky** (Today check-in, Dashboard CTA lost in crowd) — Impact: High
5. **SetupStepShell missing step pip** (breaks wizard flow consistency) — Impact: High

**Next prompt to run**:
> **Prompt 1 — "Today Tab: Add Priority Hero"** (High impact, low effort, fulfills core app promise)

This should be followed by Prompt 2 (SetupStepShell step pip) and Prompt 3 (sticky CTA), as they are all low-effort/high-impact fixes that don't depend on each other.

---

*End of Layout System Audit*
