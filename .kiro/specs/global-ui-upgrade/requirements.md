# Requirements Document

## Introduction

Tính năng **global-ui-upgrade** nâng cấp chất lượng thị giác của toàn bộ Vision Board Web Platform bằng cách **tinh chỉnh và nâng cấp phong cách hiện có (elevate)**, KHÔNG thay thế hoặc thiết kế lại sang một phong cách khác. Mục tiêu là giữ nguyên bản sắc thiết kế hiện tại (hệ token 3 lớp Forest Green / Terracotta, typography Be Vietnam Pro + serif, phong cách "paper studio / editorial", light + dark mode) trong khi nâng độ hoàn thiện: đồng bộ design token, dọn các giá trị lệch khỏi bản sắc (color drift), thống nhất typography và nhịp khoảng cách (spacing rhythm), làm mượt polish của các component dùng chung, cân bằng light/dark mode, và cải thiện khả năng tiếp cận (accessibility).

Đây là bề mặt **Mixed/Shell**: phần lớn là polish UI trên `src/styles/*`, `src/app/components/*` và `src/app/pages/*`, nhưng KHÔNG được phá vỡ hành vi entitlement, route, auth, sync, hay quy tắc copy real-mode vs demo-mode. Contract Core (entitlement/route/auth/copy mode) phải được đóng băng và bảo toàn; công việc nâng cấp chỉ tác động lên tầng trình bày.

Phạm vi bao trùm toàn bộ luồng sản phẩm: Onboarding → Life Balance → Life Insight → SMART Goal → Feasibility Check → 12-Week Plan → Weekly Execution → Reflection/Review, cùng các bề mặt phụ trợ (Dashboard, Settings, Billing, Legal, Auth) ở cả light và dark mode.

## Glossary

- **Design_System**: Hệ thống nguồn của mọi giá trị thị giác dùng chung, gồm design token (`src/styles/tokens.css`, `src/styles/theme.css`), cấu hình Tailwind (`tailwind.config.js`), và font (`src/styles/fonts.css`).
- **Design_Token**: Một biến CSS ngữ nghĩa hoặc component (ví dụ `--app-accent`, `--app-radius-card`, `--text-2xl`) đại diện cho một quyết định thị giác tái sử dụng.
- **Semantic_Token**: Design_Token ở Layer 2 (ví dụ `--app-accent`, `--app-ink`), là lớp duy nhất mà component được phép tham chiếu theo quy tắc dự án.
- **Primitive_Token**: Design_Token ở Layer 1 (ví dụ `--green-700`, `--terra-600`) chỉ dùng làm nguồn cho Semantic_Token, không dùng trực tiếp trong component.
- **UI_Component**: Component trình bày dùng chung trong `src/app/components/ui/` và `src/app/components/`.
- **Product_Page**: Màn hình cấp route trong `src/app/pages/`.
- **Theme_Engine**: Cơ chế chuyển đổi light/dark mode dựa trên class `dark` trên phần tử gốc.
- **Brand_Identity**: Tập đặc trưng thị giác hiện có cần được bảo toàn: bảng màu Forest Green (accent/execution) + Terracotta (warm/reflection), font Be Vietnam Pro (sans) + serif heading, radius/shadow "paper studio", nhịp spacing hiện tại.
- **Color_Drift**: Giá trị màu hard-coded hoặc token lệch khỏi Brand_Identity (ví dụ tím `#7c3aed`, gradient xanh dương/cyan) tồn tại rải rác trong Design_System.
- **App_Mode**: Chế độ chạy `real` hoặc `demo`, xác định qua `isRealMode()` / `isDemoMode()`.
- **Contrast_Ratio**: Tỉ lệ tương phản màu theo WCAG 2.1, đo giữa foreground và background.
- **Reduced_Motion**: Tùy chọn hệ điều hành `prefers-reduced-motion: reduce`.
- **Reflection_Context**: Nhóm màn hình Reflection/Review, nơi duy nhất được dùng token `warm/*` (Terracotta) làm tông accent/brand (trang trí). Phân biệt hai vai trò của `warm/*`: warm-as-accent (accent/brand trang trí, giới hạn trong Reflection_Context) và warm-as-status (affordance trạng thái danger/warning/error, được dùng app-wide).

