# Blocker B2 — Banner "Cần chọn bản dữ liệu" xuất hiện ngay lần đầu login sạch

> Phát hiện trong P1 audit. Banner conflict hiện trên header navbar cho **mọi phiên fresh login**, dù user chưa làm gì.
>
> Đọc trước: `qa-artifacts/p1-audit/REPORT.md` mục B2.

---

## Triệu chứng

```
console:
[auto-sync] finished with attention needed
  {status: unsafe, message: "Có dữ liệu chưa thể gộp tự động. Chưa ghi đè bản trên thiết bị."}
[auto-sync] finished with attention needed
  {status: conflict, message: "Có xung đột dữ liệu không thể tự động giải quyết. Vui lòng chọn phiên bản cần giữ."}

localStorage["visionboard_pull_cursor:auth:..."] = {"lastPullStatus":"conflict", ...}

UI: header navbar hiển thị badge/banner "Cần chọn bản dữ liệu"
    bên cạnh breadcrumb "Workspace / ..."
```

## Nguyên nhân (đã điều tra)

Khi user mới login trên browser fresh, app:

1. Tạo **default seed local** (storageVersion 8, 8 wheel-of-life lĩnh vực = 0, goal mặc định "Hoàn thành một dự án nổi bật...").
2. Pull cloud snapshot từ backend (snapshot thật của user).
3. Auto-sync so sánh local default vs cloud → coi là **conflict** vì 2 phiên bản khác nhau.
4. Hiện banner "Cần chọn bản dữ liệu".

→ Đây là **false-positive conflict** — local seed default không phải work của user, nên không cần "chọn giữ phiên bản nào". Cứ overwrite local bằng cloud là đúng.

## Mục tiêu fix

Trên fresh login (local chưa có user-data thật), **auto-merge cloud → local** không tạo banner. Banner conflict chỉ hiện khi local thực sự có data user đã tạo offline.

---

## Phase B2-1 — Locate auto-sync logic

```bash
rtk grep -rn "auto-sync" src/ --include="*.ts" --include="*.tsx" | head -20
rtk grep -rn "lastPullStatus" src/ --include="*.ts" --include="*.tsx" | head -10
rtk grep -rn "Cần chọn bản dữ liệu" src/ --include="*.ts" --include="*.tsx" | head -5
```

Mở các file kết quả. Có thể nằm trong:

- `src/lib/sync/` hoặc `src/services/syncService.ts`
- `src/features/plan12week/sync/`
- `src/app/utils/storage-twelve-week.ts` (logic merge)
- Component banner: tìm bằng string "Cần chọn bản dữ liệu"

## Phase B2-2 — Define "is local seed default"

Cần một helper xác định: local data hiện tại là **seed default** (chưa user-touched) hay **user-data thật**.

Tiêu chí seed default:

- `goals.length === 1` và `goals[0].title.includes("Hoàn thành một dự án nổi bật")`
- HOẶC `goals.length === 0`
- VÀ `reflections.length === 0`
- VÀ `wheelOfLifeHistory.length === 0`
- VÀ `twelveWeekSystem == null` hoặc empty
- VÀ `onboardingCompleted === false`

Có thể đã tồn tại helper `shouldHydrateDemoData(data)` trong `src/app/utils/storage-demo-data.ts` (dòng 47-56) — kiểm tra logic tương tự. **Tái sử dụng hoặc viết helper mới nếu spec khác.**

```ts
// src/lib/sync/conflict-policy.ts (file mới)
import type { UserData } from "@/app/utils/storage";

export function isLocalDataUntouchedSeed(data: UserData): boolean {
  if (data.onboardingCompleted) return false;
  if (data.reflections.length > 0) return false;
  if (data.wheelOfLifeHistory.length > 0) return false;
  if (data.twelveWeekSystem) return false;
  
  const hasUserGoal = data.goals.some((g) => 
    !g.title.includes("Hoàn thành một dự án nổi bật")
  );
  if (hasUserGoal) return false;
  
  return true;
}
```

## Phase B2-3 — Apply policy trong auto-sync

Trong hàm xử lý conflict (sau bước pull, trước khi set `lastPullStatus = "conflict"`):

```ts
// Pseudocode
const localData = readLocalUserData();
const cloudData = pullCloudSnapshot();
const mergeReport = mergeStrategy(localData, cloudData);

if (mergeReport.status === "conflict" || mergeReport.status === "unsafe") {
  // Kiểm tra: local có phải seed default không?
  if (isLocalDataUntouchedSeed(localData)) {
    // Auto-merge: overwrite local bằng cloud
    writeLocalUserData(cloudData);
    setLastPullStatus("success-overwrote-seed");
    console.info("[auto-sync] overwrote local seed with cloud snapshot");
    return;
  }
  
  // Local có user-data → giữ logic conflict cũ
  setLastPullStatus("conflict");
  // ... hiển thị banner
}
```

