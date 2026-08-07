# Safe Local Data Import Contract

## 1. Context & Goal

- Feature / bug: `SettingsPage` currently reads a selected JSON file, calls `parseStoredUserData`, and immediately calls `saveUserData`. A valid file can therefore replace active local data without preview, an automatic recovery snapshot, or an in-app confirmation. In signed-in real mode, the resulting `USER_DATA_UPDATED_EVENT_NAME` can also let automatic 12-week sync reconcile against cloud state before the user has chosen what should happen to the imported data.
- Why now: File restore is a destructive storage operation. A malformed, stale, cross-account, or unexpected backup must not silently replace product progress, restore account-authoritative billing state, drain mutations from the previous workspace, or be overwritten by an automatic cloud pull.
- User impact: A user can inspect a backup, understand what will change, create a recoverable checkpoint, replace local product data deliberately, and make a separate explicit cloud decision.
- Modes affected: both `real` and `demo`. Protected cloud validation/import applies only to a configured, authenticated real-mode account.

## 2. Surface Classification

- Type: `Mixed`.
- Delivery method: Hybrid SDD/ADD.
- Specification depth: Full for the Core transaction and sync-pause contract; Light/Shell execution for Settings dialog composition and copy.
- Core domains:
  - file parsing, normalization, and sanitization;
  - exact local replacement and rollback;
  - auth-scoped identity and storage ownership;
  - owner-scoped 12-week mutation queue and pull cursor handling;
  - automatic cloud-sync suspension and explicit resume conditions.
- Shell domains:
  - file picker orchestration;
  - preview summary layout;
  - two-step `AlertDialog` confirmation;
  - persistent Settings warning and recovery controls.
- Existing invariants that must not break:
  - Local data remains usable while offline or while backend/Firebase is unavailable.
  - Demo mode never calls protected backend sync endpoints.
  - Local user progress is never destroyed because a remote call fails.
  - Billing subscription and entitlement authority cannot be restored from a user-supplied file.
  - Auth-scoped data for one Firebase UID cannot activate or mutate another Firebase UID's queue, cursor, or workspace.
  - Storage normalization and current-version migrations remain authoritative.
  - Existing anonymous-to-account migration behavior remains separate and unchanged.
  - Existing Dashboard, account export/delete, billing, and backend API contracts remain outside this feature.

## 3. Actors, Entry Points, and States

- Primary actor: a user restoring a full local backup from Settings.
- Secondary actors:
  - a signed-in real-mode user whose account also has cloud 12-week data;
  - an offline signed-in user;
  - a signed-out, demo-mode, or Firebase-unconfigured user;
  - a user returning later to resolve a previously deferred cloud decision.
- Primary route: `/settings`.
- Existing entry point: the `Nhập dữ liệu` file picker in `SettingsPage`.
- Existing data touchpoints:
  - `parseStoredUserData` and local storage persistence helpers;
  - `downloadLocalUserDataBackup` and its sanitization contract;
  - owner-scoped mutation queue and pull cursor stores;
  - `useAutoCloudSync` and `AutoCloudSyncState`;
  - existing `post12WeekImportValidation` and `post12WeekImport` frontend contracts.

Import states:

| State | Meaning | Writes allowed |
|---|---|---|
| `idle` | No selected candidate | none |
| `reading` | Browser is reading the selected file | none |
| `invalid` | File is unreadable, oversized, invalid JSON, or not a full `UserData` backup | none |
| `preview_ready` | Normalized and sanitized candidate plus current-data fingerprint are available | none |
| `confirm_replace` | User has passed preview and reached the final destructive confirmation | none |
| `applying` | Recovery snapshot and exact replacement transaction are in progress | transaction writes only |
| `local_applied` | Local replacement succeeded without a pending cloud decision | recovery remains available |
| `pending_cloud_decision` | Signed-in real-mode local replacement succeeded and automatic 12-week sync is paused | dedicated validation/import or recovery only |
| `cloud_validating` | Backend dry-run is checking supported 12-week payloads | no local replacement write |
| `cloud_ready` | Dry-run is valid and explicit cloud confirmation is available | no cloud write until confirmation |
| `cloud_failed` | Validation/import was invalid, partial, skipped, or failed | keep local data and pause |
| `resolved_cloud` | Cloud import returned `applied` or `duplicate` | clear pause and resume sync |
| `restored_previous` | Recovery snapshot restored the pre-import state | clear pause and resume prior sync state |

