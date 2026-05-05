# Motion Effects Manual QA Checklist

Date: 2026-05-05
Role: UX QA Lead
Mode: QUOTA-SAFE — manual review only, no code changes

Prerequisites:
- `guidelines/MOTION_EFFECTS_GUIDE.md` (motion principles)
- `guidelines/MOTION_EFFECTS_CHANGELOG.md` (changes made)
- `guidelines/COLOR_SYSTEM_DIRECTION.md` (color tokens)

---

## 1. Preparation Checklist

### 1.1 Desktop Viewport
- [ ] Screen resolution: 1440×900+ (or browser window maximized)
- [ ] Browser: Chrome/Edge/Firefox latest
- [ ] Zoom level: 100%
- [ ] Disable browser extensions that affect styling

### 1.2 Mobile Viewport
- [ ] Browser DevTools → Toggle device toolbar
- [ ] Device: iPhone 12 Pro (390×844) or similar
- [ ] Throttle: No throttling
- [ ] Touch simulation: Enabled

### 1.3 Hard Refresh
```bash
# Clear cache and hard reload
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Or open DevTools → Right-click Reload → Empty Cache and Hard Reload
```

### 1.4 Clear localStorage (if needed)
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 1.5 Test `prefers-reduced-motion` (if OS/browser supports)
```bash
# macOS
System Preferences → Accessibility → Display → Reduce motion

# Windows
Settings → Accessibility → Visual Effects → Animation Effects → Off

# Browser (Chrome)
chrome://settings → Advanced → Accessibility → "Show a
```
- [ ] Enable reduced motion in OS
- [ ] Refresh page
- [ ] Verify animations disabled

---

## 2. Screens to Review

### 2.1 Dashboard
**URL**: `http://localhost:5173/`
**What to check**:
- [ ] **Too many moving things?** (ambient orbs, cursor glow, shimmer — should be reduced/removed)
- [ ] **Primary CTA clear?** (Only ONE gradient-brand button: "Mở trung tâm 12 tuần")
- [ ] **Cards "shiny" competing with content?** (Shadows reduced to 0.2-0.32 opacity)
- [ ] **Hover too scaley/lift?** (hover:scale-[1.01] or removed, translateY(-1px) or removed)
- [ ] **Warning/rescue too alarming?** (amber shadow 0.28, not 0.4+)
- [ ] **Form easy to focus?** (100ms transitions, clear focus ring)
- [ ] **Text readable on cards?** (no backdrop-blur, bg-white/92)
- [ ] **On mobile: cluttered?** (390px viewport, no horizontal overflow)
- [ ] **With reduced motion: no animations?** (transition: none, animation: none)

**Red Flags**:
- ❌ Gradient buttons competing (>1 per screen)
- ❌ Card shadows still heavy (opacity >0.3)
- ❌ hover:scale-[1.02] still present
- ❌ transition-all still present
- ❌ `backdrop-filter: blur()` on content cards
- ❌ Infinite animations playing (orb-float, cursor-glow)

**Decision**:
- ✅ PASS
- ⚠️ PASS WITH MINOR ISSUES (list issues below)
- ❌ FAIL — TOO FLASHY (explain why)
- ❌ FAIL — TOO FLAT/LOST FEEDBACK (explain why)

**Issues Found**:
<!-- Fill this if not PASS -->
1. 
2. 
3. 

---

### 2.2 SMARTGoalSetup
**URL**: `http://localhost:5173/smart-goal-setup`
**What to check**:
- [ ] **Too many moving things?** (no 3D hero transforms, no shimmer on static elements)
- [ ] **Primary CTA clear?** (Only ONE gradient-brand button: "Tiếp theo")
- [ ] **Form easy to focus?** (100ms transitions, clear focus ring on inputs)
- [ ] **Step indicator clear?** (simple `bg-primary` for active, no glow)
- [ ] **Warning/suggestion subtle?** (`Alert variant="warning"`, no animation)
- [ ] **Secondary buttons calm?** (`bg-slate-950 text-white`, not gradient)
- [ ] **On mobile: form usable?** (inputs accessible, no horizontal overflow)
- [ ] **With reduced motion: no 3D transforms?** (perspective/rotateX/Y disabled)

