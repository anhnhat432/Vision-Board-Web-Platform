# Staging Proof Runbook

Use this runbook before soft launch. Auth, account-deletion, and LWW proofs use the protected real-mode preview with Firebase and backend API configuration. Core-funnel proof uses the protected demo preview.

Do not paste secrets into docs, issue comments, screenshots, or terminal transcripts. Store credentials as GitHub repository secrets or set local env vars only for one trusted operator session.

## Required Staging Target

- Frontend URL: staging or preview URL that serves the deployed SPA.
- Backend: same frontend must point to the staging/preview backend through `VITE_API_BASE_URL`.
- Mode: `VITE_APP_MODE=real` for auth/sync/destructive proofs; `VITE_APP_MODE=demo` for core-funnel proof.
- Firebase: email/password auth enabled for the staging project.
- Test accounts: disposable only. Do not use admin, owner, shared QA, or real customer accounts.
- Workflow runtime: staging and production proof workflows use `node-version-file: ".nvmrc"` so GitHub Actions follows the same Node major as the release workflow and backend production target.

## Secret Inventory

Before the first launch proof run, confirm these repository secrets in GitHub
Settings -> Secrets and variables -> Actions. Do not paste values into issues,
docs, screenshots, or PR comments.

| Gate | Secret | Required before run | Account marker / safety rule | Evidence when ready |
| --- | --- | --- | --- | --- |
| All four protected-preview proofs | `VERCEL_AUTOMATION_BYPASS_SECRET` | Yes | Copy the existing Vercel Automation Bypass secret into GitHub Actions; never expose its value in commands, docs, screenshots, or logs | Secret name exists in GitHub and Vercel Deployment Protection remains enabled |
| Email verification | `EMAIL_VERIFICATION_E2E_EMAIL` | Optional; set for fixed QA account | If set, must include `+verify`, `.verify`, `_verify`, or `-verify` | Secret exists or workflow will generate a disposable account |
| Email verification | `EMAIL_VERIFICATION_E2E_PASSWORD` | Optional; required only with fixed email | Disposable credential only | Secret exists or generated-account path is accepted |
| Account deletion | `ACCOUNT_DELETE_E2E_EMAIL` | Yes | Must include `+delete`, `.delete`, `_delete`, or `-delete` | Secret exists and marker checked by workflow |
| Account deletion | `ACCOUNT_DELETE_E2E_PASSWORD` | Yes | Disposable credential only | Secret exists |
| LWW sync | `LWW_E2E_EMAIL` | Yes | Dedicated QA user; workspace can be overwritten | Secret exists and account is not shared/customer-owned |
| LWW sync | `LWW_E2E_PASSWORD` | Yes | Dedicated QA credential only | Secret exists |
| Production smoke | `PROD_SMOKE_EMAIL` | Yes | Fixed verified production QA user | Secret exists |
| Production smoke | `PROD_SMOKE_PASSWORD` | Yes | Fixed QA credential only | Secret exists |

Blocking rule: do not treat workflow presence as launch evidence. A gate is
proved only after the workflow or equivalent local command runs against the
target URL and the result is recorded.

Live readiness refresh on 2026-07-30: `npm run proof:secrets` reports
`VERCEL_AUTOMATION_BYPASS_SECRET` missing by name. Protected-preview dispatch
remains blocked until the existing Vercel secret is copied into GitHub Actions.

Core funnel deployed proof workflow:

- Workflow: `.github/workflows/core-funnel-quality-staging.yml`
- Required input: `target_url`
- Required secret: `VERCEL_AUTOMATION_BYPASS_SECRET`
- Target rule: use the protected demo preview with `VITE_APP_MODE=demo`; keep Vercel Deployment Protection and `Require Log In` enabled.
- Security rule: GitHub Actions sends the Vercel bypass headers from the repository secret. Do not use query-string bypass links or `--headers` command arguments.
- Production rule: do not use `https://vision-board-web-platform.vercel.app`; real-mode production proof belongs to `.github/workflows/production-smoke-e2e.yml`.
- Behavior: runs `npm run smoke:core-quality` against the supplied deployed URL to cover SMART goal quality, feasibility recommendation, 12-week setup output, Today action, daily check-in, weekly review, and Progress trend.

## Secret Readiness Snapshot - 2026-06-27

Audit command:

```powershell
gh secret list --json name,updatedAt
```

Repo-local audit command:

```powershell
npm run proof:secrets
```

Workflow availability audit command:

```powershell
npm run proof:workflows
```

