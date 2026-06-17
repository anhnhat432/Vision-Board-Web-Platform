# Dear Our Future - Visual Execution Spec

This document turns `docs/DESIGN.md` into practical screen-level and component-level execution guidance.

Use it when an AI agent or developer needs to redesign, polish, or verify a product screen. It does not replace `docs/DESIGN.md`; it makes the visual direction easier to execute consistently in code.

Required reading order before UI work:

```text
AGENTS.md
-> docs/DESIGN.md
-> docs/VISUAL_EXECUTION_SPEC.md
-> guidelines/CURRENT_PROJECT_STATUS.md
```

If these documents disagree, preserve production safety and code-backed scope first.

---

## 1. Visual Positioning

The product should feel like:

```text
A warm guided planning studio with visible progress, personal reflection, and a calm execution rhythm.
```

It should not feel like:

```text
A generic SaaS dashboard
A long survey
A spreadsheet
A motivational landing page inside the app
A decorative moodboard with weak execution
```

The visual formula:

```text
Warm product surface
+ one meaningful visual anchor
+ one focused decision
+ one outcome-based CTA
+ restrained motion
```

Design inspiration may come from:

- Notion-like clarity for reading and editing.
- Linear-like restraint for execution surfaces.
- Pinterest/studygram mood only for vision-board and reflective moments.
- Personal growth workbook structure for guided prompts.

Do not copy any reference directly. Translate the feeling into this app's tokens, components, and production flow.

---

## 2. Non-Negotiable Product Frame

The core journey is:

```text
Onboarding
-> Life Balance
-> Life Insight
-> SMART Goal
-> Feasibility Check
-> 12-Week Plan
-> Weekly Execution
-> Reflection/Review
```

Every core screen must answer within five seconds:

```text
Where am I?
What am I deciding or doing?
What will happen when I click the main CTA?
```

Side surfaces such as Vision Board, Order Kit, Achievements, and Admin may be beautiful, but they must not outrank the next core action.

---

## 3. Token Contract

Use semantic tokens from `src/styles/tokens.css` and `tailwind.config.js`. The style entry is `src/styles/index.css`, importing `fonts.css -> order-theme.css -> tailwind.css -> tokens.css -> theme.css`. Tokens are layered Primitive -> Semantic -> Component; consume only semantic/component tokens in components, never primitives.

Anchor values (for reference, not for direct hardcoding):

| Concept | Token | Value |
| --- | --- | --- |
| Brand accent base | `--app-accent` (`--green-700`) | `#2A5447` |
| Warm/reflection base | `--app-warm` (`--terra-600`) | `#A8522F` |
| Page canvas | `--app-bg` (`--neutral-050`) | `#FCFAF7` |
| Ink | `--app-ink` (`--neutral-950`) | `#1A1A1A` |
| Card radius | `--app-radius-card` | `14px` |
| Input radius | `--app-radius-input` | `10px` |
| Control radius | `--app-radius-control` | `11px` |

Default classes:

| Role | Use |
| --- | --- |
| Page canvas | `bg-app-bg text-app-ink` |
| Surface | `bg-app-surface border border-app-line rounded-card shadow-app-sm` |
| Subtle nested area | `bg-app-bg-subtle border border-app-line` |
| Primary text | `text-app-ink` |
| Secondary text | `text-app-ink-soft` |
| Muted text | `text-app-ink-muted` |
| Primary action | `bg-app-accent text-white hover:bg-app-accent-hover` |
| Selected/soft action | `bg-app-accent-soft text-app-accent` |
| Hover row | `hover:bg-app-accent-subtle` |
| Reflection only | `bg-app-warm-soft text-app-warm border-app-warm-border` |
| Radius | `rounded-card`, `rounded-input`, `rounded-control`, `rounded-pill` |
| Shadow | `shadow-app-sm`, `shadow-app-md`, `shadow-app-lg` |
| Fonts | `font-sans`, `font-serif` |

Do not use:

- Raw hex colors in JSX for new UI.
- Primitive CSS vars such as `--green-700` directly in components.
- Random Tailwind colors such as `slate-*`, `emerald-*`, `amber-*`, or `purple-*` for brand surfaces.
- New gradients, glow colors, or shadow systems unless tokens are intentionally updated.
- `app-warm-*` outside Reflection/Review without a documented reason.

Status colors should use existing status tokens or existing component-level danger/success patterns.

Known token-system caveats (verified in code):

