export type PetEvent =
  | "idle"
  | "welcomeBack"
  | "taskCompleted"
  | "dailyFocusCompleted"
  | "goalMilestone"
  | "weeklyReviewDone"
  | "streakIncreased"
  | "gentleNudge";

export interface PetEventPayload {
  event: PetEvent;
  message?: string;
  source?: "dashboard" | "today" | "week" | "goal" | "system";
  createdAt?: number;
}

export interface PetPreferences {
  animationEnabled: boolean;
}