## 4. Functional Requirements

### 4.1 File validation and preview

- `LOCAL-IMPORT-001`: `WHEN a user selects a file, THE system SHALL read at most 10 MiB and SHALL reject an unreadable, oversized, non-JSON, or invalid UserData payload without writing localStorage or calling a backend API.`
- `LOCAL-IMPORT-002`: `WHEN a valid full UserData payload is selected, THE system SHALL normalize it through the current storage contract before it becomes an import candidate.`
- `LOCAL-IMPORT-003`: `THE system SHALL NOT treat partial account exports, goal-only exports, or arbitrary JSON objects as full local backup candidates.`
- `LOCAL-IMPORT-004`: `WHEN a preview candidate is created, THE system SHALL show the file name and current-versus-imported counts for goals, 12-week systems, tasks, daily check-ins, weekly reviews, wheel records, reflections, and vision boards.`
- `LOCAL-IMPORT-005`: `WHILE the preview or final confirmation is open, THE system SHALL NOT change active user data, auth-scoped data, mutation queues, pull cursors, sync state, or cloud data.`
- `LOCAL-IMPORT-006`: `WHEN active local product data changes after preview creation, THE system SHALL detect a current-data fingerprint mismatch at confirmation time, abort the transaction, and require a fresh preview.`

### 4.2 Sanitization and identity

- `LOCAL-IMPORT-007`: `WHEN an import candidate is prepared, THE system SHALL remove eventLog, syncOutbox, subscription, entitlements, experimentAssignments, emailReminderSchedule, pushSubscription, and privacyConsents from the imported payload.`
- `LOCAL-IMPORT-008`: `WHEN an import candidate is applied, THE system SHALL preserve the currently active local userId and SHALL ignore the userId supplied by the file.`
- `LOCAL-IMPORT-009`: `WHEN an import candidate is applied, THE system SHALL clear or unset isHydratedFromDemo so a restored file is not treated as untouched seeded demo data.`
- `LOCAL-IMPORT-010`: `THE system SHALL preserve supported product-data identifiers and content from the normalized file, including goal, plan, task, reflection, wheel, and vision-board records.`
- `LOCAL-IMPORT-011`: `THE system SHALL NOT import Firebase credentials, backend link-store ownership, billing-provider state, account roles, cloud cursors, mutation queues, or any storage key outside the validated UserData payload.`
- `LOCAL-IMPORT-039`: `WHEN imported vision-board image content is prepared or rendered, THE system SHALL allow only HTTP(S) URLs or supported raster data URLs (PNG, JPEG, GIF, WEBP, or AVIF), SHALL render the existing fallback for rejected values, and SHALL NOT assign rejected text to an image src or DOM data attribute.`

### 4.3 Recovery and exact local replacement

- `LOCAL-IMPORT-012`: `WHEN the user reaches the final confirmation, THE system SHALL present an AlertDialog that states current device data will be replaced and that a seven-day recovery snapshot will be created first.`
- `LOCAL-IMPORT-013`: `WHEN the user confirms replacement, THE system SHALL create a recovery snapshot before changing active data, the owner mutation queue, the owner pull cursor, or the sync-pause marker.`
- `LOCAL-IMPORT-014`: `THE recovery snapshot SHALL contain a sanitized copy of the current product data plus the matching owner's pre-import mutation-queue and pull-cursor state, and SHALL NOT contain Firebase tokens or provider secrets.`
- `LOCAL-IMPORT-015`: `IF the recovery snapshot cannot be persisted, THEN THE system SHALL abort the import and SHALL preserve all current state unchanged.`
- `LOCAL-IMPORT-016`: `WHEN the recovery snapshot exists, THE system SHALL replace active UserData exactly after normalization and SHALL NOT merge task mutations from the pre-import UserData into the imported candidate.`
- `LOCAL-IMPORT-017`: `WHEN a signed-in owner is active, THE system SHALL mirror the exact replacement only to that owner's auth-scoped UserData key.`
- `LOCAL-IMPORT-018`: `WHEN exact replacement begins for a signed-in owner, THE system SHALL remove that owner's pre-import pending mutation queue from the active queue and clear that owner's pull cursor so stale operations cannot drain against the imported workspace.`
- `LOCAL-IMPORT-019`: `IF any transaction write fails after the recovery snapshot is created, THEN THE system SHALL restore the previous active data, auth-scoped data, owner mutation queue, owner pull cursor, and prior sync-pause state before reporting failure.`
- `LOCAL-IMPORT-020`: `WHEN the import transaction succeeds, THE system SHALL notify same-tab and cross-tab data consumers through the existing storage update mechanisms.`
- `LOCAL-IMPORT-021`: `THE system SHALL retain successful import recovery snapshots for seven days and SHALL remove expired snapshots through bounded cleanup.`

