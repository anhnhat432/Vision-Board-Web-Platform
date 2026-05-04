# Core Funnel User Testing Script

Last updated: 2026-05-03
Audience: product researcher, founder, anyone running invited tester sessions.
Reading level: written for non-technical readers.

This script complements [MVP_1_USER_TESTING_SCRIPT.md](MVP_1_USER_TESTING_SCRIPT.md). The earlier script checks "can a user finish the flow." This one checks the harder question: **does the flow actually change how the user feels about their goal?** Use this with 5-8 invited testers after the basic flow smoke is green.

Related quality rubric docs (`SMART_GOAL_QUALITY_RUBRIC.md`, `FEASIBILITY_SCORING_RUBRIC.md`, `12_WEEK_PLAN_QUALITY_RUBRIC.md`) do not exist yet. Use the rubric in §6 of this script as the working substitute until they are written.

## 1. Research Goals

We want to learn whether the core funnel does five things, in order. Each is a separate question. Do not collapse them.

1. **SMART step** — does writing a SMART goal make the tester see their own goal more clearly than before? Or does it feel like extra forms?
2. **Feasibility step** — does the result match the tester's lived sense of what's realistic? Or does it feel arbitrary, harsh, or generous?
3. **12-week plan** — when the plan appears, does the tester want to start? Or does it feel overwhelming, generic, or too easy?
4. **Today tab** — when the tester lands in the 12-week system, can they answer "what do I do today?" without help?
5. **Weekly review and progress** — would the tester want to come back at the end of the week? What would bring them back?

A passing funnel is one where the tester says, in their own words, that their goal is clearer, the plan feels theirs, and they know the next action. A failing funnel is one where the tester finishes the form but does not feel any of those things.

This is **not** a test of:

- Real billing or payment value (mock checkout only).
- Cloud sync, multi-device recovery, or account creation.
- Reminders, push, or email delivery.
- Long-term retention — we are checking willingness to come back, not actual return.

## 2. Who To Recruit

Recruit 5-8 testers, mostly outside the product team. Aim for at least one from each of these groups:

- **Has a real personal goal in mind right now** (career change, fitness, exam, side project, finance habit). They will use that goal during the test, not a fake one.
- **Has dropped a goal in the last 6-12 months.** Knows the shape of falling off plan, even if they would rather not relive it.
- **Has used Notion, planners, todo apps, habit trackers, journals, or goal-setting templates.** They will compare this product to what they already use.

Avoid only recruiting engineers or anyone who has seen this product before. The strongest tester is someone who can judge whether the flow makes sense without product context. Mix one mobile-only user into the group.

A tester does not need to enter a real, sensitive goal. Tell them they can use a sanitized version of a real goal. **Do not ask them to enter financial account numbers, medical details, names of other people, work secrets, or anything they would regret seeing in a transcript.** This is a UX test, not a personal disclosure session.

## 3. Pre-Session Setup

