# Core Funnel Go / No-Go

Reviewer role: senior product reviewer, post quality-sprint gate for the
`Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility -> 12-Week Plan -> 12-Week Execution` funnel.

## 1. Decision

**GO WITH KNOWN LIMITATIONS** for a small, controlled tester round (5-8 invited testers)
of the local-first MVP 1 demo on a verified deploy.

**NO-GO** for broad public marketing, paid acquisition, billing-led launch, or any
"production-ready 12-week coaching app" framing.

Reason in one paragraph:

- Code-level quality gate is green: typecheck, full test suite (321 tests), and
  production build all pass on the current candidate.
- Core funnel logic exists end-to-end (SMART helpers, feasibility scoring,
  12-week setup with lead indicators / load / scoreboard, 12-week system with
  Today/Week/Progress, weekly review, mock billing).
- The prior MVP 1 release gate already ran `smoke:mvp1` (default + full UI) and
  passed locally on 2026-04-30; nothing in code has regressed those gates in this run.
- The dedicated quality artifacts requested by the prompt (CORE_FUNNEL_QUALITY_AUDIT,
  SMART_GOAL_QUALITY_RUBRIC, FEASIBILITY_SCORING_RUBRIC, 12_WEEK_PLAN_QUALITY_RUBRIC,
  MVP_1_FEEDBACK_SUMMARY) **do not exist yet**. Without a real-user feedback summary,
  we cannot promote the funnel beyond a structured tester round.

## 2. Check Date

- Checked at: 2026-05-03
- Branch: `claude/adoring-nightingale-a86f87`
- Worktree clean at audit start.
- Node platform: win32, Node toolchain inherits previous gate's Node 22 (backend pkg target 20.x).

## 3. Commands Run

| Command | Result | Exit | Notes |
| --- | --- | --- | --- |
| `npm run typecheck` | Pass | 0 | `tsc --noEmit` clean. |
| `npm run test:run` | Pass | 0 | Vitest: **58 files, 321 tests passed**, ~34s. |
| `npm run build` | Pass | 0 | Vite production build OK (~8.2s). One benign warning: `src/lib/api/apiClient.ts` is dynamically imported by `billingProvider.ts` while also statically imported elsewhere; chunking unaffected. |
| `npm run smoke:mvp1` | Not rerun | n/a | Requires `agent-browser` orchestration + a running dev server. Last documented run: pass locally on 2026-04-30 (default + full UI), see [guidelines/MVP_1_GO_NO_GO.md](guidelines/MVP_1_GO_NO_GO.md) §3. Production URL run was the only failure (stale deploy). Must be rerun against the current promoted Vercel deploy before tester invites. |
| `npm run smoke:core-quality` | Not available | n/a | Script does not exist in `package.json`. |

Commands intentionally not executed in this audit: `npm run lint`, `npm run env:check`, backend
checks, `npm run smoke:prod`. Source code was not modified, so reusing the prior gate's
green results for those is acceptable for the funnel-quality decision.

## 4. SMART Goal Readiness

- User can produce a structured SMART goal: yes. [src/lib/smart-goal/helpers.ts](src/lib/smart-goal/helpers.ts) exposes `buildSmartGoal`, `normalizeSmartGoal`, `parseSmartGoal`, plus pending-form parsing for legacy data, with a `goal_summary` (goal/metric/target/weekly_commitment/difficulty) computed at normalization time.
- Difficulty signal exists: `estimateGoalDifficulty` returns easy/medium/hard from baseline, target, and weekly commitment. Useful as a feedback hint, but not yet surfaced in a quality rubric doc.
- Validation: weekly time clamped 1-60h; target falls back to baseline+1 or 1; outcome-indicator regex covers EN + VN verbs.
- Tests: [src/lib/smart-goal/helpers.test.ts](src/lib/smart-goal/helpers.test.ts) plus SMARTGoalSetup screens covered in the suite (321 tests passed).
- App feedback quality: difficulty + summary are computed but **no formal SMART_GOAL_QUALITY_RUBRIC.md** exists to score whether a tester's goal is "good enough." This is a doc gap, not a code gap.
- Verdict: **Ready for tester input. Not yet ready for an automated quality score.**

