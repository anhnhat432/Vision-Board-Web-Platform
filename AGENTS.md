# AGENTS.md

## Communication Language

- Always reply to the user in Vietnamese by default.
- If the user writes in English or another language, still respond in Vietnamese unless the user explicitly asks for another response language.
- Keep file names, variable names, function names, commands, package names, APIs, routes, env vars, code snippets, terminal output, and error messages in their original language.
- Explain code, implementation decisions, verification results, risks, and next steps in concise, natural Vietnamese.
- Do not translate identifiers or source code into Vietnamese.

## Project Overview

Vision Board Web Platform is a local-first **production web app** with a full-stack backend. The product turns a life vision into SMART goals, feasibility checks, 12-week execution plans, weekly action, and reflection.

Current product priority:

```text
Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility Check -> 12-Week Plan -> Weekly Execution -> Reflection/Review
```

**App is launching for real end users.** Backend sync, Firebase login, real billing, and provider integrations are **required production layers**, not optional demo flair.

Demo mode (`VITE_APP_MODE=demo`) still exists for preview deployments and marketing pages, but must not leak demo-only copy, mock checkout routes, or "trial on this browser" wording into production builds.

Production targets:

- Vercel main domain runs `VITE_APP_MODE=real`.
- Preview branches and marketing demos may run `VITE_APP_MODE=demo`.
- All copy, route registration, and CTA behaviour must branch correctly on `isRealMode()` / `isDemoMode()`.

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

- Frontend on Vercel as a SPA with `vercel.json` rewrites. **Production Vercel env must set `VITE_APP_MODE=real`.**
- Backend on Render through `render.yaml` with MongoDB + Firebase Admin configured.
- `.env.production` provides a safe local-first fallback but **host env vars override it** and must be set explicitly in real-mode deployments.
- Sentry, analytics, and billing provider env vars (`VITE_BILLING_SUPPORT_EMAIL`, payment endpoints) must be set in real-mode deployments.

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
- `guidelines/MVP_1_SCOPE.md`: historical MVP 1 scope (kept for reference; **superseded** by the production launch — verify against current status doc before relying on it).
- `guidelines/PRODUCTION_ROADMAP.md`: active production roadmap and release-readiness items.
- `guidelines/VercelDeploymentChecklist.md`: deployment mode notes.

## Product Scope Rules

- Do not expand scope randomly.
- Prefer the core flow over side features.
- Do not turn the product into a generic planner, social app, AI coach, or payment platform unless the task explicitly asks for that.
- **Production priorities**: real-mode safety, real billing flow correctness, auth flows (signup / signin / password reset / email verification), data export and account deletion, sync reliability, accessibility, and the 12-week execution surface (setup, Today, weekly review, progress).
- Demo-mode polish is now secondary unless the task explicitly targets preview/marketing deployments.
- Vision board, achievements, and admin orders remain side surfaces — keep them out of the main flow unless the task explicitly asks.

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

LocalStorage is the primary UX source of truth for most frontend flows. Even in real mode, the app must remain usable while sync is in-flight or offline.

- Treat `src/app/utils/storage.ts`, `storage-types.ts`, `storage-twelve-week.ts`, and related storage modules as compatibility-sensitive.
- Do not rename storage keys, change stored shapes, or clear local data casually.
- If changing `UserData`, `Goal`, `TwelveWeekSystem`, billing, entitlement, event log, or outbox shapes, add or update normalization/migration logic.
- Preserve existing local-first behavior: local save should succeed even when backend/Firebase is unavailable.
- Add focused tests for migrations or normalization when changing persisted shapes.
- Never make backend sync a hard requirement for the basic 12-week execution loop. Sync is required for cross-device continuity but the in-session experience must not break when sync is unavailable.

## Backend Sync Rules

- Backend sync is best-effort at the per-call level, but **production users expect cross-device continuity to work**. Track and surface sync failures rather than swallowing them.
- Protected backend calls require Firebase auth readiness and a signed-in user.
- Demo mode must not call protected backend sync paths.
- Local data should be saved before remote sync.
- Remote sync failures must not destroy local user progress.
- Use existing API services and link stores rather than ad hoc fetch calls.
- Surface a visible sync state (synced / syncing / offline / error) somewhere in the UI for signed-in real-mode users so they know their data is or is not safe on the server.

## Billing and Paywall Rules

Billing has three modes (`local_test`, `mock_provider`, `api_contract`) selected via env. Real-mode production uses `api_contract` against the backend `/billing/*` endpoints.

- Do not present mock billing as real production payment. Mock copy ("không thu tiền thật", "bản dùng thử trên trình duyệt") must not appear in real mode.
- Mock billing routes (`/billing/mock-checkout`) must be gated to demo mode only in production routing.
- The real billing flow goes through `apiContractBillingProvider` in `src/app/utils/production/billingProvider.ts` and must respect the contract: do not unlock entitlements from the checkout-session response — wait for the entitlement sync or webhook confirmation.
- Keep paywall logic behind existing billing/entitlement helpers (`usePlanEntitlements`, `UpgradePaywallDialog`) instead of scattering plan checks across pages.
- Do not hardcode provider-specific assumptions such as Stripe, VNPay, or MoMo unless the task explicitly targets that provider.
- Provide a customer portal (cancel / refund / manage) link for real-mode `PLUS` users.
- Real-mode trial countdown copy must not mention "trên trình duyệt này"; use "trên tài khoản này" or similar account-bound language.

