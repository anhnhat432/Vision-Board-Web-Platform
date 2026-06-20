# Master Design Overhaul — Vision Board Platform

> **Mục tiêu:** một cuộc cải tổ giao diện *toàn diện* theo hướng **năng lượng & truyền cảm hứng**, nhưng **giữ nguyên** kiến trúc token 3 lớp và bảng màu Forest Green + Terracotta. Đây là "nâng cấp lớn", không phải "đập đi xây lại".
>
> Tài liệu này là nguồn sự thật. Bộ prompt thực thi nằm ở `docs/DESIGN_OVERHAUL_PROMPTS.md`. Phần Onboarding chi tiết bổ sung ở `docs/DESIGN_UPLIFT_BRIEF.md`.

---

## 0. Cách dùng tài liệu này

1. Đọc mục 1–3 để nắm nguyên tắc và nền tảng.
2. Thực thi theo **lộ trình phase** ở mục 8 — KHÔNG làm tất cả một lúc.
3. Mỗi màn có mô tả "đổi gì" ở mục 5; prompt sẵn-dán tương ứng ở file prompts.
4. Sau mỗi phase: chạy verify (mục 9), chụp before/after, review tương phản AA.

---

## 1. Nguyên tắc nền tảng (không thương lượng)

- **Giữ kiến trúc token.** Mở rộng `src/styles/tokens.css` / `theme.css`, KHÔNG đổi tên/xoá token, KHÔNG dùng Primitive token trực tiếp trong JSX.
- **Năng lượng có chủ đích — chia 2 vùng cảm xúc:**
  - **Vùng Execution (làm việc hằng ngày):** Dashboard, Today/Goal Tracker, 12-Week, Admin, Billing → giữ **Calm Productivity**. Sạch, tập trung, gradient/animation tối thiểu.
  - **Vùng Cảm xúc (khoảnh khắc động lực):** Onboarding, Vision Board, Achievements, Weekly Review (lúc ăn mừng), Streak, Life Insight, màn hoàn thành mục tiêu → **đây là nơi bơm năng lượng tối đa**.
- **WCAG AA luôn giữ** ở cả light & dark mode (text ≥4.5:1, control ≥3:1). Đã đạt — đừng làm rớt.
- **Tôn trọng `prefers-reduced-motion`.** App đã có hook `use-reduced-motion.ts` — mọi animation mới phải qua đó.
- **Đổi nhỏ, có kiểm soát.** Mỗi phase là một PR/đợt riêng, verify xong mới sang phase sau.
- **`app-warm`/terracotta CHỈ dùng trong Reflection context.**

---

## 2. Tận dụng "kho vũ khí" đã có sẵn (đây là chìa khoá)

App đã có rất nhiều component tạo cảm xúc nhưng đang dùng dè dặt. Cải tổ = **dùng chúng mạnh dạn và nhất quán**, không viết lại từ đầu.

**Chuyển động — `src/app/components/motion/`**
`MotionFadeIn`, `MotionPageTransition`, `MotionStaggerList` + `MotionStaggerItem`, `MotionCountUp`, `MotionTilt`, `MotionParallaxLayer`, `RevealOnScroll`.

**Ăn mừng — `src/app/components/celebration/`**
`MilestoneToast`, `fireCelebration.ts`, `useCelebration.tsx`.

**Minh hoạ — `src/app/components/illustrations/`**
`CelebrationBurst`, `VisionMapIllustration`, `WeeklyReviewIllustration`, `EmptyTaskIllustration`, `CalmEmptyIllustrations`, `CloudSyncIllustration`, `BillingPlusIllustration`, + thư mục `mini/`.

**UI cao cấp — `src/app/components/ui/`**
`featured-card`, `spotlight-card`, `parallax-card`, `interactive-surface`, `reveal`, `count-up`, `progress`, `mindful-player`, `aspect-ratio`, `carousel`.

**Khác:** `MotivationalReminder`, `SpotlightTour`, `DashboardLifeAreaRadar`, `SimpleRadarChart`, `NewUserGuide`, `empty-states/narratives.ts`.

