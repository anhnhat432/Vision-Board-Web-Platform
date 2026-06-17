# Bộ hướng dẫn sử dụng theo màn hình (New-User UX Guide)

Tài liệu này dành cho team UX Writing, Design và Frontend của Vision Board Web Platform
(Dear Our Future). Mục tiêu: giúp người dùng mới hiểu nhanh từng màn hình và biết
ngay "việc nên làm tiếp theo".

Phạm vi bám đúng luồng lõi sản phẩm:

Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility Check ->
12-Week Plan -> Weekly Execution -> Reflection/Review

Mỗi màn hình gồm 4 phần:
1. Thành phần chính trên màn hình.
2. Nội dung hướng dẫn (ngắn, súc tích, hướng hành động).
3. Định dạng hiển thị đề xuất.
4. Ghi chú giọng văn / giảm bối rối.

---

## 0. Nguyên tắc chung về giọng văn (Voice & Tone)

- Thân thiện, đồng hành, không ra lệnh. Xưng hô "bạn", tránh "người dùng".
- Mỗi hướng dẫn nói rõ MỘT hành động kế tiếp. Tránh liệt kê nhiều việc cùng lúc.
- Ưu tiên động từ ở đầu câu: "Chấm điểm...", "Chọn...", "Tick...", "Viết...".
- Độ dài lý tưởng: tooltip <= 12 từ, mô tả empty state 1-2 câu, bước walkthrough <= 2 câu.
- Không dùng thuật ngữ kỹ thuật (sync, entitlement, outbox) trong copy người dùng thấy.
- Trấn an khi có rủi ro: nói rõ dữ liệu được lưu, hành động nào hoàn tác được.
- Real mode: tránh từ "dùng thử", "không cần đăng nhập", "trên trình duyệt này",
  "không thu tiền thật", "mock", "demo". Dùng ngôn ngữ gắn tài khoản.

## Bảng định dạng hiển thị (Format Catalog)

| Định dạng | Khi nào dùng | Đặc điểm |
|---|---|---|
| Pop-up walkthrough | Lần đầu vào luồng lõi, cần định hướng tổng thể | 3-5 bước, có nút Bỏ qua, không ép buộc |
| Tooltip / hover hint | Giải thích 1 nút/ô nhập cụ thể, ngữ cảnh hẹp | Ngắn, hiện khi hover/focus, không che nội dung |
| Empty state | Màn chưa có dữ liệu (chưa có mục tiêu, nhật ký...) | 1 minh hoạ + 1 câu dẫn + 1 nút hành động |
| Checklist onboarding | Theo dõi tiến độ làm quen toàn app | Đã có sẵn trong code: new-user-guide.ts |
| Inline helper text | Dưới ô nhập, gợi ý cách điền đúng | Ngắn, thay đổi theo trạng thái lỗi/đúng |
| Progress stepper | Luồng nhiều bước (SMART, 12-Week Setup) | Cho thấy đang ở bước mấy / còn mấy bước |
| Banner | Trạng thái hệ thống (offline, hết hạn gói) | Không chặn thao tác trừ khi bắt buộc |
| Coachmark / spotlight | Trỏ vào 1 thành phần mới ngay sau khi mở khoá | Dùng tiết kiệm, 1 lần / tính năng |

> Hạ tầng đã có trong code và nên tái dùng thay vì làm mới:
> - Checklist: `src/app/utils/new-user-guide.ts`
> - Empty state: `src/app/components/empty-states`, `src/app/components/states/EmptyState.tsx`
> - Stepper luồng lõi: `CoreFlowProgress`
> - Banner: `OfflineBanner`, `GracePeriodBanner`, `SyncStatusPill`
> - Paywall: `UpgradePaywallDialog`, `usePlanEntitlements`

---

## 1. Màn Đăng nhập / Đăng ký (`/login`)

Thành phần chính:
- Logo "Vision Board", ô Email, ô Mật khẩu, ô Xác nhận mật khẩu (khi đăng ký).
- Checklist độ mạnh mật khẩu (vd "Khớp với mật khẩu xác nhận").
- Nút Đăng nhập / Đăng ký, liên kết "Quên mật khẩu", thông báo xác minh email.

