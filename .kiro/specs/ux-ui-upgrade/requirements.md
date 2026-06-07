# Requirements Document

## Introduction

Tài liệu này mô tả yêu cầu cho đợt nâng cấp giao diện UX/UI của Vision Board Web Platform. Đợt nâng cấp tập trung vào việc **làm mới giao diện ở mức design token** (visual refresh) trong khi vẫn bảo toàn kiến trúc và tên token hiện có.

Phạm vi đánh giá và kiểm thử kỹ tập trung vào **luồng cốt lõi (core flow) và Dashboard**:

```
Onboarding -> Life Balance -> Life Insight -> SMART Goal -> Feasibility Check -> 12-Week Plan -> Weekly Execution -> Reflection/Review -> Dashboard
```

Quyết định phạm vi đã được người dùng xác nhận:

- Hướng nâng cấp: **Làm mới giao diện (visual refresh)**.
- Định hướng brand: **Tinh chỉnh GIÁ TRỊ token, GIỮ NGUYÊN tên token** (không đổi tên token, không đổi cấu trúc 3 lớp).
- Phạm vi đánh giá: **Core flow + Dashboard**.

Đây là đợt nâng cấp giao diện, không thay đổi business logic, không đổi luồng dữ liệu, không đổi storage shape, không thêm/bớt tính năng sản phẩm. Mọi thay đổi phải an toàn với chế độ real-mode sản xuất và không làm rò rỉ ngôn từ demo-only.

## Glossary

- **Design_System**: Hệ thống design token 3 lớp (Primitive → Semantic → Component) định nghĩa trong `src/styles/tokens.css` và bridge sang Tailwind tại `tailwind.config.js`.
- **Token_Name**: Định danh của một design token (ví dụ `--app-accent`, `--app-ink`, `--app-radius-card`, `--app-shadow-md`). Bao gồm cả Semantic token và Component token.
- **Token_Value**: Giá trị thực tế gán cho một token (mã màu, độ dài, định nghĩa shadow).
- **Primitive_Token**: Token lớp 1 chứa nguồn gốc giá trị (ví dụ `--green-700`, `--terra-600`, `--neutral-050`).
- **Semantic_Token**: Token lớp 2 dùng trong component (ví dụ `--app-accent`, `--app-bg`, `--app-ink`).
- **Component_Token**: Token lớp 3 cho pattern tái sử dụng (ví dụ `--btn-primary-bg`, `--card-bg`).
- **Core_Flow_Screen**: Một trong các màn hình thuộc luồng cốt lõi và Dashboard: Onboarding, Life Balance, Life Insight, SMART Goal Setup, Feasibility Check, 12-Week Setup/System, Weekly Execution (Today/Goal Tracker), Reflection Journal, Dashboard.
- **Execution_Context**: Nhóm màn hình hành động/tiến độ dùng token accent (forest green).
- **Reflection_Context**: Nhóm màn hình Reflection/Review dùng token warm (terracotta) theo quy tắc riêng.
- **Sync_State**: Trạng thái đồng bộ hiển thị cho người dùng đã đăng nhập ở real-mode: `synced`, `syncing`, `offline`, `error`.
- **Contrast_Ratio**: Tỉ lệ tương phản màu theo công thức WCAG 2.1.
- **Reduced_Motion**: Tùy chọn hệ điều hành `prefers-reduced-motion: reduce`.
- **Theme_Mode**: Chế độ hiển thị Light hoặc Dark (`html.dark`).
- **Touch_Target**: Vùng chạm tương tác của một control trên thiết bị cảm ứng.

## Requirements

### Requirement 1: Bảo toàn tên và cấu trúc token khi tinh chỉnh giá trị

**User Story:** Là một developer bảo trì hệ thống, tôi muốn đợt refresh chỉ thay đổi giá trị token chứ không đổi tên token, để các component hiện có không bị hỏng và không phải sửa lại từng màn hình.

#### Acceptance Criteria