## 5. Feasibility Readiness

- Scoring is deterministic and decomposed: [src/lib/feasibility/feasibilityScore.ts](src/lib/feasibility/feasibilityScore.ts) combines capacity / readiness / risk / context with weighted dimensions; helpers in `dimensionScore.ts`, `dimensionStatus.ts`, `weakestDimension.ts`, `suggestions.ts`.
- Tests live under [src/lib/feasibility/__tests__](src/lib/feasibility/__tests__) and pass.
- Recommendation actionability: `weakestDimension` + `suggestions` produce dimension-targeted advice, which is good. Whether the suggestion text is concrete enough for testers is unverified — needs human review during the tester round.
- No `FEASIBILITY_SCORING_RUBRIC.md` exists; trust in the score is currently "trust the math + tests," not "trust the rubric."
- Verdict: **Trustworthy as a number. Trustworthiness of the recommendation copy is unproven.**

## 6. 12-Week Setup Readiness

- Plan is built from explicit inputs, not hidden defaults: [src/app/pages/12WeekSetup.tsx](src/app/pages/12WeekSetup.tsx) plus [src/app/pages/12WeekSetup/helpers.ts](src/app/pages/12WeekSetup/helpers.ts) construct outcomes, lead indicators, weekly plans, scoreboard, and load.
- Lead indicators: dedicated step (`LeadIndicatorsStep`) with `buildLeadIndicatorSchedules`, `createIndicatorDraft`. Useful concept; quality of the **default suggestions** has not been audited against a rubric.
- Load realism: `getPlanLoadLabel`, `getWeeklyTaskWarning`, `taskConstraints.ts` exist to flag overload. Whether the threshold matches a realistic part-time goal is judgment-based, not rubric-backed.
- Backend sync is best-effort and gated on demo mode + auth, per AGENTS.md; local save is the source of truth.
- No `12_WEEK_PLAN_QUALITY_RUBRIC.md` exists. The plan is structurally sound; subjective quality must come from the tester round.
- Verdict: **Structurally ready. Subjective plan quality unverified.**

## 7. 12-Week Execution Readiness

- Today tab: `TaskBoard` + `useTwelveWeekExecutionActions` + `useWeeklyReviewFormState` are wired. Today queue, task toggle, and daily check-in were verified by `smoke:mvp1` on 2026-04-30.
- Weekly review: form state + `weeklyReview.ts` logic present; smoke opens the Week tab but did **not** submit a full review (documented limitation in [guidelines/MVP_1_QA_REPORT.md](guidelines/MVP_1_QA_REPORT.md) §7.3). Manual tester pass required.
- Adjustment loop: `adaptivePlanning.ts`, `behaviorInsights.ts`, `executionFeedback.ts`, `executionScore.ts` exist. Code path exists; whether the adjustment **prompts the user with a clear next action after a weak week** is not proven by automated test.
- Progress / motivation: `progress.ts`, `streak.ts`, `goalProgress.ts`, plus a Progress tab. Smoke verified the route; visual motivation quality is subjective and untested.
- Verdict: **Loop exists end-to-end. Weekly-review submission and adjustment-loop UX need a human tester pass, not more code.**

## 8. Top Remaining Blockers (before broad public)

1. **No tester feedback summary.** `MVP_1_FEEDBACK_SUMMARY.md` does not exist. We have a tester script ([guidelines/MVP_1_USER_TESTING_SCRIPT.md](guidelines/MVP_1_USER_TESTING_SCRIPT.md)) and a rubric inside it, but no recorded sessions. Real-user signal is the missing input for any "ready for users" claim broader than a controlled tester round.
2. **Production URL freshness unverified in this session.** Last documented run (2026-04-30) showed the live URL `https://vision-board-web-platform.vercel.app` was stale and pushed signup-first copy. Must be rerun before invites.
3. **Weekly-review submission not in automated smoke.** Coverage gap acknowledged in QA report; needs manual confirmation per tester.
4. **Quality rubrics missing.** SMART / Feasibility / 12-Week rubric docs do not exist, so there is no objective "what counts as a good output" for reviewers or testers beyond the user-testing script's 1-5 scoring.
5. **Adjustment-loop UX unproven.** Code exists; whether a tester whose week 1 went badly understands what to change in week 2 is untested.

