# P2-06 — List Enter/Exit & Reorder Motion

## Mục tiêu

Khi thêm / xoá / sắp xếp lại item trong list (task, journal entry, goal, vision board tile), item phải animate vào/ra mượt, không nhảy đột ngột. Cảm giác "list sống có nhịp".

## Tiền điều kiện

- P2-01 đã xong.

## Context dự án

- List chính:
  - Today task list (`src/app/pages/TodayV2/`)
  - Reflection journal entries (`src/app/pages/ReflectionJournal.tsx`)
  - Goal tracker list (`src/app/pages/GoalTracker.tsx`)
  - Vision board tiles (`src/app/pages/VisionBoardGallery.tsx`)
  - 12-week-system task list
- Framer Motion `AnimatePresence` + `motion.li` là cách dễ nhất nếu đã có lib.

## Scope file

- Tất cả page có list ở trên.
- Component list item (TaskCard, JournalEntry, GoalCard, etc.).

KHÔNG sửa: data layer, mutation logic.

## Yêu cầu kỹ thuật

### 1. Pattern với Framer Motion

```tsx
import { AnimatePresence, motion } from "framer-motion";
import { duration, ease } from "@/app/lib/motion";

<ul>
  <AnimatePresence initial={false}>
    {items.map((item) => (
      <motion.li
        key={item.id}
        layout
        initial={{ opacity: 0, height: 0, scale: 0.98 }}
        animate={{ opacity: 1, height: "auto", scale: 1 }}
        exit={{ opacity: 0, height: 0, scale: 0.98 }}
        transition={{
          duration: duration.medium / 1000,
          ease: ease.decelerate,
        }}
        className="overflow-hidden"
      >
        <TaskCard task={item} />
      </motion.li>
    ))}
  </AnimatePresence>
</ul>
```

### 2. Pattern thuần CSS (nếu không có framer-motion)

Dùng `<TransitionGroup>` từ `react-transition-group` hoặc tự CSS:

```css
.list-item-enter {
  animation: item-enter var(--duration-medium) var(--ease-decelerate) both;
}
.list-item-exit {
  animation: item-exit var(--duration-base) var(--ease-accelerate) both;
}
@keyframes item-enter {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); max-height: 0; }
  to   { opacity: 1; transform: none; max-height: 200px; }
}
@keyframes item-exit {
  from { opacity: 1; max-height: 200px; }
  to   { opacity: 0; transform: translateX(-8px); max-height: 0; }
}
```

### 3. Task complete animation

Khi user check task hoàn thành:

- Checkbox tick fade-scale (đã có hoặc thêm).
- Text line-through fade từ trái sang phải qua 360ms.
- Task card opacity 0.6 (visual dim).
- Sau 500ms (nếu setting "auto-archive completed"), slide-out exit.

KHÔNG remove ngay khi user vừa tick (cho phép undo).

### 4. Reorder (drag) — chỉ visual

Item bị drag:
- Scale 1.02, shadow-4, opacity 0.92.
- Z-index cao.
- Cursor grabbing.

Item neighbor:
- Smooth slide để chừa chỗ (Framer Motion `layout` prop tự lo).

Item drop:
- Spring nhẹ về vị trí mới (300ms).

P2-07 lo chi tiết drag — P2-06 chỉ animate visual khi reorder data.

### 5. Bulk action

Khi user "xoá tất cả completed":

- Stagger exit: mỗi item delay 40ms.
- Max delay 200ms (đừng để chờ lâu).

### 6. Empty → first item

Khi list đang empty (hiện empty state P1-09) → user thêm item đầu tiên:

- Empty state fade-out (240ms).
- List wrapper expand height.
- Item đầu tiên fade-up.

### 7. Reduced motion

- Bỏ scale + translate.
- Giữ fade opacity 0 → 1.
- Bỏ height animation (snap).

### 8. Performance

- Tối đa 30 item animate cùng lúc. Nếu > 30 → virtualize (advanced).
- `layout` prop chỉ trên `<motion.li>` cần reorder, không trên page-level.

## Acceptance Criteria

- [ ] Thêm task `/today` → item fade-up vào list.
- [ ] Xoá task → item slide-out.
- [ ] Check task → tick animate + dim.
- [ ] Thêm journal entry → enter mượt.
- [ ] Goal hoàn thành → animate badge xuất hiện.
- [ ] Vision board thêm tile → grid expand + tile fade-in.
- [ ] Reduced motion: bỏ scale/translate, giữ fade.
- [ ] Performance 60fps khi list 20 item.
- [ ] Không có layout jump khi animate height.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. `/today` → thêm 5 task liên tiếp → mỗi cái fade-up mượt.
2. Xoá 1 task → slide-out.
3. Check task → tick + dim.
4. `/reflection-journal` → tạo entry → enter.
5. `/vision-board` → upload image → tile xuất hiện.
6. Reduced motion ON → all enter/exit chỉ fade, không scale/translate.
7. DevTools Performance 20 item list → 60fps.

## Không làm

- KHÔNG flip card 3D.
- KHÔNG explosion / particle khi delete.
- KHÔNG sound khi enter/exit.
- KHÔNG đổi data layer.
- KHÔNG block UI khi animate (user phải tương tác được ngay).

## Ghi chú khi trả kết quả

- File đã sửa.
- Approach (Framer Motion vs CSS).
- Video demo thêm/xoá/check.
- Performance test (20 item).
- Risk còn lại.
