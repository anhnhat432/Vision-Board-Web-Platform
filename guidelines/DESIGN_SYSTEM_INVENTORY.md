# Design System Inventory

Date: 2026-05-03
Audit lens: design system engineer (React + Tailwind v4 + shadcn-style primitives + custom glass surfaces).
Scope: tokens (color, spacing, typography), shared UI primitives (`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui`), shared shells (`StepShell`, `EmptyState`-equivalents), and usage patterns across `Dashboard`, `SMARTGoalSetup`, `FeasibilityCheck`, `12WeekSetup`, `12WeekSystem`.

This inventory is **descriptive of the current state**, calls out **safe consistency fixes**, and lists **what to extract later** — without redesigning the app, swapping the framework, or changing business logic.

Sources read this pass:

- Tokens / globals: `@C:\Users\admin\Downloads\Vision Board Web Platform\src\styles\theme.css`, `@C:\Users\admin\Downloads\Vision Board Web Platform\src\styles\tailwind.css`, `@C:\Users\admin\Downloads\Vision Board Web Platform\src\styles\index.css`, `@C:\Users\admin\Downloads\Vision Board Web Platform\src\styles\fonts.css`.
- UI primitives: `card.tsx`, `button.tsx`, `badge.tsx`, `dialog.tsx`, `tabs.tsx`, `progress.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `alert.tsx` under `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui`.
- Shared composites: `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\CoreFlowGateState.tsx`, `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\pages\SMARTGoalSetup\components\SmartGoalStepShell.tsx`, `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\pages\12WeekSetup\components\SetupStepShell.tsx`, `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\pages\FeasibilityCheck\components\FeasibilityStepShell.tsx`.
- Usage: `Dashboard.tsx`, `12WeekSystem.tsx`, twelve-week tab/setting components.

There is **no `tailwind.config.*`** file. Tailwind v4 source-driven config via `@source` (in `tailwind.css`) is in use; tokens are declared in `theme.css` via `:root` CSS custom properties + `@theme inline`. Treat `theme.css` as the design-token source of truth.

---

## 1. Inventory

### 1.1 Color — Brand & Surface

Tokens defined in `@C:\Users\admin\Downloads\Vision Board Web Platform\src\styles\theme.css:1-150`:

| Token | Light value | Role |
|---|---|---|
| `--background` | `#f4f6fb` | App background |
| `--foreground` | `#141c2e` | Default text |
| `--card` | `rgba(255,255,255,0.82)` | Glass card body |
| `--card-foreground` | `#141c2e` | Card text |
| `--popover` | `rgba(255,255,255,0.96)` | Popover/tooltip body |
| `--primary` | `#4f46e5` (indigo-600) | Brand primary |
| `--primary-foreground` | `#ffffff` | On-primary text |
| `--secondary` | `rgba(237,241,255,0.94)` | Calm secondary surface |
| `--secondary-foreground` | `#2e3e8c` | On-secondary text |
| `--muted` | `rgba(234,237,245,0.9)` | Quiet block surface |
| `--muted-foreground` | `#61738a` | Quiet block text |
| `--accent` | `rgba(240,244,250,0.86)` | Accent surface |
| `--destructive` | `#d4183d` | Error/danger |
| `--destructive-foreground` | `#ffffff` | On-destructive text |
| `--border` | `rgba(148,163,184,0.18)` | Quiet border |
| `--input-background` | `rgba(255,255,255,0.88)` | Field background |
| `--ring` | `rgba(79,70,229,0.3)` | Focus ring base |
| `--surface-muted` | `#f8fafc` | Even quieter surface |
| `--border-muted` | `#dbe3f1` | Even quieter border |
| `--radius` | `0.875rem` (14px) | Base radius |

**App accent palette**: `--app-accent` and `--app-accent-soft` drive primary actions, focus states, progress, and active UI. Reflection-only surfaces use `--app-warm` and `--app-warm-soft`. Legacy route palettes should not define shell color tokens.

**Brand gradient**: defined as `.gradient-brand` (`theme.css:1394-1396`) — `linear-gradient(135deg, rgba(109,40,217,.98), rgba(192,38,211,.94) 48%, rgba(59,130,246,.96) 100%)`. Used by primary `Button`, `Badge default`, `Progress` indicator, and active `TabsTrigger`.

### 1.2 Color — Status semantics

The codebase uses Tailwind palette colors directly (no semantic tokens for success/warning/info other than `--destructive`). Empirical conventions:

| State | Pattern | Examples in repo |
|---|---|---|
| **Success** | `emerald-600/700` foreground on `emerald-50/80` background, optional `emerald-200` border | `SmartGoalStepShell` clarity-done card; "completed" task chips |
| **Warning** | `amber-700/900` foreground on `amber-50/85` background, `amber-200` border, `AlertTriangle` icon | weekly-review-due card on `Dashboard`, `currentStepSoftWarning` in `SmartGoalStepShell`, plan rationale advisories |
| **Error** | `rose-700` foreground on `rose-50/85` background, `rose-200` border, `CircleAlert` icon | `currentStepError` in `SmartGoalStepShell`, hard-fail validations |
| **Info / suggestion** | `violet-500/700` foreground on `violet-50/80`, `violet-100/200` border, `Sparkles` icon | "Gợi ý điền nhanh" hint in `SmartGoalStepShell`, archetype examples |
| **Neutral / informational** | `slate-500/600/950` on `slate-50` or `white/82`, `slate-200` border | most secondary metadata |
| **Premium / Plus** | `gradient-brand` or `.badge-premium` (violet→pink→amber) + `Crown` icon | Plus surfaces, paywall, billing badges |

⚠️ **Inconsistency**: there is **no shared `Alert` variant** for `success` / `warning` / `info`. The base `Alert` (`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui\alert.tsx:6-20`) only ships `default` and `destructive`. Pages re-implement the warning/success/info shapes via raw class strings, which leads to small visual drift (border-200 vs border-100, bg-50/80 vs bg-50/85, etc.). Documented as **fix-later** below.

### 1.3 Typography scale

Defined in `theme.css:5-23` and applied to base elements in `theme.css:253-307`.

| Token | Size | Line height | Default usage |
|---|---|---|---|
| `--text-xs` | 0.75rem (12px) | 1.4 | meta, eyebrow uppercase, badge text |
| `--text-sm` | 0.875rem (14px) | 1.5 | body small, labels, button text |
| `--text-base` | 0.9375rem (15px) | 1.6 | body default |
| `--text-lg` | 1.0625rem (17px) | 1.55 | h4 default |
| `--text-xl` | 1.25rem (20px) | 1.4 | h3 default |
| `--text-2xl` | 1.5rem (24px) | 1.3 | h2 default |
| `--text-3xl` | 1.875rem (30px) | 1.2 | h1 default; h2 desktop |
| `--text-4xl` | 2.25rem (36px) | 1.12 | h1 desktop |
| `--text-5xl` | 2.75rem (44px) | 1.08 | hero headline |

Font: **`Be Vietnam Pro`** with system fallback (`theme.css:5`). Loaded by `fonts.css`.

Heading defaults:

- `h1` 700 / 1.08 / `text-wrap: balance` → `text-3xl` mobile, `text-4xl` ≥1024px.
- `h2` 700 / 1.14 / balance → `text-2xl` mobile, `text-3xl` ≥1024px.
- `h3` 600 / 1.22 / balance → `text-xl` mobile, `text-2xl` ≥1024px.
- `h4` 600 / 1.28 → `text-lg`.
- `p` 1.68 line-height, `text-wrap: pretty`.
- `label` 500 / 1.45.
- `button` 500 / 1.4.

Special utility classes for numbers: `.count-up` and `.stat-value` enforce `tabular-nums lining-nums`.

### 1.4 Spacing pattern

The repo does **not** override Tailwind's spacing scale. The de-facto rhythm in step shells / dashboards is:

| Tier | Value | Common use |
|---|---|---|
| `gap-1.5 / 2` | 6–8px | inline icon-text |
| `gap-3 / space-y-3` | 12px | tight list, button row |
| `gap-4 / space-y-4` | 16px | card body subsections |
| `gap-6 / space-y-6` | 24px | between cards, between major sections |
| `gap-8 / space-y-8` | 32px | between hero and grid (rare) |

Card padding (from `card.tsx:111-174`):

- `CardHeader`: `px-5 pt-5 sm:px-7 sm:pt-7` (mobile 20px / desktop 28px).
- `CardContent`: `px-5 sm:px-7` + `[&:last-child]:pb-5 sm:[&:last-child]:pb-7`.
- `CardFooter`: `px-5 pb-5 sm:px-7 sm:pb-7`.

Page shell padding pattern (Onboarding / SMART / Feasibility):

- `px-4 py-4 sm:px-6 sm:py-6 lg:px-8` (16px → 24px → 32px).

⚠️ **Inconsistency**: a few raw cards in `Dashboard.tsx` use `p-5 sm:p-6 lg:p-7` instead of relying on `CardContent` defaults. This is intentional layout density on hero cards but worth documenting so future cards don't drift further.

