# Color Usage Inventory

Date: 2026-05-05
Role: Design System Reviewer
Mode: QUOTA-SAFE — read-only, no code changes

---

## 1. Raw Color Classes — Top Occurrences

| Color class | Count (est.) | Used for |
|---|---|---|
| `slate-500` | ~120+ | Metadata, descriptions, secondary text |
| `slate-600` | ~90+ | Body text, headings, secondary actions |
| `slate-700` | ~60+ | Stronger text, card titles |
| `slate-200` | ~80+ | Borders, dividers |
| `slate-950` | ~40+ | Headings, high-contrast text |
| `slate-50/90` | ~30+ | Alert backgrounds, info panels |
| `slate-300` | ~25+ | Button borders (outline), dividers |
| `emerald-50` | ~15 | Success backgrounds |
| `emerald-600` | ~12 | Success text, CheckCircle icons |
| `emerald-100/200` | ~10 | Success surfaces, borders |
| `amber-50` | ~12 | Warning backgrounds |
| `amber-200` | ~10 | Warning borders |
| `amber-700` | ~10 | Warning text |
| `rose-50/200/700` | ~8 | Error states (being replaced) |
| `violet-50/200` | ~10 | Info/coaching surfaces |
| `violet-500/700` | ~8 | Info text, Sparkles icons |
| `white/82-94` | ~100+ | Card surfaces, glass panels |
| `primary` / `gradient-brand` | ~20+ | Primary CTAs, progress bars |

---

## 2. Files with Most Hardcoded Colors

| File | Raw color count | Notes |
|---|---|---|
| **Dashboard.tsx** | 259 | 8-12 cards, heavy `slate-200/80 bg-white/92 shadow-[...]` per card |
| **GoalTracker.tsx** | 97 | Task list items, status badges, progress indicators |
| **OrderStatusPage.tsx** | 63 | Status panels, order details, billing info |
| **BillingPlan.tsx** | 60 | Plan cards, pricing tables, feature lists |
| **ReflectionJournal.tsx** | 58 | Journal entries, mood indicators, prompts |
| **Onboarding.tsx** | 55 | Step indicators, form fields, CTA buttons |
| **OrderPage.tsx** | 45 | Order details, status badges |
| **AdminOrdersPage.tsx** | 35 | Order table, status filters |
| **VisionBoardEditor.tsx** | 31 | Canvas tools, layer panels |
| **LifeBalance.tsx** | 31 | Radar chart, life area cards |
| **VisionBoardGallery.tsx** | 27 | Gallery cards, preview thumbnails |
| **LifeInsight.tsx** | 27 | Insight cards, metric displays |
| **Achievements.tsx** | 24 | Achievement cards, progress badges |
| **12WeekSystem.tsx** | 11 | Today/Week tabs, task lists |
| **SMARTGoalSetup.tsx** | 4 | Mostly uses semantic tokens now |

---

## 3. Colors to Keep (Tokens / Semantic)

| Token | Value | Why keep |
|---|---|---|
| `--primary: #4f46e5` | Indigo-600 | Brand anchor, trusted by users |
| `--background: #f4f6fb` | Cool gray-blue | App background, calm feel |
| `--foreground: #141c2e` | Slate-950 | Default text, high contrast |
| `--card: rgba(255,255,255,0.82)` | White 82% | Card surfaces, glass effect |
| `--success: #059669` | Emerald-600 | Growth, forward motion |
| `--warning: #b45309` | Amber-700 | Guidance, not alarm |
| `--destructive: #dc2626` | Red-600 | Irreversible actions only |
| `--info: #7c3aed` | Violet-500 | Coaching, supportive insight |
| `--muted: rgba(234,237,245,0.9)` | Slate tint | Demo mode, metadata |
| `--border: rgba(148,163,184,0.18)` | Slate-300 18% | Default borders |
| `gradient-brand` | Violet→Pink→Blue | Primary CTAs, progress bars |

---

## 4. Colors to Replace with Semantic Tokens

| Current hardcoded | Replace with | Where to change |
|---|---|---|
| `emerald-50`, `emerald-100`, `emerald-200` | Use `var(--success-foreground)`, `var(--success-border)` via Badge `variant="success"` | `RootLayout.tsx`, `MetricsSummary.tsx`, `GoalArchetypeExamples.tsx`, `NewUserGuide.tsx`, `FeedbackDialog.tsx` |
| `emerald-600`, `emerald-700` | Use `text-[color:var(--success)]` or Badge `variant="success"` | `MetricsSummary.tsx`, `ExecutionScoreCard.tsx`, `WeeklyProgressChart.tsx`, `GoalProgressCard.tsx` |
| `amber-50`, `amber-200`, `amber-700` | Use `var(--warning-foreground)`, `var(--warning-border)` via Badge `variant="warning"` | `RootLayout.tsx`, `Dashboard.tsx`, `StreakCard.tsx`, `WeeklyProgressChart.tsx` |
| `rose-50`, `rose-200`, `rose-700` | Use `variant="destructive"` for errors, `variant="warning"` for coaching | `GoalArchetypeExamples.tsx`, `WeeklyProgressChart.tsx`, `MetricsSummary.tsx`, `RootLayout.tsx` |
| `violet-50`, `violet-200`, `violet-500/700` | Use `var(--info-foreground)`, `var(--info-border)` via Badge `variant="info"` | `GoalArchetypeExamples.tsx`, `GoalProgressCard.tsx`, `CoreFlowGateState.tsx`, `UpgradePaywallDialog.tsx` |
| `slate-500` (small text) | Use `--muted-foreground: #475569` (already updated) | All files — ensure 12px+ text uses `text-muted-foreground` |
| `bg-white/78`, `bg-white/82`, `bg-white/92` | Keep for cards, but use `bg-card` or `--card` reference | Every page — consider `bg-[color:var(--card)]` for consistency |

