# Dear Our Future - DESIGN.md

This file is the single source of truth for product design, UX writing, visual style, and AI-assisted UI redesign in Dear Our Future.

Before any AI coding agent edits UI, UX, layout, page structure, visual hierarchy, copy, onboarding, dashboards, forms, cards, empty states, or product experience, it must read and follow this file first.

This file defines how the product should feel, prioritize, and make design tradeoffs. It does not override production safety rules, code-backed feature status, auth/billing/sync contracts, localStorage compatibility, environment-mode rules, route registration, analytics events, entitlement behavior, or TypeScript behavior.

For practical layout blueprints, component recipes, typography scale, screen-level execution rules, and one-screen prompt patterns, also read `docs/VISUAL_EXECUTION_SPEC.md`. This file is the design authority; `docs/VISUAL_EXECUTION_SPEC.md` is the implementation blueprint.

---

## 0. How to use this document

### Required reading order for UI work

```text
AGENTS.md
-> docs/DESIGN.md
-> docs/VISUAL_EXECUTION_SPEC.md
-> guidelines/CURRENT_PROJECT_STATUS.md
```

If these documents disagree, preserve production safety and code-backed scope first.

`guidelines/PRODUCTION_ROADMAP.md` was not present in this workspace when this file was revised. If it exists later, read it. If it is still missing, use `guidelines/CURRENT_PROJECT_STATUS.md` as the scope anchor and report the missing roadmap instead of inventing roadmap content.

### Agent workflow summary

Before editing:

1. Identify the screen's role in the journey.
2. Identify the user's main job and expected output.
3. Identify the main CTA and supporting actions.
4. Check state/data risks: localStorage, auth, billing, sync, app mode, entitlement, analytics, routes, API contracts.
5. Reuse existing tokens, components, and layout patterns before creating new ones.
6. Choose the smallest verification set that matches the risk.

During editing:

1. Keep one main action visible.
2. Give the screen one meaningful visual anchor.
3. Reduce text through structure, examples, and progressive disclosure.
4. Cover loading, empty, error, success, offline, and sync states where relevant.
5. Preserve mobile comfort, accessibility, focus, and reduced-motion behavior.
6. Do not change business logic, storage shape, route behavior, analytics, billing, sync, auth, entitlement, or app-mode handling unless explicitly asked.

After editing:

1. Report files changed.
2. Explain what changed and why.
3. List commands run and results.
4. List commands not run and why.
5. State unchanged contracts and remaining risks.

This document is a design authority, not a scope-expansion license. Do not add new product modules, routes, paid flows, provider assumptions, admin surfaces, analytics, sync features, billing behavior, or account lifecycle features just because they are mentioned here.

---

## 1. Product identity

Dear Our Future is not a normal productivity dashboard.

Dear Our Future is a warm guided planning studio that helps users move from vague dreams to self-understanding, SMART goals, a feasible 12-week execution plan, weekly action, and reflection.

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

The core transformation is:

```text
From vague inspiration to visible, structured action.
```

The official UX/UI direction is:

```text
Dreamy Guided Productivity
```

Meaning:

- Dreamy: emotional, soft, visual, personal, hopeful, vision-board-like.
- Guided: users know where they are, why the step matters, and what to do next.
- Productivity: the output is practical, structured, measurable, and action-oriented.

The product experience has three layers:

| Layer | User need | Design response |
| --- | --- | --- |
| Emotional clarity | "I feel scattered." | Warm language, personal insight, calm visual focus. |
| Guided decision | "What should I choose now?" | One decision at a time, examples, clear progress, outcome-based CTA. |
| Practical execution | "What do I do this week?" | Roadmap, priorities, check-ins, sync/offline clarity, recovery states. |

North Star sentence:

```text
Dear Our Future helps young people turn unclear dreams into a visible future and a clear 12-week action plan.
```

Emotional promise:

```text
You are not lost. You only need a clearer next step.
```

Functional promise:

```text
Understand yourself, choose one focus, create a SMART goal, test feasibility, and follow a 12-week plan.
```

Distinctive visual concept:

```text
A warm guided planning studio where the user's future becomes visible one decision at a time.
```

Visual distinctiveness must come from the user's state, progress, next action, or saved result - not from decorative effects alone.

Use this concept through product-state visuals:

| Moment | Product-state visual |
| --- | --- |
| Life Balance | A visible balance shape, not only slider values. |
| Life Insight | A personal focus card with one recommended next step. |
| SMART Goal | A live goal preview that becomes clearer as the user answers. |
| Feasibility | A supportive readiness meter with adjustment guidance, not a failure grade. |
| 12-Week Plan | A roadmap that makes the next 12 weeks feel doable. |
| Today / Weekly Execution | A current-week focus map with 1-3 priority actions. |
| Reflection | A calm prompt surface that turns learning into one adjustment. |
| Vision Board | Tactile moodboard elements linked back to the user's goal and plan. |

Creative moves are encouraged when they clarify a real user moment:

- Editorial asymmetry when it makes one decision feel important.
- Tactile collage details such as paper, tape, pins, photo frames, stickers, and workbook-like surfaces.
- Custom progress, roadmap, balance, and preview visuals instead of generic dashboard charts.
- Moment-based accent, illustration, and motion when tied to progress or a result reveal.
- A small number of memorable details per screen, executed with precision.

Avoid by default:

- Default purple-blue gradient patterns that could belong to any AI SaaS.
- Decorative blobs, glow fields, or abstract shapes that do not explain state, progress, or outcome.
- Generic SaaS icon grids.
- Stock wellness photos that do not reveal the user's state or output.
- Oversized marketing hero layouts inside core product screens.
- Visual effects that compete with forms, sync state, billing state, errors, or the primary CTA.

---

## 2. Code-backed product frame

The design must stay aligned with `guidelines/CURRENT_PROJECT_STATUS.md`.

Current code-backed frame:

- The app is local-first. Most user-facing data is persisted in browser storage first.
- Backend sync exists, but it is selective. The strongest current sync domain is the 12-week planning/execution loop.
- Local save must remain usable when backend, Firebase, auth, or network sync is unavailable.
- `/12-week-setup` is the current setup route and renders `TwelveWeekSetupLab`. Do not assume legacy setup routes are active.
- Billing is production-sensitive and required for launch, but paid subscription/provider readiness must not be overstated. Use the current billing provider mode, entitlement rules, support/legal requirements, and code-backed status.
- Demo mode exists for preview/marketing deployments. Demo-only copy, mock checkout routes, and browser-bound trial language must not leak into real-mode surfaces.
- Real-mode surfaces must be account-bound, trust-first, and guarded by existing auth/billing/sync/app-mode helpers.

Design work must not change:

- Routes or routing assumptions.
- Business/domain logic.
- Storage keys, storage shape, migrations, or normalization behavior.
- Analytics event shape or dispatch behavior.
- Backend API contracts or sync semantics.
- Auth, billing, entitlement, paywall, or checkout behavior.
- `isRealMode()` / `isDemoMode()` gating.
- TypeScript behavior, validation rules, or tests unless explicitly requested.

Priority rule:

```text
Core journey first. Supporting surfaces second. Decorative polish never outranks production safety.
```

Supporting surfaces such as Vision Board, Goals, Billing/Order, Settings, Legal, Achievements, and Admin can be polished, but they must not pull attention away from the next core planning/execution action unless a task explicitly targets them.

---

## 3. Current UI audit priorities

This is not a file-by-file bug list. It summarizes recurring UI risks visible in the current codebase and the design response expected when a screen is touched.

| Audit finding | Design response |
| --- | --- |
| Primitive Tailwind palettes such as `slate-*`, hard-coded hex values, and primitive CSS vars appear across surfaces. | Migrate touched UI toward semantic tokens from `src/styles/tokens.css` and `tailwind.config.js`. Do not create new one-off colors. |
| Several surfaces mix dark/admin/SaaS styling with warm product UI. | Normalize page canvas, cards, borders, typography, and CTA hierarchy to the Dear Our Future product world. |
| Many screens rely on equal card grids or dashboard-like widgets. | Replace equal mosaics with one dominant working surface, one visual anchor, and supporting details below. |
| CTA labels sometimes use generic words such as `Continue`, `Next`, `Submit`, `OK`, or `Done`. | Prefer outcome-based labels unless context already makes the result obvious. |
| Loading, empty, error, success, offline, and sync states are uneven. | Every meaningful screen should make state visible, calm, and actionable, especially when local-first or sync safety matters. |
| Some destructive/error UX still uses `window.confirm` or `alert`. | When the touched scope includes destructive or recoverable error UX, use the in-app dialog/state pattern and preserve focus management. |
| Mobile layouts can become dense, wide, or hard to tap. | Design mobile-first: one column, no horizontal scroll, readable text, no clipped badges/buttons, and roughly 44px touch targets for primary controls. |
| Typography can collapse into generic sans/system usage for emotional moments. | Use serif for emotional transitions, insights, reflection, and vision-board moments; use sans for body, forms, buttons, navigation, and execution UI. |
| Visual effects can become decorative without clarifying the user's state. | Tie every distinctive visual to progress, a decision, a result preview, or next action. |

Migration order for UI polish:

```text
1. Replace primitive styles with semantic tokens.
2. Normalize page shells and surface hierarchy.
3. Clarify CTA hierarchy and outcome-based labels.
4. Add or improve state coverage.
5. Add restrained motion only when it clarifies progress.
```

---

## 4. Core UX principles

### 4.1 First meaningful result within 3 minutes

A new user must receive a useful result quickly:

- A visible life-balance insight.
- A chosen focus area.
- A SMART goal draft.
- A feasibility adjustment suggestion.
- A 12-week plan draft.
- A clear next action for this week.

Rule:

```text
Quick win first. Deep customization later.
```

Do not force users through long forms before showing value.

### 4.2 Visual first, text second

Important screens need a meaningful visual anchor:

- Life balance shape.
- Focus/insight card.
- SMART goal preview.
- Feasibility meter.
- 12-week roadmap.
- Today/weekly focus map.
- Reflection prompt card.
- Vision board preview.

A visual anchor is not decoration. It must explain current state, future result, progress, or next action.

### 4.3 One screen, one main action

Each screen must have one clear primary CTA. Secondary actions must be quieter.

Good labels:

```text
Reveal my Life Insight
Choose this focus
Create my SMART goal
Build my 12-week plan
Start this week
Save reflection
```

Vietnamese examples:

```text
Xem insight của tôi
Chọn trọng tâm này
Tạo mục tiêu SMART
Tạo kế hoạch 12 tuần
Bắt đầu tuần này
Lưu reflection
```

Generic labels are allowed only when the surrounding context already makes the outcome obvious.

### 4.4 Reduce cognitive load

Each screen must answer:

```text
1. What am I doing?
2. Why does this matter?
3. What should I do next?
```

Use short headings, examples, previews, progressive disclosure, and clear CTA hierarchy. Do not use long paragraphs to compensate for unclear structure.

### 4.5 Progressive disclosure

Simple first. Advanced later.

Use:

- See example.
- Customize later.
- Advanced settings.
- More details.
- AI suggestion.
- Tooltip for small concepts.
- Expand/collapse section.
- Step-by-step wizard.

Do not show every option, explanation, configuration, warning, or edge case at once.

### 4.6 Mobile-first for Gen Z

Mobile UI must have:

- Single-column flow by default.
- Large tappable controls, generally around 44px or taller for primary actions.
- Short forms and clear card hierarchy.
- No horizontal scroll.
- No tiny text for important information.
- No hidden CTA below long content when a sticky CTA would help.
- Stable responsive layout with no clipped buttons, tabs, badges, or Vietnamese text.

### 4.7 Action over analysis

Every insight needs a next step.

Bad:

```text
Here are 8 charts about your life balance.
```

Good:

```text
Your current focus is Health. Start with one small weekly action.
```

### 4.8 Calm motivation, not pressure

The product should encourage users without making them feel judged.

Prefer:

```text
Let's adjust this week.
```

Avoid:

```text
You are behind.
```

Scoring should guide adjustment, not shame the user.

### 4.9 State transparency is trust

