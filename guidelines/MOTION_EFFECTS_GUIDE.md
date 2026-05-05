# Motion Effects Guide

Date: 2026-05-05
Role: Senior UX/UI Engineer + Motion Design Lead
Mode: QUOTA-SAFE — guidelines only, no code changes

---

## 1. Motion Principles

### 1.1 Purposeful
Every animation must have a **clear UX reason**:
- **Feedback**: Button press, form focus, task completion
- **Guidance**: Page transitions, reveal on scroll, loading states
- **Hierarchy**: Current page indicator, active state, focus ring

If an effect is **decorative only** (ambient orbs, cursor glow, spotlight rings), **remove it**.

### 1.2 Subtle
Effects should be **barely noticeable** — users should feel the app is "responsive" not "animated":
- Hover: small color/border change, not scale or lift
- Focus: 2px outline, not glow or pulse
- Loading: simple shimmer or bounce, not complex animations

**Rule of thumb**: If a user comments "nice animation!", it's probably too much.

### 1.3 Fast
Motion should feel **instant** for UI feedback:
- Button hover: 100-150ms (not 200-300ms)
- Focus change: 100ms (not 200ms)
- Page transition: 200ms max (not 420ms)

**Why**: Users want to *do* things, not *watch* things in a productivity/coaching app.

### 1.4 Calm
The app is a **goal execution tool** — it should feel:
- Stable (not floating or tilting)
- Grounded (not 3D or parallax)
- Quiet (not perpetually moving)

**Avoid**: Infinite animations, floating elements, 3D transforms, mouse-tracking effects.

### 1.5 Accessible
**Every animation must respect `prefers-reduced-motion`**:
- Disable all animations
- Set transitions to `none` or `0.01ms`
- Keep functional states (focus outline, disabled opacity)

**Why**: Vestibular disorders, epilepsy, motion sensitivity — 15%+ of users are affected.

---

## 2. Recommended Defaults

### 2.1 Hover/Focus Transitions
```css
/* Good — specific, fast */
transition: colors 100ms ease;
transition: box-shadow 100ms ease;
transition: border-color 100ms ease;

/* Bad — generic, slow */
transition-all duration-200;  /* 200ms is too slow for hover */
transition-all duration-300;  /* 300ms feels sluggish */
```

**Rules**:
- Hover feedback: **100-150ms** max
- Focus change: **100ms** max
- Page enter: **200ms** max (not 420ms)

### 2.2 Dialog/Menu Transitions
```css
/* Good — snappy */
transition: opacity 150ms ease, transform 150ms ease;

/* Bad — too slow */
transition: all 300ms ease;  /* Dialogs should feel instant */
```

**Rule**: Max **200ms** for dialog/menu open/close.

### 2.3 Scale on Hover
```css
/* Good — barely noticeable */
hover:scale-[1.01]  /* 1% scale — almost invisible */
hover:scale-105     /* 5% scale — acceptable for cards */

/* Bad — too much */
hover:scale-[1.02]  /* 2% — adds up when 12+ elements do it */
hover:scale-110     /* 10% — feels "bouncy" */
```

**Rule**: Avoid scale on hover **entirely** if possible. Use `border-color`, `background-color`, or `box-shadow` instead.

### 2.4 Avoid `transition-all`
```tsx
/* Bad — animates ALL properties (performance cost) */
className="transition-all"

/* Good — animate only what changes */
className="transition-colors"           /* color, background-color, border-color */
className="transition-shadow"            /* box-shadow only */
className="transition-transform"          /* transform only */
className="transition-opacity"            /* opacity only */
className="transition-[colors,shadow]"  /* multiple specific properties */
```

**Why**: `transition-all` triggers GPU compositing for every property change — wasteful.

### 2.5 Infinite Animations
```css
/* Good — finite or loading-only */
animation: shimmer-move 1.8s ease-in-out;  /* One-shot, or loading state */

/* Bad — perpetual motion */
animation: shimmer-move 1.8s ease-in-out infinite;  /* Runs forever */
animation: orb-float 16s ease-in-out infinite;      /* Constant background motion */
```