Nội dung hướng dẫn (action-oriented):
- Tiêu đề: "Đăng nhập để giữ kế hoạch trên mọi thiết bị."
- Phụ đề: "Dữ liệu của bạn được lưu vào tài khoản này và đồng bộ khi bạn quay lại."
- Inline helper ô mật khẩu (đăng ký): "Đặt mật khẩu từ 8 ký tự để bảo vệ tài khoản."
- Sau đăng ký: "Mở email và bấm liên kết xác minh để mở khoá đầy đủ tính năng."
- Lỗi sai mật khẩu: "Mật khẩu chưa đúng. Thử lại hoặc bấm Quên mật khẩu."
- Lỗi không có tài khoản: "Chưa có tài khoản với email này. Hãy đăng ký trước nhé."

Định dạng hiển thị:
- Inline helper text dưới mỗi ô nhập.
- Banner xác minh email sau khi đăng ký (account-bound, không nói "trình duyệt này").
- Thông báo lỗi inline phân biệt rõ sai-mật-khẩu và chưa-có-tài-khoản.

Ghi chú giọng văn:
- Nhấn lợi ích (giữ kế hoạch, đồng bộ) thay vì bắt buộc.
- Không dùng từ "demo/dùng thử" ở real mode.

## 2. Onboarding (`/onboarding`) - Welcome + Đánh giá

Thành phần chính:
- Chế độ "welcome" với Atlas/bản đồ cuộc sống 8 vùng và 3 bước: Đánh giá -> Trọng tâm -> Kế hoạch.
- Chế độ "assessment": chấm điểm 8 lĩnh vực (Career, Finance, Health, Education,
  Relationships, Family, Personal Growth, Leisure).
- Nhãn mức điểm: "Cần chăm sóc" / "Ổn định" / "Đang phát triển".

Nội dung hướng dẫn:
- Welcome (1 câu mở): "Bắt đầu bằng một bức tranh nhanh về cuộc sống của bạn."
- CTA chính: "Chấm điểm 8 lĩnh vực" (1-2 phút).
- Coachmark vào thanh chấm điểm đầu tiên: "Kéo để chấm điểm thật, không cần hoàn hảo."
- Trấn an: "Bạn có thể chỉnh lại điểm bất cứ lúc nào. Nháp được lưu tự động."

Định dạng hiển thị:
- Pop-up walkthrough 3 bước (Đánh giá -> Trọng tâm -> Kế hoạch) ngay lần đầu.
- Coachmark cho thanh điểm đầu tiên (chỉ hiện 1 lần).
- Inline helper dưới mỗi lĩnh vực giải thích lĩnh vực đó là gì.

Ghi chú giọng văn:
- Giảm áp lực hoàn hảo: nhấn "chấm thật" thay vì "chấm đúng".
- Nhắc nháp tự lưu để người dùng yên tâm rời màn giữa chừng.

## 3. Life Balance (`/life-balance`)

Thành phần chính:
- Biểu đồ bánh xe / điểm 8 lĩnh vực, lịch sử Wheel of Life, nút cập nhật điểm.

Nội dung hướng dẫn:
- Tiêu đề dẫn: "Đây là nơi bạn đang lệch - và nơi nên ưu tiên."
- Empty state (chưa chấm): "Chưa có dữ liệu cân bằng. Chấm 8 lĩnh vực để bắt đầu."
  + nút "Đánh giá cân bằng".
- Tooltip điểm thấp: "Điểm thấp gợi ý lĩnh vực nên chăm sóc trước."

Định dạng hiển thị:
- Empty state khi chưa có dữ liệu.
- Tooltip trên từng nan bánh xe.

Ghi chú giọng văn:
- Trình bày điểm thấp như cơ hội, không phải thất bại.

## 4. Life Insight (`/life-insight`)

Thành phần chính:
- Gợi ý lĩnh vực trọng tâm dựa trên dữ liệu Life Balance; chọn 1 trọng tâm để đi tiếp.

