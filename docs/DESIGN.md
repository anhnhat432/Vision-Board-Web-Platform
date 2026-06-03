# Dear Our Future — DESIGN.md

This file is the single source of truth for product design, UX writing, visual style, and AI-assisted UI redesign in Dear Our Future.

Before any AI coding agent edits UI, UX, layout, page structure, visual hierarchy, copy, onboarding, dashboards, forms, cards, empty states, or product experience, it must read and follow this file first.

This file defines **how the product should feel and behave visually**. It does not override production safety rules, code-backed feature status, auth/billing/sync contracts, localStorage compatibility, or environment-mode rules.

For practical layout blueprints, component recipes, typography scale, screen-level execution rules, and one-screen prompt patterns, also read `docs/VISUAL_EXECUTION_SPEC.md`.

---

## 0. How to use this document

### For AI coding agents

Before editing any screen, the AI must:

1. Read this file.
2. Read `docs/VISUAL_EXECUTION_SPEC.md` for practical visual execution guidance.
3. Check the code-backed product state in `guidelines/CURRENT_PROJECT_STATUS.md`.
4. Check `guidelines/PRODUCTION_ROADMAP.md` when it exists. If it is missing, use `guidelines/CURRENT_PROJECT_STATUS.md` as the scope anchor and report the missing roadmap instead of inventing one.
5. Identify the screen's role in the product journey.
6. Identify the user's main job on that screen.
7. Identify the expected output/result after the screen.
8. Identify the primary CTA.
9. Redesign using the rules in this document.
10. Preserve existing business logic, routes, storage behavior, analytics events, API contracts, and TypeScript safety unless explicitly asked otherwise.
11. Report what changed, what was not changed, and any verification commands run.

This document is a design authority, not a scope-expansion license. Do not add new product modules, routes, paid flows, admin surfaces, or provider assumptions just because they are mentioned here.

### For human team members

Use this document to judge whether a screen feels consistent with Dear Our Future.

A screen is good only if it makes the user feel:

```text
Clearer, calmer, more inspired, and closer to action.
```

If a screen feels dry, confusing, text-heavy, dashboard-heavy, or visually generic, it must be redesigned.

---

## 1. Product identity

Dear Our Future is not a normal productivity dashboard.

Dear Our Future is a **dreamy guided self-discovery studio** that helps Gen Z users move from vague dreams to clear vision boards, SMART goals, 12-week action plans, weekly progress tracking, and reflection.

The product journey is:

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

The product should not only help users plan.
It should help users **feel that their future is becoming clearer and more achievable.**

Current production UX priority:

```text
Help a real signed-in or local-first user move from first start to a usable 12-week execution rhythm without confusion, data loss, or demo-only language.
```

Vision board, order kit, payment, achievements, and admin surfaces may support the product, but they must not pull attention away from the core flow unless a task explicitly targets them.

---

## 2. Design North Star

The official UX/UI direction is:

```text
Dreamy Guided Productivity
```

Meaning:

- **Dreamy**: emotional, soft, visual, personal, hopeful, vision-board-like.
- **Guided**: users always know where they are, why the step matters, and what to do next.
- **Productivity**: the final output must be practical, structured, measurable, and action-oriented.

The product should combine:

```text
Pinterest / Studygram aesthetic
+ Notion-like clarity
+ Personal growth workshop guidance
```

### North Star sentence

```text
Dear Our Future helps young people turn unclear dreams into a beautiful vision board and a clear 12-week action plan.
```

### Emotional promise

```text
You are not lost. You only need a clearer next step.
```

### Functional promise

```text
Understand yourself, choose one focus, create a SMART goal, and follow a 12-week plan.
```

### Distinctive visual concept

The product's memorable design idea is:

```text
A warm guided planning studio where the user's future becomes visible one decision at a time.
```

This is the product's visual point of view. It may be bold, memorable, editorial, tactile, and emotionally expressive. It only fails when the visual idea hides the user's next action, weakens trust, or turns a working product screen into pure decoration.

Use this concept through product-state visuals:

- Life Balance: a visible balance shape, not only slider values.
- Life Insight: a personal focus card with one recommended next step.
- SMART Goal: a live goal preview that gets clearer as the user answers.
- Feasibility: a supportive meter with adjustment guidance, not a failure grade.
- 12-Week Plan: a roadmap that makes the next 12 weeks feel doable.
- Today / Weekly Execution: a current-week focus map with 1-3 priority actions.
- Reflection: a calm prompt surface that turns learning into one adjustment.
- Vision Board: tactile moodboard elements that stay linked to the user's goal and plan.

Design distinctiveness should come from the user's goal, progress, and next action. Within that frame, choose the stronger concept over the safer generic layout.

Creative moves that are encouraged:

- Editorial asymmetry when it helps one decision feel important.
- Tactile collage details such as paper, tape, pins, photo frames, stickers, and workbook-like surfaces.
- Richer hero media on public/marketing pages when it shows the actual product promise.
- Screen-specific visual anchors, as long as they still belong to the same product world.
- Custom progress, roadmap, balance, and preview visuals instead of generic dashboard charts.
- Moment-based accent color, illustration, and motion when they reinforce the user's current step.
- A small number of memorable details per screen, executed with precision.

