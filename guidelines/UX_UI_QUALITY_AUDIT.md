# UX / UI Quality Audit — Post Core-Quality v2

Date: 2026-05-03
Reviewer lens: senior UX/UI reviewer for goal-execution / 12-week planning.
Scope: full app surface after Core Quality v2 work landed (rubrics, rescue mode, insights, archetype overlay, plan rationale, archetype examples, funnel diagnostics).

This audit does **not** propose rewriting the UI, swapping the framework or component library, or adding more animation. It distinguishes:

- 🎨 **visual** issue (look, color, typography, spacing)
- 🧭 **flow** issue (IA, navigation, step ordering)
- ✍️ **copy** issue (wording, tone, density, naming)
- ♿ **accessibility** issue (a11y semantics, keyboard, contrast)
- 📱 **mobile** issue (small-screen layout, touch targets, fold)
- 🧠 **product logic** issue (the UI is correct but the underlying decision is wrong)

Sources reviewed: `AGENTS.md`, `guidelines/CORE_QUALITY_V2_GO_NO_GO.md`, `guidelines/CORE_FUNNEL_QUALITY_AUDIT.md`, `guidelines/TECH_DEBT_REGISTER.md` §UX/Mobile, `src/styles/theme.css`, `src/app/components/ui/*`, `src/app/components/twelve-week/*`, the route-level files for Dashboard, Onboarding, LifeBalance, LifeInsight, SMART, Feasibility, 12WeekSetup, 12WeekSystem.

`guidelines/CORE_FUNNEL_GO_NO_GO.md` and `guidelines/CORE_COACHING_COPY_GUIDE.md` do not exist in repo (referenced by the prompt as optional inputs).

---

## 1. Executive Summary

The product has **a strong, distinctive design system** and a **disciplined linear funnel** — the bones are good. The biggest UX/UI risks are not "ugly screens" but **attention dilution** (too many cards competing on the dashboard, dense disclosure on Feasibility result, identical-feeling cards across the funnel) and **fatigue from animation/visual density** that intermittently buries the primary CTA. There is no need to rewrite the UI; targeted demotion of secondary surfaces, one heading-semantics fix, and copy compression in 3 specific screens can raise activation quality meaningfully.

**Top-line verdict**:

- Visual identity: **distinctive, not generic** — but on the edge of "doing too much" (orbs + tilt + magnetic + per-route tones). One step back from polish in 2-3 spots, not a redesign.
- IA: **clear linear funnel**. Returning-user state and gate-states are well handled. The Dashboard is the one screen that does not yet match the funnel's clarity.
- Visual hierarchy: **Today tab is well anchored** (explicit "primary hero" pattern), but the Dashboard and Feasibility result fight themselves with too many parallel cards. CardTitle being `h4` is a real semantics gap and a small-but-shipping h-cascade fix.
- Forms: **strong chunking** (SMART → 6 substeps, 12WeekSetup → 4). Hints + warnings + archetype examples + plan rationale are layered correctly. Risk: the Review step carries 4 disclosure panels stacked vertically; the user can scroll past the actual "Tạo kế hoạch" CTA.
- Mobile: sticky tabs work; full-width buttons work; the failure mode is **scroll fatigue on long screens** (Feasibility ResultStep, Dashboard signed-in, 12WeekSetup Review).
- Accessibility: `aria-labelledby` / `role="alert"` / focus-on-step-transition all landed in v2. Two open items: `CardTitle` is `h4`, and page-shell `motion.div` doesn't respect reduced-motion.
- Emotional UX: tone is warm and non-judgmental in copy. Risk: weak/okay/strong labels next to user's own goal can feel like a verdict, even with a disclaimer.

The friendly-beta cohort planned in `NEXT_STRATEGIC_BRANCH_DECISION.md` will surface the real ranking; this audit lists what to tighten **before** a tester sits down.

---

## 2. UX Promise Of The Product

The implicit promise that the product currently makes is:

> "Tell me one life area you want to improve, and I will help you turn that into a SMART goal, check whether the next 12 weeks are realistic, build a week-by-week plan with a small first task, and give you weekly nudges that don't shame you."

The funnel reflects this exactly. Where the UI weakens the promise:

- The **Dashboard** does not double down on this promise — it shows many KPIs and maintenance surfaces (data backup, public-visitor account card, premium upsell) that compete with "what should I do today?" for the attention of an returning user.
- The **Feasibility ResultStep** spends a lot of vertical space on score + bottleneck + first-week guidance — all useful, but the user emerged from 7 questions and now reads ~700 lines of layout before seeing the next-action CTA.
- The **Plus / paywall** copy (mock) is honest about being a demo, but the Plus framing leaks into multiple settings/dashboard surfaces in a way that distracts from the core promise.

Adjust the surfaces, not the promise.

---

## 3. Visual Identity

**Verdict**: confident, distinctive, on the edge of "too much".

### 3.1 What works

