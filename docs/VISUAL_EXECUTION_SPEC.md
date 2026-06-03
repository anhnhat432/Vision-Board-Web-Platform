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

Use semantic tokens from `src/styles/tokens.css` and `tailwind.config.js`.

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

Use the rubric in `docs/DESIGN.md` for scoring. A core journey screen with any `0` category is not ready.

---

## 12. Prompt Patterns

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
