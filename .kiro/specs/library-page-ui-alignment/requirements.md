# Requirements Document

## Introduction

Trang Thư viện (Vision Board Gallery, route `/gallery`, component `src/app/pages/VisionBoardGallery.tsx`, eyebrow "Thư viện Bản vẽ Tương lai") hiện có giao diện lệch khá nhiều so với hệ thống thiết kế chung của trang web. Cùng dùng `PageHero`, `Card`, `EmptyState`, `Button` như các trang khác, nhưng trang này bọc thêm nhiều lớp trang trí không thuộc design system: container gradient nhiều tầng, "aurora orbs" nền mờ `blur-[120px]`, mockup 3D (`Gallery3DHeroMockup`) với `perspective`/`translateZ`/`rotate`, hiệu ứng "tape", `InteractiveSurface` nghiêng 3D khi hover, `animate-pulse`, và nhiều hiệu ứng hover phóng to. Những yếu tố này phá vỡ phong cách "calm" (tĩnh, tối giản, nhất quán) mà `core-flow-ui-upgrade` đã chuẩn hoá: chỉ dùng typography/spacing/radius/color theo token `app-*`, không glow, không 3D transform, không motion kéo dài quá 300ms.

Tính năng này là công việc **Shell/UI polish** trên một **side surface** (vision board). Mục tiêu là căn chỉnh giao diện trang Thư viện cho đồng bộ với style toàn site, thông qua tái sử dụng đúng các component/pattern/token đã có, **mà không** thay đổi bất kỳ hành vi dữ liệu, storage shape, luồng đồng bộ (sync), điều kiện điều hướng, hay logic lọc/sắp xếp/thống kê nào của trang. Chỉ lớp trình bày (layout, spacing, typography, color token, motion, empty/loading state, khả năng truy cập) được phép thay đổi.

Phân loại theo Hybrid SDD/ADD: **Shell** — không chạm Core contract (Storage_Contract, Entitlement_Authority, sync semantics, route availability, `isRealMode()`/`isDemoMode()` branching đều giữ nguyên).

## Glossary

- **Library_Page**: Trang Thư viện Vision Board tại route `/gallery`, render bởi component `VisionBoardGallery`. Là "system" chịu trách nhiệm cho mọi acceptance criteria trong tài liệu này.
- **Design_System**: Bộ token và component dùng chung của trang web, gồm token màu/spacing/radius `app-*` (`app-surface`, `app-line`, `app-accent`, `app-ink`, `app-ink-soft`, `app-ink-muted`, `app-bg-subtle`, `shadow-app-sm/md/lg`, `rounded-card`, `--r-*`) định nghĩa trong `theme.css`/`tokens.css`, và các component layout dùng chung (`PageHero`, `PageHeader`, `Card`, `Button`, `Badge`, `EmptyState`, `Skeleton`).
- **Calm_Style**: Quy ước phong cách "tĩnh" đã chuẩn hoá tại spec `core-flow-ui-upgrade` (Requirement 10): chỉ dùng typography scale và spacing scale của Design_System; không hiệu ứng phát sáng (glow), không 3D transform, không motion vượt 300ms, không loop/autoplay.
- **Decorative_Layer**: Các phần tử trang trí hiện có trên Library_Page không thuộc Design_System, gồm: aurora orbs nền (`blur-[120px]`), container gradient nhiều tầng bọc toàn trang, mockup 3D `Gallery3DHeroMockup`, hiệu ứng "tape", `InteractiveSurface` nghiêng 3D, `animate-pulse`, và hover phóng to (`hover:scale-*`).
- **Standard_Page_Container**: Cấu trúc container trang chuẩn của Design_System dùng ở các trang khác (ví dụ `SettingsPage`, `OrderStatusPage`): `<div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">` (tùy chọn kèm `stack-section`), không có lớp gradient/orbs bọc ngoài.
- **PageHero**: Component hero chuẩn (`src/app/components/layout/PageHero.tsx`) cho trang sản phẩm thường, nhận `eyebrow`, `title`, `description`, `primaryCta`, `secondaryCta`, `aside`.
- **EmptyState**: Component trạng thái rỗng dùng chung (`src/app/components/states/EmptyState.tsx`).
- **Primary_CTA**: Nút hành động chính duy nhất, hiển thị nổi bật, được render bằng `<Button>` variant mặc định của Design_System.
- **Data_Behavior**: Toàn bộ hành vi phi-trình-bày của trang: đọc/ghi qua `getUserData`/`saveUserData`/`deleteVisionBoard`, hydrate backend (`backendGetVisionBoards`), xoá backend (`backendDeleteVisionBoard`), link store (`getBackendVisionBoardId`), logic lọc/tìm kiếm/sắp xếp/gom nhóm theo năm, và số liệu thống kê (stats).
- **Light_Mode / Dark_Mode**: Hai chế độ hiển thị màu của trang web, điều khiển qua biến thể `dark:` của token Design_System.
- **Contrast_Ratio**: Tỉ lệ tương phản màu giữa chữ và nền theo WCAG 2.1 (4.5:1 cho chữ thường, 3:1 cho chữ lớn và thành phần đồ hoạ).

