# Staging Proof Release Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce trustworthy GitHub Actions evidence for all four staging proof workflows against the current `main` release state, then replace stale release documentation with the exact run IDs, URLs, SHA, targets, and outcomes.

**Architecture:** Treat the workflow contracts, deployed targets, and GitHub run metadata as the evidence system. Run the Core Funnel proof against the successful PR #152 Vercel Preview whose Git tree is identical to the `main` merge tree, and run real-mode auth/destructive/sync proofs against the production-like canonical domain already deployed from the target `main` SHA. If a workflow fails, stop dispatching that proof repeatedly, classify the failure from logs, and create a failure-specific TDD plan before editing code.

**Tech Stack:** Git/Git worktrees, GitHub CLI and GitHub Actions, Vercel Preview/Production deployments, Render health endpoint, Playwright E2E, Vitest documentation/workflow guards, Markdown release ledgers.

## Global Constraints

- `FINAL_RELEASE_SHA` is `fb3873ba11853379f792a5ce006656f523a9322d` after the required smoke-harness fixes were merged.
- Do not modify the user's dirty/divergent primary checkout at `D:\Projects\Vision Board Web Platform`.
- Use `D:\Projects\Vision Board Web Platform\.worktrees\staging-proof-release-evidence` on branch `codex/staging-proof-release-evidence`.
- Core Funnel requires a protected `VITE_APP_MODE=demo` Preview target and must not target the production domain.
- Email verification, account deletion, and LWW require real-mode behavior and may target a staging or production-like URL under their existing workflow contracts.
- Account deletion must use `allow_delete=DELETE_TEST_ACCOUNT` with `auth_mode=signup`, which generates a fresh `+delete` disposable account instead of deleting the configured fixed account.
- LWW must use `allow_overwrite=OVERWRITE_TEST_WORKSPACE` and the configured dedicated `+lww` account; preserve local-wins, cloud-wins, and tombstone-wins semantics.
- Never print or read secret values; secret-name metadata is sufficient for readiness.
- Do not weaken assertions, skip scenarios, bypass authentication, alter Firebase verification, disable HTTP 429 detection, or introduce feature/dependency changes.
- If runtime or test-harness code changes and is merged, refresh `FINAL_RELEASE_SHA`, rerun all four proofs on that state, and require two consecutive production smoke passes.

---

## File Structure

- `guidelines/CURRENT_PROJECT_STATUS.md`: authoritative release state, final SHA, workflow evidence, production smoke evidence, and remaining blockers.
- `guidelines/SOFT_LAUNCH_CHECKLIST.md`: D-2 proof ledger and D-1 go/no-go checklist synchronized to the new GitHub evidence.
- `docs/ops/staging-proof-runbook.md`: read-only unless a workflow failure proves the documented command contract is wrong.
- `docs/superpowers/plans/2026-08-07-staging-proof-release-evidence.md`: this execution and verification record.

### Task 1: Confirm Source and Deployment Equivalence

**Files:**
- Read: `.github/workflows/core-funnel-quality-staging.yml`
- Read: `.github/workflows/email-verification-e2e-staging.yml`
- Read: `.github/workflows/account-delete-e2e-staging.yml`
- Read: `.github/workflows/lww-e2e-staging.yml`
- Read: `.github/workflows/production-smoke-e2e.yml`
- No repository writes.

**Interfaces:**
- Consumes: `origin/main`, GitHub deployment metadata, Vercel target URLs, Render health response.
- Produces: one target SHA, one demo-preview target, one real-mode target, and an explicit deployment limitation statement.

- [x] **Step 1: Record the fresh remote main SHA**

```powershell
git fetch origin
git rev-parse origin/main
```

Expected: `6c380cedc66cc5978ce2f76677cf837361c65309`.

- [x] **Step 2: Confirm production deployment and backend health**

```powershell
gh api --method GET repos/anhnhat432/Vision-Board-Web-Platform/deployments -f ref=6c380cedc66cc5978ce2f76677cf837361c65309
Invoke-WebRequest -Uri "https://dearourfuture.io.vn" -UseBasicParsing
Invoke-WebRequest -Uri "https://vision-board-web-platform.onrender.com/api/health" -UseBasicParsing
```