Aggregate readiness audit command:

```powershell
npm run proof:readiness
```

This aggregate command reports three blocker groups in one pass: required proof
secret names, default-branch workflow availability, and the latest
`production-smoke-e2e.yml` run status on default branch.

Current summary on 2026-07-09: `npm run proof:readiness` passes the secret-name
audit and default-branch workflow availability, but blocks on latest
production-smoke metadata. Run `28995039420` failed on `GET /api/weeks/:weekId/metrics`
with HTTP 429 `rate_limited`. The local smoke harness now retries the 12-week
backend-sync proof after `Retry-After`, but this is not launch proof until the
change is deployed, production smoke passes again, and staging workflow evidence
is recorded.

Repository: `anhnhat432/Vision-Board-Web-Platform` on default branch `main`.
Only secret names were inspected; values were not read.

| Gate | Current repository secret status | Launch impact |
| --- | --- | --- |
| Production smoke | `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD` are configured | Credentials ready; still needs actual workflow or local smoke pass |
| Email verification staging | `EMAIL_VERIFICATION_E2E_EMAIL` and `EMAIL_VERIFICATION_E2E_PASSWORD` are not configured | Not blocking if generated disposable signup is acceptable and staging Firebase allows signup |
| Account deletion staging | `ACCOUNT_DELETE_E2E_EMAIL` and `ACCOUNT_DELETE_E2E_PASSWORD` are configured | Secret readiness is clear; still blocked until the workflow reaches default branch and passes on staging |
| LWW sync staging | `LWW_E2E_EMAIL` and `LWW_E2E_PASSWORD` are configured | Secret readiness is clear; still blocked until the workflow reaches default branch and passes on staging |
| MongoDB backup | `MONGODB_URI`, `MONGODB_BACKUP_GPG_PASSPHRASE`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` are configured | Backup workflow secret names are present; backup run still needs workflow evidence |

Email verification fixed-secret rule: configure both `EMAIL_VERIFICATION_E2E_EMAIL`
and `EMAIL_VERIFICATION_E2E_PASSWORD`, or leave both unset so the workflow uses
generated disposable signup credentials. Partial fixed credentials are blocked by
`npm run proof:secrets` and `.github/workflows/email-verification-e2e-staging.yml`.

## Workflow Availability Snapshot - 2026-06-27

Audit commands:

```powershell
gh workflow list --limit 100
npm run proof:workflows
```

Repository: `anhnhat432/Vision-Board-Web-Platform` on default branch `main`.
Only workflow metadata was inspected; no workflow was dispatched.

| Gate | Default-branch workflow status | Launch impact |
| --- | --- | --- |
| Production smoke | `.github/workflows/production-smoke-e2e.yml` is available and active | Latest default-branch scheduled run `28995039420` failed on commit `6ad15aca67c264cbf8ae544dbc45100b6939db01` because the 12-week backend-sync proof hit HTTP 429 on `GET /api/weeks/:weekId/metrics`; rerun after deploying the local retry fix before D-1 |
| Core-funnel deployed proof | `.github/workflows/core-funnel-quality-staging.yml` is available and active | Requires the protected demo preview with `VITE_APP_MODE=demo`, `VERCEL_AUTOMATION_BYPASS_SECRET`, and recorded pass evidence |
| Email verification staging | `.github/workflows/email-verification-e2e-staging.yml` is available and active | Requires staging dispatch with `allow_create=CREATE_TEST_ACCOUNT` and recorded pass evidence |
| Account deletion staging | `.github/workflows/account-delete-e2e-staging.yml` is available and active | Requires destructive staging dispatch with `allow_delete=DELETE_TEST_ACCOUNT` and recorded pass evidence |
| LWW sync staging | `.github/workflows/lww-e2e-staging.yml` is available and active | Requires overwrite-safe staging dispatch with `allow_overwrite=OVERWRITE_TEST_WORKSPACE` and recorded pass evidence |

Workflow readiness rule: run `npm run proof:readiness` first. Then use
`npm run proof:secrets` or `npm run proof:workflows` only when you need the
per-category detail again while fixing blockers. If a workflow is reported as
present in the current worktree only, publish the staged batch to default branch
before treating the command pack as runnable. If the aggregate command reports a
failed or in-progress production smoke latest run, do not treat deploy proof as
ready yet even if secrets and workflow files are otherwise available.

Email verification workflow:

- Workflow: `.github/workflows/email-verification-e2e-staging.yml`
- Required input: `target_url`
- Required protection secret: `VERCEL_AUTOMATION_BYPASS_SECRET`
- Target rule: use staging/preview or production-like URL only; the workflow rejects `localhost` and `127.0.0.1`.
- Required input: `allow_create=CREATE_TEST_ACCOUNT`
- Optional secret: `EMAIL_VERIFICATION_E2E_EMAIL`
- Optional secret: `EMAIL_VERIFICATION_E2E_PASSWORD`
- Safety rule: if `EMAIL_VERIFICATION_E2E_EMAIL` is set, it must include `+verify`, `.verify`, `_verify`, or `-verify`.
- Pair rule: fixed email/password secrets must both be set, or both unset.

Account delete workflow:

- Workflow: `.github/workflows/account-delete-e2e-staging.yml`
- Required input: `target_url`
- Required protection secret: `VERCEL_AUTOMATION_BYPASS_SECRET`
- Target rule: use staging/preview or production-like URL only; the workflow rejects `localhost` and `127.0.0.1`.
- Required input: `allow_delete=DELETE_TEST_ACCOUNT`
- Optional input: `auth_mode=signin` or `auth_mode=signup`
- Required secret: `ACCOUNT_DELETE_E2E_EMAIL`
- Required secret: `ACCOUNT_DELETE_E2E_PASSWORD`
- Safety rule: `ACCOUNT_DELETE_E2E_EMAIL` must include `+delete`, `.delete`, `_delete`, or `-delete`.
- Input rule: the workflow rejects any `auth_mode` other than `signin` or `signup` before Playwright starts.

LWW sync workflow:

- Workflow: `.github/workflows/lww-e2e-staging.yml`
- Required input: `target_url`
- Required protection secret: `VERCEL_AUTOMATION_BYPASS_SECRET`
- Target rule: use staging/preview or production-like URL only; the workflow rejects `localhost` and `127.0.0.1`.
- Required input: `allow_overwrite=OVERWRITE_TEST_WORKSPACE`
- Required secret: `LWW_E2E_EMAIL`
- Required secret: `LWW_E2E_PASSWORD`
- Safety rule: use a dedicated QA user whose workspace can be overwritten by local/cloud/tombstone conflict tests.
- Marker rule: `LWW_E2E_EMAIL` must include `+lww`, `.lww`, `_lww`, or `-lww`.

Production smoke workflow:

- Workflow: `.github/workflows/production-smoke-e2e.yml`
- Trigger(s): push to `main`, nightly schedule, and manual `workflow_dispatch`
- Required secret: `PROD_SMOKE_EMAIL`
- Required secret: `PROD_SMOKE_PASSWORD`
- Fixed-account rule: the workflow and smoke scripts read only `PROD_SMOKE_EMAIL` and `PROD_SMOKE_PASSWORD`.
- Safety rule: scheduled workflow keeps `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=0`; set `PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1` only for an explicit one-off local/manual generated QA signup.
- Workflow order: on `main` push, the workflow waits for the matching Vercel production deployment, runs `npm run smoke:prod:quick`, then runs `npm run smoke:prod`.

## Recommended Run Order

0. Run local core-funnel preflight with `npm run smoke:core-quality` against a local dev server. This catches core-loop UI/storage regressions before spending staging credentials, but it is not D-2 launch evidence.
1. Run `npm run proof:readiness`.
2. Run environment checks and confirm real-mode staging for auth/sync/destructive workflows.
3. Run deployed core-funnel quality workflow against the protected demo preview.
4. Run email verification staging workflow.
5. Run account-delete staging workflow.
6. Run LWW e2e staging workflow.
7. Run quick production smoke against production after deploy and fixed QA credentials are configured.
8. Run full production smoke after the quick smoke passes.

This order proves the main local-first funnel on the protected deployed demo target first, then signup/email guard, destructive lifecycle, cross-device sync, and finally the fast/full real-mode production billing trust gates.

## GitHub Actions Command Pack

Run these commands only after repository secrets are configured. Do not put
secret values in command arguments, terminal transcripts, docs, or screenshots.

Check aggregate readiness first:

```powershell
npm run proof:readiness
```

If the aggregate command reports blockers, rerun the category-specific audits as needed:

```powershell
npm run proof:secrets
```

```powershell
npm run proof:workflows
```

Set operator variables first:

```powershell
$env:CORE_QUALITY_URL="https://your-accessible-demo-preview.example"
$env:STAGING_URL="https://your-staging-url.example"
$env:PRODUCTION_URL="https://dearourfuture.io.vn"
$env:PROOF_REF="main"
```

Trigger the staging proof workflows:

```powershell
gh workflow run core-funnel-quality-staging.yml --ref $env:PROOF_REF -f target_url=$env:CORE_QUALITY_URL
```

```powershell
gh workflow run email-verification-e2e-staging.yml --ref $env:PROOF_REF -f target_url=$env:STAGING_URL -f allow_create=CREATE_TEST_ACCOUNT
```

```powershell
gh workflow run account-delete-e2e-staging.yml --ref $env:PROOF_REF -f target_url=$env:STAGING_URL -f allow_delete=DELETE_TEST_ACCOUNT -f auth_mode=signup
```

```powershell
gh workflow run lww-e2e-staging.yml --ref $env:PROOF_REF -f target_url=$env:STAGING_URL -f allow_overwrite=OVERWRITE_TEST_WORKSPACE
```

Trigger production smoke after production deploy and fixed QA credentials are
configured:

```powershell
gh workflow run production-smoke-e2e.yml --ref $env:PROOF_REF -f target_url=$env:PRODUCTION_URL
```

Capture each run for the D-2 proof ledger:

```powershell
gh run list --workflow core-funnel-quality-staging.yml --event workflow_dispatch --limit 1 --json databaseId,workflowName,status,conclusion,headSha,url,createdAt
```

```powershell
gh run list --workflow email-verification-e2e-staging.yml --event workflow_dispatch --limit 1 --json databaseId,workflowName,status,conclusion,headSha,url,createdAt
```

```powershell
gh run list --workflow account-delete-e2e-staging.yml --event workflow_dispatch --limit 1 --json databaseId,workflowName,status,conclusion,headSha,url,createdAt
```

```powershell
gh run list --workflow lww-e2e-staging.yml --event workflow_dispatch --limit 1 --json databaseId,workflowName,status,conclusion,headSha,url,createdAt
```

```powershell
gh run list --workflow production-smoke-e2e.yml --event workflow_dispatch --limit 1 --json databaseId,workflowName,status,conclusion,headSha,url,createdAt
```

For the automatic post-deploy smoke on `main`:

```powershell
gh run list --workflow production-smoke-e2e.yml --event push --limit 1 --json databaseId,workflowName,status,conclusion,headSha,url,createdAt
```

For a specific run id, verify final result and fail the shell if the run failed:

```powershell
gh run view <run-id> --json workflowName,status,conclusion,headSha,url,createdAt
gh run view <run-id> --exit-status
```

After the rate-limit isolation fix is deployed, run full production smoke twice against the canonical domain. Both runs must report the same deployed commit SHA; quick smoke remains the workflow warmup and does not replace either full-smoke result.

```powershell
gh workflow run production-smoke-e2e.yml -f target_url=https://dearourfuture.io.vn
$firstRunId = gh run list --workflow production-smoke-e2e.yml --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $firstRunId --exit-status
gh run view $firstRunId --json workflowName,status,conclusion,headSha,url,createdAt
gh run view $firstRunId --log