## Requirements

### Requirement 1: Container trang đồng bộ với Design_System

**User Story:** Là người dùng, tôi muốn khung nền và bố cục tổng thể của trang Thư viện giống các trang khác, để trải nghiệm liền mạch khi chuyển giữa các trang.

#### Acceptance Criteria

1. THE Library_Page SHALL bọc toàn bộ nội dung trang trong đúng một Standard_Page_Container áp dụng đồng thời lớp căn giữa `mx-auto max-w-6xl` và lớp padding `px-4 pb-12 pt-8 sm:px-6 lg:px-8` theo Design_System, sao cho `max-width` phần nội dung căn giữa bằng đúng giá trị `max-w-6xl` giống các trang khác dùng Standard_Page_Container.
2. THE Library_Page SHALL không chứa lớp container gradient nhiều tầng bọc toàn trang, xác định bằng việc chuỗi lớp `bg-gradient-to-br from-app-bg`...`to-app-accent-subtle/30` xuất hiện 0 lần trong markup của trang.
3. THE Library_Page SHALL không chứa phần tử aurora orbs nền, xác định bằng việc lớp `blur-[120px]` xuất hiện 0 lần trong markup của trang.
4. THE Library_Page SHALL sử dụng token nền bề mặt của Design_System (`app-surface`, `app-bg-subtle`) cho mọi khối nội dung, và SHALL không dùng lớp `bg-gradient-*` tùy biến cho nền các khối nội dung (số lần xuất hiện của `bg-gradient-*` trên khối nội dung bằng 0).
5. WHERE một khối nội dung cần bo góc, THE Library_Page SHALL dùng đúng một radius token của Design_System thuộc tập (`rounded-card`, `rounded-card-lg`, `--r-*`), và SHALL không dùng giá trị radius tùy biến ngoài tập token này.
6. WHEN Library_Page được render trên viewport có chiều rộng ở mỗi mốc `< 640px`, `≥ 640px` (sm) và `≥ 1024px` (lg), THE Library_Page SHALL áp dụng đúng giá trị padding tương ứng của Standard_Page_Container (`px-4` khi `< 640px`, `sm:px-6` khi `≥ 640px`, `lg:px-8` khi `≥ 1024px`).

### Requirement 2: Hero tuân theo mẫu PageHero chuẩn

**User Story:** Là người dùng, tôi muốn phần đầu trang Thư viện trông giống hero của các trang khác, để nhận diện nhất quán bố cục tiêu đề và hành động.

#### Acceptance Criteria

