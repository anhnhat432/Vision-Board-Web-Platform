# 12-Week Setup Guided Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with checkpoints.

**Goal:** Reshape /12-week-setup into a bright, calm four-step Guided Canvas that reduces cognitive load without changing setup data contracts or local-first behavior.

**Architecture:** Keep TwelveWeekSetupLab as the orchestration owner and preserve its draft, validation, plan generation, save, and sync handlers. Extract only a setup summary card; simplify the existing step components in place; make PlanPreviewStepLab explain the post-save Today destination instead of leading with a large phone mockup.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Radix primitives, Lucide icons, Vitest, Testing Library, Biome, Vite.

## Global Constraints

- Scope is only /12-week-setup; do not redesign /smart-goal-setup.
- Do not change routes, localStorage keys/shapes, migrations, normalization, domain calculations, auth gates, billing/entitlement, outbox ordering, sync authority, or backend contracts.
- Preserve local save before remote sync; sync failure must not delete draft or progress.
- Keep demo mode independent from protected backend sync paths.
- Use Source Serif 4 for display headings and Be Vietnam Pro for body/control copy; add no dependency.
- Mobile 360–767px must have no horizontal body overflow and primary touch targets must be at least 44px.
- Inline helpers replace setup-screen guide overlays; validation remains deferred until Continue/Activate is pressed.
- prefers-reduced-motion: reduce disables non-essential motion.

---

### Task 1: Lock the Guided Canvas contracts with failing route and component tests

**Files:**
- Create: src/app/pages/12WeekSetup.guided-canvas.test.tsx
- Create: src/features/plan12week/pages/12WeekSetup/components/GuidedCanvasCopy.test.tsx
- Modify: src/app/pages/core-funnel-a11y.test.tsx
- Modify: src/test/ux-ui-upgrade/core-flow-content-order.test.tsx

**Interfaces:**
- The route test uses resetTestStorage, seedPendingSetupContext, and renderAppRoute from src/test/app-flow-helpers.tsx.
- Tests produce durable assertions for summary hierarchy, no auto-open guide, inline copy, collapsed advanced options, activation copy, and touch targets.

- [ ] Step 1: Add the failing route-level summary test against the current page.

~~~tsx
it("keeps setup context focused on the current 12-week destination", async () => {
  resetTestStorage();
  seedPendingSetupContext();
  renderAppRoute("/12-week-setup");

  expect(await screen.findByRole("heading", { name: "Tạo kế hoạch 12 tuần" })).toBeInTheDocument();
  expect(screen.getByText("Mục tiêu 12 tuần")).toBeInTheDocument();
  expect(screen.getByText("Ra mắt flow 12 tuần dễ dùng hơn")).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: "Lộ trình hành trình 12 tuần" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Dựa trên mục tiêu SMART/i)).not.toBeInTheDocument();
});
~~~

- [ ] Step 2: Add copy and disclosure assertions for OutcomeStepLab, LeadIndicatorsStepLab, ScheduleStepLab, and PlanPreviewStepLab.

~~~tsx
expect(screen.getByRole("heading", { name: "Bạn muốn thấy điều gì sau 12 tuần?" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /Chọn 2–3 việc sẽ kéo bạn tới đó/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /Tùy chỉnh thêm/i })).toHaveAttribute("aria-expanded", "false");
expect(screen.getByText(/Sau khi kích hoạt, bạn sẽ vào màn Hôm nay/i)).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Kích hoạt kế hoạch" })).toBeInTheDocument();
~~~

- [ ] Step 3: Extend core-funnel-a11y.test.tsx with one h1, accessible progress, visible primary CTA, and no auto-open ScreenGuide dialog. Extend core-flow-content-order.test.tsx with summary → step shell → step content → action bar order.

- [ ] Step 4: Run the focused tests and confirm they fail.

Run:

~~~bash
npm run test:run -- src/app/pages/12WeekSetup.guided-canvas.test.tsx src/features/plan12week/pages/12WeekSetup/components/GuidedCanvasCopy.test.tsx src/app/pages/core-funnel-a11y.test.tsx src/test/ux-ui-upgrade/core-flow-content-order.test.tsx
~~~