**Red Flags**:
- ❌ `perspective(1600px) rotateX() rotateY()` on hero
- ❌ `transition-all` on step shells
- ❌ Gradient buttons with shadow 0.52+ and hover:scale-[1.02]
- ❌ Violet shadow >0.3 on starter preview cards

**Decision**:
- ✅ PASS
- ⚠️ PASS WITH MINOR ISSUES
- ❌ FAIL — TOO FLASHY
- ❌ FAIL — TOO FLAT/LOST FEEDBACK

**Issues Found**:
1. 
2. 

---

### 2.3 Feasibility Result
**URL**: `http://localhost:5173/feasibility` (need to complete SMARTGoalSetup first)
**What to check**:
- [ ] **Result clear?** (✅/⚠️/❌ with `Alert` component, no glow)
- [ ] **Score bar simple?** (`bg-[color:var(--success)]`, no shimmer animation)
- [ ] **Bottleneck/warning clear?** (`Alert variant="warning"`, no pulse)
- [ ] **CTA to 12WeekSetup clear?** (gradient-brand, no hover:scale or reduced to [1.01])
- [ ] **White cards calm?** (shadow opacity 0.14, not 0.2+)
- [ ] **No backdrop-blur on content?** (backdrop-blur-2xl removed or reduced)

**Red Flags**:
- ❌ `backdrop-blur-2xl` on white/10 surfaces (hard to read)
- ❌ `.progress-shimmer` infinite on progress bars
- ❌ Shadow opacity >0.2 on white/82 cards

**Decision**:
- ✅ PASS
- ⚠️ PASS WITH MINOR ISSUES
- ❌ FAIL — TOO FLASHY
- ❌ FAIL — TOO FLAT/LOST FEEDBACK

**Issues Found**:
1. 
2. 

---

### 2.4 12WeekSetup Review
**URL**: `http://localhost:5173/12-week-setup` (need to complete Feasibility first)
**What to check**:
- [ ] **Plan summary clear?** (`border-2 border-primary` for hierarchy, no glow)
- [ ] **Milestone cards simple?** (`border border-slate-200`, no hover lift)
- [ ] **Plan quality warning clear?** (`Alert variant="warning"`, no shimmer)
- [ ] **Create Plan CTA clear?** (ONE gradient-brand, hover:scale-[1.01] or removed)
- [ ] **No gradient border glow?** (`glass-surface-gradient-border` removed)
- [ ] **On mobile: scrollable?** (no horizontal overflow)

**Red Flags**:
- ❌ `glass-surface-gradient-border` with `ambient-glow`
- ❌ Gradient buttons with shadow 0.52+ and hover:scale-[1.02]
- ❌ `transition-all` on OutcomeStep.tsx
- ❌ Violet shadow >0.3 on step shells

**Decision**:
- ✅ PASS
- ⚠️ PASS WITH MINOR ISSUES
- ❌ FAIL — TOO FLASHY
- ❌ FAIL — TOO FLAT/LOST FEEDBACK

**Issues Found**:
1. 
2. 

---

### 2.5 12WeekSystem Today
**URL**: `http://localhost:5173/12-week-system` (need to create plan first)
**Tab**: "Hôm nay"
**What to check**:
- [ ] **Primary task clear?** (`border-emerald-300 bg-white`, not glow)
- [ ] **Overdue/Rescue subtle?** (`border-amber-300 bg-amber-50`, no pulse/bounce)
- [ ] **Check-in CTA clear?** (gradient-brand, hover:scale-[1.01] or removed)
- [ ] **Completed task feedback subtle?** (`text-emerald-600` + `CheckCircle2`)
- [ ] **Cards not competing?** (shadows reduced to 0.16-0.28 opacity)
- [ ] **On mobile: readable?** (text-slate-200 or slate-300 on dark backgrounds)
- [ ] **With reduced motion: no pulse/bounce?** (infinite animations disabled)

