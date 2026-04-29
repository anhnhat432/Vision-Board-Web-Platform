# MVP 1 Scope

Last reviewed: 2026-04-29

MVP 1 decision: local-first public demo for the 12-week execution system.

This document narrows the project for the first public demo. It is intentionally smaller than the broader full-stack product direction in `README.md` and `AGENTS.md`.

## 1. MVP goal

MVP 1 should prove one thing clearly:

> A visitor can turn a vague life priority into a usable 12-week execution system, then understand what to do today, how to review the week, and how progress is tracked.

The demo must work without:

- real payment
- required login
- required Firebase
- required backend
- perfect cloud sync

The demo may use localStorage, mock checkout, local entitlements, and demo-safe env settings.

## 2. Target user

Primary user:

- A first-time visitor who wants a practical personal execution system.
- They may have a goal but do not know how to turn it into weekly and daily action.
- They should get value before creating an account or paying.
- They may be on mobile, so the flow must be readable and low-friction on a small screen.

Secondary user:

- A returning demo user on the same browser/device.
- They expect their local plan, tasks, review, and progress to still be there.

## 3. Core user journey

Primary MVP 1 journey:

1. Visitor opens the app in demo mode.
2. Visitor starts the core flow from the dashboard or onboarding CTA.
3. Visitor completes onboarding / life balance.
4. Visitor sees life insight and chooses a focus.
5. Visitor writes a SMART goal.
6. Visitor completes feasibility check.
7. Visitor creates a 12-week plan.
8. Visitor lands in `/12-week-system`.
9. Visitor sees the Today tab first and understands the next tasks.
10. Visitor completes at least one task.
11. Visitor saves a daily check-in.
12. Visitor opens the Week tab and completes or previews weekly review.
13. Visitor opens Progress and sees the 12-week cycle status.
14. Visitor opens a premium template or premium review teaser and can complete mock upgrade.

The journey should feel like one focused product, not a collection of separate tools.

## 4. Features to keep in MVP 1

Keep and polish these because they directly support the MVP promise:

- Dashboard entry point for new and returning users.
- Onboarding / life balance assessment.
- Life insight flow.
- SMART goal setup.
- Feasibility check.
- 12-week setup:
  - free templates
  - premium template teaser
  - 2-4 recurring tactics
  - review day
  - start date
  - week 4 / week 8 / week 12 milestones
  - local save before any backend sync
- 12-week system:
  - Today tab
  - task toggle
  - daily check-in
  - Week tab
  - weekly review
  - Progress tab
  - Settings tab for local/demo controls that affect the 12-week loop
- Local persistence:
  - goals
  - 12-week system
  - task instances
  - daily check-ins
  - weekly reviews
  - reflection entries created from weekly review
  - local subscription/entitlements
  - local event log/outbox for demo diagnostics
- Mock upgrade:
  - paywall dialog
  - mock checkout page
  - local subscription state
  - local entitlement unlock
  - return to the original flow after mock checkout
- Demo-safe deployment:
  - `VITE_APP_MODE=demo`
  - no Firebase required
  - no backend required
  - `VITE_BILLING_PROVIDER_MODE=mock_provider`
- Core regression tests and production smoke path for the public demo.

## 5. Features to remove from MVP 1 scope

These may remain in the repo, but they should not drive MVP 1 planning or block the public demo:

- Real payment provider integration.
- Real subscription webhooks.
- Server-side entitlement authority.
- Perfect cloud sync across devices.
- Required login/signup before the user can experience the 12-week flow.
- Admin order management.
- Real order checkout flow.
- Backend-first data ownership for all domains.
- Vision board editor/gallery as a main demo promise.
- Achievements as a main demo promise.
- Advanced analytics as a main demo promise.
- Production email reminders.
- Production push notifications.
- Multi-user collaboration, groups, workshops, or community features.
- AI coaching, forecasting, or complex recommendation engines.

For MVP 1, these can be hidden, de-emphasized, or treated as later-stage surfaces.

## 6. Mock/demo components allowed

Allowed in MVP 1:

- Demo mode via `src/app/utils/app-mode.ts`.
- localStorage persistence via `src/app/utils/storage.ts` and related storage modules.
- Mock billing provider via `src/app/utils/production.ts`.
- Mock checkout page at `/billing/mock-checkout`.
- Local subscription and entitlement state.
- Local trial activation.
- Local analytics/event log.
- Local sync outbox as a diagnostic surface.
- Demo data only when clearly framed as demo/sample state.

Rules for mock/demo components:

- Mock payment must never look like a real charge.
- Public demo copy must clearly avoid promising real cloud sync or real billing.
- Demo data must not be confused with the visitor's real saved goals.
- Backend sync errors must not interrupt the demo journey.
- Login/Firebase notices should be informative, not required for MVP 1.

## 7. Non-goals

MVP 1 is not trying to prove:

- Real monetization.
- Real account recovery.
- Real multi-device continuity.
- Real backend reliability.
- Real analytics attribution.
- Real notification delivery.
- A complete life management suite.
- A complete vision board product.
- A complete SaaS billing system.
- A polished admin/business operations console.

