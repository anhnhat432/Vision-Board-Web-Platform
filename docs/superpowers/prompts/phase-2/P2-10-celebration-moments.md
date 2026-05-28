# P2-10 — Celebration & Milestone Moments

## Mục tiêu

Tạo khoảnh khắc "ăn mừng" subtle khi user đạt milestone: hoàn thành tất cả task hôm nay, đạt streak 7/30/100 ngày, hoàn thành 1 goal, hoàn thành 1 week, unlock achievement. Cảm giác "được công nhận" nhưng KHÔNG over-the-top.

Tham khảo: Duolingo subtle, Notion completion, Linear "you're caught up".

## Tiền điều kiện

- P2-01 đã xong.
- P2-05 đã có count-up + progress animation.

## Context dự án

- Milestone trigger từ logic hiện có trong `src/app/utils/storage*.ts` (event-log).
- Achievement page: `src/app/pages/Achievements.tsx`.
- Today page có concept "completed all tasks".
- Reflection journal có streak.

## Scope file

- Tạo mới:
  - `src/app/components/celebration/ConfettiBurst.tsx` (component subtle confetti).
  - `src/app/components/celebration/MilestoneToast.tsx` (toast riêng cho milestone).
  - `src/app/hooks/useCelebration.ts` (orchestrator).
- Hook vào:
  - `src/app/pages/TodayV2/TodayV2Page.tsx` (all tasks complete).
  - `src/app/pages/GoalTracker.tsx` (goal complete).
  - `src/app/pages/Achievements.tsx` (unlock badge).
  - `src/app/pages/ReflectionJournal.tsx` (streak milestone).

KHÔNG sửa: logic detect milestone (đã có ở event-log / storage).

## Yêu cầu kỹ thuật

### 1. Triết lý

- **Subtle > Loud**: nhẹ + ngắn + ấm áp.
- **Once per event**: không trigger lại khi reload page hoặc cũ.
- **Không block UI**: user vẫn tương tác được trong khi animation chạy.
- **Reduced motion respect**: chỉ hiện text + icon, bỏ particle.

### 2. ConfettiBurst component

Pure CSS / canvas nhẹ — KHÔNG dùng lib lớn (`canvas-confetti` chấp nhận được, ~10kb).

Behavior:
- Origin: trung tâm element trigger (button, badge).
- Particles: 20-30 (tối đa).
- Duration: 1.2s.
- Colors: từ palette `--app-accent`, `--app-warm`, `--app-warm-soft`.
- Gravity: nhẹ, fall down.
- Auto cleanup canvas sau animation.

```tsx
import confetti from "canvas-confetti"; // nếu đã có hoặc cài
import { useReducedMotion } from "@/app/hooks/useReducedMotion";

export function ConfettiBurst({ origin }: { origin?: { x: number; y: number } }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    confetti({
      particleCount: 25,
      spread: 60,
      startVelocity: 25,
      gravity: 0.8,
      ticks: 80,
      origin: origin ?? { x: 0.5, y: 0.5 },
      colors: ["#2F5D50", "#D97757", "#5BA590", "#E89878", "#F3D9CC"],
      scalar: 0.8,
    });
  }, [reduced, origin]);
  return null;
}
```

### 3. MilestoneToast

- Background `bg-app-warm-soft border border-app-warm-border`.
- Icon (Sparkles, Trophy, Flame tuỳ milestone).
- Title `font-serif text-base font-medium`.
- Description `text-sm text-app-warm-strong`.
- Duration: 4s (lâu hơn toast thường).
- Position: top-center mobile, bottom-right desktop.

Copy mẫu (Vietnamese):

- Hoàn thành hôm nay: "Trọn vẹn một ngày 🌿  · Bạn đã xong hết việc hôm nay."
- Streak 7: "Streak 7 ngày 🔥  · 1 tuần kiên trì."
- Streak 30: "Streak 30 ngày · Đáng nể."
- Streak 100: "Streak 100 ngày · Bạn thuộc top 1%."
- Goal complete: "Đạt mục tiêu 🎉  · [Goal title]."
- Week complete: "Tuần [N] xong · Sẵn sàng cho tuần sau."
- Achievement unlock: "Mở khoá: [Achievement] ✨"

