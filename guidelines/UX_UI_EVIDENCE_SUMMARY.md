# UX/UI Evidence Summary

Last updated: 2026-05-04

---

## 1. Docs Reviewed

| Doc | Exists | Date |
| --- | ------ | ---- |
| `UX_UI_QUALITY_AUDIT.md` | Yes | 2026-05-03 |
| `UX_UI_DASHBOARD_AUDIT.md` | No | — |
| `UX_COPY_STYLE_GUIDE.md` | Yes | 2026-05-04 |
| `UX_UI_PERFORMANCE_NOTES.md` | Yes | 2026-05-04 |
| `CORE_QUALITY_V2_GO_NO_GO.md` | Yes | 2026-05-03 |
| `MVP_1_QA_REPORT.md` | Yes | 2026-04-30 |
| `MVP_1_POST_DEPLOY_SMOKE_REPORT.md` | Yes | 2026-04-30 |

---

## 2. Evidence by Area

### Dashboard Clarity

| Evidence | Source | Verdict |
| --- | --- | --- |
| Local smoke: signed-out CTA present, no forced `/login` | QA Report §6 | Pass local |
| Production: stale copy, signup-first instead of demo-first | Post-Deploy §5 | Fail prod |
| Too many cards competing with "what do today" | Quality Audit §2 | Identified risk |
| Hero card padding tightened for mobile | Session summary (PR #12) | Done |
| No dedicated Dashboard audit doc | — | **Gap** |

### SMART Wizard

| Evidence | Source | Verdict |
| --- | --- | --- |
| 8-dimension rubric shipped + 30 unit tests | V2 Go/No-Go §5 | Ready |
| 10 archetypes with deterministic classifier | V2 Go/No-Go §5 | Ready |
| QualityFeedbackPanel renders at Time-Bound step | V2 Go/No-Go §5 | Ready |
| Step indicator visible (chip row) | Session summary (PR #10) | Done |
| `whyThisMatters` coaching panel added | Session summary (PR #10) | Done |
| Real-user validation of weak/okay/strong labels | — | **None** |

### Feasibility Result

| Evidence | Source | Verdict |
| --- | --- | --- |
| Calibration formula locked, 8 test scenarios | V2 Go/No-Go §6 | Ready |
| Bottleneck + first-week guidance | V2 Go/No-Go §6 | Ready |
| Mobile sticky CTA added (`aria-hidden` pattern) | Session summary (PR #12) | Done |
| ResultStep dense (~700 lines layout), scroll fatigue | Quality Audit §4.2, V2 Go/No-Go §9 | Known risk |
| Thresholds not calibrated against real data | V2 Go/No-Go §6 | Known risk |

### 12WeekSetup

| Evidence | Source | Verdict |
| --- | --- | --- |
| ReviewStep restructured (sections, milestones grid, week-1 card) | Session summary (PR #10) | Done |
| Sticky CTA on last step (mobile) | Session summary (PR #10) | Done |
| Required-fields card visual hierarchy (border-2 + badge) | Session summary (PR #12) | Done |
| `goalArchetype` not piped to ReviewStep → archetype warnings dormant | V2 Go/No-Go §7, §11.4 | Known gap |
| Plan quality not persisted (re-runs each view) | V2 Go/No-Go §7 | Known gap |

### 12WeekSystem Today

| Evidence | Source | Verdict |
| --- | --- | --- |
| Primary hero renders + "Việc quan trọng nhất hôm nay" | V2 Go/No-Go §8 | Ready |
| Overdue inline actions (reschedule/skip) | V2 Go/No-Go §8 | Ready |
| "Đánh dấu xong" CTA added, size-lg | Session summary (PR #11) | Done |
| Rescue Mode: 5 triggers, 3-suggestion cap, no auto mutation | V2 Go/No-Go §8 | Ready |
| Task toggle persisted in localStorage | QA Report §6 | Pass |
| Daily check-in persisted | QA Report §6 | Pass |
| Visual QA screenshots captured (desktop + mobile + overdue) | `visual-ux-ui-qa.mjs` run | Done |

### Week / Review

| Evidence | Source | Verdict |
| --- | --- | --- |
| "Chốt review tuần này" wrapped in CTA card, size-lg | Session summary (PR #11) | Done |
| UniversalWeeklyReview v2 fields + summary card | V2 Go/No-Go §8 | Ready |
| NextWeekRecommendation card with accept/dismiss | V2 Go/No-Go §8 | Ready |
| Weekly review **not fully submitted** by smoke:mvp1 | QA Report §7.3 | Known gap |

### Progress

| Evidence | Source | Verdict |
| --- | --- | --- |
| `progress-trend-hero` renders + next-action narrative | V2 Go/No-Go §8 | Ready |
| Execution insights card (up to 3 prioritised) + 22 unit tests | V2 Go/No-Go §8 | Ready |
| Trend next-action promoted to own card, size-lg CTA | Session summary (PR #11) | Done |
| No analytics fanout for insights yet | V2 Go/No-Go §11.5 | Known gap |

### Mobile

| Evidence | Source | Verdict |
| --- | --- | --- |
| Sticky CTAs on commit-points (Feasibility, 12WeekSetup last step) | Session summary (PR #12) | Done |
| Hero badges hidden on <sm (3/5 badges) | Session summary (PR #12) | Done |
| Dashboard hero padding tightened (p-4 mobile) | Session summary (PR #12) | Done |
| Tab triggers min-h-12 touch targets | Session summary (PR #11) | Done |
| Tab helper text hidden on mobile (`hidden sm:block`) | Session summary (PR #11) | Done |
| visual-ux-ui-qa screenshots captured (mobile viewports) | Script run 2026-05-04 | Done |
| Scroll fatigue on long screens (Feasibility, Dashboard, Setup) | Quality Audit §4.2 | Known risk |

### Accessibility

| Evidence | Source | Verdict |
| --- | --- | --- |
| `aria-labelledby` / `role="alert"` / focus-on-step-transition | V2 Go/No-Go §9 | Ready |
| `core-funnel-a11y.test.tsx` — 7 tests | V2 Go/No-Go §9 | Pass |
| Form labels bound, icon-only controls have aria-label | V2 Go/No-Go §9 | Ready |
| `CardTitle` is `h4` (should be contextual) | Quality Audit §3, V2 Go/No-Go §9 | Known gap |
| `motion` does not respect reduced-motion on page shells | Quality Audit §3.2 | Known gap |

### Copy

| Evidence | Source | Verdict |
| --- | --- | --- |
| Copy style guide exists (tone, CTA, warning, empty state conventions) | UX_COPY_STYLE_GUIDE.md | Documented |
| Vietnamese locale throughout, no sáo rỗng, no phán xét | Style Guide §1 | Guideline |
| Production copy stale (signup-first) | Post-Deploy §5 | Fail prod |
| No copy density audit per-screen | — | **Gap** |

### Performance

| Evidence | Source | Verdict |
| --- | --- | --- |
| index chunk: 437 kB raw / 119 kB gzip (after LifeBalance lazy) | Performance Notes §7 | Measured |
| First-paint total ~356 kB gzip | Performance Notes §4 | Measured |
| 10/17 routes lazy-loaded | Performance Notes §9 | Partial |
| 6 eager pages remain + charts on eager path | Performance Notes §8 | Known risk |
| LifeBalance lazy-load verified (tsc + tests + build) | Performance Notes §7 | Done |

---

## 3. Evidence Gaps

| # | Gap | Impact | How to fill |
| --- | --- | --- | --- |
| 1 | **No real-user feedback synthesis** | Cannot validate rubric labels, copy tone, wizard UX land as intended | Run 5-15 tester sessions, create `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md` |
| 2 | **No Dashboard-specific audit** | Dashboard has most cards / most competition for attention, no structured review | Create `UX_UI_DASHBOARD_AUDIT.md` |
| 3 | **Production smoke still fails** | Cannot share URL publicly | Redeploy with `VITE_APP_MODE=demo`, rerun smoke |
| 4 | **smoke:core-quality not run in gate** | Semantic loop (seed → interact → persist) not verified at gate time | Run `npm run smoke:core-quality` against localhost |
| 5 | **visual:prod not run in gate** | No visual regression evidence against live URL | Run `npm run visual:prod` after production fix |
| 6 | **Weekly review not submitted by smoke** | Week/Review loop only partially verified | Extend `smoke:mvp1` or run `smoke:core-quality` (which does submit) |
| 7 | **Copy density audit missing** | Quality Audit flags density risk but no per-screen word/line counts | Audit per-screen, especially Feasibility ResultStep and Dashboard signed-in |
| 8 | **Thresholds not data-calibrated** | SMART/Feasibility/rescue/overload thresholds all heuristic | Instrument + collect from beta cohort |

---

## 4. Screens Needing Supplemental Audit

| Screen | Why |
| --- | --- |
| **Dashboard (signed-in)** | Most complex layout, no dedicated audit, most card competition |
| **Feasibility ResultStep** | 700+ lines layout, scroll fatigue flagged twice, sticky CTA added but density untouched |
| **12WeekSetup ReviewStep** | Restructured recently, archetype warnings dormant, plan quality not persisted |
| **Production signed-out Dashboard** | Stale copy, smoke fails |

---

## 5. Go/No-Go Assessment

### Enough evidence for friendly-beta (5-15 testers)?

**Conditional GO** — same verdict as `CORE_QUALITY_V2_GO_NO_GO.md`.

What's covered:
- Core funnel (SMART → Feasibility → Setup → System) is code-tested, smoke-tested locally, and visually screenshotted.
- Execution loop (Today task → check-in → weekly review → progress) is unit-tested and locally smoked.
- Mobile polish (sticky CTAs, touch targets, viewport captures) has evidence.
- Accessibility basics (focus, labels, alerts) have 7 dedicated tests.
- Copy conventions are documented.
- Performance is measured and improving.

What's NOT covered:
- **Production URL is broken** for signed-out visitors. Must fix before sharing.
- **Zero real-user evidence**. Rubrics and copy are validated by code, not humans.
- **Dashboard and Feasibility ResultStep** need dedicated audits (highest density, most cards).
- **6 eager pages** still inflate first-paint bundle (~356 kB gzip vs ~300 kB target).

### Verdict

> **GO for local-first friendly-beta with 3 blocking conditions:**
> 1. Fix production deploy (demo mode env).
> 2. Run `smoke:core-quality` at least once before inviting testers.
> 3. Prepare a feedback collection mechanism (even a simple form) before tester sessions.
>
> **NOT GO for broad public sharing** until production smoke passes and at least one tester session produces real feedback.
