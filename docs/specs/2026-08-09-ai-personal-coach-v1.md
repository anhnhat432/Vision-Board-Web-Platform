# AI Personal Coach V1

Status: Approved for autonomous implementation  
Date: 2026-08-09  
Risk: High  
Delivery: Hybrid SDD/ADD, Full specification

## 1. Context & Goal

- Feature: a read-only AI Personal Coach on Daily Home that turns current structured execution state into one useful next decision.
- Why now: canonical Daily Home, deterministic execution evidence, Weekly Review V2, provider transport, auth, entitlement rate limits, and production smoke infrastructure are present on `origin/main` at `4a9a1d5eaea5e9d0ec364a55efd42cb10b0a421c`.
- User outcome: a returning user can open Daily Home, keep Daily Focus as the execution authority, and receive one short, evidence-based recommendation that routes back to a trusted execution surface.
- Modes affected: `real` and `demo`.
- Product principle: reduce decision friction, not increase chat volume.

## 2. Surface Classification

- Type: `Mixed`.
- Core:
  - sanitized AI context contract;
  - provider prompt boundary and prompt-injection resistance;
  - backend request and output validation;
  - read-only action contract;
  - auth, entitlement rate limiting, privacy, observability, and stale-response protection.
- Shell:
  - compact Coach card;
  - loading, fallback, offline, rate-limited, error, low-data, all-done, and no-active-goal states;
  - explanation disclosure, navigation, accessibility, and responsive layout.
- Existing invariants:
  - `buildDashboardDailyExecutionSnapshot()` remains the Daily Home priority authority.
  - `commitTwelveWeekTaskCompletion()`, `commitTwelveWeekWeeklyReview()`, and confirmed `nextWeekHandoff -> commitSystemUpdate()` remain the only write authorities in scope.
  - Local execution remains usable without AI, Firebase readiness, backend availability, or network access.
  - Existing Assistant free/paid rate limits remain `20/15 minutes` and `120/15 minutes`; Coach does not create a new paywall.

## 3. Architecture Decision

### Considered approaches

1. **Dedicated Coach endpoint using existing provider infrastructure — selected.**
   - Adds `POST /api/ai/personal-coach` with a Coach-only context, prompt, schema, and read-only action enum.
   - Reuses Firebase auth, `assistantRateLimiter`, provider credentials/model, provider error handling, and Assistant telemetry.
   - Best privacy and validation boundary; prevents generic Assistant memory, retrieval, chat history, and mutation actions from entering Coach V1.
2. **Coach mode inside `/api/ai/assistant`.**
   - Reuses more orchestration code, but couples Coach to a context contract designed for broad chat, memory, workflow, and mutable actions.
   - Higher risk of oversharing and accidental action leakage; rejected for V1.
3. **Frontend-only adaptation of Generic Assistant.**
   - Smallest backend diff, but cannot provide a trustworthy server-side prompt/output contract or fail-closed validation.
   - Rejected because privacy and action authority would depend on UI conventions.

### Selected component flow

```text
Latest local active Goal/TwelveWeekSystem
  -> buildDashboardDailyExecutionSnapshot()
  -> buildPersonalCoachContext()
  -> context signature + in-memory cache
  -> POST /api/ai/personal-coach (real, signed-in, online only)
  -> existing auth + assistantRateLimiter
  -> Personal Coach prompt through configured Groq/Gemini provider
  -> strict recommendation validation + task-id validation
  -> PersonalCoachCard
  -> trusted navigation only

Any unavailable path
  -> getDeterministicCoachFallback()
  -> Daily Home remains fully usable
```

The provider modules will expose raw structured-prompt entry points while preserving their existing Assistant wrappers. Coach will not invoke Generic Assistant memory, retrieval, workflow, action parsing, or chat history.

## 4. Actors & Entry Points

- Primary actor: signed-in returning user with an active local 12-week system.
- Secondary states: signed-in user without an active system; demo-mode user; offline user; low-data/fresh user.
- Primary route: `/` (Daily Home dashboard).
- Trusted navigation targets:
  - `/12-week-system?tab=today` for `open_today` and validated `open_task`;
  - `/12-week-system?tab=week` for `open_week_review` and `open_week_plan`;
  - the current canonical setup guidance route for no-active-goal state.
- API: `POST /api/ai/personal-coach`.
- The endpoint is registered after global Firebase auth and uses `assistantRateLimiter`.