> Quy tắc: trước khi tạo component mới cho hiệu ứng, kiểm tra danh sách trên — gần như chắc chắn đã có.

---

## 3. Nền tảng cần thêm (Phase 0)

### 3.1 Token gradient mới — `src/styles/tokens.css` (Layer 2, cả `:root` & `html.dark`)

```css
:root {
  --grad-aspire:    linear-gradient(135deg, #2A5447 0%, #3A7D5E 55%, #5BA590 100%); /* tăng trưởng */
  --grad-celebrate: linear-gradient(135deg, #A8522F 0%, #D9A45A 100%);              /* ăn mừng (Reflection/Achievement) */
  --grad-vision:    linear-gradient(160deg, #1E3D35 0%, #2A5447 60%, #6E2D11 140%); /* nền Vision Board sang trọng */
  --grad-surface:   linear-gradient(180deg, #FCFAF7 0%, #F2F7F4 100%);              /* nền section nhẹ */
}
html.dark {
  --grad-aspire:    linear-gradient(135deg, #143027 0%, #2A5447 55%, #5BA590 100%);
  --grad-celebrate: linear-gradient(135deg, #6E2D11 0%, #E89878 100%);
  --grad-vision:    linear-gradient(160deg, #0F1F1A 0%, #1C1A15 60%, #3A2820 140%);
  --grad-surface:   linear-gradient(180deg, #1C1A15 0%, #211F1A 100%);
}
```

Đồng bộ sang Tailwind qua `@theme inline` nếu muốn dùng dạng utility. Đặt class tiện ích `bg-aspire`, `bg-vision`... nếu cần.

### 3.2 Dùng lại token có sẵn
- Glow: `--shadow-glow-brand`, `--shadow-glow-success`, `--shadow-glow-primary` (đã có trong `theme.css`) — chỉ cho card hero/badge ăn mừng.
- Motion: `--duration-*`, `--ease-emphasized`, `--ease-spring`, `--ease-overshoot` (đã có) — dùng cho micro-interaction.
- Typography: thang `text-display`, `text-4xl`, `text-3xl` + `font-serif` (đã có) cho hero.

### 3.3 Màu life-area
8 token life-area (`--color-career-accent`, `--color-health-accent`, ...) đang dùng nhạt. Chuẩn hoá thành "thẻ màu nhận diện" rõ ràng cho mỗi lĩnh vực, dùng nhất quán ở Life Balance, Vision Board, Dashboard, Goal Tracker.

---

## 4. Hệ thống chuyển động & ăn mừng (motion choreography)

| Khoảnh khắc | Component dùng | Cường độ |
|---|---|---|
| Vào trang | `MotionPageTransition` + `MotionFadeIn` | nhẹ, 240ms |
| Danh sách (task, goal, life-area) | `MotionStaggerList`/`Item` | nhẹ, stagger 40–60ms |
| Số liệu tiến độ | `MotionCountUp` / `count-up` | trung bình |
| Hoàn thành task | scale + check (ease-spring) | nhẹ |
| Hoàn thành tuần / đạt mục tiêu | `useCelebration` + `fireCelebration` + `CelebrationBurst` + `MilestoneToast` | mạnh (chỉ milestone lớn) |
| Card hero / vision item | `featured-card` / `spotlight-card` / `parallax-card` | trung bình |
| Cuộn xem nội dung dài | `RevealOnScroll` / `reveal` | nhẹ |

**Quy tắc:** confetti/burst **chỉ** ở milestone lớn (xong tuần, đạt mục tiêu, lập xong kế hoạch 12 tuần) — KHÔNG ở mỗi tick task. Tất cả tôn trọng `use-reduced-motion`.

---

## 5. Bản đồ màn hình & nâng cấp từng màn

Theo luồng sản phẩm: **Onboarding → Life Balance → Life Insight → SMART Goal → Feasibility → 12-Week → Weekly Execution → Reflection/Review**, cộng các màn phụ trợ.

