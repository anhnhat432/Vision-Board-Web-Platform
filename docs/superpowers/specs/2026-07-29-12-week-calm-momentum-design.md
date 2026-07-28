# 12-Week Calm Momentum Design

- Ngày: 2026-07-29
- Trạng thái: Chờ người dùng duyệt bản spec chi tiết
- Phân loại: Mixed
- Routes: `/12-week-setup`, `/12-week-system`

## 1. Bối cảnh và mục tiêu

Hệ thống 12 tuần là lõi của sản phẩm: người dùng biến mục tiêu thành kế hoạch, thực hiện mỗi ngày, nhìn lại mỗi tuần và điều chỉnh trong suốt một chu kỳ. Giao diện hiện có đầy đủ chức năng nhưng còn phân tán về thứ bậc: Setup có rủi ro quá nhiều thông tin cùng lúc; Today, Week, Progress và Settings vẫn có những vùng card/badge dày hơn mức cần thiết cho một công cụ làm việc hằng ngày.

Thiết kế **Calm Momentum** làm mới toàn bộ hành trình theo ba tiêu chí người dùng đã duyệt:

1. **Đẹp:** sáng, có chiều sâu nhưng tiết chế; mỗi vùng có một điểm nhấn rõ thay vì nhiều hiệu ứng cạnh tranh.
2. **Dễ sử dụng:** người dùng luôn biết việc chính tiếp theo, thao tác quan trọng hiện sớm, nội dung nâng cao chỉ mở khi cần.
3. **Có cảm hứng:** mục tiêu 12 tuần và tiến độ chu kỳ tạo cảm giác đang tiến về phía trước, nhưng không biến sản phẩm thành game streak hoặc dashboard số liệu nặng nề.

## 2. Phạm vi

| Bề mặt | Vai trò sau nâng cấp |
| --- | --- |
| `/12-week-setup` | Guided Canvas bốn bước để chuyển SMART Goal thành kế hoạch có thể bắt đầu ngay. |
| `Hôm nay` | Hoàn thành một hành động quan trọng, sau đó check-in trong ngày. |
| `Tuần` | Hiểu tuần hiện tại, điều chỉnh tải và hoàn thành review tuần. |
| `Tiến độ` | Nhìn xu hướng, checkpoint và bước tiếp theo trước khi xem phân tích sâu. |
| `Cài đặt` | Chỉnh chu kỳ, nhắc nhở, sync và dữ liệu trong các nhóm dễ quét. |

## 3. Ngoài phạm vi

- Không đổi route, API, backend model, sync contract hoặc conflict policy.
- Không đổi key/shape localStorage, migration, normalization, goal/plan/week/task/metric id hoặc thứ tự outbox.
- Không đổi auth, billing, entitlement, destructive-action confirmation hoặc app-mode gating.
- Không redesign SMART Goal, Feasibility, dashboard chung, trang public hoặc navigation toàn app.
- Không thêm dependency, font package, chart library, ảnh raster bắt buộc hoặc theme mới.

## 4. Bất biến bắt buộc

1. Local save vẫn thành công khi backend, Firebase hoặc mạng không sẵn sàng.
2. Demo mode không gọi protected sync path; real-mode signed-in user vẫn thấy sync state và lỗi có thể xử lý.
3. Setup local-save trước remote sync; sync failure không được làm mất draft hay tiến độ cục bộ.
4. Hành vi completion task, daily check-in, weekly review, rescue/reentry, export và destructive settings giữ nguyên handler/domain logic hiện có.
5. Mỗi bước Setup có đúng một CTA submit chính. Nút này phải có accessible name thống nhất là `Kích hoạt kế hoạch` tại bước cuối và không bị duplicate ở preview/shell.
6. Dữ liệu, trạng thái, icon và text phải cùng truyền tải ý nghĩa; không dùng màu làm tín hiệu duy nhất.

## 5. Hướng thiết kế chung

### 5.1 Ngôn ngữ thị giác

- Nền: `--app-bg` / `#F2EFE6`; surface trắng và xanh rất nhạt dùng để tạo nhịp nghỉ.
- Ink: `--app-ink`; accent xanh rừng `--app-accent`; lime chỉ tuần hiện tại/tiến độ; vàng chỉ checkpoint hoặc thành quả.
- `Source Serif 4` dùng tiết chế cho đích đến, tiêu đề trọng tâm và số tuần; `Be Vietnam Pro` dùng cho body, input và control.
- Tối đa hai cấp surface cho một vùng. Ưu tiên section, row và divider nhẹ; shadow chỉ cho command bar/sticky region/dialog.
- Signature chung là **Cycle Rail**: đường chạy 12 tuần, có điểm tuần hiện tại, checkpoint và trạng thái đã review. Setup dùng phiên bản bốn chặng mảnh để tạo sự liên tục với execution.
- Motion chỉ xác nhận thay đổi: fade/translate nhẹ 160–220ms khi chuyển step/tab; task completion giữ celebration hiện có. `prefers-reduced-motion` loại chuyển động trang trí.

