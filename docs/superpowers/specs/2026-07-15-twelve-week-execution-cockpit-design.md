# Thiết kế Execution Cockpit cho hệ thống 12 tuần

- Ngày: 2026-07-15
- Trạng thái: Chờ duyệt spec bằng văn bản
- Phân loại: Shell
- Route: `/12-week-system`

## 1. Bối cảnh

Giao diện hệ thống 12 tuần hiện có đầy đủ chức năng nhưng thứ bậc thị giác chưa phục vụ tốt nhịp thực thi hằng ngày. Trước khi người dùng nhìn thấy công việc chính, màn hình lần lượt hiển thị app header, tiến độ core flow, nút hướng dẫn, hero chu kỳ, cảnh báo, tab và các status chip. Trên mobile, người dùng phải cuộn qua gần hai viewport mới tới nội dung cần thao tác.

Các tab cũng dùng nhiều card lồng nhau, badge, border, gradient và chữ phụ nhỏ. Điều này làm Today, Week và Progress có cảm giác như nhiều dashboard ghép lại thay vì một cockpit thống nhất.

Thiết kế này tái cấu trúc toàn bộ shell của `/12-week-system` theo hướng `Execution cockpit`: nội dung cần làm xuất hiện sớm, trạng thái quan trọng được gom lại và mỗi tab có một nhiệm vụ rõ ràng.

## 2. Mục tiêu

- Đưa hành động chính của tab hiện tại vào viewport đầu tiên trên desktop và mobile.
- Giảm số tầng chrome trước nội dung chính.
- Tạo thứ bậc nhất quán giữa Today, Week, Progress và Settings.
- Giữ bản sắc Dear Our Future bằng palette xanh rừng, nền kem và typography hiện có.
- Giữ nguyên toàn bộ contract dữ liệu, local-first, auth, billing, sync và hành vi hoàn thành task/review.
- Cải thiện khả năng đọc, keyboard navigation, touch target và reduced motion.

## 3. Ngoài phạm vi

- Không đổi route hoặc tên tab.
- Không đổi localStorage key, schema, migration hoặc normalization.
- Không đổi cách tính tuần, tiến độ, điểm review, rescue trigger hoặc entitlement.
- Không đổi API, outbox, conflict handling hoặc sync authority.
- Không thêm dependency, chart library hoặc icon library.
- Không thiết kế lại app header, billing, goals, setup hay các trang public ngoài điều kiện ẩn public footer trên workspace 12 tuần.

## 4. Invariant phải giữ nguyên

- Local save vẫn thành công khi backend hoặc Firebase không sẵn sàng.
- Demo mode không gọi protected sync path.
- Real-mode signed-in users vẫn nhìn thấy sync state và lỗi sync có hướng xử lý.
- Entitlement không được mở khóa từ checkout-session response.
- Task completion, daily check-in, weekly review, reentry và rescue giữ nguyên handler hiện tại.
- Destructive settings tiếp tục dùng `AlertDialog` và xác nhận hai bước khi cần.
- Tab state và URL behavior hiện tại không bị thay đổi ngoài presentation.

## 5. Hướng thiết kế

### 5.1 Nguyên tắc

1. Action trước, trạng thái sau.
2. Một màn hình chỉ có một focal point.
3. Supporting chrome phải yên hơn nội dung đang làm.
4. Một thông tin chỉ xuất hiện một lần trong cùng viewport.
5. Dùng row và section trước khi tạo thêm card.
6. Lime chỉ biểu thị tiến độ hoặc trạng thái hiện tại.

### 5.2 Điểm nhận diện

`Cycle rail` là dấu hiệu thị giác xuyên suốt hệ thống. Nó hiển thị 12 tuần theo một đường chạy gọn, phân biệt tuần đã review, tuần hiện tại và checkpoint. Today chỉ hiển thị bản rút gọn; Week và Progress dùng phiên bản đầy đủ hơn.

