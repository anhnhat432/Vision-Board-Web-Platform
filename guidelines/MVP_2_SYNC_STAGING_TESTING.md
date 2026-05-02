# MVP 2 Sync Staging Testing

## Overview

`scripts/smoke-mvp2-sync-staging.mjs` is a CI/staging-friendly E2E smoke test for the MVP 2 cloud sync flow. It uses `agent-browser` (same tool as production smoke) to exercise the full sync lifecycle on a staging/preview deployment.

## What It Tests

| Step | Description |
|------|-------------|
| Open app | Load the staging URL |
| Authenticate | Sign in with test credentials (skippable) |
| Seed local data | Create a 12-week system with `[SMOKE-{timestamp}]` prefixed titles |
| Toggle task | Complete a Today task |
| Manual sync | Trigger "Đồng bộ cloud thủ công" from Settings |
| Refresh & verify | Reload the page and check task state persists |
| Logout/login verify | Clear session, re-login, check data restored |
| Cleanup | Remove test-prefixed goals from localStorage |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MVP2_SMOKE_URL` | **Yes** | — | Staging/preview URL |
| `MVP2_SMOKE_EMAIL` | Conditional | — | Test account email (required unless SKIP_AUTH) |
| `MVP2_SMOKE_PASSWORD` | Conditional | — | Test account password |
| `MVP2_SMOKE_SKIP_AUTH` | No | `false` | Set `true` to skip login (local-only mode) |
| `MVP2_SMOKE_CLEANUP` | No | `true` | Set `false` to keep test data after run |

## Running Locally

```bash
# With authentication
MVP2_SMOKE_URL=https://your-preview.vercel.app \
MVP2_SMOKE_EMAIL=qa-test@example.com \
MVP2_SMOKE_PASSWORD=your-test-password \
npm run smoke:mvp2-sync

# Local-only mode (no auth, no backend sync)
MVP2_SMOKE_URL=http://localhost:5173 \
MVP2_SMOKE_SKIP_AUTH=true \
npm run smoke:mvp2-sync
```

## Running via GitHub Actions

1. Go to **Actions** → **MVP2 sync staging smoke**
2. Click **Run workflow**
3. Enter the staging URL
4. Set `skip_auth` to `true` if no test credentials are configured
5. Secrets `MVP2_SMOKE_EMAIL` and `MVP2_SMOKE_PASSWORD` must be set in repository secrets

## Safety Rules

- **No production data**: All test data uses `[SMOKE-{timestamp}]` prefix
- **No real payment**: Script does not trigger billing flows
- **No hardcoded secrets**: All credentials from env/secrets
- **Graceful skip**: If `MVP2_SMOKE_URL` is not set, the script exits 0 (not a failure)
- **Cleanup**: Test-prefixed goals are removed after run (configurable)
- **No backend mutation**: The script only uses the existing manual sync button in the UI

## Test Account Requirements

The test account should be:
- A dedicated QA account (not a real user)
- Created on the staging Firebase project
- Has no production data

## Missing Env Behavior

| Missing | Behavior |
|---------|----------|
| `MVP2_SMOKE_URL` | Script exits 0 with SKIP message |
| `MVP2_SMOKE_EMAIL` + no SKIP_AUTH | Script exits 0 with SKIP message |
| `MVP2_SMOKE_PASSWORD` + no SKIP_AUTH | Script exits 0 with SKIP message |

The script never false-passes. Missing env = explicit skip with log message.
