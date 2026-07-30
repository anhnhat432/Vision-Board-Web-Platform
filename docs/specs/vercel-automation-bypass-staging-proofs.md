# Vercel Automation Bypass for Staging Proofs

## 1. Context & Goal

- Feature / bug: Vercel Deployment Protection keeps preview deployments behind `Require Log In`, so GitHub Actions cannot reach the deployed app to execute the four remaining launch proofs.
- Why now: the real-mode and demo previews are deployed and healthy, but core funnel, email verification, account deletion, and LWW sync remain blocked at the Vercel protection boundary.
- User impact: release evidence can be collected without making preview deployments public or weakening production protection.
- Modes affected: both. Core funnel targets the protected demo preview; email verification, account deletion, and LWW sync target the protected real-mode preview.

## 2. Surface Classification

- Type: `Core`
- Touched domains: deployment protection, GitHub Actions secrets, Playwright request configuration, `agent-browser` process configuration, launch-proof workflows, and release documentation.
- Existing invariants that must not break:
  - Vercel Standard Protection and `Require Log In` remain enabled.
  - The bypass secret never appears in source, command-line arguments, URLs, logs, screenshots, videos, traces, reports, or committed artifacts.
  - Demo and real app-mode routing, Firebase behavior, localStorage schemas, backend APIs, billing, entitlements, and sync semantics remain unchanged.
  - Local proof commands remain runnable against unprotected targets when the bypass secret is absent.
  - Production is not redeployed until all preview proofs pass.

## 3. Actors & Entry Points

- Primary actor: release operator dispatching GitHub Actions proof workflows.
- Secondary actor(s): GitHub Actions runner, Vercel Deployment Protection, and reviewer checking launch evidence.
- Route(s): the existing routes exercised by core funnel, `/login`, `/settings`, and `/12-week-system`.
- Workflow entry points:
  - `.github/workflows/core-funnel-quality-staging.yml`
  - `.github/workflows/email-verification-e2e-staging.yml`
  - `.github/workflows/account-delete-e2e-staging.yml`
  - `.github/workflows/lww-e2e-staging.yml`
- Code touchpoints:
  - `playwright.config.ts`
  - `scripts/smoke-core-quality.mjs`
  - a shared `scripts/vercel-automation-bypass.mjs` helper
  - existing ops and workflow guard tests

## 4. Functional Requirements

1. WHEN one of the four protected-preview workflows starts, THE workflow SHALL require `VERCEL_AUTOMATION_BYPASS_SECRET` from GitHub repository secrets and fail before browser execution with a clear error when it is absent.
2. WHEN a non-empty bypass secret is available, THE shared helper SHALL return exactly these HTTP headers:
   - `x-vercel-protection-bypass`: the unmodified value read from `VERCEL_AUTOMATION_BYPASS_SECRET`
   - `x-vercel-set-bypass-cookie: true`
3. WHEN the bypass secret is absent during a local run, THE shared helper SHALL return no bypass headers and SHALL preserve the current unprotected-target behavior.
4. WHEN Playwright creates a browser context for email verification, account deletion, or LWW proof, THE configuration SHALL add the shared bypass headers through `use.extraHTTPHeaders`.
5. WHILE Playwright is using the bypass secret, THE configuration SHALL disable request traces so the secret cannot be retained in trace data; screenshots and videos SHALL remain usable because they do not contain request headers.
6. WHEN the core-funnel harness uses `agent-browser` with a bypass secret, THE harness SHALL write the headers to a uniquely named temporary config with owner-only permissions, pass only its path through `AGENT_BROWSER_CONFIG`, and delete the temporary directory in a `finally` path.
7. THE core-funnel harness SHALL NOT pass the secret through `--headers`, a URL query parameter, a shareable bypass link, or a process argument.
8. WHEN browser execution finishes, fails, or times out, THE core-funnel harness SHALL attempt temporary-config cleanup without replacing the original proof failure.
9. WHEN release documentation describes protected-preview proof, THE docs SHALL name the required GitHub secret and SHALL describe only secret-name readiness, never the secret value.
10. WHEN the four workflows pass, THE release operator SHALL record the workflow URLs, target URLs, commit SHA, date, and conclusions before `proof:readiness` can be treated as launch evidence.

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: unchanged; LWW behavior is exercised but not modified.
- temporary data: one `agent-browser` JSON config under the operating-system temp directory, scoped to a single core-funnel process and removed after execution.
- rollback / restore concerns:
  - code rollback removes the helper and workflow env wiring.
  - removing the GitHub repository secret disables protected-preview automation without changing Vercel protection.
  - the existing Vercel Automation Bypass secret remains managed by Vercel and is not stored in the repository.

## 6. Non-functional Requirements

- Performance / latency: no application runtime cost; bypass setup is limited to proof processes.
- Accessibility: no UI change.
- Observability / logging:
  - logs may report whether bypass configuration is present, but never its value or serialized headers.
  - workflow failures distinguish missing bypass configuration from app/test failures.
- Security / privacy:
  - use GitHub repository secrets and GitHub masking.
  - do not print, reveal, persist, or upload the secret.
  - do not include the secret in process arguments, URLs, Playwright traces, or reusable artifacts.
  - temporary config permissions are owner read/write only where the operating system supports POSIX modes.
- Compatibility: Node `20.x`, Windows local execution, and Ubuntu GitHub runners remain supported.

## 7. Out of Scope

- Disabling Vercel Deployment Protection or changing `Require Log In`.
- Redeploying production, merging the release PR, or selecting PayOS versus Casso.
- Changing auth, account deletion, LWW resolution, 12-week UI, storage, sync, billing, or entitlement behavior.
- Creating a second bypass secret when the existing Vercel Automation Bypass secret is usable.

## 8. Acceptance Criteria

- [ ] one shared helper returns no headers when the secret is absent and exactly two approved headers when present
- [ ] all four proof workflows inject and validate `VERCEL_AUTOMATION_BYPASS_SECRET`
- [ ] Playwright proofs reach protected previews through `extraHTTPHeaders`
- [ ] Playwright trace collection is disabled only while bypass headers are active
- [ ] core funnel uses a temporary `AGENT_BROWSER_CONFIG` file with owner-only permissions and guaranteed cleanup
- [ ] no workflow or harness places the secret in a URL, CLI argument, log, trace, report, or committed file
- [ ] focused helper, workflow-guard, and core-harness regression tests pass
- [ ] `typecheck`, `lint`, `test:run`, `test:ops`, and `build` pass
- [ ] core funnel, email verification, account deletion, and LWW workflows pass against the intended protected previews
- [ ] `npm run proof:readiness` passes before the PR is marked ready or merged

## 9. Verification Plan

Implementation follows TDD: add failing focused tests first, then implement the smallest change that makes them pass.

```bash
npm run test:ops
npm run typecheck
npm run lint
npm run test:run
npm run build
git diff --check
```

After local verification:

1. Confirm `VERCEL_AUTOMATION_BYPASS_SECRET` exists by name in GitHub repository secrets without reading it back.
2. Push the focused branch and update both preview deployments to the same verified commit.
3. Dispatch core funnel against the demo preview.
4. Dispatch email verification, account deletion, and LWW against the real-mode preview.
5. Record all four workflow run URLs and conclusions.
6. Run `npm run proof:readiness`.

## 10. Open Questions / Follow-ups

- PayOS versus Casso remains a separate production decision after the 12-week release gates.
- Production merge and deployment remain blocked until this spec's four proof runs and aggregate readiness check pass.
