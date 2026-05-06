# Prompts để hoàn thiện Vision Board Web Platform MVP

Tài liệu này chứa các prompt cho Claude AI để hoàn thiện dự án Vision Board Web Platform theo MVP 1 scope.

## Quick Start Instructions

Khi sử dụng Claude Code với dự án này:
1. Luôn đọc `CLAUDE.md` và `AGENTS.md` trước khi bắt đầu
2. Tuân thủ rules về local-first, demo mode, và storage compatibility
3. Chạy verification commands phù hợp sau mỗi thay đổi
4. Không giới thiệu dependencies mới trừ khi thực sự cần thiết

---

## PRIORITY P0: Critical UX Fixes (Top 10 Risks)

### Prompt 1: Fix Fresh Signed-Out Dashboard Confusion

**Context**: Visitors may see sample/private-looking goals and assume the app is leaking data.

**Task**: Review and fix the dashboard landing state for signed-out users.

**Prompt for Claude**:
```
Read src/app/pages/Dashboard.tsx and src/app/utils/storage.ts. The dashboard shows sample/demo goals to signed-out users which can look like real user data leakage.

Required changes:
1. Ensure fresh signed-out state shows either:
   - Clean empty state with clear CTA to start
   - OR clearly labeled "Sample/Example" goals
   - OR focus entirely on the onboarding CTA
2. Do NOT show private-looking goals without clear demo labeling
3. Preserve returning demo user's local data when they come back
4. Match the UX pattern in MVP_1_SCOPE.md section 9 (Manual QA path step 2)

After changes:
- npm run typecheck
- npm run lint
- npm run build
- Verify in browser: open incognito, confirm clean state
```

---

### Prompt 2: Fix Mobile Scroll Position During Transitions

**Context**: Onboarding/setup steps can start mid-screen, forcing users to scroll up.

**Task**: Ensure every route/wizard step starts at the top of the viewport.

**Prompt for Claude**:
```
The core issue: navigating between steps in onboarding and 12-week setup doesn't reset scroll position. On mobile this is especially problematic.

Check these locations:
- src/app/pages/Onboarding.tsx (or LifeBalance, LifeInsight, SmartGoal, FeasibilityCheck)
- src/app/pages/12WeekSetup.tsx
- src/features/plan12week/components/SetupWizard.tsx (if exists)

Required fix pattern:
1. After each navigation/step change, call window.scrollTo(0, 0) or use a scroll reset effect
2. For React Router, consider a layout component that resets scroll on route change
3. For wizard steps, reset scroll when step index changes
4. Test on mobile viewport (375px width) - each new step should start at top

Implementation options:
- Create useScrollResetOnRouteChange hook
- OR add useEffect in each page component: useEffect(() => { window.scrollTo(0, 0); }, []);
- OR use React Router's NavigationType and block scroll restoration if misconfigured

After changes:
- npm run typecheck
- Manually test: go through onboarding flow on mobile viewport
- Verify every step starts at top
```

---

### Prompt 3: Simplify Crowded 12-Week System Layout

**Context**: The 12-week system with Today/Week/Progress/Settings tabs can feel overwhelming, especially on desktop.

**Task**: Redesign the 12-week system to prioritize "What do I do today?" above diagnostics.

**Prompt for Claude**:
```
Read src/app/pages/TwelveWeekSystem.tsx and src/features/plan12week/components/.

Current problem: All 4 tabs are visible at once, creating visual clutter. Users should immediately understand what to do TODAY.

Required redesign:
1. Default view: Today tab only visible upon entry
2. Make Today tab the primary focus:
   - Larger "Complete Daily Check-in" button
   - Today's tasks clearly listed with toggle
   - Show "Next task" prominently if none are due today
3. Secondary tabs (Week, Progress, Settings) should be:
   - Either in a collapsible sidebar on desktop
   - Or accessible via a simpler menu (hamburger or icon row)
   - Less visual weight than Today
4. On mobile: Today takes full width, other tabs in bottom nav or dropdown
5. Remove any duplicate information panels

Consider:
- Use a layout where Today is the main panel
- Week review is a separate page accessible from Today
- Progress is a simple summary card, not a full tab
- Settings moved to user menu or separate page

After redesign:
- npm run typecheck
- npm run build
- Test on both desktop and mobile
- Core flow: land on /12-week-system → immediately see what to do today
```