Expected: Vercel Production deployment `5790592126` is successful for the target SHA, frontend returns HTTP 200, and backend `/api/health` returns HTTP 200 with `status=ok`.

- [x] **Step 3: Confirm the current-tree Preview target**

```powershell
git diff --quiet db64aa6297c3ee79854f7db5aa365287cdae7cde 6c380cedc66cc5978ce2f76677cf837361c65309
gh api repos/anhnhat432/Vision-Board-Web-Platform/deployments/5790526751/statuses
```

Expected: the PR #152 head tree is identical to the merge tree, and Preview deployment `5790526751` is successful at `https://vision-board-web-platform-1aeqypbna-anhnhat432s-projects.vercel.app`.

- [x] **Step 4: Run the repository readiness audit without reading secret values**

Run:

```powershell
npm ci
npm run proof:readiness
```

Expected: dependency install exits 0; workflow and secret-name gates pass. Staging-run readiness may remain blocked until the four new runs complete, but the output must identify only stale/missing evidence rather than missing required secrets or disabled workflows.

### Task 2: Execute Core Funnel Proof on the Current Preview Tree

**Files:**
- No repository writes.

**Interfaces:**
- Consumes: workflow ref `main`, demo candidate `https://vision-board-web-platform-1aeqypbna-anhnhat432s-projects.vercel.app`.
- Produces: one completed Core Funnel run whose `headSha` equals `TARGET_MAIN_SHA`.

- [x] **Step 0: Classify the first Preview mismatch and deploy the same tree through the configured demo branch**

Run `31161298588` proved that the PR #152 Preview target was built in real mode without Firebase configuration. Preserve the application guard and create a fast-forward deployment commit on the existing branch-specific demo environment:

```powershell
$demoParent = (git rev-parse origin/codex/12-week-release-gates-demo).Trim()
$remoteDemoParent = (git ls-remote origin refs/heads/codex/12-week-release-gates-demo).Split("`t")[0]
if ($demoParent -ne $remoteDemoParent) { throw "Demo proof branch advanced after fetch" }
$mainTree = (git rev-parse "origin/main^{tree}").Trim()
$demoDeployCommit = ("chore: deploy main 6c380ced to demo proof environment" | git commit-tree $mainTree -p $demoParent).Trim()
git push origin "${demoDeployCommit}:refs/heads/codex/12-week-release-gates-demo"
if ((git rev-parse "${demoDeployCommit}^{tree}").Trim() -ne $mainTree) { throw "Demo deployment tree differs from main" }
```

Expected: the push is fast-forward, the deployment commit has the exact `origin/main` tree, and Vercel builds it with the established demo-branch environment. Poll GitHub deployment metadata for this commit until a successful Preview `environment_url` is available, then use that immutable URL for the next Core Funnel dispatch.

- [x] **Step 1: Dispatch the proof and capture only the new run**

```powershell
$dispatchStartedAt = Get-Date
$targetSha = "6c380cedc66cc5978ce2f76677cf837361c65309"
$coreUrl = "https://vision-board-web-platform-1aeqypbna-anhnhat432s-projects.vercel.app"
gh workflow run core-funnel-quality-staging.yml --repo anhnhat432/Vision-Board-Web-Platform --ref main -f target_url=$coreUrl
```

Expected: dispatch succeeds without logging the bypass secret.

- [x] **Step 2: Find and watch the matching run**

```powershell
$coreRun = $null
for ($attempt = 0; $attempt -lt 24; $attempt++) {
  $runs = gh run list --repo anhnhat432/Vision-Board-Web-Platform --workflow core-funnel-quality-staging.yml --event workflow_dispatch --limit 10 --json databaseId,headSha,status,conclusion,createdAt,url | ConvertFrom-Json
  $coreRun = $runs | Where-Object { $_.headSha -eq $targetSha -and [datetime]$_.createdAt -ge $dispatchStartedAt.ToUniversalTime().AddSeconds(-5) } | Select-Object -First 1
  if ($coreRun) { break }
  Start-Sleep -Seconds 5
}
if (-not $coreRun) { throw "No new Core Funnel run found for $targetSha" }
gh run watch $coreRun.databaseId --repo anhnhat432/Vision-Board-Web-Platform --exit-status
```

Expected: the workflow validates the protected Preview target and completes `success`. If it fails because the target is not demo mode, classify it as deployment/environment mismatch and stop before changing application code.

### Task 3: Execute Real-Mode Email, Account Delete, and LWW Proofs

**Files:**
- No repository writes.

**Interfaces:**
- Consumes: workflow ref `main`, real-mode target `https://dearourfuture.io.vn`, guarded disposable/dedicated accounts.
- Produces: three completed runs whose `headSha` equals `TARGET_MAIN_SHA`.