- Three shadow systems coexist: `--app-shadow-*` (the official product scale, exposed as `shadow-app-*`), the Material-style `--shadow-1..5` (via `.elevation-*`), and `--shadow-glow-*`. Use only `shadow-app-*` for product cards. Do not add a fourth system or mix the others into core-journey surfaces.
- `sidebar-*` tokens in `theme.css` still use the stock shadcn palette (neutral grey `oklch` + `--sidebar-primary: #030213` near purple-black in light, a purple/blue hue in dark). They are not mapped to `--app-accent`. When touching the sidebar, map them to brand/semantic tokens.
- `Be Vietnam Pro` is declared first in the `sans` stack but is not imported in `fonts.css`; sans text falls back to Inter unless the font is locally installed. Treat brand sans as "Inter until Be Vietnam Pro is imported".
- Live decorative classes still exist in `theme.css` (`washi-tape-*`, `studio-pin`, `surface-glass*`, `glass-surface*`, `ambient-glow`, the `product-visual` family, the `--tone-*` route tones). Keep vibrant tones on marketing/public surfaces; do not pull them into the core journey.

---

## 4. Page Shells

### 4.1 Core Guided Screen

Use for onboarding, Life Balance, Life Insight, SMART Goal, Feasibility, and 12-week setup.

```text
App/page shell
  top context row
    journey label / progress / sync state if relevant
  main grid
    primary working surface
      short step label
      title
      one-sentence guidance
      input or choice
      primary CTA cluster
    visual anchor surface
      preview / score shape / report / roadmap
```

Desktop:

- Use a constrained page width, usually `max-w-6xl`.
- Prefer a two-column layout only when the visual anchor clarifies the task.
- Suggested grid ratio: working surface 7 columns, visual anchor 5 columns.
- Keep the visual anchor sticky only if it does not hide important content.

Mobile:

- Single column.
- Put the visual anchor before the input when it explains the task.
- Put the visual anchor after the input when it previews the result.
- Keep the primary CTA reachable, but do not cover inputs with sticky controls.

### 4.2 Execution Workspace

Use for Today, Weekly Execution, and progress tracking.

```text
Context row
  week / date / sync state
Main action band
  today's focus
  1-3 priority actions
  progress/check-in
Supporting sections
  upcoming tasks / notes / review prompts
```

The work surface should dominate. Decorative chrome should recede.

### 4.3 Reflection Surface

Use for Reflection/Review.

```text
Warm context header
  week/result summary
Prompt surface
  1 reflection question at a time
Adjustment surface
  one change for next week
CTA
  save reflection / plan next week
```

Reflection may use `app-warm-*` tokens. Execution and planning screens should not.

### 4.4 Billing, Settings, Legal

Use restrained product UI.

- No dreamy ambiguity.
- No mock/demo wording in real mode.
- No fake urgency.
- Clear account-bound copy.
- Clear support/legal links.
- Strong error and pending states.

---

## 5. Component Recipes

### 5.1 Step Header

Use for route-level guided steps.

Content:

- Tiny context label: "Step 2 of 6", "Week 4", or current flow name.
- Title: outcome-oriented, 6-12 words when possible.
- Guidance: one short sentence.
- Optional progress indicator.

Style:

- Context label: `text-xs font-semibold uppercase tracking-wide text-app-accent`.
- Title: `font-serif text-3xl sm:text-4xl leading-tight text-app-ink`.
- Guidance: `text-sm sm:text-base leading-6 text-app-ink-soft`.

Avoid:

- Technical labels such as "configuration module".
- Multiple subtitles.
- Hero-scale type inside compact panels.

### 5.2 Visual Anchor Panel

Use when a visual explains state, progress, or output.

Examples:

- Life balance shape.
- SMART goal preview.
- Feasibility meter.
- 12-week roadmap.
- Today progress map.
- Reflection prompt card.

Style:

- `rounded-card border border-app-line bg-app-surface shadow-app-sm`.
- Reserve stable dimensions with `min-h`, `aspect-ratio`, or fixed grid tracks.
- Use `bg-app-bg-subtle` only for quiet nested areas.
- Concentric radius: nested controls inside a `rounded-card` panel should use `rounded-input`/`rounded-control` so the inner corner sits inside the outer (`outer = inner + padding`), never another 14px.
- Images in the panel get a 1px inset outline (`outline` with `outline-offset: -1px`), not a border, so the frame reads intentionally and layout does not shift.
- Keep one depth strategy: `shadow-app-sm` only. Do not introduce `.elevation-*` or glow shadows on the same panel.

Avoid:

- Decorative icon grids.
- Pure gradients.
- Images or illustrations that do not reveal product state.
- Layout shift when the visual changes.

### 5.3 Guided Input Card

Use for the current question or decision.