## Requirements

### Requirement 1: Bảo toàn bản sắc thiết kế (Elevate, không thay thế)

**User Story:** Là người dùng hiện hữu của sản phẩm, tôi muốn giao diện sau nâng cấp vẫn giống sản phẩm tôi đang dùng nhưng chỉn chu hơn, để tôi không bị mất cảm giác quen thuộc.

#### Acceptance Criteria

1. THE Design_System SHALL giữ nguyên bảng màu Brand_Identity gồm accent Forest Green (`--app-accent`) và warm Terracotta (`--app-warm`) làm hai họ màu thương hiệu chính.
2. THE Design_System SHALL giữ nguyên bộ font hiện có gồm sans `Be Vietnam Pro` và serif heading, không thay thế bằng họ font khác.
3. WHERE một Design_Token thị giác thay đổi giá trị trong quá trình nâng cấp, THE Design_System SHALL giữ nguyên tên (key) của Design_Token đó.
4. THE Design_System SHALL giữ nguyên mô hình phân vùng màu theo ngữ cảnh, trong đó token `warm/*` chỉ được dùng làm tông accent/brand (trang trí) trong Reflection_Context; token `warm/*` VẪN ĐƯỢC dùng ở nơi khác khi phục vụ vai trò affordance trạng thái danger/warning/error (status semantics), vai trò này khác biệt với dùng warm làm accent/brand trang trí.
5. IF một thay đổi làm biến đổi bản sắc thị giác sang phong cách khác thay vì nâng cấp phong cách hiện có, THEN THE Design_System SHALL loại bỏ thay đổi đó khỏi phạm vi.

### Requirement 2: Thống nhất design token và loại bỏ color drift

**User Story:** Là nhà phát triển, tôi muốn mọi giá trị thị giác đến từ một nguồn token nhất quán, để giao diện đồng bộ và dễ bảo trì.

#### Acceptance Criteria

1. THE Design_System SHALL định nghĩa mỗi quyết định màu, radius, shadow, spacing và typography dùng chung dưới dạng Semantic_Token hoặc component token.
2. WHERE một UI_Component hoặc Product_Page cần một giá trị thị giác dùng chung, THE UI_Component SHALL tham chiếu Semantic_Token hoặc component token thay vì giá trị hard-coded.
3. THE Design_System SHALL thay thế mọi Color_Drift nằm ngoài Brand_Identity (ví dụ tím `#7c3aed`, gradient xanh dương/cyan trong tiện ích trang trí) bằng token thuộc bảng màu Forest Green hoặc Terracotta tương ứng ngữ cảnh.
4. IF một Primitive_Token được tham chiếu trực tiếp trong UI_Component hoặc Product_Page, THEN THE Design_System SHALL thay tham chiếu đó bằng Semantic_Token tương ứng.
5. WHERE giá trị trong chú thích tài liệu token khác với giá trị thực thi (ví dụ radius card ghi 14px nhưng giá trị là 18px), THE Design_System SHALL cập nhật chú thích khớp với giá trị thực thi.

### Requirement 3: Nâng cấp và thống nhất hệ typography

**User Story:** Là người dùng, tôi muốn chữ trên mọi trang có cùng thang bậc và dễ đọc, để nội dung rõ ràng và cân đối.

#### Acceptance Criteria

1. THE Design_System SHALL áp dụng một thang typography thống nhất (các bậc `--text-xs` đến `--text-display`) cho tiêu đề và nội dung trên toàn bộ Product_Page.
2. THE Design_System SHALL đặt line-height của văn bản nội dung (body) tối thiểu 1.45 để dấu tiếng Việt không chồng lấn.
3. WHERE một Product_Page hiển thị tiêu đề cấp trang, THE Product_Page SHALL dùng cùng một bậc typography cho tiêu đề cấp trang đó trên các Product_Page tương đương.
4. IF một UI_Component hoặc Product_Page đặt cỡ chữ, độ đậm hoặc line-height bằng giá trị hard-coded trùng với một bậc trong thang typography, THEN THE UI_Component SHALL dùng bậc typography tương ứng của Design_System.

### Requirement 4: Thống nhất nhịp khoảng cách và bo góc

