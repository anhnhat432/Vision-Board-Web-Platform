# Daily Check-In Merge Prune Hotfix

Surface: Core localStorage merge for 12-week execution records.

## Acceptance Checklist

- WHEN a same-cycle save merges incoming `dailyCheckIns` with stale local `dailyCheckIns`, THE system SHALL preserve local-first execution records without reintroducing more than five check-ins for the same calendar date.
- WHEN more than five same-day check-ins exist after merge, THE system SHALL keep the newest entries by date and `updatedCount`.
- WHEN check-ins belong to other calendar dates, THE system SHALL preserve them subject to the existing total history cap of 120 entries.
- WHEN a new 12-week cycle is saved, THE system SHALL still allow old execution records to be cleared.

## Verification

- `storage-save-merge.test.ts` covers stale local same-day records being pruned to the five latest entries.
- `twelve-week-flows.e2e.test.tsx` covers the end-to-end seventh same-day save flow.
