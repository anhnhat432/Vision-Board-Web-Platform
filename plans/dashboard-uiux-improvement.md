# Dashboard UI/UX Improvement — Calm Productivity Refinement

## Context

The dashboard (`Dashboard.tsx` + 10 card components in `src/features/dashboard/v2/`) has accumulated significant UI/UX debt:

- **Dark mode invisibility**: 5 cards use `bg-white/70 dark:bg-neutral-900/10` — near-invisible on a `#1C1A15` dark surface.
- **Invalid Tailwind colors**: `neutral-850`, `neutral-450`, `rose-450`, `emerald-450`, `amber-450` don't exist in Tailwind's default palette — silently render as transparent.
- **Raw color leakage**: 7 cards bypass the design token system with raw `emerald-*`, `amber-*`, `rose-*`, `purple-*` Tailwind utilities and hardcoded hex gradients (`to-[#5ba590]`).
- **Over-decoration**: Grid overlays + ambient glow blurs on every data card create visual noise that contradicts the "Calm Productivity" aesthetic defined in `docs/DESIGN_OVERHAUL_MASTER.md` §5.7.
- **Inconsistent standards**: Mixed radii (`rounded-3xl`, `rounded-[18px]`, `rounded-2xl`), heading typography, and pin styling across cards.
- **Wired-but-unused greeting**: `getDashboardGreeting()` computes a time-of-day greeting, but `DashboardHero` hardcodes "Chào tuần mới".
- **Dimming wrappers**: `DashboardActiveLayout` wraps cards in `opacity-85/90/95` divs that arbitrarily dim content.
- **Filler image**: A `study_desk_hero.png` decorative image sits inside the analytics section adding visual clutter.

**Goal**: Full token migration, fix all dark-mode visibility bugs, de-clutter visual noise, standardize card chrome, and thread the computed greeting — while preserving every test invariant and the signature pinboard character.

## Test Invariants (MUST preserve)

From `Dashboard.active-system.test.tsx`:
1. **DOM order**: Hero(`dashboard-primary-action-card`) → Today("Việc hôm nay") → Goals("Mục tiêu chu kỳ") → "Phân tích & nhịp độ" collapsible → Rhythm("Nhịp tuần 1") → Trend("Đường 12 tuần")
2. **Collapsible behavior**: Desktop default open, mobile default closed; localStorage key `visionboard_dashboard_secondary_insights_open`; button labels "Mở phân tích" / "Thu gọn"
3. **testids**: `dashboard-primary-action-card`, `dashboard-kpi-row` must remain; `dashboard-main-card` must NOT exist
4. **Balance text**: "Sức khoẻ" must render; heading "Cân bằng cuộc sống" must exist
5. **Tour IDs**: `data-tour-id="dashboard-next-card"`, `data-tour-id="dashboard-plan-card"`, `data-tour-id="dashboard-start-card"` must remain

## Task Breakdown

### Task 1: DashboardHero.tsx — Token migration + greeting prop

**File**: `src/features/dashboard/v2/DashboardHero.tsx`

Changes:
- Add `greeting?: string` to `DashboardHeroProps` interface
- Replace hardcoded `"Chào tuần mới"` with `{greeting ?? "Chào tuần mới"}`
- **Outer section bg**: `from-emerald-50/60 via-white to-amber-50/30 dark:from-neutral-950 dark:via-neutral-950 dark:to-emerald-950/10` → `bg-[var(--grad-surface)]`
- **Outer section border**: `border-emerald-100/50 dark:border-neutral-800/80` → `border-app-line`
- **Week badge border/bg**: `border-emerald-100/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-900/85` → `border-app-line bg-app-surface`
- **Name span color**: `text-amber-600 dark:text-amber-400` + `decoration-amber-400/60` → `text-app-accent` + `decoration-app-accent/40`
- **Subtitle text**: `text-neutral-500 dark:text-neutral-400` → `text-app-ink-muted`
- **Quote banner**: `border-amber-500/50 bg-amber-500/5` + `text-amber-800 dark:text-amber-400` → `border-app-accent/40 bg-app-accent-subtle` + `text-app-ink-soft`
- **Featured goal text**: `text-neutral-800 dark:text-neutral-200` → `text-app-ink`
- **CTA button text**: `text-white` → `text-[var(--app-ink-on-accent)]` (token gap: `--app-ink-on-accent` not in `@theme inline` bridge)
- Remove `select-none` from outer section (allows text selection)
- **Update call site** in `Dashboard.tsx` (~line 892): add `greeting={dashboardGreeting}` prop. This requires threading `dashboardGreeting` through `DashboardActiveLayout` props.

