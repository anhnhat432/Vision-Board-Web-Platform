# Core Quality v2 — Go / No-Go

## 1. Decision

Decision: **GO WITH KNOWN LIMITATIONS — invite a small friendly-beta circle (5–15 testers). Do not promote broadly, do not re-enable paid billing, do not resume cloud sync as a crutch.**

Why not clean GO:

- Three referenced companion docs do not exist in `guidelines/` yet:
  `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md`, `CORE_FUNNEL_GO_NO_GO.md` (previous
  revision) and `CORE_COACHING_COPY_GUIDE.md`. Section 10 can only reference
  existing code-backed artifacts, not real user testimony.
- Browser-based `smoke:core-quality` and `visual:prod` require an
  `agent-browser` MCP + running dev server / live production URL; they were
  **not executed** in this audit pass.
- No analytics-backed evidence yet that real users produce meaningful SMART
  goals, finish feasibility, generate startable plans, and return for weekly
  review in the wild. The rubrics assert "the app emits a quality signal",
  not "real users actually produce strong goals."

Why not NO-GO:

- `npm run typecheck`, `npm run test:run` (75 files, 734 tests),
  `npm run build` all pass.
- Core funnel rubrics are shipped, scored, and unit-tested: SMART quality,
  feasibility scoring, 12-week plan quality, archetype fit, rescue mode,
  next-week recommendation, overdue task actions, execution insights.
- Focus UX pieces landed: Today primary task hero, rescue nudge, weekly
  review summary, progress trend hero, overdue-task inline actions,
  execution insights card, accessibility patches.
- `MVP_1_GO_NO_GO.md` already granted "GO with known limitations" for the
  local demo; Core Quality v2 builds additively on that base without
  destabilising it.

Constraint compliance:

- No billing promotion recommended here (see §13–14).
- No "cloud sync will save core UX" recommendation (see §11, §14).
- No source code changes in this task beyond the insight-engine wiring and
  a11y fixes that were implemented in the immediately preceding sessions;
  this task only runs checks and writes docs.

## 2. Check Date

- Checked at: **2026-05-03 15:22 +07:00**
- Reviewer role: senior product reviewer, core-funnel v2 gate
- Host: Windows, PowerShell
- Scope: `c:\Users\admin\Downloads\Vision Board Web Platform`

## 3. Commands Run

| Command | Gate purpose |
|---|---|
| `npm run typecheck` | TS surface across 75 test files + source |
| `npm run test:run` | Full Vitest suite (unit + integration-style) |
| `npm run build` | Vite production bundle + chunk budget smoke |
| `npm run smoke:core-quality` | **Not run** in this audit (reason §4) |
| `npm run qa:visual-core` | **Not a defined script** — closest equivalent is `npm run visual:prod`, not run in this audit |
| `npm --prefix backend run check` | **Not run** — backend is not required for v2 core funnel scope |

## 4. Results Per Command

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` | **PASS** | Exit 0. `tsc --noEmit` clean. |
| `npm run test:run` | **PASS** | 75 test files, **734 tests**, 0 failures. Runtime ~41s. Includes `storage-twelve-week.test.ts` (20), `executionInsights.test.ts` (22), `core-funnel-a11y.test.ts` (7), `TwelveWeekTodayTab.test.tsx` (38), `planQuality.test.ts`, `planQuality.archetype.test.ts`, `quality.test.ts` (SMART). |
| `npm run build` | **PASS** | Vite build in ~7.56s. Largest chunks: `index-*.js` 454.79 kB gzip 123.67 kB, `vendor` 451.57 kB gzip 129.14 kB, `charts` 312.40 kB gzip 80.48 kB. `12WeekSystem` 146.52 kB gzip 43.75 kB, `12WeekSetup` 108.01 kB gzip 28.88 kB, `FeasibilityCheck` 60.64 kB gzip 18.27 kB, `SMARTGoalSetup` 44.81 kB gzip 12.19 kB. |
| `npm run smoke:core-quality` | **NOT RUN** | Script (`scripts/smoke-core-quality.mjs`) requires local `npm run dev` on `http://localhost:5173` + `agent-browser` MCP stack. Neither was started in this audit window. Not a failure — explicit defer per "Chạy checks phù hợp". |
| `npm run qa:visual-core` | **SCRIPT NOT DEFINED** | `package.json` exposes `visual:prod` (production URL + agent-browser) but no `qa:visual-core`. `visual:prod` was not invoked (requires live Vercel URL + QA credentials). |
| `npm --prefix backend run check` | **NOT RUN** | Core funnel v2 scope is local-first; backend sync is out of scope for this gate. |

