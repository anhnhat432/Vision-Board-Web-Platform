# 12-Week Setup Lab — Internal User Test Plan

## Mục tiêu

Chuẩn bị test người dùng nội bộ cho `/12-week-setup-lab` trước khi quyết định thay thế route chính `/12-week-setup`.

Mục tiêu nghiên cứu:

- Xác nhận người dùng hiểu được 4 bước thiết lập kế hoạch 12 tuần.
- Tìm các điểm gây mơ hồ trong copy, nhãn field, ví dụ và thứ tự thao tác.
- Đánh giá mức tự tin của người dùng trước khi bấm **Lưu kế hoạch**.
- Thu thập tín hiệu định tính để quyết định: giữ lab thêm, chỉnh copy/UI nhỏ, hoặc thay route chính.

## Phạm vi

Trong phạm vi:

- Route test: `/12-week-setup-lab`.
- Test 3–5 người dùng nội bộ.
- Test trên mobile là ưu tiên; desktop có thể dùng nếu người tham gia thường dùng desktop.
- Tập trung vào khả năng hiểu, luồng ra quyết định và mức tự tin.

Ngoài phạm vi:

- Không test hiệu năng kỹ thuật sâu.
- Không test billing, auth, sync hoặc backend.
- Không so sánh A/B định lượng với `/12-week-setup` trong vòng này.
- Không yêu cầu sửa code trong phiên test.

## Người tham gia đề xuất

Tối thiểu 3 người, lý tưởng 5 người:

1. Một người có mục tiêu học tập hoặc chứng chỉ.
2. Một người có mục tiêu hoàn thành project/công việc.
3. Một người có mục tiêu sức khỏe/thói quen.
4. Nếu có thêm: một người ít quen dùng app productivity.
5. Nếu có thêm: một người đã từng dùng planner/notion/todo app.

## Kịch bản test chung

Thời lượng mỗi phiên: 20–30 phút.

Người điều phối nói ngắn gọn:

> Bạn đang thử một màn hình giúp biến mục tiêu 12 tuần thành kế hoạch có thể thực hiện hằng tuần. Hãy đọc như người dùng thật, nói ra suy nghĩ nếu có thể. Không có câu trả lời đúng/sai; mục tiêu là xem màn hình có dễ hiểu không.

Yêu cầu người tham gia:

1. Mở `/12-week-setup-lab`.
2. Chọn hoặc nhập theo một trong ba mục tiêu test bên dưới.
3. Đi qua Step 1 → Step 4.
4. Trước khi bấm **Lưu kế hoạch**, nói mức tự tin từ 1–5.
5. Sau khi lưu, trả lời form feedback.

Thang điểm tự tin:

- 1 = Không hiểu mình đang lưu gì.
- 2 = Có nhiều chỗ còn mơ hồ.
- 3 = Tạm hiểu, nhưng chưa chắc kế hoạch có dùng được.
- 4 = Khá tự tin, chỉ còn vài điểm nhỏ.
- 5 = Rất tự tin và biết tiếp theo phải làm gì.

## Mục tiêu test 1 — Học tập

Mục tiêu: **Đạt TOEIC 650 trong 12 tuần.**

Gợi ý dữ liệu nếu người tham gia bị kẹt:

- Kết quả cuối 12 tuần: đạt TOEIC 650 hoặc tăng từ mức hiện tại lên gần 650.
- Việc lặp lại: học từ vựng 5 ngày/tuần, luyện nghe 3 buổi/tuần, làm đề thử mỗi tuần.
- Chỉ số kết quả: điểm mock test, số đề đã hoàn thành, điểm nghe/đọc.
- Ngày nhìn lại tuần: Chủ nhật tối hoặc sáng thứ Hai.

Checklist quan sát:

- [ ] Step 1: Người tham gia có hiểu “Kết quả cuối 12 tuần” là trạng thái/kết quả cần đạt, không chỉ là hoạt động học mỗi ngày không?
- [ ] Step 2: Người tham gia có phân biệt được “Việc lặp lại” như học từ vựng/luyện nghe với “Chỉ số kết quả” như điểm mock test/số đề hoàn thành không?
- [ ] Step 3: Người tham gia có hiểu “Ngày nhìn lại tuần” là ngày kiểm tra tiến độ và điều chỉnh kế hoạch tuần sau không?
- [ ] Step 4: Người tham gia có đủ tự tin bấm **Lưu kế hoạch** không?

