# Goals Editorial Journey Design

**Date:** 2026-07-11
**Status:** Awaiting user review
**Surface classification:** Shell

## Context

The `/goals` page already provides goal creation, search, filtering, progress summaries, today's focus, task completion, goal deletion, paywall handling, local-first persistence, and optional remote-delete sync. This change upgrades presentation only. It must not change stored shapes, entitlement rules, route availability, sync behavior, or goal progress calculations.

The selected visual direction is **Editorial Journey**: warm, reflective, and motivating without becoming a marketing page. The page should help users feel that their daily actions are part of a meaningful longer journey.

## Goals

- Make the page feel more inspiring and emotionally resonant.
- Give the page a clear narrative hierarchy: aspiration, today's promise, progress story, then goal management.
- Preserve fast access to creating, continuing, filtering, updating, and deleting goals.
- Keep the interface calm, accessible, and mobile-safe.
- Use only the existing system design tokens and established typography.

## Non-goals

- No changes to `Goal`, `UserData`, `TwelveWeekSystem`, localStorage keys, migrations, API contracts, billing, or sync semantics.
- No new dependency, image-generation asset, theme, or independent color palette.
- No new gamification system, social feature, AI coach, or achievement logic.
- No redesign of SMART Goal Setup or the 12-week execution pages.
- No new glow, parallax, animated background, or 3D card interaction.

## Visual Direction

Editorial Journey uses the product's existing serif/sans pairing to create contrast between reflective narrative and practical action. Large serif statements provide emotional emphasis; compact sans-serif labels, metadata, and controls preserve clarity.

The tone is warm and grounded rather than celebratory or luxurious. Surfaces should feel like an editorial planning journal built from the existing application system, not a separate campaign page.

## System Token Constraint

All colors, borders, shadows, radii, and type colors must use existing semantic tokens and utilities, including:

- `app-bg`, `app-bg-subtle`, `app-surface`
- `app-ink`, `app-ink-soft`, `app-ink-muted`
- `app-line`
- `app-accent`, `app-accent-hover`, `app-accent-soft`, `app-accent-subtle`
- existing `app-status-*` and `app-energy` tokens where status meaning requires them
- existing `--app-shadow-*` and `--app-radius-*` variables

The implementation must not add hard-coded hex colors for this page. Status colors must retain their system meaning; they must not be used as decoration.

## Page Hierarchy

### 1. Editorial Hero

Replace the current image-led hero with a token-based editorial composition.

- Left side: eyebrow, reflective headline, supporting sentence, primary 12-week CTA, and secondary quick-goal CTA.
- Right side on desktop: compact current-cycle panel using existing goal/system data such as current week and completion rhythm.
- Mobile: stack the narrative and cycle panel vertically; both CTAs remain full-width or comfortably tappable.
- Do not add a new image asset. Atmosphere comes from spacing, typography, surface contrast, and restrained token-based gradients.

### 2. Today's Promise

Evolve `TodayFocusCard` into the strongest actionable element after the hero.

- Label it as the most important promise for today.
- Keep the current focus-selection priority and task-toggle behavior unchanged.
- Show one clear action, the linked goal, and relevant timing/context.
- When no focus exists, retain the existing new-goal action and positive empty message.

### 3. Progress Story

Present existing summary values as a short narrative plus supporting metrics.

- Use deterministic copy derived from existing completion values; do not generate or persist new insight data.
- Keep the current total goals, completed tasks, active cycles, and attention count available.
- Visually prioritize the progress sentence and completion bar; metrics become supporting information.
- Attention state uses the existing error/status token only when `needsAttention > 0`.

### 4. Goal Collection

Rename the visual section heading to an editorial phrase such as “Các hành trình của bạn” while keeping accessible and product-clear labels around filters and controls.

- Search and all existing filters remain available.
- Search may visually integrate with the collection toolbar on desktop and remain full-width on mobile.
- Preserve separate 12-week and standard-goal groups.
- Preserve empty, no-result, loading, and retry states.

