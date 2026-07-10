# Requirements Document

## Introduction

Tài liệu này định nghĩa yêu cầu cho việc nâng cấp UI/UX của Vision Board Web Platform lên mức "production-polished": giao diện calm, hiện đại, dễ scan, đáng tin, và an toàn trên mobile. Trọng tâm là làm rõ core flow theo thứ tự sản phẩm:

```text
Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility Check -> 12-Week Plan -> Weekly Execution -> Reflection/Review
```

Đây chủ yếu là công việc **Shell** (layout, spacing, hierarchy, typography, empty state, CTA, trạng thái hiển thị). Tuy nhiên phần hiển thị trạng thái sync/auth/billing và điều hướng core flow chạm tới ranh giới **Mixed** vì phụ thuộc dữ liệu đã lưu, entitlement, app mode, và route availability. Vì vậy tài liệu này cố định các **bất biến (invariant) của Core contract** mà công việc nâng cấp UI **không được** thay đổi: storage keys, data shape, entitlement authority, billing route behavior, và demo/real mode branching.

Phạm vi bao gồm cả bước audit và chụp baseline (before/after, desktop + mobile) như một phần bắt buộc của quy trình, để thay đổi có thể kiểm chứng và không gây hồi quy.

## Glossary

- **Core_Flow**: Chuỗi màn hình sản phẩm chính theo thứ tự: Onboarding, Life Balance, Life Insight, SMART Goal Setup, Feasibility Check, 12-Week Setup/System, Weekly Execution (Today/Goal Tracker), Reflection Journal.
- **Core_Flow_UI**: Toàn bộ hệ thống giao diện (layout, spacing, hierarchy, typography, empty state, CTA, trạng thái) của các màn hình trong Core_Flow và Dashboard, là đối tượng được nâng cấp.
- **Dashboard**: Màn hình tổng quan tại `src/app/pages/Dashboard.tsx` và các widget trong `src/features/dashboard`.
- **Next_Step_Guidance**: Cơ chế hiển thị trên UI chỉ rõ bước tiếp theo trong Core_Flow mà người dùng nên thực hiện.
- **Sync_Status_Indicator**: Thành phần UI hiển thị trạng thái đồng bộ backend cho người dùng đã đăng nhập ở real mode, gồm các giá trị: synced, syncing, offline, error.
- **App_Mode**: Chế độ chạy của ứng dụng, xác định bởi `isRealMode()` / `isDemoMode()` trong `src/app/utils/app-mode.ts`.
- **Real_Mode**: App_Mode khi `isRealMode()` trả về true (production).
- **Demo_Mode**: App_Mode khi `isDemoMode()` trả về true (preview/marketing).
- **Demo_Only_Copy**: Các chuỗi văn bản chỉ dành cho demo, gồm (không phân biệt hoa thường): "dùng thử", "không cần đăng nhập", "trên trình duyệt này", "không thu tiền thật", "mock", "demo".
- **Storage_Contract**: Tập hợp storage keys và data shape được lưu trong localStorage (`storage.ts`, `storage-types.ts`, `storage-twelve-week.ts` và các module liên quan).
- **Entitlement_Authority**: Nguồn quyết định quyền/plan của người dùng thông qua các helper hiện có (`usePlanEntitlements`, `UpgradePaywallDialog`, billing/entitlement helpers).
- **Brand_Identity**: Logo, tên thương hiệu, và team identity hiện có của sản phẩm.
- **Baseline_Screenshot**: Ảnh chụp màn hình của một màn hình Core_Flow hoặc Dashboard ở trạng thái desktop và mobile trước khi nâng cấp UI.
- **After_Screenshot**: Ảnh chụp màn hình của một màn hình Core_Flow hoặc Dashboard ở trạng thái desktop và mobile sau khi nâng cấp UI.
- **Mobile_Viewport**: Khung nhìn có chiều rộng từ 320 đến 767 CSS pixel dùng để kiểm tra an toàn mobile (baseline 390x844).
- **Desktop_Viewport**: Khung nhìn có chiều rộng từ 1024 CSS pixel trở lên dùng để kiểm tra desktop (baseline 1440x900).
- **Primary_CTA**: Nút hành động chính trên một màn hình, dẫn người dùng tới bước tiếp theo của Core_Flow.

## Requirements

### Requirement 1: Audit và chụp baseline trước khi sửa

**User Story:** Là developer thực hiện nâng cấp, tôi muốn audit và có baseline screenshots của core flow trước khi sửa, để có thể so sánh before/after và phát hiện hồi quy.

#### Acceptance Criteria