## 5. SMART Goal v2 Readiness

| Sub-area | Status | Evidence / Gaps |
|---|---|---|
| **Rubric** | READY | `@C:\Users\admin\Downloads\Vision Board Web Platform\src\lib\smart-goal\quality.ts` — 8-dimension rubric (`Specificity`, `Measurable Clarity`, `Baseline/Target`, `Achievable Realism`, `Resource/Support`, `Relevance/Motivation`, `Time-Bound`, `12-Week Compatibility`), documented in `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\SMART_GOAL_QUALITY_RUBRIC.md`, covered by `quality.test.ts` (30 assertions). Never blocks flow — only surfaces warnings + suggestions. |
| **Archetype guidance** | READY | `@C:\Users\admin\Downloads\Vision Board Web Platform\src\lib\smart-goal\goalArchetypes.ts` — 10 archetypes with deterministic classifier + Quality/Plan/Feasibility overlays. Documented in `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\GOAL_ARCHETYPES.md`. Integrated into `FeasibilityCheck.tsx` for copy overlay. |
| **User clarity** | READY, UNVALIDATED BY REAL USERS | `QualityFeedbackPanel` renders at the Time-Bound step with level badge + overall score + warnings + suggestions; `SmartGoalStepShell` exposes per-step hints via `getStepQualityHint`. Accessible name for "Dùng gợi ý" button now includes step label (a11y pass). No real-user evidence yet that "weak / okay / strong" wording lands as intended. |

Gaps that matter:

- Rubric is rule-based only — cannot detect a goal that is verbose but
  meaningless.
- Outcome-verb heuristic is regex/keyword based; Vietnamese variants without
  diacritics may slip through.
- No evidence from tester sessions that users understand "Tiếp theo: kiểm
  tra tính thực tế" vs "Tiếp theo" disambiguation on the Time-Bound step.

## 6. Feasibility v2 Readiness

| Sub-area | Status | Evidence / Gaps |
|---|---|---|
| **Calibration** | READY IN CODE, UNCALIBRATED BY DATA | Formula locked in `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\FEASIBILITY_SCORING_RUBRIC.md`: `adjustedScore = max(0, round(diagnostic/28 * 20) - wheelPenalty)`, thresholds `≥15 realistic / 10-14 challenging / <10 too_ambitious`. Covered by `@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\pages\FeasibilityCheck\helpers.test.ts` (8 scenarios + bottleneck detection + copy actionability). Thresholds have **not** been calibrated against real-user distributions yet. |
| **Bottleneck explanation** | READY | Weakest-axis + wheel-override detection; each of 7 axes maps to a pre-plan action row ("Trước khi tạo kế hoạch 12 tuần, hãy..."). Archetype overlay **appends**, never replaces, bottleneck.action. |
| **First-week guidance** | READY | Three paths — `too_ambitious`, `lighter`, `push`, and `balanced` — produce distinct first-week guidance strings. Low-feasibility variants wire into `generate12WeekPlan` via `feasibilityHint` → `firstAction.lowFeasibility` (documented in `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\12_WEEK_PLAN_QUALITY_RUBRIC.md` §5). Accessibility: question heading + RadioGroup now bound via `aria-labelledby` / `aria-describedby`. |

Gaps that matter:

- Self-reported 7-question diagnostic may drift optimistic or pessimistic
  without corrective data.
- Wheel penalty step (-3 / -2 / -1 / 0) is a heuristic, not data-calibrated.
- Quality bridge only affects copy, not score — some users may see a "weak"
  SMART goal rated "realistic" and feel the message is mixed.

## 7. 12-Week Plan v2 Readiness

