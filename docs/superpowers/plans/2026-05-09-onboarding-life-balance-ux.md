# Onboarding Life Balance UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the first two MVP flow steps so users understand the eight-area scoring task, see live scoring feedback, and get a clear save/continue handoff to Life Insight.

**Architecture:** Keep changes inside the existing route components. `Onboarding.tsx` owns welcome and assessment summary state; `LifeBalance.tsx` owns the decision summary and save/continue CTA. No localStorage shape, backend sync, billing, or route changes are introduced.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, Radix Slider, Vitest, Testing Library, Biome.

---

## File Structure

- Modify `src/app/pages/Onboarding.tsx`
  - Shorten welcome framing and CTA copy.
  - Track touched assessment areas in local component state.
  - Show live average, weakest, strongest, and reviewed-count summary.
- Modify `src/app/pages/Onboarding.test.tsx`
  - Add regression tests for first-step framing, returning-user copy, and live summary.
- Modify `src/app/pages/LifeBalance.tsx`
  - Reframe the next-step card as a signal summary.
  - Use `hasChanges` to switch the primary CTA between direct continue and save-then-continue.
  - Keep existing save-only action.
- Modify `src/app/pages/LifeBalance.test.tsx`
  - Add regression tests for in-memory summary updates and dynamic CTA copy.

---

### Task 1: Onboarding Live First-Step Summary

**Files:**
- Modify: `src/app/pages/Onboarding.test.tsx`
- Modify: `src/app/pages/Onboarding.tsx`

- [ ] **Step 1: Write failing Onboarding tests**

Add tests that assert the new onboarding behavior:

```tsx
it("frames onboarding as a short eight-area scoring step", async () => {
  render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
  );

  expect(await screen.findByText(/8 lĩnh vực/i)).toBeInTheDocument();
  expect(screen.getByText(/khoảng 3 phút/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Bắt đầu chấm 8 lĩnh vực/i })).toBeInTheDocument();
});

it("shows returning users that existing scores will be updated", async () => {
  const data = getUserData();
  data.onboardingCompleted = true;
  data.currentWheelOfLife = data.currentWheelOfLife.map((area, index) => ({
    ...area,
    score: index === 0 ? 8 : 6,
  }));
  saveUserData(data);

  render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
  );

  expect(await screen.findByText(/Cập nhật điểm hiện tại/i)).toBeInTheDocument();
  expect(screen.getByText(/không tạo lại từ đầu/i)).toBeInTheDocument();
});

it("shows live assessment summary and reviewed count", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
  );

  await user.click(await screen.findByRole("button", { name: /Bắt đầu chấm 8 lĩnh vực/i }));
  const summary = await screen.findByTestId("onboarding-assessment-summary");
  expect(summary).toHaveTextContent("0/8");

  const firstSlider = screen.getAllByRole("slider")[0];
  await user.tab();
  firstSlider.focus();
  await user.keyboard("{ArrowRight}");

  expect(summary).toHaveTextContent("1/8");
  expect(summary).toHaveTextContent(/Điểm trung bình/i);
  expect(summary).toHaveTextContent(/Ưu tiên/i);
});
```

- [ ] **Step 2: Run Onboarding tests to verify they fail**

Run:

```bash
npm run test:run -- src/app/pages/Onboarding.test.tsx
```

Expected: the new tests fail because the new CTA copy, returning copy, `onboarding-assessment-summary`, and reviewed-count UI do not exist yet.

- [ ] **Step 3: Implement Onboarding UI and local touched state**

Add local touched state and update the score handler:

```tsx
const [reviewedAreaIndices, setReviewedAreaIndices] = useState<Set<number>>(new Set());

const reviewedAreaCount = reviewedAreaIndices.size;
const remainingAreaCount = Math.max(0, lifeAreas.length - reviewedAreaCount);

const handleScoreChangeWrapped = useCallback((index: number, value: number[]) => {
  setLifeAreas((currentAreas) =>
    currentAreas.map((area, areaIndex) => (areaIndex === index ? { ...area, score: value[0] ?? 1 } : area)),
  );
  setReviewedAreaIndices((current) => {
    const next = new Set(current);
    next.add(index);
    return next;
  });
  setIsDirty(true);
}, []);
```

When existing real scores are loaded for a returning user, initialize all indices as reviewed:

```tsx
if (hasRealLifeBalance(data)) {
  setIsReturning(true);
  setLifeAreas(data.currentWheelOfLife);
  setReviewedAreaIndices(new Set(data.currentWheelOfLife.map((_, index) => index)));
}
```

Update welcome copy and CTA to explicitly mention eight areas and three minutes. Add the assessment summary with:

```tsx
<div data-testid="onboarding-assessment-summary">
  {/* Average, strongest, weakest, reviewedAreaCount/lifeAreas.length */}
</div>
```

Use existing computed `averageScore`, `strongestArea`, and `growthArea`. Do not persist `reviewedAreaIndices`.

