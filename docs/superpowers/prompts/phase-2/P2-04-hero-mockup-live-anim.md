# P2-04 — Hero Mockup Live Animation

## Mục tiêu

Mockup trong hero trang `/` hiện tại đang tĩnh. Mục tiêu: tự animate nhẹ 3-5 element bên trong mockup (task check, progress fill, count-up, badge slide) → cảm giác "sống" + "đây là sản phẩm thật".

Tham khảo: Linear hero mockup, Notion hero, Vercel deploy mockup.

## Tiền điều kiện

- P2-01 đã xong.
- P1-03 đã refine hero layout.

## Context dự án

- Mockup ở `src/app/components/landing/HeroMockup.tsx` (hoặc tên tương tự).
- Mockup hiển thị "Today V2" hoặc "12-week system" preview.
- Hero không scroll-trigger — mockup nên auto-play khi mount, sau đó loop hoặc dừng.

## Scope file

- `src/app/components/landing/HeroMockup.tsx` (hoặc file mockup hiện tại).
- `src/styles/theme.css` — thêm keyframe nếu cần.

KHÔNG sửa: hero layout (P1-03 lo), copy, CTA.

## Yêu cầu kỹ thuật

### 1. Loop sequence (lặp 1 chuỗi 4-5 bước)

Ví dụ Today V2 mockup:

1. **0ms**: state ban đầu — 3 task chưa hoàn thành, progress 40%.
2. **600ms**: task #1 checkbox tick → fade scale-up dấu check, line-through xuyên text.
3. **1400ms**: progress bar tăng từ 40% → 60% (smooth fill 600ms).
4. **2200ms**: badge "Streak +1" slide từ phải vào, dừng 1.5s.
5. **3800ms**: badge fade out.
6. **5000ms**: reset state về 0ms, lặp lại.

Total loop ~5s. Pause 1s rồi loop tiếp.

### 2. Implementation approach

- Dùng `setTimeout` + `useState` cho từng phase.
- Hoặc CSS animation với `animation-delay` chuỗi.
- KHÔNG cần lib animation phức tạp.

Mẫu code:

```tsx
const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
const reduced = useReducedMotion();

useEffect(() => {
  if (reduced) return;
  const timers: number[] = [];
  const schedule = [600, 1400, 2200, 3800, 5000];
  schedule.forEach((delay, i) => {
    timers.push(window.setTimeout(() => setPhase((i + 1) as any), delay));
  });
  const restart = window.setTimeout(() => setPhase(0), 6000);
  timers.push(restart);
  return () => timers.forEach(window.clearTimeout);
}, [phase, reduced]);
```

Hoặc dùng `requestAnimationFrame` để chính xác hơn.

### 3. Task check animation

```tsx
<CheckCircle
  className={`size-4 transition-all duration-base ease-decelerate ${
    phase >= 1 ? "text-app-accent scale-100 opacity-100" : "text-app-line scale-90 opacity-60"
  }`}
/>
<span
  className={`transition-all duration-base ease-standard ${
    phase >= 1 ? "line-through text-app-ink-muted" : "text-app-ink"
  }`}
>
  Đọc 20 trang sách
</span>
```

### 4. Progress bar fill

```tsx
<div className="h-2 rounded-full bg-app-line overflow-hidden">
  <div
    className="h-full bg-app-accent transition-all duration-slow ease-decelerate"
    style={{ width: phase >= 2 ? "60%" : "40%" }}
  />
</div>
```

### 5. Badge slide-in

```tsx
<div
  className={`absolute -top-2 -right-2 inline-flex items-center gap-1 rounded-full bg-app-warm-soft text-app-warm-strong px-2.5 py-1 text-xs font-medium shadow-2 transition-all duration-medium ease-spring ${
    phase >= 3 && phase < 4
      ? "translate-x-0 opacity-100 scale-100"
      : "translate-x-4 opacity-0 scale-95"
  }`}
>
  <Flame className="size-3" />
  Streak +1
</div>
```

### 6. Reduced motion

- Hiện state cuối cùng (phase 3) tĩnh, không loop.
- KHÔNG mount setInterval.

### 7. Pause khi không in view

Optional: dùng `useInView` (P2-01) — pause animation khi mockup không trong view (scroll xuống) để tiết kiệm CPU.

### 8. Performance

- KHÔNG animate transform + opacity + width cùng lúc trên 10+ element.
- Mỗi frame max 5 element animate.
- Verify 60fps trên Pixel 5 DevTools throttle.

## Acceptance Criteria

- [ ] Mockup tự loop 4-5 phase mượt.
- [ ] Reduced motion: hiện state cuối tĩnh.
- [ ] Pause khi scroll mockup khỏi viewport (optional, nếu làm thì test).
- [ ] 60fps trên mobile DevTools throttle.
- [ ] CLS ≤ 0.05 cho hero (mockup không nhảy layout).
- [ ] Loop reset sạch, không bị "đứng" giữa chừng.
- [ ] Dark mode: tất cả color trong mockup đúng.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. Mở `/` → wait 5s → mockup loop tự nhiên.
2. Mở DevTools Performance → record 10s → 60fps animation.
3. Reduced motion ON → mockup tĩnh.
4. Scroll xuống khỏi hero → pause (nếu implement).
5. Dark mode → mockup vẫn đẹp.
6. Mobile real device → cảm giác mượt.

## Không làm

- KHÔNG thêm scroll-driven (mockup không phụ thuộc scroll position).
- KHÔNG sound.
- KHÔNG hover-tilt 3D (P1-03 đã cấm).
- KHÔNG animation > 1s cho 1 phase (mệt mắt).
- KHÔNG dùng video thay mockup.
- KHÔNG mount real Today component (chỉ static preview, tránh load logic thật).

## Ghi chú khi trả kết quả

- Sequence timeline cuối cùng (timing từng phase).
- Video demo 10s.
- CPU usage trên mobile throttle.
- Risk còn lại.