**Rule**: Only **loading states** should have infinite animations. Everything else: finite or none.

### 2.6 Shadows for Hierarchy (Not Decoration)
```css
/* Good — subtle depth */
box-shadow: 0 1px 3px rgba(0,0,0,0.08);   /* card */
box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); /* elevated card */

/* Bad — decorative glow */
box-shadow: 0 18px 38px -24px rgba(109,40,217,0.52);  /* Heavy purple glow */
box-shadow: 0 26px 60px -34px var(--tone-hero-shadow);  /* Hero overkill */
```

**Rule**: Shadows should **separate layers**, not **sparkle**. Reduce opacity by 30-50% on gradient buttons.

### 2.7 Gradients — Minimal Use
```css
/* Good — one primary CTA */
.gradient-brand { background: linear-gradient(135deg, indigo-600, violet-500, pink-500); }

/* Bad — competing gradients */
/* Every button, card, hero, panel with gradient = "landing page" feel */
```

**Rule**: Max **1 gradient CTA per screen**. Use solid colors + borders for hierarchy.

---

## 3. Effects ALLOWED (Keep These)

### 3.1 Focus Ring (Accessibility Critical)
```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```
**Why**: Keyboard users MUST see where they are. Never remove.

### 3.2 Button Hover (Subtle Feedback)
```tsx
className="hover:bg-slate-50 hover:border-slate-300"  /* Subtle color change */
/* OR */
className="hover:shadow-md"                       /* Slightly deeper shadow */
```
**Why**: Users need to know "this is clickable". Keep subtle.

### 3.3 Input Focus (Form Usability)
```css
input:focus, textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79,70,229,0.14);
}
```
**Why**: Forms are critical in coaching app (SMART goals, 12-week setup). Clear focus = fewer errors.

### 3.4 Loading States (User Feedback)
```tsx
/* Skeleton shimmer — OK */
className="skeleton-shimmer"  /* One-shot or loading infinite */

/* Loading dots bounce — OK */
className="loading-dot"  /* 1.1s bounce for loading dialogs */
```
**Why**: Users need to know "something is happening". Keep only during actual loading.

### 3.5 Task Completion Feedback
```tsx
/* Checkmark appears — OK */
<CheckCircle2 className="text-emerald-600" />

/* Subtle background change — OK */
className="bg-emerald-50 transition-colors duration-100"
```
**Why**: Positive reinforcement when users complete tasks. Keep subtle.

### 3.6 Error/Success Feedback
```tsx
/* Alert appears — OK */
<Alert variant="destructive">...</Alert>

/* Toast notification — OK */
<Toaster />
```
**Why**: Users need to know "something went wrong" or "saved successfully". Keep clear but not flashy.

---

## 4. Effects to AVOID (Remove or Reduce)

### 4.1 Every Card Hover/Lift
```tsx
/* Bad — every card lifts on hover */
className="card-hover-lift hover:translateY(-2px)"

/* Why: 8-12 cards on Dashboard all lift = "bouncy" feel */
/* Fix: Use border-color or background change instead */
className="hover:border-primary hover:bg-white"
```

### 4.2 Pulse/Bounce Loops
```css
/* Bad — constant pulsing for no reason */
animation: pulse-soft 2.5s ease-in-out infinite;  /* Stat values */
animation: spotlight-ring 3.4s ease-in-out infinite;  /* Spotlight cards */

/* Why: Perpetual motion distracts from actual work */
/* Fix: Remove infinite, keep for loading states only */
```

### 4.3 Glow Around Many Cards
```css
/* Bad — multiple cards with purple glow */
box-shadow: 0 18px 38px -24px rgba(109,40,217,0.52);  /* On 15+ buttons/cards */

/* Why: Creates "purple haze" effect when many cluster */
/* Fix: Reduce opacity to 0.2-0.3, keep for CTA only */
box-shadow: 0 8px 20px -16px rgba(109,40,217,0.28);
```

