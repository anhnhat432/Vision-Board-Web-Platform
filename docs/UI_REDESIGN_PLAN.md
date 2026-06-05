# Kế Hoạch Tái Thiết Kế Giao Diện Người Dùng (UI/UX Redesign Plan)
## Dear Our Future — Dreamy Guided Productivity

Tài liệu này là bản kiểm toán chi tiết và kế hoạch tái thiết kế giao diện (UI/UX) cho các màn hình cốt lõi của **Dear Our Future**, tuân thủ nghiêm ngặt định hướng thẩm mỹ **Dreamy Guided Productivity** (Năng suất Hướng dẫn Mộng mơ) được định nghĩa trong [DESIGN.md](file:///c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/docs/DESIGN.md).

---

## 1. Design Overview (Tổng Quan Thiết Kế)

**Dear Our Future** không phải là một dashboard năng suất thông thường. Nó là một **Dreamy Guided Self-Discovery Studio** giúp người dùng (đặc biệt là thế hệ Gen Z) chuyển hóa những ước mơ mơ hồ thành một bảng tầm nhìn trực quan sinh động, các mục tiêu SMART thực tế, kế hoạch hành động 12 tuần cụ thể và nhịp điệu phản tư hằng tuần.

### Hướng Thiết Kế "Dreamy Guided Productivity"
*   **Thẩm mỹ mộng mơ (Dreamy)**: Đưa các yếu tố mô phỏng vật lý thân thiện vào giao diện (polaroid viền trắng, đinh ghim, băng keo giấy Washi, giấy rách có vân, sticker vẽ tay). Sử dụng bảng màu ấm áp, dịu nhẹ (nền kem, off-white, xanh rừng, màu sage, terracotta).
*   **Sự hướng dẫn (Guided)**: Loại bỏ các giao diện bảng tính khô khan. Giảm tải nhận thức tối đa. Luôn có ví dụ trực quan đi kèm và phân rã các bước rõ ràng.
*   **Tính năng suất (Productivity)**: Đảm bảo đầu ra cuối cùng của người dùng là thực tế và hành động được, thay vì chỉ dừng lại ở việc mơ ước hoặc phân tích suông.

---

## 2. Route-by-Route Audit (Kiểm Toán Chi Tiết Từng Route)

Dưới đây là phần kiểm toán chi tiết của 12 màn hình người dùng chính:

### 1. `/onboarding` (Thiết lập Bánh xe Cuộc đời)

*   **Screen role in the product journey**:
    *   *Vị trí*: Màn hình đầu tiên khi người dùng bắt đầu hành trình.
    *   *Trước đó*: Trang chủ/Giới thiệu sản phẩm.
    *   *Sau đó*: `/life-insight` (Xem báo cáo cá nhân).
*   **Main user job**:
    *   Người dùng tự chấm điểm từ 0 đến 10 cho 8 khía cạnh cuộc sống hiện tại dựa trên cảm nhận trực quan để xem cuộc sống của mình đang tròn hay lệch.
    *   Hành động quan trọng nhất: Di chuyển thanh trượt đánh giá cho từng khía cạnh và xem hình dạng bánh xe thay đổi.
*   **Current primary CTA**:
    *   Màn hình chào mừng: `"Tập thở & Bắt đầu"` (chuyển sang tập thở) hoặc `"Bắt đầu nhanh"` (vào thẳng đánh giá).
    *   Màn hình đánh giá: `"Khám phá Góc nhìn cuộc sống →"` khi đã rà soát đủ 8 lĩnh vực, hoặc `"Để sau"` (hoàn thành sớm với điểm số mặc định).
    *   CTA mang tính hướng kết quả tốt (Revealing/Exploration).
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Chưa đạt tối đa. Danh sách card dọc trượt điểm cho 8 khía cạnh tạo cảm giác giống làm một bài khảo sát hành chính khô khan.
    *   *Text-heavy/Dashboard-like*: Text giải thích cho từng khía cạnh khá nhiều và các card xếp chồng gây rối rắm.
    *   *Visual Anchor*: Biểu đồ Radar Chart ở bên phải (Desktop) rất ý nghĩa nhưng bị ẩn đi dưới cùng trên di động.
    *   *Mobile-friendly*: Chưa tối ưu. Việc cuộn một danh sách 8 khối có slider trên điện thoại dễ gây chạm nhầm thanh trượt khi cuộn trang.
    *   *3 Câu hỏi cốt lõi*: Chưa làm nổi bật câu hỏi *"Tại sao việc này quan trọng?"* (Đánh giá bánh xe giúp chọn đúng tiêu điểm hành động tiếp theo, không phải để phán xét).
*   **Recommended redesign direction**:
    *   *Layout*: Chuyển danh sách trượt dọc thành giao diện **Tương tác trực tiếp trên biểu đồ** (Interactive Radar Chart). Người dùng chạm/kéo các điểm trên Radar Chart để đổi điểm số.
    *   *Visual*: Tạo hiệu ứng động co giãn mượt mà khi đổi điểm. Trên mobile, hiển thị dạng Swipe Card lướt qua từng khía cạnh một cách ngẫu hứng thay vì list dài.
    *   *Copy*: Viết lại các mô tả khía cạnh ngắn gọn hơn (dưới 15 từ).
    *   *Mobile*: Tăng kích thước khu vực kéo thả để ngón tay dễ thao tác và không chạm nhầm khi cuộn màn hình.
*   **Risk level**: Trung bình (Medium) - Ảnh hưởng đến logic đồng bộ và lưu trữ bản nháp `onboarding_draft` trong localStorage.
*   **Suggested batch**: Batch 1.

---

### 2. `/life-insight` (Góc nhìn cuộc sống & Chọn trọng tâm)

*   **Screen role in the product journey**:
    *   *Vị trí*: Màn hình phân tích kết quả đánh giá bánh xe cuộc đời.
    *   *Trước đó*: `/onboarding`.
    *   *Sau đó*: `/smart-goal-setup` (Biến trọng tâm thành mục tiêu SMART).
*   **Main user job**:
    *   Xem phân tích khía cạnh mỏng nhất/mạnh nhất, hiểu ý nghĩa và chọn duy nhất 1 khía cạnh làm tiêu điểm (Focus Area) kèm mục đích chính (User Intent).
    *   Hành động quan trọng nhất: Lựa chọn khía cạnh tiêu điểm và chọn 1 định hướng mục đích (Intent).
*   **Current primary CTA**:
    *   `"Tiếp → Viết mục tiêu"` với biểu tượng mũi tên dịch chuyển. CTA rõ nghĩa hướng kết quả.
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Layout phân chia cột với biểu đồ Radar khá kỹ thuật, giống một bảng báo cáo dữ liệu công ty hơn là góc làm việc mộng mơ cá nhân.
    *   *Text-heavy/Dashboard-like*: Phần "Báo cáo góc nhìn cá nhân" trang trí bằng clip kẹp giấy giả lập khá xinh nhưng phần text còn dày, font sans-serif khô khốc.
    *   *Visual Anchor*: Radar chart hiển thị tốt nhưng các card chọn Intent xếp dọc quá dài chiếm dụng diện tích hiển thị.
    *   *3 Câu hỏi cốt lõi*: Trả lời tốt câu 1 và 3, nhưng câu 2 (*"Tại sao chọn khía cạnh này?"*) cần được làm giàu cảm xúc hơn thay vì chỉ hiển thị một câu quote tĩnh.
*   **Recommended redesign direction**:
    *   *Layout*: Tái thiết kế báo cáo cá nhân thành một trang sổ lưu niệm viết tay (scrapbook style).
    *   *Visual*: Khía cạnh được chọn làm tiêu điểm sẽ được chiếu sáng bởi một "Lồng đèn tiêu điểm" (Focus Lantern) phát sáng dịu nhẹ (soft glow animation).
    *   *CTA/Copy*: Rút gọn danh sách User Intent thành một lưới grid 2x4 hoặc carousel lướt ngang tinh tế. Sử dụng phông chữ Serif mềm mại cho tiêu đề báo cáo cá nhân.
    *   *Mobile*: Gom cụm biểu đồ và phần chọn trọng tâm lại để tránh cuộn trang quá nhiều trên điện thoại.
*   **Risk level**: Trung bình (Medium) - Cần đảm bảo truyền chính xác giá trị `selectedFocusArea` và `userIntent` sang các trang tiếp theo.
*   **Suggested batch**: Batch 1.

---

### 3. `/smart-goal-setup` (Trình dựng mục tiêu SMART)

*   **Screen role in the product journey**:
    *   *Vị trí*: Bước thiết lập mục tiêu chi tiết.
    *   *Trước đó*: `/life-insight` (Đã chọn trọng tâm).
    *   *Sau đó*: `/feasibility` (Kiểm tra độ khả thi của mục tiêu).
*   **Main user job**:
    *   Chuyển hóa khía cạnh tiêu điểm mơ hồ thành một mục tiêu cụ thể, đo lường được, có thời hạn dưới sự trợ giúp của các câu hỏi gợi ý và AI gợi ý.
    *   Hành động quan trọng nhất: Gõ nội dung các bước SMART và nhấn duyệt đề xuất gợi ý.
*   **Current primary CTA**:
    *   Các bước trung gian: `"Tiếp theo"`.
    *   Bước cuối: `"Tiếp → Khảo sát tính khả thi"`.
    *   CTA ở bước cuối khá dài nhưng hướng kết quả tốt.
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Mặc dù được chia nhỏ thành từng bước (Specific, Measurable, Achievable, Relevant, Time-Bound), giao diện vẫn mang nặng tính biểu mẫu (form-heavy) với các ô nhập liệu xám lạnh.
    *   *Text-heavy/Dashboard-like*: Nhiều hướng dẫn học thuật về mục tiêu SMART làm tăng tải nhận thức của người dùng.
    *   *Visual Anchor*: Thiếu một visual đại diện cho mục tiêu.
    *   *AI suggestion*: Gợi ý AI hiển thị dạng tĩnh thô sơ, chưa tạo cảm giác trực quan một chạm để điền nhanh.
*   **Recommended redesign direction**:
    *   *Visual Anchor*: Thêm một "Tinh thể mục tiêu" (Goal Crystal) hoặc "Bản phác thảo tầm nhìn" ở góc màn hình. Khi người dùng điền xong một khía cạnh của mục tiêu và đạt chuẩn, tinh thể sẽ sáng dần lên và đổi sắc màu tương ứng với khía cạnh cuộc sống được chọn.
    *   *Layout/Tương tác*: Chuyển đổi các gợi ý từ AI thành dạng "Smart Chips" (Nhãn dán sticker chữ viết tay). Người dùng chạm vào nhãn dán để tự động điền nhanh vào form nhập liệu.
    *   *Copy*: Thay thế các hướng dẫn lý thuyết học thuật khô khan bằng các ví dụ trực quan dạng tấm giấy ghi chú (sticky notes) viết tay chân thực dán ở viền màn hình.
*   **Risk level**: Cao (High) - Chứa nhiều logic kiểm tra tính hợp lệ của SMART Goal, archetype động và các tương tác lưu trữ tạm thời trong localStorage.
*   **Suggested batch**: Batch 2.

---

### 4. `/feasibility` (Khảo sát tính khả thi)

*   **Screen role in the product journey**:
    *   *Vị trí*: Bước đánh giá thực tế tài nguyên.
    *   *Trước đó*: `/smart-goal-setup` (Đã có dự thảo mục tiêu).
    *   *Sau đó*: `/12-week-setup` (Tiến hành lập kế hoạch hành động chi tiết).
*   **Main user job**:
    *   Trả lời 5 câu hỏi tự đánh giá nguồn lực thời gian, kỹ năng, rào cản thực tế để nhận về điểm số sẵn sàng (Readiness Score) và đề xuất điều chỉnh tải trọng mục tiêu.
    *   Hành động quan trọng nhất: Lựa chọn mức độ tự đánh giá qua các câu hỏi trắc nghiệm.
*   **Current primary CTA**:
    *   `"Tiếp tục thiết lập 12 tuần"` (khi điểm khả thi đạt yêu cầu) hoặc `"Sửa mục tiêu"` (để điều chỉnh giảm tải).
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Việc tính điểm khả thi dễ tạo áp lực phán xét như một "bài kiểm tra điểm kém" nếu người dùng nhận số điểm Readiness Score thấp (trái với Nguyên tắc 8: Calm motivation, not pressure).
    *   *Visual Anchor*: Giao diện cán cân trọng lượng (`FeasibilityBalanceScale`) thiết kế còn thô sơ, chuyển động chưa mượt mà.
    *   *3 Câu hỏi cốt lõi*: Trang chưa giải thích rõ vì sao việc tự đánh giá này giúp bảo vệ mục tiêu không bị bỏ dở giữa chừng (Tránh nản lòng ở tuần thứ 3-4).
*   **Recommended redesign direction**:
    *   *Visual*: Tái thiết kế chiếc cán cân đo lường bằng nét vẽ phác thảo mềm mại. Khi người dùng chọn câu trả lời, cán cân sẽ nghiêng động theo thời gian thực một cách trực quan.
    *   *Color system*: Tránh sắc đỏ gắt mang nghĩa "thất bại". Dùng status token cảnh báo/thông tin trung tính theo hệ thống (`app-status-*`) để diễn đạt mức readiness thấp như lời khuyên điều chỉnh, không phải điểm trượt. KHÔNG dùng `app-warm-*`/terracotta cho cảnh báo, vì theo `DESIGN.md` terracotta chỉ dành cho Reflection/Review.
    *   *Copy*: Chuyển đổi các thông điệp cảnh báo quá tải thành lời khuyên xây dựng, ví dụ: *"Mục tiêu của bạn rất đáng mong đợi, hãy điều chỉnh thời lượng xuống một chút để bạn có một hành trình bền bỉ và thoải mái hơn."*
*   **Risk level**: Trung bình (Medium) - Tính toán Readiness Score chuyển đổi sang tham số đề xuất cho trang setup kế hoạch.
*   **Suggested batch**: Batch 2.

---

### 5. `/12-week-setup` (Lập kế hoạch hành động 12 tuần)

*   **Screen role in the product journey**:
    *   *Vị trí*: Trình lập kế hoạch chi tiết cho chu kỳ 12 tuần.
    *   *Trước đó*: `/feasibility` (Đã khảo sát tính khả thi).
    *   *Sau đó*: `/12-week-system` (Vào trang dashboard quản lý và thực thi).
*   **Main user job**:
    *   Chọn một template hành động gợi ý phù hợp với mục tiêu, tinh chỉnh các hành động lặp lại (Lead Indicators), đặt mốc thời gian bắt đầu, lịch review tuần và các cột mốc quan trọng (Milestones).
    *   Hành động quan trọng nhất: Lựa chọn template hành động và cấu hình danh mục tactic/milestone.
*   **Current primary CTA**:
    *   `"Xác nhận & Bắt đầu chu kỳ 12 tuần"`.
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Mật độ thông tin cực kỳ phức tạp (Outcomes, Tactics, Schedule, Preview) gây nguy cơ quá tải nhận thức rất cao (Principle 4 - Reduce cognitive load).
    *   *Text-heavy/Dashboard-like*: Catalog template hiển thị khô khan dưới dạng card thông tin phẳng, thiếu hình ảnh trực quan sinh động minh họa cho từng chủ đề.
    *   *Mobile-friendly*: Việc điền và căn chỉnh danh mục Lead Indicators và các cột mốc tuần 4, 8 trên màn hình điện thoại rất dài dòng và khó bao quát.
*   **Recommended redesign direction**:
    *   *Visual Anchor*: Thiết kế một hành trình con đường vẽ tay (12-week timeline roadmap) trực quan. Các mốc tuần 4, 8, 12 được biểu diễn bằng hình ảnh những lá cờ cắm mốc sinh động giúp người dùng click nhanh để biên soạn.
    *   *Layout*: Thiết kế lại catalog chọn mẫu template hành động theo dạng Album lật hình/Moodboard đầy cảm hứng.
    *   *Tương tác*: Hỗ trợ thêm các thẻ hành động có sẵn (Tactic Cards) phân loại theo khía cạnh cuộc sống để người dùng chỉ cần chạm chọn kéo thả thay vì gõ phím.
*   **Risk level**: Cao (High) - Liên quan tới logic khởi tạo thực thể công việc `taskInstances`, đồng bộ cơ sở dữ liệu và lưu trữ bản nháp phức tạp.
*   **Suggested batch**: Batch 3.

---

### 6. `/12-week-system` (Bảng điều khiển chu kỳ 12 tuần)

*   **Screen role in the product journey**:
    *   *Vị trí*: Màn hình quản lý chính của chu kỳ 12 tuần.
    *   *Trước đó*: `/12-week-setup` (Hoặc truy cập trực tiếp từ Sidebar).
    *   *Sau đó*: Các tab con (Hôm nay, Tiến độ, Bảng điểm, Thiết lập/Cài đặt).
*   **Main user job**:
    *   Xem tiến độ tổng quan toàn chu kỳ, thực hiện review tuần, kiểm tra bảng điểm tuần, đồng bộ hóa cloud và cấu hình điều chỉnh chu kỳ.
    *   Hành động quan trọng nhất: Chuyển đổi giữa các tuần để xem tiến độ và thực hiện review tuần.
*   **Current primary CTA**:
    *   Tùy thuộc vào tab con được mở (Ví dụ: `"Lưu Review tuần này"`).
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Giao diện bị rơi vào bẫy "Admin-dashboard heavy" với rất nhiều bảng biểu, con số phần trăm, trạng thái đồng bộ cơ sở dữ liệu và các nút cấu hình kỹ thuật.
    *   *Text-heavy/Dashboard-like*: Scoreboard bảng điểm thiết kế dạng lưới ô vuông khô khan giống bảng tính Excel, rất khó theo dõi trực quan trên thiết bị di động.
    *   *3 Câu hỏi cốt lõi*: Màn hình quá chú trọng hiển thị số liệu phân tích kỹ thuật mà quên mất việc truyền cảm hứng, động viên tinh thần người dùng hằng tuần.
*   **Recommended redesign direction**:
    *   *Layout*: Tái định vị theo hướng "Notion-style clarity + Studygram corner". Sử dụng nền giấy kem nhạt ấm áp, bo tròn các góc thẻ lớn hơn, bổ sung các hình trang trí vẽ tay nhẹ nhàng.
    *   *Visual*: Biến đổi bảng điểm Scoreboard khô khan thành sơ đồ 12 bước chân hành trình vẽ tay. Mỗi tuần hoàn thành xuất sắc sẽ được đóng dấu bằng một con tem sticker phần thưởng lấp lánh (reward stamp animation).
    *   *Gọn hóa panel*: Sắp xếp lại các thông báo trạng thái đồng bộ và log hệ thống cho gọn gàng, nhưng KHÔNG ẩn sync/offline/conflict state. Theo `DESIGN.md` và `VISUAL_EXECUTION_SPEC.md`, trạng thái đồng bộ phải luôn nhìn thấy và rõ ràng cho người dùng đã đăng nhập ở real mode. Có thể gom log kỹ thuật chi tiết vào khu vực phụ, nhưng tín hiệu "đã lưu local / đã đồng bộ / chưa đồng bộ / có lỗi" phải hiển thị đủ rõ ở nơi người dùng dễ thấy.
*   **Risk level**: Cao (High) - Hub điều hành trung tâm chứa rất nhiều logic đồng bộ hóa dữ liệu từ xa, kiểm tra quyền và thay đổi trạng thái của chu kỳ hoạt động.
*   **Suggested batch**: Batch 3.

---

### 7. Today / Góc Hôm Nay (`/today` -> `/12-week-system?tab=today`)

> Lưu ý route: code hiện không có route `/today-v2`. Route `/today` trong `src/app/routes.tsx` redirect sang `/12-week-system?tab=today`, nên surface "Hôm nay" thực chất là tab Today bên trong `/12-week-system`. Redesign phải bám đúng surface này, không tạo route mới.

*   **Screen role in the product journey**:
    *   *Vị trí*: Không gian hành động hằng ngày của người dùng (tab Today trong `/12-week-system`).
    *   *Trước đó*: `/12-week-system` hoặc trang chủ sau khi đăng nhập.
    *   *Sau đó*: `/journal` (Viết phản tư cuối ngày).
*   **Main user job**:
    *   Tập trung thực hiện 1-3 việc cốt lõi của ngày hôm nay, đánh dấu hoàn thành (check-off) và ghi chép nhanh phản tư cuối ngày.
    *   Hành động quan trọng nhất: Nhấp hoàn thành công việc hằng ngày.
*   **Current primary CTA**:
    *   Checkbox tích hoàn thành việc, nút `"Viết phản tư →"` (chuyển sang trang journal).
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Giao diện checkbox và danh sách việc hôm nay thiết kế khá đơn điệu, giống như các ứng dụng Todo list công việc phổ thông.
    *   *Layout*: Việc chia cột trên desktop chưa tạo được tiêu điểm thị giác tối giản tối đa để người dùng tĩnh tâm hành động.
    *   *Tương tác*: Việc viết phản tư bắt buộc người dùng chuyển sang màn hình khác (`/journal`) làm đứt mạch cảm xúc.
*   **Recommended redesign direction**:
    *   *Layout*: Thiết kế lại theo phong cách "Focus Mode" tối giản tuyệt đối. Đưa danh sách việc hôm nay ra vị trí trung tâm nổi bật dưới dạng các thẻ card phẳng thanh lịch.
    *   *Visual/Tương tác*: Có thể thêm phản hồi hoàn thành nhẹ nhàng (subtle reveal/progress) khi người dùng tích xong việc, nhưng phải tuân thủ rule motion trong `DESIGN.md`. Hiệu ứng nặng như micro-confetti và âm thanh KHÔNG đưa vào như polish mặc định; chỉ cân nhắc khi có task riêng, đã token hóa, và tôn trọng `prefers-reduced-motion` (không phát animation/âm thanh ở chế độ reduced-motion).
    *   *In-context Journaling*: Có thể hiển thị một ô gợi ý phản tư nhanh, nhưng không thay thế hoặc thay đổi flow/dữ liệu của `/journal`. Mặc định vẫn điều hướng sang `/journal`; chỉ tích hợp quick journaling tại chỗ khi có task riêng xác nhận an toàn về storage và analytics.
*   **Risk level**: Trung bình (Medium) - Cập nhật trạng thái hoàn thành công việc hằng ngày trong localStorage và remote database.
*   **Suggested batch**: Batch 3.

---

### 8. `/vision-board` (Trình biên tập Bảng tầm nhìn)

*   **Screen role in the product journey**:
    *   *Vị trí*: Không gian trực quan hóa ước mơ, khơi gợi cảm hứng.
    *   *Trước đó*: `/life-insight` hoặc Gallery thư viện.
    *   *Sau đó*: `/smart-goal-setup` hoặc `/gallery`.
*   **Main user job**:
    *   Kéo thả, sắp xếp hình ảnh truyền cảm hứng, câu quote, biểu tượng cá nhân và liên kết các mục tiêu SMART lên một bảng ghim nghệ thuật.
    *   Hành động quan trọng nhất: Thêm phần tử và kéo thả sắp xếp bố cục bảng ghim.
*   **Current primary CTA**:
    *   `"Lưu"` (lưu vào thư viện) và `"Tải bảng về máy"` (xuất ảnh chất lượng cao).
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Thao tác kéo thả tự do bằng ngón tay trên màn hình cảm ứng di động cực kỳ khó khăn, các hình ảnh dễ bị lệch vị trí hoặc đè lên nhau ngoài ý muốn.
    *   *Visual Anchor*: Bản thân chiếc bảng vẽ nền gradient Aurora hiển thị khá đẹp nhưng các bức ảnh, câu quote thiết kế phẳng lỳ, chưa tạo được cảm giác chân thực của một chiếc bảng ghim vật lý thật.
    *   *Layout*: Sidebar thêm phần tử thiết kế quá phức tạp giống giao diện phần mềm đồ họa chuyên nghiệp, làm giảm sự ngẫu hứng sáng tạo.
*   **Recommended redesign direction**:
    *   *Visual*: Tăng cường các chi tiết skeuomorphic (giả lập vật lý nhẹ): thêm khung ảnh viền trắng kiểu Polaroid, đinh ghim kim loại đính góc ảnh, băng keo giấy Washi dán góc, giấy xé nhám viết câu quote để tạo chiều sâu trực quan.
    *   *Mobile*: Tự động chuyển đổi sang giao diện sắp xếp lưới tự động thông minh (Smart Auto-layout Grid) trên mobile để người dùng thao tác một chạm dễ dàng; giữ nguyên chế độ tự do trên Desktop.
    *   *Layout*: Thay sidebar phức tạp bằng khay kéo lên (Drawer) trực quan ở dưới màn hình chứa bộ nhãn dán sticker vẽ tay dễ thương và gợi ý ảnh mẫu.
*   **Risk level**: Cao (High) - Xử lý tính toán tọa độ x, y trên Canvas, nén ảnh tải lên dạng base64 và xuất ảnh PNG chất lượng cao.
*   **Suggested batch**: Batch 4.

---

### 9. `/billing/plan` (Quản lý Gói & Nâng cấp)

*   **Screen role in the product journey**:
    *   *Vị trí*: Màn hình đăng ký gói và monetization.
    *   *Trước đó*: `/settings` hoặc popup paywall trong quá trình sử dụng.
    *   *Sau đó*: `/billing/confirm` hoặc các trang tính năng Premium đã mở khóa.
*   **Main user job**:
    *   So sánh quyền lợi gói Free và Plus, thực hiện nâng cấp tài khoản, kiểm tra đồng bộ quyền lợi và quản lý lịch sử thanh toán hoặc hoàn tiền.
    *   Hành động quan trọng nhất: Nhấn nâng cấp Plus hoặc gia hạn.
*   **Current primary CTA**:
    *   `"Nâng cấp Plus"` hoặc `"Quản lý gói"`.
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Màn hình thiết kế giống hệt trang bảng giá SaaS doanh nghiệp khô khan.
    *   *Layout*: Phần đầu trang thường xuyên bị chiếm dụng bởi quá nhiều dải banner thông báo cảnh báo lỗi kết nối, trạng thái thanh toán trả về, gây cảm giác lộn xộn, bất an.
    *   *Visual Anchor*: Thiếu các hình ảnh minh họa chân thực về những giá trị thực tế của gói Plus (như chiếc Kit vật lý).
*   **Recommended redesign direction**:
    *   *Visual*: Bổ sung hình ảnh mockup chất lượng cao của bộ Kit vật lý (khung gỗ sồi, set ảnh in sắc nét) để thu hút người dùng nâng cấp lên Plus.
    *   *Bảng màu*: Sử dụng sắc xanh rừng (Forest Green) làm chủ đạo kết hợp viền nhũ vàng để tôn lên vẻ sang trọng, ấm áp thay cho sắc xanh dương SaaS thông thường.
    *   *Layout*: Thiết kế một hộp thông báo (Notification Panel) nhỏ gọn để gom toàn bộ cảnh báo lỗi đồng bộ, thanh toán, tránh đẩy phần nội dung chính xuống dưới trang.
*   **Risk level**: Rất cao (Very High) - Đây là luồng doanh thu thật liên quan tới cổng thanh toán, Firebase Admin tokens và entitlement webhooks, tuyệt đối không được làm gián đoạn luồng nghiệp vụ.
*   **Suggested batch**: Batch 4.

---

### 10. `/order` (Trang Đặt in Bộ Kit Vật Lý)

*   **Screen role in the product journey**:
    *   *Vị trí*: Trang đặt in kit dành riêng cho người dùng Plus.
    *   *Trước đó*: `/12-week-system` hoặc `/billing/plan`.
    *   *Sau đó*: `/order-status` (Theo dõi đơn hàng).
*   **Main user job**:
    *   Tự thiết kế cấu hình bộ Kit vật lý bằng cách chọn kích thước khung gỗ, set ảnh chủ đề, sticker tùy chọn và điền thông tin địa chỉ giao hàng.
    *   Hành động quan trọng nhất: Lựa chọn chất liệu kit và điền form giao hàng.
*   **Current primary CTA**:
    *   `"Đặt đơn"` hoặc `"Kiểm tra lại"`.
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Luồng đặt hàng dạng các thẻ bước dọc (StepCard 1-5) trải dài quá khổ trên di động, buộc người dùng cuộn trang mệt mỏi.
    *   *Visual*: Tùy chọn kích thước khung và set ảnh chủ đề chỉ hiển thị dưới dạng văn bản và ô chọn tròn thô sơ, chưa cho người dùng thấy trước sản phẩm thật trông thế nào.
*   **Recommended redesign direction**:
    *   *Real-time Preview Mockup*: Thiết kế một khung preview trực quan (sticky trên mobile): khi người dùng chọn khung gỗ sồi và set ảnh "Bình minh", khung hình sẽ tự động cập nhật hiển thị chính xác cách sắp xếp đó để tăng sự hào hứng.
    *   *Layout*: Sử dụng thanh accordion thu gọn các bước đặt hàng đã hoàn thành để giữ trang ngắn gọn trên mobile.
    *   *Visual*: Bổ sung ảnh đại diện lớn, rõ nét cho các set ảnh chủ đề.
*   **Risk level**: Trung bình (Medium) - Tính toán giá tiền đơn hàng VND và kết nối tạo đơn hàng ở backend.
*   **Suggested batch**: Batch 4.

---

### 11. `/order-status` (Theo dõi Vận đơn & Quét QR Thanh toán)

*   **Screen role in the product journey**:
    *   *Vị trí*: Trang hiển thị thanh toán QR VietQR hoặc theo dõi tiến trình đơn hàng vật lý sau khi thanh toán.
    *   *Trước đó*: `/order` (Đã đặt hàng).
    *   *Sau đó*: `/12-week-system` hoặc `/billing/plan`.
*   **Main user job**:
    *   Quét mã QR chuyển khoản chính xác số tiền và nội dung, theo dõi tiến trình đơn hàng (Pending -> Printing -> Shipping -> Delivered).
    *   Hành động quan trọng nhất: Quét QR chuyển khoản hoặc theo dõi tiến độ giao hàng.
*   **Current primary CTA**:
    *   `"Tôi đã chuyển khoản xong"`, `"Liên hệ hỗ trợ"`.
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Màn hình thanh toán QR trông quá giống một ứng dụng giao dịch ngân hàng khô cứng.
    *   *Visual*: Timeline giao hàng thiết kế dạng dọc tẻ nhạt giống trang đơn hàng thương mại điện tử đại trà.
*   **Recommended redesign direction**:
    *   *Visual*: Cách điệu đồng hồ đếm ngược (countdown) giữ mã thanh toán thành hình ảnh đồng hồ cát hoặc vòng tròn mờ ảo êm dịu, giảm bớt căng thẳng chuyển tiền cho người dùng.
    *   *Timeline*: Biến timeline 4 bước thành sơ đồ hành trình "Gói quà đang bay" nằm ngang sinh động với nét vẽ phác thảo vẽ tay dễ thương.
*   **Risk level**: Cao (High) - Kết nối tới VietQR API và polling tự động cập nhật trạng thái thanh toán từ backend.
*   **Suggested batch**: Batch 4.

---

### 12. `/settings` (Cài đặt tài khoản)

*   **Screen role in the product journey**:
    *   *Vị trí*: Trang cấu hình bổ sung, kiểm tra dữ liệu và bảo mật.
    *   *Trước đó*: Sidebar hoặc `/12-week-system`.
    *   *Sau đó*: `/` (Sau khi đăng xuất hoặc xóa tài khoản).
*   **Main user job**:
    *   Thay đổi giao diện sáng/tối, bật tắt âm thanh xong việc, xuất/nhập bản sao lưu dữ liệu local, xóa dữ liệu thiết bị hoặc xuất dữ liệu tài khoản cloud.
    *   Hành động quan trọng nhất: Đổi theme, bật tắt âm thanh, xuất backup dữ liệu.
*   **Current primary CTA**:
    *   Không có CTA duy nhất, đây là trang đa tác vụ (nút `"Xuất dữ liệu"`, `"Kiểm tra sao lưu"`, v.v.).
*   **UX/UI problems based on docs/DESIGN.md**:
    *   *Dreamy Guided Productivity*: Trang cài đặt hiển thị khá nhiều khối thông tin dài dòng, các nút bấm xếp cạnh nhau chưa phân biệt rõ tầm quan trọng.
    *   *Text-heavy/Dashboard-like*: Các vùng cảnh báo "Danger Zone" hiển thị sắc đỏ rất đậm gắt, dễ gây căng thẳng tâm lý cho người dùng.
    *   *Visual Anchor*: Thiếu các icon minh họa sinh động cho các cụm chức năng (theme, âm thanh, data).
*   **Recommended redesign direction**:
    *   *Layout*: Phân chia trang cài đặt thành 3 cụm thẻ rõ ràng: Cấu hình trải nghiệm (Theme, Âm thanh), Quản lý dữ liệu (Backup, Restore, Sync) và Vùng bảo mật (Xóa tài khoản/Xóa data local).
    *   *Visual*: Sử dụng các icon bo góc mịn màng màu Sage Green cho các mục thông thường. Thiết kế vùng Danger Zone bằng status/danger token theo hệ thống (`app-status-error` hoặc pattern danger sẵn có) với mức nhấn vừa phải, văn minh. KHÔNG dùng `app-warm-*`/terracotta/soft orange cho Danger Zone, vì terracotta chỉ dành cho Reflection/Review.
    *   *Copy*: Viết lại các cảnh báo hủy/xóa dữ liệu thân thiện hơn nhưng vẫn đảm bảo tính cảnh báo rõ ràng.
*   **Risk level**: Cao (High) - Chứa các hành động phá hủy dữ liệu (xóa tài khoản, wipe local data) và xuất/nhập tệp tin JSON cấu trúc phức tạp.
*   **Suggested batch**: Later (Batch phụ sau khi hoàn tất các chức năng chính).

---

## 3. Batch Plan (Kế Hoạch Phân Đợt Triển Khai)

Quá trình thực thi tái thiết kế giao diện sẽ được chia thành 4 đợt chính và 1 đợt bổ sung sau cùng để kiểm soát rủi ro hệ thống tốt nhất:

```mermaid
gantt
    title Lộ trình Tái Thiết Kế UI/UX Dear Our Future
    dateFormat  YYYY-MM-DD
    section Triển khai
    Batch 1 (Onboarding + Life Insight)             :active, b1, 2026-06-01, 7d
    Batch 2 (SMART Goal + Feasibility)              :after b1, b2, 7d
    Batch 3 (12-Week Setup + System + Today)        :after b2, b3, 10d
    Batch 4 (Vision Board + Billing/Order funnels)  :after b3, b4, 10d
    Later (Settings/Admin/Secondary surfaces)       :after b4, b5, 5d
```

### Chi tiết các Batch:
1.  **Batch 1: Onboarding + Life Insight**
    *   *Mục tiêu*: Tạo ấn tượng đầu tiên cực tốt cho người dùng mới qua Bánh xe cuộc đời tương tác trực tiếp và báo cáo Góc nhìn cá nhân phong cách Scrapbook.
2.  **Batch 2: SMART Goal + Feasibility**
    *   *Mục tiêu*: Dẫn dắt người dùng viết mục tiêu SMART mượt mà qua hiệu ứng "Goal Crystal" sáng dần và khảo sát tính khả thi với Cán cân hoạt họa dễ thương.
3.  **Batch 3: 12-Week Setup + 12-Week System + Today**
    *   *Mục tiêu*: Thiết lập và vận hành kế hoạch 12 tuần trực quan qua bản đồ 12 bước chân, chế độ Focus Mode của Hôm nay và các Tactic Cards chọn nhanh.
4.  **Batch 4: Vision Board + Billing/Order surfaces**
    *   *Mục tiêu*: Không gian nghệ thuật Vision Board giả lập ghim vật lý cùng phễu đặt hàng Kit in ấn và bảng giá Plus cao cấp Forest Green.
5.  **Later: Settings/Admin/secondary surfaces**
    *   *Mục tiêu*: Tối ưu hóa trang cài đặt tài khoản và các trang phụ như chính sách bảo mật, điều khoản sử dụng.

---

## 4. Risk Notes (Lưu Ý Rủi Ro Kỹ Thuật)

Trong quá trình chỉnh sửa giao diện, tuyệt đối phải tuân thủ các rào cản kỹ thuật sau để không phá hỏng hệ thống:

*   **Không làm gãy cấu trúc dữ liệu LocalStorage**: Các biến như `UserData`, `Goal`, `TwelveWeekSystem`, `AspirationalVision` được định nghĩa trong `src/app/utils/storage.ts` và `storage-twelve-week.ts` có tính nhạy cảm cao về tương thích ngược. Chỉ thay đổi UI, **không đổi tên key hoặc shape của object dữ liệu**.
*   **Bảo vệ Auth Flow & Router**: Các route thanh toán và order kit được bảo vệ bởi `ProtectedRoute` và Firebase Auth. Không được can thiệp vào logic chuyển hướng hoặc kiểm tra token đăng nhập khi chỉnh sửa giao diện.
*   **Tuân thủ biến môi trường App Mode**: Một số nút debug (`VITE_SHOW_BILLING_DEBUG`, `VITE_SHOW_SYNC_DEBUG`) và route mock thanh toán chỉ được phép xuất hiện khi `VITE_APP_MODE=demo`. Khi ở chế độ `real`, các phần tử này phải bị ẩn hoàn toàn để tránh rò rỉ trải nghiệm mock tới người dùng cuối.

---

## 5. Manual Review Checklist (Checklist Đánh Giá Thủ Công)

Khi hoàn tất redesign cho mỗi màn hình, ta phải tự kiểm tra qua các tiêu chí sau:

*   [ ] **One-second Goal**: Người dùng hiểu ngay mình đang ở bước nào trong hành trình trong vòng 1 giây.
*   [ ] **Primary CTA Obvious**: Có duy nhất 1 nút bấm chính nổi bật rõ rệt nhất, các hành động phụ được làm nhạt đi.
*   [ ] **Visual Anchor Present**: Màn hình có ít nhất một yếu tố thị giác đặc trưng (Biểu đồ, cán cân, tinh thể mục tiêu, sticker) để neo giữ cảm xúc người dùng.
*   [ ] **No Guilt Copy**: Toàn bộ copy không mang tính phán xét, đổ lỗi hay gây áp lực nặng nề cho người dùng.
*   [ ] **Mobile Comfort**: Các thanh trượt, nút bấm có khoảng cách và kích thước lớn (ít nhất 44x44px), form nhập liệu ngắn gọn, không bị lỗi tràn ngang trang (horizontal scroll).
*   [ ] **Accessibility Kept**: Độ tương phản màu chữ đạt chuẩn readable, giữ nguyên thẻ `aria-label` cho các nút icon.

---

## 6. Recommended Order of Implementation (Thứ Tự Triển Khai Khuyến Nghị)

Để có kết quả kiểm thử tốt nhất và không bị chồng chéo dữ liệu, chúng ta nên triển khai tuần tự theo đúng phễu trải nghiệm người dùng (User Funnel):

1.  **Bước 1**: Redesign `/onboarding` (Lấy dữ liệu bánh xe) -> Đảm bảo Radar Chart tương tác lưu đúng dữ liệu.
2.  **Bước 2**: Redesign `/life-insight` (Chọn trọng tâm) -> Đảm bảo truyền đúng biến Focus Area.
3.  **Bước 3**: Redesign `/smart-goal-setup` (Viết mục tiêu) -> Kiểm tra sự thay đổi của Goal Crystal.
4.  **Bước 4**: Redesign `/feasibility` (Kiểm tra thực tế) -> Nhận Readiness Score.
5.  **Bước 5**: Redesign `/12-week-setup` (Dựng roadmap) -> Áp dụng template và lưu chu kỳ mới.
6.  **Bước 6**: Redesign Today (tab Today của `/12-week-system`, route `/today` redirect tới đây) -> Đánh dấu hoàn thành và gợi ý ghi phản tư.
7.  **Bước 7**: Redesign `/12-week-system` (Xem tổng quan toàn chu kỳ và review tuần).
8.  **Bước 8**: Redesign `/vision-board` (Biên tập bảng ghim Polaroid/Washi tape).
9.  **Bước 9**: Redesign `/billing/plan` -> `/order` -> `/order-status` (Luồng nâng cấp và đặt Kit vật lý).
10. **Bước 10**: Redesign `/settings` (Cài đặt & dọn dẹp).