Expected: FAIL because the current route still renders the roadmap image, the old goal label, duplicate SMART explanation, and current step copy.

- [ ] Step 5: Commit the test contract.

~~~bash
git add src/app/pages/12WeekSetup.guided-canvas.test.tsx src/features/plan12week/pages/12WeekSetup/components/GuidedCanvasCopy.test.tsx src/app/pages/core-funnel-a11y.test.tsx src/test/ux-ui-upgrade/core-flow-content-order.test.tsx
git commit -m "test: define guided canvas setup contracts"
~~~

---

### Task 2: Replace the oversized setup header with the 12-week summary card

**Files:**
- Create: src/features/plan12week/pages/12WeekSetup/components/SetupSummaryCard.tsx
- Modify: src/features/plan12week/pages/12WeekSetupLab.tsx
- Modify: src/features/plan12week/pages/12WeekSetup/components/SetupStepShellLab.tsx
- Test: src/app/pages/12WeekSetup.guided-canvas.test.tsx

**Interfaces:**

~~~ts
interface SetupSummaryCardProps {
  focusArea: string;
  goalTitle: string;
  isSavingDraft: boolean;
  aspirationalVisionSummary?: string;
}
~~~

SetupSummaryCard is presentation-only. SetupStepShellLab keeps its existing handler props and children contract.

- [ ] Step 1: Implement SetupSummaryCard with the focus-area eyebrow, h1 'Tạo kế hoạch 12 tuần', one goal-context row labelled 'Mục tiêu 12 tuần', autosave state, and the optional aspirational-vision sentence.

Use app tokens and no image banner. Do not render /twelve_week_roadmap.webp or /twelve_week_roadmap.png.

- [ ] Step 2: Replace the current page banner, duplicate SMART explanation, and separate target panel with:

~~~tsx
<SetupSummaryCard
  focusArea={focusArea}
  goalTitle={smartGoal.specific.trim() || "mục tiêu của bạn"}
  isSavingDraft={isSavingDraft}
  aspirationalVisionSummary={aspirationalVision?.summary}
/>
~~~

Keep CoreFlowProgress and UpgradePaywallDialog behavior unchanged.

- [ ] Step 3: Change the primary route ScreenGuide to autoOpen={false}. Keep its accessible trigger and existing guide content; do not remove the gate action handlers.

- [ ] Step 4: Simplify SetupStepShellLab chrome without changing navigation semantics: keep the connected four-step progress, current-step aria semantics, completed-step jump behavior, mobile action bar, onBack, onNext, onSubmit, and stepError. Use the labels Đích đến, Hành động, Lịch tuần, Kích hoạt and keep action buttons at least min-h-11.

- [ ] Step 5: Run:

~~~bash
npm run test:run -- src/app/pages/12WeekSetup.guided-canvas.test.tsx src/app/pages/core-funnel-a11y.test.tsx src/test/ux-ui-upgrade/core-flow-content-order.test.tsx
npm run typecheck
~~~

Expected: summary, heading, no-auto-open, and content-order tests pass.

- [ ] Step 6: Commit:

~~~bash
git add src/features/plan12week/pages/12WeekSetup/components/SetupSummaryCard.tsx src/features/plan12week/pages/12WeekSetupLab.tsx src/features/plan12week/pages/12WeekSetup/components/SetupStepShellLab.tsx src/app/pages/12WeekSetup.guided-canvas.test.tsx src/app/pages/core-funnel-a11y.test.tsx src/test/ux-ui-upgrade/core-flow-content-order.test.tsx
git commit -m "feat: simplify twelve-week setup header"
~~~

---

### Task 3: Simplify destination and recurring-action steps without changing draft shape

**Files:**
- Modify: src/features/plan12week/pages/12WeekSetup/components/OutcomeStepLab.tsx
- Modify: src/features/plan12week/pages/12WeekSetup/components/LeadIndicatorsStepLab.tsx
- Modify: src/features/plan12week/pages/12WeekSetup/components/LeadIndicatorsStep.test.tsx
- Modify: src/features/plan12week/pages/12WeekSetup/components/GuidedCanvasCopy.test.tsx

