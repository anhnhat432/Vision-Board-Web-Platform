# Page & Route Mapping

This file maps the URL paths to their corresponding React page components and layouts.

## Config-Based Router (`src/app/routes.tsx`)

| Path | Component File Path | Layout | Description |
|---|---|---|---|
| `/login` | `src/app/pages/LoginPage.tsx` | - | Login & Sign up page |
| `/` | `src/app/pages/Dashboard.tsx` | `RootLayout` | Main user dashboard |
| `/onboarding` | `src/app/pages/Onboarding.tsx` | `RootLayout` | Interactive onboarding |
| `/life-balance` | `src/app/pages/LifeBalance.tsx` | `RootLayout` | Life wheel scoring (8 categories) |
| `/life-insight` | `src/app/pages/LifeInsight.tsx` | `RootLayout` | Analyzes imbalance and identifies focus area |
| `/smart-goal-setup` | `src/app/pages/SMARTGoalSetup.tsx` | `RootLayout` | Step-by-step SMART Goal generator |
| `/feasibility` | `src/app/pages/FeasibilityCheck.tsx` | `RootLayout` | Checks goal feasibility and risks |
| `/12-week-setup` | `src/app/pages/12WeekSetupLab.tsx` | `RootLayout` | Milestones, habits, and execution plan builder |
| `/12-week-system` | `src/features/plan12week/pages/12WeekSystem/index.tsx` | `RootLayout` | Main execution command center |
| `/journal` | `src/app/pages/ReflectionJournal.tsx` | `RootLayout` | Daily/weekly reflection journal |
| `/settings` | `src/app/pages/SettingsPage.tsx` | `RootLayout` | Settings and profile |
| `/billing/plan` | `src/app/pages/BillingPlan.tsx` | `RootLayout` | Pricing & Subscription Plans |
| `/billing/confirm` | `src/app/pages/BillingConfirm.tsx` | `RootLayout` | Checkout confirmation page |
| `/billing/checkout/:id` | `src/app/pages/BillingCheckoutQR.tsx` | `RootLayout` | VietQR QR payment screen |
| `/goals` | `src/app/pages/GoalTracker.tsx` | `RootLayout` | View and manage user goals |

## Router Source Code

The full router config can be found in [routes.tsx](file:///c:/Users/admin/Downloads/Vision%20Board%20Web%20Platform/src/app/routes.tsx).
