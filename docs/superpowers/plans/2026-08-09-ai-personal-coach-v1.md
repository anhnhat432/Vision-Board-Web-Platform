# AI Personal Coach V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Keep all implementation and verification in the isolated worktree on `codex/ai-personal-coach-v1`.

**Goal:** Ship a production-safe, read-only Personal Coach on Daily Home that produces one validated Vietnamese recommendation from minimal structured execution context and always preserves a deterministic local fallback.

**Architecture:** Build one shared DTO/validator under the existing frontend/backend shared alias, derive context and fallback through pure frontend domain helpers, add raw structured-prompt entry points to the configured provider modules, and expose a dedicated authenticated `/api/ai/personal-coach` endpoint. A request lifecycle hook owns signature caching, abort/stale protection, and fallback selection; a compact card renders after Daily Focus + Weekly Pulse.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Tailwind/Radix, Vitest/Testing Library, Express, Node test runner, existing Groq/Gemini provider modules, Firebase auth, `express-rate-limit`.

## Global Constraints

- Base SHA: `4a9a1d5eaea5e9d0ec364a55efd42cb10b0a421c`.
- No new dependency, database model, localStorage key, migration, sync payload, provider credential, pricing rule, or paywall.
- Coach is read-only. No Generic Assistant mutation action may enter the Coach contract.
- Daily Home primary task remains authoritative through `buildDashboardDailyExecutionSnapshot()`.
- Real mode uses authenticated backend only; demo/offline/unconfigured paths use local deterministic fallback.
- Existing Assistant quotas remain 20 free and 120 paid requests per 15 minutes.
- Provider/user free text is never logged; context is allowlisted, bounded, and redacted before provider submission.
- UI output is Vietnamese, compact, accessible, and responsive at `390x844` and `1440x900`.

## File Map

- `backend/src/shared/personalCoachSchema.ts`: shared DTOs, request sanitization, recommendation validation, and task-action grounding.
- `src/features/personalCoach/context/buildPersonalCoachContext.ts`: pure context derivation and signature.
- `src/features/personalCoach/recommendation/getDeterministicCoachFallback.ts`: local fallback selection.
- `backend/src/services/groqAssistantProvider.ts` and `backend/src/services/geminiAssistantProvider.ts`: raw structured-prompt entry points preserving existing wrappers.
- `backend/src/services/personalCoachService.ts`: prompt, provider selection, strict validation, telemetry, and safe error mapping.
- `backend/src/controllers/personalCoachController.ts`, `backend/src/routes/assistantRoutes.ts`, `backend/src/middleware/rateLimiters.ts`: authenticated endpoint and quota policy.
- `src/features/personalCoach/api/personalCoachApi.ts`: authenticated client and second-pass validation.
- `src/features/personalCoach/hooks/usePersonalCoach.ts`: bounded cache, abort, stale guard, retry lock, and state mapping.
- `src/features/personalCoach/components/PersonalCoachCard.tsx`: compact accessible card.
- `src/app/pages/Dashboard.tsx`: context construction and Daily Home placement.
- Matching focused tests live beside frontend modules and under `backend/src/tests`.

---

### Task 1: Shared Coach Contract

**Files:**
- Create: `backend/src/shared/personalCoachSchema.ts`
- Create: `backend/src/tests/personalCoachSchema.test.ts`

**Interfaces:**

```ts
export const COACH_ACTION_TYPES = [
  "open_today",
  "open_task",
  "open_week_review",
  "open_week_plan",
  "none",
] as const;

export type CoachActionType = (typeof COACH_ACTION_TYPES)[number];
export interface CoachTask { id: string; title: string; scheduledDate: string; isCore: boolean }
export interface CoachRecommendation {
  title: string;
  recommendation: string;
  rationale: string[];
  primaryAction: { type: CoachActionType; taskId?: string };
  caution?: string;
}
export type CoachValidationResult<T> =
  | { ok: true; value: T; issues: string[] }
  | { ok: false; errorCode: string };
```

