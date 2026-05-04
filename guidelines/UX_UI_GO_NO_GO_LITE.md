# UX/UI Go/No-Go Lite

**Last updated:** 2026-05-04  
**Role:** Senior UX/Product Reviewer  
**Scope:** Evidence-only review (no source code, no tests executed)  
**Source docs:** UX_UI_EVIDENCE_SUMMARY.md, UX_COPY_STYLE_GUIDE.md, UX_UI_PERFORMANCE_NOTES.md, CORE_QUALITY_V2_GO_NO_GO.md, MVP_1_POST_DEPLOY_SMOKE_REPORT.md, UX_UI_DASHBOARD_MINI_AUDIT.md, UX_UI_VISUAL_QA.md

---

## 1. Decision

**GO WITH KNOWN LIMITATIONS — Friendly Beta (5–15 testers) ONLY.**

**NOT GO** for broad public sharing or paid promotion until:
1. Production demo-safe smoke passes
2. At least one round of real-user feedback completed
3. Browser smoke (`smoke:core-quality`) executed and passes

---

## 2. Evidence Used

| Doc | Status | Key Findings |
|-----|--------|--------------|
| `UX_UI_EVIDENCE_SUMMARY.md` | ✅ Complete | Gaps: no real-user feedback, no Dashboard audit, production smoke fail |
| `UX_COPY_STYLE_GUIDE.md` | ✅ Complete | Conventions documented (tone, CTA, warnings, empty state, Vietnamese mapping) |
| `UX_UI_PERFORMANCE_NOTES.md` | ✅ Complete | First-paint ~361 kB gzip; 6 eager pages remain; charts chunk 312 kB raw |
| `CORE_QUALITY_V2_GO_NO_GO.md` | ✅ Complete | Code-ready: SMART v2 (30 tests), Feasibility (8 scenarios), Execution (22 tests), a11y (7 tests) |
| `MVP_1_POST_DEPLOY_SMOKE_REPORT.md` | ✅ Complete | **FAIL** — production still signup-gated, not demo-safe |
| `UX_UI_DASHBOARD_MINI_AUDIT.md` | ✅ Complete | GO with awareness: card competition, scroll fatigue, attention panels noise |
| `UX_UI_VISUAL_QA.md` | ✅ Complete | Script exists, screenshots captured (desktop + mobile across funnel) |

---

## 3. Dashboard Readiness

**Status:** GO WITH AWARENESS (from Dashboard Mini Audit)

**Strengths:**
- All core information renders correctly (hero, tasks, stats, execution board)
- Mobile responsive (sticky CTA, touch targets, badge hiding)
- Rescue + review banners functional
- Data backup section visible

**Risks (not blockers for beta):**
- Too many cards competing for attention (8–12 cards on desktop)
- Scroll fatigue on mobile (6–8 viewport heights, no progressive disclosure)
- Badge row lacks context (no tooltips)
- Attention panels show even when steps completed (conditional logic gap)
- `DashboardLifeAreaRadar` loads charts chunk eagerly (~80 kB gzip)

---

## 4. SMART Goal Readiness

**Status:** CODE-READY, UNVALIDATED BY REAL USERS

**Strengths:**
- 8-dimension rubric shipped + 30 unit tests
- 10 archetypes with deterministic classifier
- `QualityFeedbackPanel` renders at Time-Bound step
- Step indicator visible (chip row)
- `whyThisMatters` coaching panel added

**Gaps:**
- No real-user validation of "weak/okay/strong" labels
- Rubric cannot detect semantic emptiness (verbose but meaningless goals)
- Outcome-verb heuristic may miss Vietnamese variants without diacritics
- No evidence users understand step-level disambiguation

---

## 5. Feasibility Readiness

**Status:** CODE-READY, THRESHOLDS UNCALIBRATED

**Strengths:**
- Calibration formula locked (`adjustedScore = max(0, round(diagnostic/28 * 20) - wheelPenalty)`)
- Bottleneck detection + first-week guidance ready
- Mobile sticky CTA added
- 8 test scenarios pass

**Gaps:**
- Thresholds (`<10`, `10-14`, `≥15`) not calibrated against real-user distributions
- Self-reported diagnostic may drift optimistic/pessimistic
- Wheel penalty is heuristic, not data-calibrated
- Quality bridge affects copy only, not score → potential mixed signals

---

## 6. 12WeekSetup Readiness

**Status:** MOSTLY READY, TWO GAPS

