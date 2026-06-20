# Design Uplift Brief — "Năng lượng & Truyền cảm hứng"

> Tài liệu này để bàn giao cho AI/lập trình viên thực thi. Mục tiêu: làm giao diện **đẹp hơn, truyền cảm hứng hơn** mà **không phá vỡ** design-system 3 lớp (`tokens.css` → `theme.css`) và các guardrail trong `CLAUDE.md`.

## 0. Nguyên tắc nền tảng (đọc trước khi code)

- **Không đập đi xây lại.** Mở rộng token sẵn có, không đổi tên/xoá token cũ.
- **Năng lượng có chủ đích, không rải đều.** App có 2 vùng cảm xúc:
  - **Vùng Execution (làm việc hằng ngày):** Today, 12-Week Plan, Goal Tracker, Dashboard → giữ **Calm Productivity**, sạch và tập trung. *Không* thêm glow/gradient ồn ào ở đây.
  - **Vùng Cảm xúc (khoảnh khắc tạo động lực):** Onboarding, Vision Board, Achievements, Weekly Review (lúc ăn mừng), Streak, màn hình hoàn thành mục tiêu → **đây mới là nơi bơm năng lượng**.
- **Giữ chuẩn tương phản WCAG AA** đã có. Mọi màu/gradient mới phải đạt ≥4.5:1 cho text, ≥3:1 cho control.
- Tôn trọng `CLAUDE.md`: không biến app thành landing page marketing; motion chỉ dùng ở các khoảnh khắc ăn mừng, không rải khắp nơi.

---

## 1. Màu sắc — thêm "tia năng lượng" vào palette

Hệ màu hiện tại (Forest Green + Terracotta) rất đẹp và trưởng thành nhưng hơi trầm. Đề xuất **thêm token gradient + 1 màu nhấn ấm** dùng *chỉ* ở vùng cảm xúc.

### 1.1 Token gradient mới (thêm vào `tokens.css`, Layer 2)

```css
:root {
  /* Energy gradients — CHỈ dùng ở vùng cảm xúc (hero, vision board, achievement) */
  --grad-aspire:   linear-gradient(135deg, #2A5447 0%, #3A7D5E 55%, #5BA590 100%); /* green → mint: tăng trưởng */
  --grad-celebrate:linear-gradient(135deg, #A8522F 0%, #D9A45A 100%);              /* terracotta → amber: ăn mừng */
  --grad-vision:   linear-gradient(160deg, #1E3D35 0%, #2A5447 60%, #6E2D11 140%); /* nền vision board sang trọng */

  /* Spotlight glow cho badge/CTA hero (đã có --shadow-glow-* trong theme.css, dùng lại) */
}
html.dark {
  --grad-aspire:   linear-gradient(135deg, #143027 0%, #2A5447 55%, #5BA590 100%);
  --grad-celebrate:linear-gradient(135deg, #6E2D11 0%, #E89878 100%);
  --grad-vision:   linear-gradient(160deg, #0F1F1A 0%, #1C1A15 60%, #3A2820 140%);
}
```

### 1.2 Dùng màu Life-Area mạnh dạn hơn

Bạn đã định nghĩa 8 màu life-area (career, finance, health, education, relationships, family, personal-growth, leisure) nhưng đang dùng nhạt. **Đề xuất:** mỗi life-area có "thẻ màu riêng" rõ ràng ở Life Balance, Vision Board, Dashboard — tạo cảm giác sống động, cá nhân hoá. Đây là nguồn "màu sắc" tự nhiên nhất của app, dùng nó thay vì thêm màu ngẫu nhiên.

---

## 2. Typography — biến chữ thành nguồn cảm hứng

Bạn đã có `Source Serif 4` (serif) cho heading và thang `text-display`. Hiện đang giữ rất khiêm tốn.

- **Onboarding & Vision Board:** dùng `text-display` (40–48px serif) cho 1 câu affirmation/tagline lớn (vd: *"Đây là 12 tuần thay đổi cuộc đời bạn."*). Một câu hero lớn tạo cảm xúc tức thì.
- **Achievement / hoàn thành mục tiêu:** heading serif lớn + số liệu nổi bật (vd "Tuần 7/12", "84% hoàn thành") làm điểm nhấn tự hào.
- **Reflection:** giữ serif như hiện tại — đã rất hợp.
- Giữ body `Be Vietnam Pro` cho mọi UI thao tác.