Ghi chú nhanh:

- Điểm tự tin trước khi lưu: \_\_\_ / 5
- Có cần người điều phối giải thích thêm không? Có / Không
- Bước gây kẹt nhất: Step \_\_\_

## Mục tiêu test 2 — Project

Mục tiêu: **Hoàn thành MVP Vision Board để demo cho 10 người.**

Gợi ý dữ liệu nếu người tham gia bị kẹt:

- Kết quả cuối 12 tuần: MVP có thể demo, có core flow ổn định, đã demo cho 10 người.
- Việc lặp lại: làm 3 phiên deep work/tuần, review feedback mỗi tuần, sửa bug ưu tiên hằng tuần.
- Chỉ số kết quả: số màn hình hoàn thành, số người đã demo, số feedback xử lý, số bug blocking còn lại.
- Ngày nhìn lại tuần: chiều thứ Sáu hoặc Chủ nhật.

Checklist quan sát:

- [ ] Step 1: Người tham gia có hiểu “Kết quả cuối 12 tuần” là một mốc hoàn thành cụ thể của MVP, không phải danh sách task rời rạc không?
- [ ] Step 2: Người tham gia có phân biệt được “Việc lặp lại” như deep work/review feedback với “Chỉ số kết quả” như số người demo/số bug còn lại không?
- [ ] Step 3: Người tham gia có hiểu “Ngày nhìn lại tuần” là thời điểm đánh giá tuần vừa rồi và chọn ưu tiên tuần tới không?
- [ ] Step 4: Người tham gia có đủ tự tin bấm **Lưu kế hoạch** không?

Ghi chú nhanh:

- Điểm tự tin trước khi lưu: \_\_\_ / 5
- Có cần người điều phối giải thích thêm không? Có / Không
- Bước gây kẹt nhất: Step \_\_\_

## Mục tiêu test 3 — Sức khỏe

Mục tiêu: **Tập gym đều 3 buổi/tuần.**

Gợi ý dữ liệu nếu người tham gia bị kẹt:

- Kết quả cuối 12 tuần: duy trì 3 buổi gym/tuần trong phần lớn 12 tuần, cơ thể khỏe hơn, tăng sức bền/sức mạnh.
- Việc lặp lại: đi gym thứ Hai/thứ Tư/thứ Sáu, chuẩn bị đồ tập tối hôm trước, ghi lại buổi tập.
- Chỉ số kết quả: số buổi tập/tuần, số tuần đạt 3 buổi, mức tạ hoặc số phút cardio.
- Ngày nhìn lại tuần: Chủ nhật.

Checklist quan sát:

- [ ] Step 1: Người tham gia có hiểu “Kết quả cuối 12 tuần” là kết quả/thói quen ổn định sau 12 tuần, không chỉ là “đi tập hôm nay” không?
- [ ] Step 2: Người tham gia có phân biệt được “Việc lặp lại” như đi gym 3 buổi/tuần với “Chỉ số kết quả” như số buổi tập hoặc số tuần đạt chuẩn không?
- [ ] Step 3: Người tham gia có hiểu “Ngày nhìn lại tuần” là ngày tự kiểm tra tuần vừa rồi có đạt 3 buổi không và chỉnh lịch tuần sau không?
- [ ] Step 4: Người tham gia có đủ tự tin bấm **Lưu kế hoạch** không?

Ghi chú nhanh:

- Điểm tự tin trước khi lưu: \_\_\_ / 5
- Có cần người điều phối giải thích thêm không? Có / Không
- Bước gây kẹt nhất: Step \_\_\_

## Form ghi feedback sau phiên test

Thông tin phiên:

- Người tham gia: ********\_\_\_\_********
- Ngày test: ********\_\_\_\_********
- Thiết bị: Mobile / Desktop / Tablet
- Mục tiêu test: Học tập / Project / Sức khỏe
- Người điều phối: ********\_\_\_\_********

Câu hỏi feedback:

1. Chỗ nào khó hiểu nhất?
   - Trả lời: ******************************\_\_\_\_******************************