---

## 5. Top 10 Places to Polish Colors First

Priority order based on user traffic + coaching impact:

### 5.1 Dashboard (259 raw colors)
- **Current**: 8-12 white cards with `border-slate-200/80 bg-white/92 shadow-[...]` — all look identical
- **Polish**: Use `variant="success"` Badge for completion stats. Use `variant="warning"` Badge for review-due. Add `gradient-border` hero card (already done). Replace hardcoded `emerald-600` text with semantic token.
- **Why first**: Highest traffic, most cards competing for attention.

### 5.2 SMARTGoalSetup (4 raw colors — already clean)
- **Current**: Mostly uses semantic tokens now. Some `rose-700` for weak dimensions.
- **Polish**: Replace remaining `rose-*` with `variant="warning"` (amber) for weak dimensions. Use `variant="info"` (violet) for archetype examples.
- **Why**: Core funnel, coaching tone matters most here.

### 5.3 FeasibilityCheck (~20 raw colors)
- **Current**: `amber-700` for borderline, `rose-700` for "too ambitious"
- **Polish**: Use `variant="warning"` for borderline. Use `variant="info"` for "try this" suggestions. Remove `rose-*` entirely (not destructive action).
- **Why**: Feasibility is guidance, not judgment.

### 5.4 12WeekSetup (~15 raw colors)
- **Current**: CheckCircle green for strong, AlertTriangle for weak
- **Polish**: Use `variant="success"` for strong dimensions. Use `variant="warning"` for weak (not red). Add `variant="info"` for archetype-fit hints.
- **Why**: Review step is where users commit.

### 5.5 12WeekSystem — Today Tab (~30 raw colors)
- **Current**: Red for overdue, green for completed, amber for at-risk
- **Polish**: Use `variant="warning"` for overdue (gentle nudge). Use `variant="success"` for completed. Use `variant="info"` for "insight of the day".
- **Why**: Daily interaction, tone must be supportive.

### 5.6 12WeekSystem — Week Tab (~20 raw colors)
- **Current**: Similar to Today tab, task list with status colors
- **Polish**: Same as Today tab — replace hardcoded status colors with semantic Badge variants.
- **Why**: Users visit weekly to plan.

### 5.7 12WeekSystem — Progress Tab (~15 raw colors)
- **Current**: Progress bars with hardcoded emerald/amber/rose thresholds
- **Polish**: Use `variant="success"` / `variant="warning"` / `variant="destructive"` based on score ranges. Consider adding `--success-bg`, `--warning-bg` CSS vars for Progress component.
- **Why**: Visual progress = motivation.

### 5.8 GoalTracker (97 raw colors)
- **Current**: Heavy use of `slate-*` for task list, `emerald-*` for completed, `amber-*` for at-risk
- **Polish**: Replace status Badges with semantic variants. Use `text-muted-foreground` for metadata instead of `slate-500`.
- **Why**: Most-used feature after Dashboard.

### 5.9 BillingPlan (60 raw colors)
- **Current**: Plan cards with `slate-*` text, `gradient-brand` CTAs
- **Polish**: Use `variant="info"` for premium badges. Replace hardcoded `violet-600` text with `text-[color:var(--info)]`.
- **Why**: Revenue impact, but lower coaching tone priority.

### 5.10 Settings / LifeBalance (~30 raw colors each)
- **Current**: `slate-*` heavy, some `emerald-*` for scores
- **Polish**: Low priority — mostly informational pages. Use `text-muted-foreground` for metadata.
- **Why**: Lowest traffic of the top 10.

---

## 6. Next Small Prompt

```
QUOTA-SAFE MODE.

Bạn là frontend engineer.

Nhiệm vụ: Thay thế hardcoded color classes bằng semantic tokens trong các file:

1. Dashboard.tsx:
   - Thay tất cả `text-emerald-600` → dùng Badge variant="success"
   - Thay `border-amber-200 bg-amber-50` → dùng Badge variant="warning"
   - Thay `text-slate-500` (12px) → `text-muted-foreground`

2. GoalTracker.tsx:
   - Thay status badges → Badge variant="success" / "warning" / "destructive"
   - Thay `text-slate-500/600` metadata → `text-muted-foreground`

3. SMARTGoalSetup.tsx:
   - Thay `rose-700` (weak) → Badge variant="warning"
   - Thay archetype examples → Badge variant="info"

4. FeasibilityCheck.tsx:
   - Thay `amber-700` → Badge variant="warning"
   - Thay `rose-700` → Badge variant="info" (suggestions)

5. Chạy npm run typecheck.
6. Chạy npm run build.
7. Không sửa theme.css hay component ui.
8. Không chạy test suite.
```

---

## 7. Summary

| Aspect | Decision |
|---|---|
| **Keep as-is** | `--primary`, `--success`, `--warning`, `--destructive`, `--info`, `gradient-brand` |
| **Replace** | Hardcoded `emerald-*`, `amber-*`, `rose-*`, `violet-*` with Badge variants |
| **Reduce** | `slate-500` for 12px+ text → `text-muted-foreground: #475569` |
| **First target** | Dashboard.tsx (259 raw colors, highest traffic) |
| **Method** | Use existing Badge `variant="success|warning|info|destructive"` — no new variants needed |
| **Avoid** | Changing `--primary`, `gradient-brand`, per-route `--tone-*` palettes |