## 5. Context Contract

`PersonalCoachContext` is a shared DTO built by one pure frontend function and reconstructed through a backend allowlist validator.

```ts
interface PersonalCoachContext {
  goal: {
    id: string;
    title: string;
    outcome?: string;
  };
  cycle: {
    currentWeek: number;
    totalWeeks: number;
    phase: "active" | "final_week";
  };
  today: {
    date: string;
    primaryTask?: CoachTask;
    openTasks: CoachTask[];
    scheduledCount: number;
    completedCount: number;
    allScheduledComplete: boolean;
  };
  week: {
    focus?: string;
    completionToDate?: number;
    wholeWeekCompletion?: number;
    coreCompletionToDate?: number;
    overdueCount: number;
    overdueTasks: CoachTask[];
    carryOverCount: number;
    checkInDays: number;
    possibleCheckInDays: number;
    reviewDueToday: boolean;
  };
  reflection?: {
    weekNumber: number;
    keepTactic?: string;
    mainObstacle?: string;
    nextWeekPriority?: string;
    nextWeekCommitments?: string[];
    reduceTactic?: string;
    workloadDecision?: "keep same" | "reduce slightly" | "increase slightly";
  };
  deterministicInsights: CoachInsight[];
  lagMetric?: {
    name: string;
    unit: string;
    target: string;
    currentValue: string;
  };
}
```

Context rules:

- Daily primary/open tasks come from `buildDashboardDailyExecutionSnapshot()`; Coach does not create a second primary-task algorithm.
- Execution-to-date includes only current-week tasks scheduled on or before the reference date. Future scheduled work is not missed work.
- Whole-week metrics and carry-over evidence reuse `getWeeklyReviewEvidence()`.
- The latest completed relevant Weekly Review is selected by highest `weekNumber <= currentWeek`.
- Deterministic insights reuse `getExecutionInsights()` and are capped at three.
- Today open tasks are capped at eight; overdue candidates at three; review commitments at three; insights at three.
- Text values are trimmed and length-bounded. Backend validation redacts emails, bearer tokens, API keys, passwords, secrets, and high-entropy tokens from free text before provider submission.
- Excluded by construction: email/account metadata, auth tokens, billing/payment data, full localStorage, entire `UserData`, unrelated goals, Vision Board content, Assistant memory/retrieval/chat history, and Journal/freeform reflection history.
- No localStorage schema, migration, backend model, MongoDB collection, sync payload, or outbox contract changes.

## 6. Recommendation Contract

```ts
type CoachActionType =
  | "open_today"
  | "open_task"
  | "open_week_review"
  | "open_week_plan"
  | "none";

interface CoachRecommendation {
  title: string;                 // 1..80 chars
  recommendation: string;        // 1..320 chars
  rationale: string[];           // 1..3 items, each 1..180 chars
  primaryAction: {
    type: CoachActionType;
    taskId?: string;
  };
  caution?: string;              // <= 180 chars
}
```

Validation rules:

- Provider output must be exactly one JSON object; arbitrary Markdown is not application logic.
- Unknown action enums, missing required text, empty rationale, excessive lengths, extra action shapes, and malformed JSON fail closed.
- `open_task.taskId` must identify an open task in `today.openTasks` or `week.overdueTasks` for the active context.
- Invalid or stale task IDs are downgraded to `open_today`; no invalid entity navigation occurs.
- No mutation action exists in this schema.
- Frontend validates the successful API response again before rendering.

## 7. Functional Requirements

