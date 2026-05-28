# P2-03 — Scroll-Triggered Reveals (Landing Page)

## Mục tiêu

Trang `/` khi scroll xuống → section dưới fade-up vào view một cách subtle. Cảm giác "có nhịp đọc". KHÔNG parallax, KHÔNG 3D, chỉ fade + translate nhẹ.

## Tiền điều kiện

- P2-01 đã xong (có `useInView` hook + `.motion-reveal` class).

## Context dự án

- Trang `/` có hero + 3-5 section (features, social proof, CTA cuối, footer).
- File landing: `src/app/components/landing/*.tsx` hoặc `src/app/pages/Landing.tsx`.

## Scope file

- Tất cả section component trong `src/app/components/landing/`.
- `src/app/pages/` page chứa landing.

KHÔNG sửa: hero (P2-04 lo riêng), footer, header.

## Yêu cầu kỹ thuật

### 1. Pattern reveal

Mỗi section dùng pattern:

```tsx
import { useInView } from "@/app/hooks/useInView";

export function FeatureSection() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section
      ref={ref}
      className={`transition-all duration-medium ease-decelerate ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      {/* content */}
    </section>
  );
}
```

Hoặc dùng utility class `motion-reveal` + IntersectionObserver thủ công.

### 2. Stagger trong section (nếu có list 3 item)

Mỗi item delay 60–100ms so với item trước:

```tsx
{items.map((item, i) => (
  <div
    key={item.id}
    style={{ transitionDelay: inView ? `${i * 80}ms` : "0ms" }}
    className={`transition-all duration-medium ease-decelerate ${
      inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
    }`}
  >
    {/* item */}
  </div>
))}
```

Max stagger 5 item (sau đó nhảy 1 lượt, tránh chờ lâu).

### 3. Threshold & rootMargin

- `threshold: 0.15` — 15% section vào view thì trigger.
- `rootMargin: "0px 0px -10% 0px"` — trigger trước khi chạm đáy, cảm giác tự nhiên hơn.
- `once: true` — chỉ animate 1 lần, scroll lại không trigger lại.

### 4. Distance & duration

- Translate-y: 12px (`translate-y-3`) là max. KHÔNG hơn 16px.
- Duration: 360ms (`duration-medium`).
- Easing: `ease-decelerate` (slow-out).

### 5. Reduced motion

- IntersectionObserver vẫn chạy, nhưng class `motion-reveal` đã có media query (P2-01) auto-tắt animation.
- Content hiện instant với `opacity: 1`.

### 6. KHÔNG dùng cho

- Hero (đã hiện sẵn, P2-04 lo).
- Header / footer.
- Modal / popover.
- Empty state / skeleton.
- Any section đã visible ngay khi mount.

### 7. Performance

- Mỗi section 1 observer riêng — OK với 3-5 section.
- Nếu có 10+ section, dùng 1 observer chung qua context (advanced).
- `will-change: opacity, transform` chỉ trong khi đang animate, gỡ sau (CSS transition tự lo).

## Acceptance Criteria

- [ ] Tất cả section landing dưới fold có fade-up khi scroll vào view.
- [ ] Stagger nội bộ nếu section có list 3-5 item.
- [ ] Hero KHÔNG dùng pattern này (vẫn hiện sẵn).
- [ ] Reduced motion: bỏ animation, hiện sẵn.
- [ ] Mobile 60fps khi scroll.
- [ ] Scroll lại không re-trigger.
- [ ] Lighthouse Perf không hạ quá 3 điểm.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. Mở `/` → scroll chậm xuống → mỗi section fade-up subtle.
2. Scroll lên → không re-animate.
3. Reload + scroll nhanh xuống đáy → tất cả section vẫn xuất hiện đúng (không bị stuck opacity 0).
4. Reduced motion ON → scroll xuống → section hiện instant.
5. Mobile DevTools throttle CPU 4x → vẫn 60fps khi scroll.
6. Lighthouse Perf `/` trước/sau.

## Không làm

- KHÔNG parallax (background di chuyển khác foreground).
- KHÔNG scroll-driven scale / rotate.
- KHÔNG translate-x > 0 (chỉ y).
- KHÔNG blur on enter.
- KHÔNG sticky/pin section.
- KHÔNG dùng GSAP / ScrollTrigger (overkill).

## Ghi chú khi trả kết quả

- Số section đã apply.
- Stagger pattern dùng ở đâu.
- Lighthouse Perf trước/sau.
- Video demo scroll.
- Risk còn lại.
