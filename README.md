# Vision Board Web Platform

Full-stack web app for turning a life vision into SMART goals, feasibility checks, 12-week execution plans, weekly action, and reflection.

Live production demo: https://vision-board-web-platform.vercel.app

Hướng dẫn sử dụng (tiếng Việt): [docs/HUONG_DAN_SU_DUNG.md](docs/HUONG_DAN_SU_DUNG.md)

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

## Vision Board

- Story Mode wizard with 4 steps: feelings, life areas, core quote, and theme.
- 5 themes: Aurora / Sunset / Forest / Night Sky / Minimal.
- 4 item types: images, quotes, icons, and goal cards linked to existing SMART goals.
- Toggleable life area zones on the canvas.
- Item controls popover for size preset, life area, image frame, and quote font.
- PNG export for phone wallpaper (9:16), desktop wallpaper (16:9), and square social sharing (1:1).

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
- backend-only sync is skipped unless the app is in `real` mode with Firebase auth ready

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

If `VITE_APP_MODE=real` is set but Firebase client values are missing, the login page shows the existing
configuration notice and protected/backend sync paths do not call the API until auth is ready.

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

### Optional: real paid billing with Casso + VietQR

The app supports a Casso + VietQR billing path. In real mode, the frontend creates a bank-transfer order through the backend, shows a VietQR checkout page, and premium entitlements are granted only after a verified Casso webhook marks the matching order as paid.

Frontend env:

```env
VITE_APP_MODE=real
VITE_API_BASE_URL=http://localhost:4000/api
VITE_BILLING_PROVIDER_MODE=api_contract
VITE_BILLING_PROVIDER_LABEL=Casso + VietQR
VITE_BILLING_SUPPORT_EMAIL=support@example.com
VITE_ENABLE_12_WEEK_MUTATION_SYNC=true
VITE_ENABLE_12_WEEK_PULL_SYNC=true
VITE_ENABLE_12_WEEK_IMPORT_DRY_RUN=true
VITE_ENABLE_12_WEEK_CLOUD_IMPORT=true
```

Backend env:

```env
BILLING_PROVIDER=casso
BILLING_REPOSITORY=mongo
CASSO_WEBHOOK_SECRET=replace-with-casso-secure-token
CASSO_BANK_ACCOUNT=your-receiving-account-number
CASSO_BANK_NAME=MB
CASSO_ACCOUNT_NAME=NGUYEN VAN A
PLUS_PRICE_VND=79000
```

Casso webhook endpoint:

```text
https://<your-backend-domain>/api/billing/webhook/casso
```

Configure Casso to send the `Secure-Token` header matching `CASSO_WEBHOOK_SECRET`. The transfer description must include the generated order code, for example:

```text
VBABCDEFGH
```

Do not set live Casso tokens or bank details in source files. Put them in Render/host environment variables.

### Optional: error monitoring with Sentry

Sentry is optional. If DSN values are blank, both apps run normally without sending events.

Frontend env:

```env
VITE_SENTRY_DSN=https://...
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.02
```

Backend env:

```env
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.05
```

Do not put private Sentry auth tokens in source files. The DSN can be set in Vercel and Render project environment variables.

### Optional: MongoDB backups

Atlas M0 does not include automatic backups. The repository includes a local backup script that uses MongoDB Database Tools `mongodump`.

Install MongoDB Database Tools first, then verify without creating a dump:

```powershell
npm run backup:mongo:dry-run
```

Create a compressed archive:

```powershell
npm run backup:mongo
```

The script reads `MONGODB_URI` from the current shell first, then falls back to `backend/.env`. Archives are written to `backups/mongodb` by default, and `backups/` is ignored by git.

Optional backend env:

```env
MONGODB_BACKUP_DIR=backups/mongodb
MONGODB_BACKUP_RETENTION_DAYS=14
MONGODUMP_BIN=mongodump
GPG_BIN=gpg
MONGODB_BACKUP_GPG_PASSPHRASE=
MONGODB_BACKUP_R2_PREFIX=mongodb/vision-board
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
```

When `MONGODB_BACKUP_GPG_PASSPHRASE` is set, the script also creates an encrypted `.archive.gz.gpg` file. When the complete `R2_*` config is set, it uploads that encrypted file to Cloudflare R2, verifies it with a `HEAD` request, and prunes old encrypted R2 backups using the same retention window. The script refuses R2 upload without a GPG passphrase.