1. WHEN quá trình nâng cấp UI bắt đầu, THE Core_Flow_UI process SHALL tạo ra một audit liệt kê từng màn hình trong Core_Flow và Dashboard, mỗi mục ghi tên định danh màn hình và phân loại đúng một trong hai giá trị Shell hoặc Mixed.
2. WHEN một màn hình Core_Flow hoặc Dashboard được chọn để nâng cấp, THE Core_Flow_UI process SHALL chụp Baseline_Screenshot cho màn hình đó ở cả Desktop_Viewport (1440x900) và Mobile_Viewport (390x844) trước khi áp dụng bất kỳ thay đổi nào lên màn hình đó.
3. WHERE một màn hình được phân loại Mixed, THE audit SHALL ghi rõ danh sách từng Core contract bị chạm (Storage_Contract, Entitlement_Authority, sync, App_Mode, hoặc route availability) và ghi trạng thái xác nhận rằng mỗi contract đó không bị thay đổi.
4. WHEN quá trình nâng cấp một màn hình hoàn tất, THE Core_Flow_UI process SHALL chụp After_Screenshot cho màn hình đó ở cả Desktop_Viewport (1440x900) và Mobile_Viewport (390x844).
5. IF một thao tác chỉnh sửa được yêu cầu trên một màn hình mà Baseline_Screenshot ở Desktop_Viewport hoặc Mobile_Viewport chưa tồn tại, THEN THE Core_Flow_UI process SHALL chặn thao tác chỉnh sửa đó, không áp dụng thay đổi nào, và hiển thị thông báo lỗi cho biết baseline còn thiếu và cần chụp trước.
6. IF một Core contract thuộc màn hình Mixed bị phát hiện thay đổi so với trạng thái đã xác nhận trong audit, THEN THE Core_Flow_UI process SHALL dừng quá trình nâng cấp màn hình đó, giữ nguyên (không ghi đè) trạng thái hiện có, và báo cáo lỗi nêu rõ contract bị thay đổi.
7. IF việc chụp Baseline_Screenshot hoặc After_Screenshot thất bại, THEN THE Core_Flow_UI process SHALL không đánh dấu bước chụp là hoàn tất và hiển thị thông báo lỗi cho biết việc chụp screenshot đã thất bại kèm màn hình và viewport liên quan.

### Requirement 2: Làm rõ điểm bắt đầu và bước tiếp theo của core flow

**User Story:** Là người dùng mới, tôi muốn biết bắt đầu từ đâu và bước tiếp theo là gì, để tôi có thể đi qua core flow mà không bị lạc.

#### Acceptance Criteria

1. WHEN người dùng chưa hoàn tất Onboarding truy cập Dashboard, THE Dashboard SHALL hiển thị Next_Step_Guidance trỏ tới bước Core_Flow chưa hoàn tất đầu tiên theo thứ tự ưu tiên của Core_Flow, trong vòng 2 giây kể từ lần render đầu tiên của Dashboard.
2. WHEN một màn hình Core_Flow được hoàn tất và tồn tại màn hình kế tiếp, THE Core_Flow_UI SHALL hiển thị Primary_CTA trỏ tới màn hình kế tiếp đó.
3. IF một màn hình Core_Flow được hoàn tất và không tồn tại màn hình kế tiếp, THEN THE Core_Flow_UI SHALL không hiển thị Primary_CTA trỏ tới màn hình kế tiếp.
4. THE Core_Flow_UI SHALL hiển thị đúng một Primary_CTA được đánh dấu là hành động chính trên mỗi màn hình Core_Flow, và không có phần tử điều hướng nào khác được đánh dấu là hành động chính.
5. WHILE người dùng đang ở một màn hình Core_Flow, THE Core_Flow_UI SHALL hiển thị vị trí hiện tại dưới dạng "bước M trên tổng N" trong trình tự Core_Flow.
6. THE Next_Step_Guidance SHALL dẫn tới các route hiện có mà không thay đổi route availability hoặc guard.
7. IF route của bước kế tiếp không khả dụng hoặc bị guard chặn, THEN THE Core_Flow_UI SHALL ẩn Primary_CTA trỏ tới bước kế tiếp và hiển thị chỉ báo cho biết bước kế tiếp hiện chưa truy cập được.

### Requirement 3: Giảm mật độ cảm nhận của Dashboard mà không mất dữ liệu

**User Story:** Là người dùng đang thực thi kế hoạch, tôi muốn Dashboard bớt cảm giác quá nhiều widget cùng lúc, để tôi tập trung vào việc cần làm mà không mất thông tin quan trọng.

#### Acceptance Criteria