1. THE Library_Page SHALL render phần hero bằng component PageHero của Design_System.
2. THE Library_Page SHALL giữ nội dung hero gồm eyebrow "Thư viện Bản vẽ Tương lai", tiêu đề, mô tả, một Primary_CTA "Tạo bảng mới", và một hành động phụ "Trang chủ".
3. THE Library_Page SHALL thay mockup 3D `Gallery3DHeroMockup` bằng một `aside` tĩnh tuân theo Calm_Style hoặc bỏ trống `aside`.
4. THE Library_Page SHALL loại bỏ hiệu ứng `perspective`, `translateZ`, `rotate` 3D và hiệu ứng "tape" trong phần hero.
5. WHERE hero cần nhấn mạnh một cụm chữ trong tiêu đề, THE Library_Page SHALL dùng màu chữ theo token Design_System thay cho gradient chữ tùy biến nhiều màu.

### Requirement 3: Áp dụng Calm_Style cho toàn trang

**User Story:** Là người dùng, tôi muốn trang Thư viện có cảm giác tĩnh và tối giản như phần còn lại của trang web, để không bị phân tán bởi hiệu ứng thừa.

#### Acceptance Criteria

1. WHEN Library_Page được tải, THE Library_Page SHALL hiển thị thẻ vision board bằng một `Card` tĩnh của Design_System và SHALL không áp dụng bất kỳ 3D transform nào (không nghiêng/xoay 3D), thay cho `InteractiveSurface` nghiêng 3D.
2. WHEN Library_Page được tải, THE Library_Page SHALL không hiển thị hiệu ứng phát sáng (glow) và lớp mờ trang trí (gồm `blur-[120px]` và orb phát sáng).
3. THE Library_Page SHALL giới hạn thời lượng của mọi transition và animation ở mức tối đa 300ms.
4. THE Library_Page SHALL không sử dụng hiệu ứng lặp vô hạn (gồm `animate-pulse` trên biểu tượng thống kê); mọi animation SHALL chạy tối đa 1 lần rồi dừng ở trạng thái tĩnh.
5. WHERE một phần tử cần phản hồi khi hover hoặc khi nhận focus bàn phím, THE Library_Page SHALL dùng thay đổi tĩnh theo token (đổi màu nền/viền hoặc `shadow-app-*`) và SHALL không dùng phóng to `hover:scale-*`.

### Requirement 4: Typography theo scale Design_System

**User Story:** Là người dùng, tôi muốn cỡ chữ, độ đậm và phân cấp tiêu đề trên trang Thư viện đồng nhất với các trang khác, để nội dung dễ đọc và quen thuộc.

#### Acceptance Criteria

1. THE Library_Page SHALL dùng cỡ chữ, độ đậm và line-height thuộc typography scale của Design_System cho mọi tiêu đề, mô tả và nhãn.
2. THE Library_Page SHALL dùng màu chữ theo token `app-ink`, `app-ink-soft`, `app-ink-muted` cho văn bản thay cho màu tùy biến ngoài token.
3. WHERE trang dùng kiểu chữ serif để tạo cảm xúc, THE Library_Page SHALL áp dụng nhất quán với quy ước serif của PageHero (`serif`) đã dùng ở các trang khác.
4. THE Library_Page SHALL duy trì đúng một phần tử tiêu đề cấp trang (heading cấp 1) trong hero, giữ cấu trúc heading hợp lệ cho phần còn lại.

### Requirement 5: Color token cho trạng thái và nhấn mạnh

**User Story:** Là người dùng, tôi muốn màu nhấn, màu trạng thái và badge trên trang Thư viện dùng đúng bảng màu của trang web, để tín hiệu màu nhất quán.

#### Acceptance Criteria