- **Typography**: `Be Vietnam Pro` + a tight type scale (`--text-xs` 0.75 → `--text-5xl` 2.75) — gives the product a Vietnamese-first feel without looking like a generic Latin SaaS.
- **Per-route color tones** in `theme.css` (`balance` green, `system` blue, `vision` violet, `achievements` amber, `journal` warm) — gives mental "I'm in this section now" anchoring without using a sidebar.
- **Glass-surface card** + soft radial backgrounds + ambient orbs — a coherent visual language; cards feel premium.
- **Skip-to-content link**, focus-visible outline, focus on step transition — small but a sign of seriousness.

### 3.2 What feels too much

- 🎨 **Cards tilt + magnetic buttons + ambient orbs + route tones + cursor glow** all stack. Each in isolation is tasteful; together on a dense page (Dashboard, Feasibility ResultStep) the screen "shimmers" — eye-tracking proxy: the user's gaze can land on a non-primary card just because it's hovering more vivibly. Reduced-motion is honored on cards + buttons but not on page shells (per v2 audit §12).
- 🎨 **Saturation drift on tones**: `system` (blue) and `balance` (green) read as the same hue family on small phone screens. The `hero-surface` gradient changes too — but for at-a-glance "where am I" it can feel similar.
- 🎨 **Card border-radius is 28px**; some tags / badges sit inside cards and have their own ~999px / 16px radii — the eye registers ~3 different roundness systems on the same screen. Not a bug, but reads as "designed in pieces, not as a system."

### 3.3 Premium / trustworthy?

Yes, with caveats. The product looks more like a **premium personal-coaching app** than like generic SaaS. The trust signals are visual (typography, glass cards, motion choreography) — but trust signals that **really matter for a goal app** are missing:

- **No clear "your data lives only in this browser" badge anywhere persistent** — users have to infer from settings.
- **Mock billing copy is correct** but visually identical to production billing copy (same buttons, same Plus tier styling) — premium look here can backfire because it makes the demo feel like a sales surface.
- **No human signal** (a small "made by ..." or "v1.0 friendly beta" badge) anchoring the product as a friendly beta vs a polished launch.

### 3.4 Generic SaaS?

No. The visual personality is closer to "indie-premium with VN locale" than to a Hubspot/Linear/Stripe-clone aesthetic. If anything, the risk is the opposite — **too distinctive** for a tester who comes from utilitarian goal apps and wants quiet UI to focus on their goal.

---

## 4. Information Architecture Audit

**Verdict**: linear funnel is strong; the loop after activation has rough edges.

### 4.1 "Where am I?"

- ✅ **CoreFlowProgress** is rendered on Onboarding, LifeInsight, SMART, Feasibility — explicit "step 3 of 7" pip.
- ✅ **CoreFlowGateState** intercepts and tells the user where to go back to.
- ⚠️ 🧭 **Inside 12WeekSystem the user does not know what week they are in until the Today tab loads** — the tab list does not show the cycle position. It's available inside Today's hero, but a user who jumps to Settings first (e.g., to check sync) sees nothing about week position.
- ⚠️ 🧭 **12WeekSetup has 4 substeps but no visible step pip** within the wizard (the helper text is the only orientation). Compared to the SMART wizard which has explicit step indicators, this feels asymmetric.

### 4.2 Navigation clarity

- ✅ **Footer of step shells** (back / next) is consistent across SMART, Feasibility, 12WeekSetup.
- ✅ **Sticky tab list** on 12WeekSystem — `sticky top-14 z-20 ... sm:top-3` keeps tabs visible while scrolling.
- ⚠️ 🧭 **Three different ways to "go back to the funnel"**: a `CoreFlowGateState` empty state, a `TwelveWeekDashboardState` empty state, and toast-redirects from `FeasibilityCheck`. They each say similar things but differ in color, copy, and CTA shape. Pattern, not bug.
- ⚠️ 🧭 **No persistent breadcrumb or app-shell sub-nav** — the user navigates through pure forward-button progression. If they want to jump from "Progress tab" back to "edit my SMART goal", the only path is via Settings → "Tạo lại chu kỳ", which is heavy.

### 4.3 Flow length

| Step | Sub-steps | Estimated time | Risk |
|---|---|---|---|
| Onboarding | 2 (welcome + assessment) | ~3 min | Low |
| Life Balance | 1 (slider for 8 areas) | ~2 min | Low |
| Life Insight | 1 (pick focus + intent) | ~1.5 min | Low |
| SMART Goal | 6 substeps | ~5–8 min | **Medium** — text input × 6 |
| Feasibility | 7 questions + result | ~3 min + ~2 min reading | **Medium** — result is dense |
| 12WeekSetup | 4 substeps | ~5–7 min | **Medium** — Review has 4 stacked panels |
| Total cold-start | — | **~20–25 min** | The funnel is long for a single sitting |

✍️ **The funnel does not advertise this length up front.** The Onboarding welcome page promises a "nhịp độ bền vững" but doesn't say "this takes ~20 minutes once". A tester abandoning halfway is currently invisible to us.

### 4.4 Back / next / skip

