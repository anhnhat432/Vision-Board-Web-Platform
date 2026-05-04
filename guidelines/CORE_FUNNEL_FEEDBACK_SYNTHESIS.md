# Core Funnel Feedback Synthesis

Last updated: 2026-05-03
Status: **TEMPLATE — NO REAL TESTER DATA YET**.

> **Important.** This file is the synthesis container we will populate after the first
> wave of invited tester sessions runs against [CORE_FUNNEL_USER_TESTING_SCRIPT.md](CORE_FUNNEL_USER_TESTING_SCRIPT.md).
> No real tester sessions have been recorded as of the last-updated date.
> Sections marked `[FILL: ...]` need real input from sessions before any
> conclusion in this file is treated as evidence.
>
> Why this exists despite the empty data: it locks the synthesis structure
> in place so the researcher running the first wave does not have to invent
> a format under time pressure, and so reviewers can spot the difference
> between assumptions and findings at a glance.

The prerequisite docs the prompt asked for were checked and **do not exist** in the repo:

- `guidelines/CORE_FUNNEL_QUALITY_AUDIT.md` — missing.
- `guidelines/SMART_GOAL_QUALITY_RUBRIC.md` — missing.
- `guidelines/FEASIBILITY_SCORING_RUBRIC.md` — missing.
- `guidelines/12_WEEK_PLAN_QUALITY_RUBRIC.md` — missing.
- `guidelines/MVP_1_FEEDBACK_SUMMARY.md` — missing.
- No raw tester notes found under `guidelines/`, `docs/`, or top-level.

The working substitute rubric is §6 of [CORE_FUNNEL_USER_TESTING_SCRIPT.md](CORE_FUNNEL_USER_TESTING_SCRIPT.md).
The working scope and limitations are pinned in [CORE_FUNNEL_GO_NO_GO.md](CORE_FUNNEL_GO_NO_GO.md).

---

## 1. Session Roster

`[FILL: replace this row with one row per real tester session]`

| # | Date | Tester profile | Device | Session length | Researcher | Goal area (general) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | _yyyy-mm-dd_ | _real-goal-now / dropped-recently / planner-power-user / mobile-only_ | _laptop / phone_ | _min_ | _name_ | _e.g. "fitness habit"_ |

Profile categories follow §2 of the user testing script. Mix at least one mobile-only tester.

**Privacy guardrails for this row:**

- "Goal area" stays at the level of category, not specifics. Examples: `fitness habit`, `language exam prep`, `freelance side project`, `monthly savings habit`, `course completion`. **Not** the exact goal sentence the tester typed.
- Tester profile uses the §2 tags, not names or jobs.
- No emails, no phone numbers, no employer names, no third-party names.
- If a tester's goal cannot be summarized at category level without leaking, write `withheld` and keep the raw notes private outside the repo.

## 2. Goal Areas Used (at category level)

`[FILL: list categories represented in this wave; do not paste raw goals]`

- _e.g. fitness (2 testers), exam prep (1), side project ship (1), saving habit (1)_

If a category has only one tester, treat any pattern in that category as low-confidence.

---

## 3. Where Users Got Stuck

Order by how many testers showed the same friction. One row per friction point. Cite tester numbers from §1, never names.

`[FILL]`

| # | Module | Friction (one sentence) | Testers affected | First sign of friction (where on screen) | Tester quote (verbatim, anonymized) |
| --- | --- | --- | --- | --- | --- |
| 1 | _SMART / Feasibility / 12-week Setup / Today / Week / Progress / Dashboard_ | _e.g. "did not understand the difference between baseline and target"_ | _3 of 5_ | _e.g. SMART step 2, measurable form_ | _"so what number do I put here?"_ |

## 4. Where Users Saw Value

Same shape, but only quotes that are specific. "Looks nice" is filler — discard. "I would actually open this Sunday morning" counts.

`[FILL]`

| # | Module | Value moment | Testers affected | Verbatim quote |
| --- | --- | --- | --- | --- |

## 5. Where Users Did Not Trust The Output

Specifically the SMART clarity feedback, the feasibility result type and bottleneck, and the 12-week plan's tactic list and week-1 task count. Trust signals are: argued with it, ignored it (skimmed past), or accepted it.

`[FILL]`

| # | Module | What did not feel trustworthy | Testers reacting | Reaction type (argue / ignore / accept-but-skeptical) | Quote |
| --- | --- | --- | --- | --- | --- |

Acceptance and pushback are both healthy signals. **Ignoring is the bad signal** — it means the tester does not believe the output enough to engage.

## 6. Where Output Felt Too Generic

Watch especially for: feasibility recommendation copy, 12-week plan tactics, weekly-review prompts. "This could be anyone's plan" is the headline failure mode.

`[FILL]`