Nội dung hướng dẫn:
- Tiêu đề: "Chọn một trọng tâm cho 12 tuần tới."
- Phụ đề: "Dựa trên điểm cân bằng, đây là nơi đáng đầu tư nhất ngay bây giờ."
- CTA: "Chọn trọng tâm này" -> mở SMART Goal.
- Helper khi do dự: "Chỉ chọn 1 để giữ tập trung. Lĩnh vực khác vẫn đợi bạn sau."

Định dạng hiển thị:
- Empty state nếu chưa có dữ liệu cân bằng: dẫn quay lại Onboarding/Life Balance.
- Inline helper giải thích vì sao app gợi ý lĩnh vực này.

Ghi chú giọng văn:
- Nhấn "tập trung 1 việc" để giảm quá tải lựa chọn.

## 5. SMART Goal Setup (`/smart-goal-setup`)

Thành phần chính:
- Stepper 5 bước: Mục tiêu cụ thể (specific), Đo lường tiến bộ (measurable),
  Tính khả thi (achievable), Ý nghĩa mục tiêu (relevant), Mốc thời gian (timeBound).
- Mỗi bước có câu hỏi tiêu đề, ô nhập có placeholder ví dụ, completion hint.
- Panel chất lượng mục tiêu (QualityFeedbackPanel), gợi ý starter theo lĩnh vực,
  bước Review tổng hợp, chọn Archetype.

Nội dung hướng dẫn (theo từng bước, dùng đúng giọng đã có trong code):
- Specific: "Viết kết quả đủ rõ để người khác đọc cũng hiểu bạn muốn đạt gì."
- Measurable: "Chốt một chỉ số, mốc hiện tại và mốc muốn chạm tới."
- Achievable: "Điền giờ mỗi tuần, kỹ năng và nguồn lực bạn thật sự dựa vào được."
- Relevant: "Nêu lý do đủ thật để bạn giữ được cam kết vài tuần tới."
- Time-bound: "Chốt số tuần hoặc ngày đích trước khi sang bước kiểm tra thực tế."
- Trống ý tưởng: "Bí ý? Bấm gợi ý mẫu rồi sửa lại cho giống bạn."

Định dạng hiển thị:
- Progress stepper trên cùng (đang ở bước mấy / còn mấy bước).
- Inline helper text (completion hint) dưới mỗi ô nhập.
- Tooltip ở panel chất lượng: "Điểm chất lượng tăng khi mục tiêu rõ và đo được."
- Empty/redirect guard: nếu chưa có trọng tâm, dẫn về Life Insight trước.

Ghi chú giọng văn:
- Khen tiến bộ nhỏ (mỗi bước hợp lệ), không phạt khi để trống.
- Nhắc nháp tự lưu khi rời giữa chừng (đã có dirty-form guard).

## 6. Feasibility Check (`/feasibility`)

Thành phần chính:
- Hiển thị lại "Mục tiêu của bạn", bộ câu hỏi đo mức sẵn sàng, kết quả readiness,
  phát hiện câu trả lời cũ, nút đi tiếp tới 12-Week Setup.

Nội dung hướng dẫn:
- Tiêu đề: "Đo mức sẵn sàng trước khi dựng kế hoạch."
- Phụ đề: "Để mục tiêu không quá nặng so với lịch sống hiện tại của bạn."
- Sau khi có kết quả tốt: "Bạn đã sẵn sàng. Tạo kế hoạch 12 tuần ngay."
- Kết quả thấp: "Điểm còn thấp ở vài chỗ - chỉnh lại mục tiêu hoặc nguồn lực rồi thử lại."
- Phát hiện câu trả lời cũ: "Tìm thấy câu trả lời cũ. Dùng lại hay bắt đầu mới?"

Định dạng hiển thị:
- Inline helper cho mỗi câu hỏi.
- Banner/inline gợi ý hành động dựa trên điểm bottleneck.
- Empty/redirect guard: thiếu SMART goal -> dẫn về SMART Goal Setup.

