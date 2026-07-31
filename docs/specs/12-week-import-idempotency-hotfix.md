# 12-Week Import Idempotency Hotfix

## 1. Context & Goal

- Feature / bug: authenticated 12-week imports can return `500` after entity writes when a legacy Mongo index rejects another mutation log with a null idempotency key.
- Why now: this blocks the deployed LWW staging proof and can leave an import partially applied.
- User impact: signed-in real-mode users may see sync/import failure even though local progress remains available.
- Modes affected: `real` only; demo mode does not call protected sync routes.

## 2. Surface Classification

- Type: `Core`.
- Touched domains: backend import idempotency and mutation-log persistence.
- Existing invariants: authentication, payload validation, entity upserts, response privacy, and local-first behavior remain unchanged.

## 3. Actors & Entry Points

- Primary actor: authenticated user importing a 12-week workspace.
- Route: `POST /api/sync/12-week/import`.
- Touchpoint: `TwelveWeekImportService.importWorkspace`.

## 4. Functional Requirements

1. WHEN an import is accepted, THE system SHALL persist the resolved `importId` as both `mutationId` and `idempotencyKey` in the mutation log.
2. WHEN the same user performs multiple imports with different import IDs, THE system SHALL NOT depend on nullable legacy-index behavior.
3. WHEN an import is repeated with the same import ID and payload, THE existing duplicate-result behavior SHALL remain unchanged.

## 5. Data, Storage, and Sync Constraints

- No localStorage or payload shape changes.
- No Mongo document migration is required for this application-layer hotfix.
- The existing mutation-log schema and API response contract remain unchanged.

## 6. Non-functional Requirements

- Do not log request bodies, titles, tokens, credentials, or secret values.
- Do not change authentication, authorization, rate limiting, or import entity ordering.

## 7. Out of Scope

- Rebuilding production Mongo indexes.
- Changing LWW conflict semantics or frontend sync behavior.

## 8. Acceptance Criteria

- [ ] accepted imports write `idempotencyKey === importId`
- [ ] duplicate import behavior remains green
- [ ] backend typecheck, build, and sync/import route tests pass

## 9. Verification Plan

```bash
npm --prefix backend run typecheck
npm --prefix backend run build
node --test backend/dist/tests/syncMutationRoutes.test.js
```

## 10. Open Questions / Follow-ups

- Run the existing index rebuild script separately only if production still shows nullable-index failures outside the import path.