- ✅ Back/next buttons are clearly distinct (variant=outline vs variant=default with gradient).
- ✅ Auto-save behavior in SMART step shell — leaving and coming back preserves draft.
- ⚠️ 🧭 **Skip is not a first-class concept**. Some screens have implicit skip via "Bỏ qua" ghost buttons (Onboarding intent, archetype examples), others have no skip (Feasibility — must answer all 7). Inconsistent: a tester learns "I can skip" then hits a step that won't let them.
- ⚠️ 🧭 **`<details>` disclosure expand state** is not persisted. Open the archetype example in step Specific, navigate to step Measurable, come back — it's collapsed again.

---

## 5. Visual Hierarchy Audit

**Verdict**: Today tab nailed it. Dashboard is the weakest. Review steps are at risk.

### 5.1 Screens with too many cards / panels

- 🎨 🧭 **Dashboard.tsx (1667 lines, ~85kB)**: imports `DashboardDataBackupCard`, `ExecutionScoreCard`, `GoalProgressCard`, `MetricsSummary`, `PublicVisitorAccountCard`, `PublicVisitorHero`, `StreakCard`, `WeeklyProgressChart`, plus its own `Card` usages and `NewUserGuideBanner` and `SpotlightTour`. Even if some are conditional, the signed-in returning-user view is **5–7 parallel cards above the fold** with no single primary action.
- 🎨 **FeasibilityCheck/components/ResultStep.tsx (~700 lines)**: bottleneck card + adjusted score card + "before plan" action card + first-week guidance card + archetype overlay + lead-indicator hint — all rendered inline without a single anchor. v2 audit §9 already flags this.
- 🎨 **12WeekSetup ReviewStep**: plan summary card + plan rationale panel (new) + plan quality card (with sub-panels for warnings + suggestions) + advanced disclosure (`<details>`) + week-1 task preview + footer CTA. Five cards stacked vertically before the user reaches "Tạo kế hoạch".
- 🎨 **12WeekSystem Settings tab**: cycle settings panel + device-and-sync panel (the largest panel — outbox, billing, hydration, conflict, export/delete sections) + plan-access section + funnel diagnostics panel (env-gated) + feedback dialog. The non-engineer tester rarely needs more than 2 of these.

### 5.2 CTA visibility

- ✅ **Primary CTAs use the `gradient-brand` button** which has a strong visual presence (shadow + magnetic + tinted shadow). They don't get visually lost.
- ⚠️ 🎨 📱 **CTAs sit at the bottom of long screens** — particularly Feasibility ResultStep and 12WeekSetup Review. On a 390×844 phone the user scrolls 2–3 viewport heights before reaching the next-action button. Sticky footer or "next-action" floating bar is a candidate fix.
- ⚠️ 🎨 **Secondary/outline CTAs sometimes outweigh the primary** when they appear in pairs on small screens (e.g., "Mở mục tiêu đã có" next to "Tạo mục tiêu 12 tuần") — the outline button has a glass surface + shadow that almost matches the gradient on glance.

### 5.3 Sections competing with core action

- 🎨 ✍️ **Dashboard's "DataBackupCard"** sits high in the layout for some user states. For a returning user whose primary need is "what should I do today?", this is the wrong primary placement.
- 🎨 **Today tab's `today-primary-hero`** is well-anchored (large card, gradient). Secondary today tasks render in a different card style — works.
- 🎨 **`Crown` icon for premium features** appears in Today, Settings, and Paywall — it's correct copy ("Plus demo") but the crown icon visually elevates the upsell to compete with the primary task. Demote on the primary execution path.

### 5.4 Today tab — does it stand out enough?

✅ Yes. The `today-primary-hero` testid is the explicit anchor. Plan-quality + rescue-nudge + insights all sit *below* it. The hierarchy is correct.

The risk on Today is the **opposite**: if the user has many overdue/missed tasks plus rescue nudges plus daily check-in plus optional tasks, the tab can become a 4-card stack. Compression of secondary panels into a single "Hôm nay khác" expandable group would simplify.

---

## 6. Form UX Audit

### 6.1 SMART Goal inputs (6 substeps)

- ✅ One concept per step (Specific → Measurable → Achievable → Relevant → Time-Bound → Review).
- ✅ Per-step quality hint via `getStepQualityHint` — non-blocking guidance.
- ✅ Archetype examples (collapsed) under Specific + Measurable.
- ⚠️ ✍️ **Measurable step** asks for `metric_name`, `baseline_value`, `target_value`, `metric_unit` with separate fields. For a tester with a fuzzy goal ("đọc 10 quyển sách"), the `metric_unit` field can feel pedantic. Consider an optional `metric_unit` with a smart default ("lần", "quyển", "giờ", "trang") — or fold unit into the same line as target.
- ⚠️ ✍️ **Achievable step** asks for `weekly_time_commitment_hours` + `required_skills` + `support_resources`. The latter two are list inputs; for a 5-minute first attempt, this feels like the most "homework"-y step.
- ⚠️ ✍️ **Time-Bound step** has dual mode (weeks vs target_date) — necessary, but the toggle UI is small and could be missed. New users default to "weeks" which is fine; users with deadlines (exam date) need to discover the date mode.
- ⚠️ 🎨 **Quality feedback panel renders at Time-Bound step** with level badge + overall score + warnings + suggestions. Good content, but visually it competes with the actual time-bound input — they're side-by-side on desktop and stacked on mobile, but the panel takes more vertical space than the input it's evaluating.

