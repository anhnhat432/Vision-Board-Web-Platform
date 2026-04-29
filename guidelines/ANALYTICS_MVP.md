# Analytics MVP

## Goal

Analytics MVP records the public demo funnel and the 12-week execution loop without requiring a real analytics provider. The app always writes typed events to the local event log. In real mode, it mirrors events to GA4 through `window.dataLayer` and `window.gtag` only when analytics env is configured.

## Runtime Behavior

- Demo mode: local/debug logging only.
- Real mode with `VITE_ANALYTICS_MODE=ga4` and a valid `VITE_GA_MEASUREMENT_ID`: local log plus GA4-style `dataLayer`/`gtag` events.
- Missing or invalid GA env: local log only, no crash and no request spam.
- Wrapper: use `trackAnalyticsEvent` from `src/app/utils/analytics.ts`.
- Do not call `gtag` or `dataLayer` directly from pages/components.
- Do not send sensitive user input such as goal text, private notes, answers, email, or account identifiers.

## Event Taxonomy

| Event | Area | Purpose | Key payload |
| --- | --- | --- | --- |
| `onboarding_started` | `core_funnel` | User starts assessment/onboarding. | `source`, `returning_user` |
| `life_balance_completed` | `core_funnel` | User completes life wheel scoring. | `area_count`, `average_score`, `weakest_area`, `strongest_area` |
| `smart_goal_created` | `core_funnel` | User saves a SMART goal draft. | `focus_area`, `target_mode`, `target_weeks`, `has_baseline`, `weekly_hours` |
| `feasibility_completed` | `core_funnel` | User completes feasibility check. | `focus_area`, `readiness_score`, `adjusted_score`, `bottleneck_axis`, `plan_load` |
| `twelve_week_plan_created` | `12_week` | User creates a 12-week execution plan. | `goal_type`, `focus_area`, `total_weeks`, `lead_indicator_count`, `task_count`, `template_tier` |
| `today_task_completed` | `12_week` | User completes/uncompletes an execution task. | `source`, `week_number`, `is_core` |
| `weekly_review_submitted` | `12_week` | User submits a weekly review. | `source`, `week_number`, `lead_completion_percent`, `execution_score`, `workload_decision` |
| `progress_viewed` | `12_week` | User views progress in dashboard or 12-week system. | `source`, `week_number`, `total_weeks`, `current_plan` |
| `paywall_opened` | `monetization` | User sees an upgrade prompt. | `context`, `source`, `current_plan`, `recommended_plan` |
| `checkout_started` | `monetization` | User starts mock/provider checkout. | `context`, `source`, `current_plan`, `recommended_plan`, `plan_code` |
| `checkout_completed` | `monetization` | Checkout flow completes and entitlement is applied. | `context`, `source`, `plan_code`, `result_plan`, `provider_mode` |
| `upgrade_restored` | `monetization` | User restores or checks entitlement state. | `source`, `status`, `provider_mode`, `plan_code`, `entitlement_count` |

## Env

```env
VITE_ANALYTICS_MODE=off
VITE_GA_MEASUREMENT_ID=
```

For real GA4 mirroring:

```env
VITE_APP_MODE=real
VITE_ANALYTICS_MODE=ga4
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Implementation Notes

- `src/app/utils/analytics.ts` owns event names, payload types, local fallback, and remote mirroring.
- `src/app/utils/monetization-analytics.ts` keeps the existing billing/paywall helper API and maps it to canonical MVP events.
- Some legacy local event names are still written for compatibility with existing local history and tests, but remote analytics uses the canonical event names above.