Avoid by default, unless there is a product-specific reason and the implementation is tokenized, accessible, and tested:

- Default purple-blue gradient patterns that could belong to any AI SaaS.
- Decorative blobs, glow fields, or floating abstract shapes that do not explain state, progress, or outcome.
- Generic SaaS icon grids.
- Stock wellness photos that do not reveal the user's state or outcome.
- Oversized marketing hero layouts inside core product screens.
- Visual effects that compete with forms, sync state, billing state, or the primary CTA.

Execution, billing, settings, legal, and admin surfaces should still feel polished and considered, but their main job is clarity and trust. They can have personality; they should not become ambiguous.

---

## 3. What the product must feel like

Dear Our Future must feel:

```text
Bright
Calm
Dreamy
Visual
Personal
Guided
Warm
Hopeful
Gen Z-friendly
Action-oriented
Trustworthy
Easy to start
```

It must not feel:

```text
Dry
Corporate
Dashboard-heavy
Admin-like
Text-heavy
Confusing
Cold
Overly dark
Overly complex
Generic SaaS
Generic AI-generated
Like a long survey
Like a spreadsheet
```

When in doubt, choose:

```text
More guided, more visual, less text, clearer CTA.
```

### Surface modes

Not every screen should carry the same emotional weight. Use the right surface mode:

| Surface | Primary job | Visual tone | Avoid |
| --- | --- | --- | --- |
| Core journey | Move the user through the next step | Warm, guided, visual, focused | Dashboard mosaics, long forms, too many equal CTAs |
| Execution workspace | Help the user act today/this week | Calm, structured, efficient | Decorative clutter, motivational noise, hidden task state |
| Reflection | Help the user learn without guilt | Softer, more emotional, serif-friendly | Judgmental scoring, failure language |
| Marketing/public pages | Explain the promise and invite start | More visual storytelling | Overpromising production readiness |
| Billing/settings/legal | Build trust and reduce risk | Clear, restrained, account-bound | Dreamy ambiguity, mock/demo copy in real mode |
| Admin | Let operators inspect and act safely | Functional, dense, consistent | User-facing decorative style leaking into admin |

Product screens should feel designed, but they are still working surfaces. Use visual warmth to clarify the next action, not to decorate every container.

---

## 4. Core UX principles

### Principle 1 — First meaningful result within 3 minutes

A new user must receive a meaningful result quickly.

A meaningful result can be:

- A visible life-balance insight.
- A chosen focus area.
- A SMART goal draft.
- A 12-week plan draft.
- A first vision board preview.
- A clear next action for this week.

Do not force users to complete too many setup steps before seeing value.

Bad:

```text
Complete 6 long forms before seeing any result.
```

Good:

```text
Answer a few guided prompts -> get a useful insight -> customize later.
```

Rule:

```text
Quick win first. Deep customization later.
```

---

### Principle 2 — Visual first, text second

Dear Our Future is a vision-board product. Important screens must have a meaningful visual.

Good visual elements:

- Life balance wheel.
- Radar map.
- Vision board preview.
- Moodboard.
- Goal card.
- 12-week roadmap.
- Weekly progress map.
- Physical kit mockup.
- Timeline.
- Soft illustration.
- Checklist card.
- Study desk / planning corner visual.

Avoid screens that are only:

- Text.
- Forms.
- Tables.
- Sliders.
- Plain cards.
- Dense charts.

Rule:

```text
If the screen has no visual anchor, it probably does not feel like Dear Our Future.
```

---

### Principle 3 — One screen, one main action

Each screen must have one clear primary CTA.

Secondary actions must be quieter.

Good CTA labels describe the outcome:

```text
Reveal my Life Insight
Choose my focus
Create my SMART goal
Build my 12-week plan
Start this week
Create my vision board
Order my vision kit
```

Avoid generic CTA labels when the outcome can be clearer:

```text
Continue
Next
Submit
Done
Save
```

Generic labels are allowed only when the surrounding context already makes the result obvious.

---

### Principle 4 — Reduce cognitive load

Each screen must answer:

```text
1. What am I doing?
2. Why does this matter?
3. What should I do next?
```

If users need to guess, the UX is wrong.

Reduce cognitive load by:

- Using short headings.
- Showing one main task at a time.
- Providing examples.
- Using visual previews.
- Hiding advanced options.
- Making CTA hierarchy obvious.
- Avoiding repeated explanations.

---

### Principle 5 — Progressive disclosure

Simple first. Advanced later.

Use:

- See example.
- Customize later.
- Advanced settings.
- More details.
- AI suggestion.
- Tooltip.
- Expand/collapse section.
- Step-by-step wizard.

Do not show every option, explanation, configuration, or edge case at once.

Bad:

```text
Show all SMART fields, advanced scoring, examples, warnings, and explanations on one screen.
```

Good:

```text
Ask one guided question, show an example, then reveal the next step.
```

---

### Principle 6 — Mobile-first for Gen Z

Design for mobile first because many users will access the product on phones.

Mobile UI must have:

- Large tappable buttons.
- Clear card hierarchy.
- Short forms.
- Sticky bottom CTA when helpful.
- No wide tables.
- No tiny text.
- No overloaded horizontal layouts.
- Comfortable spacing.
- Clear progress indicator.