- [x] **Step 1: Dispatch and watch Email Verification**

```powershell
$dispatchStartedAt = Get-Date
gh workflow run email-verification-e2e-staging.yml --repo anhnhat432/Vision-Board-Web-Platform --ref main -f target_url=https://dearourfuture.io.vn -f allow_create=CREATE_TEST_ACCOUNT
```

Find the first new run for `TARGET_MAIN_SHA` created after `$dispatchStartedAt`, then run:

```powershell
gh run watch $emailRun.databaseId --repo anhnhat432/Vision-Board-Web-Platform --exit-status
```

Expected: generated `+verify` signup reaches the unverified-email banner and proves paid checkout is not incorrectly blocked solely by verification state; result is `success`.

- [x] **Step 2: Dispatch and watch Account Delete with a generated disposable account**

```powershell
$dispatchStartedAt = Get-Date
gh workflow run account-delete-e2e-staging.yml --repo anhnhat432/Vision-Board-Web-Platform --ref main -f target_url=https://dearourfuture.io.vn -f allow_delete=DELETE_TEST_ACCOUNT -f auth_mode=signup
```

Find the first new run for `TARGET_MAIN_SHA` created after `$dispatchStartedAt`, then run:

```powershell
gh run watch $accountDeleteRun.databaseId --repo anhnhat432/Vision-Board-Web-Platform --exit-status
```

Expected: a fresh generated `codex.qa+delete-<timestamp>@example.com` account is created and deleted; remote DELETE succeeds, session leaves the protected surface, and the local marker is removed.

- [x] **Step 3: Dispatch and watch all three LWW scenarios**

```powershell
$dispatchStartedAt = Get-Date
gh workflow run lww-e2e-staging.yml --repo anhnhat432/Vision-Board-Web-Platform --ref main -f target_url=https://dearourfuture.io.vn -f allow_overwrite=OVERWRITE_TEST_WORKSPACE
```

Find the first new run for `TARGET_MAIN_SHA` created after `$dispatchStartedAt`, then run:

```powershell
gh run watch $lwwRun.databaseId --repo anhnhat432/Vision-Board-Web-Platform --exit-status
```

Expected: local wins, cloud wins, and tombstone wins each pass sequentially with zero retries; the final tombstone scenario removes the dedicated proof workspace.

- [ ] **Step 4: Diagnose any failure before retry or code change**

```powershell
gh run view $failedRunId --repo anhnhat432/Vision-Board-Web-Platform --log-failed
gh run view $failedRunId --repo anhnhat432/Vision-Board-Web-Platform --json attempt,headBranch,headSha,status,conclusion,createdAt,url,jobs
```

Record workflow, run ID, target SHA, failing step, observed error, expected/actual behavior, root cause, category, files involved, minimal fix, and regression-test requirement. Do not rerun repeatedly or edit code until the root cause is proven. Any required code fix receives a separate `fix/staging-proof-<short-name>` branch and a failure-specific TDD plan.

### Task 4: Build the Evidence Ledger and Update Release Documentation

**Files:**
- Modify: `guidelines/CURRENT_PROJECT_STATUS.md`
- Modify: `guidelines/SOFT_LAUNCH_CHECKLIST.md`
- Modify only if proven wrong: `docs/ops/staging-proof-runbook.md`

**Interfaces:**
- Consumes: final `gh run view` JSON for the four staging runs and production smoke run `31157792090` attempts 2 and 3.
- Produces: a release ledger where every PASS has run ID, URL, target URL, target SHA, date, and mode context.

- [x] **Step 1: Capture final metadata for every run**

