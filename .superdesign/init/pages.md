# Page Dependency Trees

This file catalogs the component and module dependency trees for the key funnel pages.

## Onboarding
- **Route:** `/onboarding`
- **Entry:** `src/app/pages/Onboarding.tsx`
- **Dependencies:**
  - `src/app/components/CoreFlowProgress.tsx`
  - `src/app/components/PageShell.tsx`
  - `src/app/components/ui/button.tsx`
  - `src/app/components/ui/card.tsx`
  - `src/app/components/ui/progress.tsx`

## Life Balance
- **Route:** `/life-balance`
- **Entry:** `src/app/pages/LifeBalance.tsx`
- **Dependencies:**
  - `src/app/components/CoreFlowProgress.tsx`
  - `src/app/components/PageShell.tsx`
  - `src/app/components/ui/button.tsx`
  - `src/app/components/ui/card.tsx`
  - `src/app/components/ui/slider.tsx`

## Life Insight
- **Route:** `/life-insight`
- **Entry:** `src/app/pages/LifeInsight.tsx`
- **Dependencies:**
  - `src/app/pages/LifeInsight/components/FocusLantern.tsx`
  - `src/app/components/ui/button.tsx`
  - `src/app/components/ui/card.tsx`

## SMART Goal Setup
- **Route:** `/smart-goal-setup`
- **Entry:** `src/app/pages/SMARTGoalSetup.tsx`
- **Dependencies:**
  - `src/app/pages/SMARTGoalSetup/components/SpecificStep.tsx`
  - `src/app/pages/SMARTGoalSetup/components/MeasurableStep.tsx`
  - `src/app/pages/SMARTGoalSetup/components/AchievableStep.tsx`
  - `src/app/pages/SMARTGoalSetup/components/RelevantStep.tsx`
  - `src/app/pages/SMARTGoalSetup/components/TimeBoundStep.tsx`
  - `src/app/pages/SMARTGoalSetup/components/AnvilForgingEffect.tsx`
  - `src/app/components/ui/button.tsx`

## Feasibility Check
- **Route:** `/feasibility`
- **Entry:** `src/app/pages/FeasibilityCheck.tsx`
- **Dependencies:**
  - `src/app/components/ui/button.tsx`
  - `src/app/components/ui/card.tsx`
  - `src/app/components/ui/progress.tsx`

## 12-Week Plan Setup
- **Route:** `/12-week-setup`
- **Entry:** `src/app/pages/12WeekSetupLab.tsx`
- **Dependencies:**
  - `src/app/components/ui/button.tsx`
  - `src/app/components/ui/card.tsx`

## 12-Week System
- **Route:** `/12-week-system`
- **Entry:** `src/features/plan12week/pages/12WeekSystem/index.tsx`
- **Dependencies:**
  - `src/features/plan12week/components/`
  - `src/app/components/ui/button.tsx`
  - `src/app/components/ui/table.tsx`
