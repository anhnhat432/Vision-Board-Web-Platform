# 12-Week Setup Guided Canvas

- Ngày: 2026-07-20
- Trạng thái: Draft — chờ người dùng duyệt spec
- Phân loại: Mixed
- Route: `/12-week-setup`
- Nguồn insight: `KHẢO SÁT FEEDBACK KHÁCH HÀNG DÙNG THỬ TRANG WEB (Responses) - Form responses 1.csv`

## 1. Bối cảnh và mục tiêu

Khảo sát 21 phản hồi cho thấy người dùng đánh giá cao ý tưởng lập kế hoạch nhưng gặp ma sát khi thao tác: nội dung dài, không biết bắt đầu ở đâu, hướng dẫn chưa đủ cụ thể, nhiều card có cùng độ ưu tiên, thiếu ví dụ trực quan và chưa hiểu bước tiếp theo sau khi tạo kế hoạch.

Trang `/12-week-setup` hiện đã có đủ bốn chặng nghiệp vụ nhưng đang trình bày quá nhiều thông tin đồng thời. Thiết kế mới giữ nguyên luồng bốn bước và làm lại thứ bậc nội dung theo hướng **Guided Canvas**: sáng, dịu, có hướng dẫn ngay tại field và chỉ hiển thị các quyết định quan trọng trước.

Mục tiêu:

- Người dùng mới hiểu mình đang làm gì ở từng bước mà không cần đọc một hướng dẫn dài.
- Giảm cảm giác quá tải bằng progressive disclosure, không cắt bỏ khả năng tùy chỉnh.
- Làm rõ kế hoạch 12 tuần sẽ dẫn tới màn `Hôm nay` sau khi kích hoạt.
- Giữ nguyên dữ liệu, local-first save, validation, sync và route behavior hiện có.

## 2. Phân loại và bất biến

- **Type:** Mixed — giao diện thay đổi trực tiếp cách người dùng nhập dữ liệu kế hoạch.
- **Core invariants:** không đổi route, localStorage key/shape, migration, normalization, domain calculations, auth gate, billing/entitlement, outbox ordering hoặc sync authority.
- **Scope:** chỉ `/12-week-setup` và các component trực tiếp render bốn bước/preview của route này. Không redesign `/smart-goal-setup`.
- **SMART Goal relationship:** SMART Goal chỉ là dữ liệu đầu vào đã có để prefill và đề xuất; không thay đổi flow hoặc giao diện SMART Goal setup.

## 3. Actors và entry points

- **Primary actor:** người dùng mới đang tạo chu kỳ 12 tuần từ một SMART Goal đã hoàn tất.
- **Secondary actors:** người dùng quay lại để sửa draft; người dùng real-mode đã đăng nhập; người dùng demo-mode không có backend.
- **Route:** `/12-week-setup`.
- **Touchpoints:** `TwelveWeekSetupLab`, `SetupStepShellLab`, `OutcomeStepLab`, `LeadIndicatorsStepLab`, `ScheduleStepLab`, `PlanPreviewLab` và các helper/props hiện có.

## 4. Hướng thiết kế đã duyệt

### 4.1 Flow và hierarchy

```text
Mục tiêu 12 tuần hiện tại
        ↓
01  Đích đến        → 02  Hành động        → 03  Lịch tuần        → 04  Kích hoạt
        ↓                   ↓                    ↓                    ↓
Outcome + metric     2–3 actions         Start + review       Week 1 preview
```

- Đầu trang chỉ giữ thẻ tóm tắt mục tiêu 12 tuần, tiến độ `Bước 1/4` và câu giải thích ngắn.
- Mỗi bước có một vùng thao tác chính; nội dung hỗ trợ nằm sau field hoặc trong vùng thu gọn.
- Desktop có vùng preview tuần 1 ở cạnh phải khi đủ rộng; mobile ưu tiên form và cho preview thu gọn.
- CTA chính chỉ có một hành động rõ ràng trong mỗi bước.

### 4.2 Nội dung từng bước

#### Bước 1 — Chốt đích đến 12 tuần

- Heading: `Bạn muốn thấy điều gì sau 12 tuần?`
- Helper: `Mô tả trạng thái cuối chu kỳ, không phải danh sách việc cần làm mỗi ngày.`
- Hiển thị ô outcome lớn có ví dụ theo focus area.
- Hiển thị metric name, target và unit thành một hàng gọn, giữ nguyên các field dữ liệu hiện có.
- Loại mục tiêu được tự đề xuất từ dữ liệu đầu vào; nút đổi loại mục tiêu là lựa chọn phụ.

#### Bước 2 — Chọn 2–3 việc sẽ kéo bạn tới đó