```powershell
foreach ($runId in @($coreRun.databaseId, $emailRun.databaseId, $accountDeleteRun.databaseId, $lwwRun.databaseId)) {
  gh run view $runId --repo anhnhat432/Vision-Board-Web-Platform --json attempt,workflowName,headBranch,headSha,status,conclusion,createdAt,updatedAt,url
}
gh run view 31157792090 --repo anhnhat432/Vision-Board-Web-Platform --attempt 2 --json attempt,workflowName,headSha,status,conclusion,createdAt,updatedAt,url
gh run view 31157792090 --repo anhnhat432/Vision-Board-Web-Platform --attempt 3 --json attempt,workflowName,headSha,status,conclusion,createdAt,updatedAt,url
```

Expected: all four staging runs are `success` on `TARGET_MAIN_SHA`; production smoke attempts 2 and 3 are `success` on the same SHA.

- [x] **Step 2: Update `CURRENT_PROJECT_STATUS.md`**

Add a dated release-proof section near the current verification status and replace the stale production-smoke blocker text. Record:

- release SHA `6c380cedc66cc5978ce2f76677cf837361c65309`;
- exact four staging run IDs/URLs/results and target modes;
- production smoke run `31157792090`, attempts 2 and 3, both successful;
- the deployment limitation that backend `/api/health` does not expose commit SHA, while Vercel deployment metadata does;
- `None` as remaining release-proof blocker only if every required run passes.

- [x] **Step 3: Update `SOFT_LAUNCH_CHECKLIST.md`**

Replace the stale D-2 rows for Production Smoke, Email Verification, Account Deletion, LWW Sync, and Manual Core-Flow Smoke with `pass`, exact target URL, exact SHA, run URL, date, and concise evidence notes. Mark the matching D-1 rows complete only after all five ledger rows have valid evidence.

- [x] **Step 4: Leave the runbook unchanged unless execution disproves it**

Run:

```powershell
git diff -- docs/ops/staging-proof-runbook.md
```

Expected: no diff if all existing commands and safety guards remain correct.

### Task 5: Verify, Commit, Push, and Open the Documentation PR

**Files:**
- Verify: `guidelines/CURRENT_PROJECT_STATUS.md`
- Verify: `guidelines/SOFT_LAUNCH_CHECKLIST.md`
- Verify: `docs/superpowers/plans/2026-08-07-staging-proof-release-evidence.md`

**Interfaces:**
- Consumes: completed evidence ledger and doc-only diff.
- Produces: a clean branch and one draft PR; no merge or production deployment.

- [x] **Step 1: Run doc/workflow guard verification**

```powershell
.\node_modules\.bin\vitest.cmd run scripts/github-workflow-guards.test.mjs scripts/check-staging-proof-run-readiness.test.mjs scripts/check-launch-proof-readiness.test.mjs --reporter=dot
npm run test:ops
git diff --check
```

Expected: all focused and operations tests pass; whitespace check produces no output. If a source-contract test encodes stale wording, update the test only when the documented contract intentionally changed, not merely to silence a failure.

- [x] **Step 2: Review the exact scope**

```powershell
git status --short --branch
git diff --stat
git diff -- guidelines/CURRENT_PROJECT_STATUS.md guidelines/SOFT_LAUNCH_CHECKLIST.md docs/ops/staging-proof-runbook.md docs/superpowers/plans/2026-08-07-staging-proof-release-evidence.md
```

Expected: only the plan and evidence documentation are modified; no runtime, workflow, test-harness, dependency, lockfile, or generated artifact changes remain.

- [ ] **Step 3: Commit the verified documentation**

```powershell
git add -- guidelines/CURRENT_PROJECT_STATUS.md guidelines/SOFT_LAUNCH_CHECKLIST.md docs/superpowers/plans/2026-08-07-staging-proof-release-evidence.md
git commit -m "docs: record staging release proof evidence"
```

Expected: one doc-only commit.

- [ ] **Step 4: Push and open one draft PR**

```powershell
git push -u origin codex/staging-proof-release-evidence
gh pr create --draft --repo anhnhat432/Vision-Board-Web-Platform --base main --head codex/staging-proof-release-evidence --title "docs: record staging release proof evidence" --body "Records the four staging proof runs and two consecutive production smoke passes for main release candidate 6c380ced. This PR is documentation-only and does not change runtime behavior."
```