### 5.1 Onboarding `app/pages/Onboarding/`  · vùng Cảm xúc
Hero `--grad-aspire`, tiêu đề serif lớn (affirmation), step-indicator 4 bước, chip life-area nhiều màu, CTA accent + "không cần đăng nhập". Chi tiết: `DESIGN_UPLIFT_BRIEF.md`.

### 5.2 Life Balance `app/pages/LifeBalance.tsx`  · cầu nối
Làm nổi `DashboardLifeAreaRadar`/`SimpleRadarChart` thành nhân vật chính; mỗi life-area dùng màu riêng; `MotionStaggerList` cho danh sách lĩnh vực; chuyển trạng thái mượt.

### 5.3 Life Insight `app/pages/LifeInsight/`  · vùng Cảm xúc nhẹ
Trình bày insight như "khoảnh khắc nhận ra": typography serif cho câu chốt, `RevealOnScroll`, dùng màu life-area để liên kết với dữ liệu Life Balance.

### 5.4 SMART Goal Setup `app/pages/SMARTGoalSetup/`  · Execution (calm) + điểm nhấn
Form sạch, từng bước rõ; nhưng phần "Aspirational Vision" (`AspirationalVision.tsx`) là điểm nhấn cảm xúc: serif lớn, ảnh/illustration, có thể `featured-card`.

### 5.5 Feasibility Check `app/pages/FeasibilityCheck/`  · Execution (calm)
Giữ rõ ràng, dùng `progress` + status color để feedback. Năng lượng đến từ sự rõ ràng và phản hồi tích cực, không phải hiệu ứng.

### 5.6 12-Week Setup & System `app/pages/12WeekSetup/`, `TwelveWeekSystemSections.tsx`  · Execution
Khi lập xong kế hoạch = milestone lớn → `useCelebration`. Tiến độ tuần dùng **progress ring** fill `--grad-aspire` + `MotionCountUp`. Lưới 12 tuần trực quan, scannable.

### 5.7 Dashboard `app/pages/Dashboard.tsx`  · Execution (calm)
Giữ calm + scannable, nhưng: metric chính dùng `count-up`/`MotionCountUp`; progress dùng ring gradient; 1 "featured card" tạo điểm nhấn (mục tiêu tuần này / câu động lực qua `MotivationalReminder`). KHÔNG biến thành dashboard loè loẹt.

### 5.8 Goal Tracker / Weekly Execution `app/pages/GoalTracker.tsx`  · Execution (calm)
Today/tuần phải tập trung. Năng lượng = phần thưởng khi tick: micro-animation check (ease-spring), cập nhật progress ring mượt, MilestoneToast khi hoàn thành cụm/tuần. Danh sách dùng `MotionStaggerList`.

### 5.9 Reflection / Review `app/pages/ReflectionJournal/`  · vùng Warm (Reflection)
Đây là nơi DUY NHẤT dùng terracotta/`app-warm` + `--grad-celebrate`. Mở đầu Weekly Review bằng card "tuần này bạn đã làm được" (số liệu count-up, `WeeklyReviewIllustration`) trước phần viết. Streak nổi bật. Prompt reflection dùng `font-serif`.

### 5.10 Vision Board `app/pages/VisionBoardEditor.tsx`, `VisionBoardGallery.tsx`  · vùng Cảm xúc (đỉnh điểm)
Trái tim cảm xúc của app. Nền `--grad-vision` (tối, như phòng triển lãm). Ảnh lớn, `aspect-ratio`, bo `radius-card`, `parallax-card`/`spotlight-card` hover nâng. Mỗi ảnh gắn nhãn life-area theo màu. Empty state dùng `VisionMapIllustration` + lời mời truyền cảm hứng (`empty-states/narratives.ts`).

### 5.11 Achievements `app/pages/Achievements.tsx`  · vùng Cảm xúc
Huy hiệu dùng `--grad-celebrate` + `--shadow-glow-success`; `CelebrationBurst` khi mở khoá; số liệu `count-up`; lưới badge dùng `MotionStaggerList`.