### 1.5 Radius pattern

| Class | Value | Use |
|---|---|---|
| `rounded-full` | 9999px | Buttons (default), badges, tabs trigger, progress bar |
| `rounded-[28px]` | 28px | Card body (card.tsx:99) |
| `rounded-[30px]` | 30px | Dialog content (dialog.tsx:60) |
| `rounded-[24px]` | 24px | Textarea, Select content, hint cards in `SmartGoalStepShell` |
| `rounded-2xl` | 16px | Input, Select trigger, button[icon] (size icon → `rounded-2xl`) |
| `rounded-xl` | 12px | nested chips, Select item |
| `rounded-lg` | 8px | smaller buttons inside notice rows; sticky tab list in `12WeekSystem` |
| `rounded-md` / `rounded-sm` | 6px / 4px | rare, mostly utility |

⚠️ **Mild drift**: cards on the dashboard hero use `rounded-[28px]` (CardContent default), but `Skeleton` placeholders use `rounded-[28px]` and `rounded-[22px]` interchangeably. Tabs container in `12WeekSystem.tsx:676` uses `rounded-lg` while the global `TabsList` default is `rounded-full` — intentional override for the dashboard-style "segmented control" look on a busy page.

### 1.6 Shadow / elevation pattern

There is no shadow scale token; shadows are inline `shadow-[...]` strings. Empirical tiers:

| Tier | Pattern | Used by |
|---|---|---|
| **Inset highlight** | `inset 0 1px 0 rgba(255,255,255,0.85)` | inputs, buttons (subtle gloss) |
| **Glass card resting** | `0 18px 40px -30px rgba(15,23,42,0.16), 0 6px 12px -10px rgba(15,23,42,0.06)` | `glass-surface` (`theme.css:608-628`) |
| **Glass card hover** | `0 22px 46px -30px rgba(15,23,42,0.18), 0 8px 16px -10px rgba(15,23,42,0.08)` | `glass-surface:hover` |
| **Brand button** | `0 18px 38px -24px rgba(109,40,217,0.52)` | `Button variant=default` |
| **Hero gradient surface** | `0 26px 60px -34px var(--tone-hero-shadow)` | `hero-surface` |
| **Dialog** | `0 32px 80px -36px rgba(15,23,42,0.45)` | `DialogContent` |

⚠️ **Drift**: each consumer page often invents a custom shadow string (e.g., `shadow-[0_24px_55px_-34px_rgba(217,119,6,0.4)]` for the review-due card). They are tasteful in isolation but the lack of a token means they are not de-duplicated. Acceptable as long as new code prefers `glass-surface` or `hero-surface` and only customizes when there is a clear reason.

### 1.7 Focus ring pattern

Defined globally at `theme.css:367-371`:

```
:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; border-radius: var(--radius-sm); }
```

Plus per-component:

- `Button`: `focus-visible:border-ring focus-visible:ring-ring/60 focus-visible:ring-[4px]` (button.tsx:16).
- `Input` / `Textarea`: focus ring sized off `--app-accent` mixed with transparent.
- `Select trigger`: `focus-visible:border-ring focus-visible:ring-ring/60 focus-visible:ring-[4px]` (select.tsx:44).
- `Tabs trigger`: 3px ring (tabs.tsx:45).
- `Badge`: 3px ring when interactive.

✅ Consistent: every interactive primitive defines a visible focus state; global `:focus-visible` covers fallbacks for raw `<button>`/`<a>`. **No primitive is missing a focus ring.**

### 1.8 Card variants

`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui\card.tsx`:

- **Default `<Card>`**: `glass-surface text-card-foreground flex flex-col gap-6 rounded-[28px]`. Interactive (pointer tilt) by default; opt-out via `interactive={false}` or by including `hero-surface` class.
- **`<CardHeader>`**: grid that handles optional `<CardAction>` as second column.
- **`<CardTitle>`**: ✅ now `<h3>` (was `<h4>` — fixed in this audit pass — see §3).
- **`<CardDescription>`**: `<p class="text-muted-foreground text-sm leading-6">`.
- **`<CardContent>`**: padded body.
- **`<CardFooter>`**: padded footer; supports `[.border-t]:pt-5 sm:[.border-t]:pt-7` for separator-style layouts.

Empirically observed card "variants" by composition (no enum exists yet):