1. WHEN Dashboard được tải, THE Dashboard SHALL hiển thị 100% số widget đã được cấu hình trước đó (số widget hiển thị bằng số widget đã cấu hình) mà không xóa hoặc ẩn vĩnh viễn bất kỳ widget hay dữ liệu nào.
2. WHILE toàn bộ widget và dữ liệu được giữ nguyên, THE Dashboard SHALL sắp xếp các widget theo một thứ tự ưu tiên xác định trước, trong đó toàn bộ nhóm widget Core_Flow xuất hiện phía trên tất cả widget thứ cấp theo luồng đọc từ trên xuống.
3. WHERE một widget được phân loại là thứ cấp, THE Dashboard SHALL đặt widget đó bên dưới hoặc tách biệt khỏi nhóm Core_Flow chính, sao cho toàn bộ nhóm Core_Flow được nhìn thấy trước nhóm thứ cấp trong thứ tự đọc từ trên xuống.
4. THE Dashboard SHALL giữ nguyên nguồn dữ liệu và điều kiện hiển thị hiện có của mỗi widget mà không thay đổi Storage_Contract (không đổi tên khóa lưu trữ, không đổi cấu trúc dữ liệu đã lưu, không xóa dữ liệu cục bộ).
5. IF một widget không có dữ liệu để hiển thị, THEN THE Dashboard SHALL giữ widget đó trong bố cục ở trạng thái rỗng kèm thông báo cho biết chưa có dữ liệu, thay vì loại bỏ widget khỏi Dashboard.

### Requirement 4: An toàn hiển thị trên mobile

**User Story:** Là người dùng mobile, tôi muốn giao diện sạch và không lỗi hiển thị, để tôi dùng được sản phẩm trên điện thoại một cách tin cậy.

#### Acceptance Criteria

1. WHILE hiển thị ở Mobile_Viewport có chiều rộng từ 320 CSS pixel đến 767 CSS pixel, THE Core_Flow_UI SHALL trình bày nội dung sao cho không có hai phần tử tương tác hoặc phần tử chứa nội dung nào có vùng bao (bounding box) giao nhau quá 0 pixel, ngoại trừ các phần tử được thiết kế chủ đích để chồng lớp (overlay, dropdown, modal, tooltip).
2. WHILE hiển thị ở Mobile_Viewport có chiều rộng từ 320 CSS pixel đến 767 CSS pixel, THE Core_Flow_UI SHALL trình bày toàn bộ văn bản sao cho chiều rộng và chiều cao nội dung văn bản không vượt quá vùng nhìn thấy (client area) của container chứa nó, và không xuất hiện văn bản bị cắt (clipped) hoặc bị che khi container không được cấu hình cuộn.
3. WHILE hiển thị ở Mobile_Viewport có chiều rộng từ 320 CSS pixel đến 767 CSS pixel, THE Core_Flow_UI SHALL hiển thị Primary_CTA ở trạng thái nhìn thấy được với toàn bộ vùng bao nằm trong viewport, không bị bất kỳ phần tử overlay nào che khuất, và có vùng chạm tối thiểu 44x44 CSS pixel.
4. WHILE hiển thị ở Mobile_Viewport có chiều rộng từ 320 CSS pixel đến 767 CSS pixel, THE Core_Flow_UI SHALL trình bày nội dung sao cho chiều rộng cuộn (scrollWidth) của tài liệu không vượt quá chiều rộng viewport (clientWidth), nghĩa là không phát sinh thanh cuộn ngang.
5. WHILE hiển thị ở Desktop_Viewport có chiều rộng từ 1024 CSS pixel trở lên, THE Core_Flow_UI SHALL trình bày nội dung sao cho không có hai phần tử tương tác hoặc phần tử chứa nội dung nào có vùng bao giao nhau quá 0 pixel (ngoại trừ overlay chủ đích) và không có văn bản vượt quá vùng nhìn thấy của container chứa nó.
6. IF nội dung không thể vừa khít trong Mobile_Viewport mà không phát sinh cuộn ngang, THEN THE Core_Flow_UI SHALL cho phép cuộn dọc để truy cập toàn bộ nội dung và SHALL giữ Primary_CTA ở trạng thái chạm được mà không cần cuộn ngang.

### Requirement 5: Empty state rõ ràng và định hướng hành động

**User Story:** Là người dùng chưa có dữ liệu ở một màn hình, tôi muốn thấy empty state rõ ràng có hướng dẫn, để tôi biết cần làm gì tiếp theo.

#### Acceptance Criteria