### 5.2 Quy tắc thông tin

1. Action trước, trạng thái sau.
2. Một viewport có một focal point và một CTA chính.
3. Một thông tin không lặp lại giữa command bar, notice và card đầu tab.
4. Copy ngắn, chủ động, cụ thể về hành động kế tiếp; hướng dẫn xuất hiện ngay tại ngữ cảnh field/decision.
5. Advanced analytics, tuỳ chọn hiếm dùng và roadmap dài dùng progressive disclosure.

## 6. Thiết kế theo hành trình

### 6.1 Setup — Guided Canvas

Giữ bốn bước và toàn bộ draft/validation hiện có:

```text
Đích đến  →  Hành động  →  Nhịp tuần đầu  →  Xem trước & kích hoạt
```

- Header chỉ hiển thị mục tiêu đang lập, tiến độ bốn bước và một mô tả ngắn.
- Bước 1 làm nổi outcome tuần 12 và metric bằng example inline; không nhầm outcome với task hằng ngày.
- Bước 2 đề xuất 2–3 hành động; `Thêm việc của riêng bạn` là secondary action.
- Bước 3 ưu tiên start date, action days và review day; các field tải tuần/W4/W8 nằm trong `Tùy chỉnh thêm`, đóng mặc định nhưng giữ nguyên giá trị draft.
- Bước 4 hiển thị đích đến, hai hành động đầu, nhịp tuần 1 và thông điệp rõ: sau khi kích hoạt người dùng sẽ vào `Hôm nay` để làm việc đầu tiên. Roadmap 12 tuần đầy đủ nằm sau disclosure.
- `SetupStepShellLab` sở hữu duy nhất CTA submit ở cả desktop và mobile; `PlanPreviewStepLab` chỉ hiển thị nội dung preview và không tự tạo thêm submit CTA.

### 6.2 Shell thực thi — Execution Cockpit

- Command bar gọn: tên mục tiêu, `Tuần n/12`, progress, sync state và action theo tab.
- Tab bar Today/Week/Progress/Settings sticky và vừa viewport 360px trở lên, không horizontal body overflow.
- Chỉ một notice chính xuất hiện dưới tab bar theo priority: data safety/sync → review đến hạn → plan thiếu dữ liệu → rescue/reentry → upgrade.
- Nội dung action của tab hiển thị trong viewport đầu tiên nếu không có notice an toàn dữ liệu.

### 6.3 Hôm nay

- Primary task là surface nổi bật duy nhất ở đầu tab.
- Task queue chuyển sang row phẳng, tên dài vẫn wrap được, checkbox/touch target đạt 44px.
- Daily check-in đi ngay sau danh sách tác vụ; sticky check-in action chỉ hiện khi có thay đổi chưa lưu và vùng check-in đã ra ngoài viewport.
- Empty/offline/error state dùng câu hướng dẫn hành động cụ thể, không che local execution.

### 6.4 Tuần

- Cycle Rail dùng trạng thái shape/icon/text để phân biệt completed, current và future.
- Khối tuần hiện tại tập trung focus, milestone, execution score và completion.
- Tactic rows thể hiện target/progress/trễ; recovery guidance nằm cùng weekly status thay vì banner độc lập.
- Review CTA rõ ràng, không bị đẩy xuống dưới nội dung phụ, trên mobile vẫn dễ bấm.

### 6.5 Tiến độ

- Mở đầu bằng narrative hiện tại: giữ nhịp, đang chậm hoặc cần phục hồi; CTA kế tiếp ở cùng vùng này.
- Lớp đầu chỉ có ba metric: tuần hiện tại, commitment rate và review đã chốt.
- Cycle Rail/roadmap là visual anchor; heatmap, weekly trend và tactic breakdown ở vùng mở rộng.

### 6.6 Cài đặt

- Ba nhóm semantic: `Chu kỳ`, `Nhắc nhở & đồng bộ`, `Dữ liệu & thao tác không thể hoàn tác`.
- Settings row cho thao tác thường dùng; mô tả dài thu gọn nhưng status sync/data safety vẫn luôn nhìn thấy khi cần.
- Danger zone có khoảng cách, copy rõ hậu quả và giữ `AlertDialog`/xác nhận hai bước hiện có.