Content:

- One question.
- One example close to the input.
- The input/control.
- Inline validation or helper copy.

Style:

- Prefer plain layout inside a single parent surface.
- Labels should be near controls.
- Example text should be visually softer, not hidden.

Avoid:

- Showing every advanced option at once.
- Nesting multiple bordered cards inside the input card.
- Tooltips that contain essential instructions.

### 5.4 Choice Card

Use for selecting a focus, intent, template, or option.

Style:

- Unselected: `border-app-line bg-app-surface text-app-ink`.
- Hover: `hover:bg-app-accent-subtle`.
- Selected: `border-app-accent bg-app-accent-soft text-app-accent`.
- Use icon only if it improves scanning.

Rules:

- Whole card should be clickable when it represents one choice.
- Selected state must not rely on color only.
- Keep cards equal height in a grid.

### 5.5 Primary CTA Cluster

Use at the end of the working surface or sticky bottom on mobile when appropriate.

Structure:

```text
Secondary action    Primary action
```

Mobile:

```text
Primary action full width
Secondary action quiet below or above
```

Rules:

- One primary CTA per screen.
- Button label should name the result, not the mechanism.
- Secondary action must be visibly quieter.
- Destructive actions must use an app confirmation dialog.

Good CTA patterns:

```text
Reveal my Life Insight
Choose this focus
Create my SMART goal
Build my 12-week plan
Start this week
Save reflection
```

Weak CTA patterns:

```text
Next
Continue
Submit
OK
Done
```

### 5.6 Insight Card

Use for personal report moments.

Content:

- The user's current state.
- Why it matters.
- Suggested next step.

Style:

- May use `font-serif` for the insight headline.
- Keep body copy short and concrete.
- Use one visual marker, not a cluster of decorative icons.

Avoid:

- Analytics-dashboard layout.
- Long psychological explanations.
- Judgmental scoring language.

### 5.7 Week Card

Use for 12-week planning and execution.

Content:

- Week number.
- Main focus.
- 1-3 priority actions.
- Progress indicator.
- Review/check-in affordance if relevant.

Style:

- Keep cards compact and comparable.
- Use tabular numbers if showing progress or counts.
- Avoid large repeated shadows.

Mobile:

- Stack week cards.
- Keep the current week visually stronger than future weeks.

### 5.8 State Block

Use for empty, loading, error, success, offline, and sync states.

Each state must include:

- What is happening.
- What remains safe.
- What the user can do next.

Examples:

```text
We could not save to the server yet.
Your changes are still saved on this device.
Try syncing again.
```

Avoid:

- "Error occurred."
- Blank loading screens.
- Success messages with no next step.

Modern failure modes to design out (from `ux-audit`, ship-readiness tiers):

- Release-blocker: form data loss on validation error (re-render wipes user input), broken/missing critical-path error state (sync/billing/auth), focus traps in dialogs that never restore focus on close, optimistic UI with no rollback when the request fails.
- Fix-this-sprint: missing skeleton for a known-shape load, generic loading copy ("Loading…") where a specific message helps, missing empty-state CTA, sub-44px touch target on a primary mobile control.
- Skeleton must match the final layout shape and reserve the same dimensions, or it causes layout shift (CLS) when content arrives. Reserve space with `min-h`/`aspect-ratio`.
- For React surfaces, prefer modern APIs for these states: `useActionState` + `useFormStatus` for form submit/pending, `useOptimistic` for optimistic updates with rollback, `useTransition` for non-blocking triggers, `<Suspense fallback={<Skeleton/>}>` for async reads. Do not block auth/billing/sync submission behind motion.
- Local-first nuance: a sync error is not a data-loss error. Always state that local data is safe and offer "try again", never imply progress was lost.

---

## 6. Typography Execution

Font roles:

- `font-serif`: emotional route titles, insight moments, reflection prompts, vision-board moments.
- `font-sans`: body, controls, forms, labels, navigation, dense execution UI.

Recommended scale:

| Element | Class direction |
| --- | --- |
| Route title | `font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight` |
| Step title inside panel | `font-serif text-2xl sm:text-3xl leading-tight` |
| Section title | `font-sans text-lg sm:text-xl font-semibold leading-snug` |
| Card title | `text-base sm:text-lg font-semibold leading-snug` |
| Body | `text-sm sm:text-base leading-6 text-app-ink-soft` |
| Helper/caption | `text-xs sm:text-sm leading-5 text-app-ink-muted` |
| Button | `text-sm font-semibold` |
| Tiny context label | `text-xs font-semibold uppercase tracking-wide` |

Rules:

- Do not scale font size with viewport width.
- Do not use negative letter spacing.
- Do not mix multiple display styles on one screen.
- Avoid paragraphs longer than 2-3 lines inside cards.
- If body copy feels long, reduce scope or use progressive disclosure instead of shrinking text.
- Buttons and badges must not clip Vietnamese text.

Craft rules (from `typography-audit`):

- Line height is unitless. Body `~1.45-1.5`; large serif route titles `~1.1-1.2`; small captions `~1.4`. A unitless value scales with font size and prevents heading line overlap.
- Keep prose measure at `45-75` characters. Constrain long copy with `max-w-prose` / `max-w-[65ch]`; do not let body text span a full desktop width.
- Never letterspace body text. The font is already spaced for reading; negative tracking on Vietnamese copy crowds diacritics. Slight positive tracking is allowed only on tiny uppercase eyebrow labels.
- Use `font-variant-numeric: tabular-nums` for scores, progress, money, counts, and week numbers so digits align.
- Use real punctuation in display copy: curly quotes, en/em dashes, and a real ellipsis (`…`). Straight quotes and `...` read as amateur typography.
- Do not fake bold or italic. Use a weight/style the font actually ships (Source Serif 4 Variable and Inter both ship true weights/italics).

---

## 7. Spacing, Density, and Surface Hierarchy

Use a 4px spacing grid.

Defaults:

| Pattern | Direction |
| --- | --- |
| Page horizontal padding | `px-4 sm:px-6 lg:px-8` |
| Page vertical padding | `py-6 sm:py-8` |
| Major section gap | `gap-6 sm:gap-8` |
| Inside card padding | `p-5 sm:p-6` |
| Compact card padding | `p-4` |
| Form field gap | `space-y-2` or `gap-2` |
| Related controls gap | `gap-3` |
| Card grid gap | `gap-4 sm:gap-5` |

Surface rules:

- Use one main framed surface per screen section.
- Do not put cards inside cards unless the inner item is independently selectable/editable.
- Remove borders that do not clarify grouping.
- Use shadows sparingly. Prefer `shadow-app-sm`.
- A screen with five equal cards usually needs stronger hierarchy, not prettier cards.

Density test:

```text
If the user scans only headings, labels, and CTAs, can they understand the screen?
```

If not, the screen needs better structure, not more explanatory text.

---

## 8. Motion Execution

Motion should clarify progress and make transitions calmer. It should not decorate every object.

Allowed:

- Route/step enter.
- Short reveal after a result is generated.
- Progress fill.
- Small hover/tap feedback.
- Short stagger for small lists.

Avoid:

- Continuous loops except loading indicators.
- Bouncy or playful motion in production-critical flows.
- Animating long task lists.
- Animating form inputs while typing.
- Motion that delays auth, billing, sync, or form submission.

Defaults:

| Motion | Duration | Transform |
| --- | --- | --- |
| Hover/tap | 120-160ms | scale 0.98-1.01 max |
| Small reveal | 160-220ms | opacity + translateY 4-8px |
| Page/step enter | 180-250ms | opacity + translateY 8-16px |
| Progress fill | 200-350ms | width/scaleX only when space is reserved |
| Stagger | 30-50ms per item | max 6-8 items |

Reduced motion:

- Respect `prefers-reduced-motion`.
- With Framer Motion, use `useReducedMotion`.
- Reduced-motion mode should render final state without transform/stagger.

---

## 9. Screen Blueprints

### 9.1 Onboarding

Goal:

```text
Help the user start without feeling surveyed.
```

First viewport should include:

- Warm step header.
- One small promise of what they will get.
- One starting action.
- A visual preview of the journey or first result.

Avoid:

- Long intro copy.
- Multiple equal start buttons.
- Decorative breathing/zen visuals that delay the first meaningful result unless clearly optional.

### 9.2 Life Balance

Goal:

```text
Turn subjective scores into a visible balance shape.
```

Preferred layout:

```text
Desktop: controls/current area on left, balance shape on right.
Mobile: balance shape near top, one area control at a time.
```

Must show:

- The score is based on current feeling, not objective judgment.
- Progress through areas.
- Strongest area and focus/weakest area after completion.
- CTA that reveals insight.

Avoid:

- A long list of identical sliders on mobile.
- Making low scores feel like failure.

### 9.3 Life Insight

Goal:

```text
Present a personal report that leads to one focus.
```

Structure:

```text
Personal insight card
-> focus selection
-> why it matters
-> next step CTA
```

Avoid:

- Too many charts.
- Long explanations.
- Ending without a SMART Goal CTA.