1. THE Library_Page SHALL dùng duy nhất các token màu nhấn thuộc tập {`app-accent`, `app-accent-soft`, `app-accent-subtle`, `app-accent-hover`} cho toàn bộ phần tử nhấn mạnh (Primary_CTA, trạng thái chọn/kích hoạt, liên kết nhấn, và badge nhấn mạnh), sao cho không có phần tử nhấn mạnh nào dùng giá trị màu (hex, rgb, hsl, hoặc named color) nằm ngoài tập token này.
2. THE Library_Page SHALL dùng token `app-status-success` cho chỉ báo đồng bộ thành công và token `app-status-error` cho chỉ báo lỗi cùng các phần tử của hành động xoá, sao cho không có chỉ báo trạng thái hoặc phần tử hành động xoá nào dùng giá trị màu nằm ngoài hai token trạng thái này.
3. WHERE biểu đồ phân bổ hoặc badge cần nhiều màu phân loại và Design_System có token tương ứng, THE Library_Page SHALL dùng token màu của Design_System cho từng hạng mục phân loại, sao cho không có hạng mục nào dùng giá trị màu nằm ngoài tập token của Design_System.
4. IF một hạng mục phân loại của biểu đồ hoặc badge cần màu nhưng Design_System không có token tương ứng, THEN THE Library_Page SHALL dùng token màu gần nhất hiện có của Design_System và SHALL không đưa vào giá trị màu tùy biến nằm ngoài tập token.
5. THE Library_Page SHALL dùng token viền `app-line` cho toàn bộ đường viền của các khối và thẻ, sao cho không có đường viền khối hoặc thẻ nào dùng giá trị màu viền nằm ngoài token `app-line`.

### Requirement 6: Tái sử dụng component dùng chung

**User Story:** Là người bảo trì, tôi muốn trang Thư viện dùng lại component dùng chung thay vì phần tử tự chế, để giao diện đồng bộ và dễ bảo trì.

#### Acceptance Criteria

1. THE Library_Page SHALL render thẻ vision board bằng component `Card`/`CardHeader`/`CardContent` của Design_System.
2. THE Library_Page SHALL render trạng thái rỗng (thư viện trống và không có kết quả lọc) bằng component EmptyState của Design_System.
3. THE Library_Page SHALL render các nút hành động bằng component `Button` của Design_System với `variant` phù hợp (Primary_CTA dùng variant mặc định, hành động phụ dùng `outline`/`ghost`).
4. THE Library_Page SHALL render các nhãn phân loại (năm, số phần tử, trạng thái đồng bộ) bằng component `Badge` của Design_System.
5. WHERE toolbar cần ô nhập tìm kiếm và bộ chọn, THE Library_Page SHALL dùng radius/viền/màu focus theo token Design_System (`--r-input`, `app-line`, `focus:ring-app-accent/*`).

### Requirement 7: Trạng thái tải (loading) đồng bộ

**User Story:** Là người dùng, tôi muốn trạng thái đang tải của trang Thư viện trông giống các trang khác, để cảm nhận nhất quán khi dữ liệu chưa sẵn sàng.

#### Acceptance Criteria

1. WHILE dữ liệu người dùng chưa sẵn sàng (chưa tải xong), THE Library_Page SHALL hiển thị skeleton dùng component `Skeleton` của Design_System, và SHALL hiển thị skeleton trong vòng 100ms kể từ thời điểm bắt đầu trạng thái chưa sẵn sàng.
2. THE Library_Page SHALL bố trí skeleton gồm các khối placeholder tương ứng một-một với các vùng nội dung chính của trang (hero, thống kê, lưới thẻ) theo Calm_Style, sao cho mỗi vùng nội dung chính có đúng một khối skeleton tương ứng.
3. THE Library_Page SHALL trình bày skeleton không dùng hiệu ứng phát sáng (glow), không dùng biến đổi 3D (perspective hoặc rotate theo trục 3D), không dùng hiệu ứng chuyển động có thời lượng vượt quá 300ms, và không dùng hiệu ứng lặp lại hoặc tự động phát liên tục.
4. WHEN dữ liệu người dùng sẵn sàng, THE Library_Page SHALL thay toàn bộ skeleton bằng nội dung thực trong vòng 1 giây, SHALL không giữ lại bất kỳ phần tử skeleton nào sau khi nội dung thực đã hiển thị, và SHALL không thay đổi Data_Behavior.
5. IF việc tải dữ liệu người dùng thất bại, THEN THE Library_Page SHALL thay skeleton bằng trạng thái lỗi kèm thông báo cho biết tải dữ liệu thất bại và một hành động thử lại, SHALL không tiếp tục hiển thị skeleton, và SHALL không thay đổi Data_Behavior.

