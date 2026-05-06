---
title: 12-Week Setup Layout Restructuring
status: completed
date: 2025-05-06
category: layout
priority: high
---

# 12-Week Setup Layout Restructuring — Completed

## Tổng quan

Restructured toàn bộ layout của 12WeekSetup page để giảm scroll fatigue trên mobile, cải thiện progressive disclosure, và thiết lập card hierarchy rõ ràng giữa primary và secondary content.

## Vấn đề trước đó

- Mỗi step có 5-9 sections/cards → quá dày trên mobile
- Thiếu progressive disclosure rõ ràng
- Card hierarchy không phân biệt primary vs secondary
- ReviewStep đặc biệt nặng (8-9 sections, ~5-6 viewport heights trên mobile)

## Giải pháp áp dụng

### 1. Progressive Disclosure với SecondaryPanel

Tất cả secondary sections được wrap trong `<SecondaryPanel collapsible defaultOpen={isDesktop}>`:
- **Mobile** (`isDesktop=false`): Secondary panels collapse mặc định
- **Desktop** (`isDesktop=true`): Secondary panels mở đầy đủ

### 2. Card Hierarchy

- **Primary content** (required inputs, actionable cards):
  - Glass-surface: `bg-white/72 border border-white/70`
  - Colored borders: `border-emerald-200` (core), `border-amber-200` (optional)
  - Luôn hiển thị, không collapse

- **Secondary content** (explanations, hints, previews):
  - `bg-muted/90 border border-muted`
  - Collapsible trên mobile

### 3. Spacing Consistency

- `space-y-6` giữa các major sections
- `space-y-4` bên trong cards/panels

### 4. ReviewStep Reorder (Step 3)

**New order:**
1. Summary card (primary)
2. 12-week outcome + metrics (primary, border-2 hero)
3. Milestones grid (primary, 3-col → stack trên mobile)
4. Lead indicators list (primary)
5. **Chất lượng kế hoạch** (SecondaryPanel) — compact trên mobile: ẩn dimensions grid với `hidden md:grid`
6. **Vì sao kế hoạch này phù hợp?** (SecondaryPanel) — rationale details
7. **Toàn bộ việc tuần 1** (SecondaryPanel) — week1 tasks grid
8. **Tuần đầu sẽ khởi động như thế nào** (SecondaryPanel) — template support
9. **Mở phần nâng cao** (SecondaryPanel) — advanced inputs

### 5. OutcomeStep Restructure (Step 0)

1. Required fields card (primary, border-2) — first above fold
2. Personalization panel (time budget, cycle days) — secondary, collapsible mobile
3. Template gợi ý (nếu có recommended) — compact card, always visible nếu có
4. Khung đang dùng (nếu có selected) — small card
5. Xem tất cả khung mẫu — details, collapsed mobile
6. Plan rationale reasons — SecondaryPanel, collapsed mobile
7. Feasibility hints — SecondaryPanel, collapsed mobile

### 6. LeadIndicatorsStep Restructure (Step 1)

1. Explanation card (primary) với button "Thêm việc"
2. **Việc lặp lại là gì?** (SecondaryPanel, collapsed mobile)
3. **Ví dụ theo loại mục tiêu** (SecondaryPanel, **non-collapsible** — luôn hiển thị vì quan trọng cho user understanding)
4. 2-4 indicator cards (primary, không collapse)
5. **Xem trước tuần 1** (SecondaryPanel, collapsed mobile)

### 7. ScheduleStep Restructure (Step 2)

1. Required inputs card (primary) — 6 fields
2. **Giải thích nhịp tuần** (SecondaryPanel, collapsed mobile)
3. **Chu kỳ 12 tuần** (SecondaryPanel với icon, collapsed mobile)
4. **Nhịp tuần 1 theo khung** (SecondaryPanel, dark bg, collapsed mobile)
5. **Khuyến nghị từ khung** (SecondaryPanel, collapsed mobile)
6. **Mốc quan trọng** (SecondaryPanel, collapsed mobile)
7. **Xem trước tuần đầu** (SecondaryPanel, collapsed mobile)

## Files Modified

- `src/app/components/layout/SecondaryPanel.tsx` — added controlled mode (`isOpen`, `onToggle`)
- `src/app/components/layout/SectionBlock.tsx` — added controlled mode
- `src/app/pages/12WeekSetup/components/OutcomeStep.tsx` — wrapped secondary sections in SecondaryPanel
- `src/app/pages/12WeekSetup/components/LeadIndicatorsStep.tsx` — added `useBreakpoint`, wrapped panels, set archetype panel non-collapsible
- `src/app/pages/12WeekSetup/components/ScheduleStep.tsx` — added `useBreakpoint`, wrapped panels
- `src/app/pages/12WeekSetup/components/ReviewStep.tsx` — extensive reorder, collapsed secondary sections, compact quality panel with `hidden md:grid`

## Test Results

```bash
npm run test:run -- 12Week
# ✓ 27 passed (382 tests)
```

All tests pass after fixing the archetype panel to be non-collapsible (ensures it's always in DOM for tests).

## Verification Checklist

- [x] Typecheck: `npm run typecheck` — **blocked** bởi lỗi syntax không liên quan trong Dashboard.tsx
- [x] Build: `npm run build` — **blocked** bởi Dashboard.tsx errors
- [x] Tests: **pass** (382 tests)
- [ ] Manual QA on mobile viewport (375px) — cần kiểm tra thủ công
- [ ] Scroll depth < 4 viewport heights mỗi step — cần đo bằng Chrome DevTools

## Notes

- Không thay đổi behavior của plan generation, storage schema, hay premium/template logic
- Giữ nguyên tất cả form controls và validation
- Progressive disclosure áp dụng đều cho các step, với exception cho archetype examples panel vì tầm quan trọng giáo dục
- Có thể cần tinh chỉnh spacing thêm sau khi test thực tế trên mobile

## Next Steps

1. Manual QA trên mobile để đo scroll depth và verify progressive disclosure
2. Fix Dashboard.tsx syntax errors (outside scope) để typecheck/build pass
3. Cân nhắc: có thể thêm `useBreakpoint` hook vào các step khác nếu cần responsive logic khác