- 30-45 minutes per session.
- Verified deploy URL (or a local dev server you trust). Confirm signed-out flow opens without a login wall before sending the link.
- Fresh browser profile or incognito so old localStorage from earlier testers does not leak in.
- Tell the tester: "Your data stays in this browser only. It is not synced to a cloud account. The 'upgrade' button is mock and never charges money."
- Ask them to share screen if remote, or sit beside them if in person. They drive. You watch.
- Have the [tester note template](#10-tester-note-template) open in another tab.

## 4. Session Tasks (in order)

Read the task aloud, then stay quiet. Do not coach unless the tester is stuck for more than 2 minutes. Note exactly what they say, where they hesitate, and where they ask for help.

1. **Open the app.** Spend 30 seconds on the first screen. In your own words, what is this app for, and who is it for?
2. **Start the demo without logging in.**
3. **Pick a real goal you've been thinking about.** Use a sanitized version if needed. Say it out loud before typing.
4. **Write the SMART goal.** Go through Specific, Measurable, Achievable, Relevant, Time-bound steps. Read the helper text and any starter suggestions. If the app shows a clarity score, difficulty hint, or "use this suggestion" button, react out loud — do you trust it? Did anything change how you would phrase your goal?
5. **(Observation question, not a task)** Did writing the SMART version change how clear your goal feels compared to step 3?
6. **Run the feasibility check.** Answer each of the 7 questions truthfully against your real life — your real time budget, real energy, real obstacles. Do not pick what sounds nice.
7. **Read the feasibility result page.** Out loud: does this match how you would describe your situation? Does the recommended plan load (lighter / balanced / push) feel right? Is the bottleneck pointing to something you actually struggle with, or something arbitrary?
8. **Create the 12-week plan.** Go through outcome / lead indicators / schedule / review. When you see the suggested cadence and week-1 task list, react: does this feel like your plan, or someone else's plan with your name on it?
9. **(Observation question)** When you finished plan setup, did you want to start, or did you feel tired?
10. **Land on the 12-week system, Today tab.** Without scrolling for help: what do you think you should do first today?
11. **Tick the first task as complete.**
12. **Save a daily check-in.** Pick a mood, optionally write a one-line note.
13. **Open the Week tab and walk through a simulated weekly review.** Pretend it's Sunday and you're closing the week. What would you write? Do the prompts make you feel honest, defensive, or numb?
14. **Open Progress.** Out loud: do you understand the numbers and bars? Does anything change how you feel about the week?
15. **(Optional)** Open the mock paywall. Confirm in your own words that it is not charging real money. Without committing, what feature here would you actually pay for, if any?
16. **Refresh the page.** Confirm your plan and check-in are still there on the same browser.
17. **Submit feedback** through the in-app feedback form if you saw one.

Stop the session here. Save notes within 10 minutes, while the tester's words are still fresh.

## 5. What To Watch For During The Session

These are the signals that matter more than the score sheet. Note timestamps if recording.

- **Hesitation points** — where the tester pauses, scrolls back up, re-reads, or asks "what does this mean?" Mark the screen.
- **"That's confusing" moments** — quote the exact sentence or label that confused them.
- **Goal edits caused by app feedback** — did the SMART form, clarity check, or starter suggestion make them rewrite their goal? If yes, was it a real improvement or did they just make it match the form?
- **Reaction to the feasibility score** — do they push back ("that feels too harsh / too easy"), accept it ("that sounds right"), or ignore it (skim past, click continue)? Acceptance is the signal we want; ignoring is worse than pushback.
- **Plan ownership** — when the 12-week plan appears, do they refer to it as "my plan" or "the app's plan"? Listen for pronouns.
- **First-action clarity on Today** — count seconds from landing on Today to identifying the first task. Under 10 seconds is great. Over 30 seconds is a problem.
- **Weekly-review honesty** — do they write a real reflection or a polite one-liner? Real reflections mean the prompts are working.
- **Drop-off temptation** — at any point, would they have closed the tab if no one was watching? Ask after the session, not during.

## 6. Scoring Rubric (1-5 per dimension)

Score each dimension immediately after the session. Use whole numbers only. The rubric below is the working substitute until the dedicated quality rubric docs are written.

| Dimension | 1 (poor) | 3 (acceptable) | 5 (strong) |
| --- | --- | --- | --- |
| Goal clarity | Tester's spoken goal is fuzzier after SMART than before, or the form felt like paperwork. | SMART helped surface the metric or deadline, but the tester needed a moment to see why it mattered. | Tester says their goal is clearer; can state metric, target, and deadline in one sentence without re-reading the screen. |
| Trust in feasibility | Score feels arbitrary, harsh, or generous; tester argues with it or shrugs. | Tester broadly agrees with the band but disputes the bottleneck or the recommended plan load. | Tester says "yes, that's me right now," and the bottleneck names a real struggle. |
| Plan believability | Plan feels generic, overloaded, or like someone else's. | Plan feels close, but tester would edit at least 2 tactics or the cadence before starting. | Tester says "I would actually start this on Monday." Cadence and week-1 task count match their real time budget. |
| First-action clarity | Tester cannot identify the first task on Today within 30 seconds, or picks the wrong one. | Tester finds it within 10-30 seconds after re-reading. | Under 10 seconds, no re-reading, picks the highlighted priority task. |
| Return intent | Tester says "probably not" or hedges with politeness. | Tester says they would come back if reminded. | Tester names a specific moment they would come back (e.g., "Sunday evening with coffee") and a specific reason. |
| Emotional confidence | Tester finishes the flow tired, anxious, or skeptical. | Tester is neutral — finished, but not energized. | Tester finishes with visible willingness to begin. They want to do the first task now. |

Pass thresholds (per group of 5-8 testers, averaged):

- Goal clarity ≥ 4.0
- Trust in feasibility ≥ 3.5
- Plan believability ≥ 3.5
- First-action clarity ≥ 4.0
- Return intent ≥ 3.5 with at least 3 of 5 testers naming a specific return moment
- Emotional confidence ≥ 3.5

If any dimension averages below 3.0, that is the next thing to fix — not the next feature to add.

## 7. Post-Session Questions

Ask these after the tester finishes the flow. Let them answer in their own words first. Do not lead.

1. Compared to how you described your goal at the very beginning, is it clearer now? In what way?
2. Does the feasibility result match how you would honestly describe your real life right now? If not, what part is off?
3. Looking at the 12-week plan as a whole, is it too easy, too hard, or about right? What would you change first?
4. If you opened the app tomorrow morning, would you know what to do? Say it out loud.
5. Honest answer: would you come back at the end of this week to review? What would make you come back, what would make you forget?
6. If you had to pick one moment in this whole flow where you would have closed the tab, where was it?
7. (Only if relevant) What in this flow would you actually pay for? Do not be polite — say "nothing" if nothing.

Save the verbatim answers. Direct quotes are more useful than your paraphrase.

## 8. How To Synthesize Feedback Across Testers

After 5-8 sessions, sit with all the notes and do this in order. Do not skip ahead to fixes.

1. **Tag every observation** with one of these tags so patterns surface: `goal_clarity`, `feasibility_trust`, `plan_quality`, `first_action`, `weekly_review`, `progress`, `mobile`, `copy`, `local_data_trust`, `paywall`, `drop_off`.
2. **List drop-off points** — the screens or steps where 2+ testers hesitated, asked for help, or said "confusing." Order by frequency.
3. **List ownership signals** — quotes where testers said "my plan" vs "the app's plan." Count both. If "the app's plan" outnumbers "my plan," the plan does not feel personal enough yet.
4. **List trust signals** — quotes where testers accepted the feasibility result vs argued with it vs ignored it. Acceptance and pushback are both healthy. Ignoring is the bad signal.
5. **List return moments** — every specific time/place a tester named ("Sunday morning with coffee", "lunch break Monday"). Count testers, not mentions. Three specific moments out of five testers is a real return signal.
6. **Average each rubric dimension.** Compare against §6 thresholds.
7. **Write a one-page summary** with: highest-friction step, weakest rubric dimension, top three direct quotes, top three things to fix, and one thing not to touch.

Save this as `guidelines/MVP_1_FEEDBACK_SUMMARY.md`. That doc, not this script, becomes the input for the next sprint.

## 9. Decision Rules

Apply these only after at least 5 sessions are summarized. Pick one priority. Resist the urge to fix everything in one sprint.

**Fix SMART step first when:**

- Goal clarity averages below 3.5.
- 2+ testers say their goal felt fuzzier after the form than before.
- Testers tell us the SMART form felt like paperwork or schoolwork.
- Difficulty hint or starter suggestions are confusing or never used.

**Fix feasibility step first when:**

- Trust in feasibility averages below 3.5.
- Testers consistently say the result feels arbitrary, harsh, or too easy.
- The named bottleneck does not match the testers' actual struggle.
- Tester behavior shows they ignore the result (skim past without reading).

**Fix 12-week plan first when:**

- Plan believability averages below 3.5.
- Testers say the plan is too packed, too vague, or "not mine."
- Week 1 task count does not match the testers' real time budget (overload at low-capacity, sparse at high-capacity).
- Lead indicators feel templated rather than tailored.

**Fix Today tab and weekly review first when:**

- First-action clarity below 4.0.
- Testers cannot find the first task within 30 seconds.
- Weekly review prompts produce polite one-liners instead of real reflection.
- Progress view does not change how they feel about the week.

**Do not propose billing yet when:**

- Any of goal clarity, trust, plan believability, first-action clarity, or return intent is below 3.5.
- Testers cannot name a specific paid value out loud.
- Mock checkout copy confused any tester about whether real money was charged.
- This is the default stance per [CORE_FUNNEL_GO_NO_GO.md](CORE_FUNNEL_GO_NO_GO.md): no billing recommendation while core funnel is at "controlled testers only."

**Do not propose cloud sync as a UX cover when:**

- The complaint pattern is "I do not understand the plan" or "I do not know what to do today." Sync does not fix those.
- Sync is only justified when testers say "this is useful and I am afraid of losing it." That sentence has to come from real testers, not assumed.

**You can invite the next tester wave when:**

- Average rubric scores hit thresholds in §6.
- Top three quotes are specific praise, not generic ("I would actually start this on Monday" beats "looks nice").
- The next batch is recruited from a fresh pool — do not recycle testers from this round.
- A `MVP_1_FEEDBACK_SUMMARY.md` exists from this round.

## 10. Tester Note Template

Use one copy per tester. Save in a private folder, not in the repo.

```markdown
## Tester
- Date:
- Tester profile (one of: real-goal-now / dropped-recently / planner-power-user / mobile-only):
- Device/browser:
- Demo URL:
- Session length:
- Researcher:

## Goal as spoken at step 3 (before SMART)

(Verbatim, in their own words. No paraphrase.)

## Goal as written at end of SMART

(Copy from screen.)

## Did the goal get clearer? In their words

## Feasibility — what the result said

- Result type:
- Adjusted score:
- Plan load:
- Bottleneck:

## Feasibility — what the tester said about the result

(Quote. Did they accept, argue, or ignore?)

## Plan ownership

- Pronoun count: "my plan" vs "the app's plan":
- Tactics they would change before starting:
- Tactics they would keep:

## Today tab — first action

- Seconds to identify first task:
- Did they pick the highlighted priority task?
- Confusion notes:

## Weekly review — what they would actually write

(Verbatim.)

## Progress — did it change how they feel?

## Drop-off temptation

- "If no one was watching, where would you have closed the tab?"

## Rubric scores (1-5)

- Goal clarity:
- Trust in feasibility:
- Plan believability:
- First-action clarity:
- Return intent:
- Emotional confidence:

## Top three quotes

1.
2.
3.

## Researcher one-line summary

- Main thing to fix:
- Severity (low / medium / high):
- Tags:
```

## 11. Constraints For The Researcher

- Do not promise real cloud sync, real payment, multi-device recovery, account recovery, durable persistence after data clear, production reminders, push/email delivery, AI coaching, or a real PRO subscription. Demo is local-first, mock-billing only.
- Do not over-sell during recruiting. The pitch is "help us check whether this flow makes a real goal clearer." Not "transform your life in 12 weeks."
- Do not ask testers for sensitive personal data (financial accounts, medical, third-party names, work secrets, government IDs). Sanitized goals only.
- Do not coach testers through confusion in real time. Confusion is the data.
- Do not skip the synthesis step. Five raw note files are not a result. The summary is the result.
- Do not run a second wave until the summary from the first wave is written and one priority fix has shipped.