### Task 2: TodayMiniCard.tsx — Token migration + de-clutter

**File**: `src/features/dashboard/v2/TodayMiniCard.tsx`

Changes:
- **Card bg**: `bg-white/75 dark:bg-neutral-900/75` → `bg-app-surface`
- **Custom shadow**: `shadow-[0_16px_40px_-12px_rgba(47,93,80,0.04),0_4px_12px_-6px_rgba(0,0,0,0.01)]` → `shadow-app-sm`
- **Hover shadow**: `shadow-[0_20px_48px_-12px_rgba(47,93,80,0.06)]` → `shadow-app-md`
- **Remove**: Grid pattern overlay div (lines 22-23)
- **Remove**: Ambient glow mesh div (lines 25-26)
- **Keep**: Pin emoji (standardize class to `hidden sm:inline absolute -top-3 left-6 text-base opacity-70 select-none cursor-default z-10`)
- **Header gradient**: `from-app-accent-soft/20 via-app-accent-soft/5 to-transparent` → `bg-app-accent-subtle` (solid, calmer)
- **Quote text**: `text-neutral-500 dark:text-neutral-400` → `text-app-ink-muted`
- **Streak indicator**: `text-emerald-600 dark:text-emerald-400` + `bg-emerald-500` → `text-app-status-success` + `bg-app-status-success`
- **Task item bg**: `bg-white/40 dark:bg-neutral-950/20` → `bg-app-bg-subtle`; hover → `bg-app-surface`
- **Task completed icon**: `text-emerald-600 dark:text-emerald-400` → `text-app-status-success`
- **Task incomplete icon**: `text-neutral-300 dark:text-neutral-700` → `text-app-ink-disabled`
- **Task completed text**: `text-neutral-400 line-through opacity-60` → `text-app-ink-muted line-through opacity-60`
- **Task incomplete text**: `text-neutral-800 dark:text-neutral-200` → `text-app-ink`
- **Empty state**: `bg-neutral-100 dark:bg-neutral-800` → `bg-app-bg-subtle`; `text-neutral-400` → `text-app-ink-muted`
- **Link button**: `bg-white dark:bg-neutral-900` + `text-neutral-700 dark:text-neutral-300` → `bg-app-surface` + `text-app-ink-soft`
- Remove `select-none` from section

### Task 3: ActiveGoalsCard.tsx — Fix dark-mode bg + migrate hex gradients

**File**: `src/features/dashboard/v2/ActiveGoalsCard.tsx`

Changes:
- **Card bg**: `bg-white/70 dark:bg-neutral-900/10` → `bg-app-surface`
- **Custom shadow**: `shadow-[0_4px_24px_rgba(0,0,0,0.005)]` → `shadow-app-sm`
- **Remove**: Grid pattern overlay (lines 62-63)
- **Remove**: Ambient glow mesh (lines 65-66)
- **Standardize pin**: same standard pin class
- **Header border**: `border-neutral-200/50 dark:border-neutral-800/55` → `border-app-line`
- **Subheading text**: `text-neutral-500` → `text-app-ink-muted`
- **Add button**: `bg-white dark:bg-neutral-900` + `text-app-accent` → `bg-app-surface` + `text-app-accent`; disabled: `bg-neutral-100 text-neutral-400` → `bg-app-bg-subtle text-app-ink-disabled`
- **Goal card bg**: `bg-white/70 dark:bg-neutral-950/20` → `bg-app-bg-subtle`; hover → `bg-app-surface`
- **Goal icon container**: `bg-neutral-50 dark:bg-neutral-900` → `bg-app-bg-subtle`
- **Goal title**: `text-neutral-800 dark:text-neutral-200` → `text-app-ink`
- **Goal meta**: `text-neutral-500` → `text-app-ink-muted`
- **Progress bar gradient**: `from-app-accent to-[#5ba590] dark:from-[#3a6e60] dark:to-[#5ba590]` → `bg-app-accent` (solid, calmer)
- **Accent glow line**: `from-app-accent/40 to-emerald-500/20` → `from-app-accent/40 to-app-accent/10`
- **Keep tilts**: `-rotate-[0.5deg]` etc. (pinboard character, per user preference)
- Remove `select-none` from section