### 9.4 SMART Goal Setup

Goal:

```text
Guide a vague wish into a concrete SMART goal.
```

Structure:

```text
Step question
-> example
-> input
-> SMART preview / clarity check
-> next CTA
```

Rules:

- Keep examples close to each input.
- Preserve user input through validation and navigation.
- Keep the preview visually useful, not decorative.

Avoid:

- Showing all SMART fields as one dense form.
- Technical labels without plain-language guidance.

### 9.5 Feasibility Check

Goal:

```text
Help the user adjust the goal without discouraging them.
```

Structure:

```text
Supportive score/meter
-> likely blockers
-> suggested adjustment
-> build 12-week plan CTA
```

Avoid:

- Failure-grade visuals.
- Red-heavy UI for normal improvement suggestions.
- Changing scoring/domain logic for visual polish.

### 9.6 12-Week Plan / Setup

Goal:

```text
Make the next 12 weeks feel structured and doable.
```

Structure:

```text
12-week roadmap visual
-> current setup decision
-> week/milestone preview
-> save/build CTA
```

Avoid:

- Spreadsheet-like tables.
- Showing every task and metric at once.
- Making future weeks compete with the current setup task.

### 9.7 Today / Weekly Execution

Goal:

```text
Show what matters today and what is safe/synced.
```

First viewport should include:

- Current week/day context.
- Sync/offline state for real-mode signed-in users.
- Today's focus.
- 1-3 priority actions.
- Progress/check-in affordance.

Avoid:

- Showing the whole backlog first.
- Hiding sync failures.
- Making metrics louder than the next action.

### 9.8 Reflection / Review

Goal:

```text
Help the user learn and adjust without guilt.
```

Structure:

```text
Week summary
-> one reflection prompt
-> one adjustment for next week
-> save/continue CTA
```

Use:

- `app-warm-*` tokens.
- Serif prompt moments.
- Calm success/error copy.

Avoid:

- "Why did you fail?"
- Failure-grade visuals.
- Long journaling forms without guidance.

---

## 10. Bad-To-Good Translation Rules

Use these when reviewing a screen.

| If the screen has... | Change it to... |
| --- | --- |
| Many equal cards | One primary surface plus quieter supporting items |
| Generic "Continue" CTA | Outcome-based CTA |
| A chart with no next step | Insight + recommended action |
| Long explanatory paragraphs | Short guidance + example + disclosure |
| Nested cards | Plain layout or one selectable item boundary |
| Decorative icon cluster | One meaningful visual anchor |
| Dense mobile grid | Single-column guided flow |
| Low-score shame | Supportive adjustment language |
| Pretty loading blankness | Skeleton or reserved state block |
| Hidden sync/billing uncertainty | Calm visible status and next step |

---

## 11. Visual QA Checklist

Before a UI task is done, verify:

```text
[ ] The screen has one dominant task.
[ ] The primary CTA is obvious and outcome-based.
[ ] The visual anchor explains state, progress, or result.
[ ] The first viewport is not just text/cards.
[ ] Mobile layout is one-column and comfortable.
[ ] Text does not overflow buttons, badges, tabs, or cards.
[ ] No unnecessary card-inside-card pattern.
[ ] Semantic tokens are used.
[ ] `app-warm-*` is used only in Reflection/Review.
[ ] Reduced motion is respected if animation exists.
[ ] Loading/empty/error/success/offline states are considered.
[ ] Auth, billing, sync, localStorage, route, and app-mode behavior are preserved.
```

Accessibility + interaction checks (from `ui-audit`, CRITICAL first):

```text
[ ] Semantic HTML first (nav/main/section/button), not div soup.
[ ] Icon-only controls have an accessible name (aria-label or visible text).
[ ] Visible focus ring on every interactive element; focus restores after dialog close.
[ ] Full keyboard flow; Enter-to-submit on forms where expected.
[ ] Inputs have associated labels; errors are inline and move focus to the first error.
[ ] Contrast meets AA; meaning never relies on color alone.
[ ] Touch targets >= 44px on mobile (>= 24px minimum elsewhere).
[ ] Images have meaningful alt text; offscreen/below-fold images lazy-load.
[ ] No layout shift: dimensions reserved for images, skeletons, and progress widgets.
```

Live visual verification viewports (from `web-design-reviewer`):

```text
Mobile 375px  -> overflow, tap targets, one-column flow, no horizontal scroll
Tablet 768px  -> breakpoint transition is natural
Desktop 1280px -> main task + anchor balance, no stretched prose
Wide 1920px   -> content respects max-width, prose measure stays 45-75 chars
```