## 6. Khung Execution Cockpit

### 6.1 Desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ Goal title       Week 8/12 · 67%       Sync       Main CTA  │
├──────────────────────────────────────────────────────────────┤
│ Today          Week          Progress          Settings      │
├──────────────────────────────────────────────────────────────┤
│ Optional actionable notice                                  │
├──────────────────────────────────────────────────────────────┤
│ Active tab content                                          │
└──────────────────────────────────────────────────────────────┘
```

- Workspace có `max-width` khoảng `1180px` và lưới 12 cột.
- Command bar thay thế hero xanh lớn và phần lớn status chip hiện tại.
- Command bar gồm goal title, tuần hiện tại, cycle progress, sync state và một CTA theo tab.
- Tab bar nằm ngay dưới command bar và sticky khi cuộn.
- Chỉ một notice có mức ưu tiên cao nhất được hiển thị dưới tab bar.
- Nội dung tab bắt đầu ngay sau notice; không có spacer hoặc decoration không mang thông tin.

### 6.2 Mobile

- Command bar chuyển thành một khối ngắn gồm goal title, `Week n/12`, progress và sync.
- Secondary action được chuyển vào menu gọn; CTA chính vẫn hiển thị trực tiếp.
- Bốn tab chia đều chiều rộng ở viewport 390px và sticky dưới app header.
- Ở trạng thái active plan thông thường, tab bar và phần đầu của hành động chính phải nhìn thấy trong viewport đầu tiên 390x844. Nếu có data-safety notice mức cao nhất, notice CTA được phép thay vị trí hành động chính trong viewport đầu tiên.
- Không dùng horizontal scroll cho tab ở 360px trở lên.
- Không hiển thị full `CoreFlowProgress`; hành động Thoát và thông tin hành trình nằm trong command bar/menu.

### 6.3 Footer và hướng dẫn

- Public footer không render trên `/12-week-system` vì đây là task workspace, không phải public content page.
- Các route legal và support vẫn tồn tại. Nếu account menu hoặc Settings hiện chưa có đường dẫn legal gọn, implementation SHALL bổ sung các link này trước khi ẩn footer trên workspace.
- `ScreenGuide` chuyển thành icon action trong command bar, không tạo một hàng riêng.

## 7. Quy tắc notice

`TwelveWeekSystemNotices` tiếp tục quyết định trạng thái nhưng presentation phải ưu tiên theo thứ tự:

1. Sync hoặc data safety error cần hành động.
2. Weekly review đến hạn.
3. Plan structure thiếu dữ liệu.
4. Reentry/rescue trigger.
5. Upgrade suggestion.

Tại một thời điểm chỉ hiển thị một notice chính. Các notice còn lại được gom vào một khu vực mở rộng hoặc xuất hiện đúng ngữ cảnh trong tab liên quan.

Notice dùng một hàng ngắn trên desktop và một khối tối đa hai đoạn ngắn trên mobile. CTA phải cụ thể, ví dụ `Thử đồng bộ lại`, `Mở review tuần`, `Bổ sung kế hoạch`.

## 8. Thiết kế từng tab

### 8.1 Today

Mục tiêu của tab: giúp người dùng hoàn thành một việc quan trọng và chốt check-in trong ngày.

Desktop:

- Lưới `7/5`.
- Cột trái: primary task, task queue và overdue recovery theo ngữ cảnh.
- Cột phải: daily check-in; có thể sticky trong giới hạn tab panel.
- Status row gọn gồm số việc hoàn thành, việc trễ và review state.
- Primary task là card nổi bật duy nhất.
- Task queue dùng row phẳng, không lồng nhiều card.

Mobile:

1. Primary task hoặc next action.
2. Task queue.
3. Daily check-in.
4. Rescue/reentry suggestion nếu có.

Sticky check-in CTA chỉ xuất hiện khi có thay đổi chưa lưu và check-in card không còn trong viewport.

### 8.2 Week

Mục tiêu của tab: hiểu tuần hiện tại, điều chỉnh tải và hoàn tất weekly review.

- Cycle rail nằm đầu tab, có thể cuộn ngang trên mobile nhưng không làm tràn body.
- Khối tuần hiện tại gồm focus, milestone, execution score và completion.
- Tactics hiển thị dạng row với tên, loại, target, progress và trạng thái trễ.
- Recovery guidance gắn vào weekly status thay vì banner độc lập.
- Khi review đến hạn, CTA review nằm ở cuối khối tuần và vẫn dễ thấy trên mobile.
- Completed, current và future week dùng shape/icon/text ngoài màu sắc để phân biệt.

### 8.3 Progress

Mục tiêu của tab: cho người dùng biết xu hướng và bước tiếp theo, không chỉ trình bày số liệu.

- Mở đầu bằng narrative state: `đang giữ nhịp`, `đang chậm` hoặc `cần phục hồi`.
- CTA tiếp theo nằm cùng narrative, không đặt trong một card con hẹp.
- Chỉ ba metric chính hiển thị ở lớp đầu: tuần hiện tại, commitment rate và review đã chốt.
- Cycle rail/roadmap là visual anchor trung tâm.
- Scoreboard, milestone và advanced analytics nằm dưới theo progressive disclosure.
- Heatmap, weekly trend và tactic breakdown có thể thu gọn.
- Loại bỏ grid bốn card giống nhau, PaperPin, WashiTape và glow không mang thông tin.

### 8.4 Settings

Mục tiêu của tab: chỉnh chu kỳ và bảo vệ dữ liệu mà không tạo cảm giác một trang dashboard khác.

Ba nhóm chính:

1. Chu kỳ: tên mục tiêu, review day, reminder và cycle controls.
2. Nhắc nhở & đồng bộ: notification, cloud sync, manual sync và trạng thái kết nối.
3. Dữ liệu & nguy hiểm: export, clear local signals, reset cycle và delete operations.

Thiết lập thường dùng hiển thị dạng settings row. Copy giải thích dài được thu gọn. Danger zone có khoảng cách và màu cảnh báo riêng nhưng không dùng màu đỏ cho toàn bộ section.

## 9. Hệ thống thị giác

### 9.1 Typography

- `Bricolage Grotesque`: goal title, tab title, week number và key metric.
- `Be Vietnam Pro`: body, control, label và helper copy.
- Body mobile tối thiểu 15px; input/textarea/select tối thiểu 16px.
- Utility label tối thiểu 11px trên desktop và 12px trên mobile.
- Không dùng nhiều dòng uppercase; uppercase chỉ dành cho eyebrow ngắn.
- Số liệu bật tabular figures.
- Chỉ một `h1` là goal title; nội dung tab bắt đầu từ `h2`.

### 9.2 Color

- Background: `--app-bg` (`#f2efe6`).
- Surface: `--app-surface`.
- Primary ink: `--app-ink`.
- Primary accent: `--app-accent` (`#0c5e3a`).
- Current/progress highlight: `--app-highlight` (`#c6f24e`).
- Warning color chỉ dùng cho trạng thái cần xử lý.
- Không tạo token màu mới nếu token hiện tại có thể diễn đạt đúng semantic.

