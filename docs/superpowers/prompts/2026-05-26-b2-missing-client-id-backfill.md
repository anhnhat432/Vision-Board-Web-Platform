# B2 Follow-up — Backend trả entity thiếu clientId (root cause sâu)

> Phát hiện: P1 verify probe (2026-05-26) trên prod với account `vqkklr0@gmail.com`.
> Branch fix tạm: PRs #54 (B1 frontend), #55 (B2 unsafe→applied auto).
> Banner "Cần chọn bản dữ liệu" vẫn hiện trên `/billing/plan` cho user đã hydrate plan.

## Triệu chứng

Console log của user `vqkklr0@gmail.com` sau login fresh-context:

```
[auto-sync] starting {ownerUid: uFmoWjtUdlhQyAMtHL9h9FyDz0F2}
[auto-sync] overwrote untouched local seed with cloud snapshot 
{cloudOnlyCount: 0, missingClientIdCount: 139, unsupportedFieldCount: 0}
[auto-sync] starting {ownerUid: ...}
[auto-sync] finished with attention needed 
{status: conflict, message: Có xung đột dữ liệu không thể tự động giải quyết...}
```

Sync đầu tiên áp dụng cloud snapshot (untouched seed policy). Lần sau, `missingClientIdCount: 139` làm `safeToApply: false` và `autoResolvable: false` → status `conflict` → SyncStatusPill state="conflict" hiện banner.

## Root cause

Cloud trả về entity (goal/plan/week/task/leadMetric/dailyCheckIn/weeklyReview) thiếu các field:

- `clientGoalId`
- `clientPlanId`
- `clientWeekId`
- `clientTaskId`
- `clientMetricId`
- `clientCheckInId`
- `clientReviewId`

Chỉ có `_id` (MongoDB ObjectId) nhưng không có client UUID. Frontend treat đây là `missingClientId` issue (xem `src/features/plan12week/persistence/pulledWorkspaceMergeReport.ts:277-286`).

Khả năng cao: 139 entity của account `vqkklr0@` được tạo qua flow cũ (admin tool, seed script, hoặc trước khi `clientXxxId` field được introduce) nên DB không có field này.

## Fix options

### Option A — DB migration (RECOMMEND)

Backfill `clientXxxId` cho mọi entity thiếu field, dùng UUID mới (KHÔNG dùng `_id` để tránh frontend mistake):

```js
// scripts/migrate-backfill-client-ids.js
import { GoalModel, PlanModel, WeekModel, TaskModel, ... } from './backend/src/models'
import { v4 as uuidv4 } from 'uuid'

await GoalModel.updateMany(
  { clientGoalId: { $in: [null, undefined, ''] } },
  [{ $set: { clientGoalId: { $toString: { $oid: '$_id' } } } }],
)
// Tương tự cho Plan, Week, Task, LeadMetric, DailyCheckIn, WeekReview
```

**Risk**: backend sẽ trả entity với `_id` làm `clientId`. Frontend dùng `clientGoalId` làm `Goal.id` → user đã có local goal sẽ thấy goal MỚI thay vì cập nhật goal cũ. Cần test kỹ trên staging.

### Option B — Frontend tolerate

Trong `pulledWorkspaceMergeReport.ts`, KHÔNG count `missingClientId` là blocking issue cho `autoResolvable`. Vẫn report missingClientId trong summary để debug, nhưng cho auto-merge chạy.

```ts
// pulledWorkspaceMergeReport.ts:855-866
const autoResolvable =
  conflicts.every((c) => {
    if (c.winnerSource === "missing_timestamp" && c.winner === "cloud") return false;
    return true;
  }) &&
  // missingClientIds.length === 0 &&  ← BỎ
  unsupportedFields.length === 0;
```

**Risk**: entity thiếu clientId sẽ được skip trong merge (xem code apply: `if (!task.clientPlanId || !task.clientTaskId) return;`). Auto-merge xong, banner ẩn, nhưng user **không nhận data của 139 entity đó** → silent data loss.

### Option C — Backend response fallback (NGUY HIỂM)

Trong `twelveWeekPullService.ts mapGoal/mapPlan/...`, thêm fallback:

```ts
clientGoalId: optionalString(doc.clientGoalId) ?? doc._id.toString(),
```

**Risk cao nhất**: Frontend dùng `clientGoalId` làm `Goal.id`. Nếu user đã có local Goal với clientId cũ (UUID v4 style) và cloud bắt đầu trả `_id` (24 hex) làm clientId → frontend coi là Goal MỚI → duplicate goal HOẶC overwrite local goal sai.

## Đề xuất

1. **Hot-fix demo**: workaround UI — ẩn `SyncStatusPill state="conflict"` khỏi header khi `missingClientIdCount > 0` (vì đây là data legacy issue, không phải user conflict). Vẫn hiện trong `/settings#account-sync`.

2. **Sau demo**: Option A (DB migration) trên staging trước. Sau khi verify, run migration trên production. Đồng thời thêm validation ở schema để mọi entity mới luôn có clientXxxId.

## Files liên quan

- `backend/src/models/GoalModel.ts` etc — schema check
- `backend/src/services/twelveWeekPullService.ts:520-650` — map functions
- `src/features/plan12week/persistence/pulledWorkspaceMergeReport.ts:271-470` — createCloudIndex
- `src/features/plan12week/persistence/pulledWorkspaceApply.ts:507-621` — buildPulledGoal sử dụng clientId làm Goal.id
- `src/app/components/root-layout/SyncStatusPill.tsx:84-89` — conflict pill
- `src/features/plan12week/hooks/useTwelveWeekManualCloudSync.ts:281-410` — sync flow

## Account test

`vqkklr0@gmail.com` (Plus, đã onboarded, có 2 plan với 139 missing clientIds). Dùng tài khoản này để verify migration trên staging.

## Verify probe

```bash
VB_TEST_EMAIL=... VB_TEST_PASSWORD=... node qa-artifacts/b1b2b3-verify/probe.mjs
```

Sau migration, expect:
- `bannerOnBillingPlan: false`
- Console: `missingClientIdCount: 0`
- Status: `applied` thay vì `conflict`
