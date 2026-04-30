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
- GA4 script injection also requires `VITE_APP_MODE=real`; demo mode must not load GA even if GA env vars are accidentally present.
- External analytics uses a per-event allowlist and strips sensitive keys/values before writing to `dataLayer` or `gtag`. Local event log can keep richer debug metadata on the user's device.

## Event Taxonomy

| Event | Area | Purpose | Key payload |
| --- | --- | --- | --- |
| `landing_viewed` | `core_funnel` | User lands on the dashboard/home entry. | `source`, `app_mode`, `signed_in`, `auth_configured`, `has_local_12_week_system` |
| `demo_started` | `core_funnel` | Signed-out/public visitor clicks the demo start CTA. | `source`, `app_mode`, `signed_in`, `auth_configured`, `start_destination` |
| `onboarding_started` | `core_funnel` | User starts assessment/onboarding. | `source`, `returning_user` |
| `life_balance_started` | `core_funnel` | User starts the Life Balance scoring step. | `source`, `returning_user`, `has_existing_scores` |
| `life_balance_completed` | `core_funnel` | User completes life wheel scoring. | `area_count`, `average_score`, `weakest_area`, `strongest_area` |
| `smart_goal_created` | `core_funnel` | User saves a SMART goal draft. | `focus_area`, `target_mode`, `target_weeks`, `has_baseline`, `weekly_hours` |
| `feasibility_completed` | `core_funnel` | User completes feasibility check. | `focus_area`, `readiness_score`, `adjusted_score`, `bottleneck_axis`, `plan_load` |
| `twelve_week_setup_started` | `12_week` | User enters the 12-week setup from the validated funnel handoff. | `source`, `current_plan`, `entry_mode`, `template_tier`, `has_saved_draft` |
| `twelve_week_plan_created` | `12_week` | User creates a 12-week execution plan. | `goal_type`, `focus_area`, `total_weeks`, `lead_indicator_count`, `task_count`, `template_tier` |
| `twelve_week_system_viewed` | `12_week` | User opens the 12-week execution workspace. | `source`, `week_number`, `total_weeks`, `current_plan`, `active_tab`, `has_today_tasks`, `has_weekly_review` |
| `today_task_completed` | `12_week` | User completes/uncompletes an execution task. | `source`, `week_number`, `is_core` |
| `weekly_review_submitted` | `12_week` | User submits a weekly review. | `source`, `week_number`, `lead_completion_percent`, `execution_score`, `workload_decision` |
| `progress_viewed` | `12_week` | User views progress in dashboard or 12-week system. | `source`, `week_number`, `total_weeks`, `current_plan` |
| `paywall_opened` | `monetization` | User sees an upgrade prompt. | `context`, `source`, `current_plan`, `recommended_plan` |
| `checkout_started` | `monetization` | User starts mock/provider checkout. | `context`, `source`, `current_plan`, `recommended_plan`, `plan_code` |
| `checkout_completed` | `monetization` | Checkout flow completes and entitlement is applied. | `context`, `source`, `plan_code`, `result_plan`, `provider_mode` |
| `upgrade_restored` | `monetization` | User restores or checks entitlement state. | `source`, `status`, `provider_mode`, `plan_code`, `entitlement_count` |
| `paywall_cta_clicked` | `monetization` | User clicks an upgrade CTA. | `context`, `source`, `current_plan`, `recommended_plan`, `target_plan`, `placement` |
| `premium_template_unlock_prompted` | `monetization` | User tries to use a locked template. | `source`, `current_plan`, `template_id`, `required_plan` |
| `premium_template_applied` | `monetization` | User applies a free or premium template. | `source`, `current_plan`, `template_id`, `template_name`, `tier`, `required_plan` |
| `premium_insight_opened` | `monetization` | User opens premium weekly insight. | `source`, `current_plan`, `week_number` |
| `rescue_trigger_fired` | `12_week` | A rescue trigger becomes relevant. | `kind`, `severity`, `current_plan` |
| `rescue_trigger_dismissed` | `12_week` | User dismisses a rescue trigger. | `kind`, `current_plan` |
| `rescue_action_taken` | `12_week` | User acts on a rescue suggestion. | `kind`, `action`, `current_plan` |
| `experiment_exposure` | `core_funnel` | User is assigned or exposed to an experiment variant. | `experiment_id`, `variant_id`, `context` |
| `feedback_submitted` | `core_funnel` / `12_week` | User submits short public-demo feedback without login. | `source`, `context`, `rating`, `feedback_category`, `confusing_text_length`, `next_help_text_length`, `has_next_help_text` |

## External Privacy Contract

- External payloads contain only `event`, `app`, `area`, and the allowlisted fields above for that event.
- The wrapper strips unexpected fields and sensitive keys before external mirroring, including goal text/title, reflection/note/content, email, phone, address, Firebase UID, backend user id, and generic user id fields.
- The wrapper also drops external string values that look like emails/account ids, contain newlines, or are long enough to look like free-form user text.
- `goalId`, legacy event payloads, and richer debug metadata stay local-only through `trackAppEvent`.
- `feedback_submitted` must never send raw feedback text externally. Raw public-demo feedback is stored only in the browser-local feedback store; external analytics receives rating/category/source/context and text lengths only.

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
- Some legacy local event names are still written for compatibility with existing local history and tests, including `demo_feedback_submitted` and older paywall names, but remote analytics uses the canonical event names above.