### 4.4 Cloud decision and synchronization

- `LOCAL-IMPORT-022`: `WHEN local replacement succeeds for an authenticated real-mode owner, THE system SHALL persist an auth-scoped pending_cloud_decision marker before automatic 12-week synchronization can run.`
- `LOCAL-IMPORT-023`: `WHILE the matching owner has a pending_cloud_decision marker, THE system SHALL block automatic full pull, mutation drain, reconnect sync, visibility sync, interval sync, and the generic manual sync action.`
- `LOCAL-IMPORT-024`: `WHILE automatic sync is paused, THE system SHALL expose a persistent visible Settings status that explains imported data is safe on the device but has not been reconciled with the account.`
- `LOCAL-IMPORT-025`: `WHERE the app is demo mode, Firebase is unconfigured, or no user is signed in, THE system SHALL complete the local replacement without creating a cloud-decision marker or calling protected cloud APIs.`
- `LOCAL-IMPORT-026`: `WHEN a signed-in user chooses to inspect cloud impact, THE system SHALL use the existing 12-week validate-only contract before enabling the cloud import confirmation.`
- `LOCAL-IMPORT-027`: `WHEN cloud validation is invalid, skipped, offline, unavailable, or errors, THE system SHALL preserve imported local data, the recovery snapshot, and the pending cloud-decision marker.`
- `LOCAL-IMPORT-028`: `WHEN cloud validation is valid and the user confirms, THE system SHALL submit only supported 12-week import payloads through the existing cloud import contract.`
- `LOCAL-IMPORT-029`: `THE cloud confirmation SHALL disclose that supported imported records are uploaded or upserted and that this feature does not delete cloud-only account records or replace the complete cloud account workspace.`
- `LOCAL-IMPORT-030`: `WHEN cloud import returns applied or duplicate, THE system SHALL clear the matching pending marker, keep the recovery snapshot until expiry, clear the owner pull cursor, and trigger one normal sync to verify convergence.`
- `LOCAL-IMPORT-031`: `WHEN cloud import returns partial, failed, skipped, or error, THE system SHALL keep automatic sync paused and SHALL allow retry or recovery.`
- `LOCAL-IMPORT-032`: `WHEN the imported data contains no supported 12-week payload, THE system SHALL NOT clear the pending marker by claiming cloud success; the user may keep the device paused or restore the pre-import snapshot.`

### 4.5 Recovery action and account boundaries

- `LOCAL-IMPORT-033`: `WHEN the user restores the pre-import snapshot, THE system SHALL use an AlertDialog confirmation and SHALL restore the saved product data, owner mutation queue, owner pull cursor, and prior sync-pause state.`
- `LOCAL-IMPORT-034`: `WHEN recovery succeeds, THE system SHALL remove the consumed recovery snapshot, clear the import pending marker, notify data consumers, and resume normal sync eligibility for the matching owner.`
- `LOCAL-IMPORT-035`: `WHEN recovery data is missing, expired, corrupt, or belongs to another owner, THE system SHALL refuse restoration and SHALL not modify active data.`
- `LOCAL-IMPORT-036`: `WHERE a user signs out or switches account while a cloud decision is pending, THE system SHALL keep the marker and recovery snapshot scoped to the original owner and SHALL not pause synchronization for a different owner.`
- `LOCAL-IMPORT-037`: `WHEN Settings renders for an owner with a pending marker after reload, THE system SHALL reconstruct the persistent warning and recovery/cloud-decision actions from storage.`
- `LOCAL-IMPORT-038`: `WHILE the current owner has an unresolved pending_cloud_decision marker, THE system SHALL disable selection of another import file until cloud resolution or recovery completes.`

