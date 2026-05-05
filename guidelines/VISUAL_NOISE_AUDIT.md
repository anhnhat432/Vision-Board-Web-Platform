# Visual Noise Audit

Date: 2026-05-05
Role: Visual Design Reviewer
Mode: QUOTA-SAFE — read-only, no code changes

Source files:
- `guidelines/COLOR_USAGE_INVENTORY.md` (raw color counts)
- `guidelines/COLOR_SYSTEM_DIRECTION.md` (semantic tokens, usage rules)
- `src/app/pages/Dashboard.tsx` (259 raw colors, most gradients)
- `src/app/pages/GoalTracker.tsx` (97 raw colors, task list heavy)

---

## 1. Gradient or Accent Colors Causing Noise

### 1.1 Overused: `gradient-brand` (violet→pink→blue)
- **Count**: ~20+ usages across app
- **Where**: Primary CTAs, progress bars, Check-in button, "Việc quan trọng nhất" hero
- **Noise issue**: When 3+ gradient buttons appear on same screen (Dashboard: "Mở trung tâm 12 tuần", "Đánh dấu xong", "Lưu check-in hôm nay" all use gradient-brand)
- **Fix**: Keep for PRIMARY CTA only. Change secondary actions to `bg-slate-950 text-white` or `border-slate-300 bg-white`

### 1.2 Overused: `shadow-[0_18px_38px_-24px_rgba(109,40,217,0.52)]`
- **Count**: ~15+ identical shadows on gradient buttons
- **Noise issue**: All gradient buttons have the same purple shadow — creates a "purple haze" effect when multiple CTAs cluster
- **Fix**: Use `hover:shadow-[0_22px_44px_-24px_rgba(109,40,217,0.58)]` on primary CTA only. Remove shadow from secondary gradient buttons.

### 1.3 Overused: `bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)]`
- **Count**: ~12+ cards use this exact pattern (Dashboard, Today tab, Week tab)
- **Noise issue**: All cards look identical — no visual hierarchy. User can't tell which card matters most.
- **Fix**: Keep for secondary cards. Use `border-2 border-primary shadow-[0_20px_48px_-32px_rgba(79,70,229,0.42)]` for hero cards only.

---

## 2. Pages with Too Many Colors Competing for CTA Attention

### 2.1 Dashboard (Worst Offender — 259 raw colors)
**Problem**: 8-12 white cards with identical styling, 3+ gradient CTAs, amber warning banners, violet info panels, emerald success badges — all competing.

**CTAs competing on same screen**:
1. "Mở trung tâm 12 tuần" (gradient-brand) — primary
2. "Đánh dấu xong" (gradient-brand) — primary
3. "Lưu check-in hôm nay" (gradient-brand) — primary
4. "Mở 12 tuần" in task list (gradient-brand) — secondary
5. "Chốt review tuần" (gradient-brand) — warning context

**Fix**: 
- Keep ONE gradient-brand CTA per screen (usually "Mở trung tâm 12 tuần")
- Change others to: `bg-slate-950 text-white` (secondary primary) or `border-slate-300 bg-white text-slate-900` (tertiary)

### 2.2 GoalTracker (97 raw colors)
**Problem**: Task list items have emerald-400/600 for completed, amber-700 for at-risk, rose-600 for overdue, plus slate-500/600 metadata — too many status colors.

**Fix**: Use semantic Badge variants only:
- `variant="success"` for completed tasks
- `variant="warning"` for at-risk/overdue
- Remove rose-600 entirely (not destructive action)

### 2.3 Today Tab (30+ raw colors)
**Problem**: Primary task hero (emerald border), overdue tasks (amber), check-in mood buttons (violet), all on one screen.

**Fix Applied**: Already polished in previous task (commit `ae8f4af`):
- Strengthened borders: emerald-200→emerald-300, amber-200→amber-300
- Improved text contrast on dark backgrounds

---

## 3. Colors to Keep as Brand/Accent

| Color | Keep because... | Usage rule |
|---|---|---|
| `--primary: #4f46e5` (Indigo-600) | Trusted brand anchor, stable | Primary CTAs, active tabs, focus rings |
| `gradient-brand` (violet→pink→blue) | Uplifting, optimistic | ONE primary CTA per screen only |
| `--success: #059669` (Emerald-600) | Growth, forward motion | Completed tasks, ≥80% progress, strong SMART dimensions |
| `--info: #7c3aed` (Violet-500) | Supportive insight, not alarming | Coaching hints, archetype examples, info panels |
| `--background: #f4f6fb` | Calm, cool gray-blue | App background, never change |
| `--foreground: #141c2e` (Slate-950) | High contrast, readable | Default text, headings |

---

## 4. Colors to Convert to Muted/Card/Background