## 9. Known Limitations (acceptable for tester round)

- Local-first storage; data lives in the current browser/device, can be lost when storage is cleared.
- Cloud sync is best-effort and only meaningful in real mode with Firebase + backend; demo mode does not sync.
- Mock billing only — no real charges, no production webhook, no server-side entitlement authority.
- Reminders / push / email delivery is not guaranteed in demo mode.
- Mobile viewport: desktop smoke passes; mobile is acceptable but not audited per-screen.
- Backend health is not required for the tester round.
- Production analytics (GA4) not verified — keep `VITE_ANALYTICS_MODE=off` unless explicitly verified.

## 10. What Not To Promise Publicly

- Do **not** promise: real cloud sync, real payment, multi-device recovery, durable persistence after browser-data clear, production reminders/push/email, a real PRO subscription, AI coaching, social features, or "production-ready coaching platform."
- Do **not** market the funnel as personalized AI planning. The plan is rule-based and template-supported.
- Do **not** lead with billing. Mock checkout is for UX validation only.
- Do **not** publish testimonials, paid ads, or investor decks claiming validated retention. There is no retention data yet.
- Safe framing: "local-first demo to test whether a 12-week execution loop helps me follow through on one personal goal; data lives on this device only."

## 11. Next 5 Prompts If GO (recommended path — controlled tester round)

1. Verify production deploy: promote the current candidate to Vercel in demo-safe mode, then rerun `MVP1_SMOKE_URL=https://vision-board-web-platform.vercel.app npm run smoke:mvp1` and document pass/fail, including stale-cache/service-worker rollback steps if needed.
2. Run 5-8 tester sessions following [guidelines/MVP_1_USER_TESTING_SCRIPT.md](guidelines/MVP_1_USER_TESTING_SCRIPT.md). Use one note template per tester. Do not coach unless they are blocked > 2 minutes.
3. Create `guidelines/MVP_1_FEEDBACK_SUMMARY.md` aggregating activation / clarity / trust / usefulness / return / pay scores per tester, plus tagged drop-off points and verbatim quotes.
4. Based on the summary, decide one of: (a) polish core copy/UX, (b) tighten plan quality, (c) prioritize cloud sync, (d) prioritize real billing — **only one** as the next sprint. Use the decision rules in §9 of the user testing script.
5. Extend `scripts/smoke-mvp1-local-demo.mjs` to fully submit a weekly review and assert adjustment-loop UI state, closing the §7.3 QA gap before any wider release.

## 12. Next 5 Prompts If NO-GO (fallback path — quality-sprint round 2)

1. Author `guidelines/CORE_FUNNEL_QUALITY_AUDIT.md` with a per-step rubric (input clarity, output specificity, recovery from bad input, mobile pass) and run the audit on a fresh browser profile.
2. Author `guidelines/SMART_GOAL_QUALITY_RUBRIC.md`, `guidelines/FEASIBILITY_SCORING_RUBRIC.md`, `guidelines/12_WEEK_PLAN_QUALITY_RUBRIC.md`. Use the existing helpers (`estimateGoalDifficulty`, `weakestDimension`, `getWeeklyTaskWarning`, `getPlanLoadLabel`) as the scoring inputs.
3. Add an `npm run smoke:core-quality` script that walks the funnel headless and asserts: SMART output has metric+target+weekly_hours; feasibility produces a weakest dimension with a suggestion; 12-week plan has lead indicators and a non-empty Today queue.
4. Manually walk the funnel on mobile viewport (360x800) and record screenshots of every step into a `guidelines/CORE_FUNNEL_MOBILE_AUDIT.md`. No source changes — just evidence.
5. Hold the funnel at NO-GO until all four rubrics + the mobile audit are checked in, then rerun this Go/No-Go.

## 13. Constraints Honored In This Audit

- No new features added.
- No source code modified (only this docs file written).
- No billing recommendation made — core funnel is gated to "controlled testers only."
- Cloud sync not proposed as cover for any UX gap.
- Marketing claims explicitly bounded in §10.
- Test failures: none to report; all gates that ran passed.