### 4. Hook orchestrator

`useCelebration.ts`:

```ts
export function useCelebration() {
  const trigger = useCallback((
    type: "today-complete" | "streak-7" | "streak-30" | "goal" | "week" | "achievement",
    payload?: { title?: string; origin?: { x: number; y: number } }
  ) => {
    // Check sessionStorage để không trigger lại trong cùng session
    const key = `celebrated-${type}-${payload?.title ?? ""}-${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    
    // Trigger confetti (nếu là big milestone)
    if (["streak-30", "streak-100", "goal", "achievement"].includes(type)) {
      ConfettiBurstSingleton.fire(payload?.origin);
    }
    
    // Toast
    toast.custom((t) => <MilestoneToast type={type} title={payload?.title} />, {
      duration: 4000,
    });
  }, []);
  
  return { trigger };
}
```

### 5. Trigger points

**Today complete**:
- Khi user check task cuối cùng, all tasks complete → trigger("today-complete").
- Origin: từ checkbox vừa click.

**Streak milestone**:
- Khi reflection entry mới tạo, check streak qua storage helper.
- Nếu streak vừa đạt 7/30/100 → trigger.

**Goal complete**:
- Khi user mark goal complete trong GoalTracker → trigger.

**Achievement unlock**:
- Khi achievement state đổi → trigger (chỉ 1 lần).

**Week complete**:
- Khi user mark week-review done → trigger.

### 6. Idempotency

- Mỗi event lưu key vào sessionStorage / event-log để KHÔNG trigger lại cùng ngày.
- Reload page sau khi đã celebrate → không trigger lại.
- Server / future cloud sync: lưu vào event-log để cross-device không spam.

### 7. Reduced motion

- Bỏ confetti.
- Toast vẫn hiện (đó là information, không phải decoration).
- Icon trong toast: không spin/scale, chỉ static.

### 8. Sound

KHÔNG dùng sound (đã loại khỏi Phase 2). Nếu user yêu cầu sound → Phase 3.

## Acceptance Criteria

- [ ] Today: complete task cuối → confetti subtle + toast "Trọn vẹn một ngày".
- [ ] Streak 7/30/100: trigger đúng milestone tương ứng.
- [ ] Goal complete: confetti + toast tên goal.
- [ ] Achievement unlock: animation + toast.
- [ ] Week review done: toast.
- [ ] Idempotent: reload không trigger lại.
- [ ] Reduced motion: bỏ confetti, giữ toast.
- [ ] Không lag (confetti chỉ 1.2s, cleanup tốt).
- [ ] Copy Vietnamese ấm, không cringe.
- [ ] Dark mode: toast contrast đúng.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Manual:

1. Seed today với 3 task → complete tất cả → confetti + toast.
2. Reflection entry để hit streak 7 → toast streak.
3. Goal mark complete → toast + confetti.
4. Reload page sau khi celebrate → không re-trigger.
5. Reduced motion ON → bỏ confetti, toast vẫn show.
6. Dark mode → toast đúng màu.
7. Mobile → confetti không che UI, không lag.

## Không làm

- KHÔNG full-screen celebration (chỉ subtle).
- KHÔNG sound.
- KHÔNG block click trong khi celebrate.
- KHÔNG mascot AI nhảy nhót.
- KHÔNG trigger trên user mới chưa làm gì (welcome flow là chuyện khác).
- KHÔNG hardcode emoji rực (chọn nhẹ: 🌿 ✨ 🔥 🎉).

## Ghi chú khi trả kết quả

- Component + hook đã tạo.
- Trigger point đã hook vào.
- Lib confetti dùng (canvas-confetti hoặc pure CSS).
- Video demo từng milestone.
- Idempotent test (reload không re-trigger).
- Risk còn lại.
