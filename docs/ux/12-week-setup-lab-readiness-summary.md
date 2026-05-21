# 12-Week Setup Lab — Readiness Summary

## 1. Current status

`/12-week-setup-lab` hiện ở trạng thái **POLISH**.

Luồng lab đã đủ ổn để tiếp tục kiểm thử nội bộ/nhỏ: QA ban đầu không phát hiện blocker, typecheck/build/test theo phạm vi 12-week đều pass, và browser QA xác nhận Step 1 → Step 4 chạy được trên mobile/desktop. Sau vòng polish, post-polish QA tiếp tục xác nhận full flow Step 1 → Step 4 pass và hành vi validation Step 2 hoạt động đúng theo kịch bản.

Tuy nhiên, readiness chưa đạt mức GO rộng hơn vì vẫn còn findings về polish/accessibility nhỏ, một checklist field order ở Step 1 chưa khớp, và simulated UX research vẫn cho thấy một số thuật ngữ còn nặng framework với user phổ thông.

## 2. What passed

- Typecheck: `npm run typecheck` — PASS trong QA baseline.
- Build: `npm run build` — PASS trong QA baseline.
- Test 12-week: `npm run test:run -- 12Week` — PASS, 46 files / 514 tests passed; có warning mock trong stderr nhưng exit code 0.
- Dev server demo mode chạy được ở local.
- Browser QA baseline xác nhận:
  - Step 1 → Step 4 hoàn tất được.
  - Step 4 preview có outcome, lag metric, why, start date/review day, scorecard explanation, recurring actions và Week 1.
  - Không thấy blocker, console error hoặc uncaught exception.
  - Không thấy tràn ngang nghiêm trọng; CTA chính khả dụng ở các viewport đã test.
  - Route cũ `/12-week-setup` vẫn vào được và không bị thay bằng lab UI.
- Post-polish QA xác nhận:
  - Step 2 không hiện lỗi đỏ khi mới vào step.
  - Lỗi validation Step 2 chỉ xuất hiện sau khi bấm tiếp với tên trống.
  - Lỗi validation biến mất sau khi nhập tên việc.
  - Sau khi seed đủ dữ liệu hợp lệ, Step 3 đi tiếp được sang Step 4.
  - Step 4 mobile và desktop được chụp lại sau polish.

## 3. What was fixed

- QA runner post-polish được sửa để kiểm tra validation Step 2 đúng hơn:
  - Force-click riêng kịch bản validation trên CTA disabled.
  - Kiểm tra lỗi theo `p[role='alert']` thay vì scan toàn body.
- Root cause “Step 3 disabled” được xác định là lỗi automation/test runner, không phải lỗi UX Step 3.
- Không có thay đổi source app, route chính, storage schema, backend, auth, paywall hoặc submit trong vòng post-polish QA được tổng hợp ở đây.

## 4. What remains

- Cần polish trước khi GO rộng hơn:
  - Một số click target nhỏ hơn 40px được ghi nhận ở mobile/desktop, chủ yếu liên quan skip navigation/header/footer/link phụ.
  - Step 1 có finding “field order không đúng hoặc thiếu label theo checklist”.
  - Failed network requests `net::ERR_ABORTED` xuất hiện trong QA logs; chưa ghi nhận ảnh hưởng UX trực tiếp, nhưng nên làm rõ nếu dùng report này cho release readiness.
- Về UX/copy theo simulated user testing:
  - Step 1 vẫn hơi trừu tượng với user ít quen planning framework, nhất là cụm “Kết quả cuối 12 tuần”.
  - Step 2 còn nặng khái niệm khi phân biệt “Việc lặp lại” và “Chỉ số kết quả”.
  - Step 3 có các thuật ngữ chưa đủ đời thường như “Mức tải tuần đầu”, “Quỹ thời gian”, “Ngày nhìn lại tuần”.
  - Step 4 preview hữu ích nhưng vẫn cần khóa rõ hơn mental model sau khi lưu và ý nghĩa scorecard/điểm thực thi.
- Test plan người dùng thật vẫn là kế hoạch; chưa có bằng chứng đã hoàn tất 3–5 phiên user test nội bộ thật.

## 5. Current recommendation

**POLISH**

Lý do: `/12-week-setup-lab` đã pass luồng chính và không có blocker kỹ thuật rõ trong phạm vi QA hiện tại, nhưng còn findings nhỏ về accessibility/checklist, cần làm rõ một số log network aborted, và simulated UX research vẫn cho thấy copy/mental model chưa đủ chắc cho GO rộng hơn. Chưa có tín hiệu đủ nặng để NO-GO.