**User Story:** Là người dùng, tôi muốn khoảng cách và bo góc giữa các phần tử đồng đều, để bố cục trông gọn gàng và có chủ đích.

#### Acceptance Criteria

1. THE Design_System SHALL áp dụng token spacing dùng chung (`--app-section-gap`, `--app-card-padding` và các token spacing hiện có) cho khoảng cách giữa các section và padding của card trên toàn bộ Product_Page.
2. THE Design_System SHALL áp dụng token bo góc dùng chung (`--app-radius-card`, `--app-radius-input`, `--app-radius-control`, `--app-radius-pill`) cho card, input, control và pill tương ứng.
3. WHERE hai UI_Component cùng loại xuất hiện trên các Product_Page khác nhau, THE UI_Component SHALL dùng cùng token padding và bo góc.
4. IF một UI_Component dùng giá trị spacing hoặc radius hard-coded trùng với một token dùng chung, THEN THE UI_Component SHALL dùng token tương ứng.

### Requirement 5: Nâng polish các component dùng chung

**User Story:** Là người dùng, tôi muốn các nút, thẻ, input và trạng thái tương tác trông chỉn chu và phản hồi rõ ràng, để thao tác cảm thấy chắc chắn.

#### Acceptance Criteria

1. THE UI_Component SHALL áp dụng token elevation/shadow dùng chung (`--app-shadow-sm` đến `--app-shadow-xl` hoặc `--shadow-1` đến `--shadow-5`) cho các mức độ nổi khối tương ứng.
2. WHEN con trỏ hover lên một UI_Component tương tác trên thiết bị hỗ trợ hover, THE UI_Component SHALL hiển thị trạng thái hover dùng token màu và token motion của Design_System.
3. WHEN một UI_Component tương tác nhận focus bằng bàn phím, THE UI_Component SHALL hiển thị focus ring dùng token focus ring của Design_System (`--app-focus-ring` cho execution, `--app-focus-ring-warm` cho Reflection_Context).
4. WHERE một UI_Component có trạng thái disabled, THE UI_Component SHALL dùng token màu disabled (`--app-ink-disabled`) để thể hiện trạng thái đó.
5. THE UI_Component SHALL giữ nguyên cấu trúc props và hành vi API hiện có của component trong quá trình nâng polish.

### Requirement 6: Cân bằng light mode và dark mode

**User Story:** Là người dùng, tôi muốn cả light mode và dark mode đều được nâng cấp đồng đều, để trải nghiệm nhất quán dù tôi chọn chế độ nào.

#### Acceptance Criteria

1. WHERE một Design_Token thị giác được định nghĩa cho light mode, THE Theme_Engine SHALL cung cấp giá trị tương ứng cho dark mode qua override trên phần tử gốc có class `dark`.
2. WHEN Theme_Engine chuyển giữa light mode và dark mode, THE Product_Page SHALL hiển thị màu nền, chữ, border và accent lấy từ Semantic_Token của chế độ hiện hành.
3. THE Design_System SHALL bảo đảm mọi nâng cấp thị giác áp dụng cho light mode đều có giá trị tương đương trong dark mode.
4. IF một UI_Component dùng màu hard-coded chỉ hiển thị đúng ở một chế độ, THEN THE UI_Component SHALL thay bằng Semantic_Token có override cho cả hai chế độ.

### Requirement 7: Đáp ứng tiêu chuẩn khả năng tiếp cận

**User Story:** Là người dùng dùng bàn phím hoặc nhạy cảm với chuyển động, tôi muốn giao diện nâng cấp vẫn tiếp cận được, để tôi sử dụng sản phẩm thoải mái.

#### Acceptance Criteria

1. THE Design_System SHALL bảo đảm Contrast_Ratio giữa văn bản nội dung và nền của văn bản đó tối thiểu 4.5:1 ở cả light mode và dark mode.
2. THE Design_System SHALL bảo đảm Contrast_Ratio của thành phần giao diện phi văn bản dùng để nhận biết (border control, icon trạng thái, focus ring) tối thiểu 3:1 so với nền liền kề.
3. WHEN một phần tử tương tác nhận focus bằng bàn phím, THE UI_Component SHALL hiển thị chỉ báo focus nhìn thấy được với Contrast_Ratio tối thiểu 3:1 so với nền.
4. WHILE Reduced_Motion đang bật, THE UI_Component SHALL giảm hoặc loại bỏ animation không thiết yếu.

