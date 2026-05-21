# 12-Week Setup — Limited Rollout Monitoring

Release commit: `d8b35b71`
Status: **LIMITED ROLLOUT / MONITOR** (not full GO)
Owner: 12-week setup surface

## 1. Current rollout state

- Commit `d8b35b71` is live on production.
- GitHub Actions checks green for the release.
- Route replacement deployed: `/12-week-setup` now renders `TwelveWeekSetupLab` (new flow).
- Legacy flow preserved at `/12-week-setup-old` for fallback / comparison.
- QA reference still available at `/12-week-setup-lab`.
- Rollout posture: **limited rollout under monitoring**. Do not mark full GO until manual user validation completes.

## 2. Production verification summary

Verified on production bundle / runtime:

- Production bundle confirms route -> component mapping (see section 3).
- Production route smoke passed for the 12-week setup route mapping.
- Demo-copy leak check passed (no demo-only phrasing leaked into real-mode output for this surface).
- `npm run smoke:prod:quick` passed 4/5 steps. Failure at `/billing/plan` payment-history hydration is tracked separately in `docs/ops/billing-plan-smoke-timeout-follow-up.md` and is not attributed to this release.

Not yet verified:

- 24-48h post-release monitoring window.
- Cross-device continuity if not tested.
- Real-user validation if not completed.
- Billing `/billing/plan` payment-history hydration timeout remains tracked separately.

## 3. Route mapping confirmed on production

| Route                  | Component              | Purpose                          |
| ---------------------- | ---------------------- | -------------------------------- |
| `/12-week-setup`       | `TwelveWeekSetupLab`   | Primary user-facing flow         |
| `/12-week-setup-old`   | `TwelveWeekSetup`      | Legacy flow, fallback / rollback |
| `/12-week-setup-lab`   | `TwelveWeekSetupLab`   | QA / reference build             |

Confirmed via production bundle inspection and route smoke.

## 4. What passed

- Production deployment of `d8b35b71`.
- GitHub Actions workflows for the release.
- Production bundle component mapping for the three setup routes.
- Production route smoke for 12-week setup route mapping.
- Demo-copy leak check (real-mode copy clean).
- 4/5 steps of `npm run smoke:prod:quick`.

## 5. What remains unverified

- 24-48h monitoring window.
- Cross-device continuity if not tested.
- Real-user validation if not completed.
- Billing `/billing/plan` timeout tracked separately.

## 6. Manual production smoke result

- Date/time: 2026-05-21, manual test window, ICT timezone.
- Account type: safe test account.
- Desktop result: PASS.
- Mobile result: Pending mobile confirmation.
- Step 1 -> Step 4 result: PASS.
- Step 2 validation timing result: PASS — required-field errors did not appear immediately on first entry; they appeared only after attempting to continue with missing data.
- Save destination result: PASS — after clicking save, the app navigated to `/12-week-system` / weekly execution / Today.
- Console/runtime errors: No uncaught runtime errors observed.
- Final recommendation: Keep LIMITED ROLLOUT / MONITOR. Do not mark full GO.

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

## 10. Decision options after monitoring

After the 24-48h window plus completed manual walkthrough on a safe test account, choose one:

- **Continue limited rollout** — telemetry healthy but manual validation or coverage still incomplete. Extend monitoring window. Re-evaluate.
- **Fix-forward** — non-blocking issues detected. Ship targeted fixes, keep `/12-week-setup` on `TwelveWeekSetupLab`, re-monitor.
- **Rollback** — any rollback trigger from section 9 fires. Revert route mapping, capture root cause, plan a re-release.
- **Consider full GO** — only after:
  1. Manual Step 1 -> Step 4 walkthrough on a safe test account passes end to end.
  2. 24-48h monitoring window healthy with no rollback triggers.
  3. No user-visible regressions reported.
  4. Cross-device continuity verified for signed-in real-mode accounts.

Full GO is **not** appropriate based on automated smoke alone. Manual / user validation is required.
