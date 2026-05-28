# P2-07 — Drag & Drop Polish

## Mục tiêu

Drag-and-drop (reorder task, vision board tile) phải feel premium: visual feedback rõ, drop zone highlight, không glitch. Cảm giác như Linear hoặc Notion.

## Tiền điều kiện

- P2-01 đã xong.
- P2-06 đã làm list enter/exit.

## Context dự án

- Library DnD: kiểm tra `package.json` xem có `@dnd-kit/core`, `react-beautiful-dnd`, hoặc HTML5 native.
- DnD áp dụng cho:
  - Today task reorder
  - 12-week-system task reorder
  - Vision board tile reorder
  - Goal priority reorder (nếu có)

## Scope file

- `src/app/pages/TodayV2/` — task reorder.
- `src/app/pages/VisionBoardEditor.tsx` — tile reorder.
- `src/app/pages/SMARTGoalSetup/` — nếu có drag step reorder.
- Component DnD wrapper hiện có.

KHÔNG sửa: business logic của save order.

## Yêu cầu kỹ thuật

### 1. Lib khuyến nghị

**@dnd-kit/core + @dnd-kit/sortable** (nếu chưa có thì cài):
- Pros: accessible (keyboard support), modular, modern.
- Cons: API hơi verbose.

Nếu đã có `react-beautiful-dnd` → giữ, không migrate (lib đã deprecated nhưng vẫn work).

### 2. Drag handle

- Mỗi item có handle icon (lucide `GripVertical`) bên trái hoặc phải.
- Handle: `text-app-ink-muted hover:text-app-ink cursor-grab active:cursor-grabbing`.
- Touch target ≥ 32×32 mobile.

### 3. Item state khi drag

Idle:
- Như cũ.

Hovered handle:
- Handle icon đậm hơn.

Dragging (active):
- `scale: 1.02`.
- `box-shadow: var(--shadow-4)`.
- `opacity: 0.92`.
- `z-index: var(--z-overlay)`.
- `cursor: grabbing`.

### 4. Drop zone

Khi đang drag, các vị trí drop có thể:

- Highlight subtle line giữa 2 item: `border-t-2 border-app-accent/60`.
- Hoặc gap mở rộng tạm thời (height transition).

### 5. Drag preview (clone)

- Clone item theo cursor — render đẹp, có shadow.
- KHÔNG drag toàn DOM element (gây lag mobile).
- @dnd-kit tự lo qua `DragOverlay`.

### 6. Cancel drag

- Esc key → cancel, item snap về vị trí cũ (300ms).
- Drop ngoài list → cancel.

### 7. Touch support

- LongPress 200-300ms để bắt đầu drag trên mobile (tránh nhầm scroll).
- Visual: item dim subtle khi đang chờ long-press.

### 8. Auto-scroll khi drag near edge

- Nếu drag gần top/bottom viewport (50px) → scroll list tự động.
- @dnd-kit có `useAutoScroller` hoặc tự dùng `requestAnimationFrame`.

### 9. Keyboard reorder (accessibility)

- Tab tới handle → space để pickup → arrow up/down để move → space để drop → esc để cancel.
- Live region announce vị trí mới ("Task X moved to position 3 of 7").
- @dnd-kit `useSortable` hỗ trợ sẵn.

### 10. Persistence

- Order save vào localStorage ngay sau drop (debounce 300ms).
- Optimistic update: UI cập nhật ngay, save background.

### 11. Reduced motion

- Bỏ scale + shadow transition.
- Item snap thay vì smooth.
- Vẫn cho phép keyboard reorder.

## Acceptance Criteria

- [ ] Drag handle visible trên mọi sortable item.
- [ ] Drag item: scale + shadow + opacity rõ ràng.
- [ ] Drop zone highlight subtle (line hoặc gap).
- [ ] Touch long-press 200-300ms để start drag.
- [ ] Keyboard accessible: Tab → Space pickup → Arrow → Space drop.
- [ ] Auto-scroll khi drag gần edge.
- [ ] Save order vào localStorage sau drop.
- [ ] Reduced motion: tắt scale/transition, vẫn drag được.
- [ ] Esc cancel.
- [ ] 60fps drag trên mobile.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. `/today` → drag task #2 lên đầu → mượt, save đúng.
2. `/vision-board` → drag tile reorder → mượt.
3. Drag gần top viewport → auto-scroll.
4. Esc khi đang drag → snap về.
5. Tab → Space → Arrow → Space → keyboard reorder.
6. Mobile (DevTools touch hoặc real) → long-press → drag → drop.
7. Reduced motion ON → drag không scale, vẫn work.
8. Reload page → order persisted.

## Không làm

- KHÔNG drag toàn list (chỉ item).
- KHÔNG free-form positioning (chỉ reorder trong list).
- KHÔNG drag cross-list (P3 lo).
- KHÔNG sound khi drop.
- KHÔNG haptic API mobile (browser hỗ trợ kém).
- KHÔNG đổi data shape.

## Ghi chú khi trả kết quả

- Lib dùng (dnd-kit / react-beautiful-dnd / native).
- File đã sửa.
- Video demo desktop + mobile.
- Keyboard reorder test.
- Risk còn lại.