### Requirement 8: Đồng nhất giữa Light_Mode và Dark_Mode

**User Story:** Là người dùng dùng chế độ tối, tôi muốn trang Thư viện hiển thị đúng và nhất quán ở cả hai chế độ màu, để đọc thoải mái trong mọi điều kiện.

#### Acceptance Criteria

1. WHILE ở Light_Mode, THE Library_Page SHALL hiển thị nền, chữ, viền và màu nhấn của mọi thành phần bằng token Design_System dành cho chế độ sáng, không dùng giá trị màu cố định nằm ngoài token.
2. WHILE ở Dark_Mode, THE Library_Page SHALL hiển thị nền, chữ, viền và màu nhấn của mọi thành phần bằng biến thể `dark:` của token Design_System, không dùng giá trị màu cố định nằm ngoài token.
3. THE Library_Page SHALL duy trì Contrast_Ratio tối thiểu 4.5:1 cho chữ thường và 3:1 cho chữ lớn (chữ có kích thước ≥ 18pt/24px, hoặc ≥ 14pt/18.66px khi in đậm) ở cả Light_Mode và Dark_Mode.
4. THE Library_Page SHALL duy trì Contrast_Ratio tối thiểu 3:1 giữa màu viền, màu nhấn và chỉ báo focus so với màu nền liền kề ở cả Light_Mode và Dark_Mode.
5. THE Library_Page SHALL tránh dùng màu nền hoặc màu chữ cố định không có biến thể chế độ tối (ví dụ `bg-white`, `text-white`) trừ khi màu đó đúng theo token trong cả hai chế độ.
6. WHEN người dùng chuyển đổi giữa Light_Mode và Dark_Mode, THE Library_Page SHALL cập nhật toàn bộ nền, chữ, viền và màu nhấn sang bộ token tương ứng trong vòng 400 ms mà không cần tải lại trang.
7. IF một thành phần đang hiển thị dùng token không có biến thể `dark:` khi ở Dark_Mode, THEN THE Library_Page SHALL áp dụng token nền/chữ mặc định của chế độ tối để bảo đảm ngưỡng Contrast_Ratio ở tiêu chí 3 và 4, đồng thời không giữ lại màu của chế độ sáng.

### Requirement 9: Khả năng truy cập (Accessibility)

**User Story:** Là người dùng dùng bàn phím hoặc trình đọc màn hình, tôi muốn thao tác trên trang Thư viện được như các trang khác, để không bị rào cản truy cập.

#### Acceptance Criteria

1. THE Library_Page SHALL cung cấp nhãn truy cập (văn bản hiển thị hoặc `aria-label`) cho mọi nút chỉ có biểu tượng (xem, chỉnh sửa, xoá).
2. WHEN người dùng dùng bàn phím để duyệt, THE Library_Page SHALL hiển thị vòng focus (focus ring) rõ ràng theo token focus của Design_System trên mọi phần tử tương tác.
3. THE Library_Page SHALL gắn nhãn cho ô nhập tìm kiếm và các bộ chọn (năm, sắp xếp) để trình đọc màn hình nhận diện đúng.
4. THE Library_Page SHALL giữ thứ tự focus trùng với thứ tự đọc trực quan mà không dùng `tabindex` dương.
5. WHERE có phần tử trang trí thuần tuý, THE Library_Page SHALL đánh dấu `aria-hidden` để trình đọc màn hình bỏ qua.