| Sub-area | Status | Evidence / Gaps |
|---|---|---|
| **Archetype-specific plan** | READY | `getArchetypePlanFullDefaults` seeds week-1 focus, expected output, lead metric keywords, and review prompt per archetype. `generatePlan.archetype.test.ts` asserts week-1 seeding differs by archetype. |
| **Week 1 startability** | READY | Rubric §5 formalised: startable ≡ first task has name ≥ 6 chars + non-generic + action verb + load under ceiling + ≥1 core indicator. `analyzeFirstTaskTitle` helper is public. Low-feasibility paths swap to smaller `firstAction.lowFeasibility` (e.g., 15-min practice vs. 30-60 min schedule). Today tab shows `today-first-week-encouragement` hint on week 1. |
| **Lead indicators** | READY | Rubric §3 scores 2–4 valid indicators with schedule offset. UI forces visible "Việc {n}: {name}" ordering + per-index `aria-label` on "Xóa". `buildTaskInstances` + `twelveWeekImportPayload` preserve structure. Archetype-fit warnings fire when indicator names don't match keywords (e.g., exam without "đề thi thử", financial with 0 indicators). |
| **Plan quality warnings** | READY | `evaluateTwelveWeekPlanQuality` emits deterministic Vietnamese warnings + suggestions surfaced in `ReviewStep` via `QualityFeedbackPanel` parity. Never blocks plan creation. `planQuality.test.ts` (37 assertions) + `planQuality.archetype.test.ts` (17 assertions) cover both core and archetype paths. |

Gaps that matter:

- `ReviewStep` in 12-week setup does not yet pass `goalArchetype` through to
  `PlanQualityInput` — archetype warnings are ready but not yet wired at
  setup time. Flagged in `GOAL_ARCHETYPES.md` → "Wire archetype trong
  12WeekSetup".
- Plan Quality result is not persisted yet — it re-runs on each view. Fine
  for v2, but blocks analytics bucketing.
- Indicator warnings use color + icon + text now (a11y pass) but long-form
  amber blocks in `OutcomeStep` template rationale still rely on density —
  not a blocker, but testers on small phones may scroll-fatigue.

## 8. Execution Readiness

| Sub-area | Status | Evidence / Gaps |
|---|---|---|
| **Today primary task** | READY | `today-primary-hero` renders primary task + "Việc quan trọng nhất hôm nay" (or "Việc đầu tiên của tuần 1"). Overdue-state copy: "Việc này đang trễ — hôm nay làm phiên bản gọn nhất." Overdue task rows also carry 3 inline actions (`reschedule-within-week`, `reschedule-next-week`, `skip-non-core`) per `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\OVERDUE_TASK_HANDLING_V1.md`. Skip is hidden on core tasks + explicit note rendered. |
| **Rescue Mode** | READY | `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\RESCUE_MODE_V1.md`: 5 triggers + cold-start guard + 3-suggestion cap + no auto mutation. Wired in Today + Week tabs. Analytics-safe `status` (severity + trigger ids only). |
| **Weekly Review adjustment** | READY | `UniversalWeeklyReview` v2 fields `keepTactic` / `reduceTactic` optional-additive; summary card renders post-save (`weekly-review-summary` testid). `getNextWeekAdjustmentRecommendation` → `NextWeekRecommendation` rendered via `TwelveWeekNextWeekRecommendationCard` with accept-or-dismiss buttons. |
| **Progress insights** | READY | `interpretProgressTrend` drives `progress-trend-hero`. `getExecutionInsights` / `getWeeklyReflectionInsights` emit up to 3 prioritised insights (`review_missing`, `overloaded_week`, `task_completion_without_progress`, `consistency_dropping`, `needs_scope_reduction`, `strong_lead_metric`, `consistency_improving`, `progress_without_consistency`, `ready_to_push`, `no_data`) with `TwelveWeekInsightsCard` and a single suggested next-action button. 22 unit tests cover the engine. |

Gaps that matter:

- Rescue Mode has no snooze/dismiss — the same nudge appears every time the
  state recurs. Low pain for friendly-beta; could accumulate with wider
  rollout.
- Execution insights do **not** emit to analytics yet (only local state +
  toast). Harvesting real-use distributions will require wiring later.
- Overdue-task `skipped` flag is local-only — `twelveWeekImportPayload` and
  `pulledWorkspaceApply` drop it on backend round-trip (documented in
  `OVERDUE_TASK_HANDLING_V1.md`). Acceptable for v2 because v2 is local-first.

