# Workspace Delete Tombstones

## Classification

- Surface: Core backend sync and destructive account data flow.
- Goal: make an explicit cloud-workspace deletion converge to other signed-in devices.

## Requirements

1. WHEN an authenticated user deletes the 12-week cloud workspace, THE backend SHALL soft-delete every active goal, plan, week, task, metric, check-in, and review with one server timestamp.
2. WHEN the next pull uses a cursor older than that deletion timestamp, THE backend SHALL expose the deleted entities as tombstones.
3. WHILE tombstones are retained, normal export and mutation lookups SHALL exclude them.
4. WHERE a workspace was already deleted, another delete SHALL return zero changed counts.
5. THE delete response SHALL report policy `soft_delete`; billing, entitlement, auth, and localStorage schemas SHALL remain unchanged.

## Verification

```bash
npm --prefix backend run typecheck
npm --prefix backend run build
node --test backend/dist/tests/syncWorkspaceRoutes.test.js backend/dist/tests/syncPullRoutes.test.js
```

Deployed acceptance remains the LWW staging tombstone scenario in `.github/workflows/lww-e2e-staging.yml`.