### 9.3 Surface và spacing

- Tối đa hai cấp surface trong một vùng nội dung.
- Main panel dùng radius 18px; control/row dùng 10-12px.
- Shadow chỉ dùng cho command bar, sticky tab và overlay/dialog.
- Row thông thường phân tách bằng spacing hoặc một divider nhẹ, không dùng border quanh từng item.
- Desktop section gap khoảng 24px; mobile section gap 16-18px.

## 10. Motion

- Tab transition: opacity + translateY 4px trong 160-220ms.
- Task completion: check/fill transition ngắn; giữ haptic, sound và celebration behavior hiện tại.
- Cycle progress chỉ animate khi lần đầu xuất hiện hoặc khi value thay đổi.
- Không animate width/height/top/left cho decoration.
- `prefers-reduced-motion` tắt dịch chuyển và pulse không thiết yếu.
- Không dùng nhiều stagger animation trong execution workspace.

## 11. Accessibility và responsive

- Touch target tối thiểu 44x44px trên mobile.
- Focus ring rõ và không bị clip bởi overflow container.
- Tab sử dụng semantic Radix Tabs hiện có và giữ keyboard navigation.
- Icon-only control có accessible name.
- Status dùng text/icon/shape, không chỉ dùng màu.
- Async save/sync feedback dùng `role="status"` hoặc live region phù hợp.
- Heading order tuần tự; không dùng thêm `h1` trong tab.
- Long goal/task names dùng `min-w-0`, `break-words` và line clamp có chủ đích.
- Không có horizontal body overflow tại 360-767px.
- Dark mode sử dụng token hiện tại và giữ cùng thứ bậc, không thêm một visual direction khác.