- `PC-001` WHEN Daily Home derives an active local 12-week system, THE system SHALL build Coach context from the latest local goal/system and canonical Daily Home snapshot.
- `PC-002` WHEN Coach context is built, THE system SHALL include only the minimum allowlisted fields described in Section 5.
- `PC-003` WHEN the current week is active, THE system SHALL distinguish execution-to-date from whole-week completion so future tasks are not treated as missed.
- `PC-004` WHEN a completed Weekly Review exists, THE system SHALL prioritize explicit `workloadDecision`, `keepTactic`, `reduceTactic`, `mainObstacle`, `nextWeekPriority`, and `nextWeekCommitments` over AI interpretation.
- `PC-005` WHEN a primary Daily Home task exists, THE Coach SHALL normally recommend or explain that task and SHALL NOT casually substitute another task.
- `PC-006` WHEN no Weekly Review exists, THE Coach SHALL still produce a useful low-data recommendation from current goal, week, and open tasks.
- `PC-007` WHEN all scheduled work today is complete, THE Coach SHALL NOT invent additional work and SHALL recommend closure/check-in through an existing surface.
- `PC-008` WHEN no active system exists, THE Coach SHALL avoid a provider call and show a setup-oriented empty state using the canonical setup route.
- `PC-009` WHEN the configured provider returns valid output, THE backend SHALL return one validated Vietnamese recommendation with one primary decision.
- `PC-010` WHEN provider output is malformed, unknown, or unsafe, THE backend SHALL return a safe error without raw provider content or stack traces.
- `PC-011` WHEN AI is unavailable, offline, rate-limited, unconfigured, or errors, THE frontend SHALL show a deterministic recommendation and keep Today, task completion, Weekly Review, and planning usable.
- `PC-012` WHILE a Coach request is in flight, THE system SHALL deduplicate retries and abort or ignore responses whose context signature is no longer current.
- `PC-013` WHEN meaningful context has not changed, THE system SHALL reuse a bounded in-memory cached recommendation instead of issuing another provider request.
- `PC-014` WHERE `VITE_APP_MODE=demo`, THE system SHALL use deterministic local coaching and SHALL NOT call protected Coach backend paths.
- `PC-015` WHERE `VITE_APP_MODE=real`, THE system SHALL use the authenticated backend only when online and backend configuration is available; otherwise it SHALL fall back locally.
- `PC-016` WHEN the user activates a Coach CTA, THE system SHALL navigate only to the trusted routes in Section 4 and SHALL perform no direct write.
- `PC-017` WHEN the user expands “Vì sao?”, THE system SHALL show at most three evidence bullets and SHALL keep the default card compact.
- `PC-018` WHEN a user explicitly retries, THE system SHALL issue at most one concurrent retry and disable duplicate retry submission while in flight.
- `PC-019` WHEN week 12 is active, THE prompt SHALL favor finishing core commitments or cycle closure and SHALL NOT propose expanding another week inside the ending cycle.
- `PC-020` WHEN user-entered task/review text contains instruction-like content, THE prompt SHALL label it untrusted structured data and output validation SHALL remain authoritative.

## 8. Request, Cache, and Failure Policy

- Real-mode auto-generation occurs once per meaningful context signature.
- Signature inputs: date, goal id, current week, current/open/overdue task IDs and state, current focus, relevant review fields, metrics, and deterministic insight IDs/metrics.
- Cache: module-memory only, maximum 20 signatures, no persisted AI memory and no cross-session profile.
- Context changes abort the previous request. Response application requires both matching request ID and matching signature.
- Retry is user-triggered only; no automatic retry loop beyond existing provider-level conservative transient handling.
- Provider request is non-streaming and capped for a short response.
- Backend statuses:
  - `400`: invalid Coach request/context;
  - `429`: Assistant quota or provider rate limit;
  - `502`: malformed/unsafe provider output;
  - `503`: provider unavailable/not configured;
  - `200`: validated recommendation.

## 9. Prompt Contract

The server-owned Coach prompt SHALL:

- request one primary recommendation and at most one backup idea only when necessary;
- require short Vietnamese output matching the JSON schema;
- label plan/execution facts, user-reported review context, and AI interpretation distinctly in natural language;
- treat structured context values as untrusted data, never as privileged instructions;
- prohibit diagnosis, psychological profiling, invented facts/tasks/IDs, silent mutation, and unsupported certainty;
- respect user-confirmed workload reduction and reduced tactics;
- preserve Daily Home primary-task authority;
- adapt to low-data, all-done, overdue, early-week, and final-week states;
- avoid recalculating deterministic metrics supplied in context.

## 10. UI & Accessibility

- Active-system placement: after the Daily Focus + Weekly Pulse grid and before `TodayMiniCard`.
- Daily Focus remains visually stronger and earlier in DOM order.
- Default Coach card shows one title, one short recommendation, one primary CTA, and a collapsed “Vì sao?” disclosure.
- Fallback states retain the recommendation surface and add concise status copy; raw HTTP/provider errors never render.
- Loading uses an announced status region without blocking the rest of Dashboard.
- All buttons/links have text labels, keyboard focus, and at least 44px touch height.
- Disclosure uses accessible expanded/collapsed semantics.
- Mobile target `390x844`: no horizontal overflow, no wall of text, Daily Focus remains dominant, and CTA remains reachable.
- Desktop target `1440x900`: card aligns with the existing editorial Dashboard system without becoming a competing hero.