gh workflow run production-smoke-e2e.yml -f target_url=https://dearourfuture.io.vn
$secondRunId = gh run list --workflow production-smoke-e2e.yml --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $secondRunId --exit-status
gh run view $secondRunId --json workflowName,status,conclusion,headSha,url,createdAt
gh run view $secondRunId --log
```

Record the target URL, deployed commit SHA, both run URLs, conclusions, and dates. Do not change the proof ledger to `pass` when only local checks, quick smoke, or one full-smoke run exists.

Copy these fields into `guidelines/SOFT_LAUNCH_CHECKLIST.md`: target URL,
`headSha`, `url`, `conclusion`, and date. Status must be `pass` before D-1
go/no-go.

## Local Fallback Commands

Use local commands only from a trusted machine. Prefer GitHub Actions for launch evidence.

Core-funnel local preflight:

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
$env:CORE_QUALITY_URL="http://127.0.0.1:4173"
npm run smoke:core-quality
```

Do not use `vite preview` for this local preflight. In this repo, `.env.production` runs real mode, so a local preview build without backend/auth can redirect protected core routes to `/login` and create a false failure.

This proves the local-first core loop on the current machine only. It does not replace the D-2 accessible demo/staging core-flow row.

Deployed core-funnel proof:

```powershell
$env:CORE_QUALITY_URL="https://your-accessible-demo-preview.example"
gh workflow run core-funnel-quality-staging.yml --ref $env:PROOF_REF -f target_url=$env:CORE_QUALITY_URL
```