### 6.2 Feasibility answers (7 questions + result)

- ✅ One question per shell, RadioGroup binding to the question heading via `aria-labelledby` — strong a11y.
- ✅ Helper text per question explains *why* the question is asked.
- ⚠️ ✍️ **Question 5 (Trở ngại chính)** is open-ended-feeling but uses RadioGroup with predefined options — some testers may want "tất cả các option trên" — option ordering and copy length matter. Audit copy for parallelism.
- ⚠️ 🎨 📱 **ResultStep is the densest screen in the app** (~700 lines of layout). On mobile it can require 2-3 viewport scrolls before "Tiếp tục: lập kế hoạch 12 tuần" appears. Strong candidate for sticky next-action CTA.

### 6.3 12WeekSetup steps (4 substeps)

- ✅ OutcomeStep + LeadIndicatorsStep + ScheduleStep + ReviewStep — clean separation.
- ✅ Each step has lazy-loaded archetype examples + per-step warnings.
- ⚠️ 🧭 **No step pip** — user can't see "step 2 of 4". Asymmetric with SMART wizard.
- ⚠️ 🎨 **LeadIndicatorsStep**: dynamic add/remove rows + per-row aria-label + warnings + archetype examples + week-1 starter. Each row is a card-like surface. With 3+ indicators the screen becomes 5+ cards.
- ⚠️ 🎨 **OutcomeStep**: includes template rationale in long amber blocks (per v2 audit §9.7). v2 noted this is collapsed behind `<details>`. Verify no content drifts back out.

### 6.4 Weekly Review form

- ✅ `UniversalWeeklyReview` v2 — keepTactic / reduceTactic optional-additive — appears as expandable hints, not required fields.
- ✅ Summary card renders post-save (`weekly-review-summary`). Closes the loop.
- ⚠️ ✍️ **"Việc bạn tự hào nhất tuần này"** + "Trở ngại chính tuần này" + "Ưu tiên tuần sau" + "Bạn đã làm được mỗi việc lặp lại bao nhiêu lần" + score sliders — that's 5 free-text + several scores per review. For week 2 this is ~10 minutes of writing. v2 weekly-review made this less mandatory but the form still carries the original load.
- ⚠️ 🎨 **Score sliders** for "execution score" use color-only states (probably) — verify color-blind contrast on the slider track.

---

## 7. Mobile UX Audit

**Verdict**: The basics are solid; the failure mode is depth, not width.

### 7.1 Long screens

- 📱 **Feasibility ResultStep**: 2–3 viewport scrolls on a 390×844 phone before reaching the next-action CTA.
- 📱 **Dashboard signed-in**: 5–7 cards stacked = 4+ viewport scrolls.
- 📱 **12WeekSetup Review**: 5+ panels stacked.
- 📱 **12WeekSystem Settings tab**: even longer — it's the maintenance dashboard.

### 7.2 CTA placement on small screens

- ✅ Footer buttons are full-width on mobile (`w-full sm:w-auto`).
- ⚠️ 📱 **Primary CTA below the fold** on the 4 long screens above. Sticky footer with the primary CTA would help on Feasibility ResultStep + 12WeekSetup Review specifically (these are commit-points, not exploratory).

### 7.3 Tabs / buttons / touch targets

- ✅ Buttons default to `h-11` (44px) — meets iOS HIG minimum.
- ✅ Tab triggers stack icon + label on mobile (`flex-col sm:flex-row`) — fits 4 tabs in a row without overflow.
- ⚠️ 📱 **Per-row "Xóa" buttons in LeadIndicatorsStep** — verify size with tester input. The aria-label is good; the click target may be `h-9` or less depending on variant.
- ⚠️ 📱 **Quality badges + warning badges** are visually small (`text-xs`) and may be hard to tap if they double as buttons (they appear to be display-only — verify).

### 7.4 Text density

- 🎨 📱 **Helper text + warnings + suggestions stack vertically** on the same screen in SMART/Feasibility/12WeekSetup. On desktop these read as parallel — on mobile they read as a wall.
- ✍️ 📱 **Vietnamese is a verbose language** for instructions; some helper paragraphs run 4+ lines on mobile. Audit for "can this become one sentence?".
- ✍️ 📱 **The plan rationale panel + plan quality panel** carry similar copy density (5 reasons + 3 dimensions + suggestions). On mobile they feel duplicative even though they answer different questions.

---

## 8. Accessibility Audit

**Verdict**: Strong baseline, two known gaps.

### 8.1 Labels

- ✅ Every input/select/textarea in the funnel has `<Label htmlFor>` or explicit `aria-label`.
- ✅ Per-indicator "Xóa" button: `aria-label="Xóa việc {n}: {name}"`.
- ✅ Template cards: `aria-pressed` + full-context aria-label.

### 8.2 Focus