## 5. Data, Storage, and API Constraints

- Existing UserData shape: no schema field is added to `UserData`.
- New storage prefixes:
  - `visionboard_local_file_import_recovery:` for seven-day recovery snapshots;
  - `visionboard_local_file_import_pending:auth:` for auth-scoped cloud-decision markers.
- The pending marker must contain only bounded metadata required to resume the decision flow: version, import ID, owner UID, recovery key, candidate fingerprint, created timestamp, and summary counts. It must not contain the imported UserData payload.
- Recovery snapshot version: `1`.
- Recovery snapshot owner:
  - authenticated real mode: exact Firebase UID;
  - signed-out/demo/unconfigured: `null`, recoverable only while no auth owner is active.
- Imported UserData is normalized to the current storage version.
- Account-authoritative fields from the file are reset using the existing local-backup sanitization policy.
- Exact import replacement must bypass the normal `saveUserData` merge that preserves pre-existing task mutation metadata; ordinary product writes keep the current merge behavior.
- Backend contracts: unchanged. Reuse the existing frontend calls for 12-week import validation and import; do not add or change backend routes in this feature.
- Cloud scope: only currently supported 12-week workspace payloads are eligible for validation/import. Vision boards, reflections, wheel history, preferences, billing, assistant memory, and other local-only data are not uploaded by this flow.
- Sync ordering:
  1. validate file in memory;
  2. obtain explicit final confirmation;
  3. persist recovery snapshot;
  4. persist matching sync-pause marker when required;
  5. clear pre-import owner queue/cursor;
  6. replace local data exactly;
  7. notify local consumers;
  8. perform no protected cloud write until separate validation and confirmation.

## 6. Component and Interface Boundaries

- New Core utility responsibility: parse candidate text, sanitize and rebind identity, summarize data, fingerprint current/candidate state, create/apply/rollback recovery transactions, read/clear pending markers, and restore snapshots.
- Storage utility responsibility: provide an exact normalized UserData replacement path that updates active/auth-scoped storage, cache, mutation broadcast, and same-tab event without merging prior task state.
- Sync utility responsibility: expose whether the current owner is paused by file import and prevent every automatic/manual generic sync trigger while paused.
- Settings page responsibility: own file-reader state and compose the preview/final confirmation, persistent pending warning, cloud dry-run/import actions, and recovery confirmation.
- Existing anonymous-account migration responsibility remains unchanged; file restore must not reuse its candidate-discovery or merge semantics.
- Dashboard responsibility: none. `DashboardDataBackupCard` is not reintroduced or modified in this scope.

## 7. Error Handling and Recovery

- File read errors, invalid JSON, invalid full-backup shape, and files larger than 10 MiB produce an in-app error and no persistent write.
- A stale preview produces a fingerprint error and requires selecting/reviewing the file again.
- Storage quota failure while creating the recovery snapshot aborts before replacement.
- Storage failure during replacement triggers best-effort rollback of every touched storage item. If rollback itself fails, report a generic recovery-critical error through existing monitoring without logging backup contents or user payloads.
- Backend validation/import errors never roll back the already successful local import automatically; they keep the explicit pause and recovery choice visible.
- Offline signed-in users may import locally and continue using the app, but protected cloud actions remain unavailable and sync remains paused.
- A consumed, corrupt, expired, or wrong-owner recovery record is never partially applied.
- Imported files are untrusted input. Error messages must not render raw JSON, imported free text, secrets, or stack traces.

## 8. Non-functional Requirements

- Security:
  - no auth token, provider secret, backend role, billing authority, or cross-owner queue/cursor is imported;
  - no imported HTML is rendered as markup;
  - raw backup payloads are not logged, sent to analytics, or sent to monitoring.
- Privacy:
  - cloud validation/import sends only the existing supported 12-week payload;
  - account-bound privacy and notification fields are not restored from file.
- Reliability:
  - local replacement is recoverable for seven days;
  - automatic sync cannot race the unresolved import decision;
  - a remote failure cannot destroy the imported local copy.
