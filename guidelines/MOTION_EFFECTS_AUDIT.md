# Motion Effects Audit

Date: 2026-05-05
Role: Senior UX/UI Engineer + Motion Design Lead
Mode: QUOTA-SAFE — read-only, no code changes, no new dependencies

Source files:
- `src/styles/theme.css` (global CSS, animations, gradients, shadows)
- `src/app/components/ui/button.tsx` (button variants)
- `src/app/pages/Dashboard.tsx` (259 raw colors, many effects)
- `src/app/components/ui/*` (all UI components)
- Full `src/app/pages/*` (all page components)

---

## 1. Executive Summary

The app currently has **too many decorative motion effects** that make it feel like a SaaS landing page rather than a calm coaching/planning tool. Key issues:

- **189 custom shadow declarations** across components (shadow-[...] patterns)
- **25 hover:scale occurrences** (mostly scale-[1.02], some scale-110)
- **14 transition-all usages** (performance concern, applies to all properties)
- **Multiple infinite animations**: shimmer (1.8s infinite), orb-float (16-20s infinite), pulse-soft (2.5s infinite), loading-bounce (1.1s infinite)
- **Heavy gradient usage**: 30+ gradient utility classes in theme.css alone
- **Glassmorphism/blur effects**: backdrop-filter: blur() on multiple surfaces
- **3D transform effects**: perspective(), rotateX(), rotateY() on cards and hero surfaces
- **Cursor glow effect**: radial gradient following mouse (26rem size, blur(56px))

**Overall verdict**: The app feels "too active" with competing animations, excessive shadows, and 3D effects that distract from the core coaching/planning workflow.

---

## 2. Types of Effects Currently Used

### 2.1 Animations (Infinite/Repeating)
| Animation | Duration | Usage | Issue |
|---|---|---|---|
| `shimmer-move` | 1.8s ease-in-out infinite | Loading skeletons, shimmer elements | Perpetual motion on static elements |
| `orb-float` | 16-20s ease-in-out infinite | Ambient orbs (violet, cyan, rose) | Constant background movement |
| `pulse-soft` | 2.5s ease-in-out infinite | Stat values, glow effects | Unnecessary pulsing for non-loading elements |
| `loading-bounce` | 1.1s ease-in-out infinite | Loading dots | OK for loading only |
| `progress-shimmer` | 2.8s ease-in-out infinite | Progress bars | Constant motion on progress indicators |
| `spotlight-ring` | 3.4s ease-in-out infinite | Spotlight cards/badges | Decorative only, no UX value |

### 2.2 Hover Scale/Lift
| Pattern | Count | Issue |
|---|---|---|
| `hover:scale-[1.02]` | 12+ | Subtle but adds up across many elements |
| `hover:scale-110` | 1 (slider thumb) | Too aggressive for UI element |
| `translateY(-2px)` on hover | 3+ (glass-surface, card-hover-lift) | Card lift effect on many surfaces |
| `hover:-translate-y-0.5` | 2+ | Negative translate on hover |

### 2.3 Transitions
| Pattern | Count | Issue |
|---|---|---|
| `transition-all` | 14 | Performance: animates all properties, often unnecessary |
| `transition: transform 260ms ease` | 8+ | Slightly slow for UI feedback (200ms+ is noticeable) |
| `transition: box-shadow 260ms ease` | 8+ | Same as above |
| `transition: border-color 260ms ease` | 5+ | Border transitions don't need 260ms |
| `transition: background-color 260ms ease` | 5+ | Background transitions don't need 260ms |

### 2.4 Gradients
| Type | Count | Issue |
|---|---|---|
| `gradient-brand` (violet→pink→blue) | 6+ components | Overused for CTAs, creates "brand haze" |
| Hero gradients (hero-surface) | 3+ pages | Large gradient backgrounds on hero cards |
| Per-route tone gradients | 5 routes | `--tone-*` CSS variables create colored shells |
| Gradient text utility | 1 | `background-clip: text` gradient (OK if minimal) |
| Gradient borders (glass-surface-gradient-border) | 1 | Complex gradient borders |

