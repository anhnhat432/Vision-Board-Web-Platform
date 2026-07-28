# Dashboard UI Upgrade — Spec

> Nâng cấp giao diện Dashboard signed-in (visual + bento density + motion),
> giữ tinh thần Forest Green + serif editorial + bento + calm motion.
> Phạm vi: thuần UI. Không đổi storage/sync/auth/billing/entitlement.

## Mục tiêu

WHEN user signed-in mở `/` THE system SHALL render DashboardActiveLayout
với typography hierarchy nhất quán, card radius theo token, palette qua
semantic token, bento cân bằng cột, motion nhẹ respect reduced-motion.

## Phạm vi & phân loại

| Phase | Surface | Risk | Files |
|---|---|---|---|
| 1 Typography | Shell | Low | 9 v2 card + NextBestAction |
| 2 Radius/surface | Shell | Low | 9 v2 + FreeGoalLimitCard + DashboardHero + RescueAlert |
| 3 Palette literal | Shell | Low | WeekRhythmCard (+BalanceCard) |
| 5 Motion | Mixed | Low-Med | theme.css + DashboardHero + ActiveGoalsCard + WeekRhythmCard |
| 4 Bento density | Mixed | Med | dashboardWidgetLayout.ts + Dashboard.tsx + DashboardHero + test |
| 6 Declutter | Shell | Low | Dashboard.tsx (FreeGoalLimitCard) |

Không đổi: `group`/`priority` widget, storage keys, sync, auth, billing,
entitlement, route registration, copy ngữ nghĩa demo/real.

## Bằng chứng audit (đo thực trên DOM, 2026-07-15)

### Typography
- h2 card: "Việc hôm nay"/"Mục tiêu chu kỳ"/"Nhịp tuần 4" = Be Vietnam 13px/800
  uppercase; "Phân tích & nhịp độ" = Bricolage 20px serif; khác nữa → 3 kiểu.
- h3: goal 15px/700 Be Vietnam vs "Lá Bài Trí Tuệ" 18px/700 Bricolage.
- Caption eyebrow 10–11px uppercase tracking → chuẩn, giữ.

### Card radius (token: card=18px, card-lg=22px)
- FreeGoalLimit 16, TodayMiniCard/ActiveGoals/WeekRhythm 20, DashboardHero 26,
  RescueAlert/NextBestAction 18 → 5 giá trị lộn xộn.

### Palette literal
- WeekRhythm KPI "Chuỗi": `bg-[#FFEDE8] text-[#FF5C3E]` literal.
- WeekRhythm bar fill: `#C6F24E`, `#0C5E3A`, `rgba(12,94,58,0.4)` literal.
- RescueAlert bg `rgb(255,252,232)` cream tự chế.

### Contrast (toàn OK AA)
- `lime #c6f24e trên trắng = 1.30` (fail) — lime đang làm fill bar "hôm nay"
  trên cream `bg-app-bg-subtle` → gần vô hình. Phase 3 đổi sang accent.

### Bento density (mobile 390px)
- Section "Phân tích & nhịp độ" cao 2201px → quá dài, mặc định mở cả mobile.
- Hero mobile 696px. Desktop core grid `626/324` gap 18 — cột trái Today
  cao hơn rõ cột phải → mất cân bằng.

### Motion
- appear-fade-up + CountUp + TodayMiniCard badge spring đã tốt.
- prefers-reduced-motion xử lý đúng (theme.css:3130).
- Thiếu: hover lift không nhất quán, progress bar không entrance, hero quote
  tĩnh không fade.

## Acceptance (EARS)

### Phase 1 — Typography
- Giữ tinh thần eyebrow-uppercase cho card title (không ép thêm serif title).
- WHEN render v2 card header THE system SHALL dùng eyebrow thống nhất:
  `text-xs font-extrabold uppercase tracking-[0.14em] text-app-ink` với icon
  `text-app-accent` (TodayMiniCard đổi từ `text-app-accent` sang ink+accent icon
  để đồng bộ với ActiveGoals/WeekRhythm/Balance/Trend).
- WHERE card subtitle THE system SHALL dùng `text-[12px] leading-relaxed
  text-app-ink-soft` (unify 10.5px/12.5px hiện tại).
- WHERE h3 goal title trong ActiveGoalsCard THE system SHALL giữ `text-sm
  font-bold`; DailyStoicCard h3 serif giữ nguyên (flip-card context khác).
- ReflectionPrompt giữ warm serif (warm context, không đổi token).

### Phase 2 — Radius/surface
- WHERE card thường THE system SHALL dùng `rounded-card` (18px); WHERE
  hero/featured THE system SHALL dùng `rounded-card-lg` (22px).
- WHERE RescueAlert THE system SHALL dùng `bg-app-status-warning/10` (amber
  tint) thay cream tự chế; giữ copy "cứu nhịp".

### Phase 3 — Palette
- WHERE WeekRhythm KPI/brushử literal `#…` THE system SHALL thay bằng
  `var(--app-*)` token: `bg-app-energy/10 text-app-energy`, bar fill
  `var(--app-accent)` / `var(--app-accent-active)` / `accent/40`.
- WHERE today bar/dot trên nền sáng THE system SHALL dùng `--app-accent`
  (không lime-on-cream tỷ lệ 1.3). Empty dot neutral giữ literal (decorative).
- BalanceCard per-area colors (amber/red/blue editorial) giữ nguyên — contrast
  OK, đổi sẽ phá tinh thần palette editorial.

### Phase 5 — Motion
- WHEN hover glass card THE system SHALL lift `-translate-y-0.5` nhất quán.
- WHEN mount progress bar THE system SHALL animate width 0→target.
- WHEN hero quote đổi THE system SHALL fade (AnimatePresence).
- WHILE `prefers-reduced-motion: reduce` THE system SHALL tắt animation mới.

### Phase 4 — Bento
- Column reassign đã thử (lead=today+next_action) nhưng re-audit cho thấy mất
  cân bằng nặng hơn (left 587 vs right 246) → REVERT, giữ layout gốc (lead=today,
  stack=next_action+active_goals+reflection) vì gốc cân bằng hơn.
- WHEN mobile THE system SHALL mặc định thu gọn "Phân tích & nhịp độ"
  (`getInitialSecondaryInsightsOpen` trả false mobile bất kể stored value, để
  tránh localStorage "true" từ desktop làm mobile mở — giảm ~2000px cuộn).

### Phase 6 — Declutter
- WHERE FreeGoalLimitCard trên đầu THE system SHALL slim (pill gọn) giảm
  clutter; giữ thông điệp 3/3 + nút Mở Plus.

## Thứ tự thực thi

1 → 2 → 3 → 5 → 4 → 6. Motion trước bento (motion không động layout).
Re-audit sau mỗi 2 phase bằng Playwright computed-style.

## Verify

- Sau mỗi phase: `npm run typecheck && npm run lint && npm run test:run`.
- Phase 4/5 thêm `npm run build`.
- Giữ `dashboardWidgetLayout.test.ts` xanh (cập nhật assertion thứ tự cột nếu
  phase 4 làm test cũ fail — đó là cập nhật test có chủ đích, không revert code).

## Rủi ro

- Phase 4 đổi `column` → test `dashboardWidgetLayout.test.ts` có thể assert thứ
  tự cột cũ → cập nhật test có chủ đích.
- Phase 2 RescueAlert cream→amber: giữ copy, chỉ đổi nền.
- Worktree dirty: không revert thay đổi user.
- Không đọc được ảnh → re-audit dùng accessibility snapshot + computed-style.
