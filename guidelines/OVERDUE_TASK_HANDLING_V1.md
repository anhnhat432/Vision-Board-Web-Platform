# Overdue Task Handling v1

Lightweight inline actions for handling overdue tasks in the 12-Week System
Today tab — without a calendar, drag-and-drop, or full task management
rewrite.

## Schema audit

`TwelveWeekTaskInstance` (in `src/app/utils/storage-types.ts`) already supports:

| Field | Type | Used by |
| --- | --- | --- |
| `id` | string | identity |
| `weekNumber` | number | `move-to-next-week` (target week) |
| `scheduledDate` | YYYY-MM-DD | `move-later-this-week` (within-week reschedule) |
| `isCore` | boolean | gate for `skip` action |
| `completed` | boolean | `mark-as-done` (already wired) |
| `rescheduledFrom` | string? | history of any reschedule |

For **skip** there was no existing flag. v1 adds **one optional field**:

```ts
interface TwelveWeekTaskInstance {
  // ...existing fields...
  /**
   * Optional. Set to `true` when the user explicitly skipped a non-core task
   * during overdue rescue. Excluded from completion totals and queues.
   */
  skipped?: boolean;
}
```

This is backwards compatible (older payloads simply have it `undefined`, which
is treated as `false` by all readers). Sync persistence (`twelveWeekImportPayload`,
`pulledWorkspaceApply`) explicitly picks fields to serialise — `skipped` is not
included, so a round-trip drops it. That is acceptable for v1 because:

- The constraint says "Local save vẫn là nguồn chính" (local is the primary source).
- The constraint says "Nếu mutation queue đã có task mutation, không cần wire
  sync trong task này trừ khi đã có pattern rõ" — there is no existing
  `task_skipped` mutation kind, so v1 stays local-only.

## Pure helpers (in `storage-twelve-week.ts`)

```ts
rescheduleTwelveWeekTaskWithinWeek(system, taskId, referenceDate?): OverdueTaskActionResult
rescheduleTwelveWeekTaskToNextWeek(system, taskId): OverdueTaskActionResult
skipTwelveWeekNonCoreTask(system, taskId): OverdueTaskActionResult
```

All three are **pure** (no side effects, return new system + result). Caller
persists via `commitSystemUpdate`.

```ts
type OverdueTaskActionReason =
  | "ok"
  | "task_not_found"
  | "task_already_completed"
  | "task_already_skipped"
  | "no_room_in_current_week"
  | "no_next_week_available"
  | "core_task_cannot_skip";

interface OverdueTaskActionResult {
  system: TwelveWeekSystem;       // equals input when applied = false
  applied: boolean;
  reason: OverdueTaskActionReason;
  updatedTask?: TwelveWeekTaskInstance;
}
```

### Rules

- **Move within week**: picks `max(today, scheduledDate + 1 day)`, capped to
  `weekEnd`. Bumps `rescheduledFrom` only on the first reschedule (preserves
  the original date if rescheduled twice). Refuses with `no_room_in_current_week`
  when the task is already on the last day of the week.
- **Move to next week**: increments `weekNumber` and resets `scheduledDate` to
  `nextWeekRange.start`. Refuses with `no_next_week_available` when on week 12.
- **Skip non-core**: sets `skipped: true`. Refuses with `core_task_cannot_skip`
  when `isCore === true`.
- All three refuse on `completed` or `skipped` tasks.

## Query exclusions

- `getTwelveWeekTodayTasks` excludes `skipped`.
- `getTwelveWeekMissedTasks` excludes `skipped`.
- `getTwelveWeekWeekCompletion` filters `skipped` out of both `total` and
  `completed`, so the percent reflects what the user actually intended.

## UI integration

In `TwelveWeekTodayTab` each task row already shows a status badge (`Đang trễ`
when overdue). v1 adds a small action row **inside the same task card** when:

- The task is overdue (`!completed && scheduledDate < todayDateKey`), AND
- At least one of `onRescheduleTaskWithinWeek` / `onRescheduleTaskToNextWeek` /
  (`onSkipNonCoreTask` && `!task.isCore`) is wired.

Buttons:

| Button | Icon | When shown |
| --- | --- | --- |
| Dời trong tuần | `CalendarClock` | `onRescheduleTaskWithinWeek` provided |
| Sang tuần sau | `CalendarPlus` | `onRescheduleTaskToNextWeek` provided |
| Bỏ qua | `X` | `onSkipNonCoreTask` provided AND `!task.isCore` |

Core tasks render an inline note "Việc cốt lõi không thể bỏ — chỉ dời lịch."
(`data-testid="overdue-core-note-{taskId}"`) so the user understands the
reason. There is no confirm dialog — instead, the **skip button is simply
absent** for core tasks. Helpers also reject the action if called directly
(defence in depth).

## Wiring (in `useTwelveWeekExecutionActions`)

Each handler:
1. Calls the matching pure helper.
2. On `applied === true` → `commitSystemUpdate(result.system)` and emits
   `trackAppEvent` with the current week number.
3. On `applied === false` → toasts the appropriate reason copy.
4. **No sync mutation enqueued** in v1 — local save is the source of truth.
   Plan snapshot already gets re-synced via existing flush paths after
   subsequent task toggles or weekly reviews.

## Tests

| File | Cases |
| --- | --- |
| `storage-twelve-week.test.ts` | 13 new (3 helpers × happy + refuse paths, plus skipped-exclusion in queries) |
| `TwelveWeekTodayTab.test.tsx` | 7 new (no actions when on-time, 3 buttons render for overdue non-core, skip hidden for core + note shown, each callback fires with task id, no actions without callbacks, complete checkbox still works) |

## Constraints honoured

- ✅ No full calendar.
- ✅ No drag-and-drop.
- ✅ No new dependencies (icons reuse `lucide-react`, button reuses existing UI).
- ✅ Schema change is **one optional field** (`skipped?`), normalised in
  `buildTaskInstances`, ignored by sync — within "không đổi storage schema lớn".
- ✅ No billing or sync wiring.
- ✅ No automatic / batch reschedule — each action is one explicit user click on
  one task.
- ✅ Core task skip is forbidden by both UI and helper.
- ✅ Local save is the source of truth.

## Limitations / TODO

- **Skipped tasks don't survive cloud round-trip**: persistence layer drops
  the field. If/when needed, add `skipped?: boolean` to
  `TwelveWeekImportTaskPayload` and `TwelveWeekPulledTask`, plus matching
  serialisers. Out of scope for v1.
- **No "undo skip"** in this UI — once skipped, the task disappears from the
  Today / missed queues. A future iteration can surface skipped tasks under a
  "Đã bỏ qua tuần này" details disclosure with an undo button.
- **No batch operation**: deliberate. Per constraint "Không tự động reschedule
  toàn bộ" the user must click each task individually. The existing reentry
  flow (`handleReentry` with `restart` / `lighten` / `push`) already covers
  the bulk case.
- **Reason codes are not yet emitted to analytics**: handlers emit a single
  event name per action (`12_week_task_rescheduled_within_week`,
  `_next_week`, `_skipped_non_core`) without the refusal reason. If telemetry
  on refusal modes becomes useful, attach `reason` as a property to the same
  event name.
