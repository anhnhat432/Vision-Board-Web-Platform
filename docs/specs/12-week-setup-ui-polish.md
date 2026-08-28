# 12-Week Setup UI Polish Spec

## 1. Context & Goal

- Feature: simplify the final schedule and preview steps of `/12-week-setup`.
- Why now: first-time users reported too much copy, unclear guidance, and an unclear next step after activation.
- User impact: a calmer setup flow with plain-language scheduling and one obvious activation action.
- Modes affected: both `real` and `demo`.

## 2. Surface Classification

- Type: `Mixed`.
- Core contract: `SetupStepShellLab` is the only owner of the final submit action.
- Shell surface: schedule copy, preview hierarchy, and the optional full-roadmap disclosure.
- Invariants: routes, saved shapes, local-first save order, sync behavior, navigation, and validation semantics do not change.

## 3. Actors & Entry Points

- Primary actor: a first-time user finishing a 12-week plan.
- Route: `/12-week-setup`.
- Touchpoints: `TwelveWeekSetupLab`, `SetupStepShellLab`, `ScheduleStepLab`, and `PlanPreviewStepLab`.
- API, storage, auth, billing, and entitlement contracts: unchanged.

## 4. Functional Requirements

- `TWSETUP-UI-01`: WHEN the user reaches the final setup step, THE system SHALL expose exactly one enabled submit action named `Kích hoạt kế hoạch` when the draft is valid.
- `TWSETUP-UI-02`: WHILE submission is in progress, THE system SHALL keep the shell-owned activation action disabled using the existing submit state.
- `TWSETUP-UI-03`: WHEN the preview renders, THE system SHALL explain that activation leads to `Hôm nay` without submitting from inside the preview content.
- `TWSETUP-UI-04`: WHEN the schedule step first renders, THE system SHALL keep optional capacity settings collapsed under `Tùy chỉnh thêm`.
- `TWSETUP-UI-05`: WHEN the user toggles the roadmap disclosure, THE system SHALL show or hide the existing 12-week preview without modifying the draft.

## 5. Data, Storage, and Sync Constraints

- No localStorage key, stored shape, migration, backend model, or API payload changes.
- The existing local-save-before-sync order remains owned by `handleSubmit`.
- No new sync, Firebase, billing, or provider calls.

## 6. Non-functional Requirements

- The activation action keeps a minimum 44px touch target and visible keyboard focus.
- Disclosure controls expose `aria-expanded` and `aria-controls`.
- Layout remains usable without horizontal overflow at 390px.
- No new dependency, raster asset, or decorative motion.

## 7. Out of Scope

- Execution-system tabs, dashboard, billing, auth, backend sync, and production configuration.
- Provider selection between PayOS and Casso.
- Production deployment.

## 8. Acceptance Criteria

- [ ] Schedule copy is shorter and advanced capacity options start collapsed.
- [ ] Preview shows the week-12 outcome, first-week actions, and a collapsed full roadmap.
- [ ] Final step exposes exactly one `Kích hoạt kế hoạch` submit action.
- [ ] Existing local save, best-effort sync, and navigation handler remain unchanged.
- [ ] Focused tests, `typecheck`, `lint`, full test suite, and build pass.

## 9. Verification Plan

```bash
npm run test:ui -- src/features/plan12week/pages/12WeekSetup/components/ScheduleStep.test.tsx src/app/pages/core-funnel-a11y.test.tsx
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Visual QA covers `/12-week-setup` at desktop and mobile widths on a preview deployment.

## 10. Open Questions / Follow-ups

- Preview Firebase/auth configuration and the four staging proofs are deployment gates, not part of this UI contract.
- `vitest.flows.config.ts` currently has stale selectors for setup and execution copy on the clean `origin/main` baseline; repair belongs in a separate test-maintenance change.