Avoid:

- Dense grids on mobile.
- Tables requiring horizontal scroll.
- CTA hidden below long content.
- Small icon-only actions without labels.

---

### Principle 7 — Action over analysis

The product should not trap users in analysis.

Each insight should lead to an action.

Bad:

```text
Here are 8 charts about your life balance.
```

Good:

```text
Your current focus is Health. Start with one small weekly action.
```

Rule:

```text
Every insight needs a next step.
```

---

### Principle 8 — Calm motivation, not pressure

The product should encourage users without making them feel judged.

Prefer:

```text
You're building clarity step by step.
```

Avoid:

```text
You failed to complete your plan.
```

Prefer:

```text
Let's adjust this week.
```

Avoid:

```text
You are behind.
```

Tone must be supportive, not guilt-driven.

---

## 5. Visual design system direction

### 5.0 Creative runway and quality gates

Dear Our Future should not become visually timid. Use the two lists below together: hard gates protect the product, while creative levers make the design worth remembering.

Hard gates:

1. **Production safety**: preserve auth, billing, sync, app-mode, localStorage, route, entitlement, and API contracts.
2. **Accessibility**: readable contrast, visible focus, keyboard flow, labels, screen reader semantics, and reduced-motion support are required.
3. **Touch and interaction**: primary controls must be easy to tap, generally at least 44px tall, with clear hover/press/disabled/loading feedback.
4. **Performance and layout stability**: reserve space for images, visual anchors, skeletons, progress widgets, and repeated tiles; avoid CLS and unbudgeted heavy effects.
5. **Responsive structure**: mobile-first single-column flow, no horizontal scroll, no hidden CTA, no desktop-only comprehension.

Creative levers:

1. **Concept strength**: every major screen should have one memorable idea, not just a clean arrangement of cards.
2. **Visual anchor quality**: prefer custom product-state visuals over generic icons, generic charts, or decorative panels.
3. **Composition**: use asymmetry, overlap, contrast, rhythm, and negative space when they clarify focus.
4. **Typography and writing**: pair emotional serif moments with clear sans-serif utility; keep copy short, human, and outcome-based.
5. **Color and texture**: extend the token system intentionally when a new accent, texture, or surface role supports a real product moment.
6. **Forms and feedback**: make input feel guided through examples, previews, inline recovery, and saved-local reassurance.
7. **Motion**: use functional, meaningful motion for step changes, result reveals, progress, and small celebration moments; keep it interruptible and reduced-motion aware.
8. **Charts and data visuals**: make data feel like guidance, not reporting; every metric needs a next step.

Rules:

- Hard gates should not be used as an excuse for bland UI. Inside the gates, push for the more distinctive design.
- A visually striking screen is successful only if the user can still understand the next action within 5 seconds.
- If a design idea requires new tokens, images, motion primitives, or dependencies, justify it by the user moment it improves, not by novelty alone.

### 5.1 Design token contract

The codebase already has a semantic token system in `src/styles/tokens.css` and a Tailwind bridge in `tailwind.config.js`. New UI work must use these semantic/component tokens instead of hard-coded primitive colors.

Use these defaults:

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
| Status | `text-app-status-*`, `bg-[color:var(--color-danger-bg)]` when already defined | Success, warning, error, info states |
| Radius | `rounded-card`, `rounded-input`, `rounded-control`, `rounded-pill` | Consistent component shape |
| Shadow | `shadow-app-sm`, `shadow-app-md`, `shadow-app-lg` | Subtle elevation |
| Fonts | `font-sans`, `font-serif` | Body/utility and emotional headings |

Rules:

- Do not use primitive palette values like `--green-700`, `--terra-600`, raw hex, or random Tailwind colors directly in components as one-off styling.
- New accents, gradients, textures, glow colors, or shadow recipes are allowed when they serve a clear product moment, are added as semantic tokens or well-scoped component styles, and are verified for contrast/responsiveness.
- Use `app-warm-*` only for Reflection/Review. For billing, danger, pending, and error states, use status tokens or existing component tokens so terracotta does not become a generic warning color.
- If a token is missing, add or request a semantic token instead of hardcoding a one-off color.
- Keep light mode as the default brand impression; dark mode must be supported but should not drive the visual identity.

### 5.2 Color direction

Default mode should be light, warm, and calm.

Use existing semantic tokens from `src/styles/tokens.css`.

Do not introduce random primitive colors directly in components. If a stronger creative color is needed, add or reuse a semantic role so the choice can travel consistently across the app.

Preferred color feeling:

```text
Cream / off-white background
Forest green primary action
Sage green secondary surfaces
Soft pastel accents
Dark neutral text
Soft gray-brown muted text
```

Recommended color roles:

```text
Background: cream, off-white, warm white
Primary action: forest green
Secondary surface: sage green
Emotional accent: terracotta
Soft accents: lavender, blush pink, sky blue, soft yellow
Text: dark neutral
Muted text: soft gray-brown
```

The interface should feel:

```text
Calm, soft, warm, hopeful, personal, clean.
```

It must not feel:

```text
Corporate, financial, gaming-heavy, cold, overly dark, or visually noisy.
```

