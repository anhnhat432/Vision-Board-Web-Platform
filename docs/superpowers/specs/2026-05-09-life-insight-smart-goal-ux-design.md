# Life Insight To SMART Goal UX Design

## Goal

Make Life Insight feel like a decision step, not a report page, and make SMART Goal clearly inherit that decision so the user understands why the form starts where it does.

## Scope

In scope:

- Life Insight first screen highlights one concrete decision: the focus area selected from Life Balance.
- Life Insight explains why the focus area matters using the score, average gap, strongest area, and a SMART starter preview.
- The primary CTA uses decision language: create a SMART Goal from this decision.
- SMART Goal hero shows the Life Insight handoff context: selected area, starter metric, suggested 12-week frame, and current progress.
- Fix visible copy polish in the touched SMART Goal shell where it directly affects this handoff.

Out of scope:

- New storage keys or persisted shapes.
- Backend/Firebase sync behavior.
- Changing SMART Goal validation or feasibility scoring.
- Auto-filling the SMART form without user action. Existing “Dùng gợi ý” remains the explicit action.

## UX Behavior

Life Insight keeps the existing default: recommend the lowest-scored Life Balance area. If the user chooses another area manually, the decision summary updates immediately and the CTA stores that chosen area in `APP_STORAGE_KEYS.selectedFocusArea`.

The decision summary appears near the top and includes:

- `Trọng tâm`: selected focus area and score.
- `Lý do`: lowest score or manual override explanation.
- `Gợi ý SMART`: a compact preview from existing `getSmartGoalStarter`.
- `Điểm tựa`: strongest area from Life Balance.

SMART Goal reads the existing selected focus area and existing starter helper. The hero adds a visible “Life Insight đã chọn” card so the user sees the handoff before entering the first SMART answer.

## Data Flow

- Life Insight continues using `currentWheelOfLife` from local-first user data.
- Life Insight continues writing only `APP_STORAGE_KEYS.selectedFocusArea`.
- SMART Goal continues deriving starter copy from `getSmartGoalStarter(focusArea)`.
- No localStorage migration is needed.

## Testing

- Extend Life Insight route test to assert the new decision card and CTA copy.
- Add/extend SMART Goal test coverage so the hero shows the handoff card from the selected focus area.
- Run targeted tests first, then `npm run check`, then MVP smoke if practical.
