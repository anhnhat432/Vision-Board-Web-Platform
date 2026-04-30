# Codex Bugfix Prompt Templates

Use these prompts for daily bugfix work. Replace bracketed fields before sending.

General rule for every bugfix:

- Read the relevant files before changing anything.
- State the likely root cause.
- Propose a short plan.
- Fix the smallest safe surface.
- Do not refactor outside the bug scope.
- Do not change storage schema, routes, API shape, or business behavior unless the bug requires it.
- Run the smallest useful verification command first, then broaden only if needed.
- Report files changed, commands run, results, and remaining risks.

## 1. UI Bug Prompt

````text
Hãy sửa bug UI sau:

Bug:
- [Mô tả bug]

Context:
- Route/component: [đường dẫn route hoặc component]
- Expected behavior: [kỳ vọng]
- Actual behavior: [hiện tại]
- Screenshot/video nếu có: [link/path]

Trước khi sửa:
1. Đọc file UI liên quan.
2. Đọc component con/helper/hook liên quan.
3. Đọc tests hiện có cho route/component này nếu có.
4. Nêu nguyên nhân khả dĩ.
5. Đề xuất plan ngắn.

Ràng buộc:
- Sửa ít file nhất có thể.
- Không refactor ngoài phạm vi bug.
- Không đổi business logic nếu bug chỉ là UI.
- Không đổi storage schema.
- Không thêm dependency.

Sau khi sửa:
- Chạy npm run typecheck.
- Chạy test liên quan nếu có.
- Nếu bug ảnh hưởng public demo/mobile, cân nhắc kiểm tra bằng browser/screenshot.
- Báo cáo files changed, root cause, fix, commands run, remaining risks.
````

## 2. TypeScript / Build Bug Prompt

````text
Hãy sửa lỗi TypeScript/build sau:

Command fail:
- [command]

Error output:
```text
[paste lỗi chính]
```

Trước khi sửa:
1. Đọc file được error chỉ tới.
2. Đọc type/interface/helper liên quan.
3. Đọc import/export liên quan nếu lỗi do module.
4. Nêu nguyên nhân.
5. Đề xuất plan ngắn.

Ràng buộc:
- Sửa ít file nhất có thể.
- Không dùng any/ts-ignore trừ khi có lý do rất rõ và ghi lại.
- Không refactor ngoài phạm vi lỗi.
- Không đổi runtime behavior nếu chỉ là lỗi type.
- Không thêm dependency.

Sau khi sửa:
- Chạy lại command fail.
- Chạy npm run typecheck nếu chưa phải command fail.
- Nếu build fail, chạy npm run build.
- Báo cáo files changed, root cause, fix, commands run, remaining risks.
````

## 3. Test Fail Bug Prompt

````text
Hãy sửa test fail sau:

Failing command:
- [command]

Failing test(s):
- [test file / test name]

Error output:
```text
[paste lỗi chính]
```

Trước khi sửa:
1. Đọc test fail.
2. Đọc source code đang được test.
3. Kiểm tra test đang bắt behavior đúng hay đã stale.
4. Nêu nguyên nhân.
5. Đề xuất plan ngắn.

Ràng buộc:
- Ưu tiên sửa bug trong source nếu behavior test vẫn đúng.
- Chỉ sửa test nếu test stale hoặc query không còn phù hợp với behavior đúng.
- Không xóa test để pass.
- Không refactor ngoài phạm vi lỗi.
- Không thêm dependency.

Sau khi sửa:
- Chạy lại test fail.
- Nếu source surface rộng, chạy npm run test:run hoặc test suite liên quan.
- Chạy npm run typecheck nếu đổi source TS/TSX.
- Báo cáo files changed, root cause, fix, tests run, remaining risks.
````

## 4. localStorage / Migration Bug Prompt

````text
Hãy sửa bug localStorage/migration sau:

Bug:
- [Mô tả bug]

Data context:
- Storage key(s): [key nếu biết]
- Affected shape/type: [UserData/Goal/TwelveWeekSystem/etc.]
- Repro data nếu có:
```json
[paste JSON tối thiểu nếu có]
```

Trước khi sửa:
1. Đọc src/app/utils/storage.ts.
2. Đọc storage-types.ts và module storage liên quan.
3. Đọc migration/normalization helper liên quan.
4. Đọc tests storage hiện có.
5. Nêu nguyên nhân và rủi ro dữ liệu.
6. Đề xuất plan ngắn.

Ràng buộc:
- Không đổi USER_DATA_STORAGE_KEY nếu không có migration rõ.
- Không đổi APP_STORAGE_KEYS nếu không có migration rõ.
- Không đổi UserData shape tùy tiện.
- Không xóa dữ liệu user để sửa bug.
- Giữ local-first behavior.
- Sửa ít file nhất có thể.

Sau khi sửa:
- Thêm/cập nhật test migration/normalization nếu có nguy cơ regression.
- Chạy npm run typecheck.
- Chạy tests storage liên quan.
- Chạy npm run test:run nếu thay đổi storage rộng.
- Báo cáo files changed, root cause, data safety notes, tests run, remaining risks.
````