### 5.3 Dark mode

Dark mode can exist, but it must not define the primary brand impression.

Default design direction is light mode.

If editing dark mode:

- Keep it warm, not pure black.
- Preserve contrast.
- Keep emotional softness.
- Avoid neon/gaming aesthetics.

### 5.4 Typography

Use this rule:

```text
Serif headings = emotional, reflective, premium.
Sans-serif body = clear, readable, modern.
```

Use serif headings for:

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
- Utility UI.

Default hierarchy:

| Element | Default direction |
| --- | --- |
| Page title | `font-serif`, confident but not oversized |
| Product section title | `font-sans font-semibold`, compact and scannable |
| Form label | `font-sans font-medium`, close to the input |
| Helper text | `text-app-ink-soft`, one short sentence |
| Metadata/caption | `text-app-ink-muted`, small but readable |
| Data/numbers | Use tabular numbers when comparison matters |

Do not scale font size with viewport width. Use responsive breakpoints and stable line-height instead. Avoid negative letter spacing.

Good heading examples:

```text
Map your current life balance
Choose what matters most
Turn a vague goal into a clear plan
Build the future you can see
Your next 12 weeks start here
```

Avoid headings that sound technical:

```text
Assessment summary
Goal configuration
Execution module
Data input step
```

### 5.5 Cards

Cards should generally use:

- `rounded-card`.
- `border border-app-line`.
- `bg-app-surface` or a semantic soft surface.
- `shadow-app-sm` only when elevation clarifies the hierarchy.
- Clear heading.
- One main idea.
- Icon, illustration, preview, or meaningful visual marker.
- Comfortable padding.

Avoid:

- Cards inside cards.
- Too many identical cards.
- Dense text cards.
- Card grids without visual hierarchy.
- Heavy shadows.
- Random bright colors.
- Admin-dashboard styling.

Use a card when the boundary changes meaning: a selectable option, a saved result, an editable object, a modal, or a repeated item. If a card is only grouping normal page content, prefer a plain section with spacing.

### 5.6 Buttons

Primary button:

- One per screen or section.
- Strongest visual weight.
- Uses primary brand action color.
- Label describes outcome.
- Default styling should map to `bg-app-accent text-white hover:bg-app-accent-hover`.

Secondary button:

- Less visual weight.
- Usually outline or ghost.
- Used for back, skip, edit, customize later.

Danger button:

- Only for destructive actions.
- Must have confirmation.
- Must use the app confirmation dialog pattern, not `window.confirm`.

Interaction rules:

- Buttons must have visible focus states.
- Mobile touch targets should be at least 44px tall.
- Primary and secondary actions must not have the same visual weight.
- Icon-only buttons need accessible names and tooltips when the icon is not universally obvious.

Button label examples:

Good:

```text
Xem insight của tôi
Chọn trọng tâm này
Tạo mục tiêu SMART
Tạo kế hoạch 12 tuần
Bắt đầu tuần này
```

Weak:

```text
Tiếp tục
Xong
OK
Submit
```

### 5.7 Icons and illustration

Use icons only when they add meaning.

Prefer warm, human, physical, vision-board-related visuals:

- Stickers.
- Paper texture.
- Tape.
- Pin.
- Photo frame.
- Moodboard preview.
- Calendar.
- Checklist.
- Goal card.
- Soft stars/sparkles.
- Study desk / study corner feeling.

Avoid relying only on generic SaaS icons.

### 5.8 Motion

Motion should be purposeful. It is usually calm and restrained in work surfaces, but it can be more expressive for onboarding, result reveals, vision-board moments, and small celebrations when that expression helps the user feel progress.

Use motion for:

- Step transitions.
- Progress reveal.
- Small confirmation feedback.
- Hover polish.
- Visual preview updates.
- Milestone or completion moments that acknowledge progress without guilt.

Default timing:

| Motion type | Duration | Notes |
| --- | --- | --- |
| Hover/tap feedback | 120-160ms | Prefer CSS transitions unless Framer Motion is already needed |
| Small reveal | 160-220ms | Opacity + 4-8px translate |
| Page/step enter | 180-250ms | Fade + 8-16px translate, no dramatic movement |
| Progress fill | 200-350ms | Only when it clarifies completion |
| Staggered list | 30-50ms between items | Use only for short lists |

Implementation rules:

- Respect `prefers-reduced-motion` with `useReducedMotion` or an equivalent CSS strategy.
- In reduced-motion mode, render the final state without transform/stagger.
- Animate `opacity`, `transform`, and intentional progress values. Avoid animating layout-affecting properties like `height`, `top`, `left`, or large shadows unless the component reserves space.
- Do not animate long task lists, inputs while typing, sync state loops, billing confirmation state, or auth forms in a way that delays interaction.
- Do not use bounce/spring effects by default on production-critical flows. If using a spring or richer motion, keep it tied to a specific state change and safe for reduced-motion users.
- Do not add motion that changes the reading order, focus order, or click target.

Avoid:

- Fast, flashy animation.
- Excessive bouncing.
- Gaming-like effects.
- Motion that distracts from the main task or slows completion.
- Continuous decorative loops, except clear loading indicators.
- Animation that causes layout shift.

---

## 6. UX writing rules

