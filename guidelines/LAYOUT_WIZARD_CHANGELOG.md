# Wizard Layout Changelog

Date: 2026-05-06  
Engineer: Senior UX/Frontend Engineer  
Scope: Standardize SMARTGoalSetup and FeasibilityCheck layouts

---

## Plugin Review

**Plugin**: `frontend-design@claude-plugins-official`  
**Capability**: Creation tool — **cannot audit existing layouts**  
**Verdict**: Plugin declined. Manual review following LAYOUT_SYSTEM_GUIDE.md.

---

## Current State Analysis

### SMARTGoalSetup

**Structure** (SmartGoalStepShell):
```
flow-muted panel (eyebrow + h2 + description + coaching)
├── Form fields (5 steps)
├── Clarity progress card (8 dimensions, always visible)
├── Archetype hint card ("Gợi ý điền nhanh")
├── ReviewStep (if showReview)
├── QualityFeedbackPanel (if qualityFeedback)
├── Alerts (error/warning)
└── Sticky CTA footer
```

**Issues**:
- Clarity panel (8 items) chiếm ~30% vertical space, luôn hiển thị
- Archetype hint luôn hiển thị, thêm clutter
- Multiple panels stacked → long scroll on mobile
- Step indicator: CoreFlowProgress bên ngoài Shell (không unified)

**Strengths**:
- Sticky CTA footer ✅
- Scroll to top on step change ✅
- Clear heading hierarchy ✅

---

### FeasibilityCheck

**Structure**:
```
CoreFlowProgress (step pip)
├── FeasibilityStepShell (Card)
│   ├── CardHeader (h2 + description)
│   ├── RadioGroup (7 questions vertical)
│   └── Sticky CTA footer
└── ResultStep (separate component after finish)
    ├── Readiness badge (✅/⚠️/❌)
    ├── Score bar
    ├── Bottleneck card
    ├── First-week guidance
    └── CTA to 12WeekSetup
```

**Issues**:
- 7 questions liên tục → mobile scroll fatigue
- ResultStep dài ~700 lines — quá nhiều info trên mobile
- Không có secondary hints (có thể không cần)
- Step indicator: CoreFlowProgress bên ngoài Shell — OK

**Strengths**:
- RadioGroup rõ ràng ✅
- Result summary chi tiết ✅

---

## Standardized Wizard Rhythm

### Common Pattern (All Wizards)

```
PageShell (max-w-4xl)
├── StepHeader (unified)
│   ├── Step pip (4-7 dots)
│   ├── Eyebrow (Bước X/Y)
│   ├── Title (h2)
│   └── Description
├── StepContent (Card)
│   ├── Form fields / Questions (space-y-6)
│   ├── SecondaryPanel (hints, collapsible)
│   └── Footer (CTA sticky mobile)
└── Progress bar (optional, in header)
```

**Consistency Rules**:
1. **StepHeader** — PageHeader + step pip (unified component)
2. **StepContent** — Card với padding nhất quán (px-5 sm:px-7)
3. **SecondaryPanel** — hints, tips, quality progress (collapsible)
4. **Sticky CTA footer** — identical across all wizards
5. **Spacing** — `space-y-6` giữa major sections, `gap-4` giữa form fields

---

## SMARTGoalSetup Adjustments

### Changes Needed

| Issue | Fix | Effort |
|-------|-----|--------|
| Clarity panel luôn hiển thị | Collapse sau khi 8/8 strong | Low |
| Archetype hint luôn hiển thị | Move to SecondaryPanel, collapsible | Low |
| Multiple panels stacked | Group with SectionBlock + dividers | Medium |
| Step indicator inconsistency | Use same pattern as Feasibility (CoreFlowProgress outside) | Already OK |

### Proposed Order

```tsx
<SmartGoalStepShell>
  ├── StepHeader ( eyebrow + h2 + description )
  ├── Form fields (Specific, Measurable, Achievable, Relevant, Time-Bound)
  ├── SecondaryPanel "Clarity progress" (collapsible, defaultOpen=true)
  │   └── Progress bar + 8 dimension buttons
  ├── SecondaryPanel "Gợi ý điền nhanh" (collapsible, defaultOpen=false)
  │   └── Archetype hint + "Dùng gợi ý" button
  ├── ReviewStep (if showReview)
  │   └── SummaryGrid + quality indicators
  ├── QualityFeedbackPanel (if qualityFeedback)
  │   └── Alerts (success/warning)
  ├── Alert (error/warning nếu có)
  └── Sticky CTA footer (Back | Next/Tạo mục tiêu)
```

