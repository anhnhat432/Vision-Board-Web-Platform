# Next Strategic Branch — Decision

Date: 2026-05-03
Decision owner lens: product strategy + technical lead.
Scope: which of six development branches the team should commit to immediately after the Core Quality v2 work.

Sources reviewed (truth docs in repo):

- `guidelines/CORE_QUALITY_V2_GO_NO_GO.md` — current core-quality gate, dated 2026-05-03.
- `guidelines/CORE_FUNNEL_FEEDBACK_SYNTHESIS.md` — **not in repo** (referenced by the v2 audit; explicitly missing).
- `guidelines/MVP_1_FEEDBACK_SUMMARY.md` — **not in repo** (referenced by `PAID_MVP_READINESS_DECISION.md` §"Scope reviewed"; explicitly missing).
- `guidelines/MVP_2_SYNC_IMPLEMENTATION_STATUS.md` — partial; mutation queue + safe-merge manual sync shipped; no full round-trip cloud restore.
- `guidelines/PAID_MVP_READINESS_DECISION.md` — current decision: **PREPARE ONLY**, do not implement.
- `guidelines/BILLING_STATUS_AND_PLAN.md` — billing is mock/local only; no backend billing models, no webhook, no entitlement authority.
- `guidelines/TECH_DEBT_REGISTER.md` — register, not blocker list; no debt item is currently MVP-1 release-blocking.
- `README.md` — confirms local-first demo with optional backend.

This document does not change any source code. It commits to one branch, defers the others with reasons, and lists the next prompts to run.

---

## 1. Decision

**Commit the next 30 days to the "Friendly-Beta + Paid Discovery (interviews only)" branch.**

Concretely:

- **Primary track**: option **#1 — Mời thêm user test (Friendly Beta, 5–15 testers)**.
- **Thin parallel sub-track**: option **#4 — Paid MVP Discovery (price/feature interviews only, no payment collection)**, piggybacked on the same friendly-beta sessions to avoid duplicate intake.
- **Deferred**: options #2 (core polish), #3 (cloud sync MVP 2), #5 (paid implementation), #6 (retention/reminder engine).

This is a single committed branch — not "do everything in parallel". The sub-track only adds 1–2 questions to the same intake script; it does not start a separate engineering workstream.

---

## 2. Why This Branch

The single largest unanswered question for this product is **whether real users produce a SMART goal, finish feasibility, generate a startable plan, and return for week 2 review without moderator help**. Until that is answered with real data, every other branch is building on guesses.

Three reasons make Friendly Beta the obvious next branch:

1. **Every other branch is gated by real-user data.**
   - Cloud sync (#3) only matters if users return — current evidence: unknown.
   - Paid implementation (#5) only matters if users will pay for a specific feature — current evidence: zero willingness-to-pay data.
   - Retention engine (#6) only matters if users come back at all — current evidence: zero return-rate data.
   - Core polish (#2) without feedback is gold-plating — most of the obvious code-side polish landed in v2.

2. **Cost is low, and the code is ready.**
   - Core quality v2 is **GO with known limitations** per `CORE_QUALITY_V2_GO_NO_GO.md` §1.
   - 85 test files / 835+ tests pass. Build clean. Vercel demo deployed.
   - The blocker is logistics (sessions, intake script, watching analytics), not code. Friendly beta requires zero new engineering beyond minor analytics polish.

3. **A2 and A3 follow naturally from the same sessions.**
   - The friendly beta produces `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md` (top remaining blocker per v2 audit §11.1).
   - It also produces the willingness-to-pay signal that `PAID_MVP_READINESS_DECISION.md` §4 lists as a precondition for paid work.
   - Two missing artifacts get filled in one cohort.

The thin paid-discovery sub-track is justified because:

- `CORE_QUALITY_V2_GO_NO_GO.md` §14 explicitly allows it ("OK to begin — discovery only, no payments").
- It reuses the same testers — no extra recruiting cost.
- It strictly does NOT touch billing code, mock checkout, or provider integration. It is interview questions only.

---

## 3. Why Not The Other Branches

### #2 — Tiếp tục polish core funnel — DEFER

- v2 audit §5–§9 marks the major funnel surfaces "READY". Remaining gaps are either code-trivial (wire archetype into ReviewStep — already done in this session) or speculative without user feedback (which copy lands? which warning is too noisy?).
- Without sessions, polish risk is high: changing wording for one tester's intuition can regress for another.
- Specific polish prompts are still valuable as **maintenance**, but they do not unblock the activation question. Keep them in `TECH_DEBT_REGISTER.md` for opportunistic fixes during friendly beta.

### #3 — Cloud Sync MVP 2 — DEFER hard

- Constraint applied: "Không đề xuất cloud sync nếu core activation còn yếu." Activation is **unknown**, not strong. Strict reading: defer.
- `MVP_2_SYNC_IMPLEMENTATION_STATUS.md` §1 explicitly says cloud sync is not complete and warns against publicly claiming it.
- Selling multi-device restore before knowing whether users return at all is a textbook premature optimization.
- The current manual safe-merge sync path is sufficient for friendly-beta needs (a tester who reinstalls can manually pull). No new sync code is required to run a 5-15 person beta.

### #4 — Paid MVP Discovery — DO IN PARALLEL (sub-track only)

- Promoted into the chosen branch as a sub-track because it shares intake cost with #1.
- Strict scope: 1-2 questions per session ("Of these four candidates — premium templates, review insights, priority reminders, advanced analytics — which would you actually pay for?", "What price feels fair for one 12-week cycle?").
- **Does not** include: implementing real billing, presenting mock checkout as real, tightening provider contracts, choosing a provider, or backend billing models. All of those wait until the data shows a clear paid feature.

### #5 — Paid MVP Implementation — NO

- Constraint applied: "Không đề xuất paid implementation nếu chưa có willingness-to-pay hoặc core quality chưa GO."
- Both gates fail: WTP evidence is **zero** (no `MVP_1_FEEDBACK_SUMMARY.md`); core quality is **GO with known limitations**, not clean GO.
- `PAID_MVP_READINESS_DECISION.md` §1–§3 already says "PREPARE ONLY" with the exact same reasoning.
- Re-evaluate after 30 days IF discovery shows ≥ 60% WTP signal AND core quality moves to clean GO.

### #6 — Retention / Reminder Engine — DEFER

- A retention engine without retention data is design-by-guess. We don't know:
  - Which day users drop off (day 1? day 4? week 2 review?).
  - Which message restores them (insight? streak? rescue trigger?).
  - Which channel they will tolerate (email? push? in-app only?).
- The existing rescue-mode + execution-insights engine already handles "in-session" nudges. The missing layer is **out-of-session reach-back**, which requires an outside channel (email/push) that has data, security, and analytics implications well above one cohort's budget.
- Re-evaluate after 30 days when day-N return distribution is known from the cohort.

---

## 4. Evidence

### 4.1 User feedback evidence

- **Activation feedback**: NONE. `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md` does not exist in repo. The v2 audit §10 explicitly notes: *"Tester-session feedback, cohort interviews, or structured transcripts are not in the repo. Any claim about 'user feedback says X' in v2 planning should be flagged as unsupported until this doc actually exists."*
- **Willingness-to-pay**: NONE. `MVP_1_FEEDBACK_SUMMARY.md` does not exist either. `PAID_MVP_READINESS_DECISION.md` §3.1 marks this as the top blocker for paid work.
- **Implication**: every claim about "users want X" is currently based on rubric design intent, not observed behavior.

### 4.2 Activation quality evidence (code-side)

- **Rubrics shipped + tested**: SMART quality (8 dimensions, 30 assertions), feasibility scoring (7 axes + wheel penalty, 8 scenarios), 12-week plan quality (7 dimensions + archetype fit, 54 assertions across 2 test files), rescue mode (5 triggers + cold-start guard), execution insights (10 ids, 22 unit tests).
- **Funnel surfaces**: SMART setup, Feasibility, 12WeekSetup Review (with archetype examples + plan rationale), 12WeekSystem Today/Week/Progress/Settings.
- **Test totals**: 85 test files / 835+ Vitest tests, all passing.
- **Build/typecheck**: green.
- **What this proves**: the app emits a quality signal at every step. **What this does not prove**: real users produce strong goals, return for week 2, or value the signal enough to pay for it.

### 4.3 Technical readiness evidence

| Branch | Code-readiness | Data-readiness | Decision impact |
|---|---|---|---|
| #1 Friendly Beta | High — public demo on Vercel works | N/A — beta produces the data | **Pick this** |
| #2 Polish | High — small targeted fixes only | Low without feedback | Defer |
| #3 Cloud Sync MVP 2 | Mid — manual sync OK; auto-sync incomplete | Low — no return-rate data | Defer hard |
| #4 Paid Discovery | High — interview only | N/A — discovery produces it | Sub-track |
| #5 Paid Implementation | Low — no backend billing; no webhook; no auth-bound entitlement | Zero WTP signal | **No** |
| #6 Retention Engine | Low — no email/push channel; no scheduler | Zero retention curve | Defer |

### 4.4 Risk evidence

| Risk | Severity | Mitigation in chosen branch |
|---|---|---|
| Tester sees mock billing and thinks it's real | Medium | Mock checkout already labelled; tighten copy as part of v2 §13 ("not allowed to claim"). |
| Friendly-beta tester can't recover state across devices | Low for cohort of 5-15 | Document "demo is per-browser" upfront; the manual safe-merge sync flow exists for the 1-2 testers who try it. |
| Tester data leaks into analytics | Low | Existing analytics privacy contract (§ANALYTICS_MVP) + the new local-only `FunnelDiagnosticsPanel` (env-gated). |
| Discovery questions get interpreted as a paid offer | Medium | Strict script: "if X existed for Y price"; never ask for card; never present mock checkout in the discovery moment. |
| Cohort too small for statistical claim | High | Treat n=5-15 as **directional**, never report as "X% of users do Y". The output is a feedback synthesis doc, not a metrics dashboard. |

---

## 5. 30-Day Plan

Cadence: weekly checkpoint on Sunday after each tester sweep.

| Week | Goal | Deliverable |
|---|---|---|
| **Week 1 (D1–D7)** | Recruit + intake-script ready | `guidelines/CORE_FUNNEL_V2_TESTER_SCRIPT.md` (20-min walkthrough + post-session questionnaire incl. 1-2 WTP probes). 5 testers recruited. Demo URL spot-check on mobile + desktop. |
| **Week 2 (D8–D14)** | Run sessions 1–5 | 5 session intakes filed in `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md`. First moment-of-friction list. Mid-cohort sanity: are the same 2-3 things tripping everyone? If so, queue the top 1 polish prompt for Week 3. |
| **Week 3 (D15–D21)** | Run sessions 6–10 + apply targeted polish | 10 sessions logged. One small polish PR if and only if the same friction shows in ≥ 4 sessions. No big refactors. Capture day-3 / day-7 return survey ("did you open the app again? did you finish week-1 tasks?"). |
| **Week 4 (D22–D30)** | Synthesis + decision refresh | `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md` finalised with quotes + activation/clarity/return-intent scores. WTP rollup table. Refreshed `CORE_QUALITY_V2_GO_NO_GO.md` (move §1 to clean GO or hold). Refresh `PAID_MVP_READINESS_DECISION.md` §4 with WTP evidence. New decision doc replacing this one. |

Exit conditions for the 30-day plan:

- **Continue current branch** if ≥ 5 sessions completed AND median activation score ≥ 4/5 AND ≥ 3/5 testers say they would return.
- **Pivot to polish-only (#2)** if same friction blocks ≥ 60% of testers at the same step. Run a 7-day polish sprint then resume the cohort.
- **Pivot to retention (#6)** only if activation lands but week-2 return rate < 30%. (Even then, do retention discovery first — channels and copy — not engineering.)
- **Promote paid discovery (#4) to a real workstream** only if ≥ 60% of testers identify the same paid feature unprompted AND the median fair-price answer is in a coherent range.

---

## 6. 7-Day Plan

Day-by-day, work-of-the-day:

| Day | Work | Output |
|---|---|---|
| **D1 (today)** | Write the intake script. Define what "session 1 success" looks like. | `guidelines/CORE_FUNNEL_V2_TESTER_SCRIPT.md` v0 — 20-min walkthrough, 4 verbatim questions per step, post-session sheet (Activation / Clarity / Trust / Usefulness / Return Intent + 2 WTP probes). |
| **D2** | Privacy + safety pass on the script. Make sure no PII is requested, no payment intent collected, no email harvesting beyond contact for the next checkpoint. | Reviewed script + a one-line privacy note. |
| **D3** | Recruit 5 testers from existing channels. Pick people who match the personas in `MVP_1_USER_TESTING_SCRIPT.md` if any, otherwise: 2 students prepping for an exam, 1 person rebuilding a habit, 1 freelancer with a project, 1 wildcard. | 5 confirmed slots. |
| **D4** | Spot-check the demo URL on mobile (390×844) and desktop. No code changes; record any showstoppers. | Short note. If a showstopper exists, fix it on D5; else proceed. |
| **D5** | Optional polish PR window. Only if D4 found a real issue (e.g., a demo-specific build regression). Otherwise: rest day for the engineering side. | At most one tiny PR. |
| **D6** | Empty intake template ready. Open the v2 funnel diagnostics panel only on the engineer's local machine (env flag) to verify the shape of an end-to-end session in the data layer. | `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md` skeleton committed. |
| **D7** | Session 1 run. Take notes, file in the synthesis doc. Hand the experience-debrief loop. | First session intake row. |

The 7-day plan deliberately produces **zero new product code** beyond an optional D5 PR. The branch is a discovery branch, not a feature branch.

---

## 7. Top 10 Prompts For The Chosen Branch

These are the next prompts to run. Ordered by dependency — earlier prompts unblock later ones. They do not duplicate the prompts already listed in `CORE_QUALITY_V2_GO_NO_GO.md` §15; where relevant, they reference and extend them.

1. **Tester intake script v0.** *Bạn là product researcher. Tạo `guidelines/CORE_FUNNEL_V2_TESTER_SCRIPT.md` với 20-min walkthrough cho người test (Onboarding → Life Balance → SMART → Feasibility → 12-Week Setup → 3 Today toggles → Progress). Mỗi step có 1 câu hỏi verbatim. Cuối session có Activation/Clarity/Trust/Usefulness/Return Intent (1-5) và 2 câu WTP — không thu payment intent, không hứa hẹn paid. Không code.*

2. **Synthesis doc skeleton.** *Tạo `guidelines/CORE_FUNNEL_FEEDBACK_SYNTHESIS.md` với template trống: session id, persona snapshot (không PII), SMART artifact (level only), feasibility result, plan state day-3 / day-7 / day-14, friction moments, delight moments, copy quoted verbatim, WTP signal. Không tạo data giả.*

3. **Privacy review of the intake script.** *Audit script Sessions để chắc rằng (1) không thu email khi không cần thiết, (2) không lộ goal text ra ngoài máy của tester, (3) không trình bày mock checkout là payment thật, (4) không claim cloud sync hoạt động. Sửa script khi cần.*

4. **Mobile/desktop demo spot-check.** *Chạy `npm run dev` và mở demo ở viewport 390×844 + 1280×720. Đi qua full funnel một lần. List bất kỳ showstopper (broken layout, route 404, demo data save lỗi) trong `MOBILE_DEMO_PRECHECK_REPORT.md`. Không sửa code chưa cần.*

5. **Analytics allowlist bump for cohort signals.** Re-issue v2 audit §15 prompt #4 (extend ANALYTICS_MVP allowlist with `execution_insight_id`, `rescue_trigger_id`, `next_action_id`, `goal_archetype`) — this is what lets us see cohort behavior without raw text leaks. *Không thay đổi insight scoring hay rescue trigger logic.*

6. **Funnel-diagnostics dev gate verify.** *Confirm `VITE_SHOW_FUNNEL_DIAGNOSTICS=true` chỉ bật panel ở dev/local; verify `.env.production` không có flag này. Build production và xác nhận panel không xuất hiện. Báo cáo result.*

7. **Tester onboarding email/message v0.** *Soạn 80-150 từ message để gửi cho tester: link demo, thời gian, kỳ vọng (test, không sale), không yêu cầu account, không cần thanh toán. Đặt vào `guidelines/FRIENDLY_BETA_INVITE.md`. Không gắn UTM/tracking spam.*

8. **Day-3 & day-7 return survey v0.** *Tạo `guidelines/FRIENDLY_BETA_RETURN_SURVEY.md` — 5-câu survey gửi tester sau 3 ngày + sau 7 ngày: bạn có mở app không? bạn có làm được việc nào tuần 1? bạn nhớ tên tính năng nào? bạn thấy chỗ nào bí? bạn có muốn dùng tiếp tuần sau không? Không hỏi PII không cần thiết.*

9. **Pre-decision checklist for week-4.** *Tạo `guidelines/FRIENDLY_BETA_DECISION_CHECKLIST.md` — checklist để cuối 30-day quyết: Continue / Polish-pivot / Retention-pivot / Discovery-promote. Tham chiếu rõ §5 trong `NEXT_STRATEGIC_BRANCH_DECISION.md`. Không tự suy ra kết quả; checklist chỉ định nghĩa input cần.*

10. **Post-cohort decision refresh.** *Sau ≥ 5 sessions trong synthesis doc: viết `NEXT_STRATEGIC_BRANCH_DECISION_v2.md` thay thế v1. Mỗi nhánh phải có evidence-based ranking (số sessions support / oppose), không phải intuition. Update `CORE_QUALITY_V2_GO_NO_GO.md` §1 nếu data đủ chuyển sang clean GO.*

The first prompt to run is **prompt #1** above.

---

## 8. Kill Criteria — When To Stop Or Pivot

Pivot or stop the friendly-beta branch if any of the following hits during the 30-day window:

| Trigger | Action | Reason |
|---|---|---|
| **≥ 3 of first 5 sessions hit the same showstopper** (e.g., onboarding wheel won't save, plan generation crashes) | Stop sessions for 5 days. Pivot to a focused fix-only sprint (#2). Resume after the regression is shipped + 1 verified replay. | The cohort is testing a broken artifact, not the product idea. Continuing wastes goodwill. |
| **Median Activation score < 3/5 across 5 sessions** | Stop sessions for 7 days. Pivot to copy + flow polish (#2) but only on the 2 most-mentioned friction points. Resume with fresh tester slot. | The product is not landing. More sessions won't change that — fix the cliff first. |
| **Median Return-Intent score < 3/5 AND day-3 actual return rate < 30%** | Do not start cloud sync (#3) or paid impl (#5). Pivot to retention-discovery (#6 sub-track) — interviews about *why* they didn't return. | Retention is the failure mode, not activation. Add a discovery loop, do not build engine yet. |
| **Tester explicitly thinks mock billing is real / asks "did I just pay?"** | Stop sessions same day. Tighten mock-checkout copy (one-line emergency PR). Resume next session only after copy is verified. | This is reputational + legal risk, not just UX. |
| **Cannot recruit ≥ 5 testers in 14 days** | Stop the branch. Reassess: is the recruiting channel wrong? Is the audience wrong? Is the pitch wrong? | If 5 friendly testers can't be found in 2 weeks, the bigger problem is positioning, not product. |
| **WTP signal converges on "no one would pay"** (≥ 80% across 8+ sessions) | Kill the paid sub-track (#4). Do **not** start paid impl. Re-evaluate which feature might be paid-worthy or accept the product is free + donate-supported. | This is the discovery answer we needed. Don't argue with it. |
| **A real-mode security/data issue surfaces** (e.g., one tester's plan data shows up for another) | Halt all friendly-beta work immediately. Treat as P0 incident. Do not resume until root-cause + fix + regression test land. | Trust collapse is unrecoverable in a small cohort. |

---

## 9. What Not To Build Yet

Explicitly do **not** start, propose, or scope these during this 30-day window:

- **Real billing integration** — no provider selection, no Stripe/Paddle/MoMo/VNPay PR, no webhook endpoint, no `BillingCustomer/BillingSubscription` Mongoose models. Per `PAID_MVP_READINESS_DECISION.md` §1 + §3.
- **Production cloud sync hardening** — no auto-pull on login, no background pull, no field-level merge UI, no "use cloud version" overwrite path beyond what manual safe-merge already does, no pagination, no DB-indexed delta queries. Per `MVP_2_SYNC_IMPLEMENTATION_STATUS.md` §4 + the activation-rule constraint.
- **Email / push reminder infrastructure** — no reminder scheduler, no email service integration, no push-notification subscription pipeline. Even if the rescue/insight engine emits the signal locally, do not build the outside channel until day-N return data exists.
- **AI / LLM coaching** — explicitly forbidden by `CORE_QUALITY_V2_GO_NO_GO.md` §13. Don't even prototype.
- **Vision board re-design, achievements polish, social/sharing features** — out of MVP scope per `AGENTS.md`. Will surface as "nice-to-have" in feedback; resist.
- **New funnel steps** — do not add a step "between" any existing step. Current friction questions are about copy and flow, not coverage gaps. Adding a step is a 4-week project that this cohort cannot validate.
- **Subscription/account migration tooling beyond the current manual import** — phase 2 import already exists; no new "1-click cloud restore" copy or feature.
- **Threshold tuning of rubric scores from individual session reactions** — wait until ≥ 5 sessions are aggregated; never tune from n=1.
- **Dashboard or admin-facing analytics dashboard** — local `FunnelDiagnosticsPanel` is enough. No backend metrics dashboard, no Looker/Metabase integration.
- **Localization** — Vietnamese-only is fine for the friendly-beta cohort. English/i18n waits for cohort #2 if at all.

---

## 10. Public Claims — Allowed vs Not Allowed

These are the only claims allowed in any external-facing surface (landing copy, social posts, demo intro, tester invite, app footer) during the 30-day window.

### Allowed

- "Bản demo cho cá nhân tự lên kế hoạch 12 tuần trên trình duyệt — local-first."
- "Đánh giá nhanh chất lượng SMART goal + feasibility check + 12-week plan, dựa trên rubric công khai."
- "Có gợi ý hành động hằng tuần và phát hiện việc nên giảm/dời/giữ — không phải AI, không phải coach thật, là rule-based."
- "Ngôn ngữ chính: tiếng Việt."
- "Chế độ demo không cần đăng ký, không yêu cầu thanh toán."
- "Phiên bản friendly beta — đang thu phản hồi để cải thiện."

### Not Allowed

- ❌ "Production-ready full-stack." (Per v2 audit §13.)
- ❌ "Cloud sync works seamlessly across devices." (Per v2 audit §13 + sync status §1.)
- ❌ "Available now / launching" / "Plus plan available" / "Subscribe today." (Per `BILLING_STATUS_AND_PLAN.md` §"Public demo copy convention".)
- ❌ "AI-powered coaching" / "machine learning" / "smart insights powered by AI." (Per v2 audit §13.)
- ❌ "Calibrated to thousands of users" / "data-driven thresholds." (Per v2 audit §13 — thresholds are heuristic.)
- ❌ "Account migration / multi-device backup is done." (Per sync status §1 + §4.)
- ❌ "Weekly review automatically improves your plan." (It surfaces a recommendation; user clicks accept. Per v2 audit §13.)
- ❌ "Risk-free / guaranteed results" / "complete your goal in 12 weeks." (No success-promise copy. Per the plan-rationale copy-safety rule.)
- ❌ Any claim that refers to specific number of users / activation % / NPS — there is no such data.
- ❌ Any claim that references "Pro" plan publicly. Internal compatibility type only. (Per `BILLING_STATUS_AND_PLAN.md` §"Plans".)

---

## Final Output Summary

- **Decision**: Friendly Beta (option #1) with thin Paid Discovery sub-track (option #4 — interviews only, no payment integration).
- **Defer**: core polish (#2), cloud sync MVP 2 (#3), paid implementation (#5), retention engine (#6).
- **Why**: every other branch is gated on real-user data that the friendly beta is the cheapest way to obtain. Constraints "no paid impl without WTP" and "no cloud sync without core activation" are enforced.
- **Next prompt to run**: prompt **#1 — Tester intake script v0** (`guidelines/CORE_FUNNEL_V2_TESTER_SCRIPT.md`).
- **Time horizon**: 30 days. Refresh this document as `NEXT_STRATEGIC_BRANCH_DECISION_v2.md` after ≥ 5 sessions are filed in `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md`.
- **Hard constraint**: no source code changes from this task.
