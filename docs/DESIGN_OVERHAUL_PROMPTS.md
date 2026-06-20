# Bộ Prompt thực thi cải tổ giao diện (sẵn-dán cho AI)

> Cách dùng: dán **PREAMBLE** một lần đầu mỗi phiên, rồi dán prompt của phase/màn muốn làm. Đính kèm `docs/DESIGN_OVERHAUL_MASTER.md` nếu AI hỗ trợ đọc file.
> Thực thi theo thứ tự: Phase 0 → Phase 1 → Phase 2 → Phase 3 → QA. Mỗi prompt làm xong phải verify trước khi sang prompt tiếp.

---

## PREAMBLE (dán đầu mỗi phiên)

```
Bạn đang làm UI cho "Vision Board Web Platform" — React + Vite + Tailwind v4, local-first.
Đọc và tuân thủ docs/DESIGN_OVERHAUL_MASTER.md. Nguyên tắc bắt buộc:

- Giữ kiến trúc token 3 lớp (src/styles/tokens.css, theme.css). KHÔNG đổi tên/xoá token,
  KHÔNG dùng Primitive token trực tiếp trong JSX — chỉ Semantic/Component token.
- Tái sử dụng component sẵn có trước khi viết mới:
  motion/ (MotionFadeIn, MotionPageTransition, MotionStaggerList/Item, MotionCountUp,
  MotionTilt, MotionParallaxLayer, RevealOnScroll),
  celebration/ (useCelebration, fireCelebration, MilestoneToast),
  illustrations/ (CelebrationBurst, VisionMapIllustration, WeeklyReviewIllustration, ...),
  ui/ (featured-card, spotlight-card, parallax-card, count-up, reveal, progress, interactive-surface).
- KHÔNG thêm dependency mới. KHÔNG đổi shape localStorage, logic core flow, autosave,
  billing/entitlement. KHÔNG dùng app-warm/terracotta ngoài Reflection.
- Giữ WCAG AA (light + dark). Mọi animation qua hook use-reduced-motion.
- Chỉ sửa file bằng edit tool, không heredoc/shell redirection.
- Mobile-safe (≤375px). Không vỡ test hiện có — nếu cần, sửa selector tối thiểu, không đổi logic.

Sau khi xong mỗi nhiệm vụ: chạy `npm run check`, báo lại file đã đổi + tóm tắt + kết quả lệnh + rủi ro.
Làm đúng phạm vi được giao, không refactor lan man.
```

---

## PHASE 0 — Nền tảng token (làm trước tiên)

```
Phase 0 của cuộc cải tổ. Chỉ làm nền tảng, KHÔNG đổi UI màn nào.

1. Thêm vào src/styles/tokens.css (Layer 2 Semantic), cả :root và html.dark:
   --grad-aspire, --grad-celebrate, --grad-vision, --grad-surface
   (lấy giá trị từ mục 3.1 của DESIGN_OVERHAUL_MASTER.md).
2. Đồng bộ sang Tailwind qua @theme inline nếu phù hợp; tạo utility class tiện dùng
   (vd bg-aspire/bg-vision) nếu dự án dùng cách này.
3. Rà soát 8 token life-area (--color-*-accent) đảm bảo đủ tương phản AA khi dùng làm
   nền chip/nhãn ở light & dark; chuẩn hoá cách dùng nhưng KHÔNG đổi giá trị nếu đang đạt.

Không sửa component màn hình. Chạy npm run check và báo lại.
```

---

## PHASE 1 — Khoảnh khắc cảm xúc (tác động cao nhất)

### 1A · Vision Board
```
Nâng cấp Vision Board (src/app/pages/VisionBoardEditor.tsx, VisionBoardGallery.tsx,
components trong app/components/visionBoard/).

- Nền khu trưng bày dùng --grad-vision (cảm giác phòng triển lãm tối, sang).
- Ảnh là nhân vật chính: dùng ui/aspect-ratio, bo radius-card, shadow-app-lg.
  Hover nâng nhẹ bằng parallax-card hoặc spotlight-card (ease-emphasized, 240ms).
- Mỗi item gắn nhãn life-area theo đúng màu life-area tương ứng.
- Empty state: VisionMapIllustration + lời mời truyền cảm hứng (dùng empty-states/narratives.ts).
- Lưới responsive, mobile-safe.

Giữ logic lưu/sửa ảnh nguyên vẹn. Verify, báo lại.
```

### 1B · Achievements + ăn mừng milestone
```
1. Achievements (src/app/pages/Achievements.tsx): badge dùng --grad-celebrate +
   --shadow-glow-success; số liệu dùng count-up/MotionCountUp; lưới badge dùng
   MotionStaggerList/Item; khi mở khoá badge dùng CelebrationBurst.
2. Ăn mừng milestone lớn: dùng useCelebration + fireCelebration + MilestoneToast khi:
   - hoàn thành một tuần trong 12-Week (src/app/pages/GoalTracker.tsx, TwelveWeekSystemSections.tsx),
   - đạt một mục tiêu,
   - lập xong kế hoạch 12 tuần (12WeekSetup).
   KHÔNG bắn confetti ở mỗi lần tick task lẻ — chỉ milestone lớn.

Tôn trọng use-reduced-motion. Verify, báo lại.
```