Because the product is local-first with selective backend sync, UI must not hide uncertainty.

When relevant, state surfaces should say:

- What is happening.
- What is safe locally.
- What is synced or not synced.
- What the user can do next.

Do not hide auth, sync, billing, entitlement, or production uncertainty behind pretty empty states.

---

## 5. Surface modes

Not every screen should carry the same emotional weight.

| Surface | Primary job | Visual tone | Avoid |
| --- | --- | --- | --- |
| Core journey | Move the user through the next step | Warm, guided, visual, focused | Dashboard mosaics, long forms, equal CTAs |
| Execution workspace | Help the user act today/this week | Calm, structured, efficient | Decorative clutter, motivational noise, hidden task/sync state |
| Reflection | Help the user learn without guilt | Softer, more emotional, serif-friendly | Judgmental scoring, failure language |
| Vision support | Make the future visible | Tactile, visual, goal-linked | Generic moodboard scope creep |
| Marketing/public | Explain the promise and invite start | Visual storytelling | Overpromising production readiness |
| Billing/settings/legal | Build trust and reduce risk | Clear, restrained, account-bound | Dreamy ambiguity, mock/demo copy in real mode |
| Admin | Let operators inspect and act safely | Functional, dense, consistent | User-facing decorative style leaking into admin |

Use visual warmth to clarify the next action, not to decorate every container.

---

## 6. Visual system direction

### 6.1 Hard gates and creative levers

Hard gates:

1. Production safety: preserve auth, billing, sync, app-mode, localStorage, route, entitlement, analytics, and API contracts.
2. Accessibility: readable contrast, visible focus, keyboard flow, labels, semantics, and reduced-motion support are required.
3. Touch and interaction: primary controls must be easy to tap with clear hover/press/disabled/loading feedback.
4. Performance and layout stability: reserve space for visuals, skeletons, progress widgets, and repeated tiles.
5. Responsive structure: mobile-first, no horizontal scroll, no hidden CTA, no desktop-only comprehension.

Creative levers:

1. Concept strength: every major screen should have one memorable idea tied to the user's state.
2. Visual anchor quality: prefer product-state visuals over generic icons/charts.
3. Composition: use asymmetry, overlap, rhythm, and negative space when they clarify focus.
4. Typography and writing: pair emotional serif moments with clear sans utility.
5. Color and texture: extend tokens only when a new role supports a real product moment.
6. Motion: use functional motion for step changes, result reveals, progress, and small confirmations.

A visually striking screen succeeds only when the user can understand the next action within 5 seconds.

### 6.2 Design token contract

The codebase has a semantic token system in `src/styles/tokens.css` and a Tailwind bridge in `tailwind.config.js`. New UI work must use semantic/component tokens instead of hard-coded primitive colors.

| Role | Tailwind/CSS token | Use for |
| --- | --- | --- |
| Page background | `bg-app-bg` / `var(--app-bg)` | Main page canvas |
| Subtle section | `bg-app-bg-subtle` / `var(--app-bg-subtle)` | Quiet nested areas, secondary bands |
| Surface | `bg-app-surface` / `var(--app-surface)` | Cards, panels, modals, inputs |
| Primary text | `text-app-ink` / `var(--app-ink)` | Headings, labels, important body text |
| Secondary text | `text-app-ink-soft` | Descriptions and helper copy |
| Muted text | `text-app-ink-muted` | Captions, metadata, placeholders |
| Default border | `border-app-line` | Low-emphasis card/input borders |
| Strong border | `border-app-line-strong` | Selected or emphasized boundaries |
| Primary action | `bg-app-accent text-white` | Main CTA and progress/action fill |
| Primary hover | `hover:bg-app-accent-hover` | CTA hover state |
| Accent soft | `bg-app-accent-soft` | Selected pill, progress track, gentle action context |
| Accent subtle | `bg-app-accent-subtle` | Hover row, light selected area |
| Reflection warm | `bg-app-warm-soft`, `text-app-warm`, `border-app-warm-border` | Reflection/Review context only |
| Status | `text-app-status-*`, existing status/danger component tokens | Success, warning, error, info states |
| Radius | `rounded-card`, `rounded-input`, `rounded-control`, `rounded-pill` | Consistent component shape |
| Shadow | `shadow-app-sm`, `shadow-app-md`, `shadow-app-lg` | Subtle elevation |
| Fonts | `font-sans`, `font-serif` | Body/utility and emotional headings |

Rules:

- Use semantic tokens first.
- Do not use raw hex values, primitive CSS vars such as `--green-700` / `--terra-600`, or random Tailwind colors directly in components as one-off styling.
- Do not use `slate-*`, `emerald-*`, `amber-*`, `purple-*`, or similar primitive palettes for new brand surfaces unless mapping through a semantic token or existing component role.
- Use `app-warm-*` only for Reflection/Review. Do not use terracotta as generic danger, billing, warning, pending, or error color.
- Status, billing, danger, and destructive states must use status or component tokens with clear semantics.
- If a token is missing, add or request a scoped semantic token instead of hardcoding a one-off color.
- Keep light/warm mode as the default brand impression. Dark mode must be supported but should not drive the product identity.
- New gradients, textures, glow colors, and shadow recipes are allowed only when tokenized, scoped, accessible, and tied to a user state or outcome.

### 6.3 Color direction

Default mode should feel:

```text
Light, warm, calm, hopeful, personal, clean.
```

Preferred color roles:

```text
Background: cream, off-white, warm white
Primary action: forest green
Secondary surface: sage green
Emotional accent: restrained warm tones in reflection contexts
Soft accents: lavender, blush pink, sky blue, soft yellow when tokenized
Text: dark neutral
Muted text: soft gray-brown
```

The interface must not feel corporate, financial, gaming-heavy, cold, overly dark, or visually noisy.

### 6.4 Dark mode

Dark mode can exist, but it must not define the primary brand impression.

If editing dark mode:

- Keep it warm, not pure black.
- Preserve contrast.
- Keep emotional softness.
- Avoid neon/gaming aesthetics.
- Keep sync, billing, auth, and error states readable and explicit.

### 6.5 Typography

Use this rule:

```text
Serif headings = emotional, reflective, premium.
Sans-serif body = clear, readable, modern.
```

Use serif for:

- Hero moments.
- Personal insights.
- Reflection prompts.
- Vision board moments.
- Emotional transitions.

Use sans-serif for:

- Body text.
- Buttons.
- Labels.
- Forms.
- Navigation.
- Dense execution UI.
- Billing, settings, legal, and admin surfaces.

Default hierarchy:

| Element | Direction |
| --- | --- |
| Page title | `font-serif` when emotional; confident but not oversized |
| Product section title | `font-sans font-semibold`, compact and scannable |
| Form label | `font-sans font-medium`, close to the input |
| Helper text | `text-app-ink-soft`, one short sentence |
| Metadata/caption | `text-app-ink-muted`, small but readable |
| Data/numbers | Use tabular numbers when comparison, progress, or score matters |

Avoid the visual outcome of "Inter everywhere" or system-default SaaS typography. `Inter` may remain a fallback in code, but emotional moments should not look like generic product UI when `font-serif` and existing tokens are available.

Vietnamese readability rules:

- Use stable line-height.
- Do not scale font size with viewport width.
- Avoid negative letter spacing for normal Vietnamese copy.
- Prevent clipped text in buttons, tabs, badges, pills, toasts, and cards.
- Avoid tiny all-caps labels when Vietnamese diacritics become cramped.
- Use tabular numbers for scores, progress, money, counts, and week numbers.

### 6.6 Cards and surfaces

Cards should generally use:

- `rounded-card`.
- `border border-app-line`.
- `bg-app-surface` or a semantic soft surface.
- `shadow-app-sm` only when elevation clarifies hierarchy.
- One main idea.
- Clear heading.
- Meaningful visual marker, preview, or state.
- Comfortable padding.

Avoid:

- Cards inside cards unless the inner object is independently selectable/editable.
- Too many identical cards.
- Dense text cards.
- Card grids without visual hierarchy.
- Heavy shadows.
- Random bright colors.
- Admin-dashboard styling on user-facing product screens.

Use a card when the boundary changes meaning: a selectable option, saved result, editable object, modal, or repeated item. If a card only groups normal page content, prefer a plain section with spacing.

### 6.7 Buttons

Primary button:

- One per screen or section.
- Strongest visual weight.
- Uses the primary brand action color.
- Label describes the result.
- Maps to `bg-app-accent text-white hover:bg-app-accent-hover` unless an existing component abstracts it.

Secondary button:

- Less visual weight.
- Usually outline or ghost.
- Used for back, skip, edit, customize later.

Danger button:

- Only for destructive actions.
- Must have confirmation.
- Must use the app confirmation dialog pattern, not `window.confirm`.
- Must not rely on warm/reflection tokens.

Interaction rules:

- Buttons must have visible focus states.
- Mobile touch targets should generally be at least 44px tall.
- Primary and secondary actions must not have the same visual weight.
- Icon-only buttons need accessible names and tooltips when the icon is not obvious.
- Loading/disabled states must preserve intent and not cause layout shift.

### 6.8 Motion

Motion should be purposeful. It can be expressive for onboarding, result reveals, vision-board moments, and small celebrations, but it must not delay production-critical actions.

Use motion for:

- Step transitions.
- Progress reveal.
- Small confirmation feedback.
- Hover/tap polish.
- Visual preview updates.
- Milestone moments that acknowledge progress without guilt.

Default timing:

| Motion type | Duration | Notes |
| --- | --- | --- |
| Hover/tap feedback | 120-160ms | Prefer CSS transitions unless richer motion already exists |
| Small reveal | 160-220ms | Opacity + 4-8px translate |
| Page/step enter | 180-250ms | Fade + 8-16px translate, no dramatic movement |
| Progress fill | 200-350ms | Only when it clarifies completion and space is reserved |
| Short list stagger | 30-50ms between items | Use only for short lists |

Rules:

- Respect `prefers-reduced-motion` with `useReducedMotion` or equivalent CSS strategy.
- In reduced-motion mode, render the final state without transform/stagger.
- Animate opacity, transform, and intentional progress values.
- Avoid animating layout-affecting properties unless space is reserved.
- Do not animate long task lists, inputs while typing, sync loops, billing confirmation, or auth forms in a way that delays interaction.
- Do not add audio, confetti, drag-heavy interaction, or canvas rewrites as default polish without a specific task and risk review.

---

## 7. UX writing rules

### 7.1 Voice and tone

Writing must be:

```text
Warm
Clear
Short
Guided
Non-judgmental
Concrete
Encouraging
```

Do not write like:

- A textbook.
- A corporate brochure.
- A generic AI marketing page.
- A psychological diagnosis.
- A strict productivity coach.

Good:

```text
Have many goals but not sure where to start?
We help you choose one focus and turn it into a 12-week plan.
```

Good Vietnamese:

```text
Bạn có nhiều mục tiêu nhưng chưa biết bắt đầu từ đâu?
Chúng mình giúp bạn chọn một trọng tâm và biến nó thành kế hoạch 12 tuần.
```

### 7.2 Text length defaults

```text
Title: 6-12 words
Subtitle: 1-2 short lines
Card description: 1 short line
Button: 2-5 words
Tooltip: 1 short sentence
Empty state: 1 short title + 1 helpful sentence + 1 CTA
Error state: what happened + what is safe + next action
Success state: what changed + next action
```

If a concept needs more explanation, use an example, tooltip, disclosure, or help link. Do not use long paragraphs to fix unclear UX.

### 7.3 Examples over abstraction

For forms and setup screens, include concrete examples close to the input.

Good:

```text
Example: Reach IELTS 6.5 in 12 weeks by studying 5 sessions per week.
```

Good Vietnamese:

```text
Ví dụ: Đạt IELTS 6.5 trong 12 tuần bằng cách học 5 buổi mỗi tuần.
```

Avoid:

```text
Enter your goal here.
```

### 7.4 CTA copy

Buttons should explain the next result.

Prefer:

```text
Xem insight của tôi
Chọn trọng tâm này
Tạo mục tiêu SMART
Tạo kế hoạch 12 tuần
Lưu và bắt đầu tuần này
```