### Requirement 10: Bảo toàn hành vi dữ liệu và điều hướng

**User Story:** Là người dùng, tôi muốn việc căn chỉnh giao diện không làm thay đổi dữ liệu, đồng bộ hay điều hướng của trang Thư viện, để tính năng vẫn hoạt động y như trước.

#### Acceptance Criteria

1. THE Library_Page SHALL giữ nguyên Data_Behavior gồm đọc/ghi localStorage, hydrate backend, xoá board và link store mà không thay đổi tên khoá lưu trữ hay hình dạng dữ liệu.
2. THE Library_Page SHALL giữ nguyên logic tìm kiếm, lọc theo năm, sắp xếp và gom nhóm theo năm.
3. THE Library_Page SHALL giữ nguyên số liệu thống kê (tổng số bảng, số năm, tổng phần tử, phân bổ loại phần tử) và cách tính.
4. WHEN người dùng nhấn một hành động điều hướng, THE Library_Page SHALL điều hướng tới đúng route hiện có (`/vision-board`, `/vision-board/:id`, `/`) như trước khi căn chỉnh.
5. WHEN người dùng xác nhận xoá một board, THE Library_Page SHALL dùng component `AlertDialog` hiện có với xác nhận hai bước và giữ nguyên logic xoá cục bộ lẫn backend.
6. THE Library_Page SHALL giữ nguyên chỉ báo trạng thái đồng bộ (Cloud/CloudOff) theo tình trạng đăng nhập và link store hiện có, chỉ chuẩn hoá màu/icon theo token.

### Requirement 11: An toàn theo App_Mode

**User Story:** Là chủ sản phẩm, tôi muốn việc căn chỉnh giao diện không làm lộ nội dung demo trong real mode, để trang production giữ đúng ngôn ngữ dành cho người dùng thật.

#### Acceptance Criteria

1. WHILE App_Mode là real (`isRealMode()` trả về `true`), THE Library_Page SHALL không render bất kỳ chuỗi nào trong tập kiểm duyệt {"dùng thử", "không cần đăng nhập", "trên trình duyệt này", "không thu tiền thật", "mock", "demo"} (so khớp không phân biệt chữ hoa/thường) tại bất kỳ vị trí nào của giao diện hiển thị cho người dùng.
2. WHILE App_Mode là real, THE Library_Page SHALL giữ nguyên toàn bộ các nhánh hiển thị điều kiện dựa trên `isRealMode()`/`isDemoMode()` đã tồn tại trước thay đổi, không thêm, xóa hoặc đảo bất kỳ điều kiện hiển thị nào theo App_Mode.
3. IF không xác định được App_Mode (biến `VITE_APP_MODE` bị thiếu hoặc có giá trị không hợp lệ), THEN THE Library_Page SHALL xử lý như real mode và áp dụng quy tắc ẩn toàn bộ chuỗi demo ở tiêu chí 1.
4. WHERE App_Mode là demo (`isDemoMode()` trả về `true`), THE Library_Page SHALL được phép hiển thị các chuỗi demo trong tập kiểm duyệt mà không bị coi là vi phạm.

### Requirement 12: Kiểm chứng giao diện đã căn chỉnh

**User Story:** Là người bảo trì, tôi muốn thay đổi giao diện được kiểm chứng trước/sau, để chắc chắn đồng bộ style mà không phá vỡ chức năng.

#### Acceptance Criteria

1. THE Library_Page SHALL vượt qua chuỗi kiểm chứng frontend `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`.
2. THE Library_Page SHALL được chụp ảnh so sánh trước/sau ở khung nhìn Desktop 1440x900 và Mobile 390x844.
3. WHILE hiển thị ở khung nhìn 320–767px, THE Library_Page SHALL không tạo cuộn ngang (`scrollWidth` không vượt `clientWidth`).
4. THE Library_Page SHALL giữ vùng chạm của Primary_CTA tối thiểu 44x44 CSS px trên thiết bị di động.