## 9. UX / Copy / Accessibility Readiness

| Sub-area | Status | Evidence / Gaps |
|---|---|---|
| **Heading hierarchy** | MOSTLY READY | Every page anchors `h2` step headings focused on transition. Known residual gap: shared `CardTitle` primitive renders as `h4` — changing it ripples across the whole app (deferred, documented in prior audit). |
| **Form labels** | READY | Every input/select/textarea in SMART / Feasibility / 12WeekSetup has `<Label htmlFor>` or explicit `aria-label` on Select triggers. |
| **Icon-only controls** | READY | "Xóa" per-indicator now `aria-label="Xóa việc {n}: {name}"`. Template cards now declare `aria-pressed` + full context aria-label. "Dùng gợi ý" button names the current step. |
| **Keyboard navigation + focus after step transition** | READY | `useScrollToTopOnChange` focuses step heading on transition across SMART / Feasibility / SetupStepShell. RadioGroup now bound to question heading via `aria-labelledby`. |
| **Error message association** | READY | Shared `<Alert>` has `role="alert"` (assertive). Specific + Measurable textarea/input use `aria-describedby` pointing at their helper + counter. |
| **Color-only status** | READY | Amber warnings in `LeadIndicatorsStep` and `ScheduleStep` now prefix "Cảnh báo:" + `AlertTriangle` icon + `role="status"`. |
| **Touch targets** | OK | Footer buttons full-width on mobile; Today task rows fully padded; template cards are full cards. |
| **Text density** | OK with caveat | Long explanatory blocks collapsed behind `<details>` in OutcomeStep, LeadIndicatorsStep, "Xem lại mục tiêu đang viết". No new density introduced in v2. |
| **Mobile scroll fatigue** | OK | Sticky tab list on `12WeekSystem` reduces tab-switch scroll. ResultStep of FeasibilityCheck is still dense (~700 lines of layout) — not regressed, not improved; parked for a future redesign pass. |

New coverage from this session: `core-funnel-a11y.test.tsx` (7 tests).

## 10. Evidence From User Feedback

**Honest state**: no dedicated `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md` exists in
`guidelines/`. The prompt references it as an input, but it is not on disk.
The closest existing docs are:

- `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\MVP_1_QA_REPORT.md`
  (static QA pass snapshot).
- `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\MVP_1_POST_DEPLOY_SMOKE_REPORT.md`
  (smoke-level structural verification).
- `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\MVP_1_USER_TESTING_SCRIPT.md`
  (scripted walkthrough, not raw feedback).

Tester-session feedback, cohort interviews, or structured transcripts are
**not** in the repo. Any claim about "user feedback says X" in v2 planning
should be flagged as unsupported until this doc actually exists. See §15 for
the prompt to synthesize feedback if/when sessions happen.

## 11. Top Remaining Blockers

1. **Missing feedback synthesis artifact.** Without
   `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md`, every decision about "users
   understand this" is inferred from rubric design, not observed behavior.
2. **Browser smoke + visual QA not executed in this gate window.**
   `smoke:core-quality` requires local dev server + `agent-browser`;
   `visual:prod` requires live Vercel URL + QA credentials. Neither was
   invoked here. They remain the next runnable gates.
3. **Thresholds are code-locked but data-uncalibrated.** SMART rubric bands
   (0-39/40-69/70-100), feasibility thresholds (`<10`, `10-14`, `≥15`), wheel
   penalty rules, rescue-mode severity ladder, overloaded_week cutoff
   (≥11 tasks + <50%) — all reasonable defaults but none confirmed against
   real user data.
4. **ReviewStep in 12WeekSetup doesn't pipe `goalArchetype`** into
   `PlanQualityInput`. Archetype warnings are dormant at setup time — users
   won't see the archetype-specific warnings until the logic flows archetype
   at that call site.
5. **No analytics fanout for Execution Insights or Rescue Mode triggers.**
   We can't tell which insight actually fires most, which rescue trigger
   is most common, or how often insights lead to an action — purely local.
6. **`CardTitle` primitive is still `h4`.** Structural but deferred; does
   not block a friendly beta.

