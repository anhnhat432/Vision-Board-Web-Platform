# MVP 1 Release Status

## 1. Check Date

- Checked at: 2026-04-29 17:19:16 +07:00
- Reviewer role: release-candidate full-stack check
- Scope read before checks:
  - `AGENTS.md`
  - `guidelines/CURRENT_PROJECT_STATUS.md`
  - `guidelines/MVP_1_SCOPE.md`
  - `package.json`
  - `backend/package.json`

## 2. Node/npm Version

- Node: `v22.12.0`
- npm: `10.9.0`
- Note: backend `package.json` targets Node `20.x`. The local check runtime was Node 22.12.0; no command failed because of this, but release/runtime alignment should still prefer Node 20 for backend hosting.

## 3. Commands Run

All requested release-candidate commands were run.

| Command | Result | Notes |
| --- | --- | --- |
| `npm run env:check` | Pass with warning | Exit code 0. Env files were found and required env values were present. API health reported `FAILED fetch failed`, so local/full-stack API health was not reachable during this check. |
| `npm run typecheck` | Pass | `tsc --noEmit` completed successfully. |
| `npm run lint` | Pass | Biome checked 283 files. No fixes applied. |
| `npm run test:run` | Pass | Vitest: 42 test files passed, 156 tests passed. |
| `npm run build` | Pass | Vite production build completed successfully. |
| `npm --prefix backend run typecheck` | Pass | Backend TypeScript check completed successfully. |
| `npm --prefix backend run build` | Pass | Backend TypeScript build completed successfully. |
| `npm --prefix backend run check` | Pass | Backend typecheck and build both passed again through the combined script. |

Dependency install was not run because dependencies were already installed and all checks executed successfully.

## 4. Result By Command

### `npm run env:check`

- Status: pass with warning.
- Important output:
  - Frontend backend-sync requirements: OK.
  - Optional Firebase client keys: OK.
  - Backend local API requirements: OK.
  - API health: `FAILED fetch failed`.
- Interpretation:
  - This does not block the local-first public demo if production remains in demo mode.
  - It does block claiming verified local/full-stack backend health in this check run.

### `npm run typecheck`

- Status: pass.
- No TypeScript errors reported.

### `npm run lint`

- Status: pass.
- Biome reported no required fixes.

### `npm run test:run`

- Status: pass.
- 42 test files passed.
- 156 tests passed.

### `npm run build`

- Status: pass.
- Vite built the frontend production bundle successfully.

### `npm --prefix backend run typecheck`

- Status: pass.
- No backend TypeScript errors reported.

### `npm --prefix backend run build`

- Status: pass.
- Backend build completed successfully.

### `npm --prefix backend run check`

- Status: pass.
- Re-ran backend typecheck and build through the combined script.

## 5. Errors Fixed

None.

No source code was changed because all compile, lint, test, and build checks passed. The only new file from this task is this release status document.

## 6. Remaining Errors

No code or test failures remain from the requested checks.

Remaining warning:

- `npm run env:check` could not reach API health: `FAILED fetch failed`.

This is expected if the backend API is not running or not reachable from the configured `VITE_API_BASE_URL`. It is not a blocker for the MVP 1 local-first public demo, but it is a blocker for claiming full-stack sync health.

## 7. Can We Release The Public Demo?

Yes, conditionally.

The release candidate is green for the requested automated frontend and backend checks. MVP 1 can be released as a local-first public demo if production remains demo-safe:

- `VITE_APP_MODE=demo`
- no Firebase requirement
- no backend requirement
- mock/provider-contract billing only
- copy continues to avoid promising real payment or guaranteed cloud sync

Before sharing the public URL broadly, run the deployed smoke/manual QA path from `guidelines/MVP_1_SCOPE.md` against the actual production deployment.

## 8. Blockers Before Release

Code blockers from requested checks:

- None.

Operational blockers before public sharing:

- Verify production env is demo-safe and has not been overridden to `VITE_APP_MODE=real`.
- Run production smoke or manual core-flow QA on the deployed URL.
- Confirm mock checkout still returns to the app on the deployed domain.
- Confirm local-first persistence survives refresh in the deployed build.

Full-stack blockers, if the release is positioned as real sync instead of public demo:

- API health must pass.
- Backend must run under a Node 20-compatible environment.
- Firebase Admin, MongoDB, and `FRONTEND_ORIGIN` must be verified against the deployed frontend.

## 9. Recommended Next Task

Run deployed MVP 1 smoke/manual QA:

1. Open the production URL in a fresh browser profile.
2. Complete onboarding, life balance, SMART goal, feasibility, and 12-week setup.
3. Land in `/12-week-system`.
4. Complete one Today task.
5. Save daily check-in.
6. Save or preview weekly review.
7. Confirm Progress changes.
8. Complete mock checkout and confirm Plus unlock is local/mock only.
9. Refresh and confirm the 12-week plan persists.
10. Repeat the key path on a mobile viewport.
