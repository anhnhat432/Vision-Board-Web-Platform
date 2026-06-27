# Production Env Checklist — Vision Board Web Platform

Hardening reference for production deploys. Use it before flipping a Vercel
project to `VITE_APP_MODE=real` or before pointing real users at a Render
backend.

This file is the **single source of truth for production environment**.
`.env.example` and `backend/.env.example` are local-dev defaults and may
contain demo values; this checklist is what the host (Vercel, Render) must
provide.

> Never paste real secrets into this file or any committed file. Reference
> variables by name only.

---

## Quick verification

After setting env on the host:

```bash
# Backend (run on Render or locally with prod env loaded)
NODE_ENV=production npm --prefix backend run check:env

# Frontend + backend cross-check
npm run env:check:full

# If using Casso billing
npm run env:check:casso

# If using PayOS billing, keep checkout locked until E2E sign-off
BILLING_PROVIDER=payos BILLING_PAID_DISABLED=true npm --prefix backend run check:env
```

`check:env` exits with code 1 if any error-level issue is found. It never
opens MongoDB, Firebase, or the network — it only inspects environment
variables. When run locally it loads `backend/.env` through `dotenv`, so a
passing local CLI report may mean the local env file is complete; it is not
proof that an empty production env would pass.

---

## Validation behaviour

`backend/src/config/env.ts` runs `validateBackendEnv` at boot when
`NODE_ENV=production`. Errors throw and prevent the server from listening.
Warnings are logged once but do not block boot.

The same validator powers `npm --prefix backend run check:env`, which
operators can run from a CI step or a Render shell to audit a deployment
without starting the HTTP server. Empty-env behavior is covered by the unit
test `validateBackendEnv({}, { nodeEnv: "production" })`; do not use a local
CLI result to claim "env is empty" unless `.env` loading has been deliberately
removed from the process.

CORS origins are validated by `parseAllowedCorsOrigins` in
`backend/src/middleware/corsOrigin.ts`. Wildcard `*`, paths/queries/hashes,
and non-HTTPS origins (other than localhost) are rejected.

---

## Required for backend (`backend/.env` on Render)

| Variable                | Used in                                                      | Example (safe)                                                                               | Risk if missing/wrong                                                                                                      | Verify                                                                                     |
| ----------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NODE_ENV`              | All env-aware code paths                                     | `production`                                                                                 | Validation skips production checks; localhost CORS fallthrough; Sentry env mislabeled.                                     | `echo $NODE_ENV` on host; `check:env` prints `(strict)` next to it.                        |
| `PORT`                  | `backend/src/config/env.ts`                                  | `4000` (Render injects automatically)                                                        | Boot crash if non-numeric or non-positive.                                                                                 | `curl $RENDER_URL/api/health` returns 200.                                                 |
| `MONGODB_URI`           | `backend/src/config/env.ts`, `backend/src/config/mongo.ts`   | `mongodb+srv://user:pass@cluster.mongodb.net/vision_board`                                   | Boot crash; sync, billing, plans all unavailable. Localhost in prod is flagged as warning.                                 | `mongosh "$MONGODB_URI" --eval 'db.runCommand({ping:1})'` from a maintenance shell.        |
| `FIREBASE_PROJECT_ID`   | `backend/src/config/firebase.ts`                             | `vision-board-prod`                                                                          | Boot crash; protected routes reject every request.                                                                         | `check:env`; later `curl /api/auth/me` with a valid ID token returns 200.                  |
| `FIREBASE_CLIENT_EMAIL` | Same                                                         | `firebase-adminsdk-xxxx@vision-board-prod.iam.gserviceaccount.com`                           | Auth verification fails; user accounts cannot sync.                                                                        | Same as above.                                                                             |
| `FIREBASE_PRIVATE_KEY`  | Same                                                         | `"-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n"` (escape newlines as `\n`) | Auth verifier crashes; signed-in users get 401.                                                                            | `check:env` validates BEGIN/END markers without printing the key.                          |
| `FRONTEND_ORIGIN`       | `backend/src/app.ts`, `backend/src/middleware/corsOrigin.ts` | `https://vision-board.example.com,https://app.example.com`                                   | Browsers blocked by CORS; checkout return URLs rejected. Wildcard `*`, http (non-localhost), or paths are refused at boot. | DevTools network log shows `Access-Control-Allow-Origin: <your origin>` on a real request. |

### Required only when paid billing runs through the backend