### 2.5 Shadows/Glow
| Pattern | Count | Issue |
|---|---|---|
| `shadow-[0_18px_38px_-24px_rgba(109,40,217,0.52)]` | 15+ buttons | Identical purple shadow on all gradient buttons |
| `shadow-[0_22px_44px_-24px_rgba(109,40,217,0.58)]` (hover) | 15+ buttons | Hover shadow variation |
| `box-shadow: 0 26px 60px -34px var(--tone-hero-shadow)` | Hero surfaces | Heavy hero shadows |
| `box-shadow: 0 34px 84px -42px rgba(109,40,217,0.42)` | Spotlight cards | Very heavy glow |
| `filter: blur(56px)` | Ambient orbs, cursor glow | Heavy blur effects for decoration |

### 2.6 Blur/Glassmorphism
| Pattern | Issue |
|---|---|
| `backdrop-filter: blur(16px) saturate(1.15)` (glass-surface) | Blur on cards makes text harder to read |
| `backdrop-filter: blur(10px) saturate(1.1)` (glass-surface-sm) | Same issue on smaller surfaces |
| `backdrop-filter: blur(12px)` (pill-tag, bottom-nav) | Navigation blur unnecessary |
| `filter: blur(56px)` (cursor-glow, ambient-orb) | Heavy performance cost, decorative only |

### 2.7 3D Transform Effects
| Pattern | Issue |
|---|---|
| `perspective(1400px) rotateX() rotateY()` (card-interactive-base) | 3D card effect on hover, unnecessary complexity |
| `perspective(1600px) rotateX() rotateY()` (hero-surface, interactive-surface) | 3D hero effects, feel "gimmicky" for coaching app |
| `translate3d()` for pointer tracking | Complex mouse-tracking transforms on multiple components |
| `--card-rotate-x, --card-rotate-y` variables | Tracks mouse position for 3D tilt |

### 2.8 Decorative Backgrounds
| Pattern | Issue |
|---|---|
| `.app-shell::before` (radial-gradient overlays) | 3 radial gradients + linear gradient = busy background |
| `.app-shell::after` (dot grid pattern) | Subtle but adds visual noise |
| `.ambient-orb` (3 orbs, infinite float) | Constant background animation |
| `.cursor-glow` (mouse-following glow) | Tracks mouse, 26rem size, blur(56px) |

---

## 3. Top Files/Components with Most Effects

| File/Component | Effects Count | Description |
|---|---|---|
| `src/styles/theme.css` | 60+ | All global effects: animations, gradients, shadows, 3D transforms |
| `src/app/components/ui/button.tsx` | 8 | All button variants have hover:scale-[1.02], heavy shadows |
| `src/app/pages/Dashboard.tsx` | 12+ | Multiple gradient CTAs, shimmer, heavy card shadows |
| `src/app/components/ui/badge.tsx` | 3 | Gradient badges with shadows |
| `src/app/pages/12WeekSetup/components/SetupStepShell.tsx` | 2 | Gradient buttons with hover:scale |
| `src/app/pages/SMARTGoalSetup/components/SmartGoalStepShell.tsx` | 2 | Gradient buttons with hover:scale |
| `src/app/components/twelve-week/TwelveWeekTodayTab.tsx` | 2 | Gradient CTAs with hover:scale |
| `src/app/components/interactive-surface.tsx` | 8+ | 3D transform, mouse tracking, shine effects |
| `src/app/components/RootLayout.tsx` | 5+ | Navigation items with transition-all |

---

## 4. Top 15 Most Distracting Effects