### Task 4: WeekRhythmCard.tsx — Fix invalid colors + dark-mode bg

**File**: `src/features/dashboard/v2/WeekRhythmCard.tsx`

Changes:
- **KPI card bg** (all 4 in `KPI_CARD_STYLES`): `bg-white/70 dark:bg-neutral-950/30` → `bg-app-surface`; fix `dark:border-neutral-850/60` → `dark:border-app-line` (`neutral-850` is invalid)
- **KPI card hover bg**: `hover:bg-white dark:hover:bg-neutral-950/80` → `hover:bg-app-accent-subtle`
- **KPI icon bg**: `bg-neutral-50 dark:bg-neutral-900` → `bg-app-bg-subtle`
- **Card outer bg**: `bg-white/70 dark:bg-neutral-900/10` → `bg-app-surface`
- **Custom shadow**: → `shadow-app-sm`
- **Remove**: Grid pattern overlay (lines 228-229)
- **Remove**: Ambient glow mesh (lines 231-232)
- **Standardize pin**: same standard pin class
- **Header border**: `border-neutral-200/50 dark:border-neutral-800/55` → `border-app-line`
- **Subheading text**: `text-neutral-500` → `text-app-ink-muted`; `text-neutral-700 dark:text-neutral-300` → `text-app-ink`
- **KPI caption text**: `text-neutral-400` → `text-app-ink-muted`
- **KPI value text**: `text-neutral-800 dark:text-neutral-200` → `text-app-ink`
- **KPI subline text**: `text-neutral-400` → `text-app-ink-muted`
- **Check-in dots panel**: `bg-white/60 dark:bg-neutral-900/20` → `bg-app-bg-subtle`
- **Check-in dot colors**: `bg-neutral-200/60 dark:bg-neutral-800` → `bg-app-ink-disabled`; `bg-neutral-200 dark:bg-neutral-800` → `border-app-line`
- **Day bar empty**: `bg-neutral-100 dark:bg-neutral-900` → `bg-app-bg-subtle`
- **Day bar today fill**: `from-app-accent to-[#5ba590]` → `bg-app-accent` (solid); remove `animate-pulse`
- **Day bar completed fill**: `from-app-accent/80 to-[#5ba590]/90` → `bg-app-accent`; `from-app-accent/40 to-[#5ba590]/40` → `bg-app-accent/40`
- **Day label text**: `text-neutral-400` / `text-neutral-500` → `text-app-ink-muted`
- **Daily rhythm subheading**: `text-neutral-500` → `text-app-ink-muted`
- Remove `select-none` from section
- **PRESERVE**: `data-testid="dashboard-kpi-row"`, heading "Nhịp tuần {safeWeek}"

### Task 5: TwelveWeekTrendCard.tsx — Fix radius + heading typography

**File**: `src/features/dashboard/v2/TwelveWeekTrendCard.tsx`