Ghi chú giọng văn:
- Điểm thấp = lời khuyên điều chỉnh, không phải "trượt".

## 7. 12-Week Setup (`/12-week-setup`)

Thành phần chính (4 bước, từ constantsLab.ts):
- Đích đến: "Thiết kế Đích đến & Khung mẫu" (week12Outcome).
- Hành động: "Hành động cam kết (Lead Indicators)" - các việc lặp lại hằng tuần.
- Lịch trình: "Thiết lập lịch 7 ngày & Nhịp độ".
- Hoàn tất: "Xác nhận & Kích hoạt", chọn ngày review (mặc định Chủ nhật).
- Có panel đồng hành (SetupCopilotPanel), nút "Dùng tạm" / "Làm lại", xem trước kế hoạch.

Nội dung hướng dẫn (theo bước):
- Đích đến: "Tả kết quả bạn muốn thấy ở tuần 12 - cụ thể và đáng tự hào."
- Hành động: "Chọn 2-3 việc lặp lại mỗi tuần sẽ kéo bạn tới đích."
- Lịch trình: "Xếp các việc đó vào tuần để biết hôm nào làm gì."
- Hoàn tất: "Chọn ngày nhìn lại hằng tuần rồi kích hoạt chu kỳ."
- Nút "Dùng tạm": tooltip "Điền nhanh bản mẫu, bạn chỉnh lại sau cũng được."

Định dạng hiển thị:
- Progress stepper 4 bước.
- Coachmark cho "Lead Indicators": "Đây là việc bạn cam kết làm đều, không phải kết quả."
- Inline helper validate (mục tiêu/đơn vị chỉ số).
- Panel walkthrough nhẹ (SetupCopilotPanel) cho lần đầu.

Ghi chú giọng văn:
- Phân biệt rõ "việc cam kết" (lead) và "kết quả" (lag) bằng ngôn ngữ đời thường.
- Trấn an: mọi thứ sửa lại được sau khi kích hoạt.

## 8. 12-Week System (`/12-week-system`) - Weekly Execution

Thành phần chính (4 tab):
- Hôm nay (today): việc cần làm hôm nay, check-in nhanh.
- Tuần (week): điểm tuần, weekly review, quyết định tải cho tuần sau.
- Tiến độ (progress): biểu đồ xu hướng, tóm tắt chu kỳ.
- Cài đặt (settings): chỉnh chu kỳ, đồng bộ, hành động nhạy cảm.
- Có SyncStatusPill (trạng thái đồng bộ) và banner nhắc review.

Nội dung hướng dẫn:
- Lần đầu mở: "Bắt đầu ở tab Hôm nay - tick việc đầu tiên để tạo nhịp."
- Empty (chưa có việc hôm nay): "Hôm nay chưa có việc nào. Mở tab Tuần để xếp lịch."
- Tab Tuần: "Cuối tuần, dành 5 phút nhìn lại và chọn tải cho tuần sau."
- Banner review tới hạn: "Đến lúc review tuần này. Bấm để bắt đầu nhìn lại."
- SyncStatusPill: tooltip "Đã lưu trên tài khoản của bạn" / "Đang đồng bộ..." /
  "Đang ngoại tuyến - sẽ đồng bộ lại khi có mạng."

Định dạng hiển thị:
- Pop-up walkthrough lần đầu trỏ lần lượt 4 tab (tối đa 4 bước, có Bỏ qua).
- Empty state cho mỗi tab khi chưa có dữ liệu.
- Banner cho review tới hạn và trạng thái offline.
- Tooltip cho SyncStatusPill (ngôn ngữ gắn tài khoản, không dùng từ kỹ thuật).

Ghi chú giọng văn:
- Nhấn "nhịp nhỏ mỗi ngày" hơn là khối lượng lớn.
- Trạng thái offline phải trấn an, không gây lo mất dữ liệu.

## 9. Reflection / Journal (`/journal`)