For production, run this from a trusted operator machine or a secure scheduled job that has access to `MONGODB_URI`. Do not upload unencrypted backups to public CI artifacts. To restore, test on staging first:

```powershell
mongorestore --uri "$env:MONGODB_URI" --archive="backups/mongodb/<backup>.archive.gz" --gzip
```

#### Scheduled GitHub Actions backup to Cloudflare R2

The workflow `.github/workflows/mongodb-backup-r2.yml` runs daily at 03:00 Asia/Saigon, creates a `mongodump` archive, encrypts it with GPG, uploads only the encrypted `.archive.gz.gpg` file to Cloudflare R2, and prunes encrypted R2 backups older than the retention window.

Create a private R2 bucket, then add these GitHub repository secrets:

```text
MONGODB_URI
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
MONGODB_BACKUP_GPG_PASSPHRASE
```

Optional GitHub repository variables:

```text
MONGODB_BACKUP_R2_PREFIX=mongodb/vision-board
MONGODB_BACKUP_RETENTION_DAYS=30
```

Use a database user with the minimum read permissions required for backup. Keep the R2 bucket private and keep `MONGODB_BACKUP_GPG_PASSPHRASE` outside the repository.

Restore flow:

```bash
aws --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" \
  s3 cp "s3://$R2_BUCKET/mongodb/vision-board/<backup>.archive.gz.gpg" ./backup.archive.gz.gpg

gpg --batch --decrypt --output ./backup.archive.gz ./backup.archive.gz.gpg
mongorestore --uri "$MONGODB_URI" --archive="./backup.archive.gz" --gzip
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
npm run test:run   # fast/default Vitest group: unit/logic .ts tests
npm run test:ui    # component/page .tsx tests without flow/sync suites
npm run test:flows # core flow and e2e-like Vitest tests
npm run test:sync  # local/cloud sync and queue tests
npm run test:slow  # ui + flow + sync Vitest groups
npm run test:changed
npm run test:all   # full Vitest suite
npm run check:changed
npm run build
npm run check      # daily fast check
npm run check:full # full frontend release gate
```

For small edits, use `check:changed` first. It only lints frontend files changed
from `HEAD`, runs changed test files directly, and runs fast related tests for
changed `src` source files. `npm run check` is the daily pre-commit gate and
runs `typecheck`, `lint`, the fast Vitest group, and `build`. Use `check:full`
before release-sensitive changes because it runs the full frontend Vitest suite
through `test:all`.

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

`check:all` runs the full frontend gate plus the backend check.

Production smoke e2e:

```powershell
npm run smoke:prod
```

By default this opens the live Vercel site and requires a fixed QA account. It fails before launching a browser if `PROD_SMOKE_EMAIL` or `PROD_SMOKE_PASSWORD` is missing, so local and CI smoke runs do not create production users by accident.

```powershell
$env:PROD_SMOKE_EMAIL="codex.qa@example.com"
$env:PROD_SMOKE_PASSWORD="replace-with-qa-password"
npm run smoke:prod
```

To create that fixed QA account once:

```powershell
$env:PROD_SMOKE_AUTH_MODE="signup"
npm run smoke:prod
Remove-Item Env:\PROD_SMOKE_AUTH_MODE
```

To intentionally create a generated disposable QA account instead, opt in explicitly:

```powershell
$env:PROD_SMOKE_ALLOW_GENERATED_ACCOUNT="1"
npm run smoke:prod
Remove-Item Env:\PROD_SMOKE_ALLOW_GENERATED_ACCOUNT
```

Optional target override:

```powershell
$env:PROD_SMOKE_URL="https://vision-board-web-platform.vercel.app"
```

GitHub Actions:

The workflow `.github/workflows/production-smoke-e2e.yml` runs the same production smoke test from GitHub. It runs on a daily schedule at 08:00 Asia/Saigon and can also be run manually. Configure repository secrets first:

- `PROD_SMOKE_EMAIL`
- `PROD_SMOKE_PASSWORD`

Do not set `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT` in the scheduled workflow. Generated signup is for one-off operator runs only.

To run it manually, open GitHub Actions -> Production smoke e2e -> Run workflow. The workflow intentionally fails if those secrets are missing so CI does not create a new QA user every run.