**Collapse logic**:
- Clarity panel: `collapsible`, `defaultOpen={clarityDoneCount < 8}`
- Archetype hint: `collapsible`, `defaultOpen=false`

---

## FeasibilityCheck Adjustments

### Changes Needed

| Issue | Fix | Effort |
|-------|-----|--------|
| 7 questions liên tục → fatigue | Show 1 question per step (wizard style) | High |
| OR: collapse answered questions | Keep all 7 but collapse after answered | Medium |
| ResultStep quá dài | Restructure với SecondaryPanel, collapsible details | Medium |
| Step indicator | Already OK (CoreFlowProgress) | — |

### Option A: One Question Per Step (Recommended)

**Current**: 7 questions + result = 8 steps
**New**: 7 steps (mỗi step 1 question) + ResultStep = 8 steps

Benefits:
- Mobile: mỗi step là 1 viewport, không scroll fatigue
- Focus: user chỉ thấy 1 question tại một thời điểm
- Consistent với SMART (mỗi step 1 form section)

Implementation:
- Split QUESTIONS array thành từng step riêng
- FeasibilityStepShell renders current question only
- Next button disabled until question answered
- Progress bar updates per question

---

### Option B: Collapse Answered Questions

Giữ nguyên layout, nhưng:
- Questions started collapsed (show first expanded)
- Answered questions collapse automatically
- Summary at top: "3/7 answered"

Less ideal nhưng easier migration.

---

### ResultStep Restructure

**Current**: ~700 lines, all expanded

**Proposed**:
```tsx
<ResultStep>
  <Card className="hero-surface border-2 border-primary">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Badge variant={readinessBadge}>✅ Khả thi</Badge>
        <h2>Kết quả kiểm tra tính khả thi</h2>
      </div>
      <CardDescription>
        Mục tiêu của bạn đạt {score}/20 điểm.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* 1. Score bar */}
      <Progress value={scorePercent} className="h-3" />

      {/* 2. Bottleneck (nếu có) */}
      {bottleneck && (
        <SecondaryPanel
          icon={<AlertTriangle className="text-amber-600" />}
          title="Điểm yếu cần lưu ý"
          collapsible
          defaultOpen={true}
        >
          <p>{bottleneck.description}</p>
          <p className="mt-2 text-sm text-slate-600">{bottleneck.action}</p>
        </SecondaryPanel>
      )}

      {/* 3. First-week guidance */}
      <SecondaryPanel
        icon={<Lightbulb className="text-violet-500" />}
        title="Gợi ý tuần 1"
        collapsible
        defaultOpen={false}
      >
        <p>{firstWeekGuidance}</p>
      </SecondaryPanel>

      {/* 4. CTA */}
      <div className="flex justify-end">
        <Button className="gradient-brand" onClick={handleContinue}>
          Vào kế hoạch 12 tuần
        </Button>
      </div>
    </CardContent>
  </Card>
</ResultStep>
```

---

## Step Shell Unification Status

**Decision**: **Defer full unification**. Các wizard có semantic differences:

| Wizard | Unique Needs |
|--------|--------------|
| SMART | Quality feedback, clarity progress, archetype hints |
| Feasibility | Questions list OR single-question flow, readiness result |
| 12WeekSetup | Plan preview, milestone configuration |

**Instead**: Standardize **patterns**:
- Sticky CTA footer (identical implementation)
- Spacing (`space-y-6`)
- Heading hierarchy (h2 outside, h3 inside)
- SecondaryPanel for collapsible hints
- Alert variants (success/warning/info)

---

## Migration Plan

### Phase 1: SMARTGoalSetup (Low Risk)

