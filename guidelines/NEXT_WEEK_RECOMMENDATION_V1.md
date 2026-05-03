# Next-Week Adjustment Recommendation v1

After the user saves a weekly review, the app produces a single deterministic
recommendation for **next week's posture**: `lighter`, `same`, `push`, `reset`,
or `reduce_scope`. The recommendation is **never auto-applied** — caller code
decides what "apply" means and only does so on explicit user click.

The pure helper lives at `src/features/plan12week/logic/nextWeekRecommendation.ts`
and is re-exported via `@/features/plan12week/logic`. UI is in
`src/app/components/twelve-week/TwelveWeekNextWeekRecommendationCard.tsx`,
rendered by the Week tab below the saved-review summary.

## Inputs

```ts
interface NextWeekRecommendationContext {
  weekCompletionPercent: number;                         // required, 0..100
  leadMetricCompletionPercent?: number | null;           // optional
  dailyCheckInConsistencyPercent?: number | null;        // optional
  workloadDecision?: "keep same" | "reduce slightly" | "increase slightly" | "";
  feasibilityPlanLoad?: "lighter" | "balanced" | "push" | null;
  rescueSeverity?: RescueSeverity | null;
  rescueTriggers?: ReadonlyArray<RescueTriggerId>;
}
```

All fields except `weekCompletionPercent` are optional. Missing signals lower
confidence — they never throw. Legacy reviews (only `weekCompletionPercent`
provided) still produce sensible recommendations.

## Decision pipeline

The helper evaluates rules in priority order, returning at the first match.

| # | Rule | Result | Confidence boost |
| --- | --- | --- | --- |
| 1 | `rescueSeverity === "urgent"` | `reset` (`rescue_urgent`) | dual signal |
| 2 | `workloadDecision === "reduce slightly"` | `lighter` (`user_says_too_much`) | +1 if completion < 50% |
| 3 | `workloadDecision === "increase slightly"` | `push` (`user_says_too_easy`) | +1 if completion ≥ 80% |
| 4 | `weekCompletionPercent < 30` | `reset` (`very_low_week_completion`) | +1 per rescue trigger / inconsistent check-ins |
| 5 | completion ≥ 70% AND lead metric ≤ 30% | `reduce_scope` | dual signal |
| 6 | completion < 50% | `lighter` | +1 per `rescue_active`, `feasibility_lighter`, `inconsistent_check_ins` |
| 7 | completion ≥ 80% AND lead metric ≥ 70% AND consistency ≥ 70% | `push` | +1 per `feasibility_push` |
| 8 | else | `same` | +1 if user said `keep same`, +1 if completion ≥ 80% |

User-explicit rules (#2, #3) outrank derived completion bands but lose to
urgent rescue (#1) so a clear emergency overrides a stale form choice.

## Confidence

| Confidence | When |
| --- | --- |
| `high` | User explicit AND ≥ 2 supporting signals, OR ≥ 3 supporting signals from data |
| `medium` | Either ≥ 2 supporting signals OR user explicit alone |
| `low` | Default `same` with no signals (`no_signals` reason code) |

## Reason codes (analytics-safe enums)

`rescue_urgent`, `rescue_active`, `user_says_too_much`, `user_says_too_easy`,
`user_says_keep_same`, `low_week_completion`, `very_low_week_completion`,
`high_week_completion`, `low_lead_metric_completion`,
`high_lead_metric_completion`, `inconsistent_check_ins`,
`consistent_check_ins`, `feasibility_lighter`, `feasibility_push`,
`weekly_review_missed`, `no_completion_streak`, `no_signals`.

These are stable strings (only `[a-z_]`). Safe to bucket for analytics.
The headline / body / priority hint contain only canned Vietnamese copy —
no user content is interpolated.

## UI integration

`TwelveWeekNextWeekRecommendationCard` renders only when:
- The current week's review is **completed** (`currentReview?.reviewCompleted === true`).
- A non-null `recommendation` was computed.

Card displays:
- **Compass icon + adjustment badge** (`Nhẹ hơn` / `Giữ nguyên` / `Đẩy thêm` / `Restart nhẹ` / `Thu hẹp scope`).
- **Confidence badge** (`Tin cậy cao` / `Tin cậy vừa` / `Tin cậy thấp`).
- **Headline + body** — short Vietnamese copy from the helper.
- **Khung ưu tiên tuần sau** — generic frame, **not** a copy-paste suggestion.
- **Control note** — "Bạn vẫn kiểm soát kế hoạch — đây chỉ là gợi ý dựa trên
  tuần này, không tự đổi plan cho bạn." (`data-testid="next-week-recommendation-control-note"`).
- **Apply button** — only when `onAcceptRecommendation` callback is wired. The
  card never auto-applies. In `12WeekSystem.tsx` v1, accepting reuses the
  existing `handleApplySuggestedPlan` path so the user explicitly confirms.

## Snapshot computation

`useTwelveWeekSystemSnapshot` computes `nextWeekRecommendation` lazily via
`useMemo` from existing fields:
- `weekCompletionPercent`: from `weekCompletion.percent`.
- `dailyCheckInConsistencyPercent`: derived from `system.dailyCheckIns` filtered
  to the current week range, divided by `min(daysElapsedInWeek, 7)`.
- `workloadDecision`: from `currentReview.workloadDecision`.
- `feasibilityPlanLoad`: from `system.tacticLoadPreference`.
- `rescueSeverity` / `rescueTriggers`: from the existing `rescueStatus` memo.
- `leadMetricCompletionPercent`: **null in v1** (no aggregate lead-metric scorer
  available yet — see TODO).

When `currentReview?.reviewCompleted !== true`, the recommendation is `null`
and the card is hidden.

## Constraints honoured (v1)

- ✅ No auto-edit of plan / tasks / system. Card only fires user-clicked callbacks.
- ✅ No AI.
- ✅ No new dependencies.
- ✅ No storage schema changes — recommendation is purely derived runtime data.
- ✅ No billing / sync.
- ✅ Backwards compatible — legacy reviews without `workloadDecision` or
  rescue signals still produce a sensible `same` / band-derived recommendation.

## Limitations / TODO

- **No lead-metric aggregate scorer**: until a per-week
  `leadMetricCompletionPercent` is computed centrally, the `reduce_scope` rule
  fires only when the caller explicitly passes a value. v1 always passes `null`
  so `reduce_scope` is unreachable in production until the scorer ships.
- **Consistency window**: uses `currentWeekRange.start..end`. Edge case on
  the very first day of a week — daysElapsed clamps to 1 to avoid
  divide-by-zero. May feel harsh on day 1 if user hasn't checked in yet, but
  the recommendation only renders **after** weekly review save (i.e., end of
  week), so this is unlikely to mislead.
- **Rescue urgent overrides explicit user choice**: deliberate. If multiple
  emergencies converged into urgent severity, we don't trust a form value
  saved while still in crisis. Tunable via the `decideRecommendation`
  function's first branch.
- **Apply path** in `12WeekSystem.tsx` reuses `handleApplySuggestedPlan` —
  v1 surfaces this as a single accept action. A future iteration can branch
  per-recommendation (e.g., `lighter` → reduce next-week task count;
  `reset` → set next-week priority to a single core task).
- **No analytics emit yet**: callers can bucket by `recommendation.recommendation`
  + `recommendation.confidence` + `recommendation.reasonCodes[]` (all enum
  values). Do **not** pass headline / body / priority hint to analytics —
  copy may change between versions.
- **No "snooze" of recommendation**: card always reflects the latest snapshot.
  If user dislikes the recommendation, they can ignore the apply button —
  the card is informational, not blocking.