## 12. Known Limitations

- **Local-first only**: all v2 core-quality behaviors live in localStorage.
  Users losing browser storage lose their plan, insights state, and
  rescue-nudge derivation input.
- **No calibration loop yet**: rubrics and thresholds ship as best-guess;
  tuning needs instrumented sessions.
- **Archetype classifier is substring keyword-based**: missed accents and
  phrase variants are possible (documented in `GOAL_ARCHETYPES.md`).
- **Semantic emptiness not detectable**: a 200-character goal that says
  nothing meaningful will still pass quality rubrics.
- **Insights use canned Vietnamese copy**: no interpolation of user text,
  which keeps analytics safe but can feel generic when the same insight
  recurs week after week.
- **Feasibility ResultStep density**: ~700-line component with lots of
  inline copy; testers on small phones may scroll fatigue even with
  `<details>` disclosures.
- **No reduced-motion gate on step shell `motion.div`**: full-page animation
  on each step transition runs even for users with OS-level reduced-motion
  preference. Shared `Card` does honor it; page shells do not.

## 13. What Not To Promise Publicly

Do **not** say or imply:

- "Production-ready full-stack."
- "Cloud sync works seamlessly across devices."
- "Paid plans are available now." (Billing is mock/provider-contract —
  see `BILLING_STATUS_AND_PLAN.md`.)
- "AI-powered coaching" — all v2 signals are deterministic, rule-based.
  No LLM, no external inference.
- "Calibrated to real users" — rubrics and thresholds are not yet
  data-calibrated.
- "Account migration / recovery / export is done" — not implemented.
- "All tasks sync back to server" — skipped/rescheduled flags are local-only.
- "Weekly review drives changes automatically" — it surfaces a
  recommendation; acceptance is still one click, no auto-apply.

## 14. Time-To-Next-Step Assessment

| Action | Status | Reasoning |
|---|---|---|
| **Invite more testers (friendly beta 5–15)** | **YES — proceed** | The app survives typecheck / 734 tests / build / explicit a11y test pass. Rubrics + rescue + insights are shipped and canned-copy-safe. Collecting real feedback is the single biggest un-answered question. |
| **Broad public invite (>50)** | **NOT YET** | No feedback synthesis, no browser smoke re-run, no calibrated thresholds. Premature. |
| **Improve analytics** | **YES — in parallel** | Wire insight-id + rescue-trigger-id + archetype-id as allowlisted buckets **before** widening rollout. Needed to validate §11.3 thresholds. Keep allowlist strict (no raw text). |
| **Start paid MVP discovery (interviews only)** | **OK to begin — discovery only, no payments** | Per `PAID_MVP_READINESS_DECISION.md`, price-discovery conversations are safe. Do not promote mock billing as real. Do not collect payment intent. |
| **Resume cloud sync** | **NO** | Explicitly out of scope for this gate. Cloud sync was used as a crutch in earlier iterations; v2 fixes core UX first, sync comes later when the core loop has real usage data. See constraint "Không đề xuất cloud sync như cách che core UX yếu." |
| **Enable real billing** | **NO** | Core quality bar is GO-with-limitations, not clean GO. Do not sell. See constraint "Không đề xuất billing thật nếu core quality chưa GO." |
| **Start MVP 2 sync staging** | **HOLD** | Parallel track; do not accelerate if it pulls focus from friendly-beta feedback loop. |

## 15. Next 10 Prompts Recommended

These are ordered by dependency — earlier prompts unblock later ones.

1. **Feedback synthesis scaffold.** "Create
   `guidelines/CORE_FUNNEL_FEEDBACK_SYNTHESIS.md` with an empty template:
   session id, tester persona, SMART goal artifact, feasibility result,
   plan state at day 3 + day 7 + day 14, moments of friction, moments
   of delight, copy quoted verbatim. Do not invent data; leave sections
   empty for real session intake."

2. **Browser smoke re-run in a documented way.** "Start
   `npm run dev` on port 5173, then run `npm run smoke:core-quality` with
   `CORE_QUALITY_URL=http://127.0.0.1:5173`. Capture the full agent-browser
   log into `artifacts/core-quality/{timestamp}/run.log`. Do not modify
   source code. Report pass/fail per Quality Bar from
   `CORE_FUNNEL_QUALITY_AUDIT.md`."

