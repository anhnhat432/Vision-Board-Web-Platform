/**
 * Goals components — Command Center concept
 *
 * Export all components for the /goals page redesign.
 */

export { TodayCommandCard, type SpotlightFocusData } from "./TodayCommandCard";
export { GoalStatusRail } from "./GoalStatusRail";
export { GoalFleetItem, type GoalFleetItemProps } from "./GoalFleetItem";
export { GoalFleetList } from "./GoalFleetList";
export { GoalFilterToolbar, type GoalFilterType } from "./GoalFilterToolbar";
export { GoalEmptyState } from "./GoalEmptyState";

// Legacy exports — kept for backward compatibility during migration
export { GoalSpotlight } from "./GoalSpotlight";
export { MissionCard, type MissionCardProps } from "./MissionCard";
export { MissionBoard } from "./MissionBoard";