| Variable                | Used in                                           | Example (safe)                                                                | Risk if missing/wrong                                                                                                                                                                                                       | Verify                                                                                           |
| ----------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `BILLING_PROVIDER`      | `backend/src/services/paymentProviderRegistry.ts` | `payos` for PayOS rollout, `casso` for legacy, or `mock` for staging previews | Unknown values silently fall back to `mock`. Must match your real adapter.                                                                                                                                                  | `check:env` prints provider; `GET /api/billing/checkout-info` shows the right `provider`.        |
| `BILLING_REPOSITORY`    | `backend/src/services/billingServiceInstance.ts`  | `mongo`                                                                       | If `memory` is used in production, paid entitlements vanish on restart. `unset` in production triggers a warning.                                                                                                           | `check:env`; verify a paid user keeps `PLUS` after a forced redeploy.                            |
| `BILLING_PAID_DISABLED` | `backend/src/controllers/billingController.ts`    | `0` (or `1` to kill paid checkout)                                            | Defense-in-depth kill switch. Set to `1` while a payment provider is unavailable to return `503 checkout_disabled` instead of opening unsafe sessions. Always pair with the frontend `VITE_BILLING_PAID_CHECKOUT_DISABLED`. | `POST /api/billing/checkout-session` returns 503 with `errorCode: "checkout_disabled"` when set. |

---

## Required for frontend (Vercel project env, `VITE_*`)

| Variable                              | Used in                             | Example (safe)                                                               | Risk if missing/wrong                                                                                           | Verify                                                                                                             |
| ------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `VITE_APP_MODE`                       | `src/app/utils/app-mode.ts`         | `real`                                                                       | Unknown/blank values default to `real`; `demo` in production silently disables Firebase login and real billing. | DevTools console: missing/invalid value logs `[app-mode] Invalid VITE_APP_MODE`. Settings page shows real-mode UI. |
| `VITE_API_BASE_URL`                   | `src/lib/api/apiClient.ts`          | `https://api.vision-board.example.com/api`                                   | Frontend silently calls `http://localhost:4000/api` and every request fails.                                    | DevTools network tab targets the production API host, not localhost.                                               |
| `VITE_FIREBASE_API_KEY`               | `src/lib/auth/firebase.ts`          | `AIzaSy...` (Firebase web API key, restricted by host)                       | Login disabled; sync impossible.                                                                                | Sign-in flow opens Firebase popup successfully.                                                                    |
| `VITE_FIREBASE_AUTH_DOMAIN`           | Same                                | `vision-board-prod.firebaseapp.com`                                          | Auth popup/redirect breaks.                                                                                     | Same.                                                                                                              |
| `VITE_FIREBASE_PROJECT_ID`            | Same                                | `vision-board-prod`                                                          | Token audience mismatch with backend; 401 on every protected call.                                              | Backend logs do not show `auth/argument-error`.                                                                    |
| `VITE_FIREBASE_APP_ID`                | Same                                | `1:1234:web:abcd1234`                                                        | SDK init throws.                                                                                                | Console shows no Firebase init error.                                                                              |
| `VITE_BILLING_PROVIDER_MODE`          | `src/app/utils/production/env.ts`   | `api_contract` for real billing, `mock_provider` for previews                | Demo mock copy may surface in production paywall; real checkout silently disabled.                              | Paywall dialog labels match the real provider.                                                                     |
| `VITE_BILLING_PROVIDER_LABEL`         | Same                                | `PayOS` after rollout, or provider-neutral `Thanh toán bảo mật` while locked | Generic "Mock provider" label leaks in production UI.                                                           | Settings → Billing shows the real/provider-neutral label.                                                          |
| `VITE_BILLING_SUPPORT_EMAIL`          | `src/lib/billing/...`, refund flows | `support@example.com`                                                        | Customers cannot reach support from refund/cancel screens.                                                      | Click "Liên hệ hỗ trợ" → opens correct mailto.                                                                     |
| `VITE_BILLING_PLUS_MONTHLY_PRICE_VND` | `src/app/utils/billing-pricing.ts`  | `99000`                                                                      | Wrong price displayed to users; UX mismatch with backend `PLUS_PRICE_VND`.                                      | Paywall shows the same price the backend charges.                                                                  |
| `VITE_BILLING_PAID_CHECKOUT_DISABLED` | `src/app/utils/app-mode.ts`         | `0` (default) or `1` to disable                                              | When paired with backend `BILLING_PAID_DISABLED`, hides "Tiếp tục thanh toán" CTAs and shows support copy.      | Upgrade dialog renders the disabled-state banner when set.                                                         |

---

## Required for Casso/VietQR (when `BILLING_PROVIDER=casso`)