- Hiển thị trước 2–3 action đề xuất, mỗi action là một card có tên, tần suất, đơn vị và trạng thái chọn.
- Giải thích ngắn sự khác nhau giữa việc chủ động làm đều và kết quả được xem lại.
- Nút `Thêm việc của riêng bạn` là secondary action, không cạnh tranh với CTA tiếp tục.
- Không đổi giới hạn, target validation hoặc commitment shape.

#### Bước 3 — Đặt nhịp cho tuần đầu

- Nội dung chính: ngày bắt đầu, các ngày hành động và ngày review.
- Ngày tháng hiển thị thống nhất theo `dd/mm/yyyy`.
- `Thời lượng mỗi ngày`, `mức tải tuần đầu`, W4/W8 và các tinh chỉnh khác nằm trong `Tùy chỉnh thêm`, đóng mặc định.
- Các control chọn ngày có touch target tối thiểu 44px.

#### Bước 4 — Xem trước và kích hoạt

- Preview theo thứ tự: đích đến → action đã chọn → lịch tuần đầu.
- Block nổi bật: `Sau khi kích hoạt, bạn sẽ vào màn Hôm nay để bắt đầu việc đầu tiên.`
- CTA: `Kích hoạt kế hoạch`.
- Giữ nguyên hành vi local save trước, sync best-effort sau và navigate tới `/12-week-system`.

### 4.3 Hướng dẫn và validation

- Hướng dẫn hiển thị inline dưới field, gồm một câu giải thích và một ví dụ ngắn; không dùng popup che form.
- Validation vẫn chỉ xuất hiện sau khi người dùng bấm `Tiếp tục` hoặc `Kích hoạt`.
- Khi sửa đúng, lỗi biến mất; không tạo thêm validation state hoặc lưu trữ mới.
- Người dùng có thể quay lại bước trước mà không mất draft.

## 5. Visual direction

- **Palette:** nền sáng dịu `#F6F4EE`, surface trắng `#FFFFFF`, ink xanh than `#22312C`, accent xanh lá `#087A55`, highlight vàng `#F2C14E`, vùng gợi ý xanh trời nhạt `#D9EEF0`.
- **Typography:** giữ `Source Serif 4` cho tiêu đề display và `Be Vietnam Pro` cho body/control; không thêm dependency font.
- **Signature:** thẻ mục tiêu 12 tuần ở đầu flow và đường nối mảnh qua bốn chặng; không phải redesign SMART Goal setup.
- **Illustration:** dùng icon/shape hiện có hoặc CSS/inline SVG đơn giản theo ngữ cảnh; không thêm ảnh raster bắt buộc.
- **Surfaces:** tối đa hai cấp surface trong một vùng; giảm card lồng nhau, border và shadow không mang thông tin.
- **Motion:** fade/slide nhẹ khi đổi bước; phản hồi chọn card 150–200ms; tắt chuyển động trang trí khi `prefers-reduced-motion: reduce`.

## 6. Responsive và accessibility

- Mobile 360–767px không có horizontal body overflow.
- CTA đáy mobile có vùng bấm tối thiểu 44px và không che field cuối cùng.
- Input/textarea/select dùng cỡ chữ tối thiểu 16px trên mobile.
- Focus ring rõ, không bị clip bởi container overflow.
- Icon-only control có accessible name; trạng thái không chỉ dựa vào màu.
- Heading order tuần tự; route chỉ có một `h1`.
- Long outcome/action dùng `min-w-0`, `break-words` và line wrapping có chủ đích.

## 7. Functional requirements (EARS)

1. **WHEN** người dùng mở `/12-week-setup`, **THE system SHALL** giữ nguyên dữ liệu SMART Goal đã có và hiển thị nó như context/pre-filled input trong setup, không điều hướng sang route chỉnh SMART Goal.
2. **WHEN** người dùng ở một bước, **THE system SHALL** hiển thị một vùng thao tác chính, một CTA chính và hướng dẫn inline liên quan đến field đang hiển thị.
3. **WHEN** người dùng chưa mở `Tùy chỉnh thêm`, **THE system SHALL** giữ các trường nâng cao trong trạng thái thu gọn nhưng không xóa hoặc thay đổi giá trị đã lưu.
4. **WHEN** người dùng chọn action được đề xuất, **THE system SHALL** cập nhật draft bằng handler và shape hiện có.
5. **WHEN** người dùng bấm `Tiếp tục` với dữ liệu thiếu, **THE system SHALL** hiển thị validation tại ngữ cảnh field và giữ nguyên bước hiện tại.
6. **WHEN** người dùng bấm `Kích hoạt kế hoạch` với draft hợp lệ, **THE system SHALL** local-save trước, sau đó tiếp tục sync best-effort và điều hướng tới `/12-week-system` như behavior hiện tại.
7. **WHILE** backend/Firebase không sẵn sàng, **THE system SHALL** không làm hỏng luồng local-first của setup.
8. **WHERE** viewport nhỏ hơn 768px, **THE system SHALL** giữ CTA chính và các control chọn ngày dễ chạm, không tạo overflow ngang.
9. **WHERE** `prefers-reduced-motion: reduce`, **THE system SHALL** tắt chuyển động không thiết yếu nhưng giữ nguyên trạng thái và thứ bậc thông tin.