**Red Flags**:
- ❌ `hover:scale-[1.02]` still on gradient buttons
- ❌ Card shadows still heavy (opacity >0.3)
- ❌ Pulse/bounce on overdue tasks
- ❌ Primary task glow too strong (emerald-400+ shadow)

**Decision**:
- ✅ PASS
- ⚠️ PASS WITH MINOR ISSUES
- ❌ FAIL — TOO FLASHY
- ❌ FAIL — TOO FLAT/LOST FEEDBACK

**Issues Found**:
1. 
2. 

---

### 2.6 Week Tab
**URL**: `http://localhost:5173/12-week-system`
**Tab**: "Tuần"
**What to check**:
- [ ] **Priority cards clear?** (`border-l-4 border-l-emerald-500`, no hover effects)
- [ ] **Charts/cards calm?** (`shadow-sm`, no 3D transforms)
- [ ] **Tab navigation clear?** (aria-current="page" styling, no glow)
- [ ] **On mobile: scrollable?** (no horizontal overflow)

**Red Flags**:
- ❌ `perspective()` 3D transforms on cards
- ❌ Hover lift on priority cards
- ❌ Heavy shadows (shadow-xl/2xl) on charts

**Decision**:
- ✅ PASS
- ⚠️ PASS WITH MINOR ISSUES
- ❌ FAIL — TOO FLASHY
- ❌ FAIL — TOO FLAT/LOST FEEDBACK

**Issues Found**:
1. 

---

### 2.7 Progress Tab
**URL**: `http://localhost:5173/12-week-system`
**Tab**: "Tiến độ"
**What to check**:
- [ ] **Charts/cards calm?** (`shadow-sm`, no 3D transforms)
- [ ] **Stats readable?** (no pulse-soft animation on values)
- [ ] **Insight clear?** (no shimmer on static elements)

**Red Flags**:
- ❌ `pulse-soft` infinite on stat values
- ❌ `perspective()` 3D transforms on cards
- ❌ Heavy shadows on chart containers

**Decision**:
- ✅ PASS
- ⚠️ PASS WITH MINOR ISSUES
- ❌ FAIL — TOO FLASHY
- ❌ FAIL — TOO FLAT/LOST FEEDBACK

**Issues Found**:
1. 

---

### 2.8 Settings Tab
**URL**: `http://localhost:5173/12-week-system`
**Tab**: "Cài đặt"
**What to check**:
- [ ] **Destructive actions clear?** (`variant="destructive"`, no glow or pulse)
- [ ] **Export/Delete/Sync clear?** (simple buttons, no decorative effects)
- [ ] **No anxiety-inducing effects?** (calm, not alarming)

**Red Flags**:
- ❌ Destructive buttons with glow (shadow >0.4)
- ❌ Pulse animation on warnings
- ❌ Heavy shadows on settings cards

**Decision**:
- ✅ PASS
- ⚠️ PASS WITH MINOR ISSUES
- ❌ FAIL — TOO FLASHY
- ❌ FAIL — TOO FLAT/LOST FEEDBACK

**Issues Found**:
1. 

---

## 3. Questions to Answer for Each Screen

### 3.1 Too many moving things?
**Pass**: Static or minimal motion (only loading states animate)
**Fail**: Ambient orbs floating, cursor glow following mouse, shimmer on static elements, 3D transforms on hover

### 3.2 Primary CTA clear?
**Pass**: ONE gradient-brand button per screen, others are `bg-slate-950` or `border-slate-300 bg-white`
**Fail**: 3+ gradient buttons competing, CTA lost in sea of other gradients