| Variable                                          | Used in                                                                                            | Example (safe)                                                   | Risk if missing/wrong                                                                                                                   | Verify                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `CASSO_WEBHOOK_SECRET`                            | `backend/src/controllers/cassoWebhookController.ts`, `backend/src/services/cassoPaymentAdapter.ts` | `casso_webhook_secret_value`                                     | Webhooks rejected with `401 Invalid webhook signature`. Order never moves to `completed`.                                               | Casso dashboard webhook test; backend log shows `event=casso_webhook_success`. |
| `CASSO_WEBHOOK_CHECKSUM_KEY`                      | Webhook V2 HMAC sha512 verification                                                                | `checksum_key_value`                                             | Casso V2 signed requests fail. (`CASSO_WEBHOOK_SECRET` may double as this if you only have one secret.)                                 | Same as above.                                                                 |
| `CASSO_CHECKSUM_KEY`                              | Alias for above (legacy)                                                                           | optional                                                         | Same.                                                                                                                                   | Same.                                                                          |
| `CASSO_SECURE_TOKEN`                              | Webhook secure-token header verification                                                           | optional                                                         | Legacy secure-token webhooks fail.                                                                                                      | Same.                                                                          |
| `CASSO_BANK_ACCOUNT`                              | Adapter, order status controller                                                                   | `0123456789`                                                     | Checkout cannot generate a VietQR; users cannot pay.                                                                                    | `GET /api/billing/checkout-info` returns the account number.                   |
| `CASSO_BANK_NAME`                                 | Adapter (BIN map)                                                                                  | `MB` (must match the keys in `cassoPaymentAdapter.BANK_BIN_MAP`) | VietQR URL points to wrong BIN; QR scan fails.                                                                                          | Test scan returns a real bank screen.                                          |
| `CASSO_ACCOUNT_NAME`                              | Adapter, VietQR `addInfo`                                                                          | `NGUYEN VAN A`                                                   | Payer sees blank account name in their banking app.                                                                                     | Test transfer shows the right name.                                            |
| `PLUS_PRICE_VND`                                  | Adapter, order status controller                                                                   | `99000` (must be ≥ `1000`)                                       | Validator errors on boot; checkout cannot create orders. Mismatched value vs `VITE_BILLING_PLUS_MONTHLY_PRICE_VND` causes UX confusion. | `check:env` confirms numeric ≥ 1000; UI price equals backend price.            |
| `CASSO_API_BASE_URL` (optional)                   | `backend/src/services/billingReconciliation.ts`                                                    | `https://oauth.casso.vn/v2`                                      | Reconciliation job hits the wrong API host.                                                                                             | Cron log shows successful reconciliation pulls.                                |
| `CASSO_API_KEY` / `CASSO_ACCESS_TOKEN` (optional) | Same                                                                                               | `casso_personal_token`                                           | Reconciliation cannot poll Casso transactions; only realtime webhooks work.                                                             | Reconciliation log shows `transactions_fetched > 0`.                           |

### Webhook health verification

```bash
curl -i $RENDER_URL/api/billing/webhook/casso/health
# Expected: 200 with { success: true, data: { provider: "casso", status: "ok" } }
```

Confirm the public webhook URL configured in Casso dashboard matches:

```
$RENDER_URL/api/billing/webhook/casso
```

Then trigger a small real transfer with a test order ID and check:

- Backend log: `event=casso_webhook_success`.
- `GET /api/billing/orders/<orderId>` shows `status: "completed"`.
- User entitlement at `GET /api/billing/entitlement` shows `PLUS`.

---

## Required for PayOS (when `BILLING_PROVIDER=payos`)

PayOS adapter and webhook support are available, but production checkout must stay locked with `BILLING_PAID_DISABLED=true` and `VITE_BILLING_PAID_CHECKOUT_DISABLED=true` until staging E2E and ops sign-off pass.

| Variable             | Used in                                       | Example (safe)             | Risk if missing/wrong                                                                  | Verify                                                                          |
| -------------------- | --------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `PAYOS_CLIENT_ID`    | `backend/src/services/payosPaymentAdapter.ts` | `payos_client_id`          | Checkout creation fails closed with `provider_not_configured` when kill-switch is off. | `check:env` warns while locked; errors when checkout is unlocked in production. |
| `PAYOS_API_KEY`      | Same                                          | `payos_api_key`            | PayOS SDK cannot create payment links.                                                 | Same.                                                                           |
| `PAYOS_CHECKSUM_KEY` | PayOS adapter + webhook controller            | `payos_checksum_key`       | Webhooks are rejected with `401 Invalid webhook signature`; Plus is never granted.     | Invalid webhook returns 401; valid sandbox webhook completes the order.         |
| `PLUS_PRICE_VND`     | PayOS adapter                                 | `99000` (must be ≥ `1000`) | Wrong amount or boot validation error when checkout is enabled.                        | UI price equals backend amount; amount mismatch webhook does not grant.         |