Use the rubric in `docs/DESIGN.md` for scoring. A core journey screen with any `0` category is not ready.

---

## 12. Prompt Patterns

Skill chain for a screen task (load via the skill tool, run only what the change needs):

```text
ui-design (product-ui track) -> visual direction, surface/depth/radius craft
frontend-design              -> distinctive detail + anti-slop, scoped to Dreamy Guided Productivity
design-in-code               -> low-fi ASCII wireframe, structure before polish
typography-audit             -> punctuation, line-height, measure, OpenType, Vietnamese safety
ux-audit                     -> state coverage, form data loss, focus, optimistic-UI rollback
ui-audit                     -> accessibility, interaction, motion, microcopy
web-design-reviewer          -> live desktop + mobile visual verification
```

### 12.1 One-screen design audit

```text
Read AGENTS.md, docs/DESIGN.md, docs/VISUAL_EXECUTION_SPEC.md, and guidelines/CURRENT_PROJECT_STATUS.md.

Audit only this screen: [SCREEN/ROUTE].
Do not edit code.

Use:
- ui-design
- typography-audit

Report:
- Current score using docs/DESIGN.md rubric.
- Top 5 visual/UX issues.
- Exact files likely involved.
- Small implementation plan.
- Production risks to avoid.
```

### 12.2 One-screen implementation

```text
Read AGENTS.md, docs/DESIGN.md, docs/VISUAL_EXECUTION_SPEC.md, and guidelines/CURRENT_PROJECT_STATUS.md.

Implement only this screen: [SCREEN/ROUTE].
Follow the approved audit plan.

Plan structure low-fi first (design-in-code): sketch the layout as an ASCII wireframe, get structure and hierarchy right, then apply visual polish.

Constraints:
- Do not edit other screens.
- Do not change business logic, route contract, auth, billing, sync, entitlement, analytics, or localStorage shape.
- Use semantic tokens from src/styles/tokens.css and tailwind.config.js.
- Do not introduce primitive colors, random gradients, or a new visual system.
- If adding motion, keep it subtle and respect reduced motion.

After editing, run:
- npm run typecheck
- npm run lint
- npm run test:run
- npm run build

Report files changed, what changed, command results, visual check, final score, and risks.
```

### 12.3 One-screen visual and UX verify

```text
Read AGENTS.md, docs/DESIGN.md, docs/VISUAL_EXECUTION_SPEC.md, and guidelines/CURRENT_PROJECT_STATUS.md.

Verify only this screen after implementation: [SCREEN/ROUTE].
Do not make new feature changes unless fixing a verified issue in this same screen.

Use:
- web-design-reviewer
- ux-audit
- typography-audit

Check:
- Desktop and mobile layout.
- Overflow, overlap, spacing, and hierarchy.
- Typography scale and text density.
- Focus, keyboard, labels, and reduced motion.
- Loading, empty, error, success, offline/sync states.
- Production safety for auth, billing, sync, localStorage, and app mode.

Return:
- Verdict: Pass / Pass with issues / Fail.
- Findings with file/line.
- Visual check route and viewports.
- Commands run and results.
- Recommended fixes.
```

---

## 13. Skill-derived execution recipes (updated 2026-06-08)

These recipes translate the installed design skills into copy-pasteable execution defaults. They sit under `docs/DESIGN.md` section 17 (skill reconciliation). When a recipe conflicts with the token contract or production safety, follow the docs.

### 13.1 Elevation recipe (token-first)

Do not hand-write `box-shadow` in JSX. Use the elevation tokens, which already encode a layered shadow:

| Surface | Class | When |
| --- | --- | --- |
| Resting card / input | `shadow-app-sm` | Default product surfaces |
| Raised panel / popover | `shadow-app-md` | Hovered or focused interactive cards, menus |
| Modal / dialog | `shadow-app-lg` | Overlays that float above the page |
| Peak overlay | `shadow-app-xl` | Rare; full-screen sheets |

- One depth strategy per card family. Do not mix `.elevation-*` (Material `--shadow-1..5`) or `--shadow-glow-*` into a card group that uses `shadow-app-*`.
- For a hover lift, step up one token (`shadow-app-sm` -> `shadow-app-md`) with `transition-shadow duration-200`, not a custom shadow.
- On `bg-app-bg-subtle` bands and other non-white surfaces, prefer the soft shadow over a hard `border-app-line`; rgba shadow adapts to the surface.

### 13.2 Contrast ladder

Use the four-step ink ladder for emphasis; reserve color for meaning.