Changes:
- **Card radius**: `rounded-[18px]` → `rounded-card`
- **Heading typography**: `text-base font-bold` → `text-xs font-bold uppercase tracking-[0.2em]` (match standard section heading pattern)
- **Heading text**: already `text-app-ink` (good)
- **Tooltip bg**: `bg-white dark:bg-neutral-900` → `bg-app-surface`
- **Early-state overlay**: `bg-white/95 dark:bg-neutral-900/95` → `bg-app-surface/95`; remove `animate-pulse` from emoji
- **Early-state text**: `text-neutral-800 dark:text-neutral-200` → `text-app-ink`; `text-neutral-500` → `text-app-ink-muted`

### Task 6: BalanceCard.tsx — Replace AREA_STYLES with life-area CSS-var tokens

**File**: `src/features/dashboard/v2/BalanceCard.tsx`

Changes:
- **Replace `AREA_STYLES` map** with a label→CSS-variable mapping:
  ```typescript
  const AREA_ACCENT_VARS: Record<string, string> = {
    "Sức khoẻ": "var(--color-health-accent)",
    "Sức khỏe": "var(--color-health-accent)",
    "Sự nghiệp": "var(--color-career-accent)",
    "Mối quan hệ": "var(--color-relationships-accent)",
    "Tinh thần": "var(--color-personal-growth-accent)",
  };
  const FALLBACK_ACCENT = "var(--app-accent)";
  ```
- **Card bg**: `bg-white/70 dark:bg-neutral-900/10` → `bg-app-surface`
- **Custom shadow**: → `shadow-app-sm`
- **Remove**: Grid pattern overlay (lines 57-58)
- **Standardize pin**: same standard pin class
- **Header border**: `border-neutral-200/50 dark:border-neutral-800/55` → `border-app-line`
- **Subheading text**: `text-neutral-500` → `text-app-ink-muted`
- **Row item hover bg**: `hover:bg-white/50 dark:hover:bg-neutral-950/20` → `hover:bg-app-accent-subtle`
- **Row label**: `text-neutral-600 dark:text-neutral-400` → `text-app-ink-soft`; hover → `text-app-ink`
- **Score text**: Fix `text-neutral-450` (invalid) → `text-app-ink-soft`; hover → `text-app-ink`
- **Bar track**: `bg-neutral-100 dark:bg-neutral-800` → `bg-app-bg-subtle`
- **Bar fill**: Replace gradient `${style.gradient}` with inline `style={{ width: `${score * 10}%`, backgroundColor: accentVar }}`
- **Icon container**: Use inline `style={{ backgroundColor: `${accentVar}20`, borderColor: `${accentVar}30` }}` for tinted bg; icon color via `style={{ color: accentVar }}`
- Remove `select-none` from section
- **PRESERVE**: heading "Cân bằng cuộc sống", "Sức khoẻ" label text

### Task 7: QuoteBlock.tsx — Fix invisible bg + reduce tilt

**File**: `src/features/dashboard/v2/QuoteBlock.tsx`

Changes:
- **Card bg**: `bg-white/40 dark:bg-neutral-900/10` → `bg-app-surface`
- **Border**: `border-neutral-200/80 dark:border-neutral-800/85` → `border-app-line`
- **Custom shadow**: → `shadow-app-sm`
- **Reduce tilt**: `-rotate-[1.5deg]` → `-rotate-[0.5deg]` (subtler, per user preference)
- **Quote text**: `text-neutral-600 dark:text-neutral-400` → `text-app-ink-soft`
- **Divider lines**: `bg-neutral-200 dark:bg-neutral-800` → `bg-app-line`
- Remove `select-none` from card (allow quote selection)

### Task 8: DailyStoicCard.tsx — Migrate front face to tokens, re-tone back

**File**: `src/features/dashboard/v2/DailyStoicCard.tsx`

**DO NOT touch any JS logic** (flip state, localStorage, save handler).