Thành phần chính:
- Nút thêm nhật ký, ô tìm kiếm, bộ lọc theo loại/tâm trạng (Vui vẻ / Bình thường /
  Suy tư / Chưa chọn), danh sách nhật ký, dialog "Xóa nhật ký này?", nút Hoàn tác.
- Mục weekly-review hiển thị cùng dòng thời gian.

Nội dung hướng dẫn:
- Empty state (chưa có nhật ký): "Chưa có dòng nào. Viết vài câu về hôm nay để bắt đầu."
  + nút "Viết nhật ký".
- Tooltip chọn tâm trạng: "Chọn tâm trạng để nhìn lại xu hướng theo thời gian."
- Trước khi xóa: dialog xác nhận "Xóa nhật ký này?" + trấn an "Có thể Hoàn tác ngay sau đó."

Định dạng hiển thị:
- Empty state khi danh sách rỗng.
- Tooltip cho bộ lọc và chọn tâm trạng.
- AlertDialog cho hành động xóa (không dùng window.confirm).

Ghi chú giọng văn:
- Khuyến khích viết ngắn, không cầu toàn ("vài câu" thay vì "một bài").

## 10. Dashboard / Trang chính (`/`)

Thành phần chính:
- Tổng quan tiến độ, checklist người dùng mới (new-user-guide), lối tắt vào luồng lõi,
  trạng thái chu kỳ 12 tuần hiện tại.

Nội dung hướng dẫn:
- Checklist onboarding đã có sẵn (9 bước): Đánh giá cân bằng -> Chọn trọng tâm ->
  Viết mục tiêu SMART -> Kiểm tra khả thi -> Chốt chu kỳ 12 tuần -> Chạm việc đầu tiên.
- Câu dẫn next step: dùng `nextStep` của checklist để hiện "Việc tiếp theo: ...".
- Sau khi hoàn tất checklist: "Bạn đã sẵn sàng. Giờ chỉ cần giữ nhịp mỗi ngày."

Định dạng hiển thị:
- Checklist onboarding (tái dùng `new-user-guide.ts`) đặt nổi bật cho người dùng mới.
- Cho phép thu gọn / khôi phục checklist (đã có dismiss/restore trong code).
- Empty state khi chưa có chu kỳ nào: 1 nút lớn "Bắt đầu từ đánh giá cân bằng".

Ghi chú giọng văn:
- Luôn chỉ một "việc tiếp theo" rõ ràng để tránh quá tải.
- Checklist là gợi ý, không ép; luôn cho phép ẩn.

## 11. Settings (`/settings`)

Thành phần chính:
- Xuất dữ liệu cục bộ, xuất dữ liệu tài khoản (cloud), xóa dữ liệu trên đám mây,
  xóa tài khoản, quản lý gói, tùy chọn ứng dụng.

Nội dung hướng dẫn:
- Xuất dữ liệu: "Tải bản sao dữ liệu của bạn dưới dạng tệp JSON."
- Xóa cloud / xóa tài khoản: cảnh báo rõ "Hành động này không thể hoàn tác."
- Trấn an export trước khi xóa: "Nên tải bản xuất trước khi xóa để giữ lại dữ liệu."

Định dạng hiển thị:
- Inline helper mô tả từng hành động.
- AlertDialog hai bước cho hành động không thể hoàn tác (xóa cloud, xóa tài khoản).
- Tooltip phân biệt "dữ liệu cục bộ" và "dữ liệu tài khoản".

Ghi chú giọng văn:
- Với hành động phá hủy: rõ ràng về hậu quả, không hù dọa, có lối thoát (Hủy).

## 12. Billing / Paywall (`/billing/plan`, UpgradePaywallDialog)

Thành phần chính:
- Bảng gói, nút nâng cấp Plus, dialog paywall, banner thời hạn (GracePeriodBanner),
  trang xác nhận chuyển khoản, QR VietQR (Casso), liên kết cổng quản lý gói.