- [ ] **Step 4: Run Onboarding tests to verify they pass**

Run:

```bash
npm run test:run -- src/app/pages/Onboarding.test.tsx
```

Expected: all Onboarding tests pass.

- [ ] **Step 5: Commit Onboarding task**

Run:

```bash
git add src/app/pages/Onboarding.tsx src/app/pages/Onboarding.test.tsx
git commit -m "style: clarify onboarding life balance start"
```

---

### Task 2: Life Balance Signal Summary and Dynamic CTA

**Files:**
- Modify: `src/app/pages/LifeBalance.test.tsx`
- Modify: `src/app/pages/LifeBalance.tsx`

- [ ] **Step 1: Write failing Life Balance tests**

Add tests that assert the decision summary responds to in-memory edits and the CTA copy changes:

```tsx
it("updates the signal summary from unsaved in-memory score edits", async () => {
  const user = userEvent.setup();
  seedRealLifeBalance();
  renderLifeBalance();

  const summary = await screen.findByTestId("life-balance-signal-summary");
  expect(summary).toHaveTextContent(/Tín hiệu/i);

  const firstSlider = screen.getAllByRole("slider")[0];
  firstSlider.focus();
  await user.keyboard("{Home}");

  expect(screen.getByTestId("life-balance-signal-weakest")).toHaveTextContent("1/10");
  expect(screen.getByRole("button", { name: /Lưu và xem Life Insight/i })).toBeInTheDocument();
});

it("saves edited scores before opening Life Insight from the primary CTA", async () => {
  const user = userEvent.setup();
  seedRealLifeBalance();
  const { router } = renderLifeBalance();

  const firstSlider = await screen.findAllByRole("slider");
  firstSlider[0].focus();
  await user.keyboard("{Home}");

  await user.click(screen.getByRole("button", { name: /Lưu và xem Life Insight/i }));

  expect(router.state.location.pathname).toBe("/life-insight");
  expect(getUserData().currentWheelOfLife[0]?.score).toBe(1);
});
```

- [ ] **Step 2: Run Life Balance tests to verify they fail**

Run:

```bash
npm run test:run -- src/app/pages/LifeBalance.test.tsx
```

Expected: the new tests fail because `life-balance-signal-summary`, `life-balance-signal-weakest`, and the dynamic CTA copy do not exist yet.

- [ ] **Step 3: Implement Life Balance signal summary**

Update the existing `life-balance-next-step-card` so it remains compatible with older tests and becomes the prominent signal summary:

```tsx
<Card data-testid="life-balance-next-step-card">
  <CardContent>
    <div data-testid="life-balance-signal-summary">
      <p>Tiếp theo trong luồng chính</p>
      <h2>Tín hiệu từ Life Balance: ưu tiên {getLifeAreaLabel(weakestArea.name)}</h2>
      <div data-testid="life-balance-signal-weakest">{getLifeAreaLabel(weakestArea.name)} {weakestArea.score}/10</div>
      <div>Điểm trung bình {averageScore.toFixed(1)}/10</div>
      <div>Điểm mạnh {getLifeAreaLabel(strongestArea.name)} {strongestArea.score}/10</div>
      <Button onClick={handleContinueToInsight}>
        {hasChanges ? "Lưu và xem Life Insight" : "Mở Life Insight"}
      </Button>
      {hasChanges ? <Button onClick={handleSave}>Chỉ lưu điểm</Button> : null}
    </div>
  </CardContent>
</Card>
```

Keep `handleContinueToInsight` unchanged except for copy and card placement. It already saves locally before navigating when `hasChanges` is true.

- [ ] **Step 4: Run Life Balance tests to verify they pass**

Run:

```bash
npm run test:run -- src/app/pages/LifeBalance.test.tsx
```

Expected: all Life Balance tests pass.

- [ ] **Step 5: Commit Life Balance task**

Run:

```bash
git add src/app/pages/LifeBalance.tsx src/app/pages/LifeBalance.test.tsx
git commit -m "style: surface life balance signal handoff"
```

---

### Task 3: Final Verification

**Files:**
- Verify only; no planned source edits.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm run test:run -- src/app/pages/Onboarding.test.tsx src/app/pages/LifeBalance.test.tsx
```

Expected: both test files pass.

- [ ] **Step 2: Run full frontend check**

Run:

```bash
npm run check
```

Expected: typecheck, lint, test suite, and production build pass. Existing Vite chunk warnings may still appear and are not introduced by this work.

- [ ] **Step 3: Run MVP1 smoke**

Run a local dev server, then:

```bash
npm run smoke:mvp1
```

Expected: local-first MVP1 smoke passes.

- [ ] **Step 4: Push branch**

Run:

```bash
git status -sb
git push -u origin codex/onboarding-life-balance-ux
```

Expected: branch pushes cleanly with no uncommitted changes.

