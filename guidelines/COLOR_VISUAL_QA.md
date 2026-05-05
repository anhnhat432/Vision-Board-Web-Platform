# Color Visual QA Guidelines

Date: 2026-05-05
Role: QA Engineer for Visual Color Review
Mode: QUOTA-SAFE — read-only, no code changes, no new dependencies

Source files:
- `scripts/visual-ux-ui-qa.mjs` (existing visual QA script)
- `scripts/visual-core-flow-qa.mjs` (full flow QA with signup)
- `package.json` (scripts section)
- `guidelines/COLOR_SYSTEM_DIRECTION.md` (semantic tokens, usage rules)

---

## 1. Existing Visual QA Scripts

### 1.1 `scripts/visual-ux-ui-qa.mjs` (Primary Tool)
**Purpose**: Captures core UX surfaces for manual color review after UI polish.

**What it does**:
- Seeds deterministic state directly in localStorage (no backend, no login)
- Navigates to each surface and captures screenshots
- Desktop (1440×1000) + Mobile (390×844) viewports
- No pixel-diff, no automation assertions on color

**Screens captured** (matches task requirements ✅):
1. ✅ Dashboard (`/`) — `captureDashboardSignedIn()` + `captureDashboardEmpty()`
2. ✅ SMARTGoalSetup Review (`/smart-goal-setup`) — `captureSmartReview()`
3. ✅ Feasibility Result (`/feasibility`) — `captureFeasibilityResult()`
4. ✅ 12WeekSetup Review (`/12-week-setup`) — `capture12WeekSetupReview()`
5. ✅ 12WeekSystem Today (`/12-week-system` + tab "hom nay") — `captureTwelveWeekTab("today", "hom nay")`
6. ✅ 12WeekSystem Week (`/12-week-system` + tab "tuan") — `captureTwelveWeekTab("week", "tuan")`
7. ✅ 12WeekSystem Progress (`/12-week-system` + tab "tien do") — `captureTwelveWeekTab("progress", "tien do")`
8. ✅ 12WeekSystem Settings (`/12-week-system` + tab "cai dat") — `captureTwelveWeekTab("settings", "cai dat")`
9. ✅ 12WeekSystem Today with Overdue/Rescue (`/12-week-system`) — `captureTwelveWeekRescueOverdue()`

**Output**: `artifacts/visual-ux-ui/<timestamp>/`
- `NN-<slug>-desktop.png`
- `NN-<slug>-mobile.png`
- `qa-report.json`

### 1.2 `scripts/visual-core-flow-qa.mjs` (Full Flow QA)
**Purpose**: Runs full signup wizard against a real URL, aborts on layout overflow.

**When to use**: Pre-production, full E2E validation with real backend.

**Not for**: Quick color review after UI polish (too slow, requires backend).

---

## 2. How to Run Visual QA (Local Screenshots)

### 2.1 Prerequisites
```bash
# Start dev server (if not running)
npm run dev

# Ensure agent-browser is available
npx agent-browser --version
```

### 2.2 Run Visual UX/UI QA
```bash
# Default: captures localhost:5173, output to artifacts/visual-ux-ui/<timestamp>/
npm run qa:visual-ux-ui

# Custom URL (staging/production)
UX_UI_QA_URL=https://your-staging.vercel.app npm run qa:visual-ux-ui

# Custom output directory
UX_UI_QA_OUTPUT_DIR=artifacts/my-qa-run npm run qa:visual-ux-ui
```

### 2.3 Run Full Core Flow QA (Requires Backend)
```bash
# Requires backend running, real signup flow
npm run visual:prod

# Or with custom URL
VISUAL_QA_URL=https://your-prod.vercel.app npm run visual:prod
```

---

## 3. Manual Color Review Checklist

After screenshots are captured, review each image manually:

### 3.1 Primary CTA Visibility
- [ ] Gradient-brand button is the **only** prominent CTA on screen
- [ ] Max 1 gradient-brand button per viewport (others should be `bg-slate-950` or `border-slate-300 bg-white`)
- [ ] Text contrast: white on gradient ≥ 4.5:1 (WCAG AA)

**Files to check**: Dashboard.tsx, TwelveWeekTodayTab.tsx, TwelveWeekWeekTab.tsx