Avoid when context is unclear:

```text
Tiếp tục
Gửi
Xong
OK
Submit
```

### 7.5 State copy

Empty states must include:

1. What is missing.
2. Why it matters.
3. What to do next.

Error states must be calm and recoverable.

Good:

```text
We could not save to the server yet.
Your changes are still saved on this device.
Try syncing again.
```

Success states should reinforce progress.

Good:

```text
Your focus is saved. Next, let's turn it into a SMART goal.
```

Avoid:

```text
No data found.
Error occurred.
Saved successfully.
```

### 7.6 Production/demo copy

Real-mode copy must be account-bound and production-safe.

Do not show real users:

- Mock/demo payment language.
- "No real money" payment copy.
- Browser-bound trial language.
- Claims that paid subscription, provider settlement, analytics, backend ownership, or cross-device restore are fully production-ready unless the current code-backed status proves it.

For billing, entitlement, auth, sync, and account lifecycle screens, clarity and trust outrank emotional flourish.

---

## 8. Flow upgrade plan

Use this section to decide what to improve first and how to do it safely. It is not permission to rewrite interactions, data flow, canvas behavior, checkout providers, sync behavior, or routes.

### 8.1 Entry / Dashboard (`/`)

- User job: understand the product promise or resume the most important current action.
- Primary output: a chosen starting point for new users, or the next execution action for returning users.
- Visual anchor: transformation preview for fresh users; current-week focus map or next-action preview for active users.
- CTA direction: `Start Life Balance`, `Continue my plan`, `Open today's actions`, or another state-based outcome label.
- Common risks: generic SaaS landing/dashboard mix, too many widgets, demo-only copy in real mode, side surfaces outranking the core flow.
- Safe redesign moves: simplify first viewport, use state-based hierarchy, show one main CTA, keep local-first and sync status copy intact, avoid adding new routes or onboarding steps.

### 8.2 Onboarding / Life Balance (`/onboarding`, `/life-balance`)

- User job: start calmly and score current life areas without feeling judged.
- Primary output: a visible balance result and enough context to reveal Life Insight.
- Visual anchor: life balance wheel, radar shape, circular score map, or another accessible visual shape.
- CTA direction: `Reveal my Life Insight`, `Xem insight của tôi`.
- Common risks: long survey feeling, dense slider list on mobile, low scores feeling like failure, gesture-heavy redesign that weakens accessibility or stored draft behavior.
- Safe redesign moves: show one area or one focused cluster at a time on mobile, keep sliders/inputs accessible, explain "current feeling" not objective judgment, show progress through areas, keep draft/local data behavior unchanged.

### 8.3 Life Insight (`/life-insight`)

- User job: understand the result, choose one focus, and know why it matters.
- Primary output: selected focus area, intent/context, and a clear move into SMART Goal setup.
- Visual anchor: personal report card, selected focus spotlight, or balance-result summary tied to one recommendation.
- CTA direction: `Choose this focus`, `Create my SMART goal`, `Tiếp -> viết mục tiêu` when context is already clear.
- Common risks: analytics-dashboard layout, too many charts, long psychological explanations, ending without a next action.
- Safe redesign moves: turn analysis into one focus recommendation, keep copy short and supportive, make intent choices scannable, preserve selected focus/intent data handoff.

### 8.4 SMART Goal Setup (`/smart-goal-setup`)

- User job: turn a vague wish into a concrete SMART goal without feeling the goal must be perfect.
- Primary output: valid SMART goal draft ready for feasibility check.
- Visual anchor: live SMART goal preview, clarity checklist, or goal card that updates as answers become specific.
- CTA direction: `Create my SMART goal`, `Check feasibility`, `Tiếp -> khảo sát tính khả thi` when context is clear.
- Common risks: dense all-fields form, academic SMART explanations, AI suggestions that overwrite user intent, visual polish that touches validation/local draft behavior.
- Safe redesign moves: keep one prompt per step, place examples next to inputs, make suggestions clearly optional/editable, preserve validation, draft persistence, analytics, and route handoff.

### 8.5 Feasibility Check (`/feasibility`)

- User job: check whether the goal is realistic for 12 weeks and adjust without discouragement.
- Primary output: readiness score/context and a safe recommendation for building the plan or adjusting the goal.
- Visual anchor: supportive meter, balance visual, blocker map, or adjustment preview.
- CTA direction: `Build my 12-week plan`, `Adjust my goal`, `Tiếp tục thiết lập 12 tuần`.
- Common risks: failure-grade visuals, red-heavy normal guidance, changing scoring/domain logic during UI polish, using warm/reflection tokens as generic warning colors.
- Safe redesign moves: keep domain scoring unchanged, use status tokens for warnings/errors, frame low readiness as adjustment guidance, make the next path explicit.

### 8.6 12-Week Setup (`/12-week-setup`)

- User job: convert the goal into a realistic 12-week system with lead actions, milestones, schedule, and review rhythm.
- Primary output: local goal and local `twelveWeekSystem` created first, with backend sync attempted only under existing conditions.
- Visual anchor: 12-week roadmap, week/milestone preview, setup summary, or week-one action preview.
- CTA direction: `Build my 12-week plan`, `Confirm and start the 12-week cycle`, `Xác nhận & bắt đầu chu kỳ 12 tuần`.
- Common risks: overcrowded setup, spreadsheet-like preview, rewriting setup logic, drag/drop tactic systems, changing task generation, weakening sync/link behavior.
- Safe redesign moves: reduce density, use progressive disclosure, keep week-one preview close to setup decisions, preserve local-first save before remote sync, do not change plan creation or backend sync semantics unless explicitly tasked.

### 8.7 Weekly Execution / Today (`/12-week-system` and Today entry surfaces)

- User job: know what matters today/this week, complete 1-3 priority actions, and understand sync/offline safety.
- Primary output: task progress, daily check-in, and clear weekly rhythm.
- Visual anchor: current-week focus band, today's priority queue, progress/check-in surface, or week map.
- CTA direction: `Start this week`, `Mark today's focus`, `Save check-in`, `Review this week` depending on state.
- Common risks: showing the whole backlog first, dashboard metrics louder than next action, hiding sync/conflict/offline state, moving review/journal behavior into a new flow without data review.
- Safe redesign moves: make today's action dominant, keep only 1-3 priority actions above the fold, keep sync/offline/conflict state visible for signed-in real-mode users, preserve task/check-in/review data behavior.