- ✅ `useScrollToTopOnChange` focuses step heading on transition (SMART, Feasibility, SetupStepShell, SmartGoalStepShell, FeasibilityStepShell).
- ✅ `:focus-visible` outline (2px ring + offset) defined globally in `theme.css`.
- ⚠️ ♿ **`<details>` panels** — when opened, focus does not move to the now-revealed content. Power users handle it with screen-reader; casual keyboard users have to keep tabbing.

### 8.3 Keyboard

- ✅ RadioGroup is keyboard-bound (Radix primitive).
- ✅ Tab triggers respond to arrow keys.
- ✅ Skip-to-content link works.
- ⚠️ ♿ **Magnetic buttons + card tilt rely on pointer events** — keyboard-only users miss the affordance entirely (this is by design and OK; not a bug). But: focus rings on cards that are interactive surfaces are the user's only signal — verify ring contrast against the glass background.

### 8.4 Color-only states

- ✅ Amber warning blocks now prefix "Cảnh báo:" + `AlertTriangle` icon + `role="status"` (per v2 audit §9.7).
- ✅ Quality level badges show text ("weak"/"okay"/"strong") + color, not just color.
- ⚠️ ♿ **Plan quality dimension status** uses color (`text-emerald-700` / `text-sky-700` / `text-amber-700`) on the dimension score `{score}/{max}` — the score number is the same in all three states, the only differentiator is color. Add an icon or short status word per dimension to disambiguate.
- ⚠️ ♿ **Today tab progress bar** for `weekCompletion` — verify contrast for the color-only progress.

### 8.5 Contrast risks

- ⚠️ ♿ **Glass-surface cards** sit on a soft gradient background. Body text inside is `text-slate-600` or `text-slate-700` — passes against pure white but the card is `rgba(255,255,255,0.82)`. Verify in dark/saturated route tones (e.g., `system` blue, `vision` violet) that small `text-xs text-slate-500` doesn't drop below 4.5:1.
- ⚠️ ♿ **`text-slate-500` on `bg-white/82`** is the most-used "secondary text" combination — on a phone in bright sunlight, this may be borderline.
- ⚠️ ♿ **Amber-on-amber (`text-amber-900` on `bg-amber-50/82`)** — the alpha makes contrast variable. Spot-check.

### 8.6 Heading hierarchy

- ⚠️ ♿ **`CardTitle` renders as `<h4>`** in `card.tsx:126`. v2 audit §9 already flagged this; deferred because changing it ripples. This is the single most-cited a11y gap in the audit history.
- ⚠️ ♿ **Some pages have step headings as `h2` (good) but card titles as `h4` (skips h3)** — heading outline tools will flag this.

### 8.7 Reduced motion

- ✅ Cards + buttons honor `useReducedMotion()`.
- ⚠️ ♿ **Page-shell `motion.div` wrappers** in SMARTGoalSetup / FeasibilityCheck / FeasibilityStepShell / SetupStepShell / SmartGoalStepShell do not honor reduced-motion. v2 audit §12 documented this; the prompt to fix is in v2 §15.6.

---

## 9. Emotional UX Audit

**Verdict**: Tone is the strongest dimension of the product. The risk is verdict-language.

### 9.1 Does the user feel guided?

- ✅ "Bạn", "mình" — second-person familiar — used consistently.
- ✅ Funnel gates always say *what* is missing and *where* to go (e.g., "Vui lòng hoàn thành Life Balance trước...").
- ✅ Plan rationale + archetype examples + insight cards frame *why* a recommendation appears, not just *what* to do.

### 9.2 Does the user feel judged?

