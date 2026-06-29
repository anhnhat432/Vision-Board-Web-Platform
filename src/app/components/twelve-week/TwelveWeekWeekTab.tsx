import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ExecutionInsight, NextWeekRecommendation, RescueModeStatus } from "@/features/plan12week/logic";
import { calculateLagScore, interpretWeeklyExecutionScore } from "@/features/plan12week/logic";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
import { getTwelveWeekWeekRange } from "../../utils/storage-twelve-week";
import type {
  LeadIndicator,
  PricingPlanCode,
  TwelveWeekSystem,
  UniversalWeeklyReview,
} from "../../utils/storage-types";
import type { SuggestedNextWeekPlan, WeeklyReviewPremiumInsight } from "../../utils/twelve-week-premium";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { cn } from "../ui/utils";
import { TwelveWeekRescueNudge } from "./TwelveWeekRescueNudge";
import { WeeklyEmptyFuture } from "./WeeklyEmptyFuture";
import { WeeklyHeroBeforeReview } from "./WeeklyHeroBeforeReview";
import { WeeklyRail } from "./WeeklyRail";
import { WeeklyReviewForm } from "./WeeklyReviewForm";
import { WeeklyReviewSummary } from "./WeeklyReviewSummary";

import "./TwelveWeekWeekTab.css";

interface WeekRange {
  start: string;
  end: string;
}

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
  isEmpty?: boolean;
}

export interface TwelveWeekWeeklyReviewForm {
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  keepTactic: string;
  reduceTactic: string;
  nextWeekPriority: string;
  commitmentStatuses: Record<string, WeeklyCommitmentStatus>;
  insights: string;
  nextWeekCommitments: string[];
  workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "";
}

type WeeklyCommitmentStatus = "kept" | "missed" | "not_set" | "unanswered";

interface TwelveWeekWeekTabProps {
  system: TwelveWeekSystem;
  currentWeekNumber?: number;
  currentWeekRange: WeekRange | null;
  currentPlanFocus: string;
  currentPlanMilestone: string;
  reviewDueToday: boolean;
  reviewStatusLabel: string;
  currentScoreValue: number;
  weekCompletion: WeekCompletionSummary;
  currentLagMetricValue: string;
  coreIndicators: LeadIndicator[];
  optionalIndicators: LeadIndicator[];
  currentPlanCode: PricingPlanCode;
  hasPremiumInsights: boolean;
  premiumInsight: WeeklyReviewPremiumInsight | null;
  suggestedNextWeekPlan: SuggestedNextWeekPlan | null;
  weeklyForm: TwelveWeekWeeklyReviewForm;
  currentReview?: UniversalWeeklyReview | null;
  onWeeklyFormChange: <K extends keyof TwelveWeekWeeklyReviewForm>(
    field: K,
    value: TwelveWeekWeeklyReviewForm[K],
  ) => void;
  onApplySuggestedPlan: () => void;
  onOpenPremiumInsights: () => void;
  onSaveWeeklyReview: () => void;
  onOpenTodayTab?: () => void;
  rescueStatus?: RescueModeStatus | null;
  onPickTinyTask?: () => void;
  onReducePlan?: () => void;
  nextWeekRecommendation?: NextWeekRecommendation | null;
  onAcceptNextWeekRecommendation?: () => void;
  _weeklyReflectionInsights?: ReadonlyArray<ExecutionInsight>;
}

function getLeadScoreTone(level: ReturnType<typeof interpretWeeklyExecutionScore>["level"]): {
  marker: string;
  panel: string;
  text: string;
} {
  switch (level) {
    case "strong":
      return {
        marker: "bg-app-status-success",
        panel: "border-app-status-success/20 bg-app-status-success/5",
        text: "text-app-status-success",
      };
    case "okay":
      return {
        marker: "bg-app-status-warning",
        panel: "border-app-status-warning/20 bg-app-status-warning/5",
        text: "text-app-status-warning",
      };
    default:
      return {
        marker: "bg-app-status-error",
        panel: "border-app-status-error/20 bg-app-status-error/5",
        text: "text-app-status-error",
      };
  }
}

function normalizeCommitmentList(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => value.trim()).filter(Boolean);
}

