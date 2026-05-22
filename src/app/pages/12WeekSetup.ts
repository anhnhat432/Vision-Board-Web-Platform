// Compatibility re-export — the previous TwelveWeekSetup component was
// retired after the /12-week-setup-old/-lab cleanup. Tests and
// app-flow helpers keep importing TwelveWeekSetup; alias it to the
// current TwelveWeekSetupLab implementation.
export { TwelveWeekSetupLab as TwelveWeekSetup } from "../../features/plan12week/pages/12WeekSetupLab.tsx";
