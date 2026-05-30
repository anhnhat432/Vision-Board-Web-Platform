import { Suspense } from "react";
import type { NavigateFunction } from "react-router";
import { BarChart3, CalendarDays, ListTodo, type LucideIcon, Settings2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { TabErrorBoundary } from "@/app/components/TabErrorBoundary";
import { CycleReviewPanel } from "@/app/components/twelve-week/CycleReviewPanel";
import { ProgressSummaryCard } from "@/app/components/twelve-week/ProgressSummaryCard";
import type {
  Goal,
  TwelveWeekSystem,
  TwelveWeekTaskInstance,
  PricingPlanCode,
  UniversalWeeklyReview,
  TimeBlock,
  AppPreferences,
  EntitlementKey,
  UniversalDailyCheckIn,
  LeadIndicator,
  FunnelStepSummary,
  InAppReminder,
  SyncOutboxItem,
} from "@/app/utils/storage-types";
import type { CycleSummary } from "@/features/plan12week/logic/cycleReview";
import { TaskBoard } from "@/features/plan12week/components/TaskBoard";
import { PlanOverview, WeekEditor, WeeklyReview } from "./lazyTabs";
import { TwelveWeekTabFallback } from "./components";
import type {
  ReentryMode,
  DailyMood,
  RescuePlanSummary,
  HeatmapCell,
  WeekTrendPoint,
  TacticBreakdownItem,
} from "@/app/utils/twelve-week-system-ui";
import type { PremiumFeatureContext } from "@/app/utils/twelve-week-premium/types";
import type { TwelveWeekWeeklyReviewForm } from "@/app/components/twelve-week/TwelveWeekWeekTab";
import type {
  BackendConnectionStatus,
  MutationQueueManualSyncStatus,
} from "@/app/components/twelve-week/TwelveWeekSettingsShared";
import type {
  RescueModeStatus,
  NextWeekRecommendation,
  ExecutionInsight,
} from "@/features/plan12week/logic";
import type {
  SuggestedNextWeekPlan,
  WeeklyReviewPremiumInsight,
} from "@/app/utils/twelve-week-premium/types";
import type {
  BrowserNotificationStatus,
  OutboxSyncSnapshot,
} from "@/app/utils/production";
import type {
  BillingActionSnapshot,
  BillingProviderStatus,
} from "@/app/utils/billing-contract";
import type {
  BackendPlanHydrationResult,
} from "@/app/hooks/useBackendPlanHydration";

const TWELVE_WEEK_SECTION_TABS = [
  { value: "today", label: "Hôm nay", icon: ListTodo },
  { value: "week", label: "Tuần", icon: CalendarDays },
  { value: "progress", label: "Tiến độ", icon: BarChart3 },
  { value: "settings", label: "Cài đặt", icon: Settings2 },
] satisfies Array<{ value: string; label: string; icon: LucideIcon }>;

interface TwelveWeekSystemTabsProps {
  activeTab: string;
  handleTabChange: (value: string) => void;
  setActiveTab: (value: string) => void;
  tabPanelId: string;
  isCycleReviewMode: boolean;
  activeGoal: Goal;
  system: TwelveWeekSystem;
  handleSaveCycleReview: (input: { lessons: string[]; summary: CycleSummary }) => void;
  handleStartNewCycle: (input: { lessons: string[]; summary: CycleSummary }) => void;
  handleRenameActiveGoal: (title: string) => void;
  onOpenFocusTab?: () => void;
  onOpenGoals?: () => void;
  aspirationalVisionSummary: string | null;
  currentWeek: number;
  currentWeekRange: { start: string; end: string } | null;
  currentPlanFocus: string | null;
  currentPlanMilestone: string | null;
  reviewDueToday: boolean;
  reviewStatusLabel: string;
  currentWeekScoreValue: number;
  weekCompletion: { completed: number; total: number; percent: number };
  coreTacticCount: number;
  optionalTacticCount: number;
  missedTasks: TwelveWeekTaskInstance[];
  todayQueue: TwelveWeekTaskInstance[];
  currentWeekOpenTasks: TwelveWeekTaskInstance[];
  todayDateKey: string;
  todayCompletedCount: number;
  todayRemainingCount: number;
  overdueOpenCount: number;
  optionalOpenThisWeekCount: number;
  firstPriorityTask: TwelveWeekTaskInstance | null;
  secondaryTodayTasks: TwelveWeekTaskInstance[];
  hasSmartRescue: boolean;
  rescuePlanSummary: RescuePlanSummary | null;
  dailyMood: DailyMood;
  dailyNote: string;
  latestCheckIn: UniversalDailyCheckIn | null;
  onReentry: (mode: ReentryMode) => void;
  onApplyRecommendedReentry: () => void;
  onOpenSmartRescue: () => void;
  onToggleTask: (taskInstanceId: string, completed: boolean) => void;
  onDailyMoodChange: (mood: DailyMood) => void;
  onDailyNoteChange: (note: string) => void;
  onSaveCheckIn: () => void;
  onOpenWeekTab?: () => void;
  onNavigateToSetup?: () => void;
  rescueStatus: RescueModeStatus | null;
  onPickTinyTask?: () => void;
  onReviewPlan?: () => void;
  onRescheduleTaskWithinWeek: (taskInstanceId: string) => void;
  onRescheduleTaskToNextWeek: (taskInstanceId: string) => void;
  onSkipNonCoreTask: (taskInstanceId: string) => void;
  currentLagMetricValue: string;
  coreIndicators: LeadIndicator[];
  optionalIndicators: LeadIndicator[];
  activePlanCode: PricingPlanCode;
  hasPremiumReviewInsights: boolean;
  premiumReviewInsight: WeeklyReviewPremiumInsight | null;
  suggestedNextWeekPlan: SuggestedNextWeekPlan | null;
  weeklyForm: TwelveWeekWeeklyReviewForm;
  currentReview: UniversalWeeklyReview | null;
  onWeeklyFormChange: <K extends keyof TwelveWeekWeeklyReviewForm>(field: K, value: TwelveWeekWeeklyReviewForm[K]) => void;
  onApplySuggestedPlan: () => void;
  onOpenPremiumInsights: () => void;
  onSaveWeeklyReview: () => void;
  onOpenTodayTab?: () => void;
  nextWeekRecommendation: NextWeekRecommendation | null;
  onAcceptNextWeekRecommendation?: () => void;
  weeklyReflectionInsights: ReadonlyArray<ExecutionInsight>;
  showFullProgress: boolean;
  setShowFullProgress: (show: boolean) => void;
  averageScore: number;
  reviewDoneCount: number;
  milestoneItems: Array<{ label: string; value: string }>;
  hasAdvancedAnalytics: boolean;
  executionHeatmap: HeatmapCell[];
  weeklyTrend: WeekTrendPoint[];
  tacticBreakdown: TacticBreakdownItem[];
  executionInsights: ReadonlyArray<ExecutionInsight>;
  navigate: NavigateFunction;
  backendConnectionStatus: BackendConnectionStatus;
  activeEntitlementKeys: EntitlementKey[];
  billingProviderStatus: BillingProviderStatus;
  lastEntitlementSyncSnapshot: BillingActionSnapshot | null;
  lastRestoreAccessSnapshot: BillingActionSnapshot | null;
  lastBackendHydrationResult: BackendPlanHydrationResult | null;
  appPreferences: AppPreferences;
  funnelSteps: FunnelStepSummary[];
  monetizationSteps: FunnelStepSummary[];
  browserNotificationStatus: BrowserNotificationStatus;
  lastSyncSnapshot: OutboxSyncSnapshot | null;
  pendingOutboxCount: number;
  archivedOutboxCount: number;
  eventCount: number;
  activeReminders: InAppReminder[];
  recentOutboxItems: SyncOutboxItem[];
  isSyncingEntitlements: boolean;
  isRestoringPlanAccess: boolean;
  isHydratingBackendPlans: boolean;
  isResolvingBackendPlanConflicts: boolean;
  mutationQueueSyncStatus: MutationQueueManualSyncStatus;
  handleReviewDayChange: (day: string) => void;
  handleReminderTimeChange: (time: string) => void;
  handleLoadPreferenceChange: (pref: string) => void;
  handleStatusChange: (status: string) => void;
  handleTacticPriorityChange: (tacticId: string | undefined, value: string) => void;
  handleTacticTypeChange: (tacticId: string | undefined, value: string) => void;
  handleTimeBlocksChange: (blocks: TimeBlock[]) => void;
  handlePreferenceToggle: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
  handleArchivePendingOutbox: () => void;
  handleRestoreArchivedOutbox: () => void;
  handleOpenReminder: (reminder: InAppReminder) => void;
  handleExportLocalData: () => void;
  handleExportCloudWorkspace: () => void;
  handleDeleteCloudWorkspace: () => void;
  handleBrowserNotificationToggle: (value: boolean) => Promise<void>;
  handleRunOutboxSync: () => void;
  handleOutboxItemToggle: (item: SyncOutboxItem) => void;
  handleClearEventLog: () => void;
  handleClearArchivedOutbox: () => void;
  setIsClearLocalDialogOpen: (open: boolean) => void;
  handleDeleteAllData: () => void;
  setIsDeleteDataDialogOpen: (open: boolean) => void;
  setIsResetDialogOpen: (open: boolean) => void;
  handleOpenUpgradeDialog: (context: PremiumFeatureContext, planCode: Exclude<PricingPlanCode, "FREE">) => void;
  handleSyncEntitlements: () => void;
  handleRestorePlanAccess: () => void;
  handleHydrateBackendPlans: () => void;
  handleRunMutationQueueSync: () => void;
  handleKeepLocalPlanForConflicts: (goalId: string) => Promise<void>;
  handleUseBackendPlanForConflicts: (goalId: string) => Promise<void>;
  handleUseCloudVersion: () => void;
  handleOpenBillingPortal: () => void;
}

export function TwelveWeekSystemTabs({
  activeTab,
  handleTabChange,
  setActiveTab,
  tabPanelId,
  isCycleReviewMode,
  activeGoal,
  system,
  handleSaveCycleReview,
  handleStartNewCycle,
  handleRenameActiveGoal,
  aspirationalVisionSummary,
  currentWeek,
  currentWeekRange,
  currentPlanFocus,
  currentPlanMilestone,
  reviewDueToday,
  reviewStatusLabel,
  currentWeekScoreValue,
  weekCompletion,
  coreTacticCount,
  optionalTacticCount,
  missedTasks,
  todayQueue,
  currentWeekOpenTasks,
  todayDateKey,
  todayCompletedCount,
  todayRemainingCount,
  overdueOpenCount,
  optionalOpenThisWeekCount,
  firstPriorityTask,
  secondaryTodayTasks,
  hasSmartRescue,
  rescuePlanSummary,
  dailyMood,
  dailyNote,
  latestCheckIn,
  onReentry,
  onApplyRecommendedReentry,
  onOpenSmartRescue,
  onToggleTask,
  onDailyMoodChange,
  onDailyNoteChange,
  onSaveCheckIn,
  onOpenWeekTab,
  onNavigateToSetup,
  rescueStatus,
  onPickTinyTask,
  onReviewPlan,
  onRescheduleTaskWithinWeek,
  onRescheduleTaskToNextWeek,
  onSkipNonCoreTask,
  currentLagMetricValue,
  coreIndicators,
  optionalIndicators,
  activePlanCode,
  hasPremiumReviewInsights,
  premiumReviewInsight,
  suggestedNextWeekPlan,
  weeklyForm,
  currentReview,
  onWeeklyFormChange,
  onApplySuggestedPlan,
  onOpenPremiumInsights,
  onSaveWeeklyReview,
  onOpenTodayTab,
  nextWeekRecommendation,
  onAcceptNextWeekRecommendation,
  weeklyReflectionInsights,
  showFullProgress,
  setShowFullProgress,
  averageScore,
  reviewDoneCount,
  milestoneItems,
  hasAdvancedAnalytics,
  executionHeatmap,
  weeklyTrend,
  tacticBreakdown,
  executionInsights,
  navigate,
  backendConnectionStatus,
  activeEntitlementKeys,
  billingProviderStatus,
  lastEntitlementSyncSnapshot,
  lastRestoreAccessSnapshot,
  lastBackendHydrationResult,
  appPreferences,
  funnelSteps,
  monetizationSteps,
  browserNotificationStatus,
  lastSyncSnapshot,
  pendingOutboxCount,
  archivedOutboxCount,
  eventCount,
  activeReminders,
  recentOutboxItems,
  isSyncingEntitlements,
  isRestoringPlanAccess,
  isHydratingBackendPlans,
  isResolvingBackendPlanConflicts,
  mutationQueueSyncStatus,
  handleReviewDayChange,
  handleReminderTimeChange,
  handleLoadPreferenceChange,
  handleStatusChange,
  handleTacticPriorityChange,
  handleTacticTypeChange,
  handleTimeBlocksChange,
  handlePreferenceToggle,
  handleArchivePendingOutbox,
  handleRestoreArchivedOutbox,
  handleOpenReminder,
  handleExportLocalData,
  handleExportCloudWorkspace,
  handleDeleteCloudWorkspace,
  handleBrowserNotificationToggle,
  handleRunOutboxSync,
  handleOutboxItemToggle,
  handleClearEventLog,
  handleClearArchivedOutbox,
  setIsClearLocalDialogOpen,
  handleDeleteAllData,
  setIsDeleteDataDialogOpen,
  setIsResetDialogOpen,
  handleOpenUpgradeDialog,
  handleSyncEntitlements,
  handleRestorePlanAccess,
  handleHydrateBackendPlans,
  handleRunMutationQueueSync,
  handleKeepLocalPlanForConflicts,
  handleUseBackendPlanForConflicts,
  handleUseCloudVersion,
  handleOpenBillingPortal,
}: TwelveWeekSystemTabsProps) {
  const planHasNoTasks = system.taskInstances.length === 0;
  const planHasNoLeadMetrics = system.leadIndicators.length === 0;

  return (
    <>
      <nav className="mt-5 border-b border-app-line/30 pb-3" aria-label="Điều hướng hệ 12 tuần">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="block overflow-x-auto scrollbar-none">
          <TabsList
            aria-label="Điều hướng hệ 12 tuần"
            className="inline-flex min-h-0 rounded-xl border border-app-line bg-app-surface p-1 shadow-2xs"
          >
            {TWELVE_WEEK_SECTION_TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                id={`${tabPanelId}-${value}-tab`}
                value={value}
                aria-controls={tabPanelId}
                aria-label={`Mở tab ${label}`}
                className={`flex-none rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors duration-150 gap-2 flex items-center justify-center
                  data-[state=active]:bg-app-accent-soft data-[state=active]:text-app-accent
                  data-[state=inactive]:text-app-ink-soft hover:data-[state=inactive]:text-app-ink hover:data-[state=inactive]:bg-app-bg/50
                  active:scale-95`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </nav>

      {/* Main content sections */}
      <div
        className="mt-6 space-y-6"
        role="tabpanel"
        id={tabPanelId}
        aria-labelledby={`${tabPanelId}-${activeTab}-tab`}
      >
        {isCycleReviewMode && activeTab !== "settings" && (
          <CycleReviewPanel
            goal={activeGoal}
            system={system}
            onSaveCycleReview={handleSaveCycleReview}
            onStartNewCycle={handleStartNewCycle}
            onOpenSettings={() => handleTabChange("settings")}
            aspirationalVisionSummary={aspirationalVisionSummary ?? undefined}
          />
        )}

        {/* TODAY SECTION */}
        {!isCycleReviewMode && activeTab === "today" && (
          <TabErrorBoundary fallbackTitle="Tab Hôm nay gặp lỗi">
            <TaskBoard
              system={system}
              currentWeek={currentWeek}
              currentWeekRange={currentWeekRange}
              currentPlanFocus={currentPlanFocus ?? ""}
              reviewDueToday={reviewDueToday}
              reviewStatusLabel={reviewStatusLabel}
              currentWeekScoreValue={currentWeekScoreValue}
              weekCompletion={weekCompletion}
              coreTacticCount={coreTacticCount}
              optionalTacticCount={optionalTacticCount}
              missedTasks={missedTasks}
              todayQueue={todayQueue}
              currentWeekTasksCount={currentWeekOpenTasks.length}
              todayDateKey={todayDateKey}
              todayCompletedCount={todayCompletedCount}
              todayRemainingCount={todayRemainingCount}
              overdueOpenCount={overdueOpenCount}
              optionalOpenThisWeekCount={optionalOpenThisWeekCount}
              hasPlanTasks={!planHasNoTasks}
              hasLeadMetrics={!planHasNoLeadMetrics}
              firstPriorityTask={firstPriorityTask}
              secondaryTodayTasks={secondaryTodayTasks}
              hasSmartRescue={hasSmartRescue}
              rescuePlanSummary={rescuePlanSummary}
              dailyMood={dailyMood}
              dailyNote={dailyNote}
              latestCheckIn={latestCheckIn}
              onReentry={onReentry}
              onApplyRecommendedReentry={onApplyRecommendedReentry}
              onOpenSmartRescue={onOpenSmartRescue}
              onToggleTask={onToggleTask}
              onDailyMoodChange={onDailyMoodChange}
              onDailyNoteChange={onDailyNoteChange}
              onSaveCheckIn={onSaveCheckIn}
              onOpenWeekTab={onOpenWeekTab}
              onNavigateToSetup={onNavigateToSetup}
              rescueStatus={rescueStatus}
              onPickTinyTask={onPickTinyTask}
              onReviewPlan={onReviewPlan}
              onRescheduleTaskWithinWeek={onRescheduleTaskWithinWeek}
              onRescheduleTaskToNextWeek={onRescheduleTaskToNextWeek}
              onSkipNonCoreTask={onSkipNonCoreTask}
            />
          </TabErrorBoundary>
        )}

        {/* WEEK SECTION */}
        {!isCycleReviewMode && activeTab === "week" && (
          <TabErrorBoundary fallbackTitle="Tab Tuần gặp lỗi">
            <Suspense
              fallback={
                <TwelveWeekTabFallback
                  title="Đang mở tab Tuần"
                  description="Phần review tuần và gợi ý cho tuần sau sẽ hiện ra ngay sau khi tải xong."
                />
              }
            >
              <WeeklyReview
                system={system}
                currentWeekNumber={currentWeek}
                currentWeekRange={currentWeekRange}
                currentPlanFocus={currentPlanFocus ?? ""}
                currentPlanMilestone={currentPlanMilestone ?? ""}
                reviewDueToday={reviewDueToday}
                reviewStatusLabel={reviewStatusLabel}
                currentScoreValue={currentWeekScoreValue}
                weekCompletion={weekCompletion}
                currentLagMetricValue={currentLagMetricValue}
                coreIndicators={coreIndicators}
                optionalIndicators={optionalIndicators}
                currentPlanCode={activePlanCode}
                hasPremiumInsights={hasPremiumReviewInsights}
                premiumInsight={premiumReviewInsight}
                suggestedNextWeekPlan={suggestedNextWeekPlan}
                weeklyForm={weeklyForm}
                currentReview={currentReview}
                onWeeklyFormChange={onWeeklyFormChange}
                onApplySuggestedPlan={onApplySuggestedPlan}
                onOpenPremiumInsights={onOpenPremiumInsights}
                onSaveWeeklyReview={onSaveWeeklyReview}
                onOpenTodayTab={onOpenTodayTab}
                rescueStatus={rescueStatus}
                onPickTinyTask={onPickTinyTask}
                onReducePlan={onApplySuggestedPlan}
                nextWeekRecommendation={nextWeekRecommendation}
                onAcceptNextWeekRecommendation={onApplySuggestedPlan}
                weeklyReflectionInsights={weeklyReflectionInsights}
              />
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* PROGRESS SECTION */}
        {!isCycleReviewMode && activeTab === "progress" && (
          <TabErrorBoundary fallbackTitle="Tab Tiến độ gặp lỗi">
            <Suspense
              fallback={
                <TwelveWeekTabFallback
                  title="Đang mở tab Tiến độ"
                  description="Bảng điểm và cột mốc của chu kỳ đang được chuẩn bị cho bạn."
                />
              }
            >
              {!showFullProgress ? (
                <ProgressSummaryCard
                  system={system}
                  currentWeek={currentWeek}
                  currentWeekRange={currentWeekRange}
                  currentWeekScoreValue={currentWeekScoreValue}
                  averageScore={averageScore}
                  reviewDoneCount={reviewDoneCount}
                  weekCompletion={weekCompletion}
                  reviewDueToday={reviewDueToday}
                  onOpenTodayTab={() => setActiveTab("today")}
                  onOpenWeekTab={() => setActiveTab("week")}
                  onOpenSettingsTab={() => setActiveTab("settings")}
                  onOpenCycleReview={() => setActiveTab("progress")}
                  onNavigateToSetup={onNavigateToSetup}
                  onViewFull={() => setShowFullProgress(true)}
                />
              ) : (
                <>
                  <div className="mb-4 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-app-line bg-app-surface px-4 py-2 text-sm font-semibold text-app-ink transition-colors duration-150 hover:bg-app-bg"
                      onClick={() => setShowFullProgress(false)}
                    >
                      Quay lại tóm tắt
                    </button>
                  </div>
                  <PlanOverview
                    system={system}
                    goalTitle={activeGoal.title}
                    currentWeek={currentWeek}
                    currentWeekRange={currentWeekRange}
                    currentWeekScoreValue={currentWeekScoreValue}
                    averageScore={averageScore}
                    reviewDoneCount={reviewDoneCount}
                    weekCompletion={weekCompletion}
                    milestoneItems={milestoneItems}
                    hasAdvancedAnalytics={hasAdvancedAnalytics}
                    executionHeatmap={executionHeatmap}
                    weeklyTrend={weeklyTrend}
                    tacticBreakdown={tacticBreakdown}
                    reviewDueToday={reviewDueToday}
                    onRenameGoal={handleRenameActiveGoal}
                    onOpenTodayTab={() => setActiveTab("today")}
                    onOpenWeekTab={() => setActiveTab("week")}
                    onOpenSettingsTab={() => setActiveTab("settings")}
                    onOpenCycleReview={() => setActiveTab("progress")}
                    onNavigateToSetup={onNavigateToSetup}
                    executionInsights={executionInsights}
                  />
                </>
              )}
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* SETTINGS SECTION */}
        {activeTab === "settings" && (
          <TabErrorBoundary fallbackTitle="Tab Cài đặt chu kỳ gặp lỗi">
            <Suspense
              fallback={
                <TwelveWeekTabFallback
                  title="Đang mở cài đặt chu kỳ"
                  description="Phần chỉnh nhịp chu kỳ, dữ liệu trên thiết bị và quyền gói đang được tải."
                />
              }
            >
              <WeekEditor
                system={system}
                activeGoalId={activeGoal.id}
                backendConnectionStatus={backendConnectionStatus}
                currentPlanCode={activePlanCode}
                entitlementKeys={activeEntitlementKeys}
                billingProviderStatus={billingProviderStatus}
                lastEntitlementSyncSnapshot={lastEntitlementSyncSnapshot}
                lastRestoreAccessSnapshot={lastRestoreAccessSnapshot}
                lastBackendHydrationResult={lastBackendHydrationResult}
                appPreferences={appPreferences}
                funnelSteps={funnelSteps}
                monetizationSteps={monetizationSteps}
                browserNotificationStatus={browserNotificationStatus}
                lastSyncSnapshot={lastSyncSnapshot}
                pendingOutboxCount={pendingOutboxCount}
                archivedOutboxCount={archivedOutboxCount}
                eventCount={eventCount}
                activeReminders={activeReminders}
                recentOutboxItems={recentOutboxItems}
                isSyncingEntitlements={isSyncingEntitlements}
                isRestoringPlanAccess={isRestoringPlanAccess}
                isHydratingBackendPlans={isHydratingBackendPlans}
                isResolvingBackendPlanConflicts={isResolvingBackendPlanConflicts}
                mutationQueueSyncStatus={mutationQueueSyncStatus}
                onReviewDayChange={handleReviewDayChange}
                onReminderTimeChange={handleReminderTimeChange}
                onLoadPreferenceChange={handleLoadPreferenceChange}
                onStatusChange={handleStatusChange}
                onTacticPriorityChange={handleTacticPriorityChange}
                onTacticTypeChange={handleTacticTypeChange}
                onTimeBlocksChange={handleTimeBlocksChange}
                onPreferenceToggle={handlePreferenceToggle}
                onArchivePendingOutbox={handleArchivePendingOutbox}
                onRestoreArchivedOutbox={handleRestoreArchivedOutbox}
                onOpenReminder={handleOpenReminder}
                onExportLocalData={handleExportLocalData}
                onExportCloudWorkspace={handleExportCloudWorkspace}
                onDeleteCloudWorkspace={handleDeleteCloudWorkspace}
                onBrowserNotificationToggle={handleBrowserNotificationToggle}
                onRunOutboxSync={handleRunOutboxSync}
                onOutboxItemToggle={handleOutboxItemToggle}
                onClearEventLog={handleClearEventLog}
                onClearArchivedOutbox={handleClearArchivedOutbox}
                onOpenClearLocalDialog={() => setIsClearLocalDialogOpen(true)}
                onDeleteAllData={handleDeleteAllData}
                onOpenDeleteDataDialog={() => setIsDeleteDataDialogOpen(true)}
                onOpenResetDialog={() => setIsResetDialogOpen(true)}
                onOpenUpgradePlan={(planCode) => handleOpenUpgradeDialog("plan", planCode)}
                onSyncEntitlements={handleSyncEntitlements}
                onRestorePlanAccess={handleRestorePlanAccess}
                onHydrateBackendPlans={handleHydrateBackendPlans}
                onRunMutationQueueSync={handleRunMutationQueueSync}
                onKeepLocalPlanForConflicts={handleKeepLocalPlanForConflicts}
                onUseBackendPlanForConflicts={handleUseBackendPlanForConflicts}
                onUseCloudVersion={handleUseCloudVersion}
                onOpenBillingPortal={handleOpenBillingPortal}
                onNavigateGoals={() => navigate("/goals")}
                onNavigateJournal={() => navigate("/journal")}
                onNavigateSetup={() => navigate("/life-insight")}
              />
            </Suspense>
          </TabErrorBoundary>
        )}
      </div>
    </>
  );
}