## 12. Component strategy

Ưu tiên refactor tại chỗ, không tạo một design system mới.

- `12WeekSystem.tsx`: giữ orchestration và handler; thay composition của shell.
- `TwelveWeekDashboardHeader`: chuyển thành compact command bar hoặc đổi tên thành `TwelveWeekCommandBar` nếu việc đổi tên giúp trách nhiệm rõ hơn.
- `TwelveWeekSystemTabs`: giữ tab orchestration; chuyển tab bar thành sticky cockpit navigation.
- `TwelveWeekSystemNotices`: thêm priority presentation, không đổi trigger semantics.
- `TwelveWeekTodayTab`: sắp xếp lại hierarchy và grid; giữ handler.
- `TwelveWeekWeekTab`: giữ domain logic, làm phẳng layout và cycle rail.
- `TwelveWeekProgressTab`: tách top narrative, three-metric summary và progressive analytics.
- `TwelveWeekSettingsTab`: nhóm lại settings row và danger zone.
- `RootLayout`/footer condition: không render public footer trên execution workspace.

Chỉ extract component mới khi nó có trách nhiệm rõ, ví dụ command bar, status row hoặc notice slot. Không tạo wrapper chỉ để chuyển className.

## 13. Data flow và state

Không có data flow mới.

```text
Existing TwelveWeekSystem state/hooks
        ↓
12WeekSystem.tsx orchestration
        ↓
Command bar + prioritized notice + active tab
        ↓
Existing action handlers and persistence/sync services
```

Layout không được duplicate state, cache score hoặc tính lại domain values trong component trình bày. Các derived values hiện có tiếp tục được truyền xuống bằng props.

## 14. Empty, loading và error states

- Không có active goal: giữ hướng dẫn tạo/mở mục tiêu nhưng dùng cockpit-compatible empty state.
- Plan không có task/metric: hiển thị một next action cụ thể trong Today/Week.
- Tab lazy loading: skeleton theo đúng shape command bar/tab content, tránh spinner giữa trang.
- Tab error boundary: giữ nguyên, nhưng fallback có CTA retry và quay về Today.
- Sync error: không che nội dung local; hiển thị data-safety notice và retry.
- Offline: giữ local-first copy và không vô hiệu hóa task completion/check-in.

## 15. Acceptance criteria

