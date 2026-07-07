# Assistant Route Whitelist Alignment

## Context

Frontend reflection UI is registered at `/journal`, while the shared assistant action route whitelist still allows `/reflection`. If an AI provider emits a `navigate_to` action for `/reflection`, the frontend can accept an action that sends users to an unregistered route.

Dashboard and proactive assistant nudges also point at a few legacy or unavailable routes (`/smart-goal`, `/12-week-plan`, `/weekly-review`, `/12-week-system?tab=review`). These should resolve to currently registered routes without changing action payload shapes or saved data. The dashboard secondary insight chart can remain deferred until the secondary section is near the viewport, because it is not part of the first decision surface.

## Surface Classification

- Type: Mixed
- Touched domains: assistant action contract, route whitelist, model-routing context, dashboard review CTA, proactive nudge routes.
- Storage changes: none.
- Billing/payment changes: none.
- Auth changes: none.
- API shape changes: no action type or payload shape changes; only accepted route values are aligned with registered frontend routes.

## Requirements

1. WHEN assistant action parsing receives `navigate_to` with `/journal`, THE system SHALL accept it as the supported reflection journal route.
2. WHEN assistant action parsing receives `navigate_to` with `/reflection`, THE system SHALL reject it instead of allowing navigation to an unregistered route.
3. WHERE Gemini model routing uses page context to choose fast vs smart mode, THE system SHALL treat `/journal` as a smart reflection context.
4. WHILE this alignment is applied, THE system SHALL NOT change assistant action types, task/goal mutation payloads, storage data, auth, billing, or route registration.
5. WHEN the dashboard weekly review CTA is due, THE system SHALL route users to `/12-week-system?tab=week`, where the weekly review UI is registered.
6. WHEN proactive nudges recommend SMART goal, 12-week setup, weekly review, or reflection actions, THE system SHALL use currently registered route targets.
7. WHEN dashboard secondary insights are not near the viewport, THE system SHALL defer the trend chart without moving or removing the primary decision cards.

## Verification Plan

```bash
npm.cmd --prefix backend run test:run -- dist/tests/assistantActionContract.test.js dist/tests/aiAssistantService.test.js
npm.cmd run test:run -- src/app/features/assistant/__tests__/assistantActionContract.test.ts src/app/features/assistant/__tests__/proactiveNudgePhase9.test.ts
npm.cmd run test:ui -- src/app/features/assistant/__tests__/useProactiveNudge.test.tsx src/app/pages/Dashboard.active-system.test.tsx src/app/pages/Dashboard.fresh-state.test.tsx src/app/pages/Dashboard.test.tsx
npx vitest run --config vitest.flows.config.ts --silent=true src/features/plan12week/pages/twelve-week-flows.e2e.test.tsx
```
