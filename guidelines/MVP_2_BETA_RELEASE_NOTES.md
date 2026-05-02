# MVP 2 Cloud Sync Beta — Release Notes

Prepared: 2026-05-01

## 1. Beta Purpose

This beta evaluates whether the current cloud sync foundation is safe and useful enough for authenticated users to keep their 12-week execution data across browser sessions and devices.

The beta is **not** a production launch. It is a controlled test with 3–5 trusted testers to validate:

- Data survives logout/login on the same browser.
- Data can be pulled from cloud on a different browser after manual sync.
- Conflicts are surfaced clearly and never silently overwrite local data.
- Testers feel confident enough to rely on sync for their real execution data.

## 2. What Changed Since MVP 1

MVP 1 was entirely local-first. All data lived in `localStorage` on the tester's browser. There was no login requirement, no backend sync, and no cloud persistence.

MVP 2 adds the following **authenticated** capabilities:

| Area | What's new |
|------|-----------|
| **Authentication** | Firebase email/Google sign-in. Account-scoped data storage. |
| **Local-to-account import** | Explicit import of anonymous/local data into an authenticated account. Pre-import backup created automatically. Anonymous data preserved. |
| **Mutation queue** | Local sidecar queue that records task toggles, daily check-ins, and weekly reviews as structured mutations. Auth-scoped. Compact on enqueue and before drain. |
| **Manual cloud sync** | Settings tab button: drain queue → send mutations to backend → pull cloud workspace → merge report → apply if safe. |
| **Backend mutation apply** | Backend applies `task_completed_changed`, `daily_check_in_upserted`, and `weekly_review_upserted`. Idempotent. Ownership-verified. |
| **Backend import** | Full workspace import: Goal, Plan, Week, Task, LeadMetric, DailyCheckIn, WeekReview records. |
| **Pull endpoint** | Read-only full workspace pull. Auth-scoped. Incremental cursor reserved but not yet delta. |
| **Conflict handling** | Merge report detects issues. UI shows safe-action panel: review details, export backup, keep local, use cloud version (with confirm), retry sync. No silent overwrite. |
| **Backup/export** | Local backup export from conflict panel and Settings. JSON file download. |
| **Offline hardening** | Network status hook. Compact queue before retry. Debounced reconnect retry (feature-flagged, default off). Queue preserved on failure. |
| **Security hardening** | Body size limits (1MB sync, 2MB global). Batch max 100. String length limits. Replay protection via mutationId + payloadHash. Structured error codes. |
| **Staging smoke test** | `npm run smoke:mvp2-sync` — CI-friendly E2E test with test-prefixed data, env-driven credentials, no hardcoded secrets. |

## 3. What Sync Supports

### Supported flows

| Flow | Status | Notes |
|------|--------|-------|
| Import local data to account | ✅ Supported | Explicit only. Backup created. Anonymous data preserved. |
| Task toggle sync | ✅ Supported | `task_completed_changed` applied by backend. |
| Daily check-in sync | ✅ Supported | `daily_check_in_upserted` — all fields preserved. |
| Weekly review sync | ✅ Supported | `weekly_review_upserted` — all score dimensions preserved. |
| Manual sync | ✅ Supported | Settings → "Đồng bộ cloud thủ công". |
| Pull/refresh | ✅ Supported | Full workspace pull after manual sync. |
| Conflict handling | ✅ Supported | Merge report → safe-action panel → no silent overwrite. |
| Backup export | ✅ Supported | JSON export from conflict panel or Settings. |

### Sync lifecycle

```
Local mutation → Queue (localStorage sidecar)
                     ↓
Manual sync button → Drain queue → POST mutations to backend
                     ↓
                  Pull cloud workspace → Merge report
                     ↓
           Safe? → Apply to localStorage
           Conflict? → Show safe-action panel
```

## 4. What Sync Does NOT Support Yet

| Limitation | Impact | When |
|-----------|--------|------|
| Automatic sync | Tester must click manual sync button | Future: auto-sync feature flag |
| Plan setup sync (`plan_snapshot_updated`) | Plan setup metadata not synced to cloud | Future: backend domain apply |
| Delta/incremental pull | Every pull returns full workspace | Future: cursor-based delta |
| Delete sync (tombstones) | Cannot delete items from cloud | Future: soft-delete flow |
| Field-level merge | Goal-level conflict resolution only | Future: field-level merge UI |
| Complete round-trip restore | Some plan metadata may not restore on a different device | Future: hydration gap fixes |
| Real-time collaboration | Not planned for MVP 2 | Out of scope |
| Automatic import on login | Import is explicit, user-initiated | By design |