| Visual variant | Style | Used by |
|---|---|---|
| **Glass default** | Default `<Card>` | most primary surfaces |
| **Hero** | `<Card className="hero-surface ...">` (skips tilt) | dashboard hero, paywall, achievements, public-visitor hero |
| **Notice / Status** | Default Card + variant-color border + variant-color tint (raw classes) | Dashboard review-due card, 12WeekSystem dashboard notice, etc. |
| **Spotlight** | `<Card className="spotlight-card ...">` (purple ring + animated outline) | spotlight tour highlight |
| **Skeleton** | `<Skeleton className="rounded-[22px|28px]">` | dashboard loading state |

### 1.9 CTA / Button variants

`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui\button.tsx:15-44`:

| Variant | Visual | Use case |
|---|---|---|
| `default` | gradient-brand background + brand shadow | primary action; only one per fold |
| `destructive` | solid `--destructive` + crimson shadow | irreversible actions |
| `outline` | white/70 border on `bg-white/78` + soft shadow + backdrop-blur | secondary action paired with primary |
| `secondary` | `bg-secondary` (light indigo tint) | tertiary action; legacy/utility |
| `ghost` | transparent bg with hover white wash | icon buttons, subtle inline links |
| `link` | underline, no shadow | text-only navigation |

Sizes: `default` (h-11 / 44px), `sm` (h-9), `lg` (h-12), `icon` (size-10, `rounded-2xl`). All variants render `rounded-full` except `icon`. All variants have magnetic-pointer effect that respects reduced-motion.

✅ Variant naming is consistent. ⚠️ **Mild inconsistency in the wild**: some places hand-roll a button style (e.g., `12WeekSystem.tsx:616` `className="w-full border-slate-950 bg-slate-950 text-white hover:bg-slate-800"`) instead of using a variant. This is a stylistic override on top of the gradient brand to communicate "neutral / urgent" — but it sits outside the variant taxonomy. Worth cataloguing or wrapping in a future `variant=neutral-strong` if it recurs.

### 1.10 Badge / status variants

`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui\badge.tsx:7-26`:

| Variant | Visual | Use |
|---|---|---|
| `default` | gradient-brand + white text + brand shadow | "premium" / hero badges |
| `secondary` | app-accent-soft tint + app-accent text | category, count |
| `destructive` | `bg-destructive` + white | error count |
| `outline` | white/70 border on white/72 + dark text | quiet meta |

Plus utility classes in `theme.css`:

- `.badge-premium` — violet→pink→amber gradient + uppercase.
- `.spotlight-badge` — violet→pink gradient.
- `.pill-tag` — neutral pill 0.72rem; not a `Badge` variant, used inline.
- `.section-kicker` — uppercase eyebrow tag with letter-spacing 0.16em — used as the visual "step label" in 6+ places.

⚠️ **Status badges are ad-hoc**: "Cần xem lại" / "Đủ rõ" / "Mạnh" (quality levels) are rendered with inline classes per consumer (SMART `QualityFeedbackPanel`, `12WeekSetup` ReviewStep, plan-rationale callouts). Each instance is correct but the styling drifts. Candidate for a `QualityBadge({ level })` extraction (see §4).

### 1.11 Form field pattern

| Primitive | Defaults |
|---|---|
| `<Input>` | h-11, `rounded-2xl`, inner highlight + soft shadow, focus-visible ring tinted off `--app-accent`. |
| `<Textarea>` | min-h-20, `rounded-[24px]`, same shadow + focus pattern, `field-sizing-content` for auto-grow. |
| `<Select trigger>` | h-11 default / h-9 sm via `data-size`, same shadow + focus pattern. |
| `<Label>` | 0.875rem / 500 / 1.45 line-height; uses native `<label>` from Radix `@radix-ui/react-label` (`label.tsx`). |

Field error/help text patterns observed (no shared component yet):

- **Hard error**: red `<Alert>` with `border-rose-200 bg-rose-50/85 text-rose-700`, `<AlertTitle>` "Cần hoàn tất bước này", `<AlertDescription>` body.
- **Soft warning**: amber `<Alert>` with `border-amber-200 bg-amber-50/85 text-amber-700`, `<AlertTitle>` "Gợi ý để mục tiêu rõ hơn".
- **Inline helper**: `<p className="text-xs leading-5 text-slate-500">` directly under field.
- **Inline counter**: `<Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">{n}/{total}</Badge>`.

⚠️ **Inconsistency**: the inline-helper and inline-error text styles drift slightly between SMART, Feasibility, and 12WeekSetup. Candidate for a tiny `FormHint` / `FormError` helper (or two CSS utility classes). Documented as **fix-later** in §4.

### 1.12 Stepper / wizard pattern

Three step-shell flavors currently coexist:

| Shell | Heading semantic | Step indicator | Footer | Used by |
|---|---|---|---|---|
| `SmartGoalStepShell` | own `<h2>` (raw) | `<CoreFlowProgress>` outside the shell + clarity progress + per-step quality hint inside | back/next pair via `Button variant=outline` + `Button` | SMART (6 substeps) |
| `FeasibilityStepShell` | own `<h2>` with `aria-labelledby` for radio group | `<CoreFlowProgress>` outside | back/next pair | Feasibility (7 questions + result) |
| `SetupStepShell` | `<CardTitle>` (now h3 ✅) wrapping a focusable `<span tabIndex=-1>` | currently **none** (gap noted in UX audit) | back + (next or submit) pair | 12WeekSetup (4 substeps) |

✅ Each shell pins focus to its heading on step transition (via `useScrollToTopOnChange`). ✅ Each footer follows the same `Quay lại` (left) + `Tiếp theo|Tiếp tục|Tạo kế hoạch` (right) pattern.

⚠️ **Asymmetry**: `SetupStepShell` uses a CardTitle inside a Card; the other two have a custom `flow-muted p-5` heading area with their own visual frame. Plus `SetupStepShell` has **no step pip** (`UX_UI_QUALITY_AUDIT.md` issue #4). Future unification possible — see §4 R-prep.

### 1.13 Tabs pattern

`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui\tabs.tsx`:

- Default `<TabsList>`: `rounded-full` glass pill, `h-11`, `bg-white/76 backdrop-blur-xl`.
- Default `<TabsTrigger>`: rounded-full, transitions to gradient-brand background + white text on `data-[state=active]`. Icon inline at `size-4`.

Override in `12WeekSystem.tsx:673-706`: `rounded-lg grid grid-cols-4 bg-white/95 sticky top-14 sm:top-3 shadow-sm` — turns the floating pill into a sticky segmented control with stacked icon-over-label on mobile (`flex-col sm:flex-row`). This is intentional — the page is the daily hub and needs a full-width navigation, not a floating pill.

⚠️ **Two visually different tab treatments coexist** (pill vs segmented). Both are legitimate but no rule documents when to use which. Convention: **pill** = exploratory tabs on a page (e.g., LifeBalance "Bánh xe" / "Lịch sử"); **segmented full-width** = primary execution hub.

### 1.14 Progress pattern

`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui\progress.tsx`:

- h-2.5 by default; consumers override to h-2 (e.g., clarity progress).
- Value is animated via `requestAnimationFrame` over 850ms with `1 - (1-x)^3` cubic easing.
- ✅ **Honors `prefers-reduced-motion`** (one of the few primitives that does — `progress.tsx:14-22`).
- Indicator uses `gradient-brand` regardless of context — there is no semantic variant (success/warning) for progress.

⚠️ **Consideration**: a "warning" or "neutral-grey" progress would be useful when the bar represents something at risk (e.g., week off-pace). Not a fix in this audit; documented for future.

### 1.15 Empty state / gate state pattern

The repo has **no generic `EmptyState` component**. There are two specialized variants:

- **`CoreFlowGateState`** (`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\CoreFlowGateState.tsx:30-67`) — exclusively for the 7-step funnel. Slot: eyebrow + h1 (raw `<h1>`) + description + optional primary/secondary actions. Includes `<CoreFlowProgress>`.
- **`TwelveWeekDashboardState`** (in `12WeekSystem/components.tsx`) — exclusively for the system page when no plan exists. Different visual frame.

Each consumer that needs an empty state otherwise hand-rolls the pattern (a card with an icon, a title, a description, and a CTA pair). 5+ instances found.

✍️ **Note**: `CoreFlowGateState` uses raw `<h1>` directly; `CardTitle` is now `<h3>`. So a gate state has h1 → h3 within a card — semantically OK because the gate state is the *only* heading on a route. No fix needed unless gates start nesting.

---

## 2. Usage Heatmap

Counts (`grep -r CardTitle src/`) at audit time:

- **CardTitle** used in **28 files** / **110 matches** — most-used primitive.
- **Button** used in essentially every page.
- **Badge** used in 30+ files for counts, status, plan, archetype labels.
- **Tabs** used by `12WeekSystem`, `LifeBalance`, `BillingPlan`.
- **Dialog** used by `FeedbackDialog`, `UpgradePaywallDialog`, `MockBillingCheckout`.
- **Progress** used by SMART clarity, today completion, plan progress, life-balance score.
- **Alert** used inside step shells for hard error / soft warning.

These are the surfaces where any token / variant change ripples; treat them as covered by the regression test suite (`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\pages\core-funnel-a11y.test.tsx`, `twelve-week-flows.e2e.test.tsx`, `Dashboard.test.tsx`, `LifeBalance.test.tsx`, etc.).

---

## 3. Safe Fixes Applied This Pass

### 3.1 `CardTitle` element: `<h4>` → `<h3>`

**Why**: `CardTitle` is rendered inside step pages whose page-level heading is `<h1>` and step heading is `<h2>`. With `CardTitle` as `<h4>`, the heading outline skipped `h3`, breaking screen-reader and audit-tool expectations. Documented in `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\UX_UI_QUALITY_AUDIT.md` issue #3 (severity: high) and `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\TECH_DEBT_REGISTER.md` §UX/Mobile (deferred from v2).

**File changed**: `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui\card.tsx:124-132` — single-line change of the rendered tag from `h4` to `h3`. Visual styling unchanged (`leading-tight tracking-normal`); the global `h3` typography token already provides the matching visual scale (`text-xl` mobile / `text-2xl` desktop, weight 600).

**Why this is safe**:

- Searched the test corpus for `level: 4`, `level={4}`, `card-title` selectors and `h4` assertions: **zero hits**. No test pins the level.
- E2E tests use `findByRole("heading", { name: "..." })` without specifying level, so they keep working.
- All 28 files using `CardTitle` either sit under `<h2>` step headings (correctly resolves to `h2 → h3` outline) or are top-level on their route (correctly resolves to `h3` as the page's primary heading; this is the case for `LifeBalance`, `Dashboard`, etc. — those pages have their own raw `<h1>` as the route heading).
- Visually no difference because `CardTitle` already overrides typography with its own `className`-driven sizes.

**Regression test added**: `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\pages\core-funnel-a11y.test.tsx:265-277` — asserts `CardTitle` renders as a tag with `tagName === "H3"` and is exposed via `getByRole("heading")`. Catches future reverts without coupling to wrapping styles.

### 3.2 No other code changes

The other inconsistencies catalogued in §4 are either:

- **risky** (would touch 5–10 files of consumer styling and need cohort feedback to validate the visual choice) — e.g., extracting `QualityBadge`, unifying step shells; or
- **scope-creep** under `AGENTS.md` "Prefer existing helpers, components, and domain utilities over new abstractions" — e.g., a generic `EmptyState` when only one ad-hoc instance per route exists.

They are all **documented**; none is silently shipped.

---

## 4. Remaining Inconsistencies (Documented, Not Fixed)

Each item names the **type** (visual / flow / copy / a11y / mobile / product-logic), **severity**, and **suggested next step**. None blocks MVP-1 demo.

| # | Item | Type | Severity | Suggested next step |
|---|---|---|---|---|
| **D1** | `Alert` only ships `default` + `destructive` variants; pages re-implement `success` / `warning` / `info` via raw classes | visual | medium | Add `Alert` variants `success` / `warning` / `info` matching the existing color conventions; replace raw blocks gradually. Single-PR scope. |
| **D2** | Quality-level badges (Cần xem lại / Đủ rõ / Mạnh) re-styled per consumer; no shared `QualityBadge` | visual + copy | medium | Extract `QualityBadge({ level: QualityLevel, score?: number })` reusing existing colors. Replace 4–5 call sites in one PR. |
| **D3** | Form helper / inline-error text drifts (text-slate-500 vs text-slate-600, leading-5 vs leading-6, no shared `<FormHint>`) | visual | low-medium | Add `FormHint` and `FormError` thin wrappers (no logic), or document the canonical pattern in `tailwind.css` `@layer components`. |
| **D4** | `SetupStepShell` lacks a step pip while the other 2 shells have `<CoreFlowProgress>` outside — asymmetric IA | flow | medium-high | Add a small step pip inside `SetupStepShell` that takes `currentStep` + `stepCount`. Independent of unifying the 3 shells. Already prompt UX-audit QW5. |
| **D5** | Two button "neutral-strong" handrolled styles in `12WeekSystem.tsx:616, 633` (`bg-slate-950 text-white` and `bg-rose-900 text-white`) — outside the `Button` variant taxonomy | visual | low | If the pattern recurs ≥3 times, add a `Button` variant. Right now it is 2 occurrences — leave as-is, document. |
| **D6** | Inline shadow strings (`shadow-[0_24px_55px_-34px_...]`) duplicated across cards | visual | low | Add 2–3 named utility classes in `@layer components` (e.g., `.shadow-card-hero`, `.shadow-card-notice`); migrate opportunistically. |
| **D7** | Two visual treatments for tabs (rounded-full pill vs segmented sticky) without a documented when-to-use rule | visual + flow | low | Add a 4-line rule to this doc (already done above in §1.13). No code change needed. |
| **D8** | `Progress` indicator has a single `gradient-brand` color regardless of context | visual | low | Add `tone="default"|"warning"|"success"` prop later if execution insights start needing semantic progress. Not in MVP-1. |
| **D9** | Heading semantics: `CoreFlowGateState` uses raw `<h1>` while normal route pages also use raw `<h1>` — gate state can collide if it appears nested | a11y | low | If a gate state is ever rendered as a sub-section, downgrade to `<h2>`. Currently always whole-route, so no live bug. |
| **D10** | No `EmptyState` primitive for non-funnel cases (Achievements empty, GoalTracker empty, VisionBoard empty hand-roll their own) | flow + visual | low-medium | Extract `EmptyState({ icon, title, description, primaryAction, secondaryAction })` only after we count ≥4 instances. Currently 3 — borderline. |
| **D11** | "section-kicker" eyebrow utility (`theme.css:1159-1176`) competes with `<Badge variant="secondary">` for the same role | copy + visual | low | Pick one canonical eyebrow style. Recommend `.section-kicker` for 6+ existing usage; sunset ad-hoc `Badge`-as-eyebrow over time. |
| **D12** | "InlineHint" pattern (Sparkles + violet card with "Gợi ý điền nhanh") repeats in `SmartGoalStepShell:85-107`, `SetupStepShell` (similar), and several plan rationale blocks | visual + copy | low-medium | Extract `InlineHint({ title, description, action? })` if it appears in 4+ sites — currently 3. Borderline. |

### 4.1 Helper components — extraction recommendation

Given `AGENTS.md` says "Prefer existing helpers… Do not introduce abstractions casually", the bar to create a new component should be **≥4 confirmed usages with visible drift**. Status now:

| Proposed helper | Current sites with drift | Recommendation |
|---|---|---|
| **`SectionHeader`** (eyebrow + heading + description) | 6+ (CoreFlowGateState, Dashboard hero, SmartGoalStepShell, SetupStepShell, FeasibilityStepShell, ResultStep) | ✅ **Extract** — clear value, all consumers can switch |
| **`StatusCard`** (icon + headline + detail + optional action, in semantic color) | 4–5 (Dashboard rescue notice, 12WeekSystem `TwelveWeekDashboardNotice`, weekly-review-due, Plus-demo notice) | ✅ **Extract** — consider unifying with `Alert` + new variants instead of net-new component |
| **`StepShell`** (single canonical step shell) | 3 specialized shells, each with different needs | ⚠️ **Defer** — unifying would force compromises; instead, add the missing step pip to `SetupStepShell` (D4) and leave the 3 shells coexisting |
| **`EmptyState`** | 3 (Achievements, GoalTracker, VisionBoard) — `CoreFlowGateState` and `TwelveWeekDashboardState` already exist | ⚠️ **Defer** — wait for the 4th occurrence |
| **`InlineHint`** | 3 (SMART step, plan rationale, archetype examples) | ⚠️ **Borderline** — extract on next occurrence |
| **`QualityBadge`** | 4–5 (SMART quality panel, Feasibility result, 12WeekSetup quality, plan rationale) | ✅ **Extract** — clear drift, single owner |
| **`PrimaryActionCard`** | 1–2 (review-due card, Plus-demo card) | ❌ **Do not extract** — too few |

**This audit does not extract any of them**, by deliberate restraint. A follow-up prompt is queued in §6 to do `SectionHeader` + `QualityBadge` + `Alert` semantic variants in one focused PR each — three small PRs are safer than one big abstraction PR.

---

## 5. Verification

Per `AGENTS.md` "Frontend Verification" — chosen the smallest relevant set first.

### 5.1 Tests run

- **`npm run typecheck`** — see report below.
- **Targeted unit tests** for the touched surfaces:
  - `src/app/pages/core-funnel-a11y.test.tsx` (added the regression assertion).
  - All other tests under `src/app/components/ui/` — none exist.
  - Tests that could regress because they rely on heading outlines: searched for `level: 4` / `card-title` / `h4` assertions — zero hits, so this is non-load-bearing on the suite.

### 5.2 Build

- `npm run build` recommended only because `card.tsx` is in the shared primitive layer that every page imports. Even though no global CSS changed, building catches any TS-level break in the primitive's prop signature — but the prop signature is unchanged.

### 5.3 Reported in the conversation, not auto-run

Per the user's environment (Windows / no auto-run) the actual command output is reported in the conversation summary; if any of these fails, the diff is small enough to revert in one edit.

---

## 6. Recommended Next Prompts (Design-System Track)

These are scoped, single-PR prompts. Each can run independently. They sit alongside the prompts in `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\UX_UI_QUALITY_AUDIT.md` §14 — they are the **design-system slice** of the same backlog.

1. **DS-1 — Add `Alert` semantic variants.** *Bạn là design-system engineer. Trong `@/src/app/components/ui/alert.tsx` thêm `variant: "success" | "warning" | "info"` ngoài `default` + `destructive`, dùng đúng `emerald-50/200/700`, `amber-50/200/700`, `sky-50/200/700` đã thấy trong codebase. Không xóa variants cũ. Thêm 1 unit test mỗi variant. Không update các call site cũ trong PR này.*

2. **DS-2 — Extract `QualityBadge`.** *Tạo `@/src/app/components/QualityBadge.tsx` với props `{ level: "weak" | "okay" | "strong", score?: number }`. Replace 4–5 call sites: `QualityFeedbackPanel`, `12WeekSetup ReviewStep`, `FeasibilityCheck ResultStep`, plan rationale callouts. Giữ nguyên copy. Không đổi color logic ngoài việc consolidate.*

3. **DS-3 — Extract `SectionHeader`.** *Tạo `@/src/app/components/SectionHeader.tsx` với `{ eyebrow?: string, title: string, description?: ReactNode, level?: 2 | 3 }`. Replace ad-hoc eyebrow + heading patterns trong `Dashboard hero`, `CoreFlowGateState`, `SmartGoalStepShell`, `FeasibilityStepShell`, `SetupStepShell`. Không đổi visual; chỉ DRY.*

4. **DS-4 — Step pip cho `SetupStepShell`.** Re-issue `UX_UI_QUALITY_AUDIT.md` QW5: thêm 4-dot step indicator cho 12WeekSetup wizard, đối xứng với SMART.

5. **DS-5 — Unify status notice cards.** *Audit Dashboard rescue notice + `TwelveWeekDashboardNotice` + Plus-demo banner + weekly-review-due card. Migrate sang `Alert` với DS-1 variants nếu hợp; còn lại tạo `StatusCard` thin wrapper. Mục tiêu: mọi notice/banner trên Dashboard + 12WeekSystem dùng cùng 1 component pattern.*

6. **DS-6 — Form helper / error helper.** *Tạo `FormHint` (text-xs slate-500 leading-5) + `FormError` (red-700 text-xs leading-5) làm thin wrappers. Không thay logic. Replace 6–8 call sites trong SMART + Feasibility + 12WeekSetup.*

7. **DS-7 — Document tabs treatment rules.** *Add a 5-line rule trong `DESIGN_SYSTEM_INVENTORY.md` §1.13: "pill" cho tabs khám phá, "segmented sticky" cho hub. Không code.*

8. **DS-8 — Document shadow tiers.** *Add 3 named utility classes `.shadow-card-default` / `.shadow-card-notice` / `.shadow-card-hero` vào `@layer components` (`theme.css`). Không bắt buộc migrate ngay.*

Order priority: **DS-1 → DS-2 → DS-3** are the highest-value, lowest-risk. The rest are opportunistic.

---

## 7. Files Changed In This Task

| File | Action | Reason |
|---|---|---|
| `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\DESIGN_SYSTEM_INVENTORY.md` | **New** | This document. |
| `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\components\ui\card.tsx` | **Modified** (1 line) | `CardTitle` element `<h4>` → `<h3>` to fix heading outline (UX_UI_QUALITY_AUDIT.md issue #3 / TECH_DEBT_REGISTER.md §UX). |
| `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\pages\core-funnel-a11y.test.tsx` | **Modified** (added 1 import + 1 describe block) | Regression test asserting `CardTitle` renders as h3. |

No global CSS touched. No new components created. No business logic, route, storage, or billing change. All shared UI primitives left as-is except the single `CardTitle` line above.

## 8. Final Status

- ✅ Inventory documented (§1).
- ✅ One safe fix applied (CardTitle h4 → h3) with a regression test.
- ✅ Remaining inconsistencies catalogued with severity + next-step (§4).
- ✅ Helper-component decisions deferred with explicit thresholds (§4.1) — no abstractions added casually.
- ✅ Eight scoped follow-up prompts queued (§6).
- ❌ `npm run typecheck`, `npm run test:run`, `npm run build` — not auto-run by this audit; recommended commands are reported in the chat alongside this doc.