### PayOS webhook verification

```bash
curl -i $RENDER_URL/api/billing/webhook/payos/health
# Expected: 200 with provider: "payos", configured: true/false, status, timestamp
```

Configure the public webhook URL in the PayOS dashboard as:

```
$RENDER_URL/api/billing/webhook/payos
```

Rules before opening checkout:

- PayOS return/cancel URLs are navigation only and must not grant Plus.
- Plus is granted only after a verified PayOS webhook succeeds, matches a pending `PaymentOrder`, matches amount/currency, and is not expired.
- Duplicate webhook deliveries are idempotent and must not grant Plus twice.
- Keep the backend/frontend kill-switches enabled during env setup and production smoke.

---

## Required for Firebase Auth + Admin

Frontend (`VITE_FIREBASE_*`) and backend (`FIREBASE_*`) must reference the
**same project ID**, otherwise tokens minted on the client are rejected by
the backend.

Restrict the Firebase Web API key in the Firebase console to the production
domain so it cannot be used from arbitrary origins.

Service account JSON file: never commit. Store the three fields
(`project_id`, `client_email`, `private_key`) as separate Render env vars.
The validator confirms the private key has BEGIN/END markers but never logs
the contents.

Verify after deploy:

```bash
# 1. Sign in on the production frontend.
# 2. In DevTools, copy the ID token from a network request.
# 3. Hit /api/auth/me with it.
curl -i -H "Authorization: Bearer $ID_TOKEN" $RENDER_URL/api/auth/me
# Expected: 200, { uid, email, emailVerified }
```

---

## Required for MongoDB

| Variable      | Used in                       | Example (safe)                                                                                  | Risk                                                                                                                              |
| ------------- | ----------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI` | `backend/src/config/mongo.ts` | `mongodb+srv://user:pass@cluster0.example.mongodb.net/vision_board?retryWrites=true&w=majority` | Boot crash if missing. Localhost in production raises a warning — the validator does not block, but it is almost certainly wrong. |

Recommended cluster hardening:

- Enable IP access list (Render egress IPs or `0.0.0.0/0` only if the URI
  uses SCRAM auth + TLS).
- Use a dedicated user with `readWrite` on `vision_board` only.
- Enable backups; the in-repo `npm run backup:mongo` script is operator
  tooling and depends on the optional `MONGODB_BACKUP_*` and `R2_*` vars.

Verify after deploy:

```bash
curl -s $RENDER_URL/api/health | jq
# Expected: { success: true, data: { status: "ok", mongo: "connected" } }
```

---

## Optional but recommended