### 4.4 Backdrop Blur on Content
```css
/* Bad — blur makes text harder to read */
backdrop-filter: blur(16px) saturate(1.15);  /* On glass-surface cards */

/* Why: Text on blurred surface has less contrast */
/* Fix: Remove blur, use solid background with opacity */
background: rgba(255,255,255,0.92);  /* Solid, readable */
```

### 4.5 Shadow-xl/2xl Everywhere
```tsx
/* Bad — heavy shadows on many elements */
shadow-xl   /* 20px blur */
shadow-2xl  /* 25px blur */

/* Why: Makes UI feel "heavy" and "floating" */
/* Fix: Use shadow-sm, shadow-md, or custom subtle shadows */
```

### 4.6 Gradients on Many Sections
```tsx
/* Bad — gradient background on hero, cards, panels, badges */
className="hero-surface"        /* Full gradient background */
className="gradient-brand"      /* Gradient button */
className="gradient-violet-pink" /* Gradient card */

/* Why: Competing gradients = "SaaS landing page" feel */
/* Fix: One gradient CTA per screen, solid colors for everything else */
```

---

## 5. Rules by Screen

### 5.1 Dashboard (Calm, CTA Clear)
**Current issues**: Too many effects, feels "active"
**Rules**:
- ONE gradient-brand CTA (already done ✅)
- NO ambient orbs, cursor glow
- NO glass-surface blur (use solid bg-white/92)
- Card hierarchy via `border-2 border-primary` (hero) vs `border border-slate-200` (secondary)
- NO hover lift on every card — use `hover:border-slate-300` only
- Simplify shadows: `shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]` max

### 5.2 SMART Goal Setup (Focused Form)
**Current issues**: 3D hero, gradient buttons, heavy shadows
**Rules**:
- Form inputs: clear focus, NO 3D effects
- Step indicator: simple `bg-primary` for active, NO glow
- Warning/suggestion: `Alert variant="warning"` with NO animation
- CTA: ONE gradient-brand, others `bg-slate-950 text-white`
- NO hero 3D transforms (`perspective()`, `rotateX()`)

### 5.3 Feasibility Check (Trustworthy)
**Current issues**: Flashy gradients, shimmer on progress
**Rules**:
- Result step: Clear ✅/⚠️/❌ with `Alert` component, NO glow
- Score bar: Simple `bg-[color:var(--success)]`, NO shimmer animation
- Bottleneck/warning: `Alert variant="warning"`, NO pulse
- CTA to 12WeekSetup: Clear, NO hover:scale

### 5.4 12Week Setup (Clear Hierarchy)
**Current issues**: Gradient borders, glow effects, milestone cards with hover
**Rules**:
- Review step: `border-2 border-primary` for plan summary (hierarchy, not glow)
- Milestone cards: Simple `border border-slate-200`, NO hover lift
- Plan quality warning: `Alert variant="warning"`, NO shimmer
- Create Plan CTA: ONE gradient-brand, NO hover:scale-[1.02]
- NO gradient border glow (`glass-surface-gradient-border`)

### 5.5 Today Tab (Primary Task Clear)
**Current issues**: Gradient CTAs, card shadows
**Rules** (already improved ✅):
- Primary task: `border-emerald-300 bg-white` (strong border, not glow)
- Overdue/Rescue: `border-amber-300 bg-amber-50`, NO pulse/bounce
- Check-in CTA: `gradient-brand`, NO hover:scale or reduce to `[1.01]`
- Completed task: `text-emerald-600` + `CheckCircle2`, subtle feedback only

### 5.6 Week/Progress/Settings Tabs
**Rules**:
- Week tab: Priority cards with `border-l-4 border-l-emerald-500`, NO hover effects
- Progress tab: Charts/cards with `shadow-sm`, NO 3D transforms
- Settings tab: Destructive actions with `variant="destructive"`, NO glow or pulse
- Export/Delete/Sync: Clear buttons, NO decorative effects

---

## 6. `prefers-reduced-motion` Policy

