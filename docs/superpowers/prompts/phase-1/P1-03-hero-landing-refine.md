# P1-03 — Hero Landing Page Premium Refine

## Mục tiêu

Tinh chỉnh hero section của trang `/` để cảm giác premium hơn (kiểu Linear / Stripe / Vercel) nhưng GIỮ vibe Calm Productivity + Warm Reflective. Hero hiện tại đã có mockup, nhưng layout, hierarchy, balance có thể cải thiện rõ.

## Context dự án

- Domain: `https://dearourfuture.io.vn`.
- Brand: forest green `#2F5D50` (accent), terracotta `#D97757` (warm), off-white `#FAF8F5` (bg).
- Heading font: Source Serif 4 (variable).
- Body font: Be Vietnam Pro.
- Đối tượng: bạn trẻ 16–30 tuổi Việt Nam, làm planning 12 tuần.
- Tone copy: thân, không marketing aggressive, hứa hẹn đủ thôi.

## Scope file

- `src/app/components/landing/*.tsx` (đọc & sửa hero component)
- `src/app/components/landing/HeroSection.tsx` (nếu tên này) — file chính
- `src/app/components/landing/HeroMockup.tsx` (nếu tên này)
- `src/styles/theme.css` (chỉ thêm utility nếu cần, KHÔNG đổi token)

Cách tìm file hero: search `'Một chỗ tĩnh'` hoặc `'12 tuần'` hoặc `hero` trong `src/app/components/landing/`.

KHÔNG sửa:
- Auth / routing.
- Footer / header.
- Bất cứ trang khác `/`.

## Yêu cầu kỹ thuật

### 1. Layout

Desktop ≥ 1024px:

- 2 cột: trái 55% (copy + CTA), phải 45% (mockup).
- Min-height hero ~ 80vh (không 100vh — chừa header).
- Align center vertical.
- Gap giữa 2 cột: 48px (`gap-12`).

Mobile < 768px:

- 1 cột, mockup xuống dưới copy.
- Mockup width 100% nhưng max-width 360px, căn giữa.
- Padding trên hero `pt-12` (48px) sau header.

### 2. Copy hierarchy (KHÔNG đổi nội dung — chỉ đổi cấu trúc)

- Eyebrow label nhỏ (`text-xs uppercase tracking-[0.18em] text-app-accent`) — nếu chưa có, thêm "Hệ thống 12 tuần · Local-first".
- H1 serif `text-4xl md:text-display` weight 500, max 2 dòng desktop.
- Sub copy `text-base md:text-lg text-app-ink-soft` max 2 dòng, max-width `60ch`.
- 2 CTA: primary "Bắt đầu miễn phí" (accent fill), secondary "Xem 12-week-system hoạt động" (outline / ghost).
- Trust line nhỏ dưới CTA: `text-xs text-app-ink-muted` — "Không cần đăng ký · Local-first · Hoạt động trên mọi thiết bị".

### 3. Mockup

- Khung mockup: `rounded-2xl border border-app-line bg-app-surface shadow-3`.
- Nội dung mockup: snapshot "Today V2" hoặc "12-week system" — preview card thật, không placeholder lorem.
- Có thể tilt nhẹ 1–2° (`rotate-1` hoặc `-rotate-1`) nhưng KHÔNG hover-tilt 3D.
- Mobile: tilt = 0 (`rotate-0`).
- Nếu chưa có mockup, dùng screenshot tĩnh từ `/public/og/` hoặc tạo component nhẹ — KHÔNG mount logic thực.

### 4. Background

- Background `bg-app-bg`.
- Optional: 1 lớp gradient cực nhẹ dưới hero (`from-app-warm-soft/30 to-transparent`) để mềm chuyển section.
- KHÔNG mesh gradient phức tạp, KHÔNG blur orb, KHÔNG noise texture.

### 5. Motion

- Khi vào view: fade + translate-y nhẹ 8px, 360ms, ease standard, ONCE (không lặp).
- Reduced motion: bỏ animation, hiện instant.
- KHÔNG parallax, KHÔNG scroll-driven.

## Acceptance Criteria

- [ ] Hero desktop 2 cột, mobile 1 cột — responsive đúng.
- [ ] H1 không wrap > 2 dòng ở 1440px width.
- [ ] CTA primary có focus ring visible, click target ≥ 44px.
- [ ] Mockup tilt 1–2° desktop, 0° mobile, không hover-tilt 3D.
- [ ] Reduced-motion: hero không animate.
- [ ] Lighthouse a11y trên `/` ≥ 95.
- [ ] CLS hero ≤ 0.05 (mockup không nhảy khi load).
- [ ] Light + dark mode đều đẹp.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Visual:

1. Mở `/` desktop 1440px → hero cân.
2. Resize 1024 → 768 → 414 → 360 → không vỡ.
3. DevTools toggle reduced-motion → hero hiện instant.
4. Toggle dark mode → mockup vẫn rõ, không "trắng nhức".
5. Tab keyboard từ đầu page → focus đi qua H1 → CTA primary → CTA secondary đúng thứ tự.

## Không làm

- KHÔNG đổi copy / wording.
- KHÔNG thêm video / lottie / animation lớn.
- KHÔNG thay đổi route / logic auth.
- KHÔNG đổi color token.
- KHÔNG thêm dependency mới.
- KHÔNG đổi favicon / OG image.

## Ghi chú khi trả kết quả

- Trước/sau screenshot (desktop + mobile, light + dark).
- File đã sửa.
- Lighthouse score `/` (a11y, BP, SEO, Perf).
- Risk còn lại nếu có.
