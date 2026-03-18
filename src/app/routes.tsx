import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Onboarding } from "./pages/Onboarding";
import { Dashboard } from "./pages/Dashboard";
import { VisionBoardEditor } from "./pages/VisionBoardEditor";
import { GoalTracker } from "./pages/GoalTracker";
import { LifeBalance } from "./pages/LifeBalance";
import { Achievements } from "./pages/Achievements";
import { ReflectionJournal } from "./pages/ReflectionJournal";
import { VisionBoardGallery } from "./pages/VisionBoardGallery";
import { LifeInsight } from "./pages/LifeInsight";
import { FeasibilityCheck } from "./pages/FeasibilityCheck";
import { SMARTGoalSetup } from "./pages/SMARTGoalSetup";
import { TwelveWeekPlanSetup } from "./pages/12WeekPlanSetup";
import { TwelveWeekPlanOverview } from "./pages/12WeekPlanOverview";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Onboarding },
      { path: "onboarding", Component: Onboarding },
      { path: "life-insight", Component: LifeInsight },
      { path: "feasibility", Component: FeasibilityCheck },
      { path: "smart-goal-setup", Component: SMARTGoalSetup },
      { path: "12-week-plan-setup", Component: TwelveWeekPlanSetup },
      { path: "12-week-plan-overview", Component: TwelveWeekPlanOverview },
      { path: "vision-board/:id?", Component: VisionBoardEditor },
      { path: "goals", Component: GoalTracker },
      { path: "life-balance", Component: LifeBalance },
      { path: "achievements", Component: Achievements },
      { path: "journal", Component: ReflectionJournal },
      { path: "gallery", Component: VisionBoardGallery },
    ],
  },
]);
