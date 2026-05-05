# Color System Direction

Date: 2026-05-05
Role: Visual Design Lead for Goal Execution Web App
Mode: QUOTA-SAFE — read-only, no code changes

Source files:
- `guidelines/COLOR_SYSTEM_AUDIT.md` (current palette audit)
- `guidelines/UX_COPY_STYLE_GUIDE.md` (tone: clear, concrete, no judgment)
- `guidelines/CORE_QUALITY_V2_GO_NO_GO.md` (coaching flow evidence)

---

## 1. Design Adjectives

The app should feel:

| Adjective | Why | How in color |
|---|---|---|
| **Calm** | Goal planning is long-term, needs patience | Avoid high-saturation reds/oranges. Use desaturated indigo/violet as primary. Background stays cool gray-blue (#f4f6fb). |
| **Focused** | User needs to know "what now?" | Primary CTAs pop with gradient-brand. Secondary actions recede (muted). Card surfaces are clean white with subtle borders. |
| **Optimistic** | Goals are about future possibility | Use emerald/warm green for progress (not red for "behind"). Gradient brand (violet→pink→blue) feels uplifting. |
| **Trustworthy** | Personal data, life balance, 12-week commitments | Indigo-600 (#4f46e5) is stable, professional. Not trendy neon. Not fintech-crypto loud. |
| **Action-oriented** | Clear next steps, no ambiguity | Primary CTAs: high contrast white-on-gradient. Warning: amber (guidance) not red (alarm). Destructive: only for irreversible actions. |
| **Non-judgmental** | Coaching, not policing | Replace rose/red for "weak" states with amber-500 (caution) or violet-500 (needs improvement). Success is emerald, not "perfect score" red. |

---

## 2. Colors to Represent

### 2.1 Primary Action
- **Color**: `--primary: #4f46e5` (Indigo-600) — keep as-is
- **Usage**: Primary buttons, active tabs, focus rings, gradient-brand start
- **Why**: Stable, professional, already trusted by users. Don't change.

### 2.2 Coaching Accent
- **Color**: `--info: #7c3aed` (Violet-500) — new semantic token
- **Usage**: Suggestions, archetype examples, "try this" hints, info panels
- **Why**: Violet feels supportive, not alarming. Replaces amber-700 for coaching guidance (less "warning" feel).

### 2.3 Progress/Success
- **Color**: `--success: #059669` (Emerald-600) — new semantic token
- **Usage**: Completed tasks, strong SMART dimensions, weekly completion bars, execution score ≥80%
- **Why**: Green = growth, forward motion. Not red/orange (which suggest "behind" or "failure").

### 2.4 Risk/Warning
- **Color**: `--warning: #b45309` (Amber-700) — new semantic token
- **Usage**: Review due soon, feasibility borderline, weak SMART dimension hints, first-week guidance
- **Why**: Amber = "pay attention" without "you failed". Softer than rose/red for coaching context.

### 2.5 Danger/Destructive
- **Color**: `--destructive: #dc2626` (Red-600) — change from current #d4183d (Rose-600)
- **Usage**: Delete data, cancel subscription, irreversible actions ONLY
- **Why**: Red-600 is slightly warmer than Rose-600. Still alarming (correct for destructive), but less "angry" than pure rose.

### 2.6 Info/Guidance
- **Color**: `--info: #7c3aed` (Violet-500) — same as coaching accent
- **Usage**: "Did you know?", archetype fit, next-action hints, system tips
- **Why**: Violet = "insight" not "error". Aligns with coaching tone (supportive guidance).

### 2.7 Muted/Local/Demo Status
- **Color**: `--muted: rgba(234,237,245,0.9)` — keep as-is
- **Usage**: Demo mode banners, local-only notices, secondary metadata
- **Why**: Already works well. Slate-tinted gray = "not primary, not action".

---

## 3. Semantic Palette Proposal

```css
:root {
  /* === Existing (keep) === */
  --background: #f4f6fb;
  --foreground: #141c2e;
  --card: rgba(255,255,255,0.82);
  --card-foreground: #141c2e;
  --primary: #4f46e5;
  --primary-foreground: #ffffff;
  --secondary: rgba(237,241,255,0.94);
  --secondary-foreground: #2e3e8c;
  --muted: rgba(234,237,245,0.9);
  --muted-foreground: #475569; /* CHANGED: #61738a → #475569 for contrast */
  --accent: rgba(240,244,250,0.86);
  --accent-foreground: #141c2e;
  --border: rgba(148,163,184,0.18);
  --ring: rgba(79,70,229,0.3);

  /* === New semantic tokens === */
  --success: #059669;           /* Emerald-600 */
  --success-foreground: #ecfdf5;  /* Emerald-50 */
  --success-border: #a7f3d0;    /* Emerald-200 */
  
  --warning: #b45309;           /* Amber-700 */
  --warning-foreground: #fffbeb; /* Amber-50 */
  --warning-border: #fde68a;    /* Amber-200 */

  --destructive: #dc2626;        /* Red-600 (CHANGED: was #d4183d Rose-600) */
  --destructive-foreground: #ffffff;
  
  --info: #7c3aed;              /* Violet-500 (NEW) */
  --info-foreground: #f5f3ff;    /* Violet-50 */
  --info-border: #ddd6fe;        /* Violet-200 */
}
```

---

## 4. Color Usage Rules

### 4.1 Primary CTA
- **Do**: `bg-gradient-brand text-white`, `shadow-[0_18px_38px_-24px_rgba(109,40,217,0.52)]`
- **Don't**: Use red/orange for "submit" or "save". Don't use gray buttons for primary actions.

### 4.2 Secondary CTA
- **Do**: `border-slate-300 bg-white text-slate-900` (distinct from outline now)
- **Don't**: Use `border-white/70 bg-white/78` (too similar to card backgrounds).

### 4.3 Warning (Coaching Context)
- **Do**: `amber-700` + `AlertTriangle` for "review due", "feasibility borderline"
- **Don't**: Use red/rose for anything other than destructive actions. Don't use "Warning: you failed" tone.

### 4.4 Completed Task
- **Do**: `emerald-600` text + `CheckCircle2` icon + `emerald-50` background
- **Don't**: Use orange/red for "behind schedule". Don't use gray for completed (needs celebration).

### 4.5 Overdue/Rescue
- **Do**: `amber-700` + `AlertTriangle` for "3 tasks overdue" (gentle nudge)
- **Don't**: Use red "ALERT" styling. Coaching apps guide, not punish.

### 4.6 Progress Bar
- **Do**: Gradient brand (indigo→pink→blue) for active progress. Emerald-600 for ≥80% completion.
- **Don't**: Use red/orange for <50% (feels like failure). Use amber only for "at risk".

### 4.7 Local/Demo Status
- **Do**: `slate-500` text on `slate-50` background with `Info` icon
- **Don't**: Use warning/danger colors for "demo mode" (not an error state).

### 4.8 Premium/Mock Billing
- **Do**: `gradient-brand` or `.badge-premium` (violet→pink→amber) + `Crown` icon
- **Don't**: Use gold/yellow (looks like "winner" not "upgrade").

---

## 5. Colors NOT to Overuse

| Color | Why limit | Max usage |
|---|---|---|
| **Red-600 / Rose-600** | Too alarming for coaching. Feels like "you failed". | Only irreversible actions (delete, cancel). Max 1-2 elements per page. |
| **Amber-700** | Warning fatigue if everywhere. | Only review-due, feasibility borderline, weak-hint. Max 2-3 elements per page. |
| **Slate-500/600** | Overused (70%+ UI). Makes app look generic Tailwind. | Keep for metadata only. Use indigo/violet for interactive elements. |
| **White (card surfaces)** | All cards look same, no hierarchy. | Keep for cards, but add gradient-border or ambient-glow for hero cards. Don't use plain white for 8+ cards on one page. |
| **Emerald-600** | Too much green = "everything is perfect" (not true). | Only completed tasks, strong dimensions, ≥80% progress. Not for "in progress". |

---

## 6. Pages to Apply First

Priority order based on user traffic + coaching impact:

### 6.1 Dashboard
- **Current**: 8-12 white cards, indigo CTAs, slate metadata
- **Apply**: Add "Việc quan trọng nhất" hero with `--primary` border. Use `--success` for completion stats. Use `--warning` for review-due (not red). Add gradient-border to hero card (already done).
- **Why first**: Highest traffic, most cards competing for attention.

### 6.2 SMARTGoalSetup
- **Current**: Rose-600 for errors, amber for warnings, emerald for strong
- **Apply**: Change `--destructive` to Red-600 (warmer). Use `--info` (violet) for archetype examples + guidance. Use `--success` consistently (emerald-600 not emerald-700).
- **Why**: Core funnel, coaching tone matters most here.

### 6.3 Feasibility Result
- **Current**: Amber-700 for borderline, red for "too ambitious"
- **Apply**: Use `--warning` (amber-700) for borderline. Use `--info` (violet) for "try this" suggestions. Remove red entirely (not destructive action).
- **Why**: Feasibility is guidance, not judgment. Users should feel "I can adjust" not "I'm unrealistic".

### 6.4 12WeekSetup Review
- **Current**: CheckCircle green for strong, AlertTriangle for weak
- **Apply**: Use `--success` (emerald) for strong dimensions. Use `--warning` (amber) for weak (not red). Add `--info` (violet) for archetype-fit hints.
- **Why**: Review step is where users commit. Tone must be "ready to go" not "you're not ready".

### 6.5 Today Tab (12WeekSystem)
- **Current**: Red for overdue, green for completed, amber for at-risk
- **Apply**: Use `--warning` (amber) for overdue (gentle nudge, not "ALERT"). Use `--success` for completed. Use `--info` (violet) for "insight of the day".
- **Why**: Daily interaction, tone must be supportive. Users visit daily.

---

## 7. Implementation Report

### Files Changed
1. `src/styles/theme.css`
   - Added: `--success: #059669`, `--success-foreground: #ecfdf5`, `--success-border: #a7f3d0`
   - Added: `--warning: #b45309`, `--warning-foreground: #fffbeb`, `--warning-border: #fde68a`
   - Added: `--info: #7c3aed`, `--info-foreground: #f5f3ff`, `--info-border: #ddd6fe`
   - Changed: `--destructive: #d4183d` → `#dc2626`
   - Changed: `--muted-foreground: #61738a` → `#475569`

2. `src/app/components/ui/button.tsx`
   - Changed outline variant: `border-white/70` → `border-slate-300`

3. `src/app/components/ui/badge.tsx`
   - Added variant `success`: uses `--success`, `--success-foreground` tokens
   - Added variant `warning`: uses `--warning`, `--warning-foreground` tokens
   - Added variant `info`: uses `--info`, `--info-foreground` tokens

4. `src/app/components/ui/alert.tsx`
   - Added variant `success`: uses `--success`, `--success-foreground`, `--success-border` tokens
   - Added variant `warning`: uses `--warning`, `--warning-foreground`, `--warning-border` tokens
   - Added variant `info`: uses `--info`, `--info-foreground`, `--info-border` tokens

### Variant Rules Summary
| Component | success | warning | info | destructive | Notes |
|---|---|---|---|---|---|
| **Badge** | `variant="success"` → emerald-600 bg, emerald-50 text | `variant="warning"` → amber-700 bg, amber-50 text | `variant="info"` → violet-500 bg, violet-50 text | `variant="destructive"` → red-600 bg, white text | All use gradient shadow |
| **Button** | - | - | - | `variant="destructive"` → red-600 bg, white text | No success/warning/info button variants needed |
| **Alert** | `variant="success"` → emerald-600 text, emerald-50 bg, emerald-200 border | `variant="warning"` → amber-700 text, amber-50 bg, amber-200 border | `variant="info"` → violet-500 text, violet-50 bg, violet-200 border | `variant="destructive"` → red-600 text, card bg | Follows semantic token system |

### Color Usage Rules
- **success** (emerald): Growth, completion, forward motion — never "perfect score"
- **warning** (amber): Guidance, attention — never use for "you failed"
- **info** (violet): Coaching insight, suggestions — supportive not alarming
- **destructive** (red): Irreversible actions ONLY — delete, cancel, destroy
- **muted** (slate): Local/demo status, metadata — never danger

### Commands Run
- `npm run typecheck` — passed
- `npm run build` — passed (built in 7.94s)

### Risks
- **Low**: `badge.tsx` and `alert.tsx` use `bg-[color:var(--token)]` syntax — works in Tailwind v4, modern browsers support `color:` prefix
- **None**: `button.tsx` outline change is visual-only, no behavior change
- **None**: theme.css tokens are additive (except `--destructive` and `--muted-foreground` which were explicit requirements)

### Token Diff
```diff
+ --success: #059669;
+ --success-foreground: #ecfdf5;
+ --success-border: #a7f3d0;
+ --warning: #b45309;
+ --warning-foreground: #fffbeb;
+ --warning-border: #fde68a;
+ --info: #7c3aed;
+ --info-foreground: #f5f3ff;
+ --info-border: #ddd6fe;
- --destructive: #d4183d;
+ --destructive: #dc2626;
- --muted-foreground: #61738a;
+ --muted-foreground: #475569;
```

---

## 8. Next Prompt for Implementation

```
QUOTA-SAFE MODE.

Bạn là frontend engineer chịu trách nhiệm CSS tokens.

Nhiệm vụ:
1. Thêm 4 semantic tokens vào theme.css :root:
   --success, --success-foreground, --success-border
   --warning, --warning-foreground, --warning-border
   --info, --info-foreground, --info-border
   --destructive: đổi từ #d4183d → #dc2626

2. Sửa --muted-foreground: #61738a → #475569 (tăng contrast).

3. Cập nhật button.tsx:
   - Outline variant: đổi border-white/70 → border-slate-300 (phân biệt với secondary)
   - Ghost variant: giữ nguyên (đã ổn)

4. Cập nhật alert.tsx:
   - Thêm variant="warning" dùng --warning tokens
   - Thêm variant="success" dùng --success tokens
   - Thêm variant="info" dùng --info tokens

5. Chạy npm run typecheck.
6. Chạy npm run build.
7. Báo cáo files changed, token diff.

Ràng buộc:
- Không đổi --primary hay gradient-brand.
- Không đổi --tone-* (per-route palettes).
- Không đổi .dark theme.
- Chỉ sửa theme.css, button.tsx, alert.tsx.
- Không chạy test suite.
```

---

## 8. Summary

| Aspect | Decision |
|---|---|
| **Primary** | Keep Indigo-600 (#4f46e5) — trusted brand |
| **Success** | New token: Emerald-600 (#059669) — growth, forward |
| **Warning** | New token: Amber-700 (#b45309) — guidance, not alarm |
| **Destructive** | Change to Red-600 (#dc2626) — warmer than Rose-600 |
| **Info/Coaching** | New token: Violet-500 (#7c3aed) — supportive insight |
| **Muted** | Increase contrast: #61738a → #475569 |
| **Overuse** | Limit red/rose to destructive only. Limit amber to 2-3 elements/page. |
| **Tone** | Calm, focused, optimistic, trustworthy, non-judgmental |
| **First pages** | Dashboard → SMARTGoalSetup → Feasibility → Review → Today Tab |