```text
Primary    text-app-ink        headings, key values, the answer
Secondary  text-app-ink-soft   body, guidance, descriptions
Muted       text-app-ink-muted  captions, metadata, placeholders
Faint       app disabled token  disabled controls, lowest-priority hints
```

Accent (`text-app-accent`) and status (`text-app-status-*`) are for action and state only — never for routine emphasis.

### 13.3 Interaction-state defaults

Every interactive element needs the full set:

```text
hover    background/scale shift, transition 120-160ms
active   scale(0.98) or translateY(1px)
focus    visible ring (--app-focus-ring; --app-focus-ring-warm in Reflection), >= 2px
disabled reduced emphasis, no layout shift, cursor not-allowed
loading  preserve size (no layout shift), disable submit, show progress
```

Animate `transform` and `opacity` only. Never animate `top/left/width/height`.

### 13.4 State-block recipe (ship-readiness)

For any async surface, cover all five and pick the right severity (from `ux-audit`):

```text
loading  Skeleton/FormSkeleton matching final layout shape (reserve min-h to avoid CLS)
empty     EmptyState: what is missing + why it matters + one CTA
error     InlineStatusMessage tone="error": what happened + what is safe + retry
                (local-first: a sync error is NOT data loss — say local data is safe)
success   what changed + the next step (no exclamation marks)
offline   OfflineBanner / LocalOnlyNotice: changes saved on this account, retry path
```

Release-blockers to design out: form input wiped on validation error, missing error state on sync/billing/auth, dialog that never restores focus on close, optimistic UI with no rollback.

### 13.5 Icon usage (stack-aware)

The project uses `lucide-react`. Do not swap icon libraries. Instead:

- Keep one consistent stroke width across a screen.
- Use icons that add scanning value; remove decorative icon clusters and icon backgrounds that only add noise.
- Avoid cliché metaphors (rocket for "launch", shield for "security") when a plainer icon reads faster.
- Every icon-only control needs an accessible name (`aria-label`) and, where the meaning is not obvious, a tooltip.

### 13.6 Per-change skill pass (quick map)

```text
Copy-only tweak     -> typography-audit (+ ui-audit microcopy)
Restyle a screen    -> ui-design (product-ui) -> design-in-code -> typography-audit -> ui-audit
New/changed surface -> full chain: ui-design -> frontend-design -> design-in-code
                        -> typography-audit -> ux-audit -> ui-audit -> web-design-reviewer
Verify before merge -> ux-audit (state/focus/data-loss) + web-design-reviewer (375/768/1280/1920)
```

Run only what the change needs. Keep edits token-compliant, reduced-motion safe, and contract-preserving.

---

## 14. Elevated execution recipes (updated 2026-06-08)

These recipes implement `docs/DESIGN.md` section 18 (Craft elevation). Use them only after a screen clears section 5.8 state coverage and the section 11 QA checklist. They push a passing screen toward premium. Every recipe stays inside the token contract; when a recipe cannot be done through tokens, stop and report.

### 14.1 Type scale ramp (concrete)

A modular ramp keeps hierarchy intentional. Use these as defaults; do not invent per-screen sizes.

| Role | Classes | Line-height |
| --- | --- | --- |
| Route title (emotional) | `font-serif text-3xl sm:text-4xl lg:text-5xl` | `leading-tight` (~1.15-1.2, diacritic-safe) |
| Step title in panel | `font-serif text-2xl sm:text-3xl` | `leading-tight` |
| Section title | `font-sans text-lg sm:text-xl font-semibold` | `leading-snug` |
| Card title | `text-base sm:text-lg font-semibold` | `leading-snug` |
| Body | `text-sm sm:text-base` | `leading-6` (~1.5) |
| Helper / caption | `text-xs sm:text-sm` | `leading-5` |
| Eyebrow label | `text-xs font-semibold uppercase tracking-wide` | `leading-4` |

Do not scale font-size with viewport width (no `vw` units). Do not jump more than one step between adjacent hierarchy levels on one surface.

### 14.2 Vietnamese-safe text wrapping

```text
Headings / short hero copy:  text-balance   (CSS text-wrap: balance)
Body paragraphs:             text-pretty    (CSS text-wrap: pretty)
Measure on long copy:        max-w-prose  or  max-w-[65ch]
```

- Tailwind v4 ships `text-balance` and `text-pretty` utilities — use them, do not hand-roll JS line-breaking.
- Do not wrap Vietnamese headings in fixed-height boxes or single-line `truncate` without testing the tallest tone stack (e.g. "Sức khỏe", "Phát triển", "Tài chính").
- Keep display leading at `leading-tight`/`leading-snug` (never `leading-none`) so stacked diacritics are not clipped.

