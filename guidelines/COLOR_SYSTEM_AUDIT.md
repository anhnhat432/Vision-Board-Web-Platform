# Color System Audit

Date: 2026-05-05
Role: Senior Visual Designer & Frontend Reviewer
Mode: QUOTA-SAFE — read-only, no code changes

Source files:
- `src/styles/theme.css` (CSS custom properties, :root + .dark)
- `src/app/components/ui/button.tsx` (button variants)
- `guidelines/DESIGN_SYSTEM_INVENTORY.md` (design tokens inventory)
- `guidelines/UX_UI_GO_NO_GO_LITE.md` (UX audit)

---

## 1. Current Palette

### 1.1 Core Tokens (from theme.css :root)

| Token | Value | Role | Usage |
|---|---|---|---|
| `--background` | `#f4f6fb` | App background | Light gray-blue (#f4f6fb = slate-50) |
| `--foreground` | `#141c2e` | Default text | Near-black blue (#141c2e = slate-950) |
| `--card` | `rgba(255,255,255,0.82)` | Card body | White 82% opacity |
| `--card-foreground` | `#141c2e` | Card text | Same as foreground |
| `--primary` | `#4f46e5` | Brand primary | Indigo-600 |
| `--primary-foreground` | `#ffffff` | On-primary text | White |
| `--secondary` | `rgba(237,241,255,0.94)` | Secondary surface | Indigo tint 94% opacity |
| `--secondary-foreground` | `#2e3e8c` | On-secondary text | Indigo-800 |
| `--muted` | `rgba(234,237,245,0.9)` | Quiet surface | Slate-100 tint |
| `--muted-foreground` | `#61738a` | Quiet text | Slate-500 |
| `--accent` | `rgba(240,244,250,0.86)` | Accent surface | Blue-50 tint |
| `--destructive` | `#d4183d` | Error/danger | Rose-600 |
| `--destructive-foreground` | `#ffffff` | On-destructive | White |
| `--border` | `rgba(148,163,184,0.18)` | Default border | Slate-300 18% opacity |
| `--input-background` | `rgba(255,255,255,0.88)` | Field background | White 88% opacity |
| `--ring` | `rgba(79,70,229,0.3)` | Focus ring | Indigo-600 30% opacity |

### 1.2 Status Colors (empirical, no semantic tokens)

| State | Foreground | Background | Border | Icon | Used in |
|---|---|---|---|---|---|
| **Success** | `emerald-600/700` | `emerald-50/80` | `emerald-200` | `CheckCircle2` | Completed tasks, SMART strength |
| **Warning** | `amber-700/900` | `amber-50/85` | `amber-200` | `AlertTriangle` | Review due, feasibility caution |
| **Error** | `rose-700` | `rose-50/85` | `rose-200` | `CircleAlert` | Validation errors |
| **Info/Suggestion** | `violet-500/700` | `violet-50/80` | `violet-100/200` | `Sparkles` | Archetype examples, hints |
| **Premium/Plus** | `gradient-brand` | `violet-50/80` | `violet-200` | `Crown` | Paywall, billing badges |

### 1.3 Per-Route Tone Palettes

Defined via `--tone-*` variables, applied per route:

| Route | Primary tone | Secondary tone | Effect |
|---|---|---|---|
| Dashboard/System | Indigo (`--tone-shell-primary: rgba(55,48,163,0.98)`) | Blue (`--tone-shell-secondary: rgba(79,70,229,0.94)`) | Gradient hero, focus rings |
| Life Balance | Green (`--tone-orb-a: rgba(99,102,241,0.18)`) | Teal (`--tone-orb-b: rgba(56,189,248,0.14)`) | Green orb glow |
| Journal | Warm orange | Orange tint | Warm surface |
| Achievements | Amber | Amber tint | Gold accent |
| Vision Board | Violet | Violet tint | Creative feel |

### 1.4 Brand Gradient

`.gradient-brand` (theme.css:1394-1396):
```
linear-gradient(135deg, rgba(109,40,217,.98), rgba(192,38,211,.94) 48%, rgba(59,130,246,.96) 100%)
```
Used by: Button default, Badge default, Progress indicator, active TabsTrigger.

---

## 2. Most Consistent Colors

1. **Indigo-600 (#4f46e5 / --primary)** — appears everywhere: buttons, focus rings, active tabs, primary CTAs, gradient-brand start
2. **Slate-500/600 (#61738a / --muted-foreground)** — secondary text, descriptions, metadata
3. **White with opacity** — card surfaces (--card, --secondary, --accent all use rgba white with opacity)
4. **Gradient-brand** — consistent across primary buttons, progress bars, active states

---

## 3. Most Inconsistent Colors

1. **Success state**: Uses `emerald-600` in some places, `emerald-700` in others. Background varies between `emerald-50/80` and `emerald-50/85`. No shared Alert variant exists.

2. **Warning state**: `amber-700` vs `amber-900` for foreground. Background: `amber-50/85` (Dashboard) vs `amber-50/92` (other pages). Border: `amber-200` vs `amber-300`.

3. **Card padding**: Dashboard hero cards use `p-5 sm:p-6 lg:p-7` while CardContent default is `px-5 sm:px-7`. Not a color but visual inconsistency.

4. **Shadow strings**: Each page invents custom `shadow-[...]` strings. Glass cards use `0_18px_40px_-30px_rgba(15,23,42,0.16)` while buttons use `0_18px_38px_-24px_rgba(109,40,217,0.52)`. No shared shadow token.

5. **Skeleton color**: Uses `rgba(226,232,240,0.68)` (hardcoded in .skeleton-shimmer) while --muted is `rgba(234,237,245,0.9)`. Slightly different gray tint.

---

## 4. Low Contrast Risks

1. **`--muted-foreground: #61738a` on white card**: Contrast ratio ~4.5:1 (barely passes WCAG AA for normal text at 16px+). Smaller text (--text-xs: 12px) may fail.

2. **`rgba(148,163,184,0.18)` border on white**: Border is very subtle (18% opacity slate-300). May be invisible on high-brightness screens.

3. **Gradient text (`.gradient-text`)**: Uses `--tone-shell-primary` to `--tone-shell-tertiary`. On dark hero backgrounds it's white, but on white surfaces the indigo→blue gradient may have insufficient contrast with white background (WCAG requires 4.5:1 against background, not against adjacent colors).

4. **Badge text `text-slate-600` on `bg-white`**: Ratio ~5.7:1 (passes) but `text-slate-500` drops to ~4.1:1 which fails for 12px text.

---

## 5. Colors Making CTAs Not Pop

1. **Secondary buttons**: `border-white/70 bg-white/78` with `text-foreground` — too similar to card backgrounds, gets lost in busy layouts.

2. **Ghost buttons**: `text-slate-600` on white — low emphasis works for tertiary actions, but on hero cards with many elements they become invisible.

3. **Outline buttons**: `border-white/70 bg-white/78` — same as secondary, confusing distinction between "secondary" and "outline" variants.

4. **Dashboard attention panels**: `bg-slate-50/90` with `text-slate-600` — designed to be quiet, but may be *too* quiet for important "Đi tiếp ngay" CTAs.

---

## 6. Colors Making App Look Generic / Not Premium

1. **Overuse of `slate-*` palette**: 70%+ of UI uses slate-50/100/200/500/600/900. Creates "Tailwind default" feel, not a branded experience.

2. **White cards with subtle borders**: The `glass-surface` + `glass-surface-gradient-border` pattern is good, but too many pages use the exact same white card style. Lacks visual hierarchy.

3. **No depth via color**: Relies on shadows for elevation, not color shifts. Premium apps often use subtle background color shifts (e.g., cards slightly warmer/colder than background).

4. **Gradient brand only on primary**: The beautiful `gradient-brand` (violet→pink→blue) is only used for primary buttons. Not extended to card accents, section dividers, or decorative elements.

---

## 7. Colors Causing Tension/Judgment in Coaching Flow

1. **`destructive: #d4183d` (Rose-600) for validation errors**: Rose/red triggers alarm response. In coaching flows (SMART setup, feasibility), errors feel like "you're doing it wrong" rather than "let's improve this".

2. **Amber warning for feasibility**: `amber-700` + `AlertTriangle` icon creates "warning" feeling. For a coaching app, `violet-500` + `Sparkles` (info/suggestion styling) would feel more supportive.

3. **Red progress bars**: When completion % is low, seeing red/orange creates pressure. Coaching apps should use neutral or growth-oriented colors for work-in-progress.

4. **"Weak" indicators in SMART review**: Using red/orange for weak dimensions feels judgmental. Consider `amber-500` (caution, not error) or `violet-500` (needs improvement, not failure).

---

## 8. Top 10 Color Issues

1. **No semantic status tokens** — success/warning/info use hardcoded Tailwind classes, not CSS variables. Makes global theme changes impossible.

2. **Low contrast on muted-foreground** — `#61738a` barely passes WCAG AA at small sizes.

3. **Inconsistent success/warning/error colors** — emerald-600 vs 700, amber-700 vs 900, rose-600 vs 700 across pages.

4. **Destructive color too alarming** — Rose-600 feels harsh for coaching feedback. Should be warm amber or soft violet.

5. **White cards all look same** — no visual hierarchy via color. Dashboard shows 8-12 cards with identical styling.

6. **Overuse of slate palette** — makes app look like Tailwind defaults, not a premium branded product.

7. **Secondary vs Outline button confusion** — both use `border-white/70 bg-white/78`, users can't distinguish variants.

8. **Gradient brand underused** — beautiful violet→pink→blue only on primary buttons, not extended to decorative elements.

9. **Skeleton color mismatch** — hardcoded `rgba(226,232,240,0.68)` doesn't match `--muted: rgba(234,237,245,0.9)`.

10. **No dark mode optimization** — `.dark` theme exists but just inverts to oklch. Brand colors (indigo/violet) may not work well on pure dark backgrounds.

---

## 9. Quick Wins (Safe to Apply Now)

### Q1. Add semantic status tokens (5 min, zero risk)
Add to theme.css `:root`:
```css
--success: #059669;           /* emerald-600 */
--success-foreground: #ecfdf5;  /* emerald-50 */
--success-border: #a7f3d0;    /* emerald-200 */
--warning: #b45309;           /* amber-700 */
--warning-foreground: #fffbeb; /* amber-50 */
--warning-border: #fde68a;    /* amber-200 */
--info: #7c3aed;             /* violet-500 */
--info-foreground: #f5f3ff;   /* violet-50 */
--info-border: #ddd6fe;        /* violet-200 */
```

### Q2. Fix skeleton color mismatch (2 min, zero risk)
In theme.css `.skeleton-shimmer`, change:
```css
/* Before */
background-color: rgba(226,232,240,0.68);

/* After */
background-color: rgba(234,237,245,0.68); /* match --muted RGB */
```

### Q3. Soften destructive in coaching flows (10 min, low risk)
Change `--destructive` from `#d4183d` (Rose-600) to `#dc2626` (Red-600, slightly warmer) or create a separate `--coaching-soft` token:
```css
--coaching-soft: #ea580c;  /* orange-600, less alarming than rose */
```

### Q4. Increase muted-foreground contrast (2 min, zero risk)
Change `--muted-foreground: #61738a` to `#475569` (slate-600) for better contrast at small sizes.

### Q5. Extend gradient-brand to card accents (15 min, low risk)
Add gradient left-border or gradient icon backgrounds to:
- Dashboard stat cards (gradient left-border)
- Section dividers in 12WeekSystem (gradient line)
- Active step indicators (gradient background instead of solid indigo)

### Q6. Distinguish secondary vs outline buttons (5 min, zero risk)
Change outline variant to use `border-slate-300` instead of `border-white/70` so users can tell them apart visually.

---

## 10. Parts NOT to Change Right Now

1. **Core brand colors (--primary: #4f46e5, gradient-brand)**: These are the established brand identity. Don't change without marketing/product input.

2. **Per-route tone palettes (--tone-*)**: These are carefully designed for each flow. Changing them now would require re-auditing all pages.

3. **Dark mode colors**: The `.dark` theme uses oklch. Changing light theme colors may break dark theme harmony. Needs separate audit.

4. **Dashboard card layout colors**: The current white cards + gradient borders + ambient glow is a deliberate design language. Don't change to colored cards without user testing.

5. **Button variant structure**: The cva variants in button.tsx work well. Don't restructure without testing all 6 pages that use buttons.

---

## 11. Next Prompt Suggestion

```
QUOTA-SAFE MODE.

Bạn là frontend engineer chịu trách nhiệm CSS tokens.

Nhiệm vụ:
1. Thêm 4 semantic tokens vào theme.css :root:
   --success, --success-foreground, --success-border
   --warning, --warning-foreground, --warning-border
   --info, --info-foreground, --info-border
   --coaching-soft (thay thế --destructive trong coaching flows)

2. Sửa skeleton color cho khớp --muted RGB.

3. Tăng contrast --muted-foreground từ #61738a → #475569.

4. Chạy npm run typecheck.
5. Chạy npm run build.

Ràng buộc:
- Không sửa JS/TS files.
- Không đổi --primary hay gradient-brand.
- Không đổi .dark theme.
- Chỉ sửa theme.css.
```
