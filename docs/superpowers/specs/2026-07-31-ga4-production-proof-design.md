# GA4 Production Proof Design

## Goal

Make the existing privacy-safe activation events reach GA4 in real-mode production without creating a new analytics system or duplicating Vercel configuration unnecessarily.

## Current Evidence

- The app already emits the required funnel events, including `onboarding_started`, `smart_goal_created`, `twelve_week_plan_created`, `today_task_completed`, `weekly_review_submitted`, and monetization events.
- Remote delivery is already restricted to real mode with `VITE_ANALYTICS_MODE=ga4` and a valid `G-*` measurement id.
- Vercel production has `VITE_FIREBASE_MEASUREMENT_ID` and `VITE_ANALYTICS_MODE`, but does not have `VITE_GA_MEASUREMENT_ID`.
- A live check of `https://dearourfuture.io.vn/` on 2026-07-31 found no GA script, `window.gtag`, or `window.dataLayer`.

## Options Considered

1. **Use the Firebase measurement id as a fallback (selected).** Small code change, no duplicate env value, and Firebase's measurement id is already the GA4 web-stream id.
2. Copy the existing value into a new Vercel `VITE_GA_MEASUREMENT_ID`. Fast but creates two env variables that can drift.
3. Build backend/server analytics. More durable, but too large for the current post-launch need.

## Design

- `VITE_GA_MEASUREMENT_ID` remains the explicit first choice.
- When it is empty, the app falls back to `VITE_FIREBASE_MEASUREMENT_ID`.
- The resolved value must still match `G-[A-Z0-9]+`.
- GA4 still loads only when `VITE_APP_MODE=real` and `VITE_ANALYTICS_MODE=ga4`.
- Apply the same resolution in the GA script loader and remote-event gate so they cannot disagree.
- Keep the existing event names, payload allowlists, local event log, demo behavior, and consent behavior unchanged.

## Acceptance

- WHEN `VITE_GA_MEASUREMENT_ID` is valid, THE system SHALL use it before the Firebase value.
- WHEN `VITE_GA_MEASUREMENT_ID` is missing and `VITE_FIREBASE_MEASUREMENT_ID` is valid, THE system SHALL enable the existing GA4 script and event pipeline.
- WHERE the resolved id is missing or invalid, THE system SHALL keep remote analytics disabled.
- WHILE the app is in demo mode or analytics mode is not `ga4`, THE system SHALL keep remote analytics disabled.
- Existing privacy filtering SHALL continue excluding account ids, email, goal text, notes, and other free text from remote events.
- After deployment, production SHALL expose the Google tag script, `window.gtag`, and a `dataLayer` event without requiring a new analytics provider.

## Verification

- Extend `src/app/utils/analytics.test.ts` for the Firebase fallback, explicit-id precedence, and disabled-mode boundaries.
- Run the analytics test, typecheck, lint, and build.
- After deployment, inspect `https://dearourfuture.io.vn/` for the GA script, `window.gtag`, `window.dataLayer`, and one existing canonical event.

## Out Of Scope

- New event schemas or additional funnel steps.
- A custom analytics dashboard or backend warehouse.
- GA4 property creation, audience configuration, attribution modeling, or D1/D7 reporting.
- Sending user ids, email, raw goal content, notes, payment payloads, or exact private text.