### 14.3 Optical alignment

```text
Icon + text:     inline-flex items-center gap-2; icon ~0.9-1em of adjacent text
Play/▶ in circle: nudge translate-x-[1px] (optical centre, not maths centre)
Chevron/arrow:   align to text optical centre, not the line box
Pill/button:     allow slightly more vertical padding for diacritics + ascenders
Nested radius:   rounded-card outer -> rounded-control/rounded-input inner
```

Verify side-by-side cards share baselines: titles, values, and CTAs start/end on the same Y across the row. Pin CTAs to the card bottom (`mt-auto` in a `flex flex-col` card) so they align regardless of body length.

### 14.4 Numeric display

```text
Any changing/aligned number:  tabular-nums
Value vs unit:                value = text-app-ink (strong);  unit (/10, đ, %, tuần) = text-app-ink-muted, smaller, normal weight
Vertical value lists:          align on the decimal / unit, not ragged-left
```

Only enable slashed-zero / case-sensitive / fraction OpenType features after confirming the loaded font ships them. Never fake bold or italic.

### 14.5 Signature reveal (Framer Motion / `motion`)

One orchestrated reveal per screen, tied to the user's data, fires once. Always honour reduced motion.

```tsx
import { motion, useReducedMotion } from "motion/react";

function SignatureReveal({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}
```

Stagger a small set (≤6-8 items) on arrival:

```tsx
// parent: staggerChildren 0.04 (40ms); child: opacity + translateY 8px
// reduced motion: render final state, no stagger, no transform
```

Rules: spring (soft, no overshoot) for result/insight reveals; standard `120-250ms` duration curves for chrome (hover, disclosure, step change). Never stagger a long list. Never gate auth/billing/sync/form submit behind motion. Reserve layout space so the reveal causes no CLS.

### 14.6 Content realism (do / don't)

| Don't | Do |
| --- | --- |
| `99.99%`, `50%`, `100 users` | `47%`, `6/8 lĩnh vực`, `tuần 4/12` |
| "Người dùng A", "Acme", "John Doe" | "Chạy 5km liên tục", "Đọc xong 4 cuốn sách" |
| Lorem Ipsum / English filler | real draft Vietnamese copy |
| "Xem Insight Của Tôi" (Title Case) | "Xem insight của tôi" (sentence case) |
| "Đã lưu thành công!" | "Đã lưu reflection. Tuần sau bắt đầu từ một điều chỉnh." |
| "Oops! Có lỗi xảy ra" | "Chưa đồng bộ lên máy chủ. Dữ liệu vẫn an toàn trên thiết bị này. Thử lại." |
| same date/avatar on every sample | varied, lived-in sample data |

Applies to seed data, demo content, empty-state examples, vision-board samples, and screenshots — not just primary copy.

### 14.7 Structural completeness checklist

Add or fix when the touched surface is the natural home. Do not invent new routes/modules just to satisfy this (respect scope rules and anti-pattern 26).

```text
[ ] Skip-to-content link in the app shell (keyboard reachable).
[ ] Branded, helpful 404 with a safe path back to the core journey.
[ ] Every surface offers a safe way back (no dead ends).
[ ] Branded favicon + correct <title>/description/og:image on public surfaces.
[ ] Active route/step is visually signalled in navigation.
[ ] No `#` links or dead handlers; not-ready actions are visibly disabled with a reason.
```

### 14.8 Premium pass checklist (mirror of DESIGN.md 18.8)

Run only after the section 11 QA checklist passes and the screen scores `2-3` on the DESIGN.md section 14 rubric.

```text
[ ] One signature product-state moment, tied to user data, fires once (not looped).
[ ] Screen reads perfectly with motion disabled.
[ ] Icons/glyphs optically aligned; side-by-side items share baselines.
[ ] Vietnamese display text: diacritic-safe leading, no clipped tone marks.
[ ] Headings text-balance; body text-pretty + 45-75ch measure.
[ ] Changing/aligned numbers use tabular-nums; units quieter than values.
[ ] No placeholder smell (real VN copy, organic numbers, sentence case, no exclamation/"Oops!").
[ ] Emphasis from the four-step ink ladder; colour reserved for action/state.
[ ] One depth strategy (shadow-app-*), one radius system, concentric nesting.
[ ] No dead `#` links; active location signalled; safe way back exists.
[ ] Every elevation achieved through tokens — no contract or scope touched.
```

When a recipe here conflicts with the token contract, the warm brand, or production safety, follow `docs/DESIGN.md` and note the conflict.