Do not point this workflow at the production main domain. The protected demo preview is supported through `VERCEL_AUTOMATION_BYPASS_SECRET`; real-mode production proof remains in `production-smoke-e2e.yml`.

Quick production smoke warmup:

```powershell
$env:PROD_SMOKE_URL="https://dearourfuture.io.vn"
$env:PROD_SMOKE_EMAIL="fixed-qa@example.com"
$env:PROD_SMOKE_PASSWORD="replace-with-fixed-qa-password"
npm run smoke:prod:quick
```

This is a faster operator gate for auth, visible sync trust, and billing hydration on the deployed target. It does not replace the full `npm run smoke:prod` proof row.

```powershell
$env:EMAIL_VERIFICATION_E2E_URL="https://your-staging-url.example"
$env:EMAIL_VERIFICATION_E2E_ALLOW="CREATE_TEST_ACCOUNT"
npm run test:e2e:email-verification
```

```powershell
$env:ACCOUNT_DELETE_E2E_URL="https://your-staging-url.example"
$env:ACCOUNT_DELETE_E2E_ALLOW="DELETE_TEST_ACCOUNT"
$env:ACCOUNT_DELETE_E2E_EMAIL="codex.qa+delete@example.com"
$env:ACCOUNT_DELETE_E2E_PASSWORD="replace-with-disposable-password"
$env:ACCOUNT_DELETE_E2E_AUTH_MODE="signin"
npm run test:e2e:account-delete
```