## 8. Data, storage và sync constraints

- Không đổi `APP_STORAGE_KEYS.pending12WeekSetupDraft` hoặc các key liên quan.
- Không đổi `TwelveWeekSetupDraft`, `LeadIndicatorCommitment`, plan snapshot, lead metric mutation hoặc payload sync.
- Không thêm migration/normalization vì thiết kế chỉ thay đổi presentation và interaction wiring hiện có.
- Local save phải xảy ra trước remote sync; sync failure không được xóa draft hoặc làm mất tiến độ.
- Demo mode không gọi protected backend sync paths.

## 9. Out of scope

- Redesign `/smart-goal-setup`, `/feasibility`, `/12-week-system` hoặc homepage.
- Thay đổi cách tính SMART quality, feasibility score, milestone, weekly plan hoặc execution score.
- Đổi route, API contract, auth, billing, entitlement, backend model hoặc sync conflict policy.
- Thêm video onboarding, raster illustration pack, chart library hoặc dependency mới.
- Cắt bỏ các trường nâng cao; chúng chỉ được progressive disclosure.

## 10. Acceptance criteria

- [ ] Người dùng mới đọc được mình cần làm gì trong từng bước mà không mở popup hướng dẫn.
- [ ] Bước 1 làm rõ đích đến tuần 12 và không khiến outcome bị hiểu là task hằng ngày.
- [ ] Bước 2 đề xuất action từ dữ liệu đầu vào và cho phép sửa/thêm action.
- [ ] Bước 3 làm nổi bật start/review/action days; advanced options đóng mặc định.
- [ ] Bước 4 nói rõ sau khi kích hoạt sẽ vào `Hôm nay` và hiển thị preview tuần 1.
- [ ] Draft, validation, back/jump navigation, local save và sync behavior hiện tại không regress.
- [ ] Desktop và mobile không có overflow; touch target chính đạt tối thiểu 44px.
- [ ] Real-mode copy không thêm phrasing demo-only; demo mode vẫn hoạt động không cần backend.
- [ ] Reduced motion và keyboard focus vẫn được giữ.

## 11. Verification plan

Focused first:

```bash
npm run typecheck
npm run lint
npm run test:run -- src/features/plan12week/pages/12WeekSetup src/test/ux-ui-upgrade/core-flow-content-order.test.tsx src/test/ux-ui-upgrade/core-flow-a11y-keyboard.test.tsx
npm run build
```

Then broaden if shared components moved:

```bash
npm run check
npm run smoke:core-quality
```

Visual QA:

- `/12-week-setup` at 1440x900 and 390x844.
- Bước 1 → Bước 4 với seeded valid data.
- Missing-field validation timing.
- Open/close `Tùy chỉnh thêm`.
- Save → `/12-week-system`.
- Keyboard focus and reduced motion.

## 12. Risks and mitigations

- **Risk:** progressive disclosure hides a field users rely on. **Mitigation:** keep all current fields reachable, add a visible `Tùy chỉnh thêm` label and preserve draft values.
- **Risk:** visual simplification breaks selectors/tests tied to nested cards. **Mitigation:** preserve semantic labels and existing data attributes where available; update only layout-specific assertions.
- **Risk:** compact preview still becomes too tall on mobile. **Mitigation:** show week 1 summary first and make extended roadmap collapsible.
- **Risk:** auto-suggested goal type feels wrong. **Mitigation:** show the suggestion as editable, never as an irreversible choice.

## 13. Decision record

- Chọn `Guided Canvas` thay cho Visual Story hoặc Focused Form.
- Giữ bốn bước nghiệp vụ hiện tại.
- Dùng progressive disclosure cho advanced options.
- Dùng inline helper thay cho ScreenGuide overlay trong vùng setup.
- Visual direction là sáng, dịu, có minh họa nhỏ; không biến setup thành một màn vision board trang trí.
- SMART Goal setup nằm ngoài phạm vi; chỉ dùng dữ liệu đã có để prefill.