Account deletion staging smoke:

```powershell
$env:ACCOUNT_DELETE_E2E_URL="https://your-staging-url.example"
$env:ACCOUNT_DELETE_E2E_ALLOW="DELETE_TEST_ACCOUNT"
npm run test:e2e:account-delete
```

By default this creates a generated disposable `codex.qa+delete-...@example.com` account, deletes it through Settings, verifies the backend delete response, and checks local data cleanup. To use a fixed disposable account, the email must clearly contain `+delete`:

```powershell
$env:ACCOUNT_DELETE_E2E_EMAIL="codex.qa+delete@example.com"
$env:ACCOUNT_DELETE_E2E_PASSWORD="replace-with-disposable-password"
$env:ACCOUNT_DELETE_E2E_AUTH_MODE="signin"
npm run test:e2e:account-delete
```

GitHub Actions workflow `.github/workflows/account-delete-e2e-staging.yml` runs the same destructive staging check manually. It requires the `allow_delete` input to be exactly `DELETE_TEST_ACCOUNT` and repository secrets:

- `ACCOUNT_DELETE_E2E_EMAIL`
- `ACCOUNT_DELETE_E2E_PASSWORD`

The email secret must be a disposable account containing `+delete`, `.delete`, `_delete`, or `-delete`.

Email verification staging smoke:

```powershell
$env:EMAIL_VERIFICATION_E2E_URL="https://your-staging-url.example"
$env:EMAIL_VERIFICATION_E2E_ALLOW="CREATE_TEST_ACCOUNT"
npm run test:e2e:email-verification
```

By default this creates a generated disposable `codex.qa+verify-...@example.com` account, confirms the unverified-email banner is visible on `/billing/plan`, checks the resend cooldown, and verifies the paid checkout guard when checkout is otherwise enabled. To use a fixed disposable account, the email must clearly contain `+verify`:

```powershell
$env:EMAIL_VERIFICATION_E2E_EMAIL="codex.qa+verify@example.com"
$env:EMAIL_VERIFICATION_E2E_PASSWORD="replace-with-disposable-password"
npm run test:e2e:email-verification
```

GitHub Actions workflow `.github/workflows/email-verification-e2e-staging.yml` runs the same staging check manually. It requires the `allow_create` input to be exactly `CREATE_TEST_ACCOUNT`. Optional repository secrets:

- `EMAIL_VERIFICATION_E2E_EMAIL`
- `EMAIL_VERIFICATION_E2E_PASSWORD`

If `EMAIL_VERIFICATION_E2E_EMAIL` is set, it must be a disposable account containing `+verify`, `.verify`, `_verify`, or `-verify`.

Operator run order and evidence checklist live in `docs/ops/staging-proof-runbook.md`.

LWW cross-device staging smoke:

```powershell
$env:LWW_E2E_URL="https://your-staging-url.example"
$env:LWW_E2E_EMAIL="codex.qa+lww@example.com"
$env:LWW_E2E_PASSWORD="replace-with-disposable-password"
npm run test:e2e:lww
```

This verifies the three 12-week sync conflict paths that must be proven before launch: local-newer wins, cloud-newer wins, and tombstone beats a pending local mutation. The GitHub Actions workflow `.github/workflows/lww-e2e-staging.yml` runs the same check manually against a staging/preview URL and intentionally fails if `LWW_E2E_EMAIL` or `LWW_E2E_PASSWORD` repository secrets are missing.

Environment report:

```powershell
npm run env:check
npm run env:check:full
```

`env:check` reports missing env values without failing the local demo path. `env:check:full` is stricter and should pass before testing authenticated backend sync.

## Pre-commit Hooks

Project dùng Husky + lint-staged. Sau `npm install` lần đầu, hooks sẽ tự setup qua script `prepare`.

- **pre-commit**: chạy `biome check --write` trên file đã staged (~1-2s)
- **commit-msg**: validate Conventional Commits format

Bypass khẩn cấp (KHÔNG khuyến khích): `git commit --no-verify`.

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

The checked-in `.env.production` points at the production-style real-mode defaults used by the current deployment.
Vercel project env vars should still be set explicitly so secrets and provider-specific values are owned by the host:

- `VITE_APP_MODE=real`
- `VITE_API_BASE_URL=https://your-backend.example.com/api`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_BILLING_PROVIDER_MODE=api_contract`
- `VITE_BILLING_PROVIDER_LABEL=Casso + VietQR`
- `VITE_BILLING_SUPPORT_EMAIL`
- `VITE_ENABLE_12_WEEK_MUTATION_SYNC=true`
- `VITE_ENABLE_12_WEEK_PULL_SYNC=true`
- `VITE_ENABLE_12_WEEK_IMPORT_DRY_RUN=true`
- `VITE_ENABLE_12_WEEK_CLOUD_IMPORT=true`

Backend deployment is Render-ready:

- blueprint: `render.yaml`
- backend guide: `backend/README.md`
- health path: `/api/health`

Detailed frontend deployment checklist:

- `guidelines/VercelDeploymentChecklist.md`

## Release Process

1. Đảm bảo `main` xanh CI và đã merge các PR cần thiết.
2. Bump version trong `package.json` nếu có, update `CHANGELOG.md` move `Unreleased` -> new version section.
3. Tag và push:

   ```bash
   git tag v1.0-soft-launch-rc6
   git push origin v1.0-soft-launch-rc6
   ```

4. GitHub Action `release.yml` sẽ tự chạy:
   - Verify: typecheck, lint, test, build (frontend + backend)
   - Generate release notes từ commits
   - Tạo GitHub Release (auto-detect prerelease nếu tag chứa `rc`/`beta`/`alpha`)
5. Check tab "Releases" trên GitHub.

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

## AI Assistant Integration (Production)

The app includes an AI Assistant ("Cú" - Owl mascot) designed to help users navigate and execute actions along the core product flow.

### 1. Environment Configuration

To enable the AI Assistant in production (`VITE_APP_MODE=real`), you must configure the following variables in the backend environment:

- `AI_PROVIDER`: The AI provider to use (`groq` for the current production assistant path; `gemini` remains supported for compatibility).
- `AI_API_KEY`: API key for the chosen provider. For Groq you may alternatively set `GROQ_API_KEY`.
- `AI_MODEL`: Model name for the chosen provider. For Groq you may alternatively set `GROQ_MODEL`.

If you use Gemini specifically, set:

- `GEMINI_API_KEY`: Gemini API key.
- `GEMINI_MODEL`: Fast/default Gemini model name (recommended `gemini-2.5-flash-lite`).
- `GEMINI_SMART_MODEL`: Smart Gemini model for planning, SMART goal, feasibility, reflection, and multi-step workflow prompts (recommended `gemini-3.1-flash-lite`).
- `AI_SMART_MODEL`: Optional Gemini smart-model override. When the smart Gemini model is rate-limited or unavailable, the assistant retries the fast model once.

If you use Groq specifically, you can also set:

- `GROQ_API_KEY`: Groq API Key.
- `GROQ_MODEL`: Groq Model. The current production assistant uses `meta-llama/llama-4-scout-17b-16e-instruct` (on_demand); set this explicitly so the deployment does not rely on the code default.

Live AI smoke check for a deployed backend:

```bash
AI_SMOKE_BASE_URL=https://your-backend.example.com AI_SMOKE_AUTH_TOKEN=<firebase-id-token> npm run smoke:ai
```

In demo mode (`VITE_APP_MODE=demo`), the assistant runs fully client-side using deterministic fallback prompts to ensure zero external dependency.

### 2. Action Safety Model

The assistant is strictly built under a proposal-based safety design:

- **AI Proposes**: The LLM suggests structured actions (e.g. `create_goal`, `mark_task_done`, `reschedule_task`) wrapped in JSON action blocks.
- **User Approves**: Actions are presented as visual cards with interactive previews/diffs. **No modifying action runs automatically.** The user must click "Approve" (Đồng ý) to execute.
- **Audit Log**: Every approved and executed action is logged locally under `assistant.action_audit_log` for auditing.

### 3. Local-First Sync Architecture

The assistant executes actions locally first:

- State mutations (e.g. updating task status or creating a plan draft) are written to local storage immediately.
- Once local save succeeds, the mutation is pushed to the local sync outbox queue.
- If online, the outbox queue automatically drains to sync with the MongoDB backend. If offline, changes remain safely cached locally and sync automatically when internet connection is restored.

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