1. WHEN một màn hình Core_Flow hoàn tất tải dữ liệu và không có bản ghi nào để hiển thị, THE Core_Flow_UI SHALL hiển thị một empty state gồm: một tiêu đề, một đoạn mô tả (tối đa 200 ký tự) nêu lý do màn hình đang trống, và đúng một Primary_CTA.
2. THE empty state SHALL chỉ sử dụng các route và hành động đã đăng ký hiện có, không tạo route mới và không thay đổi route availability.
3. WHEN một màn hình Core_Flow có ít nhất một bản ghi dữ liệu để hiển thị, THE Core_Flow_UI SHALL hiển thị dữ liệu và SHALL NOT hiển thị empty state.
4. WHEN người dùng kích hoạt Primary_CTA của empty state, THE Core_Flow_UI SHALL điều hướng tới route hiện có tương ứng với hành động khởi tạo dữ liệu cho màn hình đó.
5. WHILE một màn hình Core_Flow đang tải dữ liệu, THE Core_Flow_UI SHALL hiển thị trạng thái đang tải và SHALL NOT hiển thị empty state.
6. IF việc tải dữ liệu của một màn hình Core_Flow thất bại, THEN THE Core_Flow_UI SHALL hiển thị trạng thái lỗi kèm thông báo cho biết tải dữ liệu thất bại và một hành động thử lại, thay vì hiển thị empty state.

### Requirement 6: Trạng thái đồng bộ (sync) rõ ràng cho người dùng đã đăng nhập

**User Story:** Là người dùng đã đăng nhập ở real mode, tôi muốn thấy trạng thái đồng bộ dữ liệu, để tôi biết dữ liệu của mình đã an toàn trên server hay chưa.

#### Acceptance Criteria

1. WHILE người dùng đã đăng nhập ở Real_Mode, THE Sync_Status_Indicator SHALL hiển thị đúng một trong bốn trạng thái loại trừ lẫn nhau tại mọi thời điểm: synced, syncing, offline, hoặc error.
2. WHEN một thao tác đồng bộ backend bắt đầu, THE Sync_Status_Indicator SHALL chuyển sang trạng thái syncing.
3. WHEN một thao tác đồng bộ backend hoàn tất thành công, THE Sync_Status_Indicator SHALL chuyển sang trạng thái synced.
4. WHEN kết nối mạng bị mất, THE Sync_Status_Indicator SHALL chuyển sang trạng thái offline.
5. IF một thao tác đồng bộ backend không hoàn tất trong 30 giây hoặc trả về lỗi từ server, THEN THE Sync_Status_Indicator SHALL chuyển sang trạng thái error mà không thay đổi hoặc xóa dữ liệu local.
6. WHILE Sync_Status_Indicator ở trạng thái error, THE Core_Flow_UI SHALL hiển thị một điều khiển cho phép người dùng thử đồng bộ lại.
7. WHEN người dùng kích hoạt điều khiển thử lại, THE Core_Flow_UI SHALL bắt đầu một thao tác đồng bộ mới trong vòng 1 giây.
8. WHILE App_Mode là Demo_Mode, THE Core_Flow_UI SHALL không hiển thị Sync_Status_Indicator và không gọi các đường sync backend được bảo vệ.
9. THE Sync_Status_Indicator SHALL lấy trạng thái từ các API service và link store hiện có mà không thay đổi sync semantics.

### Requirement 7: Giữ nguyên brand và team identity

**User Story:** Là chủ sản phẩm, tôi muốn brand và logo được giữ nguyên khi nâng cấp UI, để nhận diện thương hiệu không bị thay đổi ngoài ý muốn.

#### Acceptance Criteria

1. THE Core_Flow_UI SHALL giữ nguyên toàn bộ thành phần Brand_Identity hiện có, bao gồm tệp logo và tên thương hiệu, sao cho tệp logo khớp chính xác và chuỗi ký tự tên thương hiệu khớp chính xác với phiên bản ngay trước khi nâng cấp UI.
2. WHEN quá trình nâng cấp UI hoàn tất, THE Core_Flow_UI SHALL hiển thị logo và tên thương hiệu giống hệt với phiên bản trước khi nâng cấp, không có khác biệt về tệp logo hoặc chuỗi ký tự tên thương hiệu.
3. IF việc nâng cấp UI tạo ra bất kỳ thay đổi nào đối với logo hoặc tên thương hiệu, THEN THE Core_Flow_UI SHALL chặn việc áp dụng thay đổi đó và yêu cầu chủ sản phẩm phê duyệt trước khi thực hiện.
4. IF thay đổi đối với logo hoặc tên thương hiệu chưa được chủ sản phẩm phê duyệt, THEN THE Core_Flow_UI SHALL giữ nguyên Brand_Identity trước đó và hiển thị thông báo chỉ báo rằng thay đổi đang chờ phê duyệt.

### Requirement 8: Tách bạch copy và hành vi route giữa real mode và demo mode

**User Story:** Là người dùng thật ở real mode, tôi muốn không thấy nội dung mang tính demo, để tôi tin tưởng sản phẩm là bản production thực sự.