---

## 3. Khoảnh khắc tạo năng lượng (nơi cần đầu tư nhất)

### 3.1 Vision Board — trái tim cảm xúc của app
- Hình ảnh là **nhân vật chính**: ảnh lớn hơn, bo góc `radius-card`, `shadow-app-lg`, hover nâng nhẹ (`ease-emphasized`, 240ms).
- Nền dùng `--grad-vision` (tối, sang) để ảnh nổi bật như phòng triển lãm.
- Mỗi ảnh gắn nhãn life-area bằng màu life-area tương ứng.
- Empty state: minh hoạ + câu mời gọi truyền cảm hứng thay vì ô trống.

### 3.2 Progress = phần thưởng cảm xúc
- Thay progress bar phẳng bằng **vòng tròn tiến độ (progress ring)** ở Dashboard/12-Week, fill bằng `--grad-aspire`.
- Khi hoàn thành task/tuần: micro-animation ăn mừng nhẹ (scale + fade, `--ease-spring`/`--ease-overshoot` đã có sẵn trong `theme.css`). Confetti **chỉ** khi đóng một milestone lớn (hoàn thành tuần, đạt mục tiêu) — không phải mỗi tick.

### 3.3 Achievements & Streak
- Badge huy hiệu dùng `--grad-celebrate` + `--shadow-glow-success`.
- Streak counter nổi bật, có "ngọn lửa"/biểu tượng tăng dần theo số ngày.

### 3.4 Onboarding
- Màn chào dùng hero gradient `--grad-aspire`, 1 câu lớn, 1 CTA rõ. Tạo cảm giác "bắt đầu hành trình" thay vì form khô khan.

### 3.5 Weekly Review — khoảnh khắc tự hào
- Mở đầu bằng tóm tắt "tuần này bạn đã làm được": số task xong, % tiến độ, dạng card ăn mừng (warm/terracotta context như đang dùng) trước khi vào phần reflection.

---

## 4. Chiều sâu & chất liệu (depth)

- Dùng thang `--shadow-app-md/lg/xl` đã có để tạo phân lớp rõ hơn ở card hero (không dùng cho mọi card — giữ card thao tác phẳng nhẹ).
- Card hero/cảm xúc: thêm viền sáng mảnh (`--shadow-glow-brand` đã có) để tạo cảm giác "premium" mà không loè loẹt.
- Bo góc nhất quán theo token (`radius-card` 14px) — không tự đặt số lẻ.

---

## 5. Việc KHÔNG nên làm (guardrail)

- ❌ Không thêm gradient/glow/3D-tilt vào màn thao tác hằng ngày (Today, Goal Tracker, Admin, Billing).
- ❌ Không đổi tên/xoá token, không đổi shape dữ liệu localStorage.
- ❌ Không thêm thư viện animation nặng — dùng CSS transition + token motion sẵn có (`--duration-*`, `--ease-*`).
- ❌ Không để màu/gradient làm rớt chuẩn tương phản. Test lại AA sau khi đổi.
- ❌ Không dùng `app-warm`/terracotta ngoài context Reflection (đã ghi rõ trong tokens.css).

---

## 6. Lộ trình triển khai theo độ ưu tiên

1. **Phase 1 — Tác động cao, rủi ro thấp:** thêm token gradient (mục 1.1); nâng cấp Vision Board (3.1); progress ring + ăn mừng milestone (3.2).
2. **Phase 2:** Onboarding hero (3.4); Achievements/Streak (3.3); Weekly Review summary (3.5).
3. **Phase 3:** hero typography (mục 2); làm rõ màu life-area toàn app (1.2); tinh chỉnh depth (mục 4).
4. **Verify:** chạy `npm run check`, `npm run qa:visual-ux-ui`; kiểm tra tương phản AA ở cả light & dark mode; chụp screenshot trước/sau.

---

## 7. Prompt mẫu để đưa cho AI code

> "Triển khai Phase 1 của `docs/DESIGN_UPLIFT_BRIEF.md`. Chỉ thêm token gradient vào `src/styles/tokens.css` (cả light & dark), nâng cấp Vision Board và đổi progress bar Dashboard thành progress ring dùng `--grad-aspire`. Tuyệt đối không đổi tên token cũ, không sửa shape localStorage, không thêm dependency mới. Sau khi xong chạy `npm run check` và báo lại file đã đổi + kết quả."