## Firebase, Env, and Secrets Rules

- Never hardcode real secrets, API keys, service account JSON, private keys, tokens, emails, or passwords.
- Do not commit `.env`, `.env.local`, `backend/.env`, service account JSON files, or downloaded secret files.
- Use `.env.example`, `backend/.env.example`, README, and deployment docs to document required env names.
- Keep demo mode runnable without Firebase and without backend.
- In real/full-stack mode, guard Firebase and backend-only behavior when env or auth is not ready, but **fail loud** if a production deployment is missing required env (e.g. log an error to Sentry on boot).
- Backend Firebase private keys should stay in env form with escaped `\n`, not source code.

## Production Mode Safety Rules

These rules apply specifically to real-mode (production-bound) work. They override demo-friendly shortcuts where they conflict.

- `VITE_APP_MODE` default fallback should be `"real"`, not `"demo"`. A missing or malformed env value must never silently downgrade a production deployment to demo mode.
- Routes that exist only for demo (`/billing/mock-checkout`, demo seeders, debug UIs gated by `VITE_SHOW_BILLING_DEBUG` or `VITE_SHOW_SYNC_DEBUG`) must not register or render in real mode.
- Copy strings must be audited for demo-only phrasing: `"dùng thử"`, `"không cần đăng nhập"`, `"trên trình duyệt này"`, `"không thu tiền thật"`, `"mock"`, `"demo"`. In real mode these must either disappear or be replaced with account-bound, production-appropriate language.
- Destructive actions (delete account, delete cloud workspace, wipe local data, cancel subscription) must use the in-app `AlertDialog` component, not `window.confirm`. Provide a clear two-step confirmation when the action is irreversible.
- `beforeunload` listeners must set both `event.preventDefault()` and `event.returnValue = ""` to actually trigger modern Chromium / Firefox / Safari unload warnings.
- Auth flows that real users expect must exist: signup, signin, sign-out, password reset, email verification banner, error messages that distinguish wrong-password from no-account.
- Legal pages (`/privacy`, `/terms`, `/contact` or footer support email) must exist before any paid transaction is allowed.
- Account export and account deletion must be reachable from Settings with clear copy and irreversible-action confirmations.

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

## LWW Sync E2E Tests

Playwright E2E tests for Last-Write-Wins auto-resolve sync conflicts.

### Setup

```bash
# Required env vars
export LWW_E2E_URL=https://your-staging-url.com
export LWW_E2E_EMAIL=test@example.com
export LWW_E2E_PASSWORD=your-password

# Run tests
npm run test:e2e:lww

# Or with inline env vars
LWW_E2E_URL=https://your-staging-url.com LWW_E2E_EMAIL=test@example.com LWW_E2E_PASSWORD=your-password npm run test:e2e:lww
```

### Test Cases

1. **Local wins** — Context A modifies task → offline A → Context B modifies same task (cloud wins temporarily) → A comes online with newer timestamp → both contexts show A's version
2. **Cloud wins** — Context A modifies task → sync → offline A → Context B modifies same task (cloud newer) → A comes online → both show B's version
3. **Tombstone wins** — Context A has pending mutation → Context B deletes goal (tombstone) → A comes online → goal disappears on both, A's pending mutation archived

### Requirements

- Staging/preview deployment with `VITE_APP_MODE=real`
- Test account with credentials
- Backend sync endpoints available
- No hardcoded secrets in test files

### CI Integration

To add to CI/CD, create a workflow step that:
1. Sets up env vars from secrets
2. Runs `npm run test:e2e:lww`
3. Reports results (HTML report in `playwright-report/`)

### Risks

- DOM selectors depend on current UI structure (selectors may need update if UI changes)
- Test data cleanup relies on prefix matching (`[LWW-E2E-{timestamp}]`)
- Requires authenticated staging environment

## Documentation Rules

- Keep docs aligned with code. If docs and code disagree, either fix the doc in scope or report the mismatch.
- Do not delete backlog/guideline files unless explicitly asked.
- For active production roadmap, follow `guidelines/PRODUCTION_ROADMAP.md`.
- For current capability claims, follow `guidelines/CURRENT_PROJECT_STATUS.md`.
- `guidelines/MVP_1_SCOPE.md` is historical reference only and may not reflect current scope; verify with the production roadmap before citing it.

## Final Output Rules

Every completed task should report:

- Files changed.
- What changed and why.
- Commands run and their results.
- Any command not run and why.
- Remaining risks, TODOs, or assumptions.

If a bug cannot be safely fixed in the requested scope, document it in the final response and, when requested, add a clear TODO or guideline note instead of making a risky large change.

## Imported Claude Cowork project instructions