function getReviewNextWeekCommitments(review: UniversalWeeklyReview | null | undefined): string[] {
  const commitments = normalizeCommitmentList(review?.nextWeekCommitments);
  if (commitments.length > 0) return commitments;

  const legacyPriority = review?.nextWeekPriority?.trim();
  return legacyPriority ? [legacyPriority] : [];
}

function isCommitmentAnswered(status: WeeklyCommitmentStatus | undefined): boolean {
  return status === "kept" || status === "missed" || status === "not_set";
}

export function TwelveWeekWeekTab({
  system,
  currentWeekNumber,
  currentWeekRange: propsWeekRange,
  currentPlanFocus: propsPlanFocus,
  currentPlanMilestone: propsPlanMilestone,
  reviewDueToday,
  weekCompletion: propsWeekCompletion,
  currentLagMetricValue,
  coreIndicators,
  optionalIndicators,
  currentPlanCode,
  hasPremiumInsights,
  premiumInsight,
  suggestedNextWeekPlan,
  weeklyForm,
  currentReview: propsReview,
  onWeeklyFormChange,
  onApplySuggestedPlan,
  onOpenPremiumInsights,
  onSaveWeeklyReview,
  onOpenTodayTab,
  rescueStatus,
  onPickTinyTask,
  onReducePlan,
  nextWeekRecommendation,
  onAcceptNextWeekRecommendation,
  _weeklyReflectionInsights,
}: TwelveWeekWeekTabProps) {
  const [selectedWeek, setSelectedWeek] = useState(system.currentWeek);

  useEffect(() => {
    setSelectedWeek(system.currentWeek);
  }, [system.currentWeek]);

  const isCurrentWeekSelected = selectedWeek === system.currentWeek;
  const currentWeekLimit = selectedWeek;

  function getTwelveWeekCompletion(weekNo: number) {
    const tasks = system.taskInstances.filter((t) => t.weekNumber === weekNo && !t.skipped);
    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;
    const isEmpty = total === 0;
    return {
      completed,
      total,
      percent: isEmpty ? 0 : Math.round((completed / total) * 100),
      isEmpty,
    };
  }

  const weekCompletion = isCurrentWeekSelected
    ? propsWeekCompletion
    : getTwelveWeekCompletion(selectedWeek);

  const currentReview = isCurrentWeekSelected
    ? (propsReview ?? null)
    : (system.weeklyReviews.find((review) => review.weekNumber === selectedWeek) ?? null);

  const currentWeekRange = isCurrentWeekSelected
    ? propsWeekRange
    : getTwelveWeekWeekRange(system, selectedWeek);

  const currentPlanFocus = isCurrentWeekSelected
    ? propsPlanFocus
    : (system.weeklyPlans.find((plan) => plan.weekNumber === selectedWeek)?.focus ?? "");

  const currentPlanMilestone = isCurrentWeekSelected
    ? propsPlanMilestone
    : (system.weeklyPlans.find((plan) => plan.weekNumber === selectedWeek)?.milestone ?? "");

  const reviewWeekNumber = system.currentWeek;
  const testWeekLimit = Math.min(
    Math.max(currentWeekNumber ?? system.currentWeek, 1),
    Math.max(system.totalWeeks, 1),
  );
  const isFutureReviewWeek = reviewWeekNumber > testWeekLimit;
  const shouldConfirmEarlyReview = reviewWeekNumber === testWeekLimit && !reviewDueToday;

  const leadScoreValue = currentReview?.leadCompletionPercent ?? weekCompletion.percent;
  const scoreInterpretation = interpretWeeklyExecutionScore(leadScoreValue);
  const scoreTone = getLeadScoreTone(scoreInterpretation.level);

  const lagMetricValue = isCurrentWeekSelected
    ? (currentLagMetricValue || system.lagMetric.currentValue)
    : (currentReview?.lagProgressValue || "");

  const lagScoreValue =
    system.lagMetric.target.trim().length > 0 && lagMetricValue
      ? calculateLagScore(
          {
            target: system.lagMetric.target,
            currentValue: lagMetricValue,
          },
          selectedWeek,
          system.totalWeeks,
        )
      : null;

  const previousReview = system.weeklyReviews.find((review) => review.weekNumber === selectedWeek - 1);
  const previousCommitments = getReviewNextWeekCommitments(previousReview);
  const allPreviousCommitmentsAnswered =
    previousCommitments.length === 0 ||
    previousCommitments.every((commitment) => isCommitmentAnswered(weeklyForm.commitmentStatuses[commitment]));
  const nextWeekCommitments = normalizeCommitmentList(weeklyForm.nextWeekCommitments).slice(0, 5);
  const hasNextWeekCommitment = nextWeekCommitments.length > 0;
  const reviewIsCompleted = Boolean(currentReview?.reviewCompleted);
  const summaryReview = reviewIsCompleted ? (currentReview ?? null) : null;
  const summaryCommitmentsKept = normalizeCommitmentList(summaryReview?.commitmentsKept);
  const summaryCommitmentsMissed = normalizeCommitmentList(summaryReview?.commitmentsMissed);
  const summaryCommitmentTotal = summaryCommitmentsKept.length + summaryCommitmentsMissed.length;
  const summaryInsights =
    summaryReview?.insights?.trim() ||
    summaryReview?.reflection?.trim() ||
    summaryReview?.biggestOutputThisWeek?.trim();
  const summaryNextWeekCommitments = getReviewNextWeekCommitments(summaryReview);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [showEarlyReviewConfirm, setShowEarlyReviewConfirm] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isStartingEarly, setIsStartingEarly] = useState(false);

  const canShowFormReview = (reviewDueToday || isStartingEarly || isEditingReview) && isCurrentWeekSelected;
  const showForm = (!reviewIsCompleted || isEditingReview) && isCurrentWeekSelected;

  const reviewReadinessItems = [
    { key: "score", label: "Điểm tuần", done: true },
    { key: "commitments", label: "Cam kết cũ", done: allPreviousCommitmentsAnswered },
    { key: "insights", label: "Bài học", done: weeklyForm.insights.trim().length > 0 },
    { key: "next", label: "Tuần sau", done: hasNextWeekCommitment },
  ];
  const reviewReadyCount = reviewReadinessItems.filter((item) => item.done).length;
  const reviewPendingItems = reviewReadinessItems.filter((item) => !item.done);
  const canSubmitWeeklyReview = allPreviousCommitmentsAnswered && hasNextWeekCommitment && !isFutureReviewWeek;
  const reviewStatusTitle = isFutureReviewWeek
    ? "Không thể chốt tuần tương lai."
    : shouldConfirmEarlyReview
      ? "Bạn đang chốt review sớm."
      : canSubmitWeeklyReview
        ? "Đã đủ 4 bước để lưu review."
        : `Còn ${reviewPendingItems.length} mục cần hoàn tất.`;
  const reviewStatusHint = isFutureReviewWeek
    ? "Quay lại tuần hiện tại để chốt review này."
    : canSubmitWeeklyReview
      ? "Bạn có thể lưu ngay hoặc rà soát lại câu trả lời trước khi chốt."
      : `Thiếu: ${reviewPendingItems.map((item) => item.label).join(", ")}.`;
  const reviewStickyStatus = canSubmitWeeklyReview
    ? "Sẵn sàng chốt"
    : reviewPendingItems.length === 1
      ? `Thiếu ${reviewPendingItems[0]?.label}`
      : `Thiếu ${reviewPendingItems.length} mục`;

  const saveWeeklyReview = async () => {
    setIsSavingReview(true);
    try {
      await Promise.resolve(onSaveWeeklyReview());
      setIsStartingEarly(false);
      setIsEditingReview(false);
    } finally {
      setIsSavingReview(false);
      setShowEarlyReviewConfirm(false);
    }
  };

  const handleSaveReviewClick = async () => {
    if (isSavingReview || !canSubmitWeeklyReview) return;
    if (isFutureReviewWeek) return;
    if (shouldConfirmEarlyReview) {
      setShowEarlyReviewConfirm(true);
      return;
    }
    await saveWeeklyReview();
  };

  const getTacticProgress = (indicator: LeadIndicator) => {
    const tasks = system.taskInstances.filter(
      (t) =>
        t.weekNumber === currentWeekLimit && (t.tacticId === indicator.id || t.leadIndicatorName === indicator.name),
    );
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    let status: "Not started" | "In Progress" | "Done" | "Behind" = "Not started";
    const todayStr = new Date().toISOString().split("T")[0];
    const hasBehindTask = tasks.some((t) => !t.completed && t.scheduledDate && t.scheduledDate < todayStr);

    if (total === 0) {
      status = "Not started";
    } else if (completed === total) {
      status = "Done";
    } else if (hasBehindTask) {
      status = "Behind";
    } else if (completed > 0) {
      status = "In Progress";
    } else {
      status = "Not started";
    }

    return { total, completed, percent, status };
  };

  const mergedIndicators = [
    ...coreIndicators.map((ind) => ({ ...ind, isCore: true })),
    ...optionalIndicators.map((ind) => ({ ...ind, isCore: false })),
  ];

  // Staggered animation index tracker
  const staggerRef = useRef(0);
  const nextStaggerIndex = () => {
    staggerRef.current += 1;
    return staggerRef.current - 1;
  };
  useEffect(() => {
    staggerRef.current = 0;
  }, []);

  const StaggerSection = ({
    children,
    className,
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div
      className={cn("weekly-stagger-item", className)}
      style={{ "--stagger-index": nextStaggerIndex(), ...style } as React.CSSProperties}
    >
      {children}
    </div>
  );

  return (
    <div
      data-testid="weekly-review-shell"
      className={`flex flex-col gap-4 pt-1 sm:gap-5 sm:pt-2 ${showForm && canShowFormReview ? "pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:pb-0" : "pb-24 md:pb-0"}`}
    >
      <AlertDialog open={showEarlyReviewConfirm} onOpenChange={setShowEarlyReviewConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu review trước khi tuần kết thúc?</AlertDialogTitle>
            <AlertDialogDescription>
              Tuần hiện tại chưa tới ngày review. Nếu lưu sớm, hệ thống sẽ ghi nhận kết quả tuần này ngay bây giờ và
              dùng dữ liệu đó để gợi ý bước tiếp theo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingReview}>Quay lại chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSavingReview}
              onClick={(event) => {
                event.preventDefault();
                void saveWeeklyReview();
              }}
            >
              {isSavingReview ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Đang lưu…
                </>
              ) : (
                "Vẫn lưu sớm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {rescueStatus && rescueStatus.severity !== "none" && (
        <TwelveWeekRescueNudge
          status={rescueStatus}
          variant="week"
          onPickTinyTask={onPickTinyTask ?? onOpenTodayTab}
          onOpenWeekTab={onOpenTodayTab}
          onReducePlan={onReducePlan}
          onReviewPlan={onApplySuggestedPlan}
        />
      )}

      <WeeklyRail
        totalWeeks={system.totalWeeks}
        currentWeek={system.currentWeek}
        selectedWeek={selectedWeek}
        reviews={system.weeklyReviews}
        getCompletion={getTwelveWeekCompletion}
        onSelectWeek={setSelectedWeek}
      />

      {selectedWeek > system.currentWeek ? (
        <StaggerSection>
          <WeeklyEmptyFuture
            weekNo={selectedWeek}
            currentWeek={system.currentWeek}
            system={system}
          />
        </StaggerSection>
      ) : (
        <>
          {selectedWeek < system.currentWeek && !reviewIsCompleted && (
            <StaggerSection>
              <div className="flex items-center gap-3 rounded-xl border border-app-status-error/20 bg-app-status-error/5 p-4 text-xs text-app-status-error relative overflow-hidden weekly-card-lift">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span className="leading-relaxed font-serif font-medium">
                  Tuần {selectedWeek} đã kết thúc mà không được chốt đánh giá tuần. Bạn vẫn có thể xem lại điểm thực thi và chi tiết hành động bên dưới.
                </span>
              </div>
            </StaggerSection>
          )}

          {!reviewIsCompleted && !canShowFormReview && (
            <StaggerSection>
              <WeeklyHeroBeforeReview
                currentWeekLimit={currentWeekLimit}
                totalWeeks={system.totalWeeks}
                currentWeekRange={currentWeekRange}
                currentPlanFocus={currentPlanFocus}
                currentPlanMilestone={currentPlanMilestone ?? ""}
                weekCompletion={weekCompletion}
                leadScoreValue={leadScoreValue}
                _lagScoreValue={lagScoreValue}
                _lagMetricName={system.lagMetric.name}
                _lagMetricValue={lagMetricValue}
                mergedIndicators={mergedIndicators}
                getTacticProgress={getTacticProgress}
                formatCalendarDate={formatCalendarDate}
                getReviewDayLabel={(day) => getReviewDayLabel(String(day))}
                reviewDay={system.reviewDay}
                onStartEarlyReview={() => setIsStartingEarly(true)}
              />
            </StaggerSection>
          )}

          {!reviewIsCompleted && canShowFormReview && (
            <StaggerSection>
              <WeeklyReviewForm
                system={system}
                currentWeekLimit={currentWeekLimit}
                totalWeeks={system.totalWeeks}
                currentWeekRange={currentWeekRange}
                currentPlanFocus={currentPlanFocus}
                weekCompletion={weekCompletion}
                leadScoreValue={leadScoreValue}
                lagScoreValue={lagScoreValue}
                lagMetricValue={lagMetricValue}
                currentPlanCode={currentPlanCode}
                hasPremiumInsights={hasPremiumInsights}
                premiumInsight={premiumInsight}
                suggestedNextWeekPlan={suggestedNextWeekPlan}
                weeklyForm={weeklyForm}
                currentReview={currentReview}
                previousCommitments={previousCommitments}
                allPreviousCommitmentsAnswered={allPreviousCommitmentsAnswered}
                nextWeekCommitments={nextWeekCommitments}
                hasNextWeekCommitment={hasNextWeekCommitment}
                reviewReadinessItems={reviewReadinessItems}
                reviewReadyCount={reviewReadyCount}
                _reviewPendingItems={reviewPendingItems}
                canSubmitWeeklyReview={canSubmitWeeklyReview}
                reviewStatusTitle={reviewStatusTitle}
                reviewStatusHint={reviewStatusHint}
                reviewStickyStatus={reviewStickyStatus}
                isSavingReview={isSavingReview}
                isEditingReview={isEditingReview}
                isStartingEarly={isStartingEarly}
                formatCalendarDate={formatCalendarDate}
                onWeeklyFormChange={onWeeklyFormChange}
                onApplySuggestedPlan={onApplySuggestedPlan}
                onOpenPremiumInsights={onOpenPremiumInsights}
                onSaveWeeklyReview={handleSaveReviewClick}
                onCancelReview={() => {
                  setIsEditingReview(false);
                  setIsStartingEarly(false);
                }}
              />
            </StaggerSection>
          )}

          {summaryReview && (
            <StaggerSection>
              <WeeklyReviewSummary
                system={system}
                currentWeekLimit={currentWeekLimit}
                currentWeekRange={currentWeekRange}
                weekCompletion={weekCompletion}
                _leadScoreValue={leadScoreValue}
                lagScoreValue={lagScoreValue}
                lagMetricValue={lagMetricValue}
                scoreTone={scoreTone}
                scoreInterpretation={scoreInterpretation}
                mergedIndicators={mergedIndicators}
                getTacticProgress={getTacticProgress}
                summaryReview={summaryReview}
                summaryCommitmentsKept={summaryCommitmentsKept}
                summaryCommitmentsMissed={summaryCommitmentsMissed}
                summaryCommitmentTotal={summaryCommitmentTotal}
                summaryInsights={summaryInsights ?? ""}
                summaryNextWeekCommitments={summaryNextWeekCommitments}
                formatCalendarDate={formatCalendarDate}
                onEditReview={() => setIsEditingReview(true)}
                nextWeekRecommendation={nextWeekRecommendation ?? null}
                onAcceptNextWeekRecommendation={onAcceptNextWeekRecommendation}
                onOpenTodayTab={onOpenTodayTab}
              />
            </StaggerSection>
          )}
        </>
      )}
    </div>
  );
}