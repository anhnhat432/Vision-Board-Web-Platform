# Motion Design System

Foundation cho Phase 2 motion work. Mọi animation/transition phải lấy duration và ease từ tokens hoặc helper trong file này, KHÔNG hardcode `200ms` / `cubic-bezier(...)` trực tiếp trong component.

## CSS utility class (`src/styles/theme.css`)

| Class | Khi nào dùng |
|---|---|
| `.motion-reveal` | Section / card / list item enter — fade + 8px translate |
| `.motion-reveal-fade` | Pure fade enter — async content, toasts, banner |
| `.motion-press` | Button / icon press feedback — scale 0.98 on `:active` |
| `.motion-lift` | Card / link hover lift — translateY -1px on `:hover` |

Tất cả respect `prefers-reduced-motion: reduce` automatically.

```html
<button class="motion-press rounded-lg bg-app-accent px-4 py-2 text-white">
  Bắt đầu
</button>

<article class="motion-lift rounded-xl border bg-app-surface p-5">
  Card title
</article>
```

## React hook (`src/app/hooks/`)

### `useReducedMotion()`

Vanilla version, không phụ thuộc framer-motion. Dùng cho component CSS-only hoặc không cần `motion/react`.

```tsx
import { useReducedMotion } from "@/app/hooks/useReducedMotion";

function SparkleCelebration() {
  const reduce = useReducedMotion();
  if (reduce) return <span>✨</span>;
  return <Confetti />;
}
```

Component đã dùng `motion/react` (e.g. `MotionFadeIn`, `MotionPageTransition`) tiếp tục dùng `useReducedMotion` từ `motion/react` — KHÔNG cần đổi.

### `useInView()`

IntersectionObserver wrapper với SSR fallback. Trả về `{ ref, inView }`.

```tsx
import { useInView } from "@/app/hooks/useInView";

function AboutSection() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  return (
    <section ref={ref} className={inView ? "motion-reveal" : "opacity-0"}>
      ...
    </section>
  );
}
```

Mặc định `once: true` (chỉ trigger 1 lần), `threshold: 0.15` (15% visible), `rootMargin: "0px 0px -10% 0px"` (kích trước khi vào hết viewport).

## framer-motion variant (`src/app/lib/motion.ts`)

Cho component đã dùng `motion/react`:

```tsx
import { motion } from "motion/react";
import { fadeUp } from "@/app/lib/motion";

<motion.section {...fadeUp}>
  <h2>Mục tiêu của bạn</h2>
</motion.section>
```

Có sẵn `fadeUp`, `fade`, `scaleIn`. Tất cả dùng duration + ease từ tokens.

## Reduced motion rule

Mọi animation phải có 1 trong 2 fallback:

1. **CSS class**: tự động qua `@media (prefers-reduced-motion: reduce)` block ở cuối utility (đã có).
2. **React component**: gọi `useReducedMotion()` → render trạng thái cuối / static.

KHÔNG bao giờ animation ép buộc — user disable motion là disable thật.

## Token mapping

| CSS var | Lib `duration.*` | Đề xuất dùng cho |
|---|---|---|
| `--duration-instant` `120ms` | `duration.instant` | press, hover micro |
| `--duration-fast` `180ms` | `duration.fast` | tooltip, micro-interaction |
| `--duration-base` `240ms` | `duration.base` | overlay, fade |
| `--duration-medium` `360ms` | `duration.medium` | reveal, route transition |
| `--duration-slow` `560ms` | `duration.slow` | hero animate-in |
| `--duration-slower` `820ms` | `duration.slower` | celebration moments |

| Ease | Khi nào |
|---|---|
| `standard` | default mọi transition |
| `decelerate` | enter (vào view) |
| `accelerate` | exit (rời view) |
| `emphasized` | mùi M3, scroll snap, modal |
| `spring` / `overshoot` | celebration, milestone unlock |