### 5. Goal Cards

Simplify cards into two static information zones:

- Main zone: archetype/life area, title, deadline health, progress narrative, progress bar, and primary CTA.
- Next-step zone: up to two current tasks, task toggle controls, and delete action.
- Completed goals show completion details inline instead of using a 3D flip interaction.
- The cards must retain all task-toggle, open-cycle, delete, completion, and paywall behavior.
- Decorative hierarchy must use system tokens and typography rather than new illustrations or per-card color themes.

## Responsive Behavior

- Desktop uses a contained editorial canvas within the current application layout.
- At tablet widths, hero and goal-card columns collapse before content becomes cramped.
- Mobile uses a single column with no horizontal page overflow.
- Filters remain horizontally scrollable if required, with visible focus treatment and usable touch targets.
- Primary controls should meet a minimum practical touch height of approximately 44px.
- Long Vietnamese titles and descriptions must wrap without pushing controls off-screen.

## Accessibility

- Preserve semantic headings in a logical order.
- Preserve existing `aria-label`, `aria-pressed`, dialog, retry, and screen-reader loading behavior.
- Decorative lines and shapes use `aria-hidden="true"`.
- Progress information must remain understandable without relying on color alone.
- Focus-visible states use existing accent/status tokens.
- Respect `prefers-reduced-motion`; the redesign adds no essential motion.
- Maintain readable contrast in both light and dark themes through semantic tokens.

## Data and Behavior Contract

WHEN the page renders, THE system SHALL calculate and display goals using the existing storage and progress helpers.

WHEN a task is toggled, THE system SHALL preserve the existing optimistic local-first update, celebration, toast, and rollback behavior.

WHEN a goal is deleted, THE system SHALL preserve the existing confirmation, local deletion, undo eligibility, tombstone queueing, and remote sync behavior.

WHEN the user creates a goal, THE system SHALL preserve the existing entitlement checks and guided/direct routes.

WHEN search or filters produce no results, THE system SHALL distinguish that state from the no-goals state.

WHERE dark mode is active, THE system SHALL derive colors from the same semantic tokens rather than page-specific overrides.

## Implementation Boundaries

Expected files are limited primarily to:

- `src/app/pages/GoalTracker.tsx`
- `src/app/pages/GoalTracker/components/TodayFocusCard.tsx`
- `src/app/pages/GoalTracker/components/GoalSummaryStrip.tsx`
- `src/app/pages/GoalTracker/components/GoalFilterChips.tsx`
- `src/app/pages/GoalTracker/components/GoalCard.tsx`
- focused GoalTracker tests and the calm-style audit if its contract needs updating

No storage, backend, billing, auth, or sync module should require implementation changes.

## Verification

- Add or update focused component/page tests for preserved empty states, filtering, task toggling, deletion controls, and completed-goal rendering.
- Run targeted GoalTracker tests first.
- Run `npm run typecheck`.
- Run targeted Biome lint for changed files; broaden to `npm run lint` if the worktree permits a meaningful result.
- Run `npm run test:run` and `npm run build` when scoped changes are complete.
- Perform visual browser checks on desktop and mobile in light and dark themes.
- Confirm no hard-coded color values were introduced in the changed Goals files.

## Acceptance Criteria

- The page visibly follows the approved Editorial Journey hierarchy.
- The page uses only existing system color and style tokens.
- Hero, today's promise, progress story, filters, groups, and cards remain understandable at mobile widths.
- All existing goal-management behaviors remain functional.
- Existing loading, empty, error, and no-result states remain mutually clear.
- Completed goals no longer depend on a 3D flip interaction.
- No persisted data shape, route contract, entitlement rule, or sync behavior changes.
- Focused tests, typecheck, build, and browser verification pass or any environmental blocker is reported precisely.