### 6.1 What to Disable
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
    scroll-behavior: auto !important;
  }

  /* Keep functional states */
  :focus-visible { outline: 2px solid var(--ring); }  /* Don't disable */
  .disabled { opacity: 0.5; }                          /* Don't disable */
}
```

### 6.2 What to Remove for Reduced Motion
- ❌ `ambient-orb` infinite float — REMOVE
- ❌ `cursor-glow` mouse tracking — REMOVE
- ❌ `shimmer` infinite on static elements — REMOVE (keep for loading)
- ❌ `pulse-soft` infinite — REMOVE
- ❌ `spotlight-ring` infinite — REMOVE
- ❌ `progress-shimmer` infinite — REMOVE (keep finite)
- ❌ `card-interactive-base` 3D transforms — REMOVE
- ❌ `hero-surface` 3D transforms — REMOVE
- ❌ `page-enter` animation — REMOVE or reduce to 200ms

### 6.3 What to KEEP Even with Reduced Motion
- ✅ `:focus-visible` outline — Accessibility requirement
- ✅ `disabled:opacity-50` — Clear disabled state
- ✅ `aria-current="page"` styling — Navigation clarity
- ✅ `loading-*` animations — Users need loading feedback
- ✅ `hover:bg-*` color changes — Still useful (no motion)

---

## 7. Checklist After Changes

### 7.1 Visual Check
- [ ] Dashboard feels calm (no competing animations)
- [ ] Only ONE gradient CTA per screen
- [ ] Cards have hierarchy (hero vs. secondary) without glow
- [ ] No infinite animations except loading states
- [ ] No 3D transforms or mouse-tracking effects
- [ ] No backdrop-blur on content cards

### 7.2 Interaction Check
- [ ] Hover feedback is subtle (color/border change, not scale/lift)
- [ ] Focus ring is visible on all interactive elements
- [ ] Button press has `active:scale-[0.98]` or similar
- [ ] Form inputs have clear focus state
- [ ] Page transitions feel instant (<200ms)

### 7.3 Accessibility Check
- [ ] `prefers-reduced-motion` disables animations
- [ ] `prefers-reduced-motion` keeps focus outlines
- [ ] No infinite animations playing
- [ ] No 3D transforms for vestibular users
- [ ] Text contrast still meets WCAG AA (no blur reducing readability)

### 7.4 Performance Check
- [ ] No `transition-all` (use specific transitions)
- [ ] No heavy blur effects (backdrop-filter) on many elements
- [ ] Animations use `will-change` sparingly
- [ ] No 26rem cursor glow with blur(56px)

---

## 8. Summary

| Principle | Rule |
|---|---|
| **Purposeful** | Every effect needs a UX reason. Remove decorative only. |
| **Subtle** | Hover = color change, not scale/lift. Focus = outline, not glow. |
| **Fast** | 100-150ms for hover, 200ms max for page transitions. |
| **Calm** | No infinite animations, 3D transforms, or mouse-tracking. |
| **Accessible** | `prefers-reduced-motion` disables all motion, keeps focus. |

| Effect | Keep? | Why |
|---|---|---|
| Focus ring `:focus-visible` | ✅ | Accessibility requirement |
| Button hover `hover:bg-*` | ✅ | Subtle feedback |
| Input focus `input:focus` | ✅ | Form usability |
| Loading shimmer/bounce | ✅ | User needs feedback |
| Task completion `CheckCircle2` | ✅ | Positive reinforcement |
| `prefers-reduced-motion` | ✅ | Vestibular accessibility |
| `ambient-orb` infinite float | ❌ | Decorative, constant motion |
| `cursor-glow` mouse tracking | ❌ | Performance cost, no UX value |
| `hover:scale-[1.02]` on 12+ elements | ❌ | Competing motion |
| `backdrop-filter: blur(16px)` | ❌ | Reduces readability |
| `perspective()` 3D transforms | ❌ | "Landing page" feel |
| `transition-all` | ❌ | Performance issue |
| `shadow-[0_18px_38px_...]` on 15+ buttons | ❌ | "Purple haze" |

---