1. THE Design_System SHALL giữ nguyên 100% Token_Name của mọi Semantic_Token và Component_Token tồn tại tại thời điểm bắt đầu đợt nâng cấp, sao cho tập hợp Token_Name sau đợt nâng cấp là siêu tập (superset) của tập hợp Token_Name trước đợt nâng cấp.
2. WHERE một Token_Value được tinh chỉnh, THE Design_System SHALL chỉ thay đổi giá trị của token đó mà KHÔNG xóa và KHÔNG đổi Token_Name tương ứng.
3. THE Design_System SHALL duy trì kiến trúc 3 lớp theo đúng thứ tự tham chiếu Primitive → Semantic → Component, trong đó Semantic_Token chỉ tham chiếu Primitive_Token hoặc Semantic_Token khác, và Component_Token chỉ tham chiếu Semantic_Token hoặc Primitive_Token.
4. THE Design_System SHALL duy trì bridge từ CSS variable sang Tailwind utility trong `tailwind.config.js` cho 100% Token_Name được giữ lại sau đợt nâng cấp.
5. IF một component tham chiếu tới một Token_Name tồn tại trước đợt nâng cấp, THEN THE Design_System SHALL phân giải Token_Name đó thành một Token_Value khác rỗng (non-empty) và hợp lệ theo đúng kiểu giá trị (màu sắc, kích thước, khoảng cách, v.v.) mà Token_Name đó khai báo.
6. IF một Token_Name tồn tại trước đợt nâng cấp bị thiếu, bị xóa hoặc không phân giải được thành Token_Value hợp lệ sau đợt nâng cấp, THEN THE Design_System SHALL coi đợt nâng cấp là thất bại và báo lỗi chỉ ra Token_Name bị ảnh hưởng, đồng thời không ghi đè cấu hình token đang hoạt động trước đó.

### Requirement 2: Làm mới giao diện nhất quán trên core flow và Dashboard

**User Story:** Là người dùng cuối, tôi muốn giao diện trông hiện đại và nhất quán xuyên suốt luồng cốt lõi, để trải nghiệm liền mạch và đáng tin cậy.

#### Acceptance Criteria

1. THE Core_Flow_Screen SHALL hiển thị màu nền, màu chữ, bo góc và đổ bóng cho 100% phần tử giao diện bằng Semantic_Token hoặc Component_Token, không sử dụng bất kỳ giá trị màu hard-coded nào.
2. WHEN người dùng điều hướng giữa hai Core_Flow_Screen bất kỳ, THE Design_System SHALL áp dụng cùng một Token_Value (giống hệt nhau, sai khác 0) cho cùng một loại phần tử giao diện.
3. THE Execution_Context SHALL sử dụng nhóm token accent cho phần tử hành động và tiến độ.
4. THE Reflection_Context SHALL sử dụng nhóm token warm cho phần tử hành động và tiến độ.
5. IF một component thuộc Execution_Context, THEN THE component SHALL KHÔNG sử dụng token warm.
6. IF một component thuộc Reflection_Context, THEN THE component SHALL KHÔNG sử dụng token accent.
7. THE Core_Flow_Screen SHALL giữ nguyên 100% nội dung văn bản, nhãn, và thứ tự các bước của luồng cốt lõi sau đợt nâng cấp so với trước đợt nâng cấp.
8. IF một phần tử giao diện tham chiếu tới Semantic_Token hoặc Component_Token không tồn tại hoặc không phân giải được, THEN THE Design_System SHALL áp dụng giá trị token mặc định đã định nghĩa và giữ phần tử ở trạng thái hiển thị được (không để trống màu nền/màu chữ).

### Requirement 3: Giữ độ tương phản đạt chuẩn truy cập

**User Story:** Là người dùng có thị lực hạn chế, tôi muốn văn bản và thành phần giao diện đủ tương phản, để đọc và thao tác được trong cả Light và Dark mode.

