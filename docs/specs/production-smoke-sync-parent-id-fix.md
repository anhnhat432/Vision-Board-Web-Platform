# Production Smoke Sync Parent ID Fix

## Surface

Mixed/Core: 12-week mutation sync contract and production smoke coverage.

## Problem

Production smoke can prepare local/cloud 12-week data whose local goal id is a backend id, while queued mutations still derive synthetic `clientPlanId` and `clientWeekId` from that local goal id. The backend then rejects task, daily check-in, weekly review, and lead metric mutations because the parent week or task is not found for the authenticated user.

## Contract

- WHEN a queued 12-week execution mutation has backend plan/week/task links, THE system SHALL send those links as optional backend identifiers without removing the existing client identifiers.
- WHEN the backend receives backend plan/week/task identifiers, THE system SHALL verify they belong to the authenticated user before applying the mutation.
- WHEN backend identifiers are missing, THE system SHALL continue using the existing `clientPlanId` / `clientWeekId` / `clientTaskId` lookup path.
- WHEN client identifiers are stale but backend parent identifiers are valid and owned, THE system SHALL apply the mutation using the stored backend parent and preserve the stored client identifiers on server records.
- WHEN a manual sync drains local execution mutations successfully, or follows a recent background drain that already applied them, and the immediate pull response does not yet include those entities, THE system SHALL preserve the local execution records while still applying the cloud snapshot.
- WHEN a manual sync observes multiple short successful mutation drains in the recent window, THE system SHALL preserve recently applied execution records from earlier drains even if a later drain updated `lastDrainStartedAt`.
- WHEN a stale same-cycle `UserData` save writes one 12-week execution record type after another local save, THE system SHALL preserve existing same-cycle `dailyCheckIns` and `weeklyReviews` instead of treating missing arrays as deletes.
- WHEN a new 12-week cycle is intentionally saved with a different cycle identity, THE system SHALL allow empty `dailyCheckIns` and `weeklyReviews` to clear the old cycle records.
- WHERE identifiers point to another user's plan, week, or task, THE system SHALL return the same ownership-denied not-found result and not leak entity existence.

## Verification Checklist

- Add focused frontend coverage for backend id fallback in mutation request payloads.
- Add focused backend route coverage for stale client ids plus valid owned backend ids.
- Add focused manual-sync coverage for preserving a recently applied daily check-in when the pull snapshot lags behind the mutation response.
- Add focused manual-sync coverage for preserving recently applied execution records across consecutive short drains.
- Add focused storage coverage for preserving same-cycle check-ins/reviews across stale saves while still allowing cycle reset to clear old records.
- Run focused frontend and backend tests.
- Re-run the production smoke workflow after pushing.
