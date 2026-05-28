# Phase 2 — Motion & Delight

Mục tiêu: thêm **motion design** và **delight moments** một cách có kỷ luật, để site cảm giác "sống" và "có nhịp" như Linear / Vercel / Stripe, nhưng KHÔNG phá vibe **Calm Productivity + Warm Reflective**.

**Tiền điều kiện**: Phase 1 (Foundation + Polish) đã xong. Nếu chưa, motion sẽ "đắp lên" trên design lệch nhịp → hỏng nhiều hơn được.

## Triết lý motion cho dự án này

1. **Calm > Snappy**: ưu tiên ease-standard, ease-decelerate, không overshoot.
2. **120–360ms là vùng vàng**: nhanh hơn 120ms → cảm giác glitch; chậm hơn 360ms → cảm giác lag (trừ celebration moments).
3. **Reduced motion luôn được tôn trọng**: mọi animation phải có fallback static.
4. **Motion phục vụ ý nghĩa**: enter/exit, hierarchy change, state feedback. KHÔNG decorative-only.
5. **Mobile cẩn thận**: motion trên mobile tiêu pin + dễ janky. Test thật.

## Phạm vi Phase 2

- Public site + app sau login.
- Motion ở component-level (button, card, list) và page-level (route transition, scroll reveal).
- Delight moments: celebration, milestone, save success, achievement unlock.

**KHÔNG nằm trong Phase 2**: scroll-driven 3D, parallax marketing, sound effects, custom cursor, mascot AI advanced state. Những thứ đó cân nhắc cho Phase 3.

## Danh sách 10 prompt

| # | File | Chủ đề | Độ ưu tiên | Có thể song song với |
|---|------|--------|------------|----------------------|
| 01 | `P2-01-motion-design-system.md` | Token, hook, helper motion | P0 | — (chạy đầu) |
| 02 | `P2-02-route-page-transitions.md` | Page change fade/slide | P1 | 03, 09 |
| 03 | `P2-03-scroll-reveals-landing.md` | Section fade-up khi scroll | P1 | 02, 04 |
| 04 | `P2-04-hero-mockup-live-anim.md` | Hero mockup animate nội dung | P1 | 03 |
| 05 | `P2-05-counter-progress-anims.md` | Count-up + progress bar | P1 | 06, 09 |
| 06 | `P2-06-list-enter-exit-motion.md` | Item thêm/xoá animate | P1 | 05, 07 |
| 07 | `P2-07-drag-drop-polish.md` | Reorder task, vision board | P2 | 06 |
| 08 | `P2-08-overlay-entrance-refine.md` | Dialog/sheet/toast motion | P1 | 02 |
| 09 | `P2-09-theme-toggle-smooth.md` | Light/dark smooth swap | P2 | 02, 05 |
| 10 | `P2-10-celebration-moments.md` | Confetti, milestone subtle | P2 | 06 |

## Thứ tự đề xuất chạy

1. **Wave 1 (foundation)**: P2-01 — chạy đầu tiên, một mình. Tạo motion tokens + hooks chung.
2. **Wave 2 (component-level song song)**: P2-05, P2-06, P2-08, P2-09.
3. **Wave 3 (page-level song song)**: P2-02, P2-03, P2-04.
4. **Wave 4 (advanced)**: P2-07, P2-10.

**Lưu ý conflict**:
- P2-01 sửa `theme.css` + thêm hooks → mọi prompt sau dùng → chạy trước.
- P2-02 + P2-03 + P2-04 cùng đụng landing page → tốt nhất tuần tự, không song song.
- P2-05 + P2-06 đụng list/card UI → cẩn thận file overlap.

## Nguyên tắc kỹ thuật xuyên suốt

- Dùng **CSS animations** + **Framer Motion** (nếu đã có) hoặc View Transitions API.
- Mỗi animation dùng token `--duration-*` + `--ease-*` đã định ở `src/styles/theme.css`.
- Trigger `prefers-reduced-motion`:

  ```css
  @media (prefers-reduced-motion: reduce) {
    .my-anim { animation: none; transition: none; }
  }
  ```

- KHÔNG `setInterval` cho animation — dùng `requestAnimationFrame` hoặc CSS keyframes.
- Performance budget: 60fps trên Pixel 5 / iPhone 11. Test bằng DevTools Performance tab.
- Layout shift CLS ≤ 0.1 cho mọi page sau Phase 2.

## Verification chung sau mỗi wave

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Visual:

```bash
npm run qa:visual-ux-ui
```

Performance:
- Lighthouse Perf `/` ≥ 85 desktop, ≥ 75 mobile (Phase 2 không được hạ score quá 5 điểm so với Phase 1).
- Frame rate kiểm tra qua DevTools Performance recording → 60fps animation chính.

## Khi nào DỪNG Phase 2

Nếu sau Wave 1 + Wave 2 bạn cảm thấy "đã đủ sống", có thể dừng — không bắt buộc chạy hết 10. Phase 2 ưu tiên chất lượng hơn quantity.