#### Acceptance Criteria

1. THE Design_System SHALL bảo đảm Contrast_Ratio giữa văn bản thường (dưới 18.66px đậm và dưới 24px thường) và nền hiệu dụng liền kề (màu nền sau khi tổng hợp mọi lớp overlay/gradient phía sau) tối thiểu 4.5:1 trên mọi Core_Flow_Screen.
2. THE Design_System SHALL bảo đảm Contrast_Ratio giữa văn bản lớn (từ 18.66px đậm hoặc 24px thường trở lên) và nền hiệu dụng liền kề tối thiểu 3:1 trên mọi Core_Flow_Screen.
3. THE Design_System SHALL bảo đảm Contrast_Ratio cho viền và biểu tượng chức năng của control (phần tử cần thiết để hiểu hoặc thao tác control, không tính phần tử trang trí thuần túy) tối thiểu 3:1 so với nền hiệu dụng liền kề.
4. WHILE Theme_Mode là Dark, THE Design_System SHALL đáp ứng các ngưỡng Contrast_Ratio tại tiêu chí 1, 2 và 3.
5. WHILE Theme_Mode là Light, THE Design_System SHALL đáp ứng các ngưỡng Contrast_Ratio tại tiêu chí 1, 2 và 3.
6. WHEN một phần tử tương tác trên Core_Flow_Screen chuyển sang trạng thái hover, active hoặc selected, THE Design_System SHALL tiếp tục đáp ứng các ngưỡng Contrast_Ratio áp dụng tại tiêu chí 1, 2 và 3 cho phần tử đó.
7. WHERE một control ở trạng thái disabled, THE Design_System SHALL được miễn các ngưỡng Contrast_Ratio tại tiêu chí 1, 2 và 3 cho control đó.
8. WHILE một trường nhập liệu hiển thị placeholder text, THE Design_System SHALL bảo đảm Contrast_Ratio giữa placeholder và nền hiệu dụng liền kề tối thiểu 4.5:1.

### Requirement 4: Trạng thái focus và thao tác bàn phím rõ ràng

**User Story:** Là người dùng dùng bàn phím, tôi muốn thấy rõ phần tử đang focus, để biết mình đang thao tác ở đâu.

#### Acceptance Criteria

1. WHEN một phần tử tương tác nhận focus bàn phím, THE Core_Flow_Screen SHALL hiển thị chỉ báo focus nhìn thấy được bằng token focus ring trong vòng 100ms, với độ dày đường viền tối thiểu 2 CSS pixel bao quanh phần tử.
2. THE Core_Flow_Screen SHALL bảo đảm chỉ báo focus có Contrast_Ratio tối thiểu 3:1 so với nền liền kề.
3. WHILE chỉ báo focus đang hiển thị, THE Core_Flow_Screen SHALL bảo đảm chỉ báo focus không bị phần tử khác che khuất và hiển thị đầy đủ trong vùng nhìn thấy (viewport), không bị cắt xén.
4. THE Reflection_Context SHALL dùng token focus ring warm cho chỉ báo focus, đồng thời duy trì Contrast_Ratio tối thiểu 3:1 so với nền liền kề.
5. WHEN người dùng dùng phím Tab để di chuyển qua các phần tử tương tác của một Core_Flow_Screen, THE Core_Flow_Screen SHALL điều hướng focus tới phần tử tương tác kế tiếp theo thứ tự đọc của bố cục (trái sang phải, trên xuống dưới).
6. WHEN người dùng dùng tổ hợp Shift+Tab trong một Core_Flow_Screen, THE Core_Flow_Screen SHALL điều hướng focus tới phần tử tương tác liền trước theo thứ tự đọc của bố cục.
7. WHEN focus bàn phím rời khỏi một phần tử tương tác, THE Core_Flow_Screen SHALL gỡ chỉ báo focus khỏi phần tử đó trong vòng 100ms.

### Requirement 5: Tôn trọng tùy chọn giảm chuyển động