---

### Prompt 4: Replace Heavy Terminology with Plain Language

**Context**: Terms like "lag metric", "lead indicator", "tactic load" confuse non-technical users.

**Task**: Audit user-facing text and simplify jargon while keeping internal code names intact.

**Prompt for Claude**:
```
Search for technical/business jargon in user-facing components:

Check these files:
- src/features/plan12week/pages/12WeekSetup.tsx (tactic load, lead/lag metrics)
- src/features/plan12week/components/PlanPreview.tsx
- src/lib/feasibility/ (scoring UI text)
- src/features/dashboard/components/

Required changes:
1. Replace in UI labels and help text:
   - "Lead metric" → "Progress measure" or "Weekly target"
   - "Lag metric" → "Goal outcome" or "End result"
   - "Tactic load" → "Weekly effort" or "Task count"
   - "Feasibility score" → "Plan confidence" or "Realistic rating"
   - "Entitlement" → "Plan features" or "Access" (in user-facing billing UI)
   - "Outbox" → "Sync queue" (if shown to users)

2. Keep internal variable names, types, and code comments technical as needed
3. Update any tooltips, helper text, and copy blocks
4. Ensure clarity: if a term is necessary, add a simple explanation inline

After changes:
- npm run typecheck
- npm run lint (check for any new console.log or debug text)
- Review each changed component in browser
```

---

### Prompt 5: Fix Mock Checkout Trust Problem

**Context**: Visitors may think they're being charged or that payment is production-ready.

**Task**: Make mock checkout obviously simulated while still demonstrating upgrade flow.

**Prompt for Claude**:
```
Check billing/mock checkout files:
- src/app/pages/MockCheckout.tsx
- src/app/utils/production.ts (billing provider)
- Any paywall/dialog components

Required changes:
1. Add clear visual indicators that this is DEMO/ SIMULATION:
   - Banner at top: "This is a demo checkout - no real charge"
   - Use distinct styling (different background color, border)
   - Replace payment form fields with read-only mock values
   - Show "Simulating payment provider..." during "processing"
2. Change button text:
   - "Pay Now" → "Simulate Upgrade" or "Continue (Demo)"
   - Remove any "Secure payment" badges or real payment icons
3. After "checkout":
   - Show confirmation: "Demo upgrade complete! You now have Plus access in this demo."
   - Clearly state: "No real payment was processed"
4. In pricing page/upgrade UI:
   - Label the mock provider: "Demo Provider" (not Stripe/PayPal)
   - Add small text: "Public demo - upgrade unlocks features locally"

Keep the flow smooth: user should understand this shows how upgrade works without thinking they paid real money.

After changes:
- npm run typecheck
- npm run build
- Manual test: go through mock checkout, confirm it's clearly demo
```

---

### Prompt 6: Clarify LocalStorage Data Persistence

**Context**: Users may expect cloud sync in a web app but data is device-specific.

**Task**: Add clear indicators about local storage where relevant.

**Prompt for Claude**:
```
Identify locations where storage/persistence should be explained:

Check these areas:
- Settings page (data management section)
- Dashboard when showing existing plan
- Any "Export" or "Backup" features
- Login page explanation of demo vs. real mode
- Footer or help section

Required additions:
1. Create a DataStorageInfo component with:
   - "Your data is stored locally in this browser"
   - "Switching devices or clearing browser data will lose progress"
   - Optional: "Login to sync across devices (when available)"
2. Add to Settings page a "Data & Privacy" section explaining:
   - Where data lives
   - How to export/backup
   - How to delete local data
3. On dashboard when a plan exists:
   - Subtle text: "Your 12-week plan is saved in this browser"
4. Consider a one-time banner for new users after first plan save:
   - "Your plan is saved locally. [Learn more]"

DO NOT create actual cloud sync - just clarify the current limitation clearly.

After changes:
- npm run typecheck
- Verify clarity: a first-time visitor should understand local-only storage
```

