# P2-08 — Dialog, Sheet, Toast, Popover Entrance Refinement

## Mục tiêu

Tinh chỉnh entrance/exit của các overlay: dialog (modal), sheet (drawer), toast, popover, tooltip. Hiện tại Radix mặc định đã ok, nhưng có thể polish thêm timing, easing, và scale curve để cảm giác premium.

## Tiền điều kiện

- P2-01 đã xong (token motion).

## Context dự án

- Đang dùng Radix UI primitives (`@radix-ui/react-dialog`, `react-popover`, `react-tooltip`).
- Toast: `sonner` library.
- File: `src/app/components/ui/dialog.tsx`, `sheet.tsx`, `popover.tsx`, `tooltip.tsx`, `sonner.tsx`.

## Scope file

- `src/app/components/ui/dialog.tsx`
- `src/app/components/ui/sheet.tsx`
- `src/app/components/ui/popover.tsx`
- `src/app/components/ui/tooltip.tsx`
- `src/app/components/ui/sonner.tsx`
- `src/styles/theme.css` — keyframe override nếu cần.

KHÔNG sửa: Radix props, accessibility behavior (focus trap, esc), aria.

## Yêu cầu kỹ thuật

### 1. Dialog (modal center)

Entrance:
- Overlay: fade 240ms, ease-standard.
- Content: fade + scale 0.96 → 1, translate-y 4px → 0, duration 240ms, ease-decelerate.

Exit:
- Overlay: fade 180ms, ease-accelerate.
- Content: fade + scale 1 → 0.98, duration 180ms.

CSS (data-state attribute Radix):

```css
[data-radix-dialog-overlay][data-state="open"] {
  animation: overlay-in var(--duration-base) var(--ease-standard);
}
[data-radix-dialog-overlay][data-state="closed"] {
  animation: overlay-out var(--duration-fast) var(--ease-accelerate);
}
[data-radix-dialog-content][data-state="open"] {
  animation: dialog-in var(--duration-base) var(--ease-decelerate);
}
[data-radix-dialog-content][data-state="closed"] {
  animation: dialog-out var(--duration-fast) var(--ease-accelerate);
}

@keyframes overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes overlay-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes dialog-in {
  from { opacity: 0; transform: translate(-50%, calc(-50% + 4px)) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes dialog-out {
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to   { opacity: 0; transform: translate(-50%, -50%) scale(0.98); }
}
```

### 2. Sheet (drawer trượt)

- Slide từ trái/phải/bottom tuỳ side.
- Mobile bottom sheet: slide-up 320ms, ease-decelerate.
- Desktop right sheet: slide-right 280ms, ease-decelerate.

```css
[data-radix-sheet-content][data-state="open"][data-side="bottom"] {
  animation: sheet-up var(--duration-medium) var(--ease-decelerate);
}
@keyframes sheet-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

### 3. Popover

- Pop từ trigger.
- Fade + scale 0.94 → 1, translate-y 4px theo side.
- Duration 180ms, ease-decelerate.

### 4. Tooltip

- Fast: 120ms fade.
- Không scale (tooltip nhỏ, scale gây flicker).
- Delay before show: 400ms (Radix mặc định).

### 5. Toast (sonner)

- Slide từ bottom-right (desktop) hoặc top-center (mobile).
- Spring nhẹ (ease-spring).
- Duration in 280ms, out 200ms.
- Stack: toast mới đẩy toast cũ lên 8px.

Cấu hình trong `sonner.tsx`:

```tsx
<Toaster
  position={isMobile ? "top-center" : "bottom-right"}
  expand={false}
  richColors
  closeButton
  duration={3000}
  toastOptions={{
    classNames: {
      toast: "...",
      title: "font-sans text-sm",
      description: "font-sans text-xs",
    },
  }}
/>
```

### 6. Backdrop blur (optional)

- Dialog overlay: `backdrop-blur-sm` (4px) — đã có hoặc thêm.
- KHÔNG blur quá nhiều (gây CPU mobile).
- Reduced motion: bỏ blur.

### 7. Reduced motion

- Tất cả overlay: bỏ scale + translate.
- Giữ fade ngắn (120ms).
- Bỏ slide từ side → fade.

### 8. Stacking

- Z-index theo token `--z-modal`, `--z-toast`, `--z-tooltip`, `--z-overlay` (đã có).
- Multiple dialog: dialog mới đè cũ, focus trap mới.

## Acceptance Criteria

- [ ] Dialog open: fade + subtle scale từ 0.96.
- [ ] Dialog close: nhanh hơn open.
- [ ] Sheet mobile bottom: slide-up smooth.
- [ ] Popover: fade + scale + translate nhẹ theo side.
- [ ] Tooltip: fade fast, không scale.
- [ ] Toast: slide-in spring nhẹ.
- [ ] Reduced motion: chỉ fade.
- [ ] Focus trap, esc, click outside vẫn work (Radix).
- [ ] Z-index không xung đột.
- [ ] Backdrop blur 4px (desktop), bỏ mobile để tiết kiệm GPU.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. Open AI assistant dialog → entrance smooth.
2. Settings → mở sheet → slide-up đẹp.
3. Hover button có tooltip → fade fast.
4. Save anything → toast slide-in.
5. Multiple toast → stack mượt.
6. Esc đóng dialog → exit fast.
7. Reduced motion ON → chỉ fade, không scale/slide.
8. Mobile sheet bottom → slide-up không lag.

## Không làm

- KHÔNG bouncy spring quá đà.
- KHÔNG dialog xoay 3D.
- KHÔNG toast với sound.
- KHÔNG override Radix accessibility.
- KHÔNG custom focus trap (giữ Radix).

## Ghi chú khi trả kết quả

- File đã sửa.
- Trước/sau timing cho mỗi overlay.
- Video demo dialog, sheet, toast.
- Reduced motion test.
- Risk còn lại.