**User Story:** Là người dùng nhạy cảm với chuyển động, tôi muốn ứng dụng giảm hiệu ứng động khi tôi bật tùy chọn này, để tránh khó chịu.

#### Acceptance Criteria

1. WHILE Reduced_Motion được bật, THE Core_Flow_Screen SHALL vô hiệu hóa mọi hiệu ứng chuyển động không thiết yếu (animation trang trí, hiệu ứng chuyển cảnh, parallax, auto-scroll) sao cho không có phần tử nào có chuyển động kéo dài quá 0 mili-giây ngoài thay đổi opacity tức thời.
2. WHILE Reduced_Motion được bật, THE Core_Flow_Screen SHALL giới hạn mọi hiệu ứng chuyển động thiết yếu còn lại (chỉ báo tiến trình, phản hồi trạng thái loading) ở thời lượng tối đa 200 mili-giây.
3. WHILE Reduced_Motion được bật, THE Core_Flow_Screen SHALL giữ cho 100% nội dung và control vẫn hiển thị, truy cập được qua bàn phím và thao tác được, không phụ thuộc vào việc hiệu ứng động đã bị loại bỏ hay giảm.
4. WHEN Reduced_Motion không được bật, THE Core_Flow_Screen SHALL hiển thị đầy đủ hiệu ứng chuyển động theo thiết kế đã refresh với thời lượng mỗi hiệu ứng nằm trong khoảng 150 đến 500 mili-giây.
5. WHEN trạng thái Reduced_Motion thay đổi (bật hoặc tắt) trong lúc Core_Flow_Screen đang hiển thị, THE Core_Flow_Screen SHALL áp dụng cấu hình chuyển động tương ứng trong vòng tối đa 500 mili-giây mà không cần tải lại trang.

### Requirement 6: Bố cục responsive trên di động và desktop

**User Story:** Là người dùng trên điện thoại, tôi muốn các màn hình hiển thị gọn gàng và bấm được, để dùng ứng dụng thoải mái trên màn hình nhỏ.

#### Acceptance Criteria

1. WHILE chiều rộng khung nhìn từ 360px đến 767px, THE Core_Flow_Screen SHALL hiển thị toàn bộ nội dung trong giới hạn chiều rộng khung nhìn với độ cuộn ngang theo trục x bằng 0px (không xuất hiện thanh cuộn ngang).
2. WHILE chiều rộng khung nhìn từ 768px trở lên, THE Core_Flow_Screen SHALL hiển thị bố cục dùng token spacing dành cho desktop.
3. WHILE chiều rộng khung nhìn dưới 768px, THE Core_Flow_Screen SHALL áp dụng token padding card dành cho mobile.
4. THE Core_Flow_Screen SHALL bảo đảm mỗi Touch_Target (mọi phần tử tương tác được như button, liên kết, ô nhập liệu và control) có kích thước hiển thị tối thiểu 44px theo cả chiều rộng và chiều cao trên khung nhìn cảm ứng.
5. THE Core_Flow_Screen SHALL bảo đảm khoảng cách cạnh-đến-cạnh giữa hai Touch_Target liền kề tối thiểu 8px để tránh chạm nhầm.
6. WHEN chiều rộng khung nhìn nhỏ hơn 360px, THE Core_Flow_Screen SHALL giữ nguyên bố cục của ngưỡng 360px và cho phép cuộn ngang trong phạm vi vùng nội dung mà không cắt mất Touch_Target.

### Requirement 7: Trạng thái tải, rỗng và lỗi nhất quán

**User Story:** Là người dùng cuối, tôi muốn biết khi nào dữ liệu đang tải, khi nào chưa có dữ liệu, và khi nào có lỗi, để không bị bối rối với màn hình trống.

#### Acceptance Criteria