---

### Prompt 7: Ensure Demo Mode Hides Backend/Auth Noise

**Context**: Real-mode guards or failed API calls could interrupt demo flow.

**Task**: Verify demo mode doesn't call protected backend paths and doesn't require Firebase.

**Prompt for Claude**:
```
Review API client and auth integration:

Check files:
- src/lib/api/apiClient.ts
- src/app/utils/app-mode.ts
- src/features/plan12week/hooks/usePlanSetupSync.ts
- src/features/plan12week/hooks/usePlanExecutionSync.ts

Required verification:
1. In demo mode (VITE_APP_MODE=demo):
   - API client should NOT make calls to protected backend endpoints
   - Firebase auth should be disabled/not initialized
   - Login page should show "Firebase not configured" or demo notice
   - All sync hooks should short-circuit and skip backend sync
   - No console errors about missing Firebase config

2. Search for any conditional checks like:
   if (appMode === 'demo') { /* skip backend */ }
   Verify these are complete and cover all sync paths

3. Check that demo mode defaults are in .env.production

If issues found:
- Add missing guards before backend sync calls
- Ensure localStorage saves always succeed regardless of backend
- Make sure error boundaries catch sync failures without disrupting UX

After verification/fixes:
- npm run typecheck
- npm run build
- Run with VITE_APP_MODE=demo and confirm NO backend calls in network tab
- Confirm no Firebase initialization errors in console
```

---

### Prompt 8: Ensure Weekly Review Remains Free (Not Blocked by Premium)

**Context**: Monetization shouldn't block the core weekly review loop.

**Task**: Audit weekly review flow and remove any paywall gates from free path.

**Prompt for Claude**:
```
Check the weekly review implementation:

Files to review:
- src/features/plan12week/pages/WeeklyReview.tsx (or WeekTab component)
- src/features/plan12week/components/ReviewForm.tsx
- Any premium teaser components in the week flow

Required checks:
1. Free user must be able to:
   - Open Week tab
   - See weekly reflection prompts
   - Save a weekly review
   - Create reflection entry from review
   - Mark week as complete

2. Premium features in weekly review can include:
   - Advanced insights/analytics
   - Template library (but basic review must be free)
   - AI-powered suggestions
   - But NOT the ability to save the review itself

3. If there's a "Unlock Plus" button in the week flow:
   - It should enhance, not block
   - Basic review form should be fully functional without upgrade

4. Check billing/entitlement helpers:
   - Are there conditional renders that hide review UI for non-Plus?
   - Move those to optional premium sections only

After audit:
- npm run typecheck
- Manual test: create plan, go to Week tab as free user, complete review
- Confirm no upgrade prompts block the Save button
```

---

### Prompt 9: Improve Generated Plan Quality

**Context**: Plans with too many tasks, vague tactics, or bad Week 1 scheduling make the demo feel shallow.

**Task**: Refine 12-week plan generation logic to produce 2-4 tactics with clear Week 1 schedule.