2. Chỗ nào quá dài hoặc khiến bạn không muốn đọc hết?
   - Trả lời: ******************************\_\_\_\_******************************

3. Từ hoặc cụm từ nào nghe lạ, không tự nhiên, hoặc cần giải thích thêm?
   - Trả lời: ******************************\_\_\_\_******************************

4. Sau khi bấm **Lưu kế hoạch**, bạn có biết tiếp theo phải làm gì không?
   - Có / Không / Không chắc
   - Vì sao: ******************************\_\_\_\_******************************

5. Có bước nào khiến bạn muốn bỏ cuộc không?
   - Không
   - Có, ở Step \_\_\_
   - Lý do: ******************************\_\_\_\_******************************

6. Nếu được sửa một điều để màn hình dễ dùng hơn, bạn muốn sửa gì?
   - Trả lời: ******************************\_\_\_\_******************************

7. Mức tự tin tổng thể với kế hoạch đã tạo:
   - 1 / 2 / 3 / 4 / 5
   - Lý do: ******************************\_\_\_\_******************************

## Bảng tổng hợp kết quả

| Người tham gia | Mục tiêu                     | Step 1 hiểu kết quả 12 tuần | Step 2 phân biệt lặp lại/chỉ số | Step 3 hiểu ngày nhìn lại | Step 4 tự tin lưu | Bước gây kẹt | Ghi chú chính |
| -------------- | ---------------------------- | --------------------------- | ------------------------------- | ------------------------- | ----------------- | ------------ | ------------- |
| P1             | Học tập / Project / Sức khỏe | Có / Không / Một phần       | Có / Không / Một phần           | Có / Không / Một phần     | 1–5               | Step \_\_\_  |               |
| P2             | Học tập / Project / Sức khỏe | Có / Không / Một phần       | Có / Không / Một phần           | Có / Không / Một phần     | 1–5               | Step \_\_\_  |               |
| P3             | Học tập / Project / Sức khỏe | Có / Không / Một phần       | Có / Không / Một phần           | Có / Không / Một phần     | 1–5               | Step \_\_\_  |               |
| P4             | Học tập / Project / Sức khỏe | Có / Không / Một phần       | Có / Không / Một phần           | Có / Không / Một phần     | 1–5               | Step \_\_\_  |               |
| P5             | Học tập / Project / Sức khỏe | Có / Không / Một phần       | Có / Không / Một phần           | Có / Không / Một phần     | 1–5               | Step \_\_\_  |               |

## Tiêu chí quyết định sau test

Có thể cân nhắc thay `/12-week-setup` bằng `/12-week-setup-lab` nếu:

- Ít nhất 4/5 hoặc 3/3 người hiểu đúng Step 1.
- Ít nhất 4/5 hoặc 3/3 người phân biệt được “Việc lặp lại” và “Chỉ số kết quả” ở Step 2.
- Ít nhất 4/5 hoặc 3/3 người hiểu “Ngày nhìn lại tuần” ở Step 3.
- Điểm tự tin trung bình trước khi lưu đạt từ 4/5 trở lên.
- Không có hơn 1 người muốn bỏ cuộc ở cùng một bước.
- Không xuất hiện lỗi copy nghiêm trọng khiến người dùng hiểu sai kế hoạch sẽ được dùng như thế nào.

Nên giữ lab thêm một vòng chỉnh sửa nếu:

- Step 2 vẫn gây nhầm giữa hoạt động và chỉ số.
- Người dùng không hiểu vì sao cần chọn ngày nhìn lại tuần.
- Người dùng bấm lưu nhưng không biết bước tiếp theo là gì.
- Có từ/cụm từ bị nhiều người đánh dấu là “nghe lạ”.

## Gợi ý ghi nhận sau test

Sau mỗi phiên, người điều phối nên ghi ngay:

- Quote nguyên văn của người dùng khi họ bị kẹt.
- Bước họ dừng lâu nhất.
- Field nào họ đọc lại nhiều lần.
- Người dùng có cần ví dụ để tiếp tục không.
- Người dùng có hiểu kế hoạch này sẽ dẫn sang weekly execution/review không.

Không cần đưa ra kết luận route replacement ngay trong phiên. Tổng hợp sau khi hoàn thành tối thiểu 3 phiên test.