- [ ] Write failing tests that reconstruct only allowlisted context fields, redact sensitive free text, accept one valid recommendation, reject malformed/unknown/empty-rationale output, downgrade invalid `open_task` IDs, and prove no mutation action enum exists.
- [ ] Run `npm --prefix backend run build`; expect failure because the module is missing.
- [ ] Implement bounded string/number/array/date/workload validators using `redactSensitive()`. Cap today tasks at 8, overdue tasks at 3, commitments at 3, and insights at 3.
- [ ] Validate `open_task.taskId` against open task IDs in `today.openTasks` and `week.overdueTasks`; downgrade invalid IDs to `{ type: "open_today" }` with issue `COACH_INVALID_TASK_ACTION`.
- [ ] Run `npm --prefix backend run build` and `node --test backend/dist/tests/personalCoachSchema.test.js`; expect PASS.
- [ ] Commit with `git commit -m "feat(coach): define safe shared contracts"`.

---

### Task 2: Pure Context and Deterministic Fallback

**Files:**
- Create: `src/features/personalCoach/context/buildPersonalCoachContext.ts`
- Create: `src/features/personalCoach/context/buildPersonalCoachContext.test.ts`
- Create: `src/features/personalCoach/recommendation/getDeterministicCoachFallback.ts`
- Create: `src/features/personalCoach/recommendation/getDeterministicCoachFallback.test.ts`

**Interfaces:**

```ts
export function buildPersonalCoachContext(input: {
  goal: Goal;
  system: TwelveWeekSystem;
  referenceDate?: Date;
}): PersonalCoachContext;
export function getPersonalCoachContextSignature(context: PersonalCoachContext): string;
export function getDeterministicCoachFallback(context: PersonalCoachContext): CoachRecommendation;
```

- [ ] Write failing context tests for active goal, no review, latest completed review, early-week future exclusion, Week 12, all done, overdue candidates, current weekly focus, caps, and signature changes.
- [ ] Run `npm run test:run -- src/features/personalCoach/context/buildPersonalCoachContext.test.ts`; expect missing-module failure.
- [ ] Implement context using `buildDashboardDailyExecutionSnapshot()`, `getWeeklyReviewEvidence()`, and `getExecutionInsights()`. Compute execution-to-date from current-week non-skipped tasks scheduled on or before the reference date.
- [ ] Select the latest completed review whose `weekNumber <= currentWeek`. Build a stable FNV-1a signature over `JSON.stringify(context)`; persist nothing.
- [ ] Run the context test; expect PASS.
- [ ] Write failing fallback tests for canonical primary task, all done, core overdue recovery, review due, no scheduled work, workload reduction rationale, valid actions, and compact lengths.
- [ ] Implement fallback priority: canonical primary task -> all-done closure -> core overdue -> due review -> current week plan.
- [ ] Run both focused tests; expect PASS.
- [ ] Commit with `git commit -m "feat(coach): derive context and local fallback"`.

---

### Task 3: Provider Raw Structured-Prompt Entry Points

**Files:**
- Modify: `backend/src/services/groqAssistantProvider.ts`
- Modify: `backend/src/services/geminiAssistantProvider.ts`
- Modify: `backend/src/tests/groqAssistantProvider.test.ts`
- Modify: `backend/src/tests/geminiAssistantProvider.test.ts`

**Interface:**

```ts
export interface StructuredProviderPromptRequest {
  systemPrompt: string;
  contextMessage: string;
  userMessage: string;
  maxTokens: number;
  temperature: number;
  jsonObject: boolean;
  signal?: AbortSignal;
  model?: string;
}
```

- [ ] Add failing provider tests asserting supplied system/context messages, no Generic Assistant action/history instruction, configured model/key use, Groq JSON mode, generation limits, abort handling, and redacted errors.
- [ ] Run backend build; expect missing-entry-point failure.
- [ ] Extract existing HTTP/error/retry logic behind `sendPromptToGroq()` and `sendPromptToGemini()`. Keep `sendToGroq()` and `sendToGemini()` as compatibility wrappers using existing prompts/settings.
- [ ] For Gemini place `systemPrompt` in `system_instruction`; for Groq use separate system messages and `response_format: { type: "json_object" }` when requested.
- [ ] Run backend build and both provider tests; expect all old and new cases PASS.
- [ ] Commit with `git commit -m "refactor(assistant): expose structured provider prompts"`.

---

### Task 4: Dedicated Backend Coach Endpoint