| Variable                                                                                                                                           | Purpose                           | Notes                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `SENTRY_DSN` (backend) / `VITE_SENTRY_DSN` (frontend)                                                                                              | Error monitoring                  | Validator warns if missing in production. Strongly recommended.                                                                 |
| `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE`                                                                                | Sentry tagging and sampling       | Backend defaults: env from `NODE_ENV`, sample rate 0.05. Frontend defaults: env from `VITE_APP_MODE`, sample rate 0.02.         |
| `BILLING_SUPPORT_EMAIL` / `SUPPORT_EMAIL`                                                                                                          | Refund and customer-portal emails | Validator warns if missing in production.                                                                                       |
| `EMAIL_PROVIDER` (`disabled` / `resend` / `smtp`)                                                                                                  | Receipt and refund emails         | When `disabled`, email-bound flows skip sending without crashing. Set to `resend` or `smtp` for production transactional email. |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SMTP_*`                                                                                         | Email transport                   | Required when `EMAIL_PROVIDER` is enabled.                                                                                      |
| `REFUND_WINDOW_DAYS`, `REFUND_MAX_USED_PERCENT`                                                                                                    | Manual refund policy              | Defaults documented in `.env.example`.                                                                                          |
| `ADMIN_EMAILS`                                                                                                                                     | Admin role bootstrap              | Comma-separated list. Used at first login to flag admin accounts.                                                               |
| `MONGODB_BACKUP_*`, `R2_*`, `MONGODUMP_BIN`, `GPG_BIN`                                                                                             | Backup script                     | Used by `scripts/backup-mongodb.mjs`. Not required for runtime.                                                                 |
| `ASSISTANT_PROVIDER` / `AI_PROVIDER`, `GROQ_API_KEY` / `GEMINI_API_KEY`, `GROQ_MODEL` / `AI_MODEL`                                                 | AI assistant feature              | Optional. Production assistant runs on Groq; set `GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct`. Falls back to code default when missing. |
| `VITE_ANALYTICS_MODE`, `VITE_GA_MEASUREMENT_ID`                                                                                                    | GA4 analytics                     | Default: `off`.                                                                                                                 |
| `VITE_OUTBOX_SYNC_ENDPOINT`, `VITE_BILLING_API_BASE`, `VITE_PUSH_VAPID_PUBLIC_KEY`, `VITE_PUSH_SUBSCRIBE_ENDPOINT`, `VITE_EMAIL_REMINDER_ENDPOINT` | Optional integrations             | Leave blank to disable.                                                                                                         |

---

## Production-mode safety reminders

These come from `AGENTS.md` and stay enforced regardless of env values:

- Real-mode default fallback for `VITE_APP_MODE` is `real`. A missing or
  malformed value never silently downgrades production to demo.
- Mock checkout routes (`/billing/mock-checkout`) and debug UIs (gated by
  `VITE_SHOW_BILLING_DEBUG` / `VITE_SHOW_SYNC_DEBUG`) must not register or
  render in production builds.
- Frontend copy must not say `dùng thử`, `trên trình duyệt này`, or
  `không thu tiền thật` in real mode.
- Destructive UX (delete account, cancel subscription, wipe local data) must
  use the in-app `AlertDialog`, not `window.confirm`.

---

## What "fail-fast" looks like

When `NODE_ENV=production` and one or more required vars are missing or
invalid, the backend **refuses to start**:

```
Error: Production environment is not safe to start. 3 error(s):
- [ERROR] mongodb/MONGODB_URI: is required and must not be empty.
- [ERROR] firebase/FIREBASE_PRIVATE_KEY: must be a PEM-formatted Firebase Admin private key (BEGIN/END markers required; escape newlines as \n).
- [ERROR] frontend/FRONTEND_ORIGIN: is required and must not be empty.
```

Render will surface this in deploy logs and keep the previous healthy
revision serving traffic.

For warnings (e.g. `BILLING_REPOSITORY` unset), the backend boots but logs
the report once at startup so on-call sees it without paging.

---

## Final pre-deploy checklist

Use `docs/ops/staging-proof-runbook.md` for the exact staging workflow inputs, repository secrets, safety markers, and evidence fields.

1. `npm --prefix backend run check:env` against the production env (errors = 0).
2. `npm run env:check:full` from the workstation pointing at the host config
   you exported (no localhost, no `*`, no missing keys).
3. Casso (if active): `curl /api/billing/webhook/casso/health` → 200.
4. PayOS (if selected): `curl /api/billing/webhook/payos/health` → 200 and configure the same URL in PayOS dashboard.
5. Firebase: sign in on the production frontend; protected API call returns
   200; sign-out clears the session.
6. MongoDB: `/api/health` reports `mongo: "connected"`.
7. Real billing: confirm `BILLING_PAID_DISABLED` is `0`, `VITE_BILLING_PAID_CHECKOUT_DISABLED` is `0`, and a small controlled provider transaction flows end to end.
8. Sentry: confirm a test error reaches the dashboard from both backend and frontend with the expected `environment` tag.
9. Production smoke: set `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD` before running `npm run smoke:prod`. Leave `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT` unset/`0` for normal operator and CI runs; use `=1` only for an explicit one-off generated QA signup.
10. Email verification staging smoke: run `.github/workflows/email-verification-e2e-staging.yml` with `allow_create=CREATE_TEST_ACCOUNT`; if `EMAIL_VERIFICATION_E2E_EMAIL` is configured, it must be disposable and include a `verify` marker.
11. Account delete staging smoke: run `.github/workflows/account-delete-e2e-staging.yml` with `allow_delete=DELETE_TEST_ACCOUNT`, disposable `ACCOUNT_DELETE_E2E_EMAIL`, and `ACCOUNT_DELETE_E2E_PASSWORD`.
12. Cross-device sync smoke: set `LWW_E2E_URL`, `LWW_E2E_EMAIL`, and `LWW_E2E_PASSWORD` before running `npm run test:e2e:lww` against staging/preview. For GitHub Actions, use `.github/workflows/lww-e2e-staging.yml` with repository secrets `LWW_E2E_EMAIL` and `LWW_E2E_PASSWORD`.