**Prompt for Claude**:
```
Review the 12-week plan setup logic:

Check files:
- src/features/plan12week/services/planGeneration.ts (or similar)
- src/features/plan12week/components/PlanPreview.tsx
- Any template data in src/features/plan12week/data/

Required improvements:
1. Tactic count: generate exactly 2-4 recurring tactics (not 1, not 5+)
2. Week 1 must show:
   - Clear daily tasks derived from tactics
   - Reasonable task count (3-7 tasks total in Week 1)
   - Specific actions (not "work on goal")
3. Tactic descriptions should be:
   - Actionable: "Write 500 words every weekday" not "Improve writing"
   - Time-bound: "30 minutes daily" not "Regular practice"
   - Measurable: Can clearly tell if done or not
4. Preview UX: when user reviews plan before finalizing:
   - Show Week 1 expanded by default
   - Show Weeks 2-4 as summary
   - Allow editing of tactics before confirming
5. Add validation: if generated plan exceeds limits, show warning or regenerate

After changes:
- npm run typecheck
- npm run test:run (if plan generation has tests)
- Manual QA: create several plans, verify quality and consistency
```

---

### Prompt 10: Production Build & Smoke Test Before Release

**Context**: Local checks pass but deployed demo may have broken routes or stale env.

**Task**: Run comprehensive production-ready verification.

**Prompt for Claude**:
```
Before marking MVP 1 complete, run full production smoke verification:

Required commands:
1. npm run check (runs typecheck, lint, test, build)
   - Fix any failures before proceeding

2. node scripts/check-runtime-env.mjs
   - Ensure demo mode configuration is correct
   - Fix any missing or misconfigured env warnings

3. npm run smoke:prod (if credentials available)
   - If this fails due to missing secrets, document exact blocker
   - If it runs, verify all steps pass:
     * Signed-out home loads
     * Onboarding flow completes
     * 12-week plan created
     * Today task toggled
     * Weekly review saved
     * Mock upgrade works

4. Manual deployment verification:
   - If deploying to Vercel, confirm .env.production is demo-safe
   - Confirm vercel.json rewrites work (refresh on /12-week-system)
   - Test on mobile viewport
   - Test incognito (fresh state)

If any step fails, fix before marking complete.

Report in final response:
- All commands run and their outputs
- Any failures and how they were resolved
- Remaining blockers (if any)
- Confirmation that demo mode works without Firebase/backend
```

---

## PRIORITY P1: Harden Backend Sync (For Real Mode)

### Prompt 11: Add Retry Logic for Failed Backend Sync

**Context**: Backend sync is best-effort but may fail; current implementation may not retry gracefully.

**Prompt for Claude**:
```
Review sync hooks in src/features/plan12week/hooks/:

- usePlanSetupSync.ts
- usePlanExecutionSync.ts

Required improvements:
1. Implement exponential backoff retry for transient failures:
   - Network errors, 5xx responses should retry 3-5 times
   - Use setTimeout with increasing delays
2. Persist failed sync operations in a queue:
   - Create src/features/plan12week/persistence/syncQueueStore.ts
   - Queue operations when offline or backend unavailable
   - Process queue when connectivity restored or app regains focus
3. Add sync status indicator in UI:
   - Subtle "Syncing..." / "Sync failed" / "Synced" status
   - In Settings tab, show sync queue length if > 0
4. On sync failure:
   - Show non-blocking toast: "Sync failed, will retry"
   - Do NOT prevent user from continuing local actions
5. On successful retry: clear queued operation

After implementation:
- npm run typecheck
- Test: go offline, make changes, come back online, verify sync retries
- Verify localStorage remains source of truth
```

---

### Prompt 12: Add Conflict Resolution for Multi-Device Sync

**Context**: If user updates same data on multiple devices, conflicts may occur.

**Prompt for Claude**:
```
Current backend sync doesn't handle concurrent updates well.

Review plan/week/task update patterns in:
- src/features/plan12week/hooks/usePlanExecutionSync.ts
- Backend controllers: backend/src/controllers/planController.ts, weekController.ts, taskController.ts

Required conflict handling:
1. Add version/timestamp to each backend document:
   - Goal, Plan, Week, Task, Metric models need `updatedAt` and `version` fields
   - Increment version on each update
2. Frontend should send current version when updating:
   - If backend version > local version, reject update
   - Show conflict UI: "This was updated on another device"
   - Options: "Overwrite" or "Refresh and merge"
3. For MVP simplicity, implement last-write-wins with user notification:
   - If conflict detected, show: "Data changed elsewhere. Latest version loaded."
   - Auto-merge where possible (non-overlapping fields)
4. Add conflict resolution to syncQueueStore as a conflict state

Backend changes needed:
- Add version field to Mongoose models
- Update controllers to check version before save
- Return 409 Conflict when version mismatch

After changes:
- Backend: npm --prefix backend run check
- Frontend: npm run check
- Test: open two browsers, edit same task, verify conflict handling
```