### 8.8 Reflection / Review (`/12-week-system` review surfaces, `/journal` where applicable)

- User job: learn from the week without guilt and choose one adjustment for the next week.
- Primary output: saved reflection/review and one practical adjustment.
- Visual anchor: warm reflection card, week summary, one prompt at a time, or adjustment preview.
- CTA direction: `Save reflection`, `Plan next week`, `Lưu review tuần này`.
- Common risks: judgmental copy, too many prompts at once, warm tokens leaking into non-reflection contexts, vague success state.
- Safe redesign moves: use `app-warm-*` only here, ask one question at a time, summarize what was saved, keep next-week adjustment concrete, preserve review storage/sync behavior.

### 8.9 Supporting surfaces

#### Vision Board and Gallery (`/vision-board`, `/gallery`)

- User job: visualize the chosen future and keep it connected to the goal/plan.
- Primary output: saved visual board or selected inspiration that supports execution.
- Visual anchor: tactile moodboard, goal-linked card, template preview, gallery image/story.
- CTA direction: `Create my vision board`, `Save to gallery`, `Use this in my plan`.
- Common risks: becoming a generic canvas product, mobile drag/canvas friction, base64/export regressions, visual beauty disconnected from the plan.
- Safe redesign moves: improve tactile styling and guidance without rewriting canvas/export/storage by default; keep goal/plan linkage visible; guide users back to weekly action.

#### Goals surfaces

- User job: inspect or continue meaningful goals without losing the core 12-week rhythm.
- Primary output: a clear next goal action, status, or review point.
- Visual anchor: goal card, progress snapshot, linked 12-week plan preview.
- CTA direction: `Continue this plan`, `Review goal`, `Create 12-week plan`.
- Common risks: generic goal tracker, too many metrics, unrelated achievements outranking execution.
- Safe redesign moves: connect each goal to next action, use tabular progress, keep historical/secondary detail behind disclosure.

#### Billing / Order / Support (`/billing/*`, `/order`, `/order-status`)

- User job: understand plan value, account/payment state, support options, and safe next steps.
- Primary output: trusted upgrade/manage/order action, or clear recovery path.
- Visual anchor: restrained value summary, account-bound entitlement state, product/kit preview only when code-backed and not overpromising.
- CTA direction: `Upgrade Plus`, `Manage plan`, `Contact support`, `Review order`, `Return to plan`.
- Common risks: mock/demo copy in real mode, fake urgency, provider-specific assumptions, overclaiming payment readiness, hiding pending/error state, making checkout too dreamy.
- Safe redesign moves: keep copy account-bound, show support/legal links where required, preserve entitlement wait rules, surface pending/error states clearly, do not hardcode Stripe/VNPay/MoMo/Casso assumptions unless the task targets that provider and code supports it.

#### Settings / Legal / Admin

- User job: manage account, data, preferences, support, and operations safely.
- Primary output: successful configuration, export/import, support action, or confirmed destructive action.
- Visual anchor: restrained grouped settings, safety summary, clear status panels, functional tables for admin when truly needed.
- CTA direction: action-specific labels such as `Export data`, `Check backup`, `Delete local data`, `Save settings`.
- Common risks: unclear destructive actions, `window.confirm`, vague account lifecycle copy, admin dark theme leaking into product UI, hidden legal/support requirements.
- Safe redesign moves: group by risk, use in-app confirmation dialogs, keep dangerous actions visually and semantically distinct, preserve existing data/account logic, keep admin functional and token-compliant.

---

## 9. Phased implementation plan

Use this sequencing for future UI redesign work. It is safer than route-by-route decorative batches because it follows user value and production risk.

| Phase | Scope | Goal | Verification expectation |
| --- | --- | --- | --- |
| Phase 0 - Foundations | Shared tokens, page shell, common states, CTA patterns, dialog patterns | Reduce primitive styles and create safe reusable UI language before screen polish | Inspect token/component diff; run typecheck/lint/build if code changed; manually verify light/dark/mobile patterns |
| Phase 1 - First-start clarity | `/`, `/onboarding`, `/life-balance`, `/life-insight` | Help new users understand the promise, assess balance, and choose focus | Verify fresh-state flow, mobile scan, local draft behavior, no demo copy leak |
| Phase 2 - Goal creation | `/smart-goal-setup`, `/feasibility` | Convert focus into a clear goal and feasible next step | Verify validation, draft persistence, examples, feasibility logic unchanged, route handoff unchanged |
| Phase 3 - Planning/execution | `/12-week-setup`, `/12-week-system`, goals surfaces, weekly review | Make setup and weekly rhythm calm, clear, and local-first safe | Verify local save before sync, plan links, task/check-in/review updates, sync/offline/conflict visibility |
| Phase 4 - Reflection/vision support | `/journal`, `/vision-board`, `/gallery` | Support emotional clarity without distracting from execution | Verify warm token scope, media/canvas/export behavior if touched, saved state, return path to action |
| Phase 5 - Trust/monetization/support | `/billing/*`, `/order`, `/order-status`, `/settings`, legal/support, admin | Make production-sensitive surfaces clear, account-bound, and safe | Verify real/demo gating, billing mode copy, entitlement wait rules, legal/support links, destructive dialogs, auth/account safety |

Rules:

- Do not start Phase 5 persuasion polish until production readiness and support/legal expectations are clear for the touched surface.
- Do not use Phase 4 visual polish to expand Vision Board into an unrelated product.
- Do not rewrite high-risk interactions such as direct chart dragging, canvas behavior, task generation, checkout provider handling, or sync behavior unless the task explicitly targets that implementation and includes verification.
- Shared foundations may be improved earlier when they reduce duplication and do not change product behavior.

---

## 10. Component-level rules

`docs/VISUAL_EXECUTION_SPEC.md` contains the detailed component recipes. These are the authority-level rules to preserve.