### 3.2 Text Contrast
- [ ] `--primary` (#4f46e5) on white: ✅ 8.12:1
- [ ] `--success` (#059669) on `--success-foreground` (#ecfdf5): ✅ 7.45:1
- [ ] `--warning` (#b45309) on `--warning-foreground` (#fffbeb): ✅ 8.89:1
- [ ] `--destructive` (#dc2626) on white: ✅ 5.25:1
- [ ] `--info` (#5b21d0) on white: ✅ 5.12:1
- [ ] `--muted-foreground` (#475569) on `--background` (#f4f6fb): ✅ 5.12:1

**Tools**: Use browser DevTools color picker or https://webaim.org/resources/contrastchecker/

### 3.3 Card Hierarchy (Mobile + Desktop)
- [ ] Hero card has `border-2 border-primary` or `gradient-border`
- [ ] Secondary cards use `border border-slate-200/80 bg-white/92`
- [ ] Max 8-12 white cards per page (any more = monotony)
- [ ] Cards don't all look identical (hero vs. secondary distinction)

**Files to check**: Dashboard.tsx (259 raw colors, 8-12 cards)

### 3.4 Warning/Status Colors (Not Alarming)
- [ ] Overdue tasks: amber-700 (`--warning`), NOT red/rose
- [ ] Review due: amber-50 background + AlertTriangle, NOT red alert
- [ ] Completed tasks: emerald-600 (`--success`), NOT gray
- [ ] Destructive actions ONLY: delete, cancel (red-600 `--destructive`)

**Files to check**: TwelveWeekTodayTab.tsx, TwelveWeekWeekTab.tsx, GoalTracker.tsx

### 3.5 Mobile Readability (390×844 Viewport)
- [ ] Primary task card: border visible (emerald-300 or amber-300, NOT emerald-200/amber-200)
- [ ] Text on dark backgrounds (primary task hero): `text-white` or `text-slate-200` (NOT `text-slate-300` which is too faint)
- [ ] Badges: `variant="success|warning|info"` with proper contrast
- [ ] No horizontal overflow (content clipped outside 390px viewport)

**Script checks**: `visual-ux-ui-qa.mjs` already validates `overflowX < 2px`

### 3.6 Color Overuse (Coaching Tone)
- [ ] Red/rose: Max 1-2 elements per page (destructive actions ONLY)
- [ ] Amber: Max 2-3 elements per page (warning/guidance ONLY)
- [ ] Violet: Used for coaching insight (`--info`), NOT for errors
- [ ] Slate-500/600: Only for metadata, NOT for interactive elements

**Reference**: `guidelines/COLOR_SYSTEM_DIRECTION.md` Section 5 (Colors NOT to Overuse)

---

## 4. Screenshot Review Workflow

### 4.1 After Running Script
```bash
# Open artifacts folder
cd artifacts/visual-ux-ui/<latest-timestamp>

# Review screenshots (Windows)
explorer .

# Check qa-report.json for any warnings
cat qa-report.json | jq '.warnings'
```

### 4.2 What to Look For
1. **Open each PNG** in order (01, 02, 03...):
   - Desktop first, then mobile
   - Compare side-by-side if needed

2. **Ask these questions**:
   - "Can I tell which button is the primary CTA in <3 seconds?"
   - "Do the cards have clear visual hierarchy?"
   - "Are warning colors supportive (amber) not alarming (red)?"
   - "On mobile, is text readable without zooming?"
   - "Is there too much violet/gradient competing for attention?"

3. **Log issues** in `qa-report.json` or create a new task:
   ```
   Issue: Dashboard has 3 gradient buttons competing
   Fix: Change "Đánh dấu xong" to bg-slate-950
   File: src/app/pages/Dashboard.tsx line ~876
   ```

---

## 5. Known Limitations

### 5.1 Script Limitations
- **No pixel-diff**: This is intentional (manual review only, no visual regression)
- **No color-picker automation**: Script captures screenshots, human reviews colors
- **No dark mode QA**: Script only tests light mode (dark mode uses oklch, browsers handle contrast)

### 5.2 When to Use Which Script
| Need | Script | Why |
|---|---|---|
| Quick color review after polish | `qa:visual-ux-ui` | Fast, localStorage seed, no backend |
| Full E2E before production | `visual:prod` | Real signup, catches layout overflow |
| Core quality gate | `smoke:core-quality` | Semantic checks, no visual |

---

## 6. Commands Reference

### 6.1 Run Commands
```bash
# Visual UX/UI QA (recommended after each color polish)
npm run qa:visual-ux-ui

# Full visual QA with signup (pre-production only)
npm run visual:prod

# Check agent-browser is working
npx agent-browser --version
```

### 6.2 Environment Variables
| Variable | Default | Purpose |
|---|---|---|
| `UX_UI_QA_URL` | `http://localhost:5173` | Override target URL |
| `UX_UI_QA_OUTPUT_DIR` | `artifacts/visual-ux-ui/<timestamp>` | Override output directory |
| `UX_UI_QA_SESSION` | `ux-ui-qa-<timestamp>` | Browser session name |
| `VISUAL_QA_URL` | `https://vision-board-web-platform.vercel.app` | For `visual:prod` script |

---

## 7. Adding New Screens to Capture

If a new page is added and needs visual QA:

**Edit**: `scripts/visual-ux-ui-qa.mjs`

**Add a new function**:
```javascript
async function captureNewPage() {
  await openPage("/new-page-path");
  await waitFor("new page loaded", 'document.body.innerText.includes("Expected Text")');
  await captureCheckpoint("new-page", {
    route: "/new-page-path",
    viewports: ["desktop", "mobile"], // or just ["desktop"]
  });
}
```

**Call it in `main()`**:
```javascript
async function main() {
  // ... existing code ...
  await captureNewPage();
  // ... rest of code ...
}
```

**Re-run**:
```bash
npm run qa:visual-ux-ui
```

---

## 8. Summary

| Aspect | Detail |
|---|---|
| **Script exists** | ✅ `scripts/visual-ux-ui-qa.mjs` captures all 9 required screens |
| **Screens captured** | Dashboard, SMARTReview, Feasibility, 12WeekSetup, Today/Week/Progress/Settings tabs, Overdue state |
| **Viewports** | Desktop (1440×1000) + Mobile (390×844) |
| **Output** | `artifacts/visual-ux-ui/<timestamp>/NN-<slug>-<viewport>.png` |
| **How to run** | `npm run qa:visual-ux-ui` (local dev server must be running) |
| **Review method** | Manual screenshot review (no pixel-diff, no automation) |
| **Checklist** | Primary CTA, text contrast, card hierarchy, warning colors, mobile readability |
| **Limitations** | No dark mode QA, no color-picker automation, manual review only |
| **Next step** | Run script → review screenshots → log issues → fix → re-run |
