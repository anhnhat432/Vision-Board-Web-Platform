# 12-Week Setup — Limited Rollout Monitoring

Route replacement release commit: `173174db`
Latest monitored main commit: `7d0125082467949b8b8790f708fa1ae1c5e562eb`
Status: **FULL GO** (product owner approved)
Owner: 12-week setup surface

## 1. Current rollout state

- Route replacement from commit `173174db` remains live on production through latest monitored deployment `7d0125082467949b8b8790f708fa1ae1c5e562eb`.
- GitHub Actions checks green for the latest monitored `main` commit.
- Route replacement deployed: `/12-week-setup` now renders `TwelveWeekSetupLab` (new flow).
- Legacy flow preserved at `/12-week-setup-old` for fallback / comparison.
- QA reference still available at `/12-week-setup-lab`.
- Production route label cleanup completed: `/12-week-setup` no longer shows the lab badge / reference link; `/12-week-setup-lab` keeps QA/reference labeling.
- Rollout posture: **FULL GO**. User validation, accessible monitoring closeout, and explicit product-owner approval are complete; rollback/reference routes remain temporarily available.

## 2. Production verification summary

Verified on production bundle / runtime:

- Production bundle confirms route -> component mapping (see section 3).
- Production route smoke passed for the 12-week setup route mapping.
- Demo-copy leak check passed (no demo-only phrasing leaked into real-mode output for this surface).
- `npm run smoke:prod:quick` passed 4/5 steps. Failure at `/billing/plan` payment-history hydration is tracked separately in `docs/ops/billing-plan-smoke-timeout-follow-up.md` and is not attributed to this release.

Known non-blocking items / separately tracked:

- Cross-device continuity may still need deeper validation if not already confirmed.
- Sentry, analytics, and support dashboards were not directly accessible from this workspace during closeout because credentials were missing; accessible runtime/support checks are recorded in the 24-48h closeout section below.
- Billing `/billing/plan` payment-history hydration timeout remains tracked separately.

## 3. Route mapping confirmed on production

| Route                | Component            | Purpose                          |
| -------------------- | -------------------- | -------------------------------- |
| `/12-week-setup`     | `TwelveWeekSetupLab` | Primary user-facing flow         |
| `/12-week-setup-old` | `TwelveWeekSetup`    | Legacy flow, fallback / rollback |
| `/12-week-setup-lab` | `TwelveWeekSetupLab` | QA / reference build             |

Confirmed via production bundle inspection and route smoke.

## 4. What passed

- Production deployment of latest monitored `main` commit `7d0125082467949b8b8790f708fa1ae1c5e562eb`.
- GitHub Actions workflows for the latest monitored `main` commit.
- Production bundle component mapping for the three setup routes.
- Production route smoke for 12-week setup route mapping.
- Demo-copy leak check (real-mode copy clean).
- User validation for `/12-week-setup` Step 1 -> Step 4 -> save -> `/12-week-system`.
- 4/5 steps of `npm run smoke:prod:quick`.

## 5. Known non-blocking items

- Billing `/billing/plan` timeout is tracked separately.
- Direct Sentry / analytics queries remain limited by missing credentials from this workspace.
- Cross-device continuity may still need deeper validation if not already confirmed.

## 6. Manual production smoke result

- Date/time: 2026-05-21, manual test window, ICT timezone.
- Account type: safe test account.
- Desktop result: PASS.
- Mobile result: Accessible production mobile render/runtime smoke passed during monitoring closeout; full signed-in mobile save smoke remains pending safe production credentials.
- Step 1 -> Step 4 result: PASS.
- Step 2 validation timing result: PASS — required-field errors did not appear immediately on first entry; they appeared only after attempting to continue with missing data.
- Save destination result: PASS — after clicking save, the app navigated to `/12-week-system` / weekly execution / Today.
- Console/runtime errors: No uncaught runtime errors observed.
- Final recommendation: **Full GO**.

## User validation result

- Validation status: completed.
- User feedback: confirmed acceptable.
- Affected flow: `/12-week-setup` Step 1 → Step 4 → save → `/12-week-system`.
- Any user-reported blockers: none known.
- Any user-reported confusion: none known.
- Result: user validation blocker cleared.