---

## PRIORITY P2: Quality of Life Improvements

### Prompt 13: Simplify Desktop and Mobile Layouts

**Context**: The product has many UI surfaces that can feel crowded on both desktop and mobile.

**Prompt for Claude**:
```
Audit all main pages for layout density:

Check:
- Dashboard (src/app/pages/Dashboard.tsx)
- Onboarding flow pages
- 12WeekSetup.tsx
- TwelveWeekSystem.tsx (already covered in Prompt 3)
- SMART Goal setup
- Feasibility check

Required simplification:
1. Reduce visual elements per screen:
   - Max 3-4 distinct content blocks on desktop
   - Max 1 primary action button per screen
   - Remove decorative elements that don't guide action
2. Mobile-first spacing:
   - Touch targets >= 44px
   - Adequate white space between sections
   - Single column layout, no horizontal scrolling
3. Progressive disclosure:
   - Hide advanced options behind "Show more" / "Advanced"
   - Show only essential fields upfront
4. Navigation clarity:
   - Clear "Next" / "Back" buttons with proper contrast
   - Progress indicator showing current step (e.g., "Step 3 of 6")
   - No nested navigation within setup steps

Use Tailwind's spacing utilities consistently:
- Section spacing: py-8 or py-12
- Card padding: p-6
- Gap between items: gap-4 or gap-6

After changes:
- npm run build
- Test on both mobile (375px) and desktop (1280px)
- Verify primary action is visible without scrolling
```

---

### Prompt 14: Add Account Data Export and Delete Flow

**Context**: Users should be able to export their data and delete their account.

**Prompt for Claude**:
```
Add data export and account deletion to Settings page.

Required implementation:
1. In Settings tab, add "Data & Privacy" section:
   - "Export my data" button → downloads JSON with:
     * User's goal
     * 12-week system (plan, weeks, tasks, check-ins, reviews)
     * App preferences
   - "Delete my account" button (if authenticated) OR "Clear all local data" (demo mode)
     * Requires confirmation dialog
     * For demo: clears localStorage and redirects to home
     * For real mode: calls backend /api/account/delete (needs implementation)
2. Export format:
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2026-05-06T...",
  "goal": {...},
  "twelveWeekSystem": {...},
  "preferences": {...}
}
```
3. Add clear warning before delete:
   - "This action cannot be undone"
   - "All your data will be permanently removed"
4. For demo mode: clearly label as "Local data only"

If implementing backend delete:
- Add DELETE /api/account route in backend
- Requires auth, deletes user's data and Firebase account (if owned)

After implementation:
- npm run typecheck
- Test export: verify JSON contains all user data
- Test delete/clear: verify localStorage is actually cleared
```

---

### Prompt 15: Improve Production Smoke Test Coverage

**Context**: The current smoke test may not catch all regressions in the core flow.

**Prompt for Claude**:
```
Review and enhance .github/workflows/production-smoke-e2e.yml and the smoke test script.

Check:
- npm run smoke:prod command
- Playwright test files (likely in src/test/e2e or similar)

Required improvements:
1. Expand smoke coverage to include:
   - Daily check-in save
   - Weekly review save
   - Progress tab state update
   - Mock checkout completion and entitlement unlock
   - Page refresh persistence
   - Mobile viewport test (375px)
