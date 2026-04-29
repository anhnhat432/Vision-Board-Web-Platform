# AGENTS.md

## Project Overview

Vision Board Web Platform is a local-first web app with an optional full-stack backend. The product turns a life vision into SMART goals, feasibility checks, 12-week execution plans, weekly action, and reflection.

Current product priority:

```text
Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility Check -> 12-Week Plan -> Weekly Execution -> Reflection/Review
```

For MVP 1, treat the app as a local-first public demo for the 12-week execution system. Backend sync, Firebase login, and billing provider integrations are optional layers, not required for the demo path.

## Tech Stack

Frontend:

- React 18
- Vite 6
- TypeScript
- React Router
- Tailwind CSS and existing project components
- Radix primitives and Lucide icons
- Vitest and Testing Library
- Biome linting
- Firebase client SDK for optional auth

Backend:

- Express
- TypeScript
- MongoDB/Mongoose
- Firebase Admin for protected routes
- Node engine target: `20.x`

Deployment and runtime:

- Frontend on Vercel as a SPA with `vercel.json` rewrites.
- Backend is Render-ready through `render.yaml`.
- `.env.production` is intentionally demo-safe unless host env overrides it.

## Repository Map

Frontend:

- `src/app/pages`: route-level product screens.
- `src/app/components`: shared UI and app components.
- `src/app/hooks`: app-level hooks.
- `src/app/utils`: localStorage, app mode, billing/paywall, analytics, 12-week utilities.
- `src/features/plan12week`: 12-week planning, execution, sync, persistence, and domain logic.
- `src/features/dashboard`: dashboard-specific components and helpers.
- `src/lib/api`: frontend API client and backend link stores.
- `src/lib/auth`: Firebase auth integration.
- `src/lib/feasibility` and `src/lib/smart-goal`: scoring and SMART goal helpers.
- `src/test`: test helpers.

Backend:

- `backend/src/config`: env and configuration.
- `backend/src/controllers`: request handlers.
- `backend/src/middleware`: auth and request middleware.
- `backend/src/models`: Mongoose models.
- `backend/src/repositories`: persistence adapters.
- `backend/src/routes`: API route definitions.
- `backend/src/services`: backend domain and validation logic.

Docs:

- `README.md`: setup, verification, deployment overview.
- `guidelines/CURRENT_PROJECT_STATUS.md`: current code-backed project status.
- `guidelines/MVP_1_SCOPE.md`: MVP 1 scope and release checklist.
- `guidelines/VercelDeploymentChecklist.md`: deployment mode notes.

## Product Scope Rules

- Do not expand scope randomly.
- Prefer the core flow over side features.
- Do not turn the product into a generic planner, social app, AI coach, or payment platform unless the task explicitly asks for that.
- For MVP 1 work, prioritize demo-mode stability, 12-week setup, Today tasks, weekly review, progress, and mock upgrade.
- Keep vision board, achievements, admin orders, real billing, and perfect cloud sync secondary unless explicitly requested.

## Engineering Rules

- Keep changes small, typed, and focused.
- Do not rewrite large areas unless explicitly asked.
- Preserve existing architecture unless there is a clear local reason to change it.
- Prefer existing helpers, components, and domain utilities over new abstractions.
- Do not introduce dependencies unless there is a strong technical reason and the user asked for implementation work that needs them.
- Avoid cosmetic-only changes unless the task is UI polish.
- If a file is large, refactor in small steps. Extract only when it reduces real complexity or isolates a clear responsibility.
- Do not mix unrelated refactors with feature or bug-fix work.
- Be careful in dirty worktrees. Never revert user changes unless explicitly asked.

## LocalStorage and Migration Rules

LocalStorage is the primary UX source of truth for most frontend flows.

- Treat `src/app/utils/storage.ts`, `storage-types.ts`, `storage-twelve-week.ts`, and related storage modules as compatibility-sensitive.
- Do not rename storage keys, change stored shapes, or clear local data casually.
- If changing `UserData`, `Goal`, `TwelveWeekSystem`, billing, entitlement, event log, or outbox shapes, add or update normalization/migration logic.
- Preserve existing local-first behavior: local save should succeed even when backend/Firebase is unavailable.
- Add focused tests for migrations or normalization when changing persisted shapes.
- Never make backend sync a hard requirement for demo mode.

## Backend Sync Rules

- Backend sync is conditional and best-effort.
- Protected backend calls require Firebase auth readiness and a signed-in user.
- Demo mode must not call protected backend sync paths.
- Local data should be saved before remote sync.
- Remote sync failures should not destroy local user progress.
- Use existing API services and link stores rather than ad hoc fetch calls.

## Billing and Paywall Rules

Billing is currently mock/provider-contract oriented.

- Do not present mock billing as real production payment.
- Do not convert mock checkout into production billing unless the task explicitly asks for real billing integration.
- Keep paywall logic behind existing billing/entitlement helpers instead of scattering plan checks across pages.
- Mock upgrade must remain safe for public demo: no real charge, clear copy, local entitlement unlock.
- Do not hardcode provider-specific assumptions such as Stripe, VNPay, or MoMo unless the task requires that provider.

## Firebase, Env, and Secrets Rules

- Never hardcode real secrets, API keys, service account JSON, private keys, tokens, emails, or passwords.
- Do not commit `.env`, `.env.local`, `backend/.env`, service account JSON files, or downloaded secret files.
- Use `.env.example`, `backend/.env.example`, README, and deployment docs to document required env names.
- Keep demo mode runnable without Firebase and without backend.
- In real/full-stack mode, guard Firebase and backend-only behavior when env or auth is not ready.
- Backend Firebase private keys should stay in env form with escaped `\n`, not source code.

## Frontend Verification

After frontend changes, choose the smallest relevant set first, then broaden if the touched surface is shared:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Use `npm run check` when the change affects broad frontend behavior.

For route/UI changes that affect the public demo, also consider:

```bash
npm run smoke:prod
```

If production smoke cannot run because credentials or deployment are missing, report that clearly.

## Backend Verification

After backend changes, run:

```bash
npm --prefix backend run typecheck
npm --prefix backend run build
```

Or:

```bash
npm --prefix backend run check
```

For full-stack sync changes, also consider:

```bash
node scripts/check-runtime-env.mjs
node scripts/check-runtime-env.mjs --full-stack
```

If these fail due to missing env, MongoDB, Firebase, or backend health, report the exact blocker and the env/setup needed to rerun.

## Documentation Rules

- Keep docs aligned with code. If docs and code disagree, either fix the doc in scope or report the mismatch.
- Do not delete backlog/guideline files unless explicitly asked.
- For MVP scope, follow `guidelines/MVP_1_SCOPE.md`.
- For current capability claims, follow `guidelines/CURRENT_PROJECT_STATUS.md`.

## Final Output Rules

Every completed task should report:

- Files changed.
- What changed and why.
- Commands run and their results.
- Any command not run and why.
- Remaining risks, TODOs, or assumptions.

If a bug cannot be safely fixed in the requested scope, document it in the final response and, when requested, add a clear TODO or guideline note instead of making a risky large change.
