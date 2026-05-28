# Phase 1 — Foundation + Polish

Mục tiêu: nâng chất lượng cảm nhận (perceived quality) toàn site lên mức Linear / Vercel / Stripe trong khi vẫn giữ vibe **Calm Productivity + Warm Reflective** của Dear Our Future.

Phạm vi: **public site (/, /login, /billing/plan, /terms, /privacy, /refund-policy, /billing/faq) + app sau login (Dashboard, Today, Plan, Review, Progress, Vision Board, Settings, Goals)**.

Phase 1 KHÔNG bao gồm: animation lớn, scroll-driven motion, 3D, parallax, marketing-style decorative effects. Những thứ đó thuộc Phase 2/3.

## Nguyên tắc xuyên suốt

1. **Tokens trước, không hardcode**: dùng `--app-*`, `--duration-*`, `--ease-*`, `--shadow-*`, `--z-*`, `--text-*` có sẵn ở `src/styles/tokens.css` + `src/styles/theme.css`.
2. **Calm trước, snappy sau**: motion 120–240ms, ease standard. Không bounce, không overshoot quá đà.
3. **Mobile-first**: tất cả thay đổi phải pass mobile 360px → desktop 1440px.
4. **A11y luôn AA**: contrast 4.5:1, focus visible, keyboard reachable.
5. **Không phá storage**: không đổi key, shape, hoặc normalization của localStorage.
6. **Không phá test**: chạy `npm run typecheck && npm run lint && npm run test:run` sau mỗi prompt.

## Danh sách 10 prompt nhỏ

| # | File | Chủ đề | Độ ưu tiên | Có thể song song với |
|---|------|--------|------------|----------------------|
| 01 | `P1-01-typography-rhythm.md` | Typography scale, line-height, font-weight | P0 | 02, 05 |
| 02 | `P1-02-spacing-grid-system.md` | Section gap, padding, 8pt grid | P0 | 01, 05 |
| 03 | `P1-03-hero-landing-refine.md` | Hero `/` premium look | P1 | 04, 06 |
| 04 | `P1-04-button-link-microinteractions.md` | Hover/press/focus subtle | P0 | 03, 06, 08 |
| 05 | `P1-05-focus-keyboard-a11y.md` | Focus ring, skip link, kbd nav | P0 | 01, 02 |
| 06 | `P1-06-form-input-polish.md` | Forms login/billing/onboarding | P1 | 03, 04 |
| 07 | `P1-07-dark-mode-audit.md` | Dark mode toàn site | P1 | 08, 09 |
| 08 | `P1-08-card-surface-polish.md` | Card depth, border, hover | P1 | 04, 07 |
| 09 | `P1-09-empty-loading-states.md` | Empty + skeleton + loading | P2 | 07, 10 |
| 10 | `P1-10-app-navigation-polish.md` | Sidebar, header, bottom nav | P1 | 09 |

## Thứ tự đề xuất chạy

1. **Wave 1 (foundation, không phụ thuộc)**: P1-01, P1-02, P1-05 → chạy song song.
2. **Wave 2 (component-level)**: P1-04, P1-07, P1-08 → chạy song song sau wave 1.
3. **Wave 3 (feature-level)**: P1-03, P1-06, P1-10 → chạy song song sau wave 2.
4. **Wave 4 (final pass)**: P1-09 → chạy cuối.

**Lưu ý chạy song song**: tránh để 2 prompt cùng sửa 1 file. Nếu trùng, chạy tuần tự. Đặc biệt `src/styles/theme.css`, `src/styles/tokens.css`, `RootLayout.tsx`, `BottomNavigation.tsx` rất dễ conflict.

## Verification chung sau mỗi wave

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Verification UX/UI:

```bash
npm run qa:visual-ux-ui
npm run smoke:mvp1
```

Sau wave 4, chạy thêm Lighthouse a11y + Best Practices trên `https://dearourfuture.io.vn` và `/billing/plan` để confirm contrast/focus/keyboard nav.

## Cách giao prompt cho AI khác

Mỗi file prompt là self-contained: copy nguyên nội dung → paste vào Claude/Cursor/Codex → AI có đủ context để hoàn thành mà không cần hỏi thêm. Nếu AI hỏi, kiểm tra prompt có thiếu file path / acceptance criteria không.
