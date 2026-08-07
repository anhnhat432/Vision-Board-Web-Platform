# LWW E2E Memory-Only Authorization Spec

Status: Review
Approach: SDD first, then bounded ADD
Specification depth: Standard
Risk: Medium

## 1. Context & Goal

- Feature / bug: the deployed LWW Playwright harness can no longer bootstrap its cloud fixture because it still reads the retired `firebase_id_token` localStorage key.
- Why now: GitHub Actions run `31146343194` failed all three LWW scenarios at the authenticated import boundary after application token-storage hardening shipped in `710b152d`.
- User impact: production LWW behavior cannot be accepted or rejected while the proof harness fails before any LWW scenario executes.
- Modes affected: real-mode deployed proof only; demo behavior is unchanged.
- Evidence: https://github.com/anhnhat432/Vision-Board-Web-Platform/actions/runs/31146343194 reported `tokenPresent: false` and `importHttpStatus: 0` for local-wins, cloud-wins, and tombstone-wins.

## 2. Surface Classification

- Type: Core test infrastructure.
- Touched domains: Firebase bearer-token handling inside Playwright, authenticated 12-week import bootstrap, safe E2E diagnostics, and workflow guard tests.
- Core contract: credentials must remain memory-only and must not be restored to application-managed storage.
- Shell surface: the minimal source-contract assertions that keep the harness implementation aligned with this spec.
- Existing invariants that must not break:
  - `firebase_id_token` remains retired and is never used as an auth source.
  - The LWW harness requires explicit overwrite opt-in and a dedicated LWW test account.
  - The harness logs only safe metadata; it never logs request headers, tokens, payload bodies, or response bodies.
  - Application auth, backend auth middleware, sync semantics, API contracts, and localStorage schemas remain unchanged.

## 3. Actors & Entry Points

- Primary actor: release operator running the `LWW e2e staging` GitHub Actions workflow.
- Secondary actor(s): the dedicated signed-in LWW test account and the Playwright worker process.
- Entry point: `.github/workflows/lww-e2e-staging.yml` invoking `e2e/sync-lww.spec.ts`.
- Protected calls:
  - observed request: `GET /sync/12-week/pull`
  - bootstrap request: `POST /sync/12-week/import`
- Test guard: `scripts/github-workflow-guards.test.mjs`.

## 4. Decision & Alternatives

### Selected: observe the Firebase-signed pull request

The harness shall read the full `Authorization` header from a successful observed pull request through Playwright's `request.headerValue("authorization")` API. It shall keep that header in a `WeakMap<Page, string>` owned by the Playwright process and pass it only to the bootstrap import call.

This approach reuses the production app's real Firebase SDK signing path, adds no test-only app API, and preserves memory-only credential handling. Playwright documents `request.headerValue(name)` as asynchronous, case-insensitive, and returning the matching request header value.

Reference: https://playwright.dev/docs/api/class-request#request-header-value

### Rejected: expose an application token bridge

Calling an app-exported `getFirebaseToken()` bridge from the E2E harness would couple deployed proof to test-only application internals or require adding a production-visible hook. That is broader than needed.

### Rejected: restore the localStorage token

Writing `firebase_id_token` again would reverse the approved credential hardening, increase XSS exposure, and conflict with `src/lib/auth/legacyFirebaseToken.ts`.

## 5. Functional Requirements

1. `WHEN` the harness receives a successful `GET /sync/12-week/pull` response, `THE HARNESS SHALL` asynchronously read the originating request's `Authorization` header with `response.request().headerValue("authorization")`.
2. `WHEN` the observed value is a non-empty `Bearer <credential>` header, `THE HARNESS SHALL` cache the full header in a `WeakMap<Page, string>` keyed by the page that issued the pull.
3. `IF` the observed authorization value is absent, blank, or not a `Bearer` header, `THEN THE HARNESS SHALL` leave the page without a cached authorization value.
4. `WHEN` `importLwwBaseline` prepares `POST /sync/12-week/import`, `THE HARNESS SHALL` use the cached full header as the request's `Authorization` value without adding another `Bearer` prefix.
5. `IF` no valid cached authorization header exists at import time, `THEN THE HARNESS SHALL` return safe diagnostics with `tokenPresent: false` and shall not issue the import request.
6. `THE HARNESS SHALL NOT` read, write, restore, migrate, or depend on `firebase_id_token` or any other application-controlled credential storage.
7. `THE HARNESS SHALL NOT` include the authorization header or token value in console output, assertion messages, HTML reports, screenshots, videos, traces, or uploaded artifacts.
8. `WHEN` a pull response is remembered from login, reload, or manual sync, `THE HARNESS SHALL` await authorization capture before subsequent logic can depend on it.
9. `WHERE` diagnostics report auth readiness, `THE HARNESS SHALL` expose only the boolean `tokenPresent`, never credential contents.

