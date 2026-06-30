# Goals Command Center Redesign

## Overview

Redesign trang `/goals` từ "Studio Desk / Mission Board" sang **"Command Center"** — trung tâm điều khiển cá nhân giúp người dùng thấy rõ mục tiêu cần hành động nhất hôm nay.

## Classification: Mixed (Shell-heavy, Core-safe)

- **Shell**: layout, component structure, visual treatment, copy.
- **Core**: KHÔNG thay đổi goal/task/progress logic, localStorage keys/shape, sync, auth, billing, app mode.

## Design Direction

### Concept: Command Center

- **Today Command**: card lớn chiếm ~60% viewport, hiển thị mục tiêu cần hành động nhất + việc hôm nay + progress ring + CTA duy nhất.
- **Goal Fleet**: compact list bên phải/dưới, mỗi item là một dòng với mini progress, status dot, actions.
- **Status Ticker**: dải ngắn ở top thay thế KPI row 4 ô.

### Signature Moment

"Today Command" — mỗi ngày vào đều thấy việc cần làm đầu tiên.

### Visual Treatment

- Bất đối xứng: command card lớn + fleet list nhỏ.
- Progress ring SVG thay vì progress bar.
- Fleet list: compact, inline filter.
- Typography: serif cho emotional heading, sans cho data.
- Token: chỉ dùng semantic/component token, không hardcode hex.

## Files Changed

| File                                             | Change                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `src/app/pages/GoalTracker.tsx`                  | Restructure layout: 2 cột, status ticker, today command, goal fleet |
| `src/app/components/goals/GoalSpotlight.tsx`     | → TodayCommandCard: progress ring, task checkbox, CTA rõ            |
| `src/app/components/goals/MissionBoard.tsx`      | → GoalFleetList: compact list thay vì grid                          |
| `src/app/components/goals/MissionCard.tsx`       | → GoalFleetItem: dòng compact                                       |
| `src/app/components/goals/GoalFilterToolbar.tsx` | Gọn hơn, inline với fleet header                                    |
| `src/app/components/goals/GoalEmptyState.tsx`    | Phù hợp command center empty state                                  |
| `src/app/components/goals/index.ts`              | Export tên mới                                                      |

## Contracts Preserved

- `SpotlightFocusData` interface — không đổi.
- `MissionCardProps` — giữ tương thích qua GoalFleetItem.
- `GoalFilterType` — không đổi.
- All handlers: `handleToggleTask`, `openTwelveWeekCenter`, `setGoalToDelete` — không đổi.
- localStorage keys, sync, auth, billing, app mode — không chạm.

## Acceptance Criteria

- [ ] Có một primary CTA rõ trên command card.
- [ ] Người dùng thấy việc hôm nay trong 3 giây.
- [ ] Mobile: 1 cột, không scroll ngang, touch target ≥44px.
- [ ] Filter/search vẫn hoạt động.
- [ ] Toggle task vẫn hoạt động và toast đúng.
- [ ] Delete goal vẫn dùng AlertDialog.
- [ ] Empty state hiển thị khi chưa có mục tiêu.
- [ ] Dark mode render ổn.
- [ ] Reduced motion: không animation.
- [ ] `npm run typecheck && npm run lint && npm run build` pass.