**Files:**
- Create: `backend/src/services/personalCoachService.ts`
- Create: `backend/src/tests/personalCoachService.test.ts`
- Create: `backend/src/controllers/personalCoachController.ts`
- Modify: `backend/src/routes/assistantRoutes.ts`
- Modify: `backend/src/middleware/rateLimiters.ts`
- Modify: `backend/src/tests/assistantRoutes.test.ts`
- Modify: `backend/src/tests/rateLimiters.test.ts`

**Interfaces:**

```ts
export function buildPersonalCoachPrompt(context: PersonalCoachContext): {
  systemPrompt: string;
  contextMessage: string;
  userMessage: string;
};
export async function processPersonalCoachRequest(
  context: PersonalCoachContext,
  dependencies?: PersonalCoachServiceDependencies,
): Promise<
  | { ok: true; recommendation: CoachRecommendation }
  | { ok: false; status: 429 | 502 | 503; errorCode: string; message: string }
>;
```

- [ ] Write failing service tests for valid JSON, malformed JSON, unknown enum, invalid task ID downgrade, empty rationale, prompt rules, injection text isolated inside `UNTRUSTED_STRUCTURED_CONTEXT`, Week 12, provider rate limit/unavailable, and no raw context logging.
- [ ] Run backend build; expect missing-service failure.
- [ ] Implement one non-streaming provider request with no history, temperature near `0.2`, output budget near `500`, exact `JSON.parse`, shared validation, and no Markdown repair path.
- [ ] Record safe Assistant turn telemetry for `/ai/personal-coach`: provider/model/latency/outcome/errorCode/token estimate/structured success only.
- [ ] Run service test; expect PASS.
- [ ] Add failing route tests: auth required, invalid context -> `COACH_INVALID_CONTEXT`, route registered, and `getAuthenticatedRateLimitPolicy("POST", "/ai/personal-coach") === "dedicated"`.
- [ ] Implement controller sequence `sanitize request -> process -> successResponse({ recommendation })`, register `router.post("/ai/personal-coach", assistantRateLimiter, asyncHandler(personalCoachController))`, and mark route dedicated.
- [ ] Run backend build plus service/route/limiter tests; expect PASS.
- [ ] Commit with `git commit -m "feat(coach): add authenticated recommendation endpoint"`.

---

### Task 5: Frontend API and Request Lifecycle

**Files:**
- Create: `src/features/personalCoach/api/personalCoachApi.ts`
- Create: `src/features/personalCoach/api/personalCoachApi.test.ts`
- Create: `src/features/personalCoach/hooks/usePersonalCoach.ts`
- Create: `src/features/personalCoach/hooks/usePersonalCoach.test.tsx`

**Interfaces:**

```ts
export async function requestPersonalCoachRecommendation(
  context: PersonalCoachContext,
  signal?: AbortSignal,
): Promise<CoachRecommendation>;

export type PersonalCoachState =
  | { status: "idle"; recommendation: null }
  | { status: "loading"; recommendation: CoachRecommendation }
  | { status: "ready"; recommendation: CoachRecommendation; source: "ai" | "deterministic" }
  | {
      status: "offline" | "rate_limited" | "error";
      recommendation: CoachRecommendation;
      errorCode?: string;
    };

export function usePersonalCoach(context: PersonalCoachContext | null): {
  state: PersonalCoachState;
  retry: () => void;
  isRetrying: boolean;
};
```

- [ ] Write failing API tests for path/body/signal, successful second-pass validation, invalid response, and safe error propagation.
- [ ] Implement `post("/ai/personal-coach", { context }, { signal })`; validate `response.recommendation` and throw `COACH_INVALID_RESPONSE` when invalid.
- [ ] Run API test; expect PASS.
- [ ] Write failing hook tests using deferred promises: no context, demo/offline fallback, loading -> ready, cache reuse, old response ignored, cleanup abort, retry dedupe, rate limit, and provider/network error.
- [ ] Implement a module-memory `Map` capped at 20, monotonically increasing request IDs, one `AbortController` per request, and signature equality before result application. Seed loading/error states with deterministic fallback.
- [ ] Run API/hook tests; expect PASS.
- [ ] Commit with `git commit -m "feat(coach): manage safe recommendation requests"`.

---

### Task 6: Coach Card and Daily Home Integration