Expected: branch push succeeds and GitHub returns one draft PR URL. Do not merge it in this task.

- [ ] **Step 5: Watch PR checks and report final evidence**

```powershell
gh pr checks codex/staging-proof-release-evidence --repo anhnhat432/Vision-Board-Web-Platform --watch
```

Expected: all required checks succeed. The final report distinguishes GitHub staging evidence from local guard verification and recommends moving to Product Measurement / Activation / Retention when no real blocker remains.

## Plan Self-Review Record

- [x] Spec coverage: target SHA, deployment equivalence, four proof runs, failure triage, production evidence, documentation cleanup, safety, and PR boundaries each map to an explicit task.
- [x] Placeholder scan: dynamic GitHub run IDs are captured from commands rather than represented as unfilled document placeholders.
- [x] Type consistency: `$coreRun`, `$emailRun`, `$accountDeleteRun`, and `$lwwRun` consistently expose `databaseId`, `headSha`, `status`, `conclusion`, `createdAt`, and `url` from `gh` JSON.
- [x] Scope consistency: no runtime or test-harness change is planned unless a workflow failure proves a separate regression and triggers a new failure-specific plan.

## Execution Findings

- Core Funnel run `31161298588` on `6c380cedc66cc5978ce2f76677cf837361c65309` failed in `Run core funnel quality smoke` because the target redirected `/12-week-system` to `/login` and reported Firebase was not configured. Expected behavior was an accessible demo-mode local-first route. Root cause is a real-mode PR Preview deployment without Firebase, category `D. Deployment version/mode mismatch` with environment aspect `C`; no application or harness fix is appropriate. The minimal correction is to deploy the exact main tree through the existing branch-specific demo environment and run one new proof.

- Email Verification run `31161786943` on `6c380cedc66cc5978ce2f76677cf837361c65309` initially looked like a detached Playwright CTA, but a fresh browser reproduction against `https://dearourfuture.io.vn` showed the actual transition: a generated `+verify` account reaches `/billing/plan`, then `AppShellLayout` redirects it to `/onboarding` once the fresh profile/local workspace state is observed. The CTA disappears because the route changes, so the locator failure is a symptom. Category `A. Application regression` / route-policy contract gap. The minimal fix is to exempt the public billing-plan route from the first-time onboarding redirect while preserving onboarding redirects for core workspace routes; add a RootLayout regression test before implementation.

## Final Execution Record — 2026-08-08

Final release SHA: `fb3873ba11853379f792a5ce006656f523a9322d`.

Evidence runs on the same SHA:

- Core Funnel: `31227583922` PASS, target `https://vision-board-web-platform-49igew648-anhnhat432s-projects.vercel.app` in demo mode.
- Email Verification: `31227583893` PASS, target `https://dearourfuture.io.vn` with `CREATE_TEST_ACCOUNT`.
- Account Delete: `31227583868` PASS, target `https://dearourfuture.io.vn` with `DELETE_TEST_ACCOUNT` and `auth_mode=signup`.
- LWW: `31227583866` PASS, target `https://dearourfuture.io.vn` with `OVERWRITE_TEST_WORKSPACE`.
- Production Smoke #1: `31227489986` PASS (push event).
- Production Smoke #2: `31227851905` PASS (workflow dispatch).

Failure-specific fixes merged before the final SHA:

- PR #155 / `2cc4716d`: re-query the Weekly Review commitment step across React rerenders.
- PR #156 / `42e9a910`: scope post-classification Weekly Review inputs to visible nodes.
- PR #157 / `fb3873ba`: create visible Weekly Review field locators before pre-wait and reuse them across rerenders.

All three harness fixes were covered by focused RED/GREEN guards and passed full local verification before merge. No runtime application code, security boundary, HTTP 429 detection, or staging assertion was weakened. Readiness audits (`proof:secrets`, `proof:workflows`, `proof:readiness`) passed without reading secret values. `docs/ops/staging-proof-runbook.md` remained unchanged because its command and safety contract stayed correct.