```powershell
$env:LWW_E2E_URL="https://your-staging-url.example"
$env:LWW_E2E_ALLOW="OVERWRITE_TEST_WORKSPACE"
$env:LWW_E2E_EMAIL="codex.qa+lww@example.com"
$env:LWW_E2E_PASSWORD="replace-with-qa-password"
npm run test:e2e:lww
```

Clear local env vars after the run:

```powershell
Remove-Item Env:\EMAIL_VERIFICATION_E2E_URL -ErrorAction SilentlyContinue
Remove-Item Env:\EMAIL_VERIFICATION_E2E_ALLOW -ErrorAction SilentlyContinue
Remove-Item Env:\EMAIL_VERIFICATION_E2E_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:\EMAIL_VERIFICATION_E2E_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:\ACCOUNT_DELETE_E2E_URL -ErrorAction SilentlyContinue
Remove-Item Env:\ACCOUNT_DELETE_E2E_ALLOW -ErrorAction SilentlyContinue
Remove-Item Env:\ACCOUNT_DELETE_E2E_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:\ACCOUNT_DELETE_E2E_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:\ACCOUNT_DELETE_E2E_AUTH_MODE -ErrorAction SilentlyContinue
Remove-Item Env:\LWW_E2E_URL -ErrorAction SilentlyContinue
Remove-Item Env:\LWW_E2E_ALLOW -ErrorAction SilentlyContinue
Remove-Item Env:\LWW_E2E_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:\LWW_E2E_PASSWORD -ErrorAction SilentlyContinue
```

## Evidence To Record

After each real staging run, record:

- Workflow name or local command.
- GitHub Actions run URL, or local timestamp and operator.
- Target URL.
- Commit SHA.
- Result: pass/fail.
- For failures: top error message, no secrets.

Use this ledger format in the relevant spec/status file:

| Gate | Target URL | Commit SHA | Evidence URL / command | Result | Date | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Email verification | | | | pending | | |
| Account deletion | | | | pending | | |
| LWW sync | | | | pending | | |
| Production smoke | | | | pending | | |

Update these files with the result:

- `docs/specs/auth-email-verification-staging-smoke.md`
- `docs/specs/account-delete-staging-smoke.md`
- `docs/specs/twelve-week-sync-trust.md`
- `guidelines/CURRENT_PROJECT_STATUS.md`
- `guidelines/SOFT_LAUNCH_CHECKLIST.md`

## Stop Conditions

Stop and do not launch if:

- Any workflow fails for auth, Firebase, backend, sync, or billing guard behavior.
- Account-delete workflow targets an email without the delete marker.
- LWW workflow targets an email without the lww marker or runs without `OVERWRITE_TEST_WORKSPACE`.
- LWW workflow uses a shared or real customer account.
- Staging is not real mode.
- `VERCEL_AUTOMATION_BYPASS_SECRET` is missing or a bypass value appears in a URL, command argument, log, screenshot, trace, or report.
- Any run logs a raw secret, token, password, private key, or service account value.