### 1C · Weekly Review summary
```
Trong Reflection/Review (src/app/pages/ReflectionJournal/), thêm phần mở đầu Weekly Review
"Tuần này bạn đã làm được": số task hoàn thành + % tiến độ bằng MotionCountUp,
kèm WeeklyReviewIllustration, đặt TRƯỚC phần viết reflection.

Đây là vùng Warm/Reflection — ĐƯỢC dùng app-warm/terracotta và --grad-celebrate.
Prompt reflection dùng font-serif. Streak hiển thị nổi bật.
Giữ logic draft/streak/autosave nguyên vẹn. Verify, báo lại.
```

---

## PHASE 2 — Luồng chính

### 2A · Onboarding
```
Làm lại Onboarding (src/app/pages/Onboarding/Onboarding.tsx) theo docs/DESIGN_UPLIFT_BRIEF.md:
hero --grad-aspire + tiêu đề serif lớn (affirmation) + step-indicator 4 bước +
chip life-area nhiều màu (đúng 8 token life-area) + CTA accent + dòng "không cần đăng nhập".
Chuyển bước mượt bằng MotionPageTransition/MotionFadeIn.
Giữ logic onboarding/autosave. Verify, báo lại.
```

### 2B · Life Balance + Life Insight
```
1. Life Balance (src/app/pages/LifeBalance.tsx): làm DashboardLifeAreaRadar/SimpleRadarChart
   thành nhân vật chính; mỗi lĩnh vực dùng màu life-area riêng; danh sách dùng MotionStaggerList.
2. Life Insight (src/app/pages/LifeInsight/): trình bày insight như "khoảnh khắc nhận ra" —
   câu chốt bằng font-serif, RevealOnScroll, dùng màu life-area để liên kết dữ liệu Life Balance.
Giữ logic tính toán/dữ liệu nguyên vẹn. Verify, báo lại.
```

### 2C · Dashboard
```
Nâng cấp Dashboard (src/app/pages/Dashboard.tsx) — GIỮ Calm Productivity, không loè loẹt:
- Metric chính dùng count-up/MotionCountUp.
- Tiến độ dùng progress ring fill --grad-aspire (tạo component ring nếu chưa có,
  đặt trong ui/, dùng token, không thêm lib).
- Một featured-card điểm nhấn: mục tiêu tuần này hoặc câu động lực qua MotivationalReminder.
Không thêm hiệu ứng nền/gradient toàn trang. Verify, báo lại.
```

### 2D · SMART Goal — Aspirational Vision
```
Trong SMART Goal Setup (src/app/pages/SMARTGoalSetup/), giữ form sạch theo từng bước,
nhưng nâng phần Aspirational Vision (AspirationalVision.tsx) thành điểm nhấn cảm xúc:
tiêu đề serif lớn, có thể bọc trong featured-card, thêm illustration phù hợp.
Phần nhập SMART giữ calm. Verify, báo lại.
```

---

## PHASE 3 — Hoàn thiện

### 3A · Khung chung & navigation
```
- Chuẩn hoá PageShell.tsx/RootLayout.tsx: MotionPageTransition nhất quán, spacing section,
  max-width thống nhất.
- Navigation/sidebar: trạng thái active rõ bằng accent; mobile bottom-nav dùng token --z-bottom-nav.
- CoreFlowProgress.tsx: làm thanh tiến độ luồng chính nổi bật hơn.
Verify, báo lại.
```

### 3B · Typography hero & empty/loading states
```
- Áp thang typography hero (text-display/4xl + font-serif) cho heading các màn cảm xúc
  theo mục 6 DESIGN_OVERHAUL_MASTER.md. Body giữ font-sans.
- Thay mọi màn trống bằng illustrations/ phù hợp + narratives.ts; loading dùng ui/skeleton.
Verify, báo lại.
```

### 3C · Billing / Login (đụng nhẹ)
```
- BillingPlan.tsx + UpgradePaywallDialog.tsx: dùng featured-card cho gói đề xuất +
  BillingPlusIllustration; giữ rõ ràng, không cường điệu. Mock upgrade phải an toàn demo công khai.
- LoginPage.tsx: hero nhẹ --grad-aspire; nhớ đăng nhập KHÔNG bắt buộc ở demo.
Không đổi logic billing/entitlement. Verify, báo lại.
```

---

## PHASE 4 — QA tổng (làm cuối)

```
QA toàn bộ cuộc cải tổ giao diện:
1. Kiểm tra tương phản WCAG AA mọi text/control ở CẢ light & dark mode; liệt kê chỗ chưa đạt và sửa.
2. Bật prefers-reduced-motion, xác nhận mọi animation tắt/giảm đúng.
3. Kiểm tra mobile ≤375px: không vỡ layout, không tràn, bottom-nav đúng.
4. Chạy: npm run check; npm run qa:visual-ux-ui (nếu được); npm run smoke:mvp1.
5. Chụp screenshot before/after các màn chính.
Báo lại: danh sách vấn đề tìm thấy, đã sửa gì, còn rủi ro gì.
```
