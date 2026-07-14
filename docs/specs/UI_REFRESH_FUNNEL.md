# Feature Spec: UI Refresh — Funnel Core + CSS Debt Cleanup

## 1. Context & Goal

- Feature / bug: Nâng cấp giao diện đồng nhất funnel core + dọn nợ styling nền.
- Why now: `theme.css` còn utility/token cũ lệch hệ forest-green; funnel core không nhất quán (max-width, hero/step shell, inline hex, button thô).
- User impact: Trải nghiệm đọc dễ hơn, giao diện đồng nhất; không đổi hành vi hoặc dữ liệu.
- Modes affected: both (`real` + `demo`).

## 2. Surface Classification

- Type: `Mixed` (chủ yếu Shell/CSS; chạm `AppShellLayout` khi gỡ `data-route-tone`).
- Touched domains: styling tokens, funnel page layout, shared UI shell.
- Existing invariants that must not break:
  - Không đổi tên/shape localStorage key.
  - Không đổi route registration hoặc app-mode gating.
  - Dark mode + reduced-motion vẫn hoạt động.
  - Terracotta chỉ dùng Reflection; forest-green cho Execution.

## 3. Actors & Entry Points

- Primary actor: end user đi qua funnel.
- Secondary actor(s): không.
- Route(s): `/onboarding`, `/life-balance`, `/life-insight`, `/smart-goal`, `/feasibility`, 12-week `setup`+`system`, `/reflection`.
- API / hook / store touchpoints: `src/styles/theme.css`, `src/styles/tokens.css`; `AppShellLayout.tsx` (route-tone); funnel pages + `WizardHero`/`PageShell`/step shell.

## 4. Functional Requirements

1. `WHERE một class/token đã 0-consumer (đã grep xác nhận), THE system SHALL xoá an toàn không ảnh hưởng trang khác.`
2. ~~`WHEN render bước funnel, THE system SHALL dùng max-width md thống nhất và shell dùng chung.`~~ **MOOT (Phase 2):** rà soát cho thấy toàn bộ trang funnel là layout 2-cột (Onboarding, LifeInsight, LifeBalance, ReflectionJournal grid 2-cột; FeasibilityCheck grid 12-cột; SMARTGoalSetup hero+step). Theo quyết định user, các trang 2-cột GIỮ width hiện tại (xl/hero), chỉ trang single-column mới ép `md` — mà funnel không có trang nào single-column. Do đó không đổi `maxWidth` nào.
3. `WHERE JSX funnel còn hex hardcode, THE system SHALL thay bằng token semantic (app-accent, v.v.).`
4. ~~`WHERE có button hoặc motion.button thô, THE system SHALL thay bằng ui/button.`~~ **INTENTIONAL SKIP (user-approved):** các `motion.button` trong FeasibilityStepShell/ResultStep đã dùng token semantic đầy đủ (`bg-app-accent`, `hover:bg-app-accent-hover`, focus-ring, disabled states), đã accessible (`min-h-11`, `focus-visible:ring`, `aria-describedby`), và có framer-motion (`whileHover`/`whileTap`) + layout flex đặc thù. Swap sang `ui/button` là cosmetic-only, rủi ro regress motion/layout, giá trị thấp. Giữ nguyên.
5. `WHILE ở dark mode hoặc prefers-reduced-motion, THE system SHALL giữ nguyên tương phản và không gây motion vỡ.`

## 5. Data, Storage, and Sync Constraints

- localStorage keys / shapes touched: không.
- migration or normalization needed: không.
- backend models or API contracts touched: không.
- sync ordering guarantees: không liên quan.
- rollback / restore concerns: chỉ thay đổi CSS/JSX layout, revert bằng git.

## 6. Non-functional Requirements

- performance / latency: giảm CSS chết, không tăng bundle.
- accessibility: giữ focus ring + contrast; button chuẩn hoá tăng a11y.
- observability / logging: không đổi.
- security / privacy: không liên quan.

## 7. Out of Scope

- Admin (13 trang), billing, dashboard/landing, legal.
- Đổi brand, màu, hoặc font.
- Refactor logic funnel (chỉ layout/style).

## 8. Acceptance Criteria

- [x] ~~Funnel core dùng max-width md + shell chung~~ **MOOT** — tất cả trang funnel là 2-cột, giữ width hiện tại (xem FR2).
- [x] `theme.css`/`tokens.css` hết tone/vivid-cyan/token trùng/shadow xung đột/class mồ côi (Phase 1).
- [x] Không còn green-accent hex hardcode trong funnel JSX đã liệt kê (LifeBalance, Onboarding) — swap sang token `app-accent`, sửa luôn bug dark mode bị ép xanh sáng. Hex nâu/terracotta/per-area/score-status GIỮ (chủ đích, ngoài hệ accent).
- [ ] Button funnel dùng `ui/button` — CHƯA làm (motion.button trong FeasibilityStepShell/ResultStep vẫn còn).
- [x] Dark mode + reduced-motion ok — swap dùng CSS var/token có dark override; không đổi motion.
- [x] real-mode vs demo-mode không đổi hành vi — chỉ đổi CSS/style, không đụng route/gating.

## 9. Verification Plan

Commands to run:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Thêm: kiểm tra trực quan funnel light/dark.

## 10. Open Questions / Follow-ups

- Nợ nền ngoài funnel (glass/spotlight/product-visual) có xoá luôn nếu 0-consumer? (đề xuất: có, xác nhận sau grep).
- Có cần snapshot/visual test cho funnel không?