- ⚠️ ✍️ **Quality level: "Cần xem lại"** (the v2 audit's mapped label for `weak`) — paired with "Điểm tổng X/100" reads like a grading rubric. The disclaimer "Đây là gợi ý — bạn vẫn có thể tạo kế hoạch" softens it but the score is shown first.
- ⚠️ ✍️ **"Việc bắt đầu cho tuần 1"** + "Mục tiêu chưa rõ" / "Phiên bản rõ hơn" framing in the archetype examples. Helpful, but for a tester showing their own goal next to the "Mục tiêu chưa rõ" example, it can read as "mine looks like the bad one". Consider neutral framing: "Phiên bản A / Phiên bản B" or "Ví dụ rộng / Ví dụ cụ thể" instead of "chưa rõ / rõ hơn".
- ⚠️ ✍️ **Rescue Mode triggers** ("Tuần này đang chậm hơn nhịp", "Bạn đã bỏ qua nhiều việc liên tiếp") — accurate, but every recurrence of the same trigger uses the same canned line. v2 audit §12 already noted this. For a tester who hits the same nudge 3 weeks in a row, it stops feeling like coaching.

### 9.3 Generic "coaching" copy?

- ⚠️ ✍️ **Plan rationale + plan quality + execution insights + rescue mode + archetype examples** all add canned Vietnamese text to the same screen. When 3+ of these fire, the screen reads like a self-help book.
- ⚠️ ✍️ **Phrases that recur**: "không phán xét", "đủ rõ để hành động", "giữ nhịp", "đừng dồn việc cuối tuần". These are good *individually* but used 5+ times across the product they become wallpaper.
- ✅ **No false promise copy** anywhere — no "guaranteed", no "AI-powered", no "in just 7 days".
- ✅ **Mock billing copy** is honest: explicit "demo, không charge tiền thật".

---

## 10. Top 15 UX/UI Issues (Ranked By Impact)

Impact = (likelihood × severity × user-facing visibility). Tag = primary lens.

| # | Issue | Tag | Impact | Why |
|---|---|---|---|---|
| 1 | Dashboard signed-in view stacks 5-7 parallel cards above the fold; no single primary action | 🎨 🧭 | **High** | Returning users open here daily. Without a primary "do this today" anchor, return-rate suffers. |
| 2 | Feasibility ResultStep is the densest screen (~700 lines); next-action CTA below the fold on mobile | 🎨 📱 | **High** | This is a commit-point, not exploration. A tester who can't see "Tiếp tục" stalls. |
| 3 | `CardTitle` renders as `<h4>`; heading outline skips `h3` | ♿ | **High** | Screen-reader users + a11y audit tools flag this on every page. Long-deferred per v2 audit §11.6. |
| 4 | 12WeekSetup wizard has no visible step pip; asymmetric with SMART wizard | 🧭 | **Medium-High** | User loses sense of "step 2 of 4" — feels open-ended. |
| 5 | Quality framing reads as grading: score `X/100` + label `weak/okay/strong` first, "you can still proceed" second | ✍️ | **Medium-High** | Risk of demoralizing the user before they see they're not blocked. |
| 6 | Page-shell `motion.div` does not honor reduced-motion preference | ♿ | **Medium** | v2 audit §12; affects vestibular-sensitive users on the most-used route shells. |
| 7 | 12WeekSystem Settings tab is too long for a tester (cycle + device + plan + diagnostics + feedback) | 🎨 🧭 | **Medium** | The first thing a curious tester clicks. Should be 1-2 most-needed sections, not 5. |
| 8 | Plan rationale + plan quality + insights + rescue all on the same screen feel duplicative | ✍️ 🎨 | **Medium** | "Coaching wallpaper" effect. Compress on Today + Review specifically. |
| 9 | Color-only differentiator on Plan Quality dimension scores (`X/Y` rendered in green/blue/amber only) | ♿ | **Medium** | Small but recurring; needs a per-status icon or word. |
| 10 | Archetype example framing "Mục tiêu chưa rõ / Phiên bản rõ hơn" can feel judgmental of the user's own draft | ✍️ | **Medium** | Easy copy fix; reframe as A/B versions. |
| 11 | The funnel does not advertise "this takes ~20–25 minutes" up front | ✍️ 🧭 | **Medium** | Testers abandoning halfway is invisible. Setting expectation early reduces drop-off. |
| 12 | `<details>` disclosure expand state not persisted across step transitions | 🧭 | **Low-Medium** | Re-opening the same example panel on every step is friction. |
| 13 | No persistent breadcrumb / "edit my SMART goal from Progress tab" path — only via Settings → recreate cycle | 🧭 | **Low-Medium** | Power users want lateral navigation; current funnel is forward-only. |
| 14 | Crown / Plus / paywall copy leaks into Today + Settings + Dashboard, competing with primary execution surface | 🎨 ✍️ | **Low-Medium** | Mock billing on the friendly-beta path should demote, not feature. |
| 15 | Gradient ambient orbs + card tilt + magnetic buttons + cursor glow stacked on dense pages = visual fatigue | 🎨 | **Low-Medium** | Not a bug, but on the densest pages the secondary motion competes with the primary CTA. |

---

## 11. Quick Wins (1–2 Days)

These are small, scoped fixes that do not require redesign or framework change. Each can ship as one focused PR with regression tests.

| # | Fix | Tag | Estimated effort |
|---|---|---|---|
| **QW1** | Change `CardTitle` element from `<h4>` to `<h3>` (or use polymorphic prop). Update existing pages where step heading is `h2` → card title `h3` is correct. Add a snapshot test asserting the role outline. | ♿ | 2-4 hr (some cards may need explicit lower-level `<p>` rewrites) |
| **QW2** | Add `useReducedMotion()` to the 5 page-shell `motion.div` wrappers (SMART, Feasibility, FeasibilityStepShell, SetupStepShell, SmartGoalStepShell). Collapse to plain fade when reduced. | ♿ | 1-2 hr — already prompt #6 in v2 audit §15 |
| **QW3** | Add a sticky bottom CTA bar on **only** the 2 commit-points: Feasibility ResultStep and 12WeekSetup ReviewStep. Mobile-only; show on `< sm` breakpoint. Buttons identical to the existing footer pair. | 📱 🎨 | 3-4 hr |
| **QW4** | Compress quality framing on SMART Review + 12WeekSetup Review: lead with "Bạn có thể tạo kế hoạch" + soft secondary "Đánh giá nhanh" (no large badge / score above the primary CTA). Score badge moves into a collapsed `<details>` "Xem chi tiết đánh giá". | ✍️ | 2-3 hr |
| **QW5** | Add a step pip to 12WeekSetup wizard (re-use SMART pattern from `CoreFlowProgress` or a per-wizard local pip). 4 dots, current state filled, click-to-jump optional. | 🧭 | 3-4 hr |
| **QW6** | Replace "Mục tiêu chưa rõ / Phiên bản rõ hơn" with neutral A/B framing in archetype examples. Update tests that match the old copy. | ✍️ | 1 hr |
| **QW7** | Add per-dimension icon to Plan Quality dimension rows (`✓` / `~` / `!`) so the status is not color-only. | ♿ 🎨 | 1-2 hr |
| **QW8** | Add a one-line "this takes ~20 minutes once" hint on Onboarding welcome step + a "Lưu nháp và đi tiếp lúc khác" reassurance. | ✍️ 🧭 | 1 hr |
| **QW9** | Demote "Crown" / Plus / paywall surfaces on the Today tab and the primary Dashboard hero. Move the upgrade CTA to a single place (Settings → Plan Access section), keep the paywall dialog flow but stop seeding the icon across the execution path. | 🎨 ✍️ | 2-3 hr |
| **QW10** | Persist `<details>` open/close state per `(step, panel-id)` in localStorage so re-entering the same step keeps the example panel open. | 🧭 | 2 hr |

Approximate total: **~20 engineering hours** for all 10 quick wins. None of them touch billing, sync, or core product logic.

---

## 12. Bigger Redesign Items — Not Yet

Things worth doing **after** the friendly-beta cohort answers the activation question, not before. These all carry rewrite-scope risk that the prompt explicitly rules out without data.

- **R1 — Dashboard hierarchy redesign.** Pick one primary "what to do today" anchor, demote everything else into a single "Trạng thái" expander. Affects `Dashboard.tsx` (1583+ lines), 7+ feature cards, and the public-visitor variants. Needs cohort feedback on which secondary cards actually drive return-visits. **Wait.**
- **R2 — Feasibility ResultStep redesign.** Currently ~700 lines in one file. The right answer is probably: a 1-screen summary card (result type + bottleneck label + primary CTA) + a "Chi tiết" toggle that reveals all the dense guidance. But this affects a screen that already passes its rubric, and changing it is a UX gamble without testers. **Wait.**
- **R3 — Inline lateral navigation** ("Edit my SMART goal from anywhere"). Currently a forward-only funnel. Adding lateral edit affects routing + storage + state-machine. Not needed for friendly-beta.
- **R4 — Visual density reduction** (orbs, tilt, magnetic). Picking one or two motion accents and dropping the rest is a brand-level decision, not a polish task. Survey testers first.
- **R5 — Copy tone overhaul.** "Coaching wallpaper" effect would be solved by a system-wide copy linter + a `CORE_COACHING_COPY_GUIDE.md` (referenced by the prompt but not in repo). Build the guide first, then sweep — not the other way around.
- **R6 — Tablet-specific layout.** The app is mobile-first + desktop-grid; iPad / 768-1024 sits awkwardly between. Worth fixing once we know the cohort actually uses tablets.
- **R7 — Dark mode polish.** CSS variables for dark mode exist but visual coherence on dark hasn't been tester-verified. Defer.

---

## 13. Top Issues Recap (10 Most Severe)

Pulled from §10 for the prompt's "top 10 nghiêm trọng nhất" requirement, ordered by impact:

1. **Dashboard signed-in: 5-7 parallel cards, no single primary action.** 🎨 🧭
2. **Feasibility ResultStep: densest screen, CTA below mobile fold.** 🎨 📱
3. **`CardTitle` is `<h4>` — heading outline skips `h3` everywhere.** ♿
4. **12WeekSetup wizard has no step pip — asymmetric with SMART.** 🧭
5. **Quality framing reads as grading; score shown before reassurance.** ✍️
6. **Page-shell `motion.div` ignores reduced-motion preference.** ♿
7. **Settings tab is a maintenance dashboard — too long for first-time testers.** 🎨 🧭
8. **Coaching panels (rationale + quality + insights + rescue) feel duplicative on the same screen.** ✍️ 🎨
9. **Plan-quality dimension scores differ only by color.** ♿
10. **Archetype examples frame the user's own draft as "chưa rõ" — implicit judgment.** ✍️

---

## 14. Prompt Order — What To Run Next

The next prompts are all small, scoped, doc-or-fix tasks. They are **not** redesign prompts. None requires touching billing, sync, or framework. Each one is small enough to run in a single session.

1. **QW1 — CardTitle heading semantic.** *Bạn là frontend engineer. Trong `src/app/components/ui/card.tsx` đổi `CardTitle` từ `<h4>` thành `<h3>`. Quét toàn bộ pages để tìm chỗ heading outline bị break (h2 → h4) và sửa thành (h2 → h3) khi card là sub-section của step heading. Thêm `core-funnel-a11y.test.tsx` assertion về heading outline không skip level. Không thêm dependency.*

2. **QW2 — Reduced-motion gate on page shells.** *Re-issue prompt #6 trong `CORE_QUALITY_V2_GO_NO_GO.md` §15: apply `useReducedMotion()` to page-shell `motion.div` ở 5 file core funnel; collapse animation thành fade when prefers-reduced-motion. Add unit test per shell.*

3. **QW3 — Mobile sticky CTA bar on commit-points.** *Bạn là frontend engineer. Thêm mobile-only sticky bottom bar (chỉ ở `<sm` breakpoint) cho 2 màn `FeasibilityCheck/components/ResultStep.tsx` và `12WeekSetup/components/ReviewStep.tsx`. Bar chứa primary CTA + back, không trùng với footer hiện có ở desktop. Test render-only.*

4. **QW4 — Demote quality framing.** *Bạn là UX writer + engineer. Trong SMART ReviewStep và 12WeekSetup ReviewStep, đặt thứ tự copy: (1) "Bạn có thể tạo kế hoạch", (2) primary CTA, (3) `<details>` "Xem đánh giá nhanh" chứa score + level + dimensions. Không xóa dữ liệu; chỉ thay đổi visual order.*

5. **QW5 — Step pip cho 12WeekSetup.** *Thêm step indicator (4 dots) cho 12WeekSetup. Có thể tái sử dụng pattern từ `CoreFlowProgress` hoặc tạo local pip. Click-to-jump optional, không bắt buộc.*

6. **QW6 — A/B framing trong archetype examples.** *Đổi label "Mục tiêu chưa rõ → Phiên bản rõ hơn" thành "Phiên bản A → Phiên bản B" (hoặc tương đương neutral) trong `goalExamples.ts` và `GoalArchetypeExamples.tsx`. Update test copy expectations.*

7. **QW7 — Icon-per-status cho Plan Quality dimensions.** *Thêm icon (`✓`/`~`/`!` hoặc tương đương Lucide) trước score `{X}/{Y}` cho mỗi dimension trong ReviewStep plan-quality card. Không đổi color scheme; chỉ thêm icon.*

8. **QW8 — "Mất bao lâu" hint trong Onboarding welcome.** *Thêm 1 dòng "Việc này mất ~20 phút lần đầu — bạn có thể lưu nháp và đi tiếp lúc khác" trong Onboarding step welcome. Không đổi flow.*

9. **QW9 — Demote Crown/Plus/paywall trên Today + Dashboard primary.** *Audit nơi Crown icon + Plus copy xuất hiện trên Today tab + Dashboard signed-in primary surface. Move sang Settings → Plan Access section. Không đổi paywall dialog logic, không đổi billing.*

10. **QW10 — Persist `<details>` state per panel.** *Thêm hook `useLocalDisclosureState(key)` lưu open/close của `<details>` panels (archetype examples, plan rationale, quality details) trong localStorage theo `(step, panel-id)`. Không nuốt user data; chỉ UI state.*

11. **R-prep — Copy guide.** *Tạo `guidelines/CORE_COACHING_COPY_GUIDE.md` với rules về tone, recurrence, framing, no-judgment language. Reference các canned-copy modules: `executionInsights.ts`, `planRationale.ts`, `goalExamples.ts`, `rescueMode.ts`. Không sửa copy chưa cần.*

12. **R-prep — Mobile viewport pass.** *Re-issue prompt #5 trong `CORE_QUALITY_V2_GO_NO_GO.md` §15: chạy mobile viewport (390×844) qua full funnel + 12WeekSystem Today/Week/Progress. Tạo `MOBILE_CORE_FUNNEL_REPORT.md` với issues annotated. Không sửa code.*

The first prompt to run after this audit is **QW1 — CardTitle heading semantic**, because it is the only `<h4>` issue blocking accessibility audit reports and it ripples deterministically.

---

## Limitations Of This Audit

- **No real-user observation.** Per `NEXT_STRATEGIC_BRANCH_DECISION.md`, the friendly-beta cohort hasn't started; this audit is design + code-side only. Issue ranking may shift after testers.
- **Two referenced guideline files do not exist** (`CORE_FUNNEL_GO_NO_GO.md`, `CORE_COACHING_COPY_GUIDE.md`); the audit drew from rubric / status / debt-register docs that do exist.
- **No browser screenshots** (no `agent-browser` MCP run in this session). Mobile findings are inferred from breakpoint classes + spacing in source, not from rendered captures.
- **Dashboard.tsx scanned at the symbol level** — not every conditional branch was traced. The "5-7 cards above the fold" claim is the dominant signed-in returning-user case; signed-out + first-time may differ.
- **Contrast claims are spot-check, not WCAG-formal.** A formal contrast pass against route tones (especially `system` blue, `vision` violet) is a candidate follow-up.
- **The audit does not propose any UX pattern that requires new components.** All quick wins reuse existing components (`Card`, `Button`, `<details>`, `Tabs`).

---

## Files Changed In This Task

| File | Action |
|---|---|
| `@C:\Users\admin\Downloads\Vision Board Web Platform\guidelines\UX_UI_QUALITY_AUDIT.md` | **New** — this document. |

No source code touched.