### 3.3 Cards "shiny" competing with content?
**Pass**: Shadow opacity 0.2-0.32, no glow, hero card distinguished by `border-2 border-primary`
**Fail**: Shadow opacity >0.4, multiple cards with glow, all cards look identical

### 3.4 Hover too scaley/lift?
**Pass**: `hover:scale-[1.01]` or color change only, `translateY(-1px)` or removed
**Fail**: `hover:scale-[1.02]` on 12+ elements, `translateY(-2px)` lift on every card

### 3.5 Warning/rescue too alarming?
**Pass**: `Alert variant="warning"` with amber-700, no pulse/bounce
**Fail**: Red/rose for warnings, pulse animation on overdue tasks, "ALERT" styling

### 3.6 Form easy to focus?
**Pass**: 100ms transitions, clear 2px focus ring, `input:focus` has `border-color` + `box-shadow`
**Fail**: 200-300ms transitions feel sluggish, focus ring missing or low contrast

### 3.7 Text readable on background/blur/gradient?
**Pass**: No `backdrop-filter: blur()` on content, text contrast ≥4.5:1 (WCAG AA)
**Fail**: `backdrop-blur(16px)` on cards, text on gradient has low contrast

### 3.8 On mobile: cluttered?
**Pass**: 390px viewport, no horizontal overflow, text readable without zooming
**Fail**: Content clipped, horizontal scroll, text too small, tap targets too close

### 3.9 With reduced motion: no animations?
**Pass**: `prefers-reduced-motion` disables all animations, keeps focus outlines
**Fail**: Animations still playing, 3D transforms still active, focus ring missing

---

## 4. Red Flags (Immediate Fail)

| Red Flag | Why | Severity |
|---|---|---|
| Infinite animation not loading | Decorative only, constant motion | 🔴 HIGH |
| `pulse/bounce` for warning/overdue | Makes users feel "alarmed" | 🔴 HIGH |
| >2 gradients on same screen | Competing CTAs, "SaaS landing page" feel | 🟠️ MEDIUM |
| Shadow/glow on 8+ cards | "Purple haze" effect, heavy feel | 🟠️ MEDIUM |
| `transition-all` on many elements | Performance cost, unnecessary | 🟡️ LOW |
| Transition >200ms | Feels sluggish, not instant | 🟡️ LOW |
| Focus ring missing | Accessibility violation | 🔴 HIGH |
| Task complete no feedback | Users don't know "saved" | 🟠️ MEDIUM |
| Primary CTA lost | Users don't know what to click | 🔴 HIGH |

---

## 5. Decision Rubric

### 5.1 PASS
- ✅ App feels calm, not "active"
- ✅ Primary CTA pops, others recede
- ✅ Cards have hierarchy without glow
- ✅ Hover effects subtle (color change, not scale/lift)
- ✅ Forms have clear focus (100ms, 2px ring)
- ✅ Text readable (no blur reducing contrast)
- ✅ Mobile usable (no overflow, readable)
- ✅ Reduced motion disables animations

### 5.2 PASS WITH MINOR ISSUES
- ⚠️ 1-2 minor issues (shadow opacity 0.28 instead of 0.2)
- ⚠️ Issue doesn't break usability
- ⚠️ Can be fixed in future cleanup sprint

**Example**: "Dashboard cards shadow 0.28 (should be 0.2), but CTA still clear and app feels calm."

### 5.3 FAIL — TOO FLASHY
- ❌ Competing gradients (>2 per screen)
- ❌ Heavy shadows (opacity >0.4) on multiple cards
- ❌ Infinite animations playing (orb-float, cursor-glow)
- ❌ `hover:scale-[1.02]` on 12+ elements
- ❌ 3D transforms still present on hero/cards

**Next Prompt**: (see Section 7 below)