1. Collapse clarity panel when `clarityDoneCount === 8`
2. Move archetype hint to SecondaryPanel, `defaultOpen={false}`
3. Add dividers (`<hr className="border-slate-200" />`) giữa sections
4. Verify sticky CTA không bị che

**Expected**: Mobile scroll giảm 1-2 viewport heights

---

### Phase 2: FeasibilityCheck (Medium Risk)

**Option A (preferred)**: Refactor to one-question-per-step
- Split QUESTIONS thành 7 step definitions
- Update FeasibilityStepShell để render single question
- Add step pip (nếu chưa có — kiểm tra lại)
- Update ResultStep với SecondaryPanel structure

**Option B**: Collapse answered questions
- Add state tracked per question (answered/collapsed)
- Summary bar at top: "3/7 answered"
- Keep ResultStep simple

---

### Phase 3: Consistency Check

- [ ] Both wizards use same CTA button styles
- [ ] Both have sticky footer on mobile (`sticky bottom-0 bg-white/95`)
- [ ] Both use `space-y-6` between major sections
- [ ] Both collapse secondary hints by default on mobile
- [ ] Both have accessible step pips (CoreFlowProgress)
- [ ] Form validation messages consistent (Alert variant="warning")

---

## Files to Change

| File | Change | Phase |
|------|--------|-------|
| `SMARTGoalSetup.tsx` | Collapse clarity + move archetype hint | 1 |
| `SmartGoalStepShell.tsx` | Add collapsible props, adjust spacing | 1 |
| `FeasibilityCheck.tsx` | Refactor questions flow | 2 |
| `FeasibilityStepShell.tsx` | Single question OR collapse logic | 2 |
| `ResultStep.tsx` | Restructure với SecondaryPanel | 2 |
| `guidelines/LAYOUT_WIZARD_CHANGELOG.md` | This doc | All |

---

## Acceptance Criteria

- ✅ SMART và Feasibility có cùng visual rhythm
- ✅ CTA back/next nhất quán (sticky mobile, same button styles)
- ✅ Mobile scroll depth: mỗi step ≤ 3 viewport heights
- ✅ Secondary hints (clarity, archetype, bottleneck) collapsible
- ✅ Step indicator rõ ràng (CoreFlowProgress)
- ✅ Tests pass (Vitest + e2e)

---

## Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Feasibility refactor breaks navigation | Medium | Keep step state management identical, only UI changes |
| Tests fail due to selector changes | Medium | Update test IDs, preserve `data-testid` attributes |
| Mobile overflow after adding panels | Low | Test on 375px, adjust `space-y` values |
| QualityFeedbackPanel visual drift | Low | Use Alert variants (DS-1 from DESIGN_SYSTEM_INVENTORY) |
| User confusion from layout change | Low | Keep copy identical, only structure changes |

---

## Next Prompt (Phase 1 — SMART)

```
Bạn là wizard UX architect.

Nhiệm vụ: Collapse secondary panels trong SMARTGoalSetup.

1. Trong SmartGoalStepShell:
   - Clarity panel: collapse khi clarityDoneCount === 8, dùng useState + "Thu gọn"/"Xem thêm"
   - Archetype hint: chuyển sang <SecondaryPanel collapsible defaultOpen={false}>

2. Thêm divider (border-b) giữa Clarity, Archetype, ReviewStep, QualityFeedbackPanel.

3. Giữ nguyên CTA sticky footer.

4. Chạy: npm run typecheck && npm run test:run (SMART tests)

Không đổi business logic, không đổi copy.
```

---

## Next Prompt (Phase 2 — Feasibility)

```
Bạn là wizard UX architect.

Nhiệm vụ: Refactor FeasibilityCheck to one-question-per-step (Option A).

1. Tạo FEASIBILITY_STEPS constant với 7 step objects (question + step label).
2. Sửa FeasibilityStepShell render CHỈ current question, không list 7.
3. Đảm bảo Next button disabled cho đến khi question được answer.
4. Giữ CoreFlowProgress outside (already there).
5. Restructure ResultStep với SecondaryPanel (bottleneck, guidance).

6. Chạy: npm run typecheck && npm run test:run (Feasibility tests)

Không đổi scoring logic, không đổi validation.
```

---

*End of Wizard Layout Changelog*
