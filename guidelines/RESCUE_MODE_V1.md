# Rescue Mode v1

Rescue Mode is a deterministic, rule-based nudge layer for the 12-week system.
When a user falls off-pace, the app surfaces a **gentle, non-judgmental** card
with at most 3 suggestions. No AI, no notifications, no automatic mutations.

The pure helper lives at `src/features/plan12week/logic/rescueMode.ts` and is
re-exported from the logic barrel. UI is in
`src/app/components/twelve-week/TwelveWeekRescueNudge.tsx`, wired into the
Today tab and the Week tab.

## Triggers

A trigger fires when its condition is met. Severity for the whole rescue mode
is the max of all trigger severities. When 3+ triggers fire, severity escalates
to `urgent`.

| Trigger ID | Condition | Trigger severity |
| --- | --- | --- |
| `overdue-tasks` | `overdueOpenCount >= 3` | `gentle` |
| `overdue-tasks` | `overdueOpenCount >= 5` | `active` |
| `no-completion-streak` | days since last completion ≥ 3 (or no completion ever, plan ≥ 3 days old) | `gentle` |
| `no-completion-streak` | days since last completion ≥ 5 | `active` |
| `missed-checkins` | days since last `dailyCheckIns` entry ≥ 3 (or none ever, plan ≥ 3 days old) | `gentle` |
| `low-week-completion-near-end` | `weekCompletionPercent < 50` AND `daysRemainingInWeek ∈ [0, 2]` | `active` |
| `weekly-review-missed` | `currentWeek >= 2` AND previous week has no `reviewCompleted` | `gentle` |

**Cold-start guard.** When the plan has been active for less than 3 days
(`daysSincePlanStart < 3`), `no-completion-streak` and `missed-checkins` are
skipped so a fresh plan never feels punitive on day 1-2.

## Suggestions

| Suggestion ID | Mapped from triggers | UX intent |
| --- | --- | --- |
| `pick-one-tiny-task` | `overdue-tasks`, `no-completion-streak`, `low-week-completion-near-end` | Bắt đầu lại bằng 1 phiên bản 5-10 phút của 1 việc cốt lõi. |
| `reschedule-non-core` | `overdue-tasks` | Dời nhẹ task tùy chọn, giữ task cốt lõi. **Không tự động dời.** |
| `quick-check-in` | `missed-checkins`, `weekly-review-missed` | Check-in 30 giây để giữ nhịp ghi nhớ. |
| `reduce-week-load` | `no-completion-streak`, `low-week-completion-near-end` | Chỉ giữ 1-2 task cốt lõi cho phần còn lại của tuần. |
| `review-plan` | `weekly-review-missed` + always anchored when severity ≥ `active` | Mở Setup chỉnh nhịp — không reset/abandon goal. |

Cap = 3 suggestions per rescue panel. `review-plan` is always reserved for the
last slot when severity is `active` or `urgent`.

## API surface

```ts
import {
  getRescueModeStatus,
  getRescueModeMessage,
  getRescueActionSuggestion,
  type RescueModeStatus,
  type RescueModeInput,
  type RescueSuggestion,
} from "@/features/plan12week/logic";

const status = getRescueModeStatus({
  todayDateKey: "2026-05-10",
  currentWeek: 3,
  currentWeekRange: { start: "2026-05-04", end: "2026-05-10" },
  weekCompletionPercent: 30,
  overdueOpenCount: 4,
  reviewDueToday: false,
  dailyCheckIns: system.dailyCheckIns,
  weeklyReviews: system.weeklyReviews,
  taskInstances: system.taskInstances,
  startDate: system.startDate,
});

const message = getRescueModeMessage(status);
const suggestions = getRescueActionSuggestion(status);
```

`status` only contains: `severity`, `triggers[]`, and a few numeric deltas
(`daysSinceLastCompletion`, `daysSinceLastCheckIn`, `daysRemainingInWeek`).
**No raw task title, no check-in note, no reflection text** — safe for
analytics buckets.

## UI integration

- **Today tab**: `<TwelveWeekRescueNudge variant="today" />` renders above the
  primary hero when `severity !== "none"`. Buttons map to `onPickTinyTask`,
  `onSaveCheckIn` (quick check-in), `onOpenWeekTab` (reschedule / reduce),
  `onReviewPlan` (defaults to the existing `onNavigateToSetup`).
- **Week tab**: `<TwelveWeekRescueNudge variant="week" />` renders above the
  week summary cards. Buttons map to `onPickTinyTask` (defaults to switching
  to Today tab), `onReducePlan` (defaults to `handleApplySuggestedPlan`),
  `onReviewPlan` (defaults to `handleApplySuggestedPlan`).

The nudge is purely presentational: it does not auto-mutate tasks, plan, or
schedule. All actions are user-initiated callbacks defined by the page.

## Severity → tone mapping

| Severity | Headline copy | Accent |
| --- | --- | --- |
| `none` | (panel hidden) | — |
| `gentle` | "Có một vài tín hiệu nhỏ — chỉ cần một bước nhẹ là đủ." | violet (today) / amber (week) light |
| `active` | "Tuần đang lệch nhịp một chút — cùng quay lại bằng việc nhỏ." | violet / amber medium |
| `urgent` | "Nhiều thứ đang dồn lại — đừng cố làm hết, chọn 1 việc nhỏ thôi." | amber strong |

Subtext is interpolated from the **first** (highest priority) trigger using
canned Vietnamese strings only — no user content is interpolated.

## Constraints honoured (v1)

- No real notifications.
- No AI calls.
- No new dependencies.
- No automatic deletion or rescheduling of tasks.
- No billing or sync changes.
- No storage schema changes — `rescueStatus` is a derived runtime value
  computed from existing system fields (`dailyCheckIns`, `weeklyReviews`,
  `taskInstances`, `startDate`).

## Limitations & TODOs

- **Time-zone**: triggers compare `YYYY-MM-DD` strings using `Date.parse(...T00:00:00Z)`,
  so day deltas are stable as long as `todayDateKey` is provided in the user's
  local zone (the snapshot hook already does this via `formatDateInputValue(new Date())`).
- **Cold-start window**: hard-coded to 3 days. May feel too lenient for
  one-week plans (none in scope yet) or too strict for 12-week plans where
  week 1 is intentionally light.
- **Severity escalation** to `urgent` is heuristic (3+ triggers). Tunable via
  the constants block at the top of `rescueMode.ts`.
- **No analytics yet**: callers may add tracking by passing `status.triggers`
  (id-only) and `status.severity`. Do not pass message strings or suggestion
  hints to analytics — they are user-facing copy and may change.
- **No throttle/dismiss**: rescue panel is fully derived and always reflects
  the latest state. A future iteration could add a "snooze for the day"
  preference using existing `appPreferences`, but that is out of scope for v1.
- The existing premium "Cứu nhịp tuần này" card (entitlement-gated, driven by
  `missedTasks.length > 0`) remains unchanged. Both panels can render together
  when overdue is present — they target different needs (heavy reentry plan
  vs. light multi-trigger nudge).
