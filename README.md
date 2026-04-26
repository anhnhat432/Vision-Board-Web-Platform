# Vision Board Web Platform

Full-stack web app for turning a life vision into SMART goals, feasibility checks, 12-week execution plans, weekly action, and reflection.

Live production demo: https://vision-board-web-platform.vercel.app

## Product Flow

The app is intentionally focused on one core journey:

```text
Onboarding
-> Life Balance
-> Life Insight
-> SMART Goal
-> Feasibility Check
-> 12-Week Plan
-> Weekly Execution
-> Reflection / Review
```

The frontend is local-first so the main product flow can be tested quickly without a backend. The backend adds authenticated sync for the 12-week planning domain.

## Tech Stack

- Frontend: React, Vite, TypeScript
- UI: existing project components, Radix primitives, Lucide icons, Tailwind CSS
- Auth: Firebase Auth
- Backend: Express, TypeScript, MongoDB/Mongoose
- Deployment: Vercel for frontend, Render-ready backend blueprint
- Testing: Vitest, Testing Library, Biome, TypeScript

## Repository Structure

```text
.
+-- src/                         Frontend app source
|   +-- app/pages/                Route-level product screens
|   +-- app/components/           Shared UI and app components
|   +-- features/plan12week/      12-week planning logic and persistence
|   +-- lib/api/                  Frontend API clients and link stores
|   +-- test/                     Frontend test helpers
+-- backend/                     Express + MongoDB API
|   +-- src/
|       +-- routes/               API route definitions
|       +-- controllers/          Request handlers
|       +-- services/             Domain rules and validation
|       +-- repositories/         Mongo-backed persistence
|       +-- models/               Mongoose models
+-- scripts/check-runtime-env.mjs Runtime env report for local/full-stack setup
+-- guidelines/                  Deployment and operating notes
+-- render.yaml                  Render backend blueprint
+-- vercel.json                  SPA rewrite for Vercel
```

## Quick Start: Frontend Demo

Use this path when you want to inspect the product, UI, and local-first flow quickly.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open:

```text
http://localhost:5173
```

Default demo settings from `.env.example`:

```env
VITE_APP_MODE=demo
VITE_API_BASE_URL=http://localhost:4000/api
VITE_BILLING_PROVIDER_MODE=mock_provider
```

In demo mode:

- the main product flow works without a running backend
- data is stored in browser `localStorage`
- billing/paywall flows use mock checkout
- Firebase values may be left empty unless you want real login/sync

## Full-Stack Local Setup

Use this path when you want real Firebase Auth, MongoDB persistence, and backend sync for plans/weeks/tasks/metrics.

### 1. Install dependencies

```powershell
npm install
npm --prefix backend install
```

### 2. Configure frontend env

```powershell
Copy-Item .env.example .env
```

Minimum full-stack values:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_APP_MODE=real
VITE_BILLING_PROVIDER_MODE=mock_provider
```

Firebase client values are required for real login and authenticated API calls:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### 3. Configure backend env

```powershell
Copy-Item backend/.env.example backend/.env
```

Required backend values:

```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/vision_board
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FRONTEND_ORIGIN=http://localhost:5173
```

Keep `FIREBASE_PRIVATE_KEY` quoted and keep `\n` escaped. The backend converts it to real line breaks at runtime.

### 4. Run the backend

```powershell
npm --prefix backend run dev
```

Health check:

```text
http://localhost:4000/api/health
```

### 5. Run the frontend

```powershell
npm run dev
```

## Verification Commands

Frontend:

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run check
```

Backend:

```powershell
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend run check
```

Full project:

```powershell
npm run check:all
```

Production smoke e2e:

```powershell
npm run smoke:prod
```

By default this opens the live Vercel site, creates a generated QA email account, and runs the signed-out home check plus the authenticated onboarding -> 12-week system flow. To reuse a fixed QA account instead of creating a new one each run:

```powershell
$env:PROD_SMOKE_EMAIL="codex.qa@example.com"
$env:PROD_SMOKE_PASSWORD="replace-with-qa-password"
npm run smoke:prod
```

Optional target override:

```powershell
$env:PROD_SMOKE_URL="https://vision-board-web-platform.vercel.app"
```

Environment report:

```powershell
npm run env:check
npm run env:check:full
```

`env:check` reports missing env values without failing the local demo path. `env:check:full` is stricter and should pass before testing authenticated backend sync.

## API Surface

All backend routes except `GET /api/health` require:

```http
Authorization: Bearer <firebase-id-token>
```

Main backend domains:

- Auth/user bootstrap
- Goals
- Plans
- Weeks
- Tasks
- Lead metrics
- Vision boards
- Orders

The 12-week planning domain is the most production-relevant backend contract today. The frontend stores local progress first, then syncs plan/week/task/metric data when auth and backend configuration are available.

## Deployment

Frontend production is configured for Vercel:

- build command: `npm run build`
- output directory: `dist`
- SPA rewrites: `vercel.json`
- live alias: https://vision-board-web-platform.vercel.app

Backend deployment is Render-ready:

- blueprint: `render.yaml`
- backend guide: `backend/README.md`
- health path: `/api/health`

Detailed frontend deployment checklist:

- `guidelines/VercelDeploymentChecklist.md`

## Portfolio Review Notes

What this project demonstrates:

- end-to-end product flow from self-assessment to execution
- local-first UX with graceful backend sync
- authenticated Express/Mongo API boundaries
- 12-week planning domain with plans, weeks, tasks, and metrics
- route-level loading, empty, error, and fallback states
- production deployment and smoke-tested Vercel build

Current intentional limitations:

- billing is mock/provider-contract focused, not a real payment integration
- the product is web-only; there is no mobile app target
- localStorage remains the primary UX source of truth for most non-plan data
- full backend sync requires Firebase and MongoDB env configuration

## Troubleshooting

Frontend opens but backend sync fails:

- confirm backend is running
- confirm `VITE_API_BASE_URL=http://localhost:4000/api`
- confirm the user is logged in with Firebase
- confirm backend Firebase service account matches the frontend Firebase project

API returns `401`:

- frontend is missing a valid Firebase ID token
- Firebase client env is incomplete
- backend Firebase project does not match the frontend project

`env:check` reports missing backend env:

- this is expected for frontend-only demo mode
- use `env:check:full` only when running authenticated backend sync

Vercel refresh gives 404:

- confirm `vercel.json` is present and rewrites all routes to `/index.html`

## Definition of Done for Future Changes

For every meaningful change:

- keep scope small and aligned with the core flow
- run the most relevant frontend/backend checks
- verify loading, empty, error, and success states when touching user flows
- report commands run and any remaining failure clearly