**Files:**
- Create: `src/features/personalCoach/components/PersonalCoachCard.tsx`
- Create: `src/features/personalCoach/components/PersonalCoachCard.test.tsx`
- Modify: `src/app/pages/Dashboard.tsx`
- Modify: `src/app/pages/Dashboard.active-system.test.tsx`
- Modify: `src/app/pages/Dashboard.fresh-state.test.tsx`

**Interface:**

```ts
interface PersonalCoachCardProps {
  context: PersonalCoachContext | null;
  setupHref: string;
}
```

- [ ] Write failing card tests for loading announcement, AI/fallback/offline/rate-limit/error states, retry, no active goal, all done, action hrefs, “Vì sao?” disclosure, max three bullets, keyboard use, and 44px CTA.
- [ ] Implement compact order: Coach/state badge -> title -> recommendation -> primary trusted CTA -> collapsed evidence -> optional retry/status. Use existing tokens and Lucide icons as decoration only.
- [ ] Run card test; expect PASS.
- [ ] Add failing Dashboard tests for DOM order `DailyFocus/WeeklyPulse -> Coach -> TodayMiniCard`, no-active setup + Coach empty state, and task completion context refresh without stale overwrite.
- [ ] Build context with `visibleActiveTwelveWeekGoal` and `localActiveSystem` in `useMemo`. Render active Coach after the focus/pulse grid. In the no-system branch render `NewUserSetupView` followed by Coach empty state using the canonical next-step route.
- [ ] Run focused card/Dashboard tests; expect PASS.
- [ ] Commit with `git commit -m "feat(coach): add contextual Daily Home card"`.

---

### Task 7: Full Verification and Security Review

- [ ] Run focused frontend tests:

```bash
npm run test:run -- src/features/personalCoach/context/buildPersonalCoachContext.test.ts src/features/personalCoach/recommendation/getDeterministicCoachFallback.test.ts src/features/personalCoach/api/personalCoachApi.test.ts src/features/personalCoach/hooks/usePersonalCoach.test.tsx
npm run test:ui -- src/features/personalCoach/components/PersonalCoachCard.test.tsx src/app/pages/Dashboard.active-system.test.tsx src/app/pages/Dashboard.fresh-state.test.tsx
```

- [ ] Run focused backend tests:

```bash
npm --prefix backend run build
node --test backend/dist/tests/personalCoachSchema.test.js backend/dist/tests/personalCoachService.test.js backend/dist/tests/groqAssistantProvider.test.js backend/dist/tests/geminiAssistantProvider.test.js backend/dist/tests/assistantRoutes.test.js backend/dist/tests/rateLimiters.test.js
```

- [ ] Run repository gates:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run test:ui
npm run test:sync
npm run test:ops
npm --prefix backend run check
npm --prefix backend test
npm run build
node scripts/check-runtime-env.mjs
node scripts/check-runtime-env.mjs --full-stack
```

- [ ] Search the branch diff for mutation actions, Assistant memory/retrieval, email/billing/token fields, raw logging, unsafe HTML, and untrusted routes. Trace `PC-001` through `PC-020` to code/tests.
- [ ] Browser QA at `390x844` and `1440x900`: hierarchy, overflow, touch targets, loading/ready/fallback/error/rate-limit/all-done/no-active states, disclosure, navigation, and stale response after task completion. Capture screenshots.
- [ ] Run `npm run smoke:prod` without asserting exact live model prose or using private user data. If infrastructure is unavailable, record the exact blocker.
- [ ] Run `git diff --check`; commit only verified in-scope cleanup with `git commit -m "test(coach): verify production-safe v1"`.

---

### Task 8: Publish, Merge, and Production Verification

- [ ] Fetch `origin/main`, inspect `HEAD...origin/main`, integrate latest main only if needed, and rerun affected gates.
- [ ] Push `codex/ai-personal-coach-v1` and open one focused PR containing spec, architecture, privacy/read-only guarantees, commands/results, browser screenshots, and production verification plan.
- [ ] Monitor CI, CodeQL, Gitleaks, dependency audit, backend/frontend tests, build, and Vercel. Fix only proven branch regressions.
- [ ] Merge only when all mission/spec autonomous gates pass; record PR number and merge SHA.
- [ ] Verify the exact merged SHA/deployment, production Daily Home load, non-blocking Coach failure behavior, and production-safe smoke.
- [ ] Mark the autonomous goal complete only when the Definition of Done is genuinely satisfied.