### Requirement 8: Nâng cấp chuyển động và tương tác theo token motion

**User Story:** Là người dùng, tôi muốn chuyển động mượt và nhất quán trên các trang, để giao diện cảm thấy sống động nhưng không gây phân tâm.

#### Acceptance Criteria

1. THE UI_Component SHALL dùng token thời lượng (`--duration-*`) và token easing (`--ease-*`) của Design_System cho transition và animation.
2. THE Design_System SHALL giữ thời lượng của transition dùng chung trong dải 150ms đến 500ms.
3. WHEN một Product_Page được điều hướng vào, THE Product_Page SHALL áp dụng hiệu ứng chuyển trang dùng token motion của Design_System.
4. IF một UI_Component dùng giá trị thời lượng hoặc easing hard-coded trùng với một token motion dùng chung, THEN THE UI_Component SHALL dùng token motion tương ứng.

### Requirement 9: Bảo toàn hành vi Core (entitlement, route, auth, sync)

**User Story:** Là chủ sản phẩm, tôi muốn việc nâng cấp giao diện không phá vỡ nghiệp vụ đang chạy, để bản phát hành production vẫn an toàn.

#### Acceptance Criteria

1. THE global-ui-upgrade SHALL giữ nguyên hành vi entitlement và paywall hiện có thông qua các helper hiện tại (`usePlanEntitlements`, `UpgradePaywallDialog`).
2. THE global-ui-upgrade SHALL giữ nguyên tập route đăng ký và điều kiện hiển thị route theo App_Mode.
3. THE global-ui-upgrade SHALL giữ nguyên các luồng auth hiện có (signup, signin, sign-out, password reset, email verification).
4. THE global-ui-upgrade SHALL giữ nguyên schema và key localStorage hiện có, không đổi tên key hoặc thay đổi hình dạng dữ liệu đã lưu.
5. THE global-ui-upgrade SHALL giữ nguyên chỉ báo trạng thái sync (synced / syncing / offline / error) cho người dùng real-mode đã đăng nhập.

### Requirement 10: Tuân thủ quy tắc copy theo App_Mode

**User Story:** Là chủ sản phẩm, tôi muốn nâng cấp giao diện không làm rò rỉ copy demo vào real mode, để trải nghiệm production đúng chuẩn.

#### Acceptance Criteria

1. WHILE App_Mode là `real`, THE Product_Page SHALL không hiển thị copy chỉ dành cho demo (ví dụ "dùng thử", "trên trình duyệt này", "không thu tiền thật", "mock", "demo").
2. WHERE một route hoặc UI chỉ dành cho demo (`/billing/mock-checkout`, debug UI gated bởi `VITE_SHOW_BILLING_DEBUG` hoặc `VITE_SHOW_SYNC_DEBUG`), THE global-ui-upgrade SHALL giữ nguyên điều kiện gate hiện có, không đăng ký hoặc render chúng trong real mode.
3. WHERE một chuỗi copy được điều chỉnh trong quá trình polish, THE Product_Page SHALL giữ nhánh copy đúng theo `isRealMode()` / `isDemoMode()` như hiện có.

### Requirement 11: Xác minh nhất quán sau nâng cấp

**User Story:** Là nhà phát triển, tôi muốn kiểm chứng được rằng nâng cấp không gây hồi quy, để tự tin phát hành.

#### Acceptance Criteria

1. WHEN quá trình nâng cấp cho một bề mặt hoàn tất, THE global-ui-upgrade SHALL vượt qua các bước xác minh frontend hiện có (`npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`).
2. IF một bước xác minh thất bại do thay đổi nâng cấp, THEN THE global-ui-upgrade SHALL sửa nguyên nhân trước khi coi bề mặt đó là hoàn tất.
3. WHERE một bộ test hiện có kiểm tra contract layout hoặc trạng thái của một Product_Page (ví dụ reflection-layout-contract, empty-state-contract, a11y), THE global-ui-upgrade SHALL giữ cho các test đó tiếp tục vượt qua.