#### Acceptance Criteria

1. WHILE App_Mode là Real_Mode, THE Core_Flow_UI SHALL không render bất kỳ chuỗi nào thuộc Demo_Only_Copy, trong đó Demo_Only_Copy được định nghĩa là tập các chuỗi chứa (không phân biệt hoa thường) một trong các cụm: "dùng thử", "không cần đăng nhập", "trên trình duyệt này", "không thu tiền thật", "mock", "demo".
2. IF một chuỗi thuộc Demo_Only_Copy được yêu cầu render WHILE App_Mode là Real_Mode, THEN THE Core_Flow_UI SHALL thay thế bằng chuỗi copy production tương ứng dùng ngôn ngữ gắn với tài khoản và SHALL không hiển thị chuỗi demo gốc.
3. WHILE App_Mode là Real_Mode, WHEN Core_Flow_UI hiển thị nội dung đếm ngược hoặc trạng thái thời hạn gói, THE Core_Flow_UI SHALL sử dụng cụm gắn với tài khoản "trên tài khoản này" và SHALL không sử dụng cụm gắn với trình duyệt "trên trình duyệt này".
4. WHILE App_Mode là Real_Mode, THE Core_Flow_UI SHALL không đăng ký và không render route mock checkout `/billing/mock-checkout`.
5. WHILE App_Mode là Demo_Mode, THE Core_Flow_UI SHALL đăng ký và render route `/billing/mock-checkout` theo đúng hành vi branching dựa trên `isRealMode()` và `isDemoMode()`.

### Requirement 9: Giữ nguyên local-first behavior và các Core contract

**User Story:** Là developer bảo trì hệ thống, tôi muốn công việc nâng cấp UI không phá vỡ local-first behavior và các Core contract, để tránh mất dữ liệu người dùng và lỗi hồi quy nghiêm trọng.

#### Acceptance Criteria

1. THE Core_Flow_UI SHALL giữ nguyên Storage_Contract bằng cách sử dụng đúng tập storage keys hiện có, không thêm/đổi/xóa tên key và không thay đổi cấu trúc (data shape) của dữ liệu đã lưu.
2. WHEN Core_Flow_UI đọc dữ liệu local được lưu bởi phiên bản trước, THE Core_Flow_UI SHALL trả về dữ liệu tương thích với data shape hiện hành mà không mất trường dữ liệu đã có.
3. THE Core_Flow_UI SHALL giữ nguyên Entitlement_Authority, đặt toàn bộ logic paywall phía sau các billing/entitlement helper hiện có (`usePlanEntitlements`, `UpgradePaywallDialog`) và không thực hiện kiểm tra entitlement rời rạc bên ngoài các helper này.
4. WHILE backend hoặc Firebase ở trạng thái không khả dụng (request thất bại hoặc quá thời gian chờ), THE Core_Flow_UI SHALL cho phép toàn bộ thao tác của vòng thực thi 12-Week (setup, Today, weekly review, progress) hoạt động dựa trên dữ liệu local mà không chờ hoặc phụ thuộc vào kết quả sync.
5. WHILE backend hoặc Firebase ở trạng thái không khả dụng, THE Core_Flow_UI SHALL cho phép người dùng bắt đầu chu kỳ 12-Week mới dựa trên dữ liệu local đã cache và cấu hình mặc định, và hoàn tất thao tác lưu local trong vòng 2 giây.
6. IF một thao tác sync remote thất bại hoặc quá thời gian chờ, THEN THE Core_Flow_UI SHALL giữ nguyên dữ liệu progress local không bị thay đổi hoặc xóa, và hiển thị trạng thái sync (offline/error) cho người dùng real-mode đã đăng nhập.
7. THE Core_Flow_UI SHALL giữ nguyên billing route behavior hiện có và phân nhánh demo/real mode dựa trên `isRealMode()` / `isDemoMode()`, không đăng ký hoặc render route chỉ dành cho demo (ví dụ `/billing/mock-checkout`) khi ở real mode.

### Requirement 10: Phong cách calm và nhất quán typography/spacing

**User Story:** Là người dùng, tôi muốn giao diện calm, hiện đại và nhất quán, để trải nghiệm dễ chịu và đáng tin thay vì rối mắt.

#### Acceptance Criteria