## 7. Component và data-flow strategy

Không tạo data flow mới:

```text
Existing storage, sync, auth, billing and domain hooks
                    ↓
Route orchestration (`TwelveWeekSetupLab` / `TwelveWeekSystem`)
                    ↓
Presentation components and existing action handlers
```

- `TwelveWeekSetupLab` tiếp tục sở hữu draft, validation, local save, sync và navigation.
- `SetupStepShellLab` sở hữu navigation giữa bước và CTA cuối; step components chỉ render/edit dữ liệu qua props hiện có.
- `TwelveWeekSystem` tiếp tục orchestration; command bar, notice slot và tab components chỉ nhận derived state/handler hiện có.
- Không duplicate calculation, cache hoặc state sync trong component trình bày.

## 8. Functional requirements (EARS)

1. **WHEN** người dùng mở Setup, **THE system SHALL** hiển thị một vùng thao tác chính, một CTA chính và hướng dẫn inline phù hợp với bước hiện tại.
2. **WHEN** người dùng mở `Tùy chỉnh thêm`, **THE system SHALL** hiển thị các field nâng cao mà không đổi hoặc xoá dữ liệu draft.
3. **WHEN** người dùng bấm `Kích hoạt kế hoạch` với draft hợp lệ, **THE system SHALL** local-save trước, sync best-effort sau và điều hướng tới `/12-week-system` như hiện có.
4. **WHEN** người dùng mở `/12-week-system` với plan active và không có data-safety notice, **THE system SHALL** cho thấy command bar, tab navigation và phần đầu action chính trong viewport đầu tiên ở desktop 1440x900 và mobile 390x844.
5. **WHEN** nhiều notice cùng active, **THE system SHALL** chỉ hiển thị notice cần hành động có priority cao nhất trước nội dung tab.
6. **WHILE** offline, **THE system SHALL** cho phép task completion và daily/weekly local actions, đồng thời hiển thị trạng thái local/sync phù hợp.
7. **WHERE** viewport từ 360px đến 767px, **THE system SHALL** không tạo horizontal body overflow; control chính có touch target tối thiểu 44px.
8. **WHERE** `prefers-reduced-motion: reduce`, **THE system SHALL** giữ hierarchy và feedback nhưng tắt motion không thiết yếu.
9. **WHEN** dùng keyboard, **THE system SHALL** giữ tab navigation, thao tác chính và focus indicator rõ ràng.

## 9. Kiểm thử và xác minh

### Regression tests

- Setup: một CTA activation cuối, disclosure `Tùy chỉnh thêm`, copy destination `Hôm nay`, validation/back navigation và local-first submit behavior.
- System shell: notice priority, sync state, tab accessibility, mobile no-overflow và first-viewport hierarchy.
- Today/Week/Progress/Settings: primary action order, semantic headings, status copy, existing handler callbacks và destructive-action contracts.
- Accessibility: role/name của CTA, keyboard navigation, focus, one `h1`, reduced motion.

### Lệnh xác minh

```bash
npm run typecheck
npm run lint
npm run test:ui -- src/features/plan12week/pages/12WeekSetup src/features/plan12week/pages/12WeekSystem src/app/components/twelve-week src/app/pages/core-funnel-a11y.test.tsx
npm run build
```

Trước khi bàn giao, chạy thêm `npm run check` nếu shared UI/route thay đổi rộng, rồi QA trực quan từng tab ở 1440x900 và 390x844. Nếu môi trường cho phép, chạy smoke core flow để kiểm tra Setup → Hôm nay với local-first behavior.

## 10. Rollout, rollback và rủi ro

- Triển khai theo vertical slice: Setup CTA/preview → execution shell/notices → Today → Week → Progress → Settings → responsive/a11y QA.
- Mỗi slice chỉ đổi presentation/wiring cục bộ, giữ test coverage của behavior hiện hữu.
- Không có migration hoặc rollout dữ liệu. Rollback là revert commit presentation tương ứng; local plan data và backend payload không thay đổi.
- Rủi ro chính là selector/CTA bị trùng, sticky chrome chiếm quá nhiều chiều cao mobile và notice che action. Mỗi rủi ro có focused test và visual QA riêng.

## 11. Tiêu chí hoàn thành

- Người dùng có thể hoàn thành Setup và đến `Hôm nay` mà không bị mơ hồ về bước tiếp theo.
- Mỗi tab execution cho thấy một focal action trước các thông tin phụ.
- Toàn hệ thống nhất quán về spacing, type, colour semantics và Cycle Rail.
- Không regress storage, sync, auth, billing, route, a11y hoặc responsive contracts nêu trên.