1. **`.ambient-orb` infinite float animation** (16-20s) — Constant background movement for no UX reason
2. **`.cursor-glow` mouse-tracking glow** — 26rem blur(56px) effect following cursor, performance cost
3. **`hover:scale-[1.02]` on 12+ buttons** — Subtle but creates "everything scales" feeling
4. **`gradient-brand` buttons with identical purple shadows** — Creates "purple haze" when multiple CTAs cluster
5. **`.shimmer` infinite animation** (1.8s) — Perpetual shimmer on static elements, not just loading
6. **`.glass-surface` backdrop-filter: blur(16px)** — Makes text harder to read, unnecessary for cards
7. **`.card-interactive-base` 3D transforms** — perspective(1400px) rotateX/Y for card hover, too "marketing landing page"
8. **`.hero-surface` 3D transforms** — perspective(1600px) for hero cards, unnecessary complexity
9. **`.pulse-soft` infinite animation** (2.5s) — Pulsing glow on stat values, feels "dashboard-y"
10. **`transition-all` on 14 components** — Performance issue, animates all properties unnecessarily
11. **`.spotlight-card` spotlight-ring animation** (3.4s infinite) — Decorative ring pulse, no UX value
12. **`.progress-indicator::before` shimmer** (2.8s infinite) — Constant motion on progress bars
13. **`shadow-[0_18px_38px_...]` on 15+ buttons** — Heavy shadows make UI feel "heavy"
14. **`.app-shell::before` 3 radial gradients** — Busy background pattern under content
15. **`.page-enter` animation** (420ms cubic-bezier) — Page transitions are slow for a SPA

---

## 5. Effects to KEEP (Usability Value)

| Effect | Why Keep |
|---|---|
| `:focus-visible` outline (2px solid var(--ring)) | Accessibility: keyboard focus must be visible |
| `button:active:translate-y-0` (active:scale-[0.985]) | Touch feedback: subtle press effect |
| `input:focus` border-color + box-shadow | Form usability: clear focus state |
| `loading-*` animations (bounce, shimmer) | Loading state: users need feedback |
| `bottom-nav-item[aria-current="page"]` background | Navigation: clear current page indicator |
| `app-*` accent tokens | Branding: calm shared accent color system |
| `.reveal-block` (scroll-triggered reveal) | UX: progressive disclosure for long content |
| `disabled:opacity-50` | Standard: disabled state clarity |

---

## 6. Effects to REDUCE or REMOVE

| Effect | Action | Why |
|---|---|---|
| `.ambient-orb` infinite float | REMOVE | Constant background motion, no UX value |
| `.cursor-glow` mouse tracking | REMOVE | Performance cost, decorative only |
| `hover:scale-[1.02]` on buttons | REDUCE to hover:scale-[1.01] or remove | Too many elements scale |
| `gradient-brand` shadow `[0_18px_38px_...]` | REDUCE opacity (0.52→0.32) | Heavy glow on every gradient button |
| `.shimmer` infinite on static elements | REMOVE infinite, keep for loading only | Perpetual motion for no reason |
| `.glass-surface backdrop-filter: blur(16px)` | REMOVE blur | Text readability suffers |
| `.card-interactive-base` 3D transforms | REMOVE perspective/rotateX/Y | Too "landing page" |
| `.hero-surface` 3D transforms | SIMPLIFY | Keep gradient, remove 3D tracking |
| `.pulse-soft` infinite | REMOVE or make finite | Stat values don't need infinite pulse |
| `transition-all` | REPLACE with specific transitions | Performance: transition-colors, transition-shadow only |
| `.spotlight-card spotlight-ring` | REMOVE animation | Decorative only |
| `.progress-indicator` shimmer | REMOVE infinite | Progress bars don't need constant shimmer |
| `shadow-[0_26px_60px_...]` on heros | REDUCE to shadow-lg or shadow-xl | Heavy shadows feel "heavy" |
| `.app-shell::before` radial gradients | REDUCE opacity or simplify | Busy background |
| `.page-enter` 420ms | REDUCE to 200ms | Page transitions feel slow |

---

## 7. Screens with Most Effects Overload

### 7.1 Dashboard (Worst Offender)
**Effects count**: 12+ competing effects
- 3+ gradient-brand buttons (reduced to 1 in previous task ✅)
- Multiple cards with glass-surface + backdrop-filter: blur()
- Shimmer effects on loading states
- Card hover lift effects
- Heavy shadows on all cards
- Ambient orbs floating in background
- Cursor glow following mouse