### 6.1 Voice and tone

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

Bad:

```text
Dear Our Future helps users transform long-term vision into SMART goals and specific 12-week action plans through a multidimensional assessment system.
```

Good:

```text
Have many goals but not sure where to start?
We help you choose one focus and turn it into a 12-week plan.
```

Vietnamese good example:

```text
Bạn có nhiều mục tiêu nhưng chưa biết bắt đầu từ đâu?
Chúng mình giúp bạn chọn một trọng tâm và biến nó thành kế hoạch 12 tuần.
```

### 6.2 Text length limits

Default limits:

```text
Title: 6–12 words
Subtitle: 1–2 short lines
Card description: 1 short line
Button: 2–5 words
Tooltip: 1 short sentence
Empty state: 1 short title + 1 helpful sentence + 1 CTA
```

If a concept needs more explanation, use:

- Example.
- Tooltip.
- Expandable content.
- “Learn more”.
- “See example”.
- “AI suggestion”.

Do not use long paragraphs to fix unclear UX.

### 6.3 Use examples instead of abstract explanation

For forms and setup screens, always include concrete examples.

Good:

```text
Example: Reach IELTS 6.5 in 12 weeks by studying 5 sessions per week.
```

Bad:

```text
Enter your goal here.
```

Good Vietnamese:

```text
Ví dụ: Đạt IELTS 6.5 trong 12 tuần bằng cách học 5 buổi mỗi tuần.
```

### 6.4 Button copy

Buttons should explain the next result.

Prefer:

```text
Xem insight của tôi
Chọn trọng tâm này
Tạo mục tiêu SMART
Tạo kế hoạch 12 tuần
Lưu và bắt đầu tuần này
```

Avoid:

```text
Tiếp tục
Gửi
Xong
OK
```

### 6.5 Empty states

Empty states must help the user act.

A good empty state includes:

1. What is missing.
2. Why it matters.
3. What to do next.

Example:

```text
No focus area yet
Choose one area to turn your life balance result into a 12-week plan.
[Choose my focus]
```

Avoid:

```text
No data found.
```

### 6.6 Error states

Error messages must be calm and recoverable.

Good:

```text
We couldn't save this yet. Your changes are still on this device. Try again in a moment.
```

Bad:

```text
Error: request failed.
```

### 6.7 Success states

Success states should reinforce progress.

Good:

```text
Your focus is saved. Next, let's turn it into a SMART goal.
```

Bad:

```text
Saved successfully.
```

---

## 7. Screen-specific rules

Prioritize screens in this order unless the task explicitly says otherwise:

```text
Onboarding
-> Life Balance
-> Life Insight
-> SMART Goal
-> Feasibility Check
-> 12-Week Plan
-> Weekly Execution / Today
-> Reflection / Review
```

Side surfaces such as Vision Board, Order Kit, Achievements, and Admin must support the core journey. Do not make them more prominent than the next planning/execution step for a new or returning user.

### 7.1 Homepage / Dashboard entry

The homepage or entry dashboard must quickly answer:

```text
What problem does Dear Our Future solve?
What result will I get?
Where should I start?
```

Recommended structure:

```text
Problem -> Promise -> Visual Preview -> CTA
```

Homepage should show:

- Vision board preview.
- 3-step journey.
- Transformation from vague dream to clear 12-week plan.
- Strong primary CTA.
- Short social proof or user benefit if available.

Avoid:

- Too many charts.
- Too many feature cards.
- Long explanation of methodology.
- Dashboard widgets before the user understands the product.

Good homepage message:

```text
Stop dreaming vaguely.
Build your 12-week action plan.
```

Vietnamese version:

```text
Đừng chỉ mơ nữa.
Hãy biến mục tiêu của bạn thành kế hoạch 12 tuần.
```

---

### 7.2 Onboarding

Onboarding must feel like a guided quest, not a survey.

Each step should have:

```text
1 main question
1 meaningful visual
1 clear action
1 visible result after completion
```

The user should always understand why this step matters.

Onboarding should reduce fear of starting.

Use:

- Step indicator.
- Short instruction.
- Examples.
- Friendly visual.
- One main action.

Avoid:

- Long intro text.
- Too many options at once.
- Asking users for details before showing value.
- Dry survey language.

---

### 7.3 Life Balance

Life Balance must not be only sliders.

It should include a visual representation such as:

- Life balance wheel.
- Radar map.
- Circular score map.
- Visual balance shape.

The user should see scores become a visual shape.

Required UX:

- Explain that scores are based on current feeling, not a perfect objective measurement.
- Keep scoring fast.
- Show progress through the 8 areas.
- Show average, strongest area, and focus/weakest area.
- CTA should reveal the result.

Good CTA:

```text
Xem insight của tôi
Reveal my Life Insight
```

Avoid:

```text
Submit scores
Next
Continue
```

---

### 7.4 Life Insight

Life Insight should feel like a beautiful personal report, not an analytics dashboard.

It should include:

```text
Current focus
Why it matters
Suggested next step
```

The insight should be short, personal, and action-oriented.

Good structure:

```text
Your current focus is Health.
Why this matters: your energy supports every other plan.
Next step: turn this into one SMART goal for the next 12 weeks.
```

Avoid:

- Too many charts.
- Long psychological explanations.
- Making the user feel judged.
- Ending without a next action.

---

### 7.5 SMART Goal Setup

SMART Goal Setup should feel like an AI-assisted goal builder, not a long form.

Break it into small guided prompts:

```text
What do you want to achieve?
Why does it matter?
How will you measure it?
When do you want to finish?
```

Every input should have an example.

AI suggestions should be:

- Visible.
- Easy to accept.
- Easy to edit.
- Not overly verbose.
- Clearly marked as suggestions.

Avoid:

- Showing all SMART fields as a dense form.
- Technical wording.
- Asking for too much detail upfront.
- Making users feel their goal must be perfect.

---

### 7.6 Feasibility Check

Feasibility should help users adjust the goal, not discourage them.

It should answer:

```text
Is this goal realistic for the next 12 weeks?
What might block me?
What should I adjust?
```

Tone should be supportive.

Good:

```text
This goal is possible, but the weekly workload may be high. Try reducing the target or increasing your study sessions gradually.
```

Bad:

```text
Your goal is not feasible.
```

Use visual indicators carefully. Avoid making scoring feel like a failure grade.

---

### 7.7 Vision Board

Vision Board should be the most visual and emotional side surface of the product.

It should support the user's chosen focus, SMART goal, and 12-week plan. It must not become a separate generic moodboard product unless the task explicitly targets that scope.

It should include, when relevant:

- Templates.
- Themes.
- Stickers.
- Image gallery.
- Moodboard preview.
- Visual selection.
- Personalization.
- Goal cards linked to SMART goals.

It must feel like:

```text
I am building the future I can see.
```

It must not feel like a normal information form.

It should be reachable when it helps users visualize the plan, but the primary product journey should still guide them back to weekly action.

Avoid:

- Too many text fields.
- Overly technical editor UI.
- No preview.
- No templates.
- Generic blank canvas without guidance.

---

### 7.8 12-Week Plan

The 12-week plan can be more structured, but it must stay visually clear.

Use:

- Week cards.
- This week focus.
- Next action.
- Progress bar.
- Check-in.
- Simple milestones.
- Clear weekly rhythm.

Avoid:

- Dense tables.
- Spreadsheet-like layouts.
- Overloaded task lists.
- Too many metrics at once.

Each week should answer:

```text
What should I do this week?
What is the most important action?
How much progress have I made?
```

The user should always know what to do today or this week.

---

### 7.9 Today / Weekly Execution

The Today screen should be the most action-focused part.

It should answer:

```text
What should I do today?
What matters most this week?
What is already done?
What should I check in?
```

Good structure:

- Today's focus.
- 1–3 priority actions.
- Small progress indicator.
- Quick check-in.
- Encouraging microcopy.

Avoid:

- Showing the entire 12-week plan at once.
- Overwhelming user with backlog.
- Too many charts.

---

### 7.10 Reflection / Review

Reflection should feel calm and supportive.

It should help users learn, not feel guilty.

Good prompts:

```text
What worked this week?
What got in the way?
What is one small adjustment for next week?
```

Avoid:

```text
Why did you fail?
Why didn't you complete your tasks?
```

Reflection should lead to adjustment.

---

### 7.11 Order Kit / Payment

The order flow should make the physical kit feel tangible and desirable, while staying production-safe and trustworthy.

It should include:

- Product image or mockup.
- What is inside the kit.
- Delivery / receiving process.
- Clear price.
- Direct payment QR where relevant.
- Strong CTA.
- Trust signals.
- Support email or contact route.
- Links to legal pages before paid transaction.

Production rules:

- Real mode must never show mock/demo payment copy.
- Trial or entitlement copy must be account-bound, not browser-bound.
- Do not imply payment is complete until entitlement sync or provider confirmation says so.
- Do not add provider-specific assumptions unless the task targets that provider.
- If billing readiness is not proven, say so clearly instead of making the checkout more persuasive than the operation can support.

Avoid:

- Dry checkout-only feeling.
- Hidden price.
- Unclear next step.
- Too much payment jargon.
- Fake urgency.
- Demo-only language in real mode.

---

### 7.12 Admin surfaces

Admin pages may be more functional, but they should still be clean and consistent.

Admin surfaces can be more table-heavy, but must remain:

- Clear.
- Accessible.
- Consistent with tokens.
- Not visually mixed with user-facing emotional screens.

Do not let admin style leak into user-facing product screens.

---

## 8. Component-level rules

### 8.1 Forms

Forms should be guided and example-driven.

Rules:

- Use clear labels.
- Use examples or placeholders.
- Group related fields.
- Avoid too many fields at once.
- Use inline validation.
- Explain errors in human language.
- Preserve user input when errors happen.

### 8.2 Sliders

Sliders must have context.

A slider should include:

- What the score means.
- Min/max labels.
- Optional midpoint meaning.
- Live visual feedback where possible.

Avoid sliders that feel like arbitrary scoring.

### 8.3 Progress indicators

Use progress indicators to reduce uncertainty.

Good progress indicators:

- Step 1 of 6.
- 3 of 8 areas reviewed.
- Week 4 of 12.
- 60% complete.

Progress should encourage, not pressure.

### 8.4 Tables