Nội dung hướng dẫn:
- CTA nâng cấp: "Mở khoá mẫu nâng cao và phân tích sâu với gói Plus."
- Khi checkout bị khoá (kill-switch): "Thanh toán đang tạm khóa. Liên hệ hỗ trợ để được giúp."
- Sau khi chuyển khoản: "Đã nhận yêu cầu. Quyền lợi mở khoá sau khi xác nhận thanh toán."
- Trial real mode: dùng "trên tài khoản này", KHÔNG dùng "trên trình duyệt này".

Định dạng hiển thị:
- Dialog paywall (UpgradePaywallDialog) gắn ngữ cảnh tính năng đang bị khoá.
- Banner thời hạn / gia hạn (GracePeriodBanner).
- Inline copy hỗ trợ khi paid checkout disabled.

Ghi chú giọng văn:
- Không trình bày mock như thanh toán thật.
- Không hứa mở khoá ngay từ phản hồi checkout; chờ xác nhận webhook/entitlement.

---

## 13. Thứ tự ưu tiên triển khai (Rollout)

P0 - Tác động cao, chi phí thấp:
- Checklist onboarding ở Dashboard (đã có hạ tầng `new-user-guide.ts`).
- Empty states cho Life Balance, Journal, 12-Week System (tab Hôm nay).
- Inline helper text cho SMART Goal và 12-Week Setup (đã có completion hint).

P1 - Định hướng luồng:
- Pop-up walkthrough lần đầu cho Onboarding và 12-Week System (4 tab).
- Tooltip cho SyncStatusPill và panel chất lượng SMART.
- Coachmark "Lead Indicators" ở 12-Week Setup.

P2 - Hoàn thiện:
- Coachmark sau khi mở khoá tính năng Plus.
- Banner ngữ cảnh (review tới hạn, offline, thời hạn gói).

## 14. Checklist QA nội dung (trước khi ship)

- [ ] Mỗi hướng dẫn chỉ nói MỘT hành động kế tiếp.
- [ ] Tooltip <= 12 từ; empty state 1-2 câu; bước walkthrough <= 2 câu.
- [ ] Không có thuật ngữ kỹ thuật trong copy người dùng thấy.
- [ ] Real mode: không còn "dùng thử", "trên trình duyệt này", "không thu tiền thật", "mock", "demo".
- [ ] Walkthrough luôn có nút Bỏ qua; checklist luôn ẩn/khôi phục được.
- [ ] Hành động phá hủy dùng AlertDialog hai bước, nêu rõ "không thể hoàn tác".
- [ ] Trạng thái offline/đồng bộ dùng ngôn ngữ trấn an, gắn tài khoản.
- [ ] Mọi copy hiển thị đúng tiếng Việt có dấu (kiểm tra encoding UTF-8).

## 15. Bản đồ thành phần code để tái dùng

| Loại guidance | File / component trong repo |
|---|---|
| Checklist onboarding | `src/app/utils/new-user-guide.ts` |
| Empty state | `src/app/components/states/EmptyState.tsx`, `src/app/components/empty-states` |
| Trạng thái màn dữ liệu | `src/app/components/states/ScreenStateView.tsx`, `useScreenDataState.ts` |
| Stepper luồng lõi | `CoreFlowProgress` (dùng trong SMART, Feasibility) |
| Stepper SMART (5 bước) | `src/app/pages/SMARTGoalSetup/constants.ts` |
| Stepper 12-Week Setup (4 bước) | `src/features/plan12week/pages/12WeekSetup/constantsLab.ts` |
| Tab Weekly Execution | `.../12WeekSystem/TwelveWeekSystemTabs.tsx` |
| Trạng thái đồng bộ | `SyncStatusPill`, `OfflineBanner` |
| Banner thời hạn gói | `src/app/components/billing/GracePeriodBanner.tsx` |
| Paywall | `UpgradePaywallDialog`, `usePlanEntitlements` |
| Copy người dùng tập trung | `src/app/utils/user-facing-copy.ts` |

> Khuyến nghị: gom toàn bộ chuỗi copy hướng dẫn vào `user-facing-copy.ts` (hoặc
> module copy riêng) để dễ rà soát giọng văn và tránh lọt từ demo vào real mode.