**Strengths:**
- `ReviewStep` restructured (sections, milestones grid, week-1 card)
- Sticky CTA on last step (mobile)
- Required-fields card visual hierarchy (border-2 + badge)

**Gaps:**
- `goalArchetype` not piped to `ReviewStep` → archetype warnings dormant
- Plan quality result not persisted (re-runs on each view)

---

## 7. 12WeekSystem Readiness

**Status:** CORE LOOP READY

**Strengths:**
- Today primary hero renders + "Việc quan trọng nhất hôm nay"
- Overdue inline actions (reschedule/skip) present
- Rescue Mode: 5 triggers, 3-suggestion cap, no auto mutation
- Weekly review summary card + next-week recommendation
- Progress trend hero + execution insights (up to 3 prioritised)
- Visual QA screenshots captured

**Gaps:**
- Weekly review **not fully submitted** by `smoke:mvp1` (partial verification)
- Execution insights not emitted to analytics yet (local-only)

---

## 8. Mobile Readiness

**Status:** BASICALLY READY, SCROLL FATIGUE REMAINS

**Done:**
- Sticky CTAs on commit-points (Feasibility result, Setup last step)
- Hero badges hidden on `<sm` (3/5 badges)
- Dashboard hero padding tightened (p-4 mobile)
- Tab triggers min-h-12 touch targets
- Tab helper text hidden on mobile (`hidden sm:block`)
- Visual QA screenshots captured (mobile viewports)

**Known risk:**
- Scroll fatigue on long screens (Feasibility ResultStep ~700 lines, Dashboard signed-in)

---

## 9. Accessibility Readiness

**Status:** MOSTLY READY, TWO GAPS

**Done:**
- `aria-labelledby`, `role="alert"`, focus-on-step-transition
- `core-funnel-a11y.test.tsx` — 7 tests pass
- Form labels bound; icon-only controls have `aria-label`
- Color-only status now prefixed with text + icon

**Gaps:**
- `CardTitle` primitive renders as `h4` (should be contextual heading)
- `motion` does not respect `prefers-reduced-motion` on page shells

---

## 10. Copy Readiness

**Status:** CONVENTIONS DOCUMENTED, PRODUCTION STALE

**Strengths:**
- Copy style guide exists (tone, CTA, warning, empty state, Vietnamese terminology mapping)
- Vietnamese locale throughout, no filler, no judgment
- Local/demo/cloud copy patterns documented

**Critical gap:**
- Production signed-out Dashboard shows **signup-first copy**, not demo-first (Post-Deploy Smoke §5)

---

## 11. Performance Readiness

**Status:** PARTIAL OPTIMIZATION DONE

**Current metrics:**
- First-paint total: ~361 kB gzip (target: <300 kB)
- `index` chunk: 437.36 kB raw / 119.33 kB gzip (after LifeBalance lazy-load)
- Lazy-loaded routes: 10/17
- Eager non-Dashboard pages: 6 remaining

**Done:**
- LifeBalance converted to `lazyRoute()` (−19.44 kB raw, −5.05 kB gzip)
- Charts split into separate chunk (312 kB raw / 80 kB gzip) but still eager on Dashboard

**Remaining quick wins:**
1. Lazy-load remaining 6 eager pages (est. −25–40 kB gzip)
2. Lazy-load `DashboardLifeAreaRadar` with IntersectionObserver (est. −80 kB gzip)
3. Audit `motion` usage on eager path (est. −42 kB gzip if removable)

---

## 12. Top Blockers

1. **Production demo-safe fail** — Signed-out visitors see signup-first copy, not demo-first (Post-Deploy Smoke FAIL). Must fix before public sharing.
2. **Zero real-user feedback** — No `CORE_FUNNEL_FEEDBACK_SYNTHESIS.md`. Rubric labels, copy tone, wizard UX not human-validated.
3. **Browser smoke not executed** — `smoke:core-quality` requires local dev + `agent-browser`; not run in this gate window.
4. **Weekly review not submitted** — `smoke:mvp1` does not complete Week/Review loop fully; `smoke:core-quality` would but wasn't run.
5. **Dashboard & Feasibility density** — ResultStep (~700 lines) and Dashboard (8–12 cards) need dedicated copy-density audit.
6. **Thresholds uncalibrated** — SMART bands, feasibility thresholds, wheel penalty, rescue severity all heuristic.
7. **Archetype wiring gap** — `goalArchetype` not passed to `PlanQualityInput` in `12WeekSetup.ReviewStep`.
8. **Analytics allowlist incomplete** — Execution insights, rescue triggers, archetype ID not emitted (local-only state).

