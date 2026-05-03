# MVP 2 Sync Staging Testing

## Overview

`scripts/smoke-mvp2-sync-staging.mjs` is a CI/staging-friendly E2E smoke test for the MVP 2 cloud sync flow. It uses `agent-browser` (same tool as production smoke) to exercise the full sync lifecycle on a staging/preview deployment.

## What It Tests

The script runs in phases. Phase 0 always runs; phases 1–7 require authentication.

| Phase | Step                    | Description                                                                                                                                                         |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | **Signed-out guard**    | Load app without auth, navigate to `/12-week-system`, verify no protected API requests fire (no `/api/sync/`, `/api/goals`, `/api/tasks`, `/api/auth/profile` spam) |
| 1     | **Authenticate**        | Sign in with test credentials                                                                                                                                       |
| 1     | **Clear & seed**        | Clear browser storage, re-authenticate, seed a local 12-week system with `[SMOKE-{ts}]` prefix                                                                      |
| 2     | **Toggle task**         | Complete a Today task and verify local persistence                                                                                                                  |
| 2     | **Daily check-in**      | Fill and save the daily check-in form (skipped if form not visible)                                                                                                 |
| 2     | **Weekly review**       | Fill and save the weekly review form (skipped if form not visible)                                                                                                  |
| 3     | **Manual sync (1st)**   | Trigger "Đồng bộ cloud thủ công" and wait for completion                                                                                                            |
| 4     | **Refresh & verify**    | Reload the page and verify task/check-in/review counts persist                                                                                                      |
| 5     | **Manual sync (2nd)**   | Second sync to exercise pull round-trip                                                                                                                             |
| 6     | **Logout/login verify** | Clear session, re-login, verify data restored from cloud                                                                                                            |
| 7     | **Cleanup cloud**       | Click "Xóa cloud" in Settings to delete cloud workspace (auto-confirms)                                                                                             |
| 7     | **Cleanup local**       | Remove test-prefixed goals from localStorage                                                                                                                        |

When `MVP2_SMOKE_SKIP_AUTH=true`, only Phase 0 runs. All authenticated steps are explicitly listed as SKIPPED (not false-passed).

## Environment Variables

| Variable                 | Required    | Default               | Description                                    |
| ------------------------ | ----------- | --------------------- | ---------------------------------------------- |
| `MVP2_SMOKE_URL`         | **Yes**     | —                     | Staging/preview URL                            |
| `MVP2_SMOKE_EMAIL`       | Conditional | —                     | Test account email (required unless SKIP_AUTH) |
| `MVP2_SMOKE_PASSWORD`    | Conditional | —                     | Test account password                          |
| `MVP2_SMOKE_SKIP_AUTH`   | No          | `false`               | Set `true` to run signed-out guard only        |
| `MVP2_SMOKE_CLEANUP`     | No          | `true`                | Set `false` to keep test data after run        |
| `MVP2_SMOKE_TEST_PREFIX` | No          | `[SMOKE-{timestamp}]` | Override test data prefix                      |

## Running Locally

```bash
# Full authenticated flow
MVP2_SMOKE_URL=https://your-preview.vercel.app \
MVP2_SMOKE_EMAIL=qa-test@example.com \
MVP2_SMOKE_PASSWORD=your-test-password \
npm run smoke:mvp2-sync:staging

# Signed-out guard only (no auth, no backend sync)
MVP2_SMOKE_URL=http://localhost:5173 \
MVP2_SMOKE_SKIP_AUTH=true \
npm run smoke:mvp2-sync:staging

# Keep test data for debugging
MVP2_SMOKE_URL=https://your-preview.vercel.app \
MVP2_SMOKE_EMAIL=qa-test@example.com \
MVP2_SMOKE_PASSWORD=your-test-password \
MVP2_SMOKE_CLEANUP=false \
npm run smoke:mvp2-sync:staging
```

## Running via GitHub Actions

1. Go to **Actions** → **MVP2 sync staging smoke**
2. Click **Run workflow**
3. Enter the staging URL
4. Set `skip_auth` to `true` if no test credentials are configured
5. Optionally set `test_prefix` for a custom data prefix
6. Secrets `MVP2_SMOKE_EMAIL` and `MVP2_SMOKE_PASSWORD` must be set in repository secrets

## Safety Rules

- **No production data**: All test data uses the `[SMOKE-{timestamp}]` prefix — identifiable and removable
- **No real payment**: Script does not trigger billing flows or mock checkout
- **No hardcoded secrets**: All credentials from env/secrets
- **Graceful skip**: Missing `MVP2_SMOKE_URL` → exit 0 with SKIP message (not false-pass)
- **Actual failure**: Test step failure → exit 1
- **Local cleanup**: Test-prefixed goals removed from localStorage (configurable)
- **Cloud cleanup**: Authenticated user's cloud workspace deleted via `DELETE /api/sync/12-week/workspace` using the UI button (only the smoke user's data; other users unaffected)
- **Confirm override**: `window.confirm` is temporarily overridden to auto-accept during cloud cleanup, then restored
- **No core app changes**: Script uses only existing UI actions (buttons, tabs, forms) — no direct API calls from the script

## Test Account Requirements

The test account should be:

- A dedicated QA account (not a real user)
- Created on the staging Firebase project
- Has no production data
- Should not share data with real testers

## Missing Env Behavior

| Missing                              | Behavior                         |
| ------------------------------------ | -------------------------------- |
| `MVP2_SMOKE_URL`                     | Script exits 0 with SKIP message |
| `MVP2_SMOKE_EMAIL` + no SKIP_AUTH    | Script exits 0 with SKIP message |
| `MVP2_SMOKE_PASSWORD` + no SKIP_AUTH | Script exits 0 with SKIP message |

The script never false-passes. Missing env = explicit skip with log message. Actual test failure = exit 1.

## Exit Code Contract

| Scenario                                       | Exit Code |
| ---------------------------------------------- | --------- |
| All steps pass                                 | 0         |
| Some steps skipped (UI not ready), none failed | 0         |
| Missing env (SKIP)                             | 0         |
| Any step failed                                | 1         |
| Fatal error                                    | 1         |
