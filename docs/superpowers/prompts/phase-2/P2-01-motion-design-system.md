# P2-01 — Motion Design System (Tokens, Hooks, Helpers)

## Mục tiêu

Tạo nền tảng motion thống nhất: tokens, helper hooks, utility class. Mọi prompt P2-02 → P2-10 sau đó dùng từ đây. Đây là prompt chạy ĐẦU TIÊN của Phase 2, một mình.

## Context dự án

- Stack: React 18 + Vite + TypeScript + Tailwind v4.
- Đã có tokens `--duration-*` và `--ease-*` ở `src/styles/theme.css` (xem section "Motion tokens").
- Có thể đã có `framer-motion` hoặc chưa. Verify bằng `package.json`.
- Có thể đã có hook `useReducedMotion` — search trong `src/app/hooks/`.

## Scope file

Tạo mới hoặc bổ sung:

- `src/styles/theme.css` — bổ sung utility class motion (nếu chưa có).
- `src/app/hooks/useReducedMotion.ts` — tạo nếu chưa có, hoặc verify.
- `src/app/hooks/useInView.ts` — tạo nếu chưa có.
- `src/app/lib/motion.ts` — tạo file mới, chứa variant constant cho framer-motion (hoặc CSS class names).

Đọc tham khảo (không sửa):
- `src/styles/theme.css` (xem motion tokens hiện có).
- `package.json` (kiểm tra framer-motion version nếu có).

## Yêu cầu kỹ thuật

### 1. Token motion (đã có, chỉ verify + document)

```css
--duration-instant: 120ms;
--duration-fast: 180ms;
--duration-base: 240ms;
--duration-medium: 360ms;
--duration-slow: 560ms;
--duration-slower: 820ms;

--ease-emphasized: cubic-bezier(0.22, 1, 0.36, 1);
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
--ease-spring: cubic-bezier(0.5, 1.6, 0.4, 1);
--ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);
```

Bổ sung nếu thiếu. KHÔNG đổi giá trị token đã có.

### 2. Utility class CSS

Thêm vào `theme.css`:

```css
/* ── Reveal animation ── */
@keyframes reveal-fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.motion-reveal {
  animation: reveal-fade-up var(--duration-medium) var(--ease-decelerate) both;
}

@keyframes reveal-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.motion-reveal-fade {
  animation: reveal-fade var(--duration-base) var(--ease-standard) both;
}

/* ── Press ── */
.motion-press {
  transition: transform var(--duration-instant) var(--ease-standard);
}
.motion-press:active {
  transform: scale(0.98);
}

/* ── Lift ── */
.motion-lift {
  transition: transform var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}
.motion-lift:hover {
  transform: translateY(-1px);
}

/* ── Reduced motion fallback ── */
@media (prefers-reduced-motion: reduce) {
  .motion-reveal,
  .motion-reveal-fade {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .motion-press:active { transform: none; }
  .motion-lift:hover { transform: none; }
}
```

### 3. Hook `useReducedMotion`

`src/app/hooks/useReducedMotion.ts`:

```ts
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [prefers, setPrefers] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefers;
}
```

### 4. Hook `useInView`

`src/app/hooks/useInView.ts`:

```ts
import { useEffect, useRef, useState } from "react";

interface Options {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useInView<T extends Element>(opts: Options = {}) {
  const { threshold = 0.15, rootMargin = "0px 0px -10% 0px", once = true } = opts;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
```

### 5. Library `motion.ts`

`src/app/lib/motion.ts`:

```ts
// Token duration in ms (sync với theme.css)
export const duration = {
  instant: 120,
  fast: 180,
  base: 240,
  medium: 360,
  slow: 560,
  slower: 820,
} as const;

export const ease = {
  emphasized: [0.22, 1, 0.36, 1] as const,
  standard: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
  spring: [0.5, 1.6, 0.4, 1] as const,
  overshoot: [0.34, 1.56, 0.64, 1] as const,
} as const;

// Common variants (dùng cho framer-motion nếu có)
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: duration.medium / 1000, ease: ease.decelerate },
};

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.base / 1000, ease: ease.standard },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: duration.base / 1000, ease: ease.decelerate },
};
```

### 6. Document quy tắc

Tạo `src/app/lib/motion.README.md` (1 trang ngắn) liệt kê:
- Khi nào dùng `motion-reveal` vs `motion-reveal-fade`.
- Khi nào dùng `motion-press` (button) vs `motion-lift` (card hover).
- Cách import variant trong React.
- Reduced motion rule.

## Acceptance Criteria

- [ ] `theme.css` có đủ 4 utility class (`motion-reveal`, `motion-reveal-fade`, `motion-press`, `motion-lift`) + reduced-motion fallback.
- [ ] `useReducedMotion` hook hoạt động, có test cơ bản.
- [ ] `useInView` hook hoạt động với IntersectionObserver, fallback khi SSR.
- [ ] `motion.ts` export đúng kiểu, không TypeScript error.
- [ ] README ngắn cho contributor.
- [ ] Không ảnh hưởng UI hiện tại (chạy P2-01 KHÔNG đổi visual gì).

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Visual:
- Mở DevTools → toggle prefers-reduced-motion → check class `.motion-reveal` không animate.
- Test `useInView` bằng demo nhỏ (có thể tạo storybook tạm hoặc dev playground).

## Không làm

- KHÔNG apply class motion lên component có sẵn (đó là việc của P2-02 → P2-10).
- KHÔNG cài thêm dependency mới (dùng framer-motion nếu đã có, không thì pure CSS).
- KHÔNG đổi token duration / ease đã có.
- KHÔNG tạo physics engine / spring lib custom.

## Ghi chú khi trả kết quả

- File đã tạo / sửa.
- Liệt kê 4 utility class + 2 hook + 3 variant.
- Confirm `prefers-reduced-motion` hoạt động.
- Risk: nếu framer-motion chưa có và bạn quyết định không cài → ghi rõ pure CSS approach.
