# User Intent v1

Lightweight intent classification asked once at the top of the core funnel.
The goal is to give downstream steps (SMART hints, Feasibility overlay,
12-week plan defaults) **enough signal to pre-hint** without forcing the
user into a category.

Module: `@/app/utils/user-intent`

## Audit before this task

No prior "intent" concept existed in source:

- No field on `UserData`.
- No `APP_STORAGE_KEYS` entry.
- No component asks the user what they want to do.
- Archetype is only inferred *after* the user writes a SMART goal
  (at FeasibilityCheck runtime).

## Taxonomy

| Intent id           | Vietnamese label                   | → Archetype          | Has actionable hint |
| ------------------- | ---------------------------------- | -------------------- | ------------------- |
| `complete_project`  | Hoàn thành một dự án               | `project_completion` | yes                 |
| `build_habit`       | Xây một thói quen                  | `habit_building`     | yes                 |
| `learn_skill`       | Học một kỹ năng                    | `skill_learning`     | yes                 |
| `improve_health`    | Cải thiện sức khỏe                 | `health_fitness`     | yes                 |
| `prepare_exam`      | Chuẩn bị thi hoặc chứng chỉ        | `exam_study`         | yes                 |
| `grow_finance`      | Tăng thu nhập hoặc tiết kiệm       | `financial_goal`     | yes                 |
| `find_direction`    | Tìm lại định hướng                 | `other`              | no (intentional)    |
| `unsure`            | Chưa chắc, cứ đi tiếp              | `other`              | no (intentional)    |

`find_direction` and `unsure` both map to `"other"` so that downstream
archetype overlays **degrade to generic copy** for users still exploring.
This prevents us from forcing a user who is "figuring it out" into a
specific discipline.

## Storage model

- **Key**: `APP_STORAGE_KEYS.userIntent` → `"user_intent"` localStorage
  key. Standalone, **not** inside `UserData` — no schema migration risk.
- **Shape**: `{ intent: UserIntentId, updatedAt: string /* ISO */ }`.
- **Reads**: `getUserIntent()` / `getUserIntentId()` tolerate missing,
  malformed, or unknown-id payloads. All cases return `null`.
- **Clears**: `clearUserIntent()` removes the record. Also covered by
  existing `clearAllLocalData()` sweep (which iterates `APP_STORAGE_KEYS`).
- **Backward compatible**: missing record = pre-v1 behavior. Nothing in
  the app breaks if the key never gets written.

## Taxonomy → Archetype mapping

`getArchetypeForIntent(intent)` is deterministic and pure. It is the
single source of truth for "what archetype does this intent imply?"
Downstream modules use this instead of duplicating mapping tables.

`hasActionableArchetypeHint(intent)` returns `true` only when the intent
maps to a non-`"other"` archetype. UI code should gate archetype-derived
hints on this helper so "unsure" users see the default generic copy
unchanged.

## UI integration

### Onboarding intent picker (LifeInsight page)

`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\pages\LifeInsight.tsx`

- Rendered as a collapsible `<details data-testid="life-insight-intent-picker">`
  between the focus-area switcher and the radar overview.
- **Default closed** when nothing has been chosen yet → zero extra
  vertical space in the happy path.
- **Auto-opens** when a choice exists so returning users can review
  without hunting for it.
- Implemented as `role="radiogroup"` with 8 `role="radio"` buttons
  (`aria-checked`). Each option has a `data-intent-id` attribute for
  reliable test queries.
- "Bỏ chọn" control clears the record + fires `user_intent_cleared`.
- Vietnamese copy, no jargon — follows the shared copy memory.

### SMART goal setup hint (MeasurableStep)

`@C:\Users\admin\Downloads\Vision Board Web Platform\src\app\pages\SMARTGoalSetup\components\MeasurableStep.tsx`

- New optional prop `intentMetricHint?: string`.
- When present, a sky-blue hint banner (`data-testid="smart-intent-metric-hint"`)
  renders below the existing helper text with:
  `"Gợi ý theo hướng bạn chọn: <hint>"`.
- Banner ID is added to the input's `aria-describedby` so screen readers
  announce both the helper and the hint when the field is focused.
- Pulled from `getArchetypeQualityHints(archetype).recommendedMetric`
  via the public `@/lib/smart-goal/goalArchetypes` API. No duplicate
  copy tables.
- If intent is missing, `unsure`, or `find_direction` → the prop is
  `undefined` → the step renders identically to before (backwards-compat
  verified by tests).

## Analytics

Two new event types, both allowlisted to ship **only** structured ids:

| Event                  | Allowlisted fields         |
| ---------------------- | -------------------------- |
| `user_intent_selected` | `source`, `intent_id`      |
| `user_intent_cleared`  | `source`                   |

- No label, no description, no goal text, no timestamp in the allowlist.
- `buildIntentAnalyticsPayload(intent)` returns `{ intent_id }` only,
  for callers that need a single-field payload.

## Constraint compliance

- ✅ No AI.
- ✅ No new dependencies.
- ✅ No route changes — the picker is a `<details>` inside LifeInsight.
- ✅ No billing / sync wiring.
- ✅ No sensitive data collected — only an enum id.
- ✅ No `UserData` schema change — standalone key.
- ✅ Flow length unchanged in the happy path (picker collapsed by default).

## Tests

| File                                                       | Count | Scope                                                                                      |
| ---------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| `src/app/utils/user-intent.test.ts`                        | 19    | Taxonomy, storage round-trip, malformed-payload tolerance, archetype mapping, analytics.   |
| `src/app/pages/life-insight-intent.test.tsx`               | 5     | Renders 8 options, can choose, can skip, can pick "unsure", "Bỏ chọn" clears the record.   |
| `src/app/pages/SMARTGoalSetup/components/MeasurableStep.test.tsx` | 2 | Hint absent by default; present + aria-describedby extended when `intentMetricHint` given. |

Unchanged tests verified green:

- `Onboarding.test.tsx` (2/2)
- `LifeBalance.test.tsx` (2/2)
- `core-funnel-guard.test.tsx` (5/5)
- `core-funnel-a11y.test.tsx` (7/7)
- `SMARTGoalSetup/helpers.test.ts` (many)
- `@/lib/smart-goal/quality.test.ts` (30)

Whole-suite status at end of task: **78 files, 760 tests pass** (delta
+26 vs. previous baseline of 734 from the previous core-funnel gate).

## Limitations

- **No persistent cross-device sync** — intent lives in localStorage only.
  A user on a new device gets the pre-v1 (no-hint) behavior. This is
  intentional per "no billing/sync" constraint.
- **No re-prompt** — the picker stays closed if the user ignored it. We
  do not nudge. A future iteration could add a soft reminder on SMART
  setup entry if intent is still `null`, but that adds friction.
- **Hint surfaced only on Measurable step** — v1 does not touch
  Specific, Achievable, Relevant, or TimeBound step copy. The archetype
  data has more hooks (`antiPatterns`, `weekOneStart`) we can surface
  later if user feedback confirms the Measurable hint lands.
- **`unsure` / `find_direction` are indistinguishable downstream** —
  both become `"other"`. If we ever want to show a specific "exploring"
  affordance (e.g., an onboarding tips panel), we can gate on the
  intent id itself rather than the archetype.
- **FeasibilityCheck does not yet consume the intent** — it still infers
  archetype from the written SMART goal. Wiring intent → feasibility
  archetype override is a separate follow-up; intent can supplement or
  override keyword inference with better UX precedent.
- **12WeekSetup does not prefill `goalType` from intent** — the
  `goalType` dropdown in OutcomeStep would be a natural next wiring
  point (`GOAL_TYPE_TO_ARCHETYPE` mapping already exists). Parked until
  friendly-beta confirms the current hint is useful.
- **Keyword classifier already exists** in `inferGoalArchetype` — the
  stored intent is an additional, earlier signal; it does **not**
  replace the keyword scan. Both paths can coexist.
- **No analytics for hint impressions yet** — we log selection and
  clear, but not "the hint was displayed on MeasurableStep". If we
  want to measure hint → metric-name correlation, add a
  `smart_intent_hint_shown` event gated on step + intent id.

## Follow-up prompts

1. **Wire intent → 12WeekSetup OutcomeStep `goalType` prefill** using
   `getArchetypeForIntent` + reverse `GOAL_TYPE_TO_ARCHETYPE` mapping.
   Keep the user able to override.
2. **Wire intent → FeasibilityCheck archetype override** when the user
   picked a concrete intent; fall back to keyword scan when `unsure`.
3. **Add `intent_id` to `smart_goal_created` + `feasibility_completed`
   event allowlist** so we can bucket outcomes by stated intent. Keep
   both events allowlisted strictly — no raw text leaks.
4. **Surface archetype `antiPatterns` (top 1) as collapsible "Lưu ý
   chung cho hướng này"** inside the Relevant step. Collapsed by
   default, so text density does not grow in the happy path.
5. **Re-prompt strategy** — after MVP friendly-beta, decide whether to
   soft-remind users at SMART setup entry when intent is still `null`.
