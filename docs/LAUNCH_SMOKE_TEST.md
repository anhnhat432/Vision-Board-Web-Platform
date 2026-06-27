# Launch Smoke Test

Fast production/staging smoke test for the Vision Board backend and launch-critical manual flows.

Run this after every staging or production deploy, after changing billing/auth/sync env, and before opening a release to real users.

Safety defaults:

- No real payment is created.
- No account is deleted unless `SMOKE_ALLOW_DESTRUCTIVE=true`.
- No valid Casso webhook simulation is sent unless `SMOKE_ALLOW_WEBHOOK_SIMULATION=true`.
- Secrets, tokens, and order IDs are supplied through env only and are never printed.

---

## When to run

Run the automated smoke test:

1. After a backend deploy finishes and the service reports healthy.
2. After changing Render env vars for MongoDB, Firebase Admin, CORS, billing, or Casso.
3. After changing frontend `VITE_API_BASE_URL`, `VITE_APP_MODE`, Firebase, or billing env.
4. Before enabling paid checkout for a new production release.
5. After rollback, to confirm the old revision still serves launch-critical routes.

Run the manual checklist after the automated smoke passes, especially before production launch.

---

## Environment variables

| Variable | Required | Purpose | Safety note |
| --- | --- | --- | --- |
| `SMOKE_BASE_URL` | Yes | Backend base URL. Accepts either `https://api.example.com` or `https://api.example.com/api`. | Must target backend, not frontend SPA. |
| `SMOKE_FRONTEND_ORIGIN` | Yes for CORS check | Frontend origin expected in `Access-Control-Allow-Origin`. | Example: `https://app.example.com`. |
| `SMOKE_AUTH_TOKEN` | Optional | Firebase ID token for authenticated protected endpoint checks. | Never paste into docs or logs. Use a disposable test user when possible. |
| `SMOKE_TEST_ORDER_ID` | Optional | Existing safe test order ID for public order-status check. | Script does not create an order by default. |
| `SMOKE_CASSO_SECRET` | Optional | Casso webhook secret for valid webhook simulation. | Use staging/dev only unless a production simulation plan exists. |
| `SMOKE_ALLOW_DESTRUCTIVE` | Optional | Must equal `true` to call account delete. | Use only with a disposable smoke account. |
| `SMOKE_ALLOW_WEBHOOK_SIMULATION` | Optional | Must equal `true` to send a valid Casso webhook simulation. | Keep disabled in production by default. |

---

## Commands

### Local backend

Start backend first with safe local env:

```bash
npm --prefix backend run dev
```

Then run smoke in another terminal:

```bash
SMOKE_BASE_URL=http://localhost:4000 \
SMOKE_FRONTEND_ORIGIN=http://localhost:5173 \
npm run smoke:launch
```

PowerShell:

```powershell
$env:SMOKE_BASE_URL="http://localhost:4000"
$env:SMOKE_FRONTEND_ORIGIN="http://localhost:5173"
npm run smoke:launch
```

### Staging

```bash
SMOKE_BASE_URL=https://vision-board-api-staging.example.com \
SMOKE_FRONTEND_ORIGIN=https://vision-board-staging.example.com \
SMOKE_AUTH_TOKEN="$FIREBASE_ID_TOKEN" \
SMOKE_TEST_ORDER_ID="$SAFE_TEST_ORDER_ID" \
npm run smoke:launch
```

Optional staging webhook simulation with an empty transaction list:

```bash
SMOKE_BASE_URL=https://vision-board-api-staging.example.com \
SMOKE_FRONTEND_ORIGIN=https://vision-board-staging.example.com \
SMOKE_CASSO_SECRET="$CASSO_WEBHOOK_SECRET" \
SMOKE_ALLOW_WEBHOOK_SIMULATION=true \
npm run smoke:launch
```

Optional destructive account-delete check with a disposable user only:

```bash
SMOKE_BASE_URL=https://vision-board-api-staging.example.com \
SMOKE_FRONTEND_ORIGIN=https://vision-board-staging.example.com \
SMOKE_AUTH_TOKEN="$DISPOSABLE_FIREBASE_ID_TOKEN" \
SMOKE_ALLOW_DESTRUCTIVE=true \
npm run smoke:launch
```

### Production

Default production run should stay safe:

```bash
SMOKE_BASE_URL=https://vision-board-api.example.com \
SMOKE_FRONTEND_ORIGIN=https://app.example.com \
SMOKE_AUTH_TOKEN="$PRODUCTION_TEST_USER_ID_TOKEN" \
SMOKE_TEST_ORDER_ID="$SAFE_PRODUCTION_TEST_ORDER_ID" \
npm run smoke:launch
```

Do not set `SMOKE_ALLOW_DESTRUCTIVE=true` in production unless the token belongs to a disposable account created specifically for this run.

Do not set `SMOKE_ALLOW_WEBHOOK_SIMULATION=true` in production unless launch owner has approved a webhook simulation plan.

---

## Automated checklist

`npm run smoke:launch` checks:

1. `GET /api/health` returns `200` and `success=true`.
2. CORS preflight from `SMOKE_FRONTEND_ORIGIN` returns matching `Access-Control-Allow-Origin` and credentials support.
3. `GET /api/billing/checkout-info` is public and reachable.
4. `GET /api/billing/public-order-status/:orderId` is public. With `SMOKE_TEST_ORDER_ID`, expected `200`; without it, expected safe `404 order_not_found` for dummy order.
5. `GET /api/account/export` without auth returns `401`.
6. `DELETE /api/account/delete` without auth returns `401`.
7. `GET /api/billing/webhook/casso/health` returns `200`.
8. `POST /api/billing/webhook/casso` with invalid signature returns `401`.
9. `GET /api/sync/12-week/pull` without auth returns `401`.
10. With `SMOKE_AUTH_TOKEN`, `GET /api/account/export` returns `200`.
11. With `SMOKE_AUTH_TOKEN`, `GET /api/sync/12-week/pull` returns `200`.
12. With `SMOKE_ALLOW_DESTRUCTIVE=true`, authenticated account delete returns `200`.
13. With `SMOKE_ALLOW_WEBHOOK_SIMULATION=true` and `SMOKE_CASSO_SECRET`, a valid empty Casso webhook returns `200`.

The script exits non-zero on failures or blocking missing config. It does not catch errors and mark them as pass.

---

## Manual checklist

After the automated smoke passes:

1. Open the production frontend and confirm it loads with no console boot errors.
2. Sign up with a new user and verify email flow if enabled.
3. Log in with an existing user and confirm Settings shows signed-in state.
4. Open upgrade/paywall flow and create a checkout QR.
5. Verify QR displays the expected amount, receiving bank, account name, and transfer content/order ID.
6. Do not send real money in production unless there is an approved launch test plan.
7. Confirm `/privacy`, `/terms`, and support/contact path are reachable from the paid flow.
8. Create or open a 12-week plan, add one Today action/check-in, refresh, and confirm local state persists.
9. With a signed-in account, confirm sync indicator reaches synced or shows an actionable error, not silent failure.
10. On a second browser/device, sign in and confirm basic 12-week cloud restore/pull works.
11. Export account from Settings and confirm a downloadable export is produced.
12. Verify account delete UI uses explicit irreversible confirmation. Do not delete a real user account.

---

## Expected result

Automated run should end with:

```text
Launch smoke summary
passed: <number>
failed: 0
skipped: <number>
recommendation: GO for safe automated subset. Complete skipped manual/flagged checks before final production go.
```

For final production go, expected state:

- Staging proof runbook `docs/ops/staging-proof-runbook.md` is followed and evidence is recorded.
- `failed: 0`.
- No blocking skips.
- Authenticated account export and 12-week sync pull pass using a production test user.
- Email verification staging smoke passes through `.github/workflows/email-verification-e2e-staging.yml` or an equivalent disposable staging run.
- Destructive account delete either passes against a disposable account or is documented as manually verified in staging.
- Account-delete staging smoke passes through `.github/workflows/account-delete-e2e-staging.yml` or an equivalent disposable staging run.
- Valid Casso webhook simulation either passes in staging or is covered by provider dashboard test plan.
- Manual frontend/billing/sync checklist passes.

---

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `SMOKE_BASE_URL is required` | Missing backend URL. | Set `SMOKE_BASE_URL` to backend host, not frontend SPA. |
| Health fails with network error | Backend down, wrong URL, DNS/TLS issue. | Check deploy logs and `curl <base>/api/health`. |
| CORS preflight fails | `FRONTEND_ORIGIN` host env mismatch. | Set backend `FRONTEND_ORIGIN` to exact frontend origin, no path, no wildcard. |
| Checkout info fails | Public billing routes not mounted or rate limited. | Check `/api/billing/checkout-info` and billing env. |
| Public order status returns `400` | Test order ID format invalid. | Use format `VB` + 8 uppercase alphanumeric chars. |
| Account export without auth does not return `401` | Auth middleware order broken. | Check `backend/src/routes/index.ts`. Protected routes must mount after `authMiddleware`. |
| Invalid Casso webhook does not return `401` | Signature verification route broken or webhook route not mounted before generic handler. | Check `backend/src/routes/webhookRoutes.ts` and `backend/src/controllers/cassoWebhookController.ts`. |
| Authenticated checks return `401` | Firebase ID token expired, wrong project, or backend Firebase Admin env mismatch. | Refresh token from current frontend session and verify `FIREBASE_PROJECT_ID`. |
| Authenticated sync returns `403 EMAIL_NOT_VERIFIED` | Test user email is not verified. | Verify test user email or use a verified smoke user. |
| Valid webhook simulation returns `401` | Wrong secret or signature algorithm/env alias mismatch. | Confirm staging uses the same Casso secret name and value. Never print the value. |
| Script exits non-zero with skips | Required env for blocking check missing. | Provide `SMOKE_FRONTEND_ORIGIN` and rerun. |

---

## Go/No-Go decision

Go when all are true:

- Automated smoke has `failed: 0`.
- No blocking skips remain.
- Authenticated protected checks pass with a real Firebase test user.
- Billing QR manual check confirms amount, account, and transfer content.
- Invalid Casso webhook is rejected with `401`.
- Valid Casso webhook path is verified in staging or through approved provider dashboard test.
- 12-week sync basic manual cross-device check passes.
- Account export works; account delete safety UX is verified without deleting a real user.

No-Go if any are true:

- Health, CORS, auth guard, invalid webhook rejection, billing public endpoint, or basic sync readiness fails.
- Frontend points to the wrong API host.
- Checkout creates wrong amount/content or appears to be mock/demo in real mode.
- Protected endpoints accept unauthenticated requests.
- Account delete can be triggered without explicit confirmation.
- Production env or smoke logs reveal secrets.