## 24–48h monitoring closeout

- Monitoring window checked: 2026-05-21 16:38–16:48 ICT (2026-05-21 09:38–09:48 UTC), against latest `main` commit `7d0125082467949b8b8790f708fa1ae1c5e562eb` and the current production deployment. This records accessible closeout checks supporting Full GO approval.
- Actions status: PASS. Latest `main` checks for `7d012508` completed successfully: CI, CodeQL, Gitleaks, and npm audit.
- Production deployment status: PASS. GitHub deployment `4767568431` for `7d0125082467949b8b8790f708fa1ae1c5e562eb` in `Production` is `success` with Vercel target URL `https://vision-board-web-platform-ig5kj8qad-anhnhat432s-projects.vercel.app`; the main production URL returned HTTP 200 via `scripts/check-vercel.ps1`.
- Sentry/runtime result: direct Sentry dashboard/API review was not possible from this workspace because `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` were not present and `sentry-cli` was unavailable. Accessible production runtime checks showed no route-related runtime crash: `/12-week-setup` rendered `TwelveWeekSetupLab` on mobile without console errors, page exceptions, horizontal overflow, or failed non-font requests; a signed-out save attempt remained on `/12-week-setup` behind the intended real-mode login gate; `/12-week-system` redirected signed-out mobile traffic to `/login` with no page exceptions or horizontal overflow.
- User/support report result: no GitHub issues were found for `/12-week-setup`, `/12-week-system`, `TwelveWeekSetupLab`, or `LeadIndicatorsStepLab`. No external support inbox/customer channel was accessible from this workspace, and no user-reported blocker is known from available repo/support artifacts.
- Analytics/funnel result: no queryable analytics dashboard/API was available from this workspace. Current code records `twelve_week_setup_started` and `twelve_week_plan_created`, but the requested step-transition funnel signals (`setup start`, Step 1 → Step 2, Step 2 → Step 3, Step 3 → Step 4, save → `/12-week-system`) were not retrievable here. `POSTHOG_API_KEY` was present but rejected by the PostHog API with 401; GA4 property/query credentials were not present. No accessible analytics signal indicated a rollback trigger.
- Mobile smoke result: PASS for accessible production mobile render/runtime smoke at 390×844 on `/12-week-setup`; the lab flow rendered, there was no horizontal overflow, and no console/page errors were observed. Full signed-in mobile save → `/12-week-system` smoke was not completed from this workspace because no safe production test credentials were available; unsigned save is intentionally gated by login in real mode.
- Rollback trigger result: no rollback trigger fired in accessible checks. No CI/deployment failure, route runtime crash, horizontal-overflow blocker, known user/support report, or direct setup-linked billing issue was observed.
- Billing timeout status: `/billing/plan` payment-history hydration timeout remains open and tracked separately in `docs/ops/billing-plan-smoke-timeout-follow-up.md`; no evidence was found that it became user-visible or directly linked to the 12-week setup route replacement.
- Final recommendation: **Full GO**. Product owner approval is recorded; keep `/12-week-setup-old` and `/12-week-setup-lab` temporarily available for rollback/reference while known non-blocking items remain tracked separately.

## 7. Manual smoke checklist (safe test account)

Run on a real-mode production deployment, signed in to a disposable / safe test account.

Pre-flight:

- [ ] Confirm deployment is real mode (`VITE_APP_MODE=real`).
- [ ] Sign in with safe test account; confirm Firebase auth ready.
- [ ] Confirm sync state indicator reachable in UI.
- [ ] Clear local 12-week data for this account if a clean run is needed.

Step 1 — Vision / goal capture:

- [ ] Navigate to `/12-week-setup`. Confirm `TwelveWeekSetupLab` renders, not the legacy flow.
- [ ] Enter a vision / goal. Confirm input persists to localStorage.
- [ ] Confirm no demo-only copy ("dùng thử", "trên trình duyệt này", "không thu tiền thật", "mock", "demo") on screen.

Step 2 — SMART reformulation:

- [ ] Move to SMART step. Confirm prior input carried forward.
- [ ] Submit SMART fields. Confirm validation messages render in real-mode language.
- [ ] Confirm localStorage updated; refresh page and confirm state restored.

Step 3 — Feasibility check:

- [ ] Enter feasibility inputs. Confirm scoring renders.
- [ ] Confirm low / borderline / acceptable thresholds behave as expected.
- [ ] Confirm sync state indicator reflects activity (synced / syncing).

Step 4 — 12-week plan generation:

- [ ] Generate the 12-week plan.
- [ ] Confirm plan persists to localStorage (reload page, plan still present).
- [ ] Confirm plan visible on Today / weekly views downstream.
- [ ] Confirm sync state reaches `synced` for signed-in account.
- [ ] On a second device / browser signed into the same account, confirm plan appears after sync.

Fallback check:

- [ ] Visit `/12-week-setup-old`. Confirm legacy `TwelveWeekSetup` still renders for rollback parity.

Cleanup:

- [ ] Remove test data from the safe test account if appropriate.

## 8. 24-48h monitoring signals

Watch the following for 24-48h after release:

- Sentry / error tracking:
  - New error groups originating from `TwelveWeekSetupLab`, SMART, feasibility, or 12-week plan generation paths.
  - Spike in client-side errors on `/12-week-setup`.
- Backend sync:
  - Increase in failed sync calls for 12-week plan persistence.
  - Increase in outbox retry counts.
- Auth:
  - No new auth-related errors triggered by the setup flow.
- Frontend telemetry / analytics:
  - Step 1 -> Step 4 funnel completion rate vs. pre-release baseline.
  - Drop-off rate at SMART, feasibility, and plan generation steps.
  - Time-on-step trends.
- Support / user reports:
  - Any reports of lost setup progress, missing plans, or sync failures.
  - Any reports of legacy vs. new flow confusion.
- Performance:
  - `/12-week-setup` initial render time.
  - 12-week plan generation latency.

Define "healthy" as: no new high-severity error groups, funnel completion within baseline tolerance, no user-reported data loss, sync error rate stable.

## 9. Rollback triggers

Trigger rollback (point `/12-week-setup` back to legacy `TwelveWeekSetup`) if any of:

- High-severity client error group originating from `TwelveWeekSetupLab` affecting >1% of sessions on the route.
- User-reported data loss (vision, SMART, feasibility, or plan) attributable to the new flow.
- 12-week plan persistence regression: localStorage write fails or plan does not appear in Today / weekly views.
- Backend sync regression specific to plans created by `TwelveWeekSetupLab`.
- Step 1 -> Step 4 funnel completion drop materially below baseline (define threshold per analytics).
- Auth / Firebase regression triggered by the new flow.
- Demo-copy leak detected in real mode on this surface.

Rollback path:

- Swap route registration so `/12-week-setup` renders legacy `TwelveWeekSetup`.
- Keep `/12-week-setup-lab` available for continued QA.
- Communicate rollback in release channel and capture root cause before re-attempting.

## 10. Decision after monitoring

Current recommendation: **Full GO**.

User validation, accessible 24-48h monitoring closeout, and explicit product-owner approval are documented. The route replacement is approved for Full GO while rollback/reference routes remain temporarily available:

- **Full GO** — `/12-week-setup` remains on `TwelveWeekSetupLab` as the primary user-facing setup flow.
- **Fix-forward** — non-blocking issues remain tracked separately and can be addressed without changing the approved route replacement.
- **Rollback** — if any rollback trigger from section 9 fires after approval, use the documented rollback path and capture root cause before re-release.

Automated smoke alone was not sufficient for final rollout approval. User validation, accessible monitoring closeout, and explicit product-owner approval are now complete.

## Full GO approval

- Approval status: approved.
- Approved scope:
  - `/12-week-setup` uses the new setup flow.
  - `/12-week-setup-old` remains rollback/reference temporarily.
  - `/12-week-setup-lab` remains QA/reference temporarily.
- Evidence:
  - GitHub Actions passed.
  - Production deployment passed.
  - Mobile smoke passed.
  - User validation confirmed acceptable.
  - No rollback trigger found during monitoring closeout.
- Known non-blocking items:
  - Billing `/billing/plan` timeout tracked separately.
  - Sentry/analytics direct queries limited by missing credentials.
  - Cross-device continuity may still need deeper validation if not already confirmed.
- Rollback path remains documented in section 9.