**Interfaces:** Preserve OutcomeStepLab and LeadIndicatorsStepLab prop names, the generic onChange/onIndicatorChange signatures, the 2–4 indicator constraint, target/unit validation, add/remove behavior, template callbacks, LeadIndicatorDraft, and LeadIndicatorCommitment shape.

- [ ] Step 1: Add failing tests for outcome-first copy, action-first hierarchy, the secondary 'Thêm việc của riêng bạn' action, and collapsed commitment accordions with reachable fields.

- [ ] Step 2: Refactor OutcomeStepLab visible order to: outcome textarea with one contextual example; metric name/target/unit row; editable suggested goal-type chip; optional milestones/evidence under 'Tùy chỉnh thêm'. Remove repeated framework explanations and duplicate outcome cards while preserving validation ids and controlled inputs.

- [ ] Step 3: Refactor LeadIndicatorsStepLab visible order to: one-line controllable-action explanation; goalType-based suggestion chips; selected action rows with name/target/unit/remove; secondary 'Thêm việc của riêng bạn'; commitment fields under 'Cài đặt nâng cao', collapsed initially. Keep TACTIC_SUGGESTIONS, QUICK_UNITS, target +/- controls, error ids, and commitment normalization.

- [ ] Step 4: Run:

~~~bash
npm run test:run -- src/features/plan12week/pages/12WeekSetup/components/LeadIndicatorsStep.test.tsx src/features/plan12week/pages/12WeekSetup/components/GuidedCanvasCopy.test.tsx
~~~

Expected: existing commitment/validation tests and new copy/order tests pass.

- [ ] Step 5: Commit:

~~~bash
git add src/features/plan12week/pages/12WeekSetup/components/OutcomeStepLab.tsx src/features/plan12week/pages/12WeekSetup/components/LeadIndicatorsStepLab.tsx src/features/plan12week/pages/12WeekSetup/components/LeadIndicatorsStep.test.tsx src/features/plan12week/pages/12WeekSetup/components/GuidedCanvasCopy.test.tsx
git commit -m "feat: streamline twelve-week actions setup"
~~~

---

### Task 4: Make scheduling progressive and preview activation explicit

**Files:**
- Modify: src/features/plan12week/pages/12WeekSetup/components/ScheduleStepLab.tsx
- Modify: src/features/plan12week/components/PlanPreviewStepLab.tsx
- Modify: src/features/plan12week/pages/12WeekSetup/components/ScheduleStep.test.tsx
- Modify: src/app/pages/core-funnel-a11y.test.tsx
- Modify: src/features/plan12week/pages/12WeekSetup/components/GuidedCanvasCopy.test.tsx

**Interfaces:** Preserve ScheduleStepProps, PlanPreviewStepLabProps, all onChange keys, PlanPreviewLab input shape, canConfirm, validationMessage, and onSubmit wiring. Do not change TwelveWeekSetupLab persistence or plan-generation handlers.

- [ ] Step 1: Add failing tests for 'Đặt nhịp cho tuần đầu', default-collapsed 'Tùy chỉnh thêm', dd/mm/yyyy helper copy, post-activation explanation, and 'Kích hoạt kế hoạch' CTA.

- [ ] Step 2: Refactor ScheduleStepLab visible order to: start-date quick choices; weekly action days; review day; advanced disclosure for daily budget, load preference, and other advanced inputs. Use plain copy such as 'Chọn nhịp bạn có thể giữ đều' and 'Ngày xem lại tuần'. Keep date validation, preferred-day state, sound behavior, and reduced-motion behavior.

- [ ] Step 3: Replace the large phone frame in PlanPreviewStepLab with three calm sections: 'Đích đến tuần 12', 'Tuần 1 bắt đầu bằng', and 'Sau khi kích hoạt'. Keep PlanPreviewLab available inside a collapsed 'Xem toàn bộ lộ trình' disclosure and preserve canConfirm, validationMessage, and onSubmit.

- [ ] Step 4: Run:

