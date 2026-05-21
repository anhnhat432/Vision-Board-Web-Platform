# 12-Week Setup Lab — Polish Backlog

## Why the current decision is POLISH

`/12-week-setup-lab` đã pass luồng chính và không có blocker kỹ thuật trong QA baseline, nhưng vẫn chưa đủ điều kiện GO rộng hơn. Hai nhóm tín hiệu chính vẫn còn:

- **QA artifact findings:** click target nhỏ hơn 40px ở mobile/desktop, một finding về field order/label ở Step 1, và các `net::ERR_ABORTED` trong log cần được làm rõ hơn nếu dùng cho release-readiness.
- **UX research signals:** user mới vẫn gặp ma sát về copy và mental model, nhất là ở Step 1, Step 2, Step 3, và preview Step 4.

Kết luận: lab đủ ổn để polish tiếp, nhưng chưa đủ chắc để thay route chính.

## Implementation note — 2026-05-21

Must-fix copy polish has been implemented in the lab route only, without replacing `/12-week-setup`, changing route behavior, dashboard behavior, or the underlying setup data model. Changes are intentionally limited to labels, helper text, and preview explanations in the lab setup flow.

## Prioritized polish items

| Severity | Type          | Affected area   | Item                                                                                                                  | Acceptance criteria                                                                                                                      | Replace-route gate               |
| -------- | ------------- | --------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| P0       | UX copy       | Step 1          | ✅ Làm rõ “Kết quả cuối 12 tuần” là đích đến sau 12 tuần, không phải task hằng ngày.                                  | Đã đổi label/helper sang “Đích đến sau 12 tuần” và mô tả trạng thái cuối chu kỳ, không phải việc mỗi ngày.                               | **Must fix — done**              |
| P0       | flow clarity  | Step 4          | ✅ Khóa rõ sau khi lưu sẽ sang weekly execution/Hôm nay.                                                              | Đã bổ sung copy trong mô tả Step 4 và preview: sau khi lưu sẽ vào phần thực thi hằng tuần và màn Hôm nay.                                | **Must fix — done**              |
| P0       | UX copy       | Step 4          | ✅ Làm rõ scorecard/điểm thực thi là điểm theo dõi việc lặp lại, không phải điểm chung chung.                         | Đã nêu rõ điểm thực thi chỉ đo số việc lặp lại đã hoàn thành, không phải điểm đánh giá năng lực/thành công.                              | **Must fix — done**              |
| P1       | UX copy       | Step 2          | ✅ Giảm độ nặng khái niệm của phần phân biệt “Việc lặp lại” và “Chỉ số kết quả”.                                      | Đã viết lại intro/ví dụ/details theo ngôn ngữ đời thường: việc chủ động làm đều vs con số xem lại sau.                                   | **Must fix — done**              |
| P1       | UX copy       | Step 3          | ✅ Viết lại các thuật ngữ như “Mức tải tuần đầu”, “Quỹ thời gian”, “Ngày nhìn lại tuần” theo ngôn ngữ đời thường hơn. | Đã đổi sang “Tuần đầu nên nhẹ hay nhiều việc?”, “thời gian có thể dành”, “Ngày xem lại tuần”.                                            | **Must fix — done**              |
| P1       | layout        | Step 4          | Giảm độ nặng của preview, nhóm card theo thứ tự ưu tiên rõ hơn.                                                       | Preview kể câu chuyện rõ hơn: outcome → recurring actions → review day → week 1.                                                         | Can wait if needed               |
| P1       | layout        | Step 2 / Step 3 | Tinh gọn khối giải thích phụ để user không phải đọc quá nhiều trước khi nhập dữ liệu.                                 | Màn hình vẫn đủ hướng dẫn nhưng nhẹ hơn; user có thể hoàn tất flow mà không bỏ qua các khối phụ quan trọng.                              | Can wait if needed               |
| P1       | validation    | Step 2          | Giữ hành vi validation hiện tại: lỗi chỉ hiện sau khi người dùng bấm tiếp khi dữ liệu thiếu.                          | Không hiện lỗi đỏ khi mới vào Step 2; lỗi xuất hiện đúng lúc và biến mất sau khi sửa input.                                              | Must keep / already validated    |
| P1       | validation    | Step 3          | Giữ điều kiện đi tiếp ở Step 3 ổn định sau khi đã có đủ dữ liệu hợp lệ.                                               | Khi seed đủ dữ liệu hợp lệ, Step 3 đi sang Step 4 bình thường và không còn trạng thái disabled sai.                                      | Must keep / already validated    |
| P2       | layout        | Route           | Làm rõ vấn đề click target nhỏ hơn 40px ở các link/phần phụ.                                                          | Các target tương tác nhỏ hơn ngưỡng không còn bị QA ghi nhận ở viewport mobile/desktop.                                                  | Can wait until after replacement |
| P2       | documentation | Route           | Làm rõ các `net::ERR_ABORTED` trong log QA để tránh hiểu nhầm khi review release readiness.                           | Báo cáo QA ghi rõ request nào là noise và request nào cần theo dõi thêm.                                                                 | Can wait until after replacement |
| P2       | test coverage | Step 1          | ✅ Bổ sung kiểm tra checklist/field order nếu muốn giữ lab làm ứng viên route chính.                                  | QA/code check xác nhận thứ tự field Step 1 vẫn là đích đến sau 12 tuần → lý do quan trọng → chỉ số → số mục tiêu/đơn vị → loại mục tiêu. | **Must fix — done**              |
| P2       | documentation | Route           | Bổ sung note rằng test plan người dùng thật chưa hoàn tất 3–5 phiên.                                                  | Tài liệu readiness/backlog thể hiện rõ lab chưa có bằng chứng user test thật đủ số lượng.                                                | Can wait until after replacement |

## What must be fixed before route replacement

Bộ tối thiểu trước khi cân nhắc thay `/12-week-setup` bằng lab:

1. ✅ **Step 1 copy rõ hơn**: user phải hiểu đây là đích đến sau 12 tuần.
2. ✅ **Step 4 flow clarity**: phải biết rõ sau khi lưu sẽ đi đâu.
3. ✅ **Step 4 scorecard clarity**: không được để user hiểu sai ý nghĩa điểm thực thi.
4. ✅ **Step 2 copy nhẹ hơn**: tách rõ hoạt động lặp lại và chỉ số kết quả.
5. ✅ **Step 3 copy đời thường hơn**: giảm thuật ngữ framework.
6. ✅ **Step 1 field order / label checklist**: phải khớp checklist QA.

## What can safely wait until after replacement

Những mục sau có thể xử lý sau khi route replacement nếu các P0/P1 cốt lõi đã đạt:

- Cải thiện click target nhỏ hơn 40px ở các link phụ/header/footer.
- Làm rõ `net::ERR_ABORTED` trong logs nếu không ảnh hưởng UX.
- Giảm độ nặng preview Step 4 bằng việc nhóm card tốt hơn.
- Tinh gọn các khối giải thích phụ ở Step 2 và Step 3.
- Bổ sung tài liệu note về trạng thái test plan người dùng thật.

## Decision note

Backlog này **không** đồng nghĩa với GO. `/12-week-setup-lab` vẫn ở trạng thái **POLISH** cho đến khi các mục P0/P1 bắt buộc được xử lý và xác nhận lại bằng QA.
