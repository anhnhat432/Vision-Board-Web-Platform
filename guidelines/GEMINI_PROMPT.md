## ✅ Giai đoạn 3 — Mongoose Transactions hoàn thành

### Files changed:

| File                                      | Method                      | Change                                                                                                                                                           |
| ----------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MongoSyncWorkspaceMutationRepository.ts` | `applyPlanSnapshotUpdated`  | Thêm `mongoose.startSession()` + `startTransaction/commitTransaction/abortTransaction/endSession` pattern. Bọc Plan update + Week loop trong cùng 1 transaction. |
| `MongoSyncWorkspaceMutationRepository.ts` | `applyWeeklyReviewUpserted` | Thêm transaction cho Week update + WeekReview upsert. Nếu Week update fail hoặc WeekReview upsert fail → toàn bộ rollback.                                       |

### Pattern sử dụng:

```typescript
const session = await mongoose.startSession();
try {
  session.startTransaction();
  // All writes pass { session } option:
  await Model.findByIdAndUpdate(id, update, { session, ... });
  await Model.create([data], { session });
  await session.commitTransaction();
  return result;
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Methods không thêm transaction (lý do):

| Method                      | Lý do                                     |
| --------------------------- | ----------------------------------------- |
| `applyTaskCompletedChanged` | Single document write — atomic by default |
| `applyLeadMetricUpserted`   | Single document upsert                    |
| `applyDailyCheckInUpserted` | Single document upsert                    |

### Verification:

```
npm --prefix backend run check
  → typecheck: PASS (0 errors)
  → build:     PASS (0 errors)
```