| Current hardcoded | Convert to... | Why |
|---|---|---|
| `slate-500` (120+ usages) | `text-muted-foreground` (#475569) | Overused for metadata. Too many slate-500 = generic Tailwind look. Keep for non-text elements only. |
| `bg-white/92` (100+ usages) | `bg-card` or `bg-[color:var(--card)]` | All cards look same. Use for secondary cards only. Hero cards need `border-2 border-primary`. |
| `slate-200` (80+ usages) | `border-border` (rgba(148,163,184,0.18)) | Too many similar borders. Use semantic `--border` token for consistency. |
| `emerald-50/100/200` (35+ usages) | `var(--success-foreground)` / `var(--success-border)` | Already have semantic tokens. Hardcoded emerald-* looks inconsistent with token system. |
| `amber-50/200` (22+ usages) | `var(--warning-foreground)` / `var(--warning-border)` | Same as above — use Badge `variant="warning"` instead. |
| `violet-50/200` (18+ usages) | `var(--info-foreground)` / `var(--info-border)` | Use Badge `variant="info"` instead. |

---

## 5. Top 5 Small Fixes

### Fix #1: Dashboard — Reduce gradient-brand CTAs from 3+ to 1 per screen
**Problem**: Dashboard has 3+ gradient buttons competing for attention.

**File**: `src/app/pages/Dashboard.tsx`

**Change**:
- Keep gradient-brand for: "Mở trung tâm 12 tuần" (line 949)
- Change to `bg-slate-950 text-white`: "Đánh dấu xong" (line 876), "Lưu check-in" (line 665)
- Change to `border-slate-300 bg-white`: Secondary action buttons in cards

**Impact**: Immediately calms the screen. One clear primary CTA.

### Fix #2: Dashboard — Add hero card distinction
**Problem**: All 8-12 cards look identical with `bg-white/92 shadow-[...]`.

**File**: `src/app/pages/Dashboard.tsx`

**Change**:
- Hero card (lines 854-884): Already has `border-2 border-primary` ✅
- Secondary cards: Keep `border border-slate-200/80 bg-white/92`
- Add `ambient-glow` class to hero card only (already done on plan card line 1271)

### Fix #3: GoalTracker — Replace hardcoded status colors with semantic Badges
**Problem**: Task list uses emerald-600/400, amber-700, rose-600 for status — inconsistent with token system.

**File**: `src/app/pages/GoalTracker.tsx`

**Change**:
- Completed tasks: Use `<Badge variant="success">` instead of `text-emerald-600`
- At-risk/overdue: Use `<Badge variant="warning">` instead of `text-amber-700`
- Remove rose-600 entirely (not destructive action)

### Fix #4: All Pages — Replace `text-slate-500` (12px+ text) with `text-muted-foreground`
**Problem**: `slate-500` overused (120+ times), makes app look generic Tailwind.

**Files**: Dashboard.tsx, GoalTracker.tsx, all pages

**Change**:
- Any `text-slate-500` for 12px+ text → `text-muted-foreground` (#475569, already updated)
- Keep `slate-500` for non-text elements (borders, backgrounds) if needed

### Fix #5: All Pages — Replace `bg-white/92` with `bg-card` for consistency
**Problem**: Hardcoded `bg-white/92` (actually rgba(255,255,255,0.92)) appears 100+ times. Should reference `--card` token.

**Files**: All pages with cards

**Change**:
- `bg-white/92` → `bg-card` (which is `rgba(255,255,255,0.82)` — slightly different opacity but consistent)
- OR keep as-is if opacity matters for glass effect, but add comment: `/* bg-[color:var(--card)] for consistency */`

---

## 6. Small Prompt to Fix #1 (Dashboard Gradient Reduction)

```
QUOTA-SAFE MODE.

Bạn là frontend engineer.

Nhiệm vụ: Giảm số gradient-brand CTAs trên Dashboard từ 3+ xuống còn 1 per screen.

File: src/app/pages/Dashboard.tsx

Thay đổi:
1. Giữ gradient-brand cho CTA chính: "Mở trung tâm 12 tuần" (line ~949)
2. Đổi sang bg-slate-950 text-white cho:
   - "Đánh dấu xong" (line ~876)
   - "Lưu check-in hôm nay" (line ~665)
   - "Mở review tuần" (line ~838)
3. Đổi sang border-slate-300 bg-white text-slate-900 cho:
   - Các button secondary trong cards (line ~1365, ~1625)
   - "Xem Free đang có gì" (line ~1318)
   - "Quản lý gói và quyền" (line ~1330)

Không đổi:
- gradient-brand trong Today tab, Week tab (khác trang)
- Các shadow effects (chỉ đổi button variant)
- Layout hay padding

Sau khi sửa:
- Chạy npm run typecheck
- Chạy npm run build
- Báo cáo lines changed, risks

Ràng buộc:
- Không đổi các trang khác
- Không thêm dependency
- Không chạy test suite
```

---

## 7. Summary

| Aspect | Finding |
|---|---|
| **Worst noise** | Dashboard: 3+ gradient CTAs, 8-12 identical white cards, 259 raw colors |
| **Gradient overuse** | `gradient-brand` on 3+ buttons per screen, same purple shadow everywhere |
| **Card monotony** | All cards use `bg-white/92 shadow-[...]` — no hierarchy |
| **Color to keep** | `--primary`, `gradient-brand` (1x/screen), `--success`, `--info`, `--background` |
| **Color to mute** | `slate-500` → `muted-foreground`, `bg-white/92` → `bg-card`, emerald/amber/violet hardcoded → semantic tokens |
| **Top fix** | Dashboard: reduce gradient CTAs from 3+ to 1, add hero card distinction |
| **Next prompt** | See section 6 above — small, targeted, QUOTA-SAFE |