## 6. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: none.
- migration or normalization needed: none.
- backend models or API contracts touched: none.
- sync ordering guarantees: unchanged; this change only repairs proof bootstrap before the LWW scenarios run.
- credential lifetime: limited to the Playwright worker process and associated `Page` reachability through `WeakMap`.
- browser transfer: the cached header may be passed as a transient `page.evaluate` argument only for the import fetch; it must not be assigned to browser global state, app state, storage, or logs.
- trace/artifact constraint: the LWW workflow requires the Vercel automation bypass secret and runs each scenario with `--retries=0`; the current Playwright configuration therefore does not retain a trace containing the transient evaluate argument. This invariant must remain covered by workflow guard review.
- rollback / restore concerns: reverting the harness change restores the known bootstrap failure but does not affect application or user data contracts.

## 7. Non-functional Requirements

- Security / privacy: no credential persistence, source literals, diagnostic values, or artifact leakage.
- Reliability: every code path that calls `rememberCloudPull` must await it so the import cannot race authorization capture.
- Compatibility: use APIs available in the repository's Playwright `^1.59.1`; `request.headerValue` has existed since Playwright 1.15.
- Scope: keep the implementation limited to the LWW harness, its focused contract test, and this documentation/plan.
- Observability: preserve existing safe import result fields and API response status diagnostics.

## 8. Out of Scope

- Changing Firebase persistence behavior or exposing Firebase tokens from application code.
- Changing backend auth middleware, 12-week import endpoints, LWW conflict rules, or production data models.
- Changing workflow credentials, overwrite guards, target URL validation, scenario sequencing, or artifact retention.
- Claiming that production LWW behavior passes before all three deployed scenarios complete successfully after merge.
- Restoring any legacy token storage for tests, demo mode, or production.

## 9. Acceptance Criteria & Traceability

- [ ] AC-1: A focused guard test fails on the current source because `importLwwBaseline` reads `firebase_id_token` and no authorization `WeakMap` exists. Maps to FR-2, FR-4, and FR-6.
- [ ] AC-2: After implementation, the focused guard test proves the harness defines `WeakMap<Page, string>`, reads `headerValue("authorization")`, validates `Bearer`, and never reads `firebase_id_token`. Maps to FR-1 through FR-6.
- [ ] AC-3: TypeScript accepts the async `rememberCloudPull` implementation and all call sites await it. Maps to FR-8.
- [ ] AC-4: Existing safe-diagnostics guards continue to reject `response.headers()`, `response.body()`, raw payload logging, and credential-value logging. Maps to FR-7 and FR-9.
- [ ] AC-5: `npm run test:ops`, `npm run typecheck`, `npm run lint`, `npm run test:run`, and `npm run build` pass on the implementation branch.
- [ ] AC-6: After merge to `main`, a fresh `LWW e2e staging` run against `https://dearourfuture.io.vn` passes local-wins, cloud-wins, and tombstone-wins. Only this deployed evidence can establish LWW production acceptance.

## 10. Verification Plan

TDD red-green proof:

```bash
npm run test:ops -- scripts/github-workflow-guards.test.mjs
```

Implementation verification:

```bash
npm run test:ops
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Post-merge deployed acceptance:

```bash
gh workflow run lww-e2e-staging.yml \
  --repo anhnhat432/Vision-Board-Web-Platform \
  --ref main \
  -f target_url=https://dearourfuture.io.vn \
  -f allow_overwrite=OVERWRITE_TEST_WORKSPACE
```

## 11. Assumptions, Risks, and Follow-ups

- Assumption: the initial authenticated pull continues to be issued by the production app after login and carries a Firebase `Bearer` authorization header.
- Assumption: each workflow scenario runs in its own Playwright worker process, so the observed header is fresh for that scenario and not shared across scenarios.
- Risk: a future app change that removes or delays the initial pull will prevent authorization observation; safe failure must remain `tokenPresent: false` rather than falling back to storage.
- Risk: a future Playwright/workflow change that enables traces for these credential-bearing calls requires a new security review before merge.
- Follow-up: if the rerun reaches LWW logic and exposes a different failure, treat it as a new root-cause investigation rather than expanding this patch.

## 12. Approval Boundary

- Approved design direction: memory-only authorization captured from the Firebase-signed pull request.
- This written spec remains in Review until the user confirms it before implementation planning begins.