Changes to **card back** (initially visible):
- **Back bg gradient**: `from-amber-950 via-neutral-900 to-amber-950` → use `var(--grad-aspire)` via inline style (forest green, matching Execution context — NOT warm/amber which is reserved for Reflection)
- **Back border**: `border-amber-900/30` → `border-app-accent/30`
- **Back text colors**: All `text-amber-*` → `text-[var(--app-ink-on-accent)]` with opacity variants
- **Corner decorations**: `border-amber-300/20` → `border-[var(--app-ink-on-accent)]/20`
- **Icon circle**: `border-amber-200/20 bg-amber-900/30` → `border-[var(--app-ink-on-accent)]/20 bg-[var(--app-ink-on-accent)]/10`
- **Remove** `animate-pulse` from Sparkles icon
- **Remove** `animate-spin` from dashed border circle
- **Bookmark icon**: `text-amber-400` → `text-[var(--app-ink-on-accent)]`
- **STOIC WISDOM label**: `text-amber-200` → `text-[var(--app-ink-on-accent)]/70`

Changes to **card front** (after flip):
- **Front bg**: `bg-white text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200` → `bg-app-surface text-app-ink`
- **Front border**: `border-neutral-200/80 dark:border-neutral-800/85` → `border-app-line`
- **Header border**: `border-neutral-200/80 dark:border-neutral-800/60` → `border-app-line`
- **Caption text**: `text-neutral-400` → `text-app-ink-muted`
- **Saved badge**: `text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/30` → `text-app-status-success bg-app-accent-soft border-app-accent/20`
- **Quote text**: `text-neutral-600 dark:text-neutral-400` → `text-app-ink-soft`
- **Question text**: `text-neutral-800 dark:text-neutral-200` → `text-app-ink`
- **Textarea**: `border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30` → `border-app-line bg-app-bg-subtle`; focus: `focus:bg-white dark:focus:bg-neutral-900` → `focus:bg-app-surface`; text: `text-neutral-800 dark:text-neutral-200` → `text-app-ink`; placeholder: `text-neutral-400` → `text-app-ink-muted`
- **Footer border**: `border-neutral-200/80 dark:border-neutral-800/80` → `border-app-line`
- **Save button (saved state)**: `bg-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-600 border-neutral-200 dark:border-neutral-800` → `bg-app-bg-subtle text-app-ink-disabled border-app-line`
- **Save button (active state)**: `bg-emerald-700 text-white hover:bg-emerald-800` → `bg-app-accent text-[var(--app-ink-on-accent)] hover:bg-app-accent-hover`
- Remove `select-none` from outer div

### Task 9: Dashboard.tsx — Thread greeting, refactor NextBestAction, remove dimming + filler

**File**: `src/app/pages/Dashboard.tsx`

Changes:

**9a. Thread greeting prop through DashboardActiveLayout**:
- Add `greeting: string` to `DashboardActiveLayout` props interface
- Pass `greeting={dashboardGreeting}` from `Dashboard` component (line ~650) to `DashboardActiveLayout`
- Pass `greeting={greeting}` from `DashboardActiveLayout` to `DashboardHero` (line ~892)

**9b. Refactor NextBestAction to status tokens**:
- Replace raw color variables in NextBestAction with token-based approach:
  - Default (emerald): `border-l-app-accent`, `bg-app-accent-subtle text-app-accent`, icon `text-app-accent`, button `bg-app-accent text-[var(--app-ink-on-accent)] hover:bg-app-accent-hover`
  - Radar-missing (amber): `border-l-app-status-warning`, `bg-app-status-warning/10 text-app-status-warning`, button `bg-app-status-warning text-[var(--app-ink-on-accent)] hover:opacity-90`
  - Review (purple): `border-l-app-status-info`, `bg-app-status-info/10 text-app-status-info`, button `bg-app-status-info text-[var(--app-ink-on-accent)] hover:opacity-90`
  - Fix `amber-450` (invalid) → `app-status-warning`
- Replace `bg-white dark:bg-neutral-900` icon container → `bg-app-surface`
- Remove `animate-pulse` from icon
- Remove `select-none` from section
- Standardize pin to same standard class