| # | Module | Generic-feeling output | Testers reacting | Quote |
| --- | --- | --- | --- | --- |

## 7. Where Users Wanted To Quit

After the session, ask: "If no one was watching, where would you have closed the tab?" Record the screen, not just the module.

`[FILL]`

| # | Screen / step | Reason in their words | Testers naming this point |
| --- | --- | --- | --- |

## 8. Where Users Said They Would Come Back

Only count testers who named a **specific moment** ("Sunday morning with coffee", "lunch break Monday"). Polite "yes, probably" without a moment does not count.

`[FILL]`

| # | Specific return moment | Tester | Reason they gave |
| --- | --- | --- | --- |

Three specific return moments out of five testers is a real return signal per [CORE_FUNNEL_USER_TESTING_SCRIPT.md §8](CORE_FUNNEL_USER_TESTING_SCRIPT.md#8-how-to-synthesize-feedback-across-testers).

---

## 9. Feedback By Module

For each module: list every observation, scored. Severity and confidence are independent — a high-severity issue from 1 tester is `severity: high, confidence: low` and goes lower in priority than a medium-severity issue confirmed by 4 testers.

Severity scale: `low` (cosmetic / single tester), `medium` (slows or confuses but completes), `high` (multiple testers blocked or distrust output), `critical` (tester abandons or finishes with wrong mental model).
Confidence scale: `low` (1 tester), `medium` (2-3 testers same direction), `high` (4+ testers same direction or behavior verified across profile types).
Fix size: `copy` (rewrite labels/help text), `UX small` (spacing, touch target, ordering), `logic` (rules in helpers, not storage), `data model` (storage schema or shape), `research more` (need more sessions before deciding).

### 9.1 SMART Goal

`[FILL]`

| # | Observation | Severity | Confidence | Affected profile | Fix size |
| --- | --- | --- | --- | --- | --- |

### 9.2 Feasibility Check

`[FILL]`

| # | Observation | Severity | Confidence | Affected profile | Fix size |
| --- | --- | --- | --- | --- | --- |

### 9.3 12-week Setup

`[FILL]`

| # | Observation | Severity | Confidence | Affected profile | Fix size |
| --- | --- | --- | --- | --- | --- |

### 9.4 Today Tab

`[FILL]`

| # | Observation | Severity | Confidence | Affected profile | Fix size |
| --- | --- | --- | --- | --- | --- |

### 9.5 Weekly Review

`[FILL]`

| # | Observation | Severity | Confidence | Affected profile | Fix size |
| --- | --- | --- | --- | --- | --- |

### 9.6 Progress

`[FILL]`

| # | Observation | Severity | Confidence | Affected profile | Fix size |
| --- | --- | --- | --- | --- | --- |

### 9.7 Dashboard / Core Navigation

`[FILL]`

| # | Observation | Severity | Confidence | Affected profile | Fix size |
| --- | --- | --- | --- | --- | --- |

---

## 10. Top 5 Fixes To Ship Next

Pull from §9 only. Pick the issues with the highest combined severity × confidence × user-type breadth. Stop at 5 — pick fewer if only fewer are warranted.

`[FILL after §9 is populated]`

| Rank | Module | Issue | Why this one (one sentence) | Suggested fix size | Owner |
| --- | --- | --- | --- | --- | --- |
| 1 |  |  |  |  |  |
| 2 |  |  |  |  |  |
| 3 |  |  |  |  |  |
| 4 |  |  |  |  |  |
| 5 |  |  |  |  |  |

## 11. Top 5 Things NOT To Do Next

Things that look tempting but the data does not support yet. Common candidates until proven otherwise:

`[FILL after §9; the entries below are placeholders that match the working stance, not findings]`

| Rank | Tempting next step | Why not yet |
| --- | --- | --- |
| 1 | Real billing / paid PRO plan | Until plan believability and return intent are proven across testers, paid value cannot be promised honestly. See §13. |
| 2 | Cloud sync as the headline next feature | Sync does not fix "I do not understand the plan" or "I do not know what to do today." See §13. |
| 3 | AI coach or AI plan generator | Out of MVP 1 scope per [AGENTS.md](../AGENTS.md). Adds trust risk while core funnel is unproven. |
| 4 | Social / sharing / leaderboards | None of the testing dimensions in [CORE_FUNNEL_USER_TESTING_SCRIPT.md §1](CORE_FUNNEL_USER_TESTING_SCRIPT.md#1-research-goals) mention this. |
| 5 | Reminders / push / email delivery | Demo mode does not guarantee delivery. Promising it before real backend reminders work is a trust risk. |

## 12. Hypotheses Confirmed vs Rejected

Hypotheses we entered the wave with. Mark only after real data exists.

`[FILL]`

| Hypothesis | Confirmed / Rejected / Inconclusive | Evidence (tester #s, quotes) |
| --- | --- | --- |
| H1: Writing a SMART goal makes the user's goal feel clearer than how they spoke it. | _pending_ |  |
| H2: The feasibility result matches the tester's lived sense of their situation. | _pending_ |  |
| H3: The generated 12-week plan feels like the tester's plan, not someone else's. | _pending_ |  |
| H4: Today tab answers "what do I do today?" within 10 seconds. | _pending_ |  |
| H5: Tester names a specific moment they would return for weekly review. | _pending_ |  |
| H6: Mock checkout copy is unambiguous about not charging real money. | _pending_ |  |

## 13. Open Questions To Test In The Next Wave

`[FILL — questions that the first wave could not answer or surfaced new]`

- _Does the difficulty hint (`easy / medium / hard`) match the tester's gut sense, especially for non-linear metrics like IELTS bands? (See [CORE_FUNNEL_TEST_SCENARIOS.md](CORE_FUNNEL_TEST_SCENARIOS.md) §5 for the known gap.)_
- _Do testers understand "lighter / balanced / push" plan load without reading helper text?_
- _Do testers in the `low capacity` band feel underloaded when week 1 has only 2 tasks (below the 3-5 recommended range)?_
- _Does the weekly-review screen produce real reflection or polite one-liners?_
- _Does Progress change how the tester feels about the week, or is it just a chart?_

---

## 14. Decision: Is The Core Funnel Ready For More Users?

**Headline decision: NOT YET — no real tester data.** The synthesis structure is in place. The decision logic below applies once §1-§13 are populated.

### Decision logic

Pass criteria, all of which must hold across the populated session roster (5-8 testers):

| Dimension | Threshold (from CORE_FUNNEL_USER_TESTING_SCRIPT §6) | Status |
| --- | --- | --- |
| Goal clarity | ≥ 4.0 average | _pending_ |
| Trust in feasibility | ≥ 3.5 average | _pending_ |
| Plan believability | ≥ 3.5 average | _pending_ |
| First-action clarity | ≥ 4.0 average | _pending_ |
| Return intent | ≥ 3.5 average **and** ≥ 3 of 5 testers naming a specific return moment | _pending_ |
| Emotional confidence | ≥ 3.5 average | _pending_ |

Any single dimension below 3.0 → that is the next thing to fix, not the next group to recruit.

### Until those thresholds are met

- **Do not propose real billing as the next milestone.** The funnel does not yet have the trust signals required to ask for money honestly. Mock checkout stays mock. Per [AGENTS.md](../AGENTS.md) "Billing and Paywall Rules" and [CORE_FUNNEL_GO_NO_GO.md](CORE_FUNNEL_GO_NO_GO.md) §10.
- **Do not propose cloud sync as the next milestone if the complaint pattern is "I do not understand the plan" or "I do not know what to do today."** Sync does not fix comprehension. Sync becomes the right next step only when testers say a sentence shaped like "this is useful and I am afraid of losing it" — that sentence has to come from real testers, not assumed.
- **Do not invite a second wave of testers from the same pool.** Recycling testers re-validates first impressions, not second sessions.
- **Do not start AI / social / community / advanced analytics work** while the funnel is unproven. They add scope and trust risk to a flow that is not yet trusted.

### When the synthesis can flip the decision

When all six dimensions in §14 hit thresholds, the decision becomes "ready to invite a fresh tester wave from a new pool." Even at that point, real billing requires testers to **name** a paid value out loud (per [CORE_FUNNEL_GO_NO_GO.md](CORE_FUNNEL_GO_NO_GO.md) §11.4) — not just to score the rubric high.

---

## 15. How To Use This Template

1. Run sessions per [CORE_FUNNEL_USER_TESTING_SCRIPT.md](CORE_FUNNEL_USER_TESTING_SCRIPT.md).
2. Save raw notes outside the repo (private folder), not in `guidelines/`.
3. After each session, write at most **two lines** in §1 and one entry in §3-§8 if relevant. Resist the urge to summarize early.
4. After the 5th session, sit with all notes for one quiet block and fill §9-§14 in one pass. The synthesis is the work product. Five raw note files are not.
5. When done, replace this status banner with `Last updated: <date>` and `Status: synthesis complete, N testers`.
6. Then write `guidelines/MVP_1_FEEDBACK_SUMMARY.md` as the one-page version of this file. That is the input for the next sprint planning prompt.

## 16. Constraints Honored In This Synthesis

- No invented feedback. Sections marked `[FILL]` stay marked until real data lands.
- No raw personal data. §1 instructs categorical goal areas, no names/employers/IDs.
- No proposal of real billing as next step.
- No cloud sync framed as a UX cover.
- No source-code change. Only this docs file was created.
- No marketing-grade phrasing. Decisions are scoped and scored, not advertised.