---

## 13. Known Limitations

- **Local-first only** — All v2 behaviors live in localStorage. Data loss on browser clear.
- **No calibration loop** — Rubrics/thresholds are best-guess; tuning needs instrumented sessions.
- **Archetype classifier** — Substring keyword-based; accents/phrase variants may slip.
- **Semantic emptiness undetectable** — Verbose but meaningless goals still pass.
- **Insights canned copy** — No user text interpolation; can feel generic recurring.
- **Feasibility ResultStep density** — ~700-line component; small phones may scroll-fatigue.
- **No reduced-motion gate** — Page-shell `motion.div` ignores OS preference.
- **Production demo mode broken** — Must fix before sharing URL.

---

## 14. What Not to Promise Publicly

**DO NOT SAY or imply:**

- "Production-ready full-stack."
- "Cloud sync works seamlessly across devices."
- "Paid plans are available now." (Billing is mock/provider-contract.)
- "AI-powered coaching" — all v2 signals are deterministic, rule-based.
- "Calibrated to real users" — thresholds not data-calibrated.
- "Account migration / recovery / export is done."
- "All tasks sync back to server" — skipped/rescheduled flags local-only.
- "Weekly review drives changes automatically" — it surfaces a recommendation; acceptance still requires click.

---

## 15. Next 5 Quota-Safe Prompts

Ordered by dependency (earlier unblocks later):

### Prompt 1 — Create feedback synthesis scaffold
```
QUOTA-SAFE MODE. You are a product researcher.

Tạo file: guidelines/CORE_FUNNEL_FEEDBACK_SYNTHESIS.md với template rỗng:

- Session ID, tester persona
- SMART goal artifact (verbatim)
- Feasibility result (score + bottleneck)
- Plan state at day 3 / day 7 / day 14
- Moments of friction (quoted)
- Moments of delight (quoted)
- Copy that confused user (quoted)
- Post-session reflection

Đừng invent data — để sections trống cho intake thật.
```

### Prompt 2 — Run browser smoke locally
```
QUOTA-SAFE MODE. You are a QA engineer.

Chạy: npm run dev (port 5173), sau đó chạy: npm run smoke:core-quality

Môi trường: CORE_QUALITY_URL=http://127.0.0.1:5173

Lưu full output vào: artifacts/core-quality/{timestamp}/run.log

Report: Pass/fail per Quality Bar từ CORE_FUNNEL_QUALITY_AUDIT.md.

Không sửa source.
```

### Prompt 3 — Wire archetype into ReviewStep
```
QUOTA-SAFE MODE. You are a frontend engineer.

File: src/app/pages/12WeekSetup/components/ReviewStep.tsx

Nhiệm vụ: Thread `goalArchetype` từ feasibility/SMART context vào `PlanQualityInput` mà không đổi storage schema hay quality scoring.

Thêm regression test trong `planQuality.archetype.test.ts` assert archetype-fit warning hiển thị qua Review UI.

Không thay đổi copy, layout, hay dependencies.
```

### Prompt 4 — Analytics allowlist for insights + rescue
```
QUOTA-SAFE MODE. You are a analytics engineer.

Thêm bucket fields vào analytics allowlist (theo ANALYTICS_MVP.md):
- execution_insight_id
- rescue_trigger_id
- next_action_id
- goal_archetype

Giữ raw text block. Wire:
- TwelveWeekInsightsCard
- TwelveWeekRescueNudge

Để `trackAnalyticsEvent` chỉ emit các field id này (no user text).

Không thay đổi insight scoring hay trigger logic.
```

### Prompt 5 — Lazy-load remaining eager pages (perf)
```
QUOTA-SAFE MODE. You are a frontend performance engineer.

File: src/app/routes.tsx

Convert 6 pages còn lại sang lazyRoute():
- GoalTracker
- Achievements
- ReflectionJournal
- VisionBoardEditor
- VisionBoardGallery
- BillingPlan

Xóa 6 static imports tương ứng.

Sau khi sửa:
- npm run typecheck
- npm run build (chỉ báo cáo index chunk size)
- Không chạy full test suite.

Pattern: ...lazyRoute(() => import("./pages/X"), "X")
```

---

**End of Lite Report**

*Full details:* see `guidelines/CORE_QUALITY_V2_GO_NO_GO.md` and `guidelines/UX_UI_EVIDENCE_SUMMARY.md`