Avoid tables on user-facing mobile screens.

Use tables only when:

- The data is truly tabular.
- The user needs comparison.
- The screen is admin or management-focused.

For user-facing planning, prefer cards, timelines, or weekly sections.

### 8.5 Modals

Use modals sparingly.

Good uses:

- Confirm destructive action.
- Show focused detail.
- Short guided explanation.
- Quick edit.

Avoid using modals for long workflows.

### 8.6 Tooltips

Tooltips should explain small concepts, not carry essential instructions.

If users need the tooltip to complete the screen, the main UI is not clear enough.

### 8.7 Navigation

Navigation must support the core journey.

The user should know:

- Where they are.
- What came before.
- What comes next.
- How to return safely.

Avoid exposing too many side routes before users finish the core journey.

### 8.8 Page shell

Default product page structure:

```text
Page context / progress
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
- Use constrained width and stable responsive grids so content does not stretch into loose desktop layouts.
- On mobile, use one column and keep the primary CTA easy to reach.

### 8.9 Guided step screens

For onboarding, Life Balance, SMART Goal, Feasibility, and 12-week setup, each step should have:

```text
Step indicator
-> One main question
-> Helpful example or preview
-> Input/choice
-> Primary CTA
```

Rules:

- Show only the current decision unless seeing the previous answer helps.
- Put advanced details behind disclosure.
- Keep examples close to the input they explain.
- Save locally before remote sync where the implementation already supports it.

### 8.10 Visual anchors

A visual anchor is not decoration. It must explain the user's current state, future result, or next action.

Good visual anchors:

- Life balance shape.
- Selected focus card.
- SMART goal preview.
- Feasibility meter with adjustment guidance.
- 12-week roadmap.
- This-week progress map.
- Reflection prompt card.

Avoid:

- Decorative gradients.
- Generic icon clusters.
- Images that do not reveal product state.
- Visuals that compete with forms or CTAs.

### 8.11 State surfaces

Every meaningful screen or component should consider:

- Loading: preserve layout space, avoid blank screens.
- Empty: explain what is missing and give one action.
- Error: say what happened, what is still safe locally, and how to retry.
- Success: name what changed and what the next step is.
- Offline/sync: keep local progress usable and show the safety state for signed-in real-mode users.

Do not hide production failures behind pretty empty states. If sync, auth, billing, or entitlement is uncertain, surface it calmly and specifically.

---

## 9. Responsive design rules

### Mobile

- Single-column layout by default.
- Primary CTA should be visible or easy to reach.
- Avoid dense grids.
- Avoid horizontal scrolling.
- Use larger tap targets.
- Keep headings short.
- Use progressive disclosure.
- Prevent text from overflowing buttons, cards, tabs, and badges.
- Prefer sticky bottom CTA only when it does not cover form fields or important content.

### Tablet

- Use two-column layout only when it improves clarity.
- Keep important visual preview near the main action.

### Desktop

- Use wider layouts for visual storytelling.
- Good patterns:
  - Left content + right preview.
  - Main task + sticky insight panel.
  - Card grid + visual summary.
- Do not fill space with unnecessary widgets.
- Use stable dimensions for repeated tiles, progress widgets, and toolbars so hover/loading/content changes do not shift layout.

---

## 10. Accessibility rules

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
- Keep keyboard submission behavior for forms where users expect Enter-to-submit.
- Keep screen reader semantics when replacing native controls with custom UI.

Accessibility is part of product quality, not an optional layer.

---

## 11. AI redesign workflow

Before editing any screen, always do this:

### Step 0 — Confirm scope and authority

Answer internally:

```text
Is this screen in the current production priority?
Does this change touch auth, billing, sync, localStorage, or routing?
Which existing tokens/components should be reused?
Which verification commands are appropriate for the risk?
```

If a requested visual change conflicts with production safety, preserve production safety and report the tradeoff.

### Step 1 — Identify the screen purpose

Answer internally:

```text
Where is this screen in the journey?
What is the user's main job here?
What result should the user get after this screen?
What is the main CTA?
```

### Step 2 — Identify user friction

Check:

```text
Is there too much text?
Are there too many choices?
Is the main CTA obvious?
Is there a meaningful visual?
Is any advanced detail shown too early?
Does the user need an example?
Does the mobile layout remain easy?
Is the screen too dashboard-like?
Is the screen too generic?
```

### Step 3 — Redesign using the North Star

The result must be:

```text
Dreamy
Guided
Visual
Clear
Action-oriented
Mobile-friendly
```

Inside production and accessibility guardrails, choose the more distinctive screen concept over the safer generic arrangement. The screen should have one memorable design idea that helps the user understand the task or result.

### Step 4 — Preserve engineering safety

Unless explicitly asked, preserve:

- Existing routes.
- Existing business logic.
- Existing localStorage/sessionStorage behavior.
- Existing analytics events.
- Existing API contracts.
- Existing TypeScript safety.
- Existing tests where applicable.
- Existing app mode handling.
- Existing auth and billing safety rules.
- Existing local-first behavior when sync is unavailable.
- Existing production/demo route gating.

### Step 5 — Final checklist

Before finishing, verify:

```text
[ ] There is one clear primary CTA.
[ ] The user knows where they are in the journey.
[ ] The screen has a meaningful visual element.
[ ] Text is shorter and easier to scan.
[ ] Forms include examples or just-in-time guidance.
[ ] Mobile layout is comfortable.
[ ] Existing tokens and design system are respected or intentionally extended.
[ ] Creative visual details are tokenized, scoped, accessible, and tied to the user's task.
[ ] Motion respects reduced-motion preferences.
[ ] The screen feels like Dear Our Future, not a generic SaaS app.
[ ] The screen creates a clear next step.
[ ] No business logic, routes, storage, or analytics were broken.
[ ] Auth, billing, sync, and app-mode behavior were not weakened.
```

---

## 12. Anti-patterns to avoid

Do not:

1. Add long explanations to fix confusion.
2. Make the app look like an admin dashboard.
3. Use dark mode as the default visual direction.
4. Put too many charts on the first impression.
5. Force users through too many setup steps before they get value.
6. Hide the main CTA among many equal buttons.
7. Use random colors outside the design system instead of adding intentional semantic roles.
8. Give each screen an unrelated visual style instead of a screen-specific expression of the same product world.
9. Use generic AI-generated layouts.
10. Leave users unsure about the next step.
11. Build dense table-first mobile UI.
12. Make Vision Board screens feel like normal forms.
13. Use guilt-driven productivity copy.
14. Make scoring feel like judgment.
15. Show advanced settings too early.
16. Replace emotional clarity with technical complexity.
17. Add new dependencies for visual polish without a strong user-facing reason, bundle/performance check, and fallback plan.
18. Break local-first behavior for UI changes.
19. Ignore empty, loading, error, and success states.
20. Optimize desktop while making mobile worse.
21. Use `app-warm-*` outside Reflection/Review unless there is a documented semantic reason.
22. Add demo-only copy, mock payment language, or browser-bound trial language to real-mode surfaces.
23. Make billing, auth, sync, legal, or account lifecycle screens emotionally vague.
24. Animate every card or list item just because motion is available.
25. Hide production uncertainty behind optimistic marketing copy.

---

## 13. Implementation guidance

When implementing UI changes:

- Prefer existing components before adding new ones.
- Use Tailwind classes that map to existing semantic tokens.
- Keep accessibility: labels, aria attributes, focus states, contrast, keyboard flow.
- Avoid large rewrites unless necessary.
- Keep components readable and maintainable.
- Do not break the product flow.
- Do not mix unrelated refactors with UI redesign.
- Keep changes focused on the requested screen unless a shared component must change.
- Avoid changing localStorage shapes, route registration, auth/billing/sync behavior, app-mode handling, or analytics while doing visual work.
- If a UI problem requires product or data-model changes, stop and report the risk instead of smuggling it into a redesign.
- Use small reusable patterns only when they remove meaningful duplication across core journey screens.
- For motion, prefer existing CSS transitions for simple hover states and use Framer Motion only where it improves route/step/list transitions.
- Run typecheck/lint/build after meaningful changes when available.

Recommended commands after UI changes:

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

---

## 14. Prompt template for AI agents

Use this prompt when asking an AI agent to redesign a screen:

```text
Read docs/DESIGN.md first and follow it as the design authority.
Also check guidelines/CURRENT_PROJECT_STATUS.md for current production scope.

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
- The screen follows the Dear Our Future design north star.
- The screen has one clear primary CTA.
- The screen has a meaningful visual element.
- The screen is less text-heavy and easier to use.
- The screen works well on mobile.
- The screen remains production-safe in real mode.

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