1. WHEN Core_Flow_UI hiển thị tiêu đề, nội dung, và nhãn phụ trong các màn hình thuộc `src/app/pages`, `src/app/components`, `src/features/dashboard`, và `src/features/plan12week`, THE Core_Flow_UI SHALL chỉ dùng các giá trị font-size, font-weight, và line-height thuộc tập giới hạn được định nghĩa sẵn trong design system hiện có (typography scale).
2. IF một phần tử văn bản dùng giá trị font-size, font-weight, hoặc line-height nằm ngoài tập typography scale đã định nghĩa, THEN THE Core_Flow_UI SHALL bị coi là không đạt (fail) ở tiêu chí typography.
3. WHEN Core_Flow_UI áp dụng khoảng cách (margin, padding, gap) giữa các nhóm nội dung, THE Core_Flow_UI SHALL chỉ dùng các giá trị thuộc thang spacing đã định nghĩa sẵn trong design system hiện có.
4. IF một phần tử dùng giá trị spacing nằm ngoài thang spacing đã định nghĩa, THEN THE Core_Flow_UI SHALL bị coi là không đạt (fail) ở tiêu chí spacing.
5. THE Core_Flow_UI SHALL không dùng hiệu ứng chuyển động có thời lượng vượt quá 300ms, không dùng hiệu ứng lặp lại hoặc tự động phát liên tục, không dùng hiệu ứng glow, và không dùng biến đổi 3D (perspective hoặc rotate theo trục 3D).
6. IF một component hoặc helper hiện có đã đáp ứng đầy đủ nhu cầu, THEN THE Core_Flow_UI SHALL tái sử dụng component hoặc helper đó thay vì tạo abstraction mới.

### Requirement 11: Kiểm chứng sau nâng cấp

**User Story:** Là developer, tôi muốn thay đổi được kiểm chứng bằng các lệnh chuẩn của dự án, để đảm bảo không gây lỗi build, type, lint, hoặc test.

#### Acceptance Criteria

1. WHEN quá trình nâng cấp UI hoàn tất, THE Core_Flow_UI process SHALL chạy tuần tự theo thứ tự `npm run typecheck`, `npm run lint`, `npm run test:run`, rồi `npm run build`, và với mỗi lệnh SHALL ghi lại exit code cùng output (stdout và stderr).
2. IF cả bốn lệnh kiểm chứng đều kết thúc với exit code bằng 0, THEN THE Core_Flow_UI process SHALL coi bước kiểm chứng là thành công và cho phép coi công việc là hoàn tất.
3. IF một lệnh kiểm chứng kết thúc với exit code khác 0, THEN THE Core_Flow_UI process SHALL báo cáo tên lệnh thất bại, exit code, và error output, và SHALL không đánh dấu bước kiểm chứng là thành công hoàn toàn.
4. IF không thể thực thi được một lệnh kiểm chứng do thiếu dependency, thiếu script, hoặc thiếu biến môi trường, THEN THE Core_Flow_UI process SHALL báo cáo tên lệnh không chạy được, nguyên nhân cụ thể, và các bước setup cần thiết để chạy lại lệnh đó.
5. WHEN bước kiểm chứng kết thúc, THE Core_Flow_UI process SHALL báo cáo danh sách file đã đổi, giải thích thay đổi, các lệnh đã chạy kèm exit code và kết quả, và rủi ro/TODO còn lại.
6. WHERE thay đổi có ảnh hưởng đến UI, THE Core_Flow_UI process SHALL cung cấp screenshots before và after cho bề mặt UI bị ảnh hưởng.

### Requirement 12: Accessibility (a11y) chuyên sâu cho Core_Flow

**User Story:** Là người dùng thao tác bằng bàn phím hoặc trình đọc màn hình, tôi muốn dùng được toàn bộ Core_Flow mà không cần chuột, để tôi tiếp cận sản phẩm một cách bình đẳng và tin cậy.

#### Acceptance Criteria

