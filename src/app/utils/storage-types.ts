export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface LifeArea {
  name: string;
  score: number;
  color: string;
}

export interface WheelOfLifeRecord {
  date: string;
  areas: LifeArea[];
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface DailyUpdate {
  date: string;
  workedToday: boolean;
  note: string;
}

export interface WeeklyReview {
  week: number;
  wentWell: string;
  gotInTheWay: string;
  improveNextWeek: string;
  score: number;
  completed: boolean;
  completedWeeklyActions?: number;
}

export interface ScoreboardWeek {
  week: number;
  score: number;
  reviewed: boolean;
}

export interface LagMetric {
  name: string;
  unit: string;
  target: string;
  currentValue: string;
}

export type TacticType = "core" | "optional";

export interface LeadIndicator {
  id?: string;
  name: string;
  target: string;
  unit: string;
  type?: TacticType;
  priority?: number;
  schedule?: number[];
}

export interface Milestones {
  week4: string;
  week8: string;
  week12: string;
}

export interface WeeklyPlanEntry {
  weekNumber: number;
  phaseName: string;
  focus: string;
  milestone: string;
  completed: boolean;
}

export interface UniversalDailyCheckIn {
  date: string;
  didWorkToday: boolean;
  whichLeadIndicatorWorkedOn: string;
  amountDone: string;
  outputCreated: string;
  obstacleOrIssue: string;
  dailySelfRating: number;
  optionalNote: string;
  mood?: "low" | "steady" | "high";
}

export interface UniversalWeeklyReview {
  weekNumber: number;
  leadCompletionPercent: number;
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  nextWeekPriority: string;
  workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "";
  reviewCompleted: boolean;
  progressScore: number;
  disciplineScore: number;
  focusScore: number;
  improvementScore: number;
  outputQualityScore: number;
  completedLeadIndicators?: number;
}

export interface UniversalScoreboardWeek {
  weekNumber: number;
  leadCompletionPercent: number;
  mainMetricProgress: string;
  outputDone: string;
  reviewDone: boolean;
  weeklyScore: number;
}

export interface TwelveWeekTaskInstance {
  id: string;
  weekNumber: number;
  scheduledDate: string;
  title: string;
  leadIndicatorName: string;
  isCore: boolean;
  completed: boolean;
  completedAt?: string;
  tacticId?: string;
  rescheduledFrom?: string;
}

export interface TwelveWeekSystem {
  goalType: string;
  vision12Week: string;
  templateId?: string;
  templateName?: string;
  lagMetric: LagMetric;
  leadIndicators: LeadIndicator[];
  milestones: Milestones;
  successEvidence: string;
  reviewDay: string;
  week12Outcome: string;
  weeklyActions?: string[];
  successMetric?: string;
  startDate: string;
  endDate: string;
  timezone: string;
  weekStartsOn: "Monday" | "Sunday";
  status: "active" | "paused" | "completed";
  dailyReminderTime?: string;
  tacticLoadPreference?: "balanced" | "lighter" | "push";
  preferredDays?: number[];
  personalConstraint?: "time" | "motivation" | "consistency" | "complexity";
  reentryCount?: number;
  currentWeek: number;
  totalWeeks: number;
  weeklyPlans: WeeklyPlanEntry[];
  taskInstances: TwelveWeekTaskInstance[];
  dailyCheckIns: UniversalDailyCheckIn[];
  weeklyReviews: UniversalWeeklyReview[];
  scoreboard: UniversalScoreboardWeek[];
  dailyUpdates?: DailyUpdate[];
  legacyWeeklyReviews?: WeeklyReview[];
  legacyScoreboard?: ScoreboardWeek[];
}

export interface TwelveWeekPlan {
  week12Outcome: string;
  weeklyActions: string[];
  successMetric: string;
  reviewDay: string;
  currentWeek: number;
  totalWeeks: number;
  weeklyCheckIns: string[];
}

export interface Goal {
  id: string;
  category: string;
  title: string;
  description: string;
  deadline: string;
  tasks: Task[];
  feasibilityResult?: string;
  readinessScore?: number;
  focusArea?: string;
  twelveWeekSystem?: TwelveWeekSystem;
  twelveWeekPlan?: TwelveWeekPlan;
  createdAt: string;
}

export interface VisionBoardItem {
  id: string;
  type: "image" | "quote" | "icon";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionBoard {
  id: string;
  name: string;
  year: string;
  items: VisionBoardItem[];
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface Reflection {
  id: string;
  date: string;
  title: string;
  content: string;
  mood?: string;
  entryType?: "freeform" | "weekly-review";
  linkedGoalId?: string;
  linkedWeekNumber?: number;
}

export interface TrackingEvent {
  id: string;
  type: string;
  createdAt: string;
  goalId?: string;
  metadata?: Record<string, string>;
}

export interface SyncOutboxItem {
  id: string;
  type: string;
  createdAt: string;
  goalId?: string;
  payloadSummary: string;
  /** pending → ready to sync · sent → confirmed by server · failed → max retries reached · archived → manually dismissed */
  status: "pending" | "sent" | "failed" | "archived";
  retryCount?: number;
  /** ISO datetime — sync should not be attempted before this */
  retryAt?: string;
  failedAt?: string;
}

export type PricingPlanCode = "FREE" | "PLUS" | "PRO";

export type SubscriptionStatus = "inactive" | "trialing" | "active" | "canceled";

export type BillingCycle = "monthly" | "quarterly" | "season-pass";

export type BillingProviderMode = "local_test" | "mock_provider" | "api_contract";

export type EntitlementKey =
  | "premium_templates"
  | "premium_review_insights"
  | "priority_reminders"
  | "advanced_analytics";

export interface Entitlement {
  key: EntitlementKey;
  sourcePlan: PricingPlanCode;
  grantedAt: string;
}

export interface Subscription {
  planCode: PricingPlanCode;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startedAt: string;
  renewsAt?: string | null;
  canceledAt?: string | null;
  isLocalTestMode?: boolean;
  providerMode?: BillingProviderMode;
  externalCustomerId?: string | null;
  externalSubscriptionId?: string | null;
  lastSyncedAt?: string | null;
}

export interface AppPreferences {
  allowLocalAnalytics: boolean;
  enableInAppReminders: boolean;
  enableBrowserNotifications: boolean;
  keepLocalOutbox: boolean;
  preferredReminderHour: number;
}

// ─── E2: Privacy consent record ──────────────────────────────────────────────

export type PrivacyConsentCategory = "local_analytics" | "push_notifications" | "experiment_tracking";

export interface PrivacyConsentRecord {
  category: PrivacyConsentCategory;
  granted: boolean;
  updatedAt: string;
}

// ─── D4: Rescue trigger rule engine ──────────────────────────────────────────

export type RescueTriggerKind =
  | "missed_checkin"
  | "low_execution_score"
  | "overdue_pile"
  | "trial_ending";

export type RescueTriggerSeverity = "watch" | "caution" | "urgent";

export interface RescueTrigger {
  kind: RescueTriggerKind;
  severity: RescueTriggerSeverity;
  headline: string;
  detail: string;
  surfacedAt: string;
}

// ─── C3: Paywall experiment framework ────────────────────────────────────────

export type ExperimentVariantId = "control" | "variant_a" | "variant_b";

export interface ExperimentAssignment {
  experimentId: string;
  variantId: ExperimentVariantId;
  assignedAt: string;
  /** ISO datetime when the experiment was first exposed (impression logged) */
  exposedAt?: string;
}

// ─── D3: Email reminder cadence contract ─────────────────────────────────────

export type EmailReminderKind =
  | "review_day_reminder"
  | "missed_task_rescue"
  | "trial_ending_reminder"
  | "cycle_start_nudge";

export interface EmailReminderScheduleItem {
  id: string;
  kind: EmailReminderKind;
  scheduledFor: string;
  goalId?: string;
  weekNumber?: number;
  metadata?: Record<string, string>;
  status: "scheduled" | "sent" | "canceled";
}

// ─── D2: Push notification subscription record ───────────────────────────────

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  registeredAt: string;
  goalId?: string;
}

export interface InAppReminder {
  id: string;
  title: string;
  description: string;
  href: string;
  kind: "tasks" | "review" | "check-in";
  goalId?: string;
}

export interface FunnelStepSummary {
  id: string;
  label: string;
  description: string;
  count: number;
  lastSeenAt: string | null;
}

export interface UserData {
  storageVersion: number;
  userId: string;
  wheelOfLifeHistory: WheelOfLifeRecord[];
  currentWheelOfLife: LifeArea[];
  goals: Goal[];
  visionBoards: VisionBoard[];
  achievements: Achievement[];
  reflections: Reflection[];
  eventLog: TrackingEvent[];
  syncOutbox: SyncOutboxItem[];
  appPreferences: AppPreferences;
  subscription?: Subscription | null;
  entitlements?: Entitlement[];
  lastMotivationalQuote?: string;
  onboardingCompleted: boolean;
  isHydratedFromDemo?: boolean;
  /** C3: stable A/B experiment assignments for this user */
  experimentAssignments?: ExperimentAssignment[];
  /** D3: email reminder schedule items queued for delivery */
  emailReminderSchedule?: EmailReminderScheduleItem[];
  /** D2: active web push subscription for this device */
  pushSubscription?: PushSubscriptionRecord | null;
  /** E2: privacy consent records with timestamps */
  privacyConsents?: PrivacyConsentRecord[];
}