## 15. Definition of done for UI/UX redesign

A UI/UX redesign is done only when:

```text
[ ] The user can understand the screen within 5 seconds.
[ ] The primary CTA is obvious.
[ ] The screen has a visual anchor.
[ ] The copy is short and human.
[ ] The screen guides the user to the next step.
[ ] Mobile layout is comfortable.
[ ] Loading, empty, error, and success states are considered where relevant.
[ ] Accessibility is not degraded.
[ ] Existing logic and data flow are preserved.
[ ] Existing auth, billing, sync, entitlement, route, and app-mode behavior are preserved.
[ ] Local-first behavior still works when backend/Firebase/sync is unavailable.
[ ] Semantic tokens are used or intentionally extended; no one-off primitive colors or unrelated visual systems were added.
[ ] Motion, if added, is purposeful and respects reduced motion.
[ ] The result feels like Dreamy Guided Productivity.
```

If any item fails, the redesign is not finished.

---

## 16. UI review rubric

Use this rubric when reviewing a screen or asking an AI agent to verify UI quality. Score each category from 0 to 3.

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
| Accessibility | Focus/labels/contrast broken | Several risks | Minor issues only | Keyboard, focus, labels, contrast, and reduced motion are sound |
| Production safety | Breaks or weakens product contracts | Risky/unverified changes | Safe with minor uncertainty | Preserves auth/billing/sync/localStorage/app-mode behavior |

Interpretation:

```text
0-17: Do not ship. Redesign direction or safety is failing.
18-24: Needs another pass before production.
25-28: Good enough with small polish.
29-30: Strong production UI.
```

For the core journey, any category scored `0` blocks the redesign even if the total score is high.