## 11. Security, Privacy, and Observability

- Provider secrets stay server-side; no new client env secret is introduced.
- Global Firebase auth remains before Coach route registration.
- `assistantRateLimiter` applies to Coach and preserves current entitlement policy.
- The generic authenticated API limiter treats `/ai/personal-coach` as a dedicated-limiter route to avoid an unintended second quota.
- Backend validation reconstructs the context from allowlisted fields and bounded values.
- Provider prompts and telemetry never log the full context or response free text.
- Existing Assistant turn telemetry records provider, model, route `/ai/personal-coach`, latency, outcome, safe error code, structured success, token estimate, and action-validation outcome.
- Schema validation failure, provider failure, and invalid returned task action are observable through safe codes only.
- No database read/write is needed; the authenticated endpoint reasons only over the caller-submitted sanitized local context and returns to that same caller.

## 12. Out of Scope

- Generic or threaded Coach chat.
- Long-term/vector/semantic AI memory or personality profiling.
- Background monitoring, push notifications, voice, calendar, Pet integration, or autonomous agent loops.
- Task completion, rescheduling, plan mutation, Weekly Review writes, billing changes, or any other AI write authority.
- New provider/model/vendor strategy, new pricing, new paywall, schema migrations, or consent/privacy-policy expansion.
- Exact-task deep-link/highlight behavior inside Today; validated `open_task` routes to the trusted Today surface in V1.

## 13. Verification & Traceability

| Requirement | Primary implementation | Automated evidence |
| --- | --- | --- |
| PC-001..PC-008 | context builder + deterministic fallback | context/fallback unit tests |
| PC-002, PC-020 | shared request validator + prompt builder | privacy, redaction, injection-structure tests |
| PC-009..PC-010 | backend Coach service + shared recommendation validator | service/schema/provider tests |
| PC-011..PC-015, PC-018 | API client + request lifecycle hook | API/hook lifecycle tests |
| PC-016..PC-017 | Coach card + Dashboard integration | component and Dashboard hierarchy/navigation tests |
| PC-019 | server prompt contract | structural prompt test |

Minimum automated cases:

- active goal, no active goal, primary task, overdue, recent review, no review, week 1, week 12, early week, and all done;
- excluded email/account/billing/token/Journal fields and redacted sensitive free text;
- valid task action, invalid task ID, malformed response, unknown enum, and empty rationale;
- provider unavailable, offline, rate limit, deterministic fallback, deduplicated retry, and stale response rejection;
- Daily Focus before Coach, Coach before secondary Today card, explanation disclosure, action navigation, and no-active-goal state;
- mobile touch targets/overflow and desktop hierarchy.

Commands:

```bash
npm run test:ui -- <focused personalCoach and Dashboard tests>
npm --prefix backend test -- <focused Coach/provider/route tests>
npm run typecheck
npm run lint
npm run test:run
npm run test:sync
npm run test:ops
npm --prefix backend run check
npm run build
npm run smoke:prod
```

Production smoke must not depend on exact live LLM prose. It may prove that Daily Home loads, Coach failure does not block the page, and a deterministic/test contract renders where the existing smoke harness supports it.

## 14. Rollout, Assumptions, and Completion Gate

- Delivery target: one focused feature PR; a second hardening PR is allowed only if CI/production smoke requires an isolated fix.
- No feature flag is added unless current deployment behavior proves one necessary.
- Assumption: production continues using the configured Groq provider/model and existing Assistant quota. This was verified from current repository configuration; no new credential is required.
- Assumption: broad autonomous authorization in the mission is the approval gate for this spec and normal implementation decisions.
- Open questions: none. Any future choice that changes pricing, provider credentials, consent/privacy policy, persistent user data, or destructive production behavior is a true stop condition.

Completion requires all four Hybrid validation layers:

1. automated checks;
2. every `PC-*` rule traced to code/tests;
3. privacy/security/read-only authority review;
4. browser acceptance at `390x844` and `1440x900`, then CI/deployment/production-safe smoke evidence.