## 5. Data Safety Notes

> **Export a backup before your first sync.**
> Settings → "Xuất bản sao local" or conflict panel → "Export local backup".

### Key safety guarantees

1. **Conflict never overwrites automatically.** If cloud and local data disagree, the app shows a safe-action panel. The tester must explicitly choose an action.
2. **Local data remains on the browser** unless the tester clears browser storage or explicitly chooses "Use cloud version" from the conflict panel.
3. **Anonymous/local data is preserved** after login. The original anonymous snapshot is kept at a separate storage key. A pre-import backup is created before any import.
4. **Queue is never deleted on failure.** If a sync attempt fails (network error, backend error), the mutations stay in the queue for retry.
5. **Mock billing only.** No real payment is processed. Mock checkout is clearly labeled.

### What to do if something goes wrong

1. Check if data is still in `localStorage` (DevTools → Application → Local Storage).
2. Export a local backup from Settings.
3. Report the issue using the bug report template (see §8 in the testing script).
4. Do **not** clear browser storage until you have exported a backup.

## 6. Tester Setup

### Prerequisites

- A beta deployment URL with real mode env configured
- A Firebase account (Google sign-in or email/password)
- A modern browser (Chrome, Edge, Firefox, Safari)

### Setup steps

1. **Open the app** at the beta URL.
2. **Create an account** — click "Đăng nhập" → sign in with Google or email.
3. **If you have local/demo data** — the migration prompt appears. Choose "Import local data" to bring it into your account.
4. **If starting fresh** — complete the onboarding flow: Life Balance → Life Insight → SMART Goal → Feasibility → 12-Week Setup.
5. **Find manual sync** — go to 12-Week System → Settings tab → scroll to "Mutation queue" panel.
6. **Sync manually** — click "Đồng bộ cloud thủ công" to push local changes to cloud.
7. **Test refresh** — reload the page and verify data persists.
8. **Test re-login** — clear browser storage, log in again, sync again, verify data restored.

## 7. Test Tasks for 5 Beta Testers

Each tester should complete these tasks independently. Share screens if possible. Do not coach unless the tester is blocked for more than 2 minutes.

### Tester 1: Core sync round-trip

1. Create a 12-week plan from scratch.
2. Toggle 2 tasks as complete.
3. Manual sync.
4. Refresh page.
5. Verify tasks still completed.
6. Log out, log in again.
7. Sync again.
8. Verify data restored.

### Tester 2: Daily execution sync

1. Complete a daily check-in with all fields filled (mood, note, rating, lead indicator).
2. Manual sync.
3. Refresh.
4. Verify check-in data persists.
5. Submit a weekly review.
6. Manual sync.
7. Verify review persists after refresh.

### Tester 3: Cross-device sync

1. On Device A: create plan, toggle tasks, check-in, manual sync.
2. On Device B (different browser): log in with same account.
3. Manual sync on Device B.
4. Verify core data (tasks, check-ins, reviews) pulled from cloud.
5. Note any missing plan metadata.

### Tester 4: Conflict handling

1. On Device A: toggle task X as complete. Do NOT sync.
2. On Device B: toggle the same task X differently. Sync.
3. Now sync on Device A.
4. Verify conflict panel appears.
5. Try "Export local backup".
6. Try "Keep local for now".
7. Try "Use cloud version" (with confirm).
8. Report whether copy was clear and actions felt safe.

### Tester 5: Import and backup

1. Start as a signed-out demo user. Complete onboarding, create a plan.
2. Log in.
3. When migration prompt appears, choose "Import local data".
4. Verify imported data appears in account scope.
5. Export a backup from Settings.
6. Clear browser storage.
7. Log in again.
8. Sync and verify data restored from cloud.

## 8. Feedback Questions

After each test session, ask the tester:

### Trust and confidence

1. Did you trust that your data was safe during sync? (1–5 scale)
2. Did you understand what was happening when you clicked "Đồng bộ cloud thủ công"?
3. Did you feel you could undo or recover if something went wrong?

### Data persistence