2. Add assertions for each step:
   - Check for success messages after saves
   - Verify UI elements appear/disappear correctly
   - Assert that Today shows updated task count
3. Improve error reporting:
   - On failure, take screenshot
   - Capture console logs
   - Show which step failed with context
4. Make smoke more resilient:
   - Add waitFor selectors instead of fixed delays
   - Retry flaky steps once
   - Better cleanup: ensure test account is in clean state before starting

If smoke script is a custom Playwright test:
- Review test/page objects
- Add missing steps
- Ensure it works in both demo and real mode (parameterized)

Run updated smoke locally before committing:
- npm run smoke:prod (or npm run test:e2e if separate)
- Fix any flaky timing issues
```

---

## PRIORITY P2: Backend Hardening

### Prompt 16: Add Backend Tests for Core Controllers

**Context**: Backend tests are incomplete, risking regressions in goal/plan/week/task flows.

**Prompt for Claude**:
```
Add unit/integration tests for backend controllers.

Backend test location: backend/src/__tests__/ or similar

Required test coverage:
1. Goal controller:
   - CREATE goal (with and without auth)
   - GET goal (own vs. unauthorized)
   - UPDATE goal
   - DELETE goal
2. Plan controller:
   - Create plan linked to goal
   - Update plan (tactics, milestones)
   - Get plan with populated weeks/tasks
3. Week controller:
   - CRUD operations on week entries
   - Week status transitions (planned → in-progress → complete)
4. Task controller:
   - Task toggle (complete/incomplete)
   - Task creation from tactics
   - Task instance generation (recurring)
5. Auth middleware tests:
   - Requests without token → 401
   - Requests with invalid token → 401
   - Requests with valid token → pass through

Test setup:
- Use Jest (likely already configured)
- Mock MongoDB with in-memory DB or mongoose-mock
- Mock Firebase Admin SDK
- Test fixtures for user, goal, plan, week, task

Example structure:
```typescript
describe('GoalController', () => {
  it('should create goal for authenticated user', async () => {
    // Arrange: mock req.user, req.body
    // Act: call controller.createGoal(req, res)
    // Assert: status 201, returns goal with id
  });
});
```

After adding tests:
- npm --prefix backend run test
- Aim for >80% coverage on controller paths
```

---

### Prompt 17: Add Durable Retry Queue for Sync Failures

**Context**: Current sync failures may lose user actions; need a durable retry mechanism.

**Prompt for Claude**:
```
Implement a persistent sync outbox that survives page reloads.

Design:
1. Create src/features/plan12week/persistence/syncOutboxStore.ts:
   - Stores array of pending sync operations
   - Each operation: { id, type, entity, payload, localId, retryCount, lastError, createdAt }
   - Persisted to localStorage (key: 'syncOutbox')
2. Modify sync hooks to queue instead of direct API call:
   - On local change, push to outbox
   - Background worker processes queue sequentially
   - On success, remove from outbox
   - On failure, increment retryCount, schedule retry with backoff
3. UI indicator:
   - Show "X changes syncing" in footer or settings
   - "View sync queue" to see pending operations (debug mode)
4. App startup: process queue immediately
5. Visibility change: process queue when tab becomes visible
6. Online/offline events: pause/resume queue

Outbox operations to queue:
- Goal creation/updates
- Plan updates
- Week check-ins
- Task toggles
- Metric updates

After implementation:
- npm run typecheck
- Test: go offline, make several changes, go back online
- Verify all changes sync eventually
- Verify localStorage persists across reloads
```

---

## TASK-SPECIFIC PROMPTS

### Prompt 18: Add Loading States to All Async Operations

**Prompt**:
```
Review all pages and components for missing loading indicators.

Required loading states:
1. Page-level: when data is loading, show skeleton screens
   - Dashboard: skeleton cards while loading goals
   - 12WeekSetup: skeleton form while loading templates
   - TwelveWeekSystem: skeleton for Today tasks while loading