## Phase B2-4 — Hide banner trong real mode khi không phải user-touched conflict

Tìm component banner (string "Cần chọn bản dữ liệu"). Add guard:

```tsx
// VD: src/app/components/SyncConflictBanner.tsx
import { isDemoMode } from "@/app/utils/app-mode";
import { useUserData } from "@/app/hooks/useUserData";
import { isLocalDataUntouchedSeed } from "@/lib/sync/conflict-policy";

export function SyncConflictBanner() {
  const { data, lastPullStatus } = useUserData();
  
  // Không hiện banner nếu local là seed default
  // (auto-sync sẽ tự overwrite ở pass tiếp theo)
  if (isLocalDataUntouchedSeed(data)) return null;
  
  if (lastPullStatus !== "conflict" && lastPullStatus !== "unsafe") return null;
  
  return (
    <div role="alert">Cần chọn bản dữ liệu</div>
  );
}
```

## Phase B2-5 — Test

```bash
npm run typecheck
npm run lint
npm run test:run -- syncService conflict-policy
```

Test mới cần viết:

```ts
// src/lib/sync/__tests__/conflict-policy.test.ts
import { describe, it, expect } from "vitest";
import { isLocalDataUntouchedSeed } from "../conflict-policy";

describe("isLocalDataUntouchedSeed", () => {
  it("returns true for fresh seed default", () => {
    expect(isLocalDataUntouchedSeed({
      goals: [{ title: "Hoàn thành một dự án nổi bật..." }],
      reflections: [],
      wheelOfLifeHistory: [],
      twelveWeekSystem: null,
      onboardingCompleted: false,
    } as any)).toBe(true);
  });
  
  it("returns false when user has reflections", () => {
    expect(isLocalDataUntouchedSeed({
      goals: [],
      reflections: [{ id: "r1" }],
      wheelOfLifeHistory: [],
      twelveWeekSystem: null,
      onboardingCompleted: false,
    } as any)).toBe(false);
  });
  
  it("returns false when onboarding completed", () => {
    expect(isLocalDataUntouchedSeed({
      goals: [],
      reflections: [],
      wheelOfLifeHistory: [],
      twelveWeekSystem: null,
      onboardingCompleted: true,
    } as any)).toBe(false);
  });
  
  it("returns false when user has wheel of life history", () => {
    expect(isLocalDataUntouchedSeed({
      goals: [],
      reflections: [],
      wheelOfLifeHistory: [{ date: "2026-05-01", scores: {} }],
      twelveWeekSystem: null,
      onboardingCompleted: false,
    } as any)).toBe(false);
  });
});
```

Thủ công test:

1. `npm run dev` với env demo-safe.
2. Mở incognito, login với account đã onboarded.
3. Verify console: KHÔNG thấy `[auto-sync] finished with attention needed`.
4. Verify navbar: KHÔNG thấy banner "Cần chọn bản dữ liệu".
5. Verify localStorage: `lastPullStatus` = `success-overwrote-seed` hoặc `success`.

Test regression — local có user-data thật:

1. Trong DevTools, manually set localStorage có 1 reflection + 1 goal user.
2. Login → verify banner VẪN hiện (vì local có work thật, conflict thật).

## Phase B2-6 — Commit

```bash
git add src/lib/sync/conflict-policy.ts \
        src/lib/sync/__tests__/conflict-policy.test.ts \
        src/services/syncService.ts \
        src/app/components/SyncConflictBanner.tsx
git commit -m "fix(sync): auto-overwrite untouched local seed with cloud snapshot

P1 audit found that fresh-context logins always showed 'Cần chọn bản
dữ liệu' conflict banner because local-seed default differs from
cloud snapshot. Users had not touched local data → conflict is
false-positive.

This patch:
- Adds isLocalDataUntouchedSeed() helper checking goals, reflections,
  wheel history, 12-week system, onboarding flag
- Auto-merges cloud → local when isLocalDataUntouchedSeed() true
- Banner only shows when local has real user work conflicting with cloud
- Adds unit tests for seed detection"
```

## Acceptance criteria cho B2

- [ ] Login fresh trên incognito với account đã onboarded → KHÔNG có console `[auto-sync] finished with attention needed`.
- [ ] Navbar không hiện badge "Cần chọn bản dữ liệu" trong demo flow.
- [ ] Account fresh signup, chưa onboard, đăng nhập lần đầu sau khi tạo plan trên thiết bị khác → cloud snapshot tự áp dụng, không banner.
- [ ] Regression: nếu local có user-data thật (manual write) → banner vẫn hiện.
- [ ] Unit test pass.

## Quy tắc khi làm

- KHÔNG xoá hẳn logic conflict — chỉ skip cho seed default case.
- KHÔNG tự động overwrite cloud bằng local (chỉ overwrite local bằng cloud).
- Giữ banner cho real conflict.
- Verify regression bằng test thủ công + unit test.
- Trả lời tiếng Việt.

Bắt đầu Phase B2-1.