1. WHILE một Core_Flow_Screen đang tải dữ liệu, THE Core_Flow_Screen SHALL hiển thị chỉ báo tải dùng component trạng thái tải dùng chung trong vòng 300ms kể từ khi bắt đầu tải và SHALL KHÔNG hiển thị đồng thời nội dung dữ liệu thật.
2. WHEN một Core_Flow_Screen hoàn tất tải dữ liệu thành công nhưng không có bản ghi nào để hiển thị, THE Core_Flow_Screen SHALL hiển thị trạng thái rỗng dùng component empty-state dùng chung.
3. IF việc tải dữ liệu của một Core_Flow_Screen thất bại, THEN THE Core_Flow_Screen SHALL hiển thị thông báo lỗi nhìn thấy được cho biết việc tải đã thất bại kèm một control thử lại, đồng thời giữ nguyên dữ liệu người dùng cục bộ đã có (không xóa, không reset).
4. THE Core_Flow_Screen SHALL trình bày trạng thái tải, rỗng và lỗi bằng cùng một bộ Token_Value cho cùng loại trạng thái.
5. WHEN người dùng kích hoạt control thử lại ở trạng thái lỗi, THE Core_Flow_Screen SHALL khởi động lại việc tải dữ liệu và chuyển về trạng thái tải.
6. IF việc tải dữ liệu của một Core_Flow_Screen không hoàn tất trong vòng 30 giây, THEN THE Core_Flow_Screen SHALL coi như tải thất bại và hiển thị trạng thái lỗi kèm hành động thử lại.
7. THE Core_Flow_Screen SHALL hiển thị tối đa một trong các trạng thái tải, rỗng, lỗi hoặc nội dung dữ liệu tại bất kỳ thời điểm nào.

### Requirement 8: Hiển thị trạng thái đồng bộ cho người dùng real-mode

**User Story:** Là người dùng đã đăng nhập ở real-mode, tôi muốn thấy trạng thái đồng bộ, để biết dữ liệu của mình đã an toàn trên máy chủ hay chưa.

#### Acceptance Criteria

1. WHILE người dùng đã đăng nhập ở real-mode, THE Core_Flow_Screen SHALL hiển thị Sync_State ở vị trí cố định, hiển thị liên tục (không tự ẩn) và phản ánh một trong các giá trị `synced`, `syncing`, `offline`, `error`.
2. WHEN Sync_State chuyển đổi giữa các giá trị `synced`, `syncing`, `offline`, `error`, THE Core_Flow_Screen SHALL cập nhật chỉ báo trạng thái tương ứng trong vòng tối đa 1 giây kể từ thời điểm Sync_State thay đổi.
3. THE Design_System SHALL ánh xạ mỗi giá trị Sync_State (`synced`, `syncing`, `offline`, `error`) sang đúng một token status riêng biệt, sao cho bốn giá trị này tương ứng với bốn token màu khác nhau, không trùng lặp.
4. IF Sync_State chuyển sang `error`, THEN THE Core_Flow_Screen SHALL hiển thị chỉ báo trạng thái lỗi kèm thông tin cho biết lần đồng bộ gần nhất chưa hoàn tất, đồng thời giữ nguyên dữ liệu cục bộ của người dùng (không xóa, không ghi đè).
5. WHILE Sync_State có giá trị `offline`, THE Core_Flow_Screen SHALL hiển thị chỉ báo cho biết dữ liệu chưa được xác nhận lưu trên máy chủ và vẫn cho phép người dùng tiếp tục thao tác trên dữ liệu cục bộ.

### Requirement 9: Bảo toàn an toàn real-mode và ngôn từ sản phẩm

**User Story:** Là chủ sản phẩm, tôi muốn đợt refresh giao diện không làm rò rỉ ngôn từ demo vào bản real-mode, để bản sản xuất giữ được sự chuyên nghiệp.

#### Acceptance Criteria