4. Did your data persist after refreshing the page?
5. Did your data persist after logging out and back in?
6. On a different device/browser, was your core data (tasks, check-ins, reviews) available?

### Conflict experience

7. If you saw a conflict, was the conflict copy understandable?
8. Did you know what each action (keep local, use cloud, export, retry) would do?
9. Did the conflict panel feel safe or scary?

### Local vs cloud awareness

10. At any point, did you know which data was local-only and which was synced to cloud?
11. Was the "Mutation queue" panel in Settings helpful or confusing?

### Overall

12. What was the most confusing moment?
13. What would make you feel comfortable relying on this for real goals?
14. Would you recommend this to a friend who needs a goal planner? Why or why not?

## 9. Known Limitations

1. **Manual sync only.** No automatic background sync. The tester must click the button.
2. **Full snapshot pull.** Every sync pulls the entire workspace. No incremental updates.
3. **Plan setup metadata may not round-trip.** Tactic details, template data, and some plan metadata may be missing on Device B.
4. **No delete from cloud.** Items cannot be removed from cloud storage during beta.
5. **Goal-level conflict only.** No field-level merge. Tester chooses whole-goal resolution.
6. **Mock billing.** The upgrade flow is simulated. No real charges.
7. **No rate limiting.** Acceptable for 3–5 testers. Not ready for wide release.
8. **1 pre-existing test failure** in `monetization-flows.e2e.test.tsx`. Not sync-related.

## 10. Rollback Plan

Rollback is instant via env var changes. No code changes required. No data loss.

| Step | Action | Effect |
|------|--------|--------|
| 1. Disable sync flags | Set `VITE_ENABLE_12_WEEK_MUTATION_SYNC=false` and `VITE_ENABLE_12_WEEK_PULL_SYNC=false` on Vercel. Redeploy. | Sync buttons disabled. App becomes local-only. |
| 2. Revert to demo mode | Set `VITE_APP_MODE=demo`. | All users see demo experience. No backend calls. |
| 3. Backend data safe | MongoDB data remains untouched. | Can resume sync later without data loss. |
| 4. Local data preserved | Env rollback does not touch localStorage. | Users keep their local data. |
| 5. Emergency backend stop | Stop the Render service or clear `FRONTEND_ORIGIN`. | Frontend falls back to local-only. |

## 11. Do-Not-Promise List

These features are **NOT** part of MVP 2 beta. Do not claim, imply, or promise them to testers or stakeholders:

| Do not promise | Why |
|---------------|-----|
| Real-time collaboration | Not designed for multi-user simultaneous editing. |
| Perfect offline merge | Offline changes may create conflicts requiring manual resolution. |
| Payment-backed Plus tier | Billing is mock. No real charges until paid MVP is shipped. |
| Enterprise backup/restore | No server-side backup export. Backup is local JSON only. |
| Automatic sync on every change | Auto-sync is feature-flagged off. Manual only. |
| Lossless cross-device restore | Some plan metadata gaps exist. |
| Data migration between accounts | Not supported. One account per workspace. |

## 12. Decision Rules After Beta

After collecting feedback from 3–5 testers, apply these decision rules:

### Path A: Polish sync → ship authenticated MVP

**Trigger:** Testers report trust ≥ 4/5, data persists reliably, conflict copy is clear.

**Actions:**
- Fix remaining hydration gaps for full round-trip.
- Implement auto-sync (feature-flagged).
- Add delta pull for scale.
- Ship authenticated MVP with sync as the default for signed-in users.

### Path B: Continue refactoring → delay ship

**Trigger:** Testers report trust < 3/5, or data loss incidents > 0.

**Actions:**
- Investigate and fix data loss root causes.
- Add field-level merge if conflicts are too confusing.
- Add more E2E coverage.
- Re-run beta with fixes.

### Path C: Ship paid MVP with current sync

**Trigger:** Testers satisfied AND billing provider integration is ready.

**Actions:**
- Replace mock billing with real provider.
- Wire sync as a Plus feature or default for all accounts.
- Production rate limiting, Helmet headers, monitoring.

### Path D: Pause new features → stabilize

**Trigger:** Testers find blocking UX issues outside sync (core flow confusion, onboarding drop-off).

**Actions:**
- Fix core UX issues first.
- Keep sync as-is (manual, behind feature flags).
- Re-evaluate sync priority after UX stabilization.