### 10.1 Page shell

Default product page structure:

```text
Context / progress / state
-> Clear title
-> One-sentence guidance
-> Main working surface
-> Visual anchor or result preview
-> Primary CTA
```

Rules:

- Keep one dominant working surface per screen.
- Keep page chrome quieter than the main task.
- Do not start core product screens with marketing-style hero sections unless the page is a public landing page.
- Use constrained width and stable responsive grids.
- On mobile, use one column and keep the primary CTA easy to reach.

### 10.2 Forms

Forms should be guided and example-driven.

Rules:

- Use clear labels.
- Put examples close to inputs.
- Group related fields.
- Avoid too many fields at once.
- Use inline validation.
- Preserve user input when errors happen.
- Explain errors in human language.

### 10.3 Choice controls

Choice cards, sliders, radios, and segmented controls must have context.

Rules:

- Explain what the choice changes.
- Show selected state without relying on color alone.
- Keep controls large enough for touch.
- Preserve native semantics where possible.
- Avoid arbitrary scoring without meaning.

### 10.4 Tables

Avoid tables on user-facing mobile screens.

Use tables only when:

- The data is truly tabular.
- The user needs comparison.
- The screen is admin or management-focused.

For user-facing planning, prefer cards, timelines, week sections, or progressive summaries.

### 10.5 Modals and dialogs

Use dialogs sparingly.

Good uses:

- Confirm destructive action.
- Show focused detail.
- Short guided explanation.
- Quick edit.

Rules:

- Do not use modals for long workflows.
- Preserve focus when opening/closing.
- Use in-app confirmation dialogs for destructive actions instead of `window.confirm`.
- Do not use `alert` for recoverable product errors; show an in-app state/toast/panel with next action.

### 10.6 Navigation

Navigation must support the core journey.

The user should know:

- Where they are.
- What came before.
- What comes next.
- How to return safely.

Avoid exposing too many side routes before users finish the core journey.

---

## 11. Responsive and accessibility rules

### 11.1 Responsive structure

Mobile:

- Single-column layout by default.
- Primary CTA visible or easy to reach.
- Avoid dense grids.
- Avoid horizontal scrolling.
- Use larger tap targets.
- Keep headings short.
- Use progressive disclosure.
- Prevent text overflow in buttons, cards, tabs, badges, and pills.
- Use sticky bottom CTA only when it does not cover form fields or important content.

Tablet:

- Use two-column layout only when it improves clarity.
- Keep important visual preview near the main action.

Desktop:

- Use wider layouts for visual storytelling and efficient work only when it clarifies the task.
- Good patterns: main task + preview, current action + sticky insight panel, roadmap + setup decision.
- Do not fill space with unnecessary widgets.
- Reserve stable dimensions for repeated tiles, progress widgets, images, and toolbars.

### 11.2 Accessibility

All UI must remain accessible.

Rules:

- Keep readable contrast.
- Preserve keyboard navigation.
- Use visible focus states.
- Use labels for inputs.
- Use `aria-label` only when visible label is not enough.
- Do not rely on color alone.
- Respect reduced motion for all non-essential animation.
- Keep button text descriptive.
- Avoid tiny text for important information.
- Preserve focus when opening/closing dialogs, disclosures, and route-level overlays.
- Keep expected form keyboard behavior such as Enter-to-submit where appropriate.
- Keep screen reader semantics when replacing native controls with custom UI.
- Add captions/transcripts for meaningful media when media carries required information.

Accessibility is part of product quality, not an optional layer.

---

## 12. AI redesign workflow

### Before editing

Answer internally:

```text
What screen or route is in scope?
Where is it in the core journey?
What is the user trying to finish?
What is the expected output?
What data/state contracts could be touched?
Which existing tokens/components should be reused?
Which verification commands match the risk?
```

If a requested visual change conflicts with production safety, preserve production safety and report the tradeoff.

### During editing

Ensure:

```text
[ ] One main action is visually dominant.
[ ] The screen has one meaningful visual anchor.
[ ] Copy is shorter, concrete, and outcome-based.
[ ] Advanced detail is progressively disclosed.
[ ] Loading/empty/error/success/offline/sync states are considered.
[ ] Mobile layout is comfortable with no horizontal scroll.
[ ] Accessibility, focus, and reduced motion are preserved.
[ ] Semantic tokens are used or intentionally extended.
[ ] Existing logic, routes, storage, analytics, auth, billing, sync, entitlement, and app-mode behavior are preserved.
```

### After editing

Report:

```text
Files changed.
What changed and why.
Commands run and results.
Commands not run and why.
Contracts preserved.
Remaining risks or TODOs.
```

### Prompt template for AI agents

```text
Read docs/DESIGN.md first and follow it as the design authority.
Also read docs/VISUAL_EXECUTION_SPEC.md for practical execution guidance.
Check guidelines/CURRENT_PROJECT_STATUS.md for current code-backed scope.

Now redesign this screen: [route or screen name]

Current problem:
[describe what feels wrong]

Goal:
[describe the desired user feeling and outcome]

Constraints:
- Keep existing business logic.
- Keep existing routes.
- Keep existing localStorage/sessionStorage behavior.
- Keep existing analytics events.
- Keep existing auth, billing, sync, entitlement, and app-mode safety.
- Keep TypeScript safety.
- Do not introduce unnecessary dependencies.
- Use semantic tokens from src/styles/tokens.css / tailwind.config.js.
- Do not use un-tokenized primitive colors, random gradients, or unrelated visual systems.
- Respect reduced motion for animations.
- Improve UX/UI, layout, copy, visual hierarchy, responsive design, and user guidance.

Expected result:
- The screen follows Dreamy Guided Productivity.
- The screen has one clear primary CTA.
- The screen has a meaningful visual anchor tied to user state/result/action.
- The screen is less text-heavy and easier to use.
- The screen works well on mobile.
- The screen remains production-safe in real mode and demo-safe in demo mode.

Before editing, answer internally:
- Where is this screen in the core journey?
- What is the user trying to finish?
- What visual anchor explains the state/result?
- What tokens/components already exist?
- What could break if this surface touches auth/billing/sync/localStorage?

After editing, report:
- Files changed.
- What changed and why.
- Commands run and results.
- Commands not run and why.
- Remaining risks or TODOs.
```