- WHEN người dùng mở `/12-week-system` với active plan và không có data-safety notice trên desktop 1440x900, THE system SHALL hiển thị command bar, tab bar và phần đầu của active tab trong viewport đầu tiên.
- WHEN người dùng mở route với active plan và không có data-safety notice trên mobile 390x844, THE system SHALL hiển thị tab bar và phần đầu của primary action trong viewport đầu tiên.
- WHEN data-safety notice đang active, THE system SHALL ưu tiên notice CTA trong viewport đầu tiên và vẫn giữ tab bar nhìn thấy được.
- WHEN nhiều notice cùng active, THE system SHALL hiển thị notice cần hành động có priority cao nhất và không xếp nhiều banner trước nội dung.
- WHEN người dùng chuyển tab, THE system SHALL giữ nguyên state, handler và URL behavior hiện tại.
- WHILE app offline, THE system SHALL cho phép thao tác local-first và hiển thị trạng thái dữ liệu phù hợp.
- WHILE real-mode user đã đăng nhập, THE system SHALL giữ sync state nhìn thấy được trong command bar hoặc notice.
- WHERE viewport từ 360px đến 767px, THE system SHALL không tạo horizontal body overflow.
- WHERE `prefers-reduced-motion: reduce`, THE system SHALL loại bỏ motion trang trí và dịch chuyển không thiết yếu.
- WHEN dùng keyboard, THE system SHALL cho phép chuyển tab, kích hoạt task/check-in và nhìn thấy focus indicator.
- WHEN tab Progress render trên mobile, THE system SHALL dùng một cột và không để CTA/card bị cắt hoặc tạo khoảng trống bất thường.

## 16. Verification plan

### Focused tests

- Cập nhật test của `TwelveWeekDashboardHeader`/command bar.
- Cập nhật tab navigation tests.
- Giữ và cập nhật Today, Week, Progress, Settings tests theo hierarchy mới.
- Thêm test notice priority nếu logic presentation được gom lại.
- Thêm test không có `h1` thứ hai trong active tab.
- Thêm responsive contract cho command bar/tab visibility tại 390x844.

### Commands

```bash
npm run typecheck
npm run lint
npm run test:ui
npm run build
```

Sau khi implementation ổn định:

```bash
npm run screenshots:after -- --screen 12-week-system
```

Nếu script không nhận passthrough `--screen`, dùng trực tiếp:

```bash
node scripts/capture-baseline-screenshots.mjs \
  --screen 12-week-system \
  --output docs/specs/core-flow-ui-upgrade/screenshots/after
```

Visual QA bắt buộc ở 1440x900 và 390x844 cho cả bốn tab. Script baseline có thể chụp default tab; các tab còn lại được chụp bằng visual QA harness hoặc điều khiển trình duyệt sau khi chọn tab tương ứng.

## 17. Rủi ro và giảm thiểu

- Rủi ro: thay shell làm test selector cũ hỏng. Giảm thiểu: giữ `data-testid` có ý nghĩa và chỉ đổi selector gắn chặt vào layout cũ.
- Rủi ro: sticky command/tab chiếm quá nhiều chiều cao mobile. Giảm thiểu: chỉ tab bar sticky; command bar cuộn khỏi viewport sau phần đầu.
- Rủi ro: ẩn footer làm mất đường tới legal. Giảm thiểu: giữ legal trong app navigation/Settings và các route public.
- Rủi ro: notice priority vô tình che sync error. Giảm thiểu: data safety luôn có priority cao nhất và có test riêng.
- Rủi ro: làm phẳng card làm mất group semantics. Giảm thiểu: dùng heading, section, spacing và divider có chủ đích.
- Rủi ro: thay đổi quá rộng trong một commit. Giảm thiểu: triển khai theo vertical slice: shell, Today, Week, Progress, Settings, visual QA.

## 18. Quyết định đã duyệt

- Chọn hướng `Execution cockpit` thay cho Editorial planner hoặc Performance dashboard.
- Cho phép thay đổi mạnh layout nhưng không thay đổi contract dữ liệu/hành vi.
- Command bar gọn thay hero chu kỳ lớn.
- Nội dung thao tác phải xuất hiện sớm trong viewport đầu tiên.
- Cycle rail là visual signature xuyên suốt.
- Public footer không xuất hiện trong execution workspace.
- Palette và typography dùng token hiện có; không thêm theme hoặc dependency mới.