**Verdict**: Still too "active" after gradient reduction. Needs:
- Remove glass-surface blur
- Remove ambient orbs
- Remove cursor glow
- Simplify card shadows

### 7.2 SMARTGoalSetup
**Effects count**: 8+ effects
- Gradient buttons with hover:scale
- Step shell with transition-all
- Hero section with 3D transforms
- Heavy shadows on CTAs

**Verdict**: Form-heavy page needs calm, focused feel. Reduce:
- Remove hero 3D transforms
- Simplify button hover effects
- Reduce shadow heaviness

### 7.3 FeasibilityCheck
**Effects count**: 6+ effects
- ResultStep with heavy gradients
- Gradient backgrounds for status panels
- Shimmer on progress indicators

**Verdict**: Needs to feel trustworthy, not flashy. Reduce:
- Simplify gradient backgrounds
- Remove progress shimmer
- Tone down status panel styling

### 7.4 12WeekSetup
**Effects count**: 10+ effects
- SetupStepShell with gradient CTAs + hover:scale
- Review step with glow effects
- Plan summary with gradient borders
- Milestone cards with hover effects

**Verdict**: Plan setup needs hierarchy, not glow. Reduce:
- Remove gradient border glow
- Simplify step shell hover effects
- Use border/background hierarchy instead of shadows

### 7.5 12WeekSystem Today
**Effects count**: 8+ effects (improved in previous task ✅)
- Primary task hero with border-emerald-300
- Gradient CTAs with hover:scale
- Rescue/overdue panels with subtle styling

**Verdict**: Improved but still has:
- Gradient CTA hover:scale (keep minimal)
- Card shadows could be simpler

### 7.6 Week/Progress/Settings Tabs
**Effects count**: 6+ each
- Week: Priority cards with hover effects
- Progress: Multiple chart cards with shadows
- Settings: Destructive actions with glow

**Verdict**: Each tab has competing effects. Simplify:
- Remove hover effects from data cards
- Reduce shadow heaviness
- Keep focus states only

---

## 8. Accessibility Risks

### 8.1 `prefers-reduced-motion` Support
**Current state**: NOT explicitly defined in theme.css
- Animations will play for users who need reduced motion
- No `@media (prefers-reduced-motion)` block found

**Risk**: Users with vestibular disorders, epilepsy, or motion sensitivity will experience discomfort

**Fix needed**: Add global `prefers-reduced-motion` media query to:
- Set `animation: none !important`
- Set `transition: none !important`
- Disable 3D transforms and parallax effects

### 8.2 Focus Visibility
**Current state**: `:focus-visible` defined with `outline: 2px solid var(--ring)` ✅
- `outline-offset: 2px` ✅
- `.focus-ring` class available ✅

**Risk**: LOW — focus states are well-defined

### 8.3 Motion Sickness Risk
**High-risk effects**:
1. `.ambient-orb` infinite float (16-20s, large blur) — Constant peripheral motion
2. `.cursor-glow` mouse tracking (26rem, blur(56px)) — Follows cursor everywhere
3. `.card-interactive-base` 3D tilt (perspective + rotateX/Y) — Simulates "tilting card" motion
4. `.hero-surface` 3D tilt — Same as above for hero cards
5. `.shimmer` infinite on static elements — Perpetual motion

**Users affected**: Vestibular disorders, epilepsy (rapid shimmer), motion sensitivity

### 8.4 Low Contrast from Blur/Gradient
**Risk patterns**:
- `backdrop-filter: blur(16px)` on `.glass-surface` — Text on blurred surface has less contrast
- Heavy gradient backgrounds (hero-surface) — Text needs high contrast on gradients
- `gradient-brand` buttons — White text on gradient: 8.12:1 ✅ (WCAG AA pass)

**Verdict**: Gradient contrast is OK, but blur effects reduce readability