- Performance:
  - reject files over 10 MiB before JSON parsing;
  - summaries and fingerprints are computed in memory without additional network calls;
  - no new dependency is introduced.
- Accessibility:
  - destructive steps use `AlertDialog` with visible title, description, cancel action, focus management, and keyboard support;
  - status and errors use readable text and are not color-only;
  - loading actions expose disabled/busy state.
- Observability:
  - capture only bounded operation/status metadata such as phase, error code, owner-present boolean, candidate counts, and import ID;
  - never capture file contents, titles, descriptions, email, UID, tokens, or authorization headers.

## 9. Shell Design

- File selection opens a preview dialog only after successful validation.
- Preview compares `Hiện tại trên thiết bị` with `Trong file import` using the eight summary counts from `LOCAL-IMPORT-004`.
- First action: `Tiếp tục` moves to the final warning without writing state.
- Final action: `Tạo backup và thay dữ liệu` starts the Core transaction.
- Canceling either step leaves all data unchanged.
- After successful signed-in real-mode import, Settings displays `Đồng bộ đang tạm dừng sau khi nhập dữ liệu` with:
  - `Kiểm tra dữ liệu tài khoản`;
  - `Khôi phục dữ liệu trước import`;
  - explanatory text that `Để sau` keeps the local copy and pause intact.
- Valid cloud dry-run enables a separate confirmation action labeled `Đồng bộ dữ liệu 12 tuần lên tài khoản`.
- The cloud confirmation uses production-appropriate copy and explicitly states that cloud-only records are not deleted.
- Demo/signed-out completion reports that data was replaced on this device and that the recovery snapshot is available for seven days.

## 10. Out of Scope

- Merge import or per-record conflict selection between the file and current local data.
- Importing account export payloads, goal-only exports, CSV, ZIP, images, or formats other than the full local backup JSON.
- Deleting cloud-only goals or implementing an exact full-cloud workspace replacement.
- Uploading vision boards, reflections, wheel history, preferences, assistant memory, achievements, billing, or notification state to cloud.
- Backend route, model, schema, or authorization changes.
- Changing UserData storage keys or persisted shapes.
- Refactoring the anonymous-to-account migration flow or `LocalDataMigrationPrompt` beyond extracting a narrowly shared cloud-import helper if required by the implementation plan.
- Reintroducing the unused Dashboard import card or editing current Dashboard/Schedule WIP.
- General Settings redesign.

## 11. Acceptance Criteria and Test Mapping

- [ ] `LOCAL-IMPORT-001/003/005`: invalid, oversized, partial-export, and canceled preview paths produce zero storage/backend mutations.
- [ ] `LOCAL-IMPORT-002/004`: a valid backup is normalized and displays exact current-versus-imported summary counts.
- [ ] `LOCAL-IMPORT-006`: changing active data between preview and confirmation blocks replacement.
- [ ] `LOCAL-IMPORT-007/011`: imported account-bound, operational, credential, and unsupported storage state is absent after replacement.
- [ ] `LOCAL-IMPORT-008/009/010`: current identity is preserved, demo-seed status is cleared, and supported product records retain their identifiers/content.
- [ ] `LOCAL-IMPORT-039`: unsafe imported vision-board image sources are cleared before persistence and rejected again at the shared image render boundary without leaking the rejected value into the DOM.
- [ ] `LOCAL-IMPORT-012/013/015`: two-step confirmation precedes snapshot creation; snapshot failure leaves current state byte-for-byte unchanged.
- [ ] `LOCAL-IMPORT-014/018`: recovery captures sanitized current product data plus only the matching owner's queue/cursor; active stale queue/cursor is cleared.
- [ ] `LOCAL-IMPORT-016/017/020`: imported data replaces rather than merges, mirrors only to the active owner scope, and refreshes same/cross-tab consumers.
- [ ] `LOCAL-IMPORT-019`: an injected write failure restores every touched storage item and prior pause state.
- [ ] `LOCAL-IMPORT-021`: snapshots remain available before seven days and expire after seven days.
- [ ] `LOCAL-IMPORT-022/023/024/037`: signed-in real-mode import persists across reload, visibly pauses all generic auto/manual sync paths, and reconstructs Settings actions.
- [ ] `LOCAL-IMPORT-025`: demo, signed-out, and unconfigured paths remain local-only and call no protected API.
- [ ] `LOCAL-IMPORT-026/027/028/029`: cloud dry-run precedes a separately confirmed supported 12-week import with accurate non-replacement copy.
- [ ] `LOCAL-IMPORT-030`: `applied` and `duplicate` clear pause, reset cursor, retain recovery until expiry, and trigger one convergence sync.
- [ ] `LOCAL-IMPORT-031/032`: partial/error/skipped/no-supported-payload paths cannot clear pause by claiming success.
- [ ] `LOCAL-IMPORT-033/034/035/036`: recovery is confirmed, owner-safe, complete, reload-safe, and cannot apply corrupt/expired/cross-owner snapshots.
- [ ] `LOCAL-IMPORT-037/038`: reload reconstructs the pending actions and a second import cannot create a nested unresolved transaction.
- [ ] Existing anonymous account migration, billing/entitlement, account export/delete, storage migration, auto-sync conflict, and local-first write-safety tests remain green.