3. **Wire archetype into ReviewStep.** "In
   `src/app/pages/12WeekSetup/components/ReviewStep.tsx`, thread
   `goalArchetype` from the current feasibility/SMART context into
   `PlanQualityInput` without changing storage schema or quality scoring.
   Add a regression test in `planQuality.archetype.test.ts` that asserts
   an archetype-fit warning now surfaces through the Review UI."

4. **Analytics allowlist bump for insights + rescue.** "Add the
   following bucket fields to the analytics allowlist (per
   `ANALYTICS_MVP.md`): `execution_insight_id`, `rescue_trigger_id`,
   `next_action_id`, `goal_archetype`. Keep raw text blocked. Wire the
   `TwelveWeekInsightsCard` and `TwelveWeekRescueNudge` to emit
   `trackAnalyticsEvent` with these fields only. Do not change insight
   scoring or trigger logic."

5. **Mobile-viewport a11y + layout sweep.** "Run a mobile-viewport
   visual pass (390×844) across SMART / Feasibility / 12WeekSetup /
   12WeekSystem Today / Week / Progress. List any touch targets < 44px,
   text wrapping anomalies, and sticky-header collisions. Do not
   redesign — produce a `MOBILE_CORE_FUNNEL_REPORT.md` with annotated
   findings only."

6. **Reduced-motion gate on step shells.** "Apply `useReducedMotion()`
   to the top-level `motion.div` wrapper in `SMARTGoalSetup.tsx`,
   `FeasibilityCheck.tsx`, `FeasibilityStepShell.tsx`,
   `SetupStepShell.tsx`, and `SmartGoalStepShell.tsx`. When reduced
   motion is preferred, collapse animation to a plain fade with 0
   transform. Add a unit test per shell confirming the hook path."

7. **Calibration baseline from synthetic fixtures.** "Create
   `calibrationFixtures.ts` with 30 synthetic SMART goals + matching
   feasibility answers spanning all 10 archetypes. For each, run the
   real rubric helpers and output
   `(archetype, smart_level, feasibility_result, plan_quality_level)`
   into `artifacts/calibration/{timestamp}/matrix.csv`. This is the
   before-tuning baseline we need in order to defend later threshold
   changes."

8. **Friendly-beta intake script.** "Create
   `guidelines/CORE_FUNNEL_V2_TESTER_SCRIPT.md` with a 20-minute
   walkthrough (pick an area → write SMART → run feasibility →
   generate plan → do 3 Today toggles → open Progress). After each
   step, pause and ask one verbatim question. Provide a Notion-style
   or Markdown template for intake notes."

9. **Overdue task analytics-safe labels.** "In
   `useTwelveWeekExecutionActions`, map the `OverdueTaskActionReason`
   enum into an allowlisted analytics bucket
   `overdue_action_reason_id`. Keep refusal reasons (`task_not_found`,
   `core_task_cannot_skip`, …) as ids only. Add a test asserting no
   raw task title leaks into any emitted event."

10. **Post-beta decision refresh prompt.** "Once 5+ friendly-beta
    sessions are logged into `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md`,
    refresh `CORE_QUALITY_V2_GO_NO_GO.md`: move Section 1 to GO or
    NO-GO (no more 'with known limitations' if the feedback supports
    it), update Section 10 with direct quotes, tune thresholds in
    §11.3 based on calibration data, and list any new blockers."

## Limitations of This Audit

- Two of the prompt's input docs do not exist in `guidelines/` —
  `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md`, `CORE_FUNNEL_GO_NO_GO.md`,
  `CORE_COACHING_COPY_GUIDE.md`. The audit proceeded using the rubric /
  status / tech-debt / rescue / archetype docs that do exist, plus
  a source review.
- Browser-based gates (`smoke:core-quality`, `visual:prod`) were **not**
  executed — they require a running dev server and the `agent-browser`
  MCP stack. They are the most material remaining unknown before a
  wide-open invitation; hence §14 recommends running them in parallel
  with the friendly-beta cohort.
- No real user data informs thresholds. Every "READY" in §5–§9 is
  "READY as a code artifact", not "READY as a validated UX".