### 8.5 Color-Only Status Feedback
**Current state**: Uses semantic tokens (`--success`, `--warning`, `--destructive`, `--info`) ✅
- Badge variants for status ✅
- Icon + color for status ✅

**Risk**: LOW — Status uses multiple indicators (color + icon + text)

---

## 9. Strategy for Fixing (Priority Order)

### Phase 1: Remove Decorative Only (No UX Impact)
1. Remove `.ambient-orb` and animation
2. Remove `.cursor-glow` effect
3. Remove `.spotlight-card spotlight-ring` animation
4. Remove `.pulse-soft` infinite from stat values
5. Remove `.shimmer` infinite from static elements (keep for loading)

### Phase 2: Simplify Hover/Transition (Reduce Noise)
1. Remove `hover:scale-[1.02]` from buttons OR reduce to `[1.01]`
2. Replace `transition-all` with specific transitions (`transition-colors`, `transition-shadow`)
3. Reduce transition durations: 260ms → 150ms, 200ms → 100ms
4. Remove `translateY(-2px)` hover lift from cards OR reduce to `-1px`

### Phase 3: Reduce Shadows/Glow (Calm the UI)
1. Reduce `shadow-[0_18px_38px_...]` opacity: 0.52 → 0.32
2. Remove `backdrop-filter: blur()` from glass-surface, glass-surface-sm
3. Simplify hero shadows: `0_26px_60px` → `0_18px_40px`
4. Remove heavy glow from non-CTA elements

### Phase 4: Remove 3D Effects (Stop "Landing Page" Feel)
1. Remove `perspective()`, `rotateX()`, `rotateY()` from `.card-interactive-base`
2. Remove `perspective()`, `rotateX()`, `rotateY()` from `.hero-surface`
3. Remove `translate3d()` mouse tracking from interactive surfaces
4. Keep flat, calm card surfaces with simple borders/shadows

### Phase 5: Add `prefers-reduced-motion` Support
1. Add `@media (prefers-reduced-motion)` block in theme.css
2. Disable all animations, transitions, 3D transforms
3. Test with OS reduced motion setting enabled

### Phase 6: Gradient Reduction (Brand Calm)
1. Limit `gradient-brand` to ONE primary CTA per screen (already done for Dashboard ✅)
2. Simplify per-route `--tone-*` gradients if too heavy
3. Use solid colors + border hierarchy instead of gradients for card distinction

---

## 10. Summary

| Aspect | Finding |
|---|---|
| **Worst offender** | Dashboard: 12+ competing effects, ambient orbs, cursor glow |
| **Most distracting** | Ambient orbs (infinite float), cursor glow (26rem blur), hover:scale on 12+ buttons |
| **Effects to KEEP** | Focus states, loading animations, active:press feedback, form focus |
| **Effects to REMOVE** | Ambient orbs, cursor glow, spotlight-ring, shimmer on static elements |
| **Effects to REDUCE** | hover:scale, shadow opacity, transition duration, 3D transforms |
| **Accessibility gap** | No `prefers-reduced-motion` support |
| **Motion sickness risk** | HIGH from ambient orbs, cursor glow, 3D card/hero effects |
| **Next step** | Create MOTION_EFFECTS_GUIDE.md with clear rules |
| **After that** | Implement Phase 1-3 in theme.css + key components |

---

## 11. Files to Change (Preview)

| File | Changes Needed |
|---|---|
| `src/styles/theme.css` | Remove ambient orbs, cursor glow, add prefers-reduced-motion, simplify transitions |
| `src/app/components/ui/button.tsx` | Remove hover:scale or reduce, reduce shadow opacity |
| `src/app/components/interactive-surface.tsx` | Remove 3D transforms, mouse tracking |
| `src/app/components/ui/card.tsx` | Remove glass-surface blur, simplify shadows |
| `src/app/pages/Dashboard.tsx` | Already reduced gradients ✅, remove remaining glow effects |
| All pages with `transition-all` | Replace with specific transitions |
| All pages with `hover:scale-[1.02]` | Reduce or remove |

---