1. THE Core_Flow_UI SHALL cho phép mọi hành động chính trong Core_Flow (điều hướng bước, kích hoạt Primary_CTA, nhập liệu, đóng/mở overlay) được thực hiện đầy đủ bằng bàn phím mà không yêu cầu thao tác chuột, và SHALL cho phép di chuyển tiêu điểm ra khỏi mọi phần tử chỉ bằng bàn phím (không keyboard trap), loại trừ focus trap chủ đích của modal.
2. WHEN người dùng dùng phím Tab để di chuyển tiêu điểm trong một màn hình Core_Flow, THE Core_Flow_UI SHALL đặt thứ tự tiêu điểm (focus order) khớp với thứ tự đọc trực quan từ trên xuống và từ trái sang phải của màn hình đó.
3. WHILE một phần tử tương tác đang nhận tiêu điểm bàn phím, THE Core_Flow_UI SHALL hiển thị chỉ báo tiêu điểm (focus indicator) nhìn thấy được với độ tương phản so với nền đạt tối thiểu 3:1.
4. WHERE một control không có nhãn văn bản hiển thị rõ ràng, THE Core_Flow_UI SHALL cung cấp ARIA label hoặc ARIA role mô tả chức năng của control đó cho công nghệ trợ giúp.
5. THE Core_Flow_UI SHALL trình bày văn bản thường với tỉ lệ tương phản màu chữ trên nền đạt tối thiểu 4.5:1, và văn bản lớn (từ 18.66px đậm hoặc từ 24px thường trở lên) cùng các thành phần giao diện (đường viền control, biểu tượng mang thông tin) đạt tối thiểu 3:1.
6. WHEN một modal hoặc dialog được mở, THE Core_Flow_UI SHALL giữ tiêu điểm bàn phím bên trong modal hoặc dialog đó (focus trap) cho tới khi nó được đóng.
7. WHEN một modal hoặc dialog được đóng, THE Core_Flow_UI SHALL trả tiêu điểm về phần tử đã kích hoạt việc mở modal hoặc dialog đó.
8. WHEN một modal hoặc dialog đang mở và người dùng nhấn Escape, THE Core_Flow_UI SHALL đóng modal/dialog đó và trả tiêu điểm về phần tử đã kích hoạt mở nó.
9. WHEN người dùng kích hoạt Primary_CTA hoặc control bằng phím Enter hoặc Space, THE Core_Flow_UI SHALL thực hiện hành động tương ứng trong vòng 1 giây.
10. IF một hành động thực hiện bằng bàn phím thất bại, THEN THE Core_Flow_UI SHALL hiển thị thông báo lỗi, giữ tiêu điểm ở control liên quan, và giữ nguyên trạng thái dữ liệu.
11. THE Core_Flow_UI SHALL giữ nguyên Storage_Contract, Entitlement_Authority, sync semantics, billing route behavior, và branching `isRealMode()` / `isDemoMode()` khi áp dụng các cải thiện accessibility.

### Requirement 13: Giảm friction cho form Core_Flow

**User Story:** Là người dùng đang điền form trong Core_Flow (Onboarding, SMART Goal Setup, Feasibility Check), tôi muốn được báo lỗi ngay tại chỗ và không bị mất dữ liệu đã nhập, để tôi hoàn tất form nhanh và ít bực bội.

#### Acceptance Criteria

1. WHEN một field trong form Core_Flow (Onboarding, SMART Goal Setup, Feasibility Check) mất tiêu điểm (blur) hoặc có giá trị thay đổi và không đạt điều kiện hợp lệ, THE Core_Flow_UI SHALL hiển thị thông báo lỗi cạnh chính field liên quan trong vòng 500ms, thay vì chỉ hiển thị lỗi tại thời điểm submit.
2. WHEN Core_Flow_UI hiển thị một thông báo lỗi hợp lệ của form, THE Core_Flow_UI SHALL nêu rõ điều kiện hợp lệ cụ thể mà field cần đạt (giá trị bắt buộc, định dạng hợp lệ, hoặc độ dài cho phép).
3. WHEN người dùng sửa một field không hợp lệ thành hợp lệ, THE Core_Flow_UI SHALL gỡ bỏ thông báo lỗi của field đó trong vòng 500ms.
4. WHILE một thao tác lưu dữ liệu của form đang diễn ra, THE Core_Flow_UI SHALL hiển thị trạng thái "đang lưu" trong vòng 300ms kể từ khi thao tác lưu bắt đầu và duy trì cho đến khi thao tác lưu kết thúc.
5. WHEN một thao tác lưu dữ liệu của form hoàn tất thành công, THE Core_Flow_UI SHALL hiển thị trạng thái "đã lưu" trong tối thiểu 2 giây.
6. IF việc kiểm tra hợp lệ của form thất bại, THEN THE Core_Flow_UI SHALL giữ nguyên toàn bộ dữ liệu người dùng đã nhập trong form và SHALL NOT xóa hoặc reset các giá trị đã nhập.
7. IF thao tác lưu dữ liệu form thất bại, THEN THE Core_Flow_UI SHALL hiển thị trạng thái lỗi lưu và giữ nguyên toàn bộ dữ liệu người dùng đã nhập.
8. THE Core_Flow_UI SHALL giữ nguyên Storage_Contract và data shape của dữ liệu đã lưu khi áp dụng inline validation và hiển thị trạng thái lưu.

### Requirement 14: Loading skeleton cho màn hình Core_Flow đang tải dữ liệu

**User Story:** Là người dùng đang chờ một màn hình Core_Flow tải dữ liệu, tôi muốn thấy khung nội dung sắp hiển thị thay vì màn hình trống, để tôi cảm nhận ứng dụng phản hồi nhanh và biết nội dung nào sắp xuất hiện.

#### Acceptance Criteria