2. Button-level: disable and show spinner during form submit
   - Any "Save", "Continue", "Create plan" buttons
3. Sync operations: subtle indicator that sync is in progress
   - "Syncing..." badge or spinner
4. Error states: when load fails, show retry button

Use existing LoadingSpinner component or create one:
- src/app/components/LoadingSpinner.tsx
- Consistent size (sm, md, lg) variants
- Use Tailwind animate-spin

After adding loading states:
- npm run lint (check for no console.log)
- Test on slow 3G network throttle
- Verify user knows something is happening during async ops
```

---

### Prompt 19: Fix TypeScript Strictness Issues

**Prompt**:
```
Run npm run typecheck and fix all TypeScript errors.

Common issues to watch:
1. Implicit any types - add explicit types
2. Null/undefined handling - add proper checks or non-null assertions
3. React component props - ensure all props typed
4. API response types - use types from src/lib/api/types
5. localStorage values - use storage-types.ts definitions

Do NOT use `// @ts-ignore` or `any` as escape hatch. Either:
- Add proper type
- If third-party library issue, add declaration file

After fixing:
- npm run typecheck (should be clean)
- npm run build (should succeed)
```

---

### Prompt 20: Add Mobile-First Responsive Styles

**Prompt**:
```
Audit all main pages for mobile responsiveness.

Required checks:
1. Dashboard:
   - Cards stack vertically on mobile
   - CTA button large and visible
   - No horizontal overflow
2. Onboarding flow:
   - Each step fits within viewport height
   - Text readable at 375px width (min 16px font)
   - Form inputs full width on mobile
3. 12WeekSetup:
   - Template cards stack or scroll horizontally with clear affordance
   - Tactics editor works on mobile (date pickers, textareas)
   - Preview section scrollable without losing context
4. TwelveWeekSystem:
   - Today tasks full width
   - Checkboxes large enough for touch
   - Tabs either scrollable or bottom nav on mobile
5. All pages:
   - No fixed widths that exceed viewport
   - Images/illustrations scale down
   - Padding adjusts: py-6 on desktop → py-4 on mobile

Use Tailwind responsive classes:
- md:, lg: prefixes for desktop overrides
- Mobile-first: default styles for mobile, override for larger screens

Test on these breakpoints:
- Mobile: 375px, 414px
- Tablet: 768px
- Desktop: 1024px, 1280px

After responsive work:
- npm run build
- Test in Chrome DevTools device toolbar
- Verify no horizontal scroll on any page
```

---

## HOW TO USE THESE PROMPTS

1. Copy the prompt that matches your current priority
2. Paste into Claude Code with the project open
3. Claude will read relevant files and implement changes
4. After completion, verify with commands listed in the prompt
5. Mark prompt as complete in your task tracker

## VERIFICATION CHECKLIST FOR MVP 1

Before declaring MVP complete, ensure:

- [ ] All P0 prompts (1-10) have been addressed
- [ ] npm run check passes (typecheck, lint, test, build)
- [ ] Demo mode works without Firebase/backend
- [ ] Core flow from onboarding to weekly review completes smoothly
- [ ] Mobile UX verified on at least 2 viewport sizes
- [ ] Mock checkout clearly simulated
- [ ] Fresh signed-out state is clean
- [ ] Scroll position resets on navigation
- [ ] Today view is immediately actionable
- [ ] Terminology simplified
- [ ] Local storage explained to users
- [ ] Weekly review not blocked by paywall
- [ ] Generated plans have 2-4 tactics with clear Week 1
- [ ] Production smoke passes or documented blockers
- [ ] Backend sync (real mode) handles failures gracefully
- [ ] No console errors in demo mode

---

## NOTES

- These prompts assume the codebase structure described in AGENTS.md
- Adjust file paths if your actual structure differs
- Always read CLAUDE.md and AGENTS.md first for latest rules
- Do not introduce new dependencies without explicit approval
- Preserve existing localStorage schema and migration compatibility
