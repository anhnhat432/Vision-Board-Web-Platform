# Admin Classification Feedback Design

## Problem

The admin user list hides the badge for every `real` classification and reports both backend outcomes `updated` and `unchanged` as a generic success count. An explicitly confirmed real account therefore looks unclassified, while a no-op request appears to have changed data.

## Approved Behaviour

- A user whose effective category is `real` and whose source is `user` shows the badge `Dữ liệu thật · Đã xác nhận`.
- A default real user (`source: "default"`) remains without a badge so explicit confirmation is distinguishable from the default fallback.
- Test and internal badges retain their existing labels and tones.
- Bulk feedback reports separate counts for `updated`, `unchanged`, and `failed` results.
- Retry and request-id behaviour remain unchanged. Only failed unknown-commit targets remain selected for retry.
- Backend contracts, persistence, filters, and audit semantics do not change.

## UI Copy

```text
1 đã cập nhật, 1 không thay đổi, 0 thất bại.
```

When failures exist, the existing safe failure detail is appended.

## Verification

- Component test proves explicit real classification renders a badge while default real does not.
- Page test proves mixed `updated`, `unchanged`, and `failed` results produce distinct counts.
- Existing retry, navigation, filter, and dialog tests remain green.
