# P2-05 — Counter & Progress Bar Animations

## Mục tiêu

Mọi số liệu thống kê (stat) và progress bar trong app phải animate khi vào view hoặc khi giá trị thay đổi. Cảm giác "data sống", không phải static text.

## Tiền điều kiện

- P2-01 đã xong (có `useInView`, `useReducedMotion`).

## Context dự án

- Đã có `src/app/components/ui/count-up.tsx` (nếu có) — verify.
- Stat hiển thị ở: Dashboard (streak, weeks completed, goals achieved), Progress page, Today (task count), Billing (plan price).
- Progress bar dùng ở: 12-week-system (week progress), Today (daily progress), Goal (achievement %).

## Scope file

- `src/app/components/ui/count-up.tsx` — verify/refactor.
- `src/app/components/ui/progress.tsx` — verify/refactor.
- Tạo mới nếu chưa có:
  - `src/app/components/ui/animated-progress.tsx`
- Apply vào:
  - `src/app/pages/Dashboard.tsx`
  - `src/app/pages/TodayV2/TodayV2Page.tsx`
  - `src/app/pages/GoalTracker.tsx`
  - Bất kỳ component hiển thị %, streak, count.

## Yêu cầu kỹ thuật

### 1. Count-up component

```tsx
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/app/hooks/useReducedMotion";
import { useInView } from "@/app/hooks/useInView";

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number; // ms
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function CountUp({
  end,
  start = 0,
  duration = 1200,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>({ once: true });
  const [value, setValue] = useState(start);
  const reduced = useReducedMotion();
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(end);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + (end - start) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [inView, end, start, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
```

### 2. Animated Progress bar

```tsx
export function AnimatedProgress({
  value, // 0-100
  className,
  duration = 800,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ once: true });
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setWidth(value);
      return;
    }
    // Delay 100ms để CSS transition catch
    const t = window.setTimeout(() => setWidth(value), 100);
    return () => window.clearTimeout(t);
  }, [inView, value, reduced]);

  return (
    <div
      ref={ref}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-app-line",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-app-accent transition-all ease-decelerate"
        style={{
          width: `${width}%`,
          transitionDuration: `${duration}ms`,
        }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
```

### 3. Khi dùng cho stat update real-time (sau khi user complete task)

Khi value đổi (vd task complete → progress 40 → 60):

- Đừng trigger lại animation từ 0.
- Animate từ previous value → new value qua 600ms.

```tsx
const prevRef = useRef(value);
useEffect(() => {
  prevRef.current = value;
}, [value]);
// Trong tick(): start từ prevRef.current, end = value
```

### 4. Format số

- Số nguyên: `1,234` (Intl.NumberFormat).
- Phần trăm: `60%`.
- Tiền: `99.000₫` (xem BillingPlan đã format).
- Streak: `7 ngày`.

KHÔNG dùng locale `en-US` cho VN — dùng `vi-VN`.

### 5. Reduced motion

- CountUp: nhảy thẳng tới end.
- AnimatedProgress: width đặt thẳng, không transition.

### 6. Performance

- Tối đa 5 CountUp cùng lúc trong viewport. Nếu nhiều hơn, stagger.
- `requestAnimationFrame` tự throttle theo refresh rate.

## Acceptance Criteria

- [ ] CountUp component hoạt động: animate từ start → end khi vào view.
- [ ] AnimatedProgress component animate width khi vào view.
- [ ] Reduced motion: hiện ngay giá trị cuối.
- [ ] Apply lên Dashboard stat (streak, weeks completed, goals).
- [ ] Apply lên Today progress.
- [ ] Apply lên 12-week-system progress.
- [ ] Apply lên Goal achievement %.
- [ ] Format số đúng locale vi-VN.
- [ ] ARIA progressbar attributes đầy đủ.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. Login → `/dashboard` → stat hero number count-up từ 0 → giá trị thật.
2. Complete task ở `/today` → progress smooth tăng.
3. Mở `/goals` → goal % animate.
4. Reduced motion ON → tất cả hiện instant.
5. Throttle CPU 4x → vẫn mượt (drop xuống 30fps acceptable).
6. ARIA: screen reader đọc đúng giá trị progress.

## Không làm

- KHÔNG animate sai chiều (giảm số → không spin-down quá đà).
- KHÔNG dùng cho real-time clock (gây re-render liên tục).
- KHÔNG sound khi count.
- KHÔNG confetti khi đạt 100% (đó là P2-10).
- KHÔNG đổi data shape / API.

## Ghi chú khi trả kết quả

- Component đã tạo / sửa.
- Page đã apply.
- Demo video count-up.
- Lighthouse Perf trước/sau.
- Risk còn lại.