---

## 13. Definition of done for UI/UX redesign

A UI/UX redesign is done only when:

```text
[ ] The user can understand the screen within 5 seconds.
[ ] The user knows where they are in the journey.
[ ] The primary CTA is obvious and outcome-based when context requires it.
[ ] The screen has a meaningful visual anchor.
[ ] The copy is short, human, and non-judgmental.
[ ] The screen guides the user to the next step.
[ ] Mobile layout is comfortable and has no horizontal scroll.
[ ] Loading, empty, error, success, offline, and sync states are considered where relevant.
[ ] Accessibility is not degraded.
[ ] Existing logic and data flow are preserved.
[ ] Existing auth, billing, sync, entitlement, route, analytics, and app-mode behavior are preserved.
[ ] Local-first behavior still works when backend/Firebase/sync is unavailable.
[ ] Semantic tokens are used or intentionally extended.
[ ] No one-off primitive colors or unrelated visual systems were added.
[ ] Motion, if added, is purposeful and respects reduced motion.
[ ] The result feels like Dreamy Guided Productivity.
```

Blocking zero rule for the core journey:

```text
Any 0 in production safety, accessibility, token compliance, state coverage, or primary CTA blocks the redesign even if the total score is high.
```

---

## 14. UI review rubric

Score each category from 0 to 3.

| Category | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Journey clarity | User cannot tell where they are | Location is implied but weak | Step and next action are mostly clear | Step, purpose, and next result are obvious |
| Primary CTA | Missing or buried | Present but generic/competing | Clear and mostly outcome-based | Obvious, outcome-based, and visually dominant |
| Visual anchor | None or decorative | Present but weak | Explains state/result somewhat | Strongly clarifies state, progress, or outcome |
| Text density | Long, hard to scan | Some text can be cut | Mostly concise | Short, human, and useful |
| Mobile comfort | Cramped or hard to tap | Usable with friction | Comfortable with minor issues | Natural one-column flow and reachable CTA |
| Token compliance | Hard-coded/random styles | Mixed token and one-off styles | Mostly token-based | Fully semantic and consistent |
| Surface hierarchy | Everything competes | Too many cards/borders | Main task is mostly dominant | Main task is calm, clear, and focused |
| State coverage | Missing key states | States exist but vague | States are useful | Loading/empty/error/success/offline are calm and actionable |
| Accessibility | Focus/labels/contrast broken | Several risks | Minor issues only | Keyboard, focus, labels, contrast, semantics, and reduced motion are sound |
| Production safety | Breaks or weakens product contracts | Risky or unverified changes | Safe with minor uncertainty | Preserves auth/billing/sync/localStorage/routes/analytics/app-mode behavior |

Interpretation:

```text
0-17: Do not ship. Redesign direction or safety is failing.
18-24: Needs another pass before production.
25-28: Good enough with small polish.
29-30: Strong production UI.
```

For the core journey, any category scored `0` blocks the redesign even if the total score is high.

---

## 15. Anti-patterns to avoid

Do not:

1. Add long explanations to fix confusion.
2. Make the app look like an admin dashboard.
3. Use dark mode as the default visual direction.
4. Put too many charts on the first impression.
5. Force users through too many setup steps before they get value.
6. Hide the main CTA among many equal buttons.
7. Use random colors outside the semantic token system.
8. Give each screen an unrelated visual style instead of a screen-specific expression of the same product world.
9. Use generic AI-generated layouts.
10. Leave users unsure about the next step.
11. Build dense table-first mobile UI for user-facing planning.
12. Make Vision Board screens feel like normal forms or an unrelated canvas product.
13. Use guilt-driven productivity copy.
14. Make scoring feel like judgment.
15. Show advanced settings too early.
16. Replace emotional clarity with technical complexity.
17. Add dependencies for visual polish without a strong user-facing reason, bundle/performance check, and fallback plan.
18. Break local-first behavior for UI changes.
19. Ignore empty, loading, error, success, offline, and sync states.
20. Optimize desktop while making mobile worse.
21. Use `app-warm-*` outside Reflection/Review unless there is a documented semantic reason and token review.
22. Add demo-only copy, mock payment language, or browser-bound trial language to real-mode surfaces.
23. Make billing, auth, sync, legal, account lifecycle, or destructive-action screens emotionally vague.
24. Animate every card or list item just because motion is available.
25. Hide production uncertainty behind optimistic marketing copy.
26. Turn route guidance into a reason to rewrite interaction models, canvas behavior, checkout providers, or sync semantics by default.

---

## 16. Implementation guidance

When implementing UI changes:

- Prefer existing components before adding new ones.
- Use Tailwind classes that map to existing semantic tokens.
- Keep accessibility: labels, aria attributes, focus states, contrast, keyboard flow.
- Avoid large rewrites unless necessary and explicitly scoped.
- Keep components readable and maintainable.
- Do not break the product flow.
- Do not mix unrelated refactors with UI redesign.
- Keep changes focused on the requested screen unless a shared component must change.
- Avoid changing localStorage shapes, route registration, auth/billing/sync behavior, app-mode handling, entitlement logic, or analytics while doing visual work.
- If a UI problem requires product or data-model changes, stop and report the risk instead of smuggling it into a redesign.
- Use small reusable patterns only when they remove meaningful duplication across core journey screens.
- For motion, prefer existing CSS transitions for simple hover states and use richer motion only where it improves route/step/list transitions without weakening reduced-motion behavior.

Recommended commands after meaningful frontend code changes:

```bash
npm run typecheck
npm run lint
npm run build
```

If the change affects broad frontend behavior, also consider:

```bash
npm run test:run
npm run check
```

For route/UI changes that affect production-facing behavior, also consider:

```bash
npm run smoke:prod
```

If a command does not exist or cannot run due to environment constraints, report it clearly instead of pretending it passed.

For documentation-only changes, full frontend checks are usually not required. Still read the changed document and verify it does not contradict `guidelines/CURRENT_PROJECT_STATUS.md` or overstate production readiness.
