# Life Insight To SMART Goal UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Life Insight into a clear decision step and show that selected decision in SMART Goal before the user starts writing.

**Architecture:** Reuse existing local-first data and `getSmartGoalStarter`. Keep all new UI in `LifeInsight.tsx` and `SmartGoalHero.tsx`; only pass starter context through `SMARTGoalSetup.tsx`.

**Tech Stack:** React 18, React Router, TypeScript, Tailwind, Testing Library, Vitest.

---

### Task 1: Life Insight Decision Card

**Files:**
- Modify: `src/app/pages/life-insight.e2e.test.tsx`
- Modify: `src/app/pages/LifeInsight.tsx`

- [ ] **Step 1: Write failing test**

Assert `data-testid="life-insight-decision-card"` appears with “Quyết định tiếp theo”, focus label, SMART starter preview, and CTA “Tạo SMART Goal từ quyết định này”.

- [ ] **Step 2: Run focused test**

Run: `npm run test:run -- src/app/pages/life-insight.e2e.test.tsx`

Expected: fail because the decision card and CTA copy do not exist.

- [ ] **Step 3: Implement decision card**

In `LifeInsight.tsx`, import `getSmartGoalStarter`, derive `smartGoalStarter`, add a first-viewport decision card, and change CTA copy to “Tạo SMART Goal từ quyết định này”.

- [ ] **Step 4: Verify focused test**

Run: `npm run test:run -- src/app/pages/life-insight.e2e.test.tsx`

Expected: pass.

- [ ] **Step 5: Commit**

Commit message: `style: clarify life insight decision step`.

### Task 2: SMART Goal Handoff Hero

**Files:**
- Create: `src/app/pages/smart-goal-handoff.test.tsx`
- Modify: `src/app/pages/SMARTGoalSetup.tsx`
- Modify: `src/app/pages/SMARTGoalSetup/components/SmartGoalHero.tsx`
- Modify: `src/app/pages/SMARTGoalSetup/components/SmartGoalStepShell.tsx`

- [ ] **Step 1: Write failing test**

Render SMART Goal with `APP_STORAGE_KEYS.selectedFocusArea = "Health"` and assert `data-testid="smart-goal-handoff-card"` contains “Life Insight đã chọn”, “Sức khỏe”, “Số buổi vận động mỗi tuần”, and “12 tuần”.

- [ ] **Step 2: Run focused test**

Run: `npm run test:run -- src/app/pages/smart-goal-handoff.test.tsx`

Expected: fail because the handoff card does not exist.

- [ ] **Step 3: Implement handoff card**

Pass `smartGoalStarter` into `SmartGoalHero`, render the handoff card, and fix the visible “Bu?c” typo to “Bước”.

- [ ] **Step 4: Verify focused test**

Run: `npm run test:run -- src/app/pages/smart-goal-handoff.test.tsx`

Expected: pass.

- [ ] **Step 5: Commit**

Commit message: `style: show smart goal handoff context`.

### Task 3: Verification And Push

**Files:**
- No production file changes expected.

- [ ] **Step 1: Run targeted tests**

Run: `npm run test:run -- src/app/pages/life-insight.e2e.test.tsx src/app/pages/life-insight-intent.test.tsx src/app/pages/smart-goal-handoff.test.tsx`

- [ ] **Step 2: Run broad check**

Run: `npm run check`

- [ ] **Step 3: Run MVP smoke**

Run `npm run smoke:mvp1` against a local dev server.

- [ ] **Step 4: Push**

Run: `git push`