1. WHILE ứng dụng chạy ở real-mode, THE Core_Flow_Screen SHALL KHÔNG hiển thị bất kỳ cụm từ demo-only nào thuộc tập đã kiểm duyệt gồm "dùng thử", "không thu tiền thật", "mock", "demo", "trên trình duyệt này", "không cần đăng nhập", "bản dùng thử trên trình duyệt".
2. THE Core_Flow_Screen SHALL giữ nguyên hành vi phân nhánh theo `isRealMode()` và `isDemoMode()` như baseline được chụp ngay trước đợt nâng cấp.
3. WHEN một hành động phá hủy dữ liệu được kích hoạt từ một Core_Flow_Screen, THE Core_Flow_Screen SHALL hiển thị component `AlertDialog` trong ứng dụng kèm hai lựa chọn rõ ràng là xác nhận và hủy, thay vì dùng `window.confirm`.
4. WHEN người dùng chọn hủy hoặc đóng `AlertDialog` của một hành động phá hủy dữ liệu, THE Core_Flow_Screen SHALL không thực hiện hành động đó và giữ nguyên dữ liệu hiện có.
5. WHERE một hành động phá hủy dữ liệu là không thể hoàn tác, THE AlertDialog SHALL yêu cầu người dùng xác nhận qua hai bước trước khi thực hiện hành động.
6. WHILE ứng dụng chạy ở real-mode, THE Core_Flow_Screen SHALL KHÔNG đăng ký hoặc hiển thị các màn hình/route chỉ dành cho demo.

### Requirement 10: Không hồi quy chức năng và dữ liệu

**User Story:** Là developer, tôi muốn đợt refresh chỉ chạm tới lớp trình bày, để không thay đổi logic, dữ liệu hay luồng sản phẩm.

#### Acceptance Criteria

1. THE codebase SHALL giữ nguyên 100% tên các storage key đã tồn tại trước đợt nâng cấp, không thêm, đổi tên hoặc xóa bất kỳ key nào.
2. THE codebase SHALL giữ nguyên shape (cấu trúc trường, kiểu dữ liệu, số lượng trường) của mọi dữ liệu lưu trữ cục bộ so với trước đợt nâng cấp.
3. THE codebase SHALL bảo toàn toàn bộ dữ liệu người dùng cục bộ hiện có, không xóa hoặc ghi đè bất kỳ bản ghi nào của người dùng trong quá trình nâng cấp.
4. THE Core_Flow_Screen SHALL giữ nguyên đầy đủ tập route của luồng cốt lõi (Onboarding, Life Balance, Life Insight, SMART Goal, Feasibility Check, 12-Week Plan, Weekly Execution, Reflection/Review) sau đợt nâng cấp, không thêm hoặc bớt route.
5. THE Core_Flow_Screen SHALL giữ nguyên thứ tự điều hướng giữa các route của luồng cốt lõi đúng như trình tự đã định nghĩa trước đợt nâng cấp.
6. WHEN bộ kiểm thử frontend hiện có được chạy bằng `npm run test:run` sau đợt nâng cấp, THE codebase SHALL vượt qua 100% các bài kiểm thử về hành vi và truy cập của luồng cốt lõi đã tồn tại trước đó, với số bài thất bại bằng 0.
7. IF bất kỳ bài kiểm thử nào trong bộ kiểm thử frontend hiện có thất bại sau đợt nâng cấp, THEN THE codebase SHALL được coi là không đạt tiêu chí không hồi quy cho tới khi mọi bài kiểm thử thất bại được khắc phục về trạng thái pass.
8. WHEN `npm run typecheck` được chạy sau đợt nâng cấp, THE codebase SHALL hoàn tất với mã thoát 0 và không phát sinh lỗi kiểu mới.
9. WHEN `npm run lint` được chạy sau đợt nâng cấp, THE codebase SHALL hoàn tất với mã thoát 0 và không phát sinh lỗi lint mới.
10. WHEN `npm run build` được chạy sau đợt nâng cấp, THE codebase SHALL hoàn tất với mã thoát 0 và tạo ra artifact build thành công.