MVP 1 only needs to prove that the 12-week execution loop is useful, understandable, and stable in a public local-first demo.

## 8. Acceptance criteria

Functional acceptance:

- A new visitor can complete the core journey from onboarding to `/12-week-system` without logging in.
- Demo mode works with empty Firebase env and no backend running.
- Creating a 12-week plan saves a local goal and local `twelveWeekSystem`.
- Refreshing the browser keeps the created plan on the same device.
- Today tab shows actionable tasks after setup.
- Task toggle updates local progress immediately.
- Daily check-in saves locally and does not require backend sync.
- Weekly review saves locally and creates/updates a reflection entry.
- Progress tab reflects completed tasks/reviews.
- Mock paywall opens from template/review contexts.
- Mock checkout can unlock Plus locally and return to the app.
- Free path remains usable; paywall must not block the basic weekly review.

UX acceptance:

- On mobile, each step starts near the top of the screen after navigation or step changes.
- The first screen is not visually crowded.
- The user always knows the next primary action.
- Core wording avoids heavy technical terms.
- Signed-out or fresh-state screens do not show private-looking fake goals unless explicitly labeled as sample/demo.
- Paywall copy explains mock/demo status clearly.

Quality acceptance:

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run test:run` passes.
- `npm run build` passes.
- Production smoke path is run or consciously skipped with a written reason.

## 9. Release checklist

Pre-release configuration:

- Set production frontend to demo-safe mode:
  - `VITE_APP_MODE=demo`
  - `VITE_ANALYTICS_MODE=off` unless GA4 is verified
  - `VITE_BILLING_PROVIDER_MODE=mock_provider`
  - `VITE_BILLING_PROVIDER_LABEL=Mock provider`
- Do not require Firebase env for the public demo.
- Do not require backend health for the public demo.
- Keep `.env.production` demo-safe unless the release intentionally switches to real mode.

Manual QA path:

1. Open `/` in a fresh browser profile.
2. Confirm signed-out dashboard does not expose confusing private/demo goals.
3. Start onboarding.
4. Complete life balance.
5. Continue to life insight.
6. Continue to SMART goal setup.
7. Complete feasibility check.
8. Create a 12-week plan.
9. Confirm navigation to `/12-week-system`.
10. Complete one Today task.
11. Save daily check-in.
12. Open Week tab and save weekly review.
13. Open Progress tab and confirm progress changed.
14. Open a premium template or review insight teaser.
15. Complete mock checkout.
16. Confirm Plus entitlement unlocks locally.
17. Refresh the page and confirm the plan still exists.
18. Repeat the key path on mobile viewport.

Automated checks:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Optional checks:

```bash
node scripts/check-runtime-env.mjs
npm run smoke:prod
```

Release notes must say:

- This is a local-first public demo.
- Data is stored on the current browser/device.
- Mock upgrade does not charge real money.
- Login/backend sync is not required for MVP 1.

## 10. Top 10 bugs/risks to fix before public demo

1. Fresh signed-out dashboard confusion

   Risk: visitors may see sample/private-looking goals and assume the app is leaking or fabricating user data.

   Required outcome: fresh signed-out state must be clean, clearly demo-labeled, or focused on the start CTA.

2. Mobile scroll position during step transitions

   Risk: onboarding/setup steps can start mid-screen and make users scroll up to understand the new screen.

   Required outcome: every route or wizard step in the core journey starts at the top or focuses the correct heading.

3. Crowded 12-week system layout

   Risk: Today/Week/Progress/Settings can feel like too much at once, especially on desktop with many panels.

   Required outcome: first scan should answer "what do I do today?" before secondary diagnostics.

4. Heavy terminology in feasibility and setup

   Risk: terms like lag metric, lead indicator, tactic load, entitlement, or outbox can make non-technical users drop off.

   Required outcome: user-facing MVP copy should use plain language while keeping internal model names in code.

5. Mock checkout trust problem

   Risk: visitors may think they are being charged or that payment is production-ready.

   Required outcome: mock checkout must be visibly simulated and still smooth enough to show upgrade behavior.

6. LocalStorage data loss expectation

   Risk: users may expect account-level persistence from a public web app.

   Required outcome: demo surfaces should state local/device storage where relevant, and export/reset controls should work.

7. Backend/auth noise in demo mode

   Risk: real-mode guards or failed API calls could spam console, show confusing errors, or interrupt local-first flow.

   Required outcome: demo mode should not call protected backend sync paths and should not require Firebase.

8. Weekly review free path blocked by premium teaser

   Risk: monetization can damage the core loop if review feels locked.

   Required outcome: basic weekly review must remain free and complete; Plus only adds better insight or faster setup.

9. Generated plan quality inconsistency

   Risk: a plan with too many tasks, vague tactics, or bad first-week schedule will make the demo feel shallow.

   Required outcome: setup should keep 2-4 recurring tactics, show a clear Week 1 preview, and avoid overloading the user.

10. Production regression gap

   Risk: local checks pass but deployed Vercel demo has broken routes, stale env, or mock checkout return issues.

   Required outcome: run build plus a deployed smoke path before sharing the public URL.