**9c. Remove opacity dimming wrappers**:
- Remove `opacity-95 hover:opacity-100` wrapper around ActiveGoalsCard (line 939-944)
- Remove `opacity-90 hover:opacity-100` wrapper around WeekRhythmCard (line 998-1011)
- Remove `opacity-85 hover:opacity-100` wrapper around TwelveWeekTrendCard (line 1013-1015)
- Remove `opacity-95 hover:opacity-100` wrapper around BalanceCard (line 1019-1021)
- Remove `opacity-90 hover:opacity-100` wrapper around DailyStoicCard (line 1023-1025)
- Remove `opacity-90 hover:opacity-100` wrapper around QuoteBlock (line 1027-1029)
- Keep the `appear-fade-up` animation classes; just remove opacity dimming

**9d. Remove filler image**:
- Remove the `study_desk_hero.png` image block (lines 1031-1044) entirely — it adds visual clutter without functional value

## Files NOT Modified (already token-compliant)

- `src/features/dashboard/v2/ReflectionPrompt.tsx` — uses `app-warm-soft`, `app-warm` correctly
- `src/features/dashboard/v2/RescueAlert.tsx` — uses `app-status-warning` correctly
- `src/features/dashboard/v2/DashboardFooter.tsx` — already token-compliant
- `src/features/dashboard/v2/NewUserSetupView.tsx` — not in scope
- `src/features/dashboard/v2/PublicVisitorView.tsx` — not in scope

## Shared Standards Applied Across All Cards

| Element | Standard |
|---|---|
| Card outer radius | `rounded-card` (14px) |
| Inner sub-panel radius | `rounded-control` (11px) |
| Section heading | `text-xs font-bold uppercase tracking-[0.2em] text-app-ink-soft` |
| Pin (standard) | `hidden sm:inline absolute -top-3 left-6 text-base opacity-70 select-none cursor-default z-10` |
| Card shadow | `shadow-app-sm` (hover: `shadow-app-md`) |
| Card bg | `bg-app-surface` |
| Card border | `border-app-line` |
| Grid overlays | **Removed** from all data cards |
| Ambient glow blurs | **Removed** from all data cards |
| `select-none` on cards | **Removed** (allow text selection) |

## Risk Register

| # | Risk | Mitigation |
|---|---|---|
| 1 | Test DOM order breaks | No structural reordering — only className changes; test asserts document position of headings, not classes |
| 2 | `text-app-ink-on-accent` invalid | Use `text-[var(--app-ink-on-accent)]` — token not in `@theme inline` bridge |
| 3 | BalanceCard inline style breaks hover | Use CSS custom property in inline style + Tailwind transition on background-color |
| 4 | DailyStoicCard flip logic breaks | Only touching className/style strings, not JS state/handlers |
| 5 | `--grad-aspire` on Stoic card back too dark | Gradient has lighter endpoint `#5BA590`; text is `--app-ink-on-accent` (white in light, dark forest in dark) — meets contrast |
| 6 | Removing opacity wrappers changes visual weight | Intended — cards were being dimmed for no functional reason |
| 7 | Removing filler image leaves empty space | Grid auto-flows; BalanceCard + DailyStoicCard + QuoteBlock already fill the column |
| 8 | NextBestAction purple→info-blue shift | `--app-status-info` is `#3A6B9E` (light) / `#7AA8D9` (dark) — both meet contrast for text and button |

## Verification

Run in PowerShell (use `;` not `&&`):

```powershell
# 1. Dashboard-specific tests (must use vitest.ui.config.ts — not vitest.fast.config.ts)
npx vitest run --config vitest.ui.config.ts src/app/pages/Dashboard.active-system.test.tsx src/app/pages/Dashboard.test.tsx

# 2. Full UI test suite
npm run test:ui

# 3. Type check
npm run typecheck

# 4. Lint
npm run lint

# 5. Production build
npm run build
```

**Expected results**:
- All tests pass (DOM order, collapsible, testids, balance text all preserved)
- 0 type errors
- 0 new lint errors (existing 4 errors in other files are pre-existing)
- Build succeeds

If any test fails, the most likely cause is an accidentally removed testid or heading text — check the diff against the test invariants above.