~~~bash
npm run test:run -- src/features/plan12week/pages/12WeekSetup/components/ScheduleStep.test.tsx src/features/plan12week/pages/12WeekSetup/components/GuidedCanvasCopy.test.tsx src/app/pages/core-funnel-a11y.test.tsx
~~~

Expected: date constraints, validation, accessibility, and activation-copy tests pass.

- [ ] Step 5: Commit:

~~~bash
git add src/features/plan12week/pages/12WeekSetup/components/ScheduleStepLab.tsx src/features/plan12week/components/PlanPreviewStepLab.tsx src/features/plan12week/pages/12WeekSetup/components/ScheduleStep.test.tsx src/app/pages/core-funnel-a11y.test.tsx src/features/plan12week/pages/12WeekSetup/components/GuidedCanvasCopy.test.tsx
git commit -m "feat: clarify twelve-week activation preview"
~~~

---

### Task 5: Integrate, verify responsive behavior, and update setup documentation

**Files:**
- Modify: docs/ux/12-week-setup-limited-rollout-monitoring.md
- Modify: docs/ux/12-week-setup-lab-polish-backlog.md
- Test: src/test/ux-ui-upgrade/core-flow-a11y-keyboard.test.tsx
- Test: src/test/ux-ui-upgrade/calm-style-audit.test.ts

**Interfaces:** Documentation describes the current /12-week-setup route and only claims verification that actually ran. Tests consume the unchanged route and storage behavior from Tasks 2–4.

- [ ] Step 1: Extend keyboard/reduced-motion tests for one h1, progress focus/current-step semantics, advanced disclosure aria-expanded/aria-controls, keyboard-reachable primary CTA, and no new long-running animation classes.

- [ ] Step 2: Run the complete frontend verification:

~~~bash
npm run typecheck
npm run lint
npm run test:run
npm run build
~~~

Expected: typecheck, lint, all frontend tests, and Vite production build pass.

- [ ] Step 3: Run core-flow and visual checks:

~~~bash
npm run smoke:core-quality
$env:UX_UI_QA_OUTPUT_DIR = "artifacts/visual-ux-ui/12-week-setup-guided-canvas"; npm run qa:visual-ux-ui
~~~

Inspect 1440x900 and 390x844 for summary → step shell → form order, no horizontal overflow, visible CTA, 44px controls, no auto-open overlay, and a clear Today next step.

- [ ] Step 4: Record passing commands, viewport sizes, and any non-blocking limitation in docs/ux/12-week-setup-limited-rollout-monitoring.md. Update the polish backlog only for items actually verified.

- [ ] Step 5: Run final review:

~~~bash
git diff --check
git status --short
git diff --stat HEAD~4..HEAD
~~~

Confirm the existing user change in docs/ops/presentation-day-checklist-2026-07-21.md remains untouched.

- [ ] Step 6: Commit verification/docs:

~~~bash
git add src/test/ux-ui-upgrade/core-flow-a11y-keyboard.test.tsx src/test/ux-ui-upgrade/calm-style-audit.test.ts docs/ux/12-week-setup-limited-rollout-monitoring.md docs/ux/12-week-setup-lab-polish-backlog.md
git commit -m "test: verify guided twelve-week setup"
~~~

## Plan self-review

- Spec coverage: Tasks 1–2 cover summary/header, route scope, on-demand guidance, one h1, progress semantics, and content order. Task 3 covers outcome/action copy, suggestions, limits, commitment disclosure, and draft-shape preservation. Task 4 covers schedule disclosure, date validation, activation explanation, and preview hierarchy. Task 5 covers responsive/accessibility/reduced-motion checks, smoke, visual QA, and documentation evidence.
- Placeholder scan: no TBD, TODO, or vague “write tests for the above” steps remain; every task names files, commands, and expected outcomes.
- Type consistency: SetupSummaryCardProps is defined once in Task 2; existing step prop types and TwelveWeekSetupDraft remain unchanged across Tasks 3–4; PlanPreviewStepLabProps keeps existing callback names and preview inputs.
- Scope check: only /12-week-setup presentation, focused tests, and setup docs change; SMART Goal, backend, sync contracts, billing, and other routes remain out of scope.