## 5. Backend API Bug Prompt

````text
Hãy sửa bug backend API sau:

Endpoint:
- [METHOD /api/...]

Bug:
- [Mô tả bug]

Expected response:
- [status/body]

Actual response:
- [status/body/log]

Trước khi sửa:
1. Đọc route liên quan trong backend/src/routes.
2. Đọc controller liên quan.
3. Đọc service liên quan.
4. Đọc repository/model liên quan nếu cần.
5. Đọc tests backend hiện có.
6. Nêu nguyên nhân.
7. Đề xuất plan ngắn.

Ràng buộc:
- Không đổi response shape chung nếu không cần.
- Không bỏ auth/ownership guard.
- Invalid payload/id nên trả 400, unauthorized 401, cross-user theo convention hiện có.
- Không thêm domain/endpoint mới nếu bug không yêu cầu.
- Không thêm dependency.
- Sửa ít file nhất có thể.

Sau khi sửa:
- Chạy npm --prefix backend run typecheck.
- Chạy npm --prefix backend run build.
- Chạy npm --prefix backend run test nếu test runner có sẵn.
- Báo cáo files changed, root cause, endpoints affected, commands run, remaining risks.
````

## 6. Billing / Paywall Mock Bug Prompt

````text
Hãy sửa bug billing/paywall mock sau:

Bug:
- [Mô tả bug]

Context:
- Surface: [paywall/dialog/billing page/mock checkout/settings]
- Expected behavior: [kỳ vọng]
- Actual behavior: [hiện tại]

Trước khi sửa:
1. Đọc billing/paywall file liên quan.
2. Đọc src/app/utils/production.ts hoặc modules production liên quan.
3. Đọc storage billing/entitlement helpers liên quan.
4. Đọc monetization/billing tests hiện có.
5. Nêu nguyên nhân.
6. Đề xuất plan ngắn.

Ràng buộc:
- Không biến mock checkout thành thanh toán thật.
- Không nói user bị thu tiền thật.
- Không thêm payment provider.
- Không đổi storage schema nếu không cần.
- Không refactor ngoài phạm vi bug.
- Sửa ít file nhất có thể.

Sau khi sửa:
- Chạy npm run typecheck.
- Chạy billing/monetization tests liên quan.
- Nếu copy hoặc UI public demo bị ảnh hưởng, kiểm tra wording rõ "mock checkout không thu tiền thật".
- Báo cáo files changed, root cause, fix, tests run, remaining risks.
````

## 7. Sync Local / Backend Bug Prompt

````text
Hãy sửa bug sync local/backend sau:

Bug:
- [Mô tả bug]

Context:
- Local entity: [goal/plan/week/task/metric/check-in/review]
- Backend entity: [goal/plan/week/task/metric]
- Mode: [demo/real]
- Auth state: [signed out/signed in/Firebase configured]
- Expected behavior: [kỳ vọng]
- Actual behavior: [hiện tại]

Trước khi sửa:
1. Đọc sync hook/service liên quan.
2. Đọc localStorage persistence liên quan.
3. Đọc frontend API client/link store liên quan.
4. Đọc backend route/service/model liên quan nếu bug chạm backend.
5. Đọc tests sync/hydration/conflict liên quan.
6. Nêu nguyên nhân và data safety risk.
7. Đề xuất plan ngắn.

Ràng buộc:
- Local save phải xảy ra trước backend sync.
- Demo mode không gọi protected backend sync paths.
- Remote sync fail không được phá local progress.
- Không auto-import anonymous data vào account.
- Không đổi storage schema nếu không có migration.
- Không thêm bulk cloud sync endpoint nếu bug không yêu cầu.
- Sửa ít file nhất có thể.

Sau khi sửa:
- Chạy npm run typecheck.
- Chạy sync/hydration/conflict tests liên quan.
- Nếu backend đổi, chạy npm --prefix backend run typecheck và build/test liên quan.
- Chạy npm run test:run nếu thay đổi sync rộng.
- Báo cáo files changed, root cause, data safety notes, commands/tests run, remaining risks.
````

## 8. Required Checklist After Every Bugfix

Use this checklist in the final response:

````text
Files changed:
- [file]

Root cause:
- [nguyên nhân ngắn gọn]

Fix:
- [sửa gì]

Verification:
- [command] -> pass/fail
- [command] -> pass/fail

Not run:
- [command không chạy và lý do]

Remaining risks:
- [risk/TODO/assumption]
````

Minimum verification guidance:

- Frontend TS/TSX changed: run `npm run typecheck`.
- Frontend behavior changed: run the smallest relevant Vitest file first.
- Shared frontend behavior changed: run `npm run test:run`.
- UI/public demo changed: consider browser/mobile smoke or screenshot.
- Backend changed: run `npm --prefix backend run typecheck` and `npm --prefix backend run build`.
- Backend behavior changed: run `npm --prefix backend run test` if available.
- Storage changed: run storage/migration tests and call out data safety.
- Billing changed: run billing/monetization tests and call out mock-vs-real boundary.
- Sync changed: run sync/hydration/conflict tests and call out local-first safety.