### 5.4 FAIL — TOO FLAT/LOST FEEDBACK
- ❌ Focus ring missing (accessibility violation)
- ❌ Task completion no feedback (users don't know "saved")
- ❌ CTA lost (no visual distinction from secondary buttons)
- ❌ All cards flat (no hierarchy, users don't know which matters)

**Next Prompt**: (reverse the changes, add back subtle feedback)

---

## 6. How to Log Issues

### 6.1 Issue Format
```
Screen: [Dashboard | SMARTGoalSetup | Feasibility | 12WeekSetup | Today | Week | Progress | Settings]
Element: [Button | Card | Hero | Input | Warning | CTA]
Effect causing issue: [hover:scale-[1.02] | shadow 0.4 | orb-float infinite | etc.]
Severity: [HIGH | MEDIUM | LOW]
Suggested fix: [Reduce shadow to 0.2 | Remove infinite animation | Change transition-all to transition-colors | etc.]
```

### 6.2 Example Issue Log
```
Screen: Dashboard
Element: Gradient button "Mở trung tâm 12 tuần"
Effect causing issue: hover:scale-[1.02] (too much for 12+ buttons)
Severity: MEDIUM
Suggested fix: Change to hover:scale-[1.01] or remove scale, use hover:shadow-md instead

Screen: Today Tab
Element: Primary task card
Effect causing issue: border-emerald-400 shadow-[0_18px_...] (still too glowy)
Severity: LOW
Suggested fix: Reduce shadow opacity to 0.2, keep border-emerald-300 for hierarchy
```

---

## 7. Next Prompt if Still Too Flashy

```
QUOTA-SAFE MODE.

You are frontend engineer.
Task: Remove remaining flashy effects:

1. Remove `.ambient-orb` class and `@keyframes orb-float` from theme.css
2. Remove `.cursor-glow` class and mouse-tracking JS in `interactive-surface.tsx`
3. Remove `perspective()`, `rotateX()`, `rotateY()` from:
   - `.card-interactive-base` in theme.css
   - `.hero-surface` in theme.css
   - `.interactive-surface` in theme.css
4. Remove `transition-all` from remaining 12+ files:
   - SmartGoalHero.tsx
   - GoalTracker.tsx
   - ReflectionJournal.tsx
   - LifeInsight.tsx
   - FeasibilityStepShell.tsx
   - OutcomeStep.tsx
   - RootLayout.tsx
   - Various UI components
5. Replace with `transition-colors`, `transition-shadow`, or `transition-transform`
6. Run npm run typecheck
7. Run npm run build
8. Run npm run qa:visual-ux-ui for manual review

Constraints:
- Keep `prefers-reduced-motion` block
- Keep loading animations (shimmer, bounce)
- Keep focus states (`:focus-visible`)
- No business logic changes
- No layout changes
```

---

## 8. Summary Checklist

After reviewing ALL screens:
- [ ] Dashboard: ✅ PASS / ⚠️ MINOR / ❌ FAIL
- [ ] SMARTGoalSetup: ✅ PASS / ⚠️ MINOR / ❌ FAIL
- [ ] Feasibility: ✅ PASS / ⚠️ MINOR / ❌ FAIL
- [ ] 12WeekSetup: ✅ PASS / ⚠️ MINOR / ❌ FAIL
- [ ] Today Tab: ✅ PASS / ⚠️ MINOR / ❌ FAIL
- [ ] Week Tab: ✅ PASS / ⚠️ MINOR / ❌ FAIL
- [ ] Progress Tab: ✅ PASS / ⚠️ MINOR / ❌ FAIL
- [ ] Settings Tab: ✅ PASS / ⚠️ MINOR / ❌ FAIL

**Overall Verdict**:
- ✅ APP IS CALM (all screens PASS or MINOR)
- ⚠️ APP MOSTLY CALM (1-2 screens FAIL, needs more cleanup)
- ❌ APP STILL TOO FLASHY (3+ screens FAIL, run next prompt)

**Time to complete review**: ~30-45 minutes (8 screens × 4-5 minutes each)