### 5.12 Màn phụ trợ (đụng nhẹ)
- **Settings / Help / Legal:** chỉ đồng bộ typography & spacing, không thêm hiệu ứng.
- **Billing / Upgrade `BillingPlan.tsx`, `UpgradePaywallDialog.tsx`:** dùng `featured-card` cho gói đề xuất, `BillingPlusIllustration`; giữ rõ ràng, không "bán hàng" quá đà. Mock upgrade vẫn phải an toàn cho demo công khai.
- **Login `LoginPage.tsx`:** hero nhẹ `--grad-aspire`, nhưng đăng nhập không bắt buộc ở demo.

### 5.13 Khung chung (shared)
- `PageShell.tsx` / `RootLayout.tsx`: chuẩn hoá `MotionPageTransition`, spacing section (`spacing.section`), max-width nhất quán.
- Navigation/`sidebar`: trạng thái active rõ bằng accent; mobile-safe (bottom-nav z-index đã có token `--z-bottom-nav`).
- Empty states & loading: dùng `illustrations/` + `skeleton` thay cho màn trống.
- `CoreFlowProgress.tsx`: thanh tiến độ luồng chính nổi bật, tạo cảm giác "đang tiến lên".

---

## 6. Typography hệ thống hero

- Hero/affirmation: `text-display`/`text-4xl` + `font-serif`. Mỗi màn cảm xúc có đúng 1 câu hero lớn.
- Section heading: `text-2xl`/`text-3xl` serif. Body: `font-sans` (`Be Vietnam Pro`).
- Số liệu tự hào (tiến độ, streak, % hoàn thành): cỡ lớn, weight 500, kèm `count-up`.
- KHÔNG trộn serif vào body UI thao tác.

---

## 7. Accessibility & guardrails

- Giữ AA mọi nơi; test lại sau mỗi đổi màu (light + dark).
- Mọi animation qua `use-reduced-motion`; không animation gây giật/chớp.
- Không thêm dependency mới (đã có framer-motion/canvas-confetti tuỳ theo motion/celebration hiện tại — dùng lại, không thêm cái mới).
- Không đổi shape localStorage, không đổi logic core flow / autosave / billing / entitlement.
- Chỉ sửa file bằng edit tool; không heredoc/shell redirection.
- Không dùng `app-warm` ngoài Reflection.

---

## 8. Lộ trình phase (thứ tự thực thi)

**Phase 0 — Nền tảng (1 PR nhỏ, rủi ro rất thấp)**
Thêm token gradient (3.1), class tiện ích, chuẩn hoá màu life-area (3.3). Không đổi UI màn nào. Verify.

**Phase 1 — Khoảnh khắc cảm xúc (tác động cao nhất)**
Vision Board (5.10), Achievements (5.11), ăn mừng milestone ở 12-Week & Goal Tracker (5.6/5.8), Weekly Review summary (5.9). Đây là nơi người dùng "wow".

**Phase 2 — Luồng chính**
Onboarding (5.1), Life Balance (5.2), Life Insight (5.3), Dashboard featured + count-up (5.7), Aspirational Vision trong SMART Goal (5.4).

**Phase 3 — Hoàn thiện**
Typography hero toàn app (mục 6), khung chung/PageShell/nav (5.13), empty states & loading, Billing/Login (5.12), tinh chỉnh depth & motion.

**Phase 4 — QA tổng**
Tương phản AA (light+dark), reduced-motion, mobile, screenshot before/after, smoke test.

---

## 9. Definition of Done & lệnh verify

Mỗi phase chỉ "xong" khi:
- `npm run check` xanh (typecheck + lint + test + build).
- Màn đổi không vỡ test hiện có (sửa selector tối thiểu nếu cần, KHÔNG đổi logic).
- Tương phản AA đạt ở cả 2 mode.
- `prefers-reduced-motion` được tôn trọng.
- Mobile (≤375px) không vỡ layout.

```bash
npm run check
npm run qa:visual-ux-ui   # nếu chạy được
npm run smoke:mvp1
```

Backend không bị ảnh hưởng (đây là việc thuần frontend/UI).