1. WHILE một màn hình Core_Flow đang ở trạng thái loading theo state machine hiện có, THE Core_Flow_UI SHALL hiển thị skeleton placeholder gồm các khối placeholder tương ứng một-một với các vùng nội dung chính của màn hình sắp hiển thị (vùng tiêu đề, vùng danh sách hoặc thẻ nội dung, và vùng hành động nếu có), thay vì spinner đơn thuần hoặc màn hình trống.
2. WHILE hiển thị skeleton ở Mobile_Viewport có chiều rộng từ 320 CSS pixel đến 767 CSS pixel, THE Core_Flow_UI SHALL trình bày skeleton sao cho chiều rộng cuộn (scrollWidth) của tài liệu không vượt quá chiều rộng viewport (clientWidth).
3. WHILE hiển thị skeleton ở Desktop_Viewport có chiều rộng từ 1024 CSS pixel trở lên, THE Core_Flow_UI SHALL trình bày skeleton sao cho không có phần tử skeleton nào tràn ra ngoài vùng nhìn thấy của container chứa nó.
4. THE Core_Flow_UI SHALL trình bày skeleton không dùng hiệu ứng chuyển động có thời lượng vượt quá 300ms, không dùng hiệu ứng lặp lại hoặc tự động phát liên tục, và không dùng hiệu ứng glow.
5. WHEN màn hình Core_Flow chuyển sang trạng thái loading theo state machine hiện có, THE Core_Flow_UI SHALL hiển thị skeleton trong vòng 100ms kể từ thời điểm chuyển trạng thái.
6. WHEN màn hình Core_Flow chuyển từ trạng thái loading sang trạng thái ready, THE Core_Flow_UI SHALL thay toàn bộ skeleton bằng nội dung thật của màn hình và SHALL không giữ lại bất kỳ phần tử skeleton nào sau khi nội dung thật đã hiển thị.
7. IF màn hình Core_Flow chuyển sang trạng thái tải thất bại theo state machine hiện có, THEN THE Core_Flow_UI SHALL thay skeleton bằng trạng thái lỗi có thông báo cho biết việc tải dữ liệu thất bại kèm tùy chọn thử lại, và SHALL không tiếp tục hiển thị skeleton.
8. THE Core_Flow_UI SHALL giữ skeleton là lớp trình bày và SHALL giữ nguyên nguồn dữ liệu cùng Storage_Contract, không thay đổi cách đọc hay ghi dữ liệu của màn hình.

### Requirement 15: Nâng cấp bề mặt Reflection/Review

**User Story:** Là người dùng đến màn hình cuối của Core_Flow (Reflection/Review), tôi muốn phân biệt rõ phần phản tư với dữ liệu tiến độ và biết hành động chính là gì, để tôi hoàn tất chu kỳ một cách mạch lạc.

#### Acceptance Criteria

1. WHEN màn hình Reflection/Review hiển thị, THE Core_Flow_UI SHALL trình bày hai section tách biệt là phần prompt phản tư và phần dữ liệu tiến độ, trong đó mỗi khối có tiêu đề riêng và ranh giới phân tách rõ giữa hai phần.
2. THE Core_Flow_UI SHALL hiển thị đúng một Primary_CTA được đánh dấu là hành động chính trên màn hình Reflection/Review, đánh dấu các phần tử điều hướng còn lại là hành động phụ (secondary), và không có phần tử điều hướng nào khác được đánh dấu là hành động chính.
3. WHILE màn hình Reflection/Review đang tải dữ liệu, THE Core_Flow_UI SHALL hiển thị trạng thái đang tải và SHALL NOT hiển thị empty state hoặc Primary_CTA của empty state.
4. WHEN màn hình Reflection/Review hoàn tất tải dữ liệu và chưa có bản ghi reflection nào, THE Core_Flow_UI SHALL hiển thị một empty state gồm: một tiêu đề, một đoạn mô tả dài từ 1 đến 200 ký tự, và đúng một Primary_CTA trỏ tới route hiện có.
5. WHEN người dùng kích hoạt Primary_CTA của empty state trên màn hình Reflection/Review, THE Core_Flow_UI SHALL điều hướng tới route hiện có tương ứng với hành động tạo reflection và SHALL NOT tạo route mới hoặc thay đổi route availability.
6. IF việc tải dữ liệu màn hình Reflection/Review thất bại, THEN THE Core_Flow_UI SHALL hiển thị trạng thái lỗi kèm tùy chọn thử lại và SHALL giữ nguyên dữ liệu reflection/review đã lưu.
7. THE Core_Flow_UI SHALL giữ nguyên Storage_Contract cho dữ liệu reflection và review, không đổi tên khóa lưu trữ và không đổi data shape đã lưu.