## 12. Verification Plan

Expected focused test surfaces:

```bash
npm run test:run -- src/app/utils/local-data-import.test.ts
npm run test:run -- src/app/pages/SettingsPage.local-import.test.tsx
npm run test:run -- src/features/plan12week/hooks/useAutoCloudSync.test.ts
npm run test:run -- src/app/utils/local-data-migration.test.ts src/app/utils/local-data-backup.test.ts
```

Run shared frontend gates because storage and sync boundaries are shared:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Security and scope scans:

```bash
rg -n "firebase_id_token|Authorization|subscription|entitlements|pushSubscription|privacyConsents" src/app/utils/local-data-import* src/app/pages/SettingsPage* src/features/plan12week/hooks/useAutoCloudSync*
rg -n "local_file_import|pending_cloud_decision" src
git diff --check
```

Manual browser acceptance when an authenticated real-mode test account and accessible backend are available:

1. Import a valid backup while signed in and online; verify local replacement succeeds but sync displays paused before any cloud request.
2. Reload `/settings`; verify the pending warning and both resolution actions return.
3. Run dry-run, cancel cloud confirmation, and verify pause remains.
4. Complete a valid cloud import; verify pause clears only on `applied` or `duplicate` and normal sync resumes.
5. Repeat offline; verify local data remains usable and cloud actions stay unavailable.
6. Restore the pre-import snapshot; verify data, queue, and sync eligibility return to their previous state.
7. Repeat in demo mode; verify no protected API request occurs.

Backend build/tests are not required unless implementation discovers that the existing validation/import contract cannot support the approved frontend behavior. Such a discovery stops implementation and requires a separate backend spec rather than an implicit contract change.

## 13. Rollout and Residual Risk

- Rollout is frontend-only and introduces bounded localStorage metadata; no UserData migration is required.
- Existing browsers with no pending marker behave unchanged.
- A browser storage quota near its limit may prevent recovery creation; the import must fail safely instead of continuing without backup.
- Browser localStorage is not a durable disaster-recovery service. The seven-day snapshot protects this workflow on the same browser but does not replace a downloaded backup or account cloud continuity.
- Existing backend import is an upsert/merge contract for supported 12-week records, not a complete cloud replacement. Cloud-only records can return on later pulls and the UI must disclose this.
- Production correctness still needs authenticated real-mode browser proof because unit tests cannot prove deployed Firebase session, backend validation/import, and network behavior.

## 14. Resolved Decisions

- Local file semantics: replace all supported local product data, never merge with the current local copy.
- Recovery semantics: create an automatic seven-day recovery snapshot before replacement.
- Signed-in real-mode semantics: pause automatic synchronization and require a separate cloud decision.
- Cloud semantics: validate first, then upload/upsert supported 12-week payloads only after explicit confirmation; do not silently replace or delete the full cloud workspace.
- Architecture: use a dedicated import transaction module rather than extending anonymous-account migration logic or embedding destructive behavior directly in `SettingsPage`.
- UI ownership: keep restore/import in Settings and do not touch current Dashboard/Schedule WIP.
- Transaction nesting: one unresolved file import per owner; another import remains disabled until the pending decision is resolved or restored.
