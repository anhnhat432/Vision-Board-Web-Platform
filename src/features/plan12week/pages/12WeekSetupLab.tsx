import { Award, Calendar, Flag, Map as MapIcon, Target } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { CoreFlowGateState } from "@/app/components/CoreFlowGateState";
import { CoreFlowProgress } from "@/app/components/CoreFlowProgress";
import { PageShell } from "@/app/components/PageShell";
import { RealModeLoginGate } from "@/app/components/RealModeLoginGate";
import { UpgradePaywallDialog } from "@/app/components/UpgradePaywallDialog";
import { FormSkeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/app/components/ui/utils";
import { trackAnalyticsEvent } from "@/app/utils/analytics";
import { isDemoMode, isRealMode } from "@/app/utils/app-mode";
import { getScoredLifeArea, hasRealLifeBalance } from "@/app/utils/core-flow-guard";
import { hasReachedLimit } from "@/app/utils/feature-entitlements";
import {
  trackPaywallCtaClicked,
  trackPremiumTemplateUnlockPrompted,
  trackTemplateApplied,
} from "@/app/utils/monetization-analytics";
import {
  APP_STORAGE_KEYS,
  addGoal,
  clearGoalPlanningDrafts,
  formatDateInputValue,
  getCurrentPlan,
  getLifeAreaLabel,
  getUserData,
  type LeadIndicatorCommitment,
  type PricingPlanCode,
  parseCalendarDate,
  trackAppEvent,
} from "@/app/utils/storage";
import type { AspirationalVision as AspirationalVisionModel } from "@/app/utils/storage-types";
import {
  buildAdaptiveTemplateRecommendation,
  buildAdaptiveTemplateSupport,
  planSatisfiesRequirement,
  TWELVE_WEEK_TEMPLATE_CATALOG,
  type TwelveWeekTemplateDefinition,
} from "@/app/utils/twelve-week-premium";
import { PlanPreviewStepLab } from "@/features/plan12week/components/PlanPreviewStepLab";
import { usePlanSetupSync } from "@/features/plan12week/hooks";
import { getWeeklyTaskWarning } from "@/features/plan12week/logic";
import { enqueueLeadMetricUpsertedMutations } from "@/features/plan12week/persistence/leadMetricMutation";
import { enqueuePlanSnapshotUpdatedMutation } from "@/features/plan12week/persistence/planSnapshotMutation";
import { saveGoalLink } from "@/lib/api/goalLinkStore";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { type PendingSMARTGoal, parsePendingSMARTGoal, parseSmartGoal } from "@/lib/smart-goal";
import { createGoal, updateGoal } from "@/services/goalService";
import { LeadIndicatorsStepLab } from "./12WeekSetup/components/LeadIndicatorsStepLab";
import { OutcomeStepLab } from "./12WeekSetup/components/OutcomeStepLab";
import { ScheduleStepLab } from "./12WeekSetup/components/ScheduleStepLab";
import { SetupStepShellLab } from "./12WeekSetup/components/SetupStepShellLab";
import { STEPS } from "./12WeekSetup/constantsLab";
import {
  addDays,
  buildLeadIndicatorSchedules,
  buildScoreboard,
  buildWeeklyPlans,
  createIndicatorDraft,
  createIndicatorId,
  getCycleWeekStart,
  getFeasibilityDraftDefaults,
  getLeadIndicatorTargetValidationError,
  getLeadIndicatorUnitValidationError,
  getMilestoneValidationError,
  getPreviewTasks,
  getPreviewTasksByIndicator,
  getStartDateValidation,
  isPendingFeasibilityResult,
  normalizeReviewDay,
} from "./12WeekSetup/helpers";
import type { LeadIndicatorDraft, PendingFeasibilityResult, TwelveWeekSetupDraft } from "./12WeekSetup/types";

type TwelveWeekSetupGate =
  | "none"
  | "needs_life_balance"
  | "needs_life_insight"
  | "needs_smart_goal"
  | "needs_feasibility";

const FEASIBILITY_RESULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const COMMITMENT_FIELDS = ["want", "cost", "means", "tradeoff", "reward"] as const;

function normalizeIndicatorCommitmentDraft(value: unknown): LeadIndicatorCommitment | undefined {
  if (!value || typeof value !== "object") return undefined;

  const source = value as Partial<Record<(typeof COMMITMENT_FIELDS)[number] | "filledAt", unknown>>;
  const commitment: LeadIndicatorCommitment = {
    want: typeof source.want === "string" ? source.want : "",
    cost: typeof source.cost === "string" ? source.cost : "",
    means: typeof source.means === "string" ? source.means : "",
    tradeoff: typeof source.tradeoff === "string" ? source.tradeoff : "",
    reward: typeof source.reward === "string" ? source.reward : "",
  };

  if (typeof source.filledAt === "string" && source.filledAt.trim()) {
    commitment.filledAt = source.filledAt;
  }

  return COMMITMENT_FIELDS.some((field) => commitment[field].trim().length > 0) ? commitment : undefined;
}

function getSmartGoalMetricUnit(normalizedSmartGoal: ReturnType<typeof parseSmartGoal>): string {
  return normalizedSmartGoal?.measurable?.metric_unit?.trim() ?? "";
}

function getSmartGoalMetricName(normalizedSmartGoal: ReturnType<typeof parseSmartGoal>): string {
  return normalizedSmartGoal?.measurable?.metric_name?.trim() ?? "";
}

function isFeasibilityResultStale(savedAt: string | undefined, now = new Date()): boolean {
  if (!savedAt) return false;
  const savedAtDate = new Date(savedAt);
  if (Number.isNaN(savedAtDate.getTime())) return false;
  return now.getTime() - savedAtDate.getTime() > FEASIBILITY_RESULT_MAX_AGE_MS;
}

type TwelveWeekSetupPrerequisites =
  | {
      status: "gate";
      gate: TwelveWeekSetupGate;
      aspirationalVision: AspirationalVisionModel | null;
      clearPendingFeasibility?: boolean;
    }
  | {
      status: "ready";
      aspirationalVision: AspirationalVisionModel | null;
      selectedFocusArea: string;
      parsedSmartGoal: PendingSMARTGoal;
      normalizedSmartGoal: ReturnType<typeof parseSmartGoal>;
      parsedFeasibility: PendingFeasibilityResult;
      savedDraft: string | null;
      feasibilityDefaults: ReturnType<typeof getFeasibilityDraftDefaults>;
      setupPlan: PricingPlanCode;
      smartGoalMetricName: string;
      smartGoalMetricUnit: string;
      staleFeasibility: boolean;
    };

function readTwelveWeekSetupPrerequisites(): TwelveWeekSetupPrerequisites {
  const data = getUserData();
  const aspirationalVision = data.aspirationalVision ?? null;

  if (!hasRealLifeBalance(data)) {
    return { status: "gate", gate: "needs_life_balance", aspirationalVision };
  }

  const selectedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
  const pendingSmartGoal = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
  const pendingFeasibilityResult = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult);

  if (!selectedFocusArea) return { status: "gate", gate: "needs_life_insight", aspirationalVision };
  if (!pendingSmartGoal) return { status: "gate", gate: "needs_smart_goal", aspirationalVision };
  if (!pendingFeasibilityResult) return { status: "gate", gate: "needs_feasibility", aspirationalVision };

  let parsedSmartGoalValue: unknown;
  try {
    parsedSmartGoalValue = JSON.parse(pendingSmartGoal);
  } catch {
    return { status: "gate", gate: "needs_smart_goal", aspirationalVision };
  }

  const normalizedSmartGoal = parseSmartGoal(parsedSmartGoalValue, selectedFocusArea);
  if (normalizedSmartGoal) {
    localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, JSON.stringify(normalizedSmartGoal));
  }

  const parsedSmartGoal = parsePendingSMARTGoal(normalizedSmartGoal ?? parsedSmartGoalValue, selectedFocusArea);
  if (!parsedSmartGoal) return { status: "gate", gate: "needs_smart_goal", aspirationalVision };

  let parsedFeasibility: unknown;
  try {
    parsedFeasibility = JSON.parse(pendingFeasibilityResult);
  } catch (error) {
    console.warn("Pending feasibility result could not be parsed.", error);
    return { status: "gate", gate: "needs_feasibility", aspirationalVision, clearPendingFeasibility: true };
  }

  if (!isPendingFeasibilityResult(parsedFeasibility)) {
    return { status: "gate", gate: "needs_feasibility", aspirationalVision };
  }

  if (!getScoredLifeArea(data, selectedFocusArea)) {
    return { status: "gate", gate: "needs_life_insight", aspirationalVision };
  }

  const feasibilityDefaults = getFeasibilityDraftDefaults(parsedFeasibility);
  const setupPlan = getCurrentPlan();
  return {
    status: "ready",
    aspirationalVision,
    selectedFocusArea,
    parsedSmartGoal,
    normalizedSmartGoal,
    parsedFeasibility,
    savedDraft: localStorage.getItem(APP_STORAGE_KEYS.pending12WeekSetupDraft),
    feasibilityDefaults,
    setupPlan,
    smartGoalMetricName: getSmartGoalMetricName(normalizedSmartGoal),
    smartGoalMetricUnit: getSmartGoalMetricUnit(normalizedSmartGoal),
    staleFeasibility: isFeasibilityResultStale(parsedFeasibility.savedAt),
  };
}

function generateSmartMilestones(specific: string, measurable: string, metricName: string, metricUnit: string) {
  const textToParse = measurable || specific;
  const numMatch = textToParse.match(/\d+(\.\d+)?/);
  const targetNum = numMatch ? parseFloat(numMatch[0]) : null;
  const unit =
    metricUnit || textToParse.match(/(kg|bài|triệu|trang|giờ|khách|%|usd|câu|chương|buổi)/i)?.[0] || "đơn vị";

  if (targetNum && targetNum > 0) {
    const w4Val = Math.round((targetNum / 3) * 10) / 10;
    const w8Val = Math.round(((targetNum * 2) / 3) * 10) / 10;
    const name = metricName || "Chỉ số chính";

    return {
      week4Milestone: `Hoàn thành 33% chặng đường: đạt mốc ${w4Val} ${unit}`,
      week8Milestone: `Hoàn thành 66% chặng đường: đạt mốc ${w8Val} ${unit}`,
      lagMetricTarget: String(targetNum),
      lagMetricName: name,
      lagMetricUnit: unit,
    };
  }

  return {
    week4Milestone: "Hoàn thành 1/3 khối lượng công việc, xây dựng nền tảng ban đầu",
    week8Milestone: "Hoàn thành 2/3 khối lượng công việc, chạy thử và hoàn thiện cốt lõi",
    lagMetricTarget: "1",
    lagMetricName: metricName || "Mức độ hoàn thành",
    lagMetricUnit: metricUnit || "kế hoạch",
  };
}

export function TwelveWeekSetupLab() {
  const navigate = useNavigate();
  const { actions: planSetupActions } = usePlanSetupSync();
  const auth = useAuthContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [setupGate, setSetupGate] = useState<TwelveWeekSetupGate>("none");
  const [currentPlan, setCurrentPlan] = useState<PricingPlanCode>(getCurrentPlan());
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"template" | "cycle_limit">("template");
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState("");
  const [smartGoal, setSmartGoal] = useState<PendingSMARTGoal | null>(null);
  const [feasibility, setFeasibility] = useState<PendingFeasibilityResult | null>(null);
  const [aspirationalVision, setAspirationalVision] = useState<AspirationalVisionModel | null>(null);
  const [_isVisionPromptDismissed, _setIsVisionPromptDismissed] = useState(false);
  const [attemptedStepIndexes, setAttemptedStepIndexes] = useState<Record<number, boolean>>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draft, setDraft] = useState<TwelveWeekSetupDraft>({
    templateId: "",
    goalType: "Personal Growth",
    vision12Week: "",
    week12Outcome: "",
    lagMetricName: "",
    lagMetricTarget: "",
    lagMetricUnit: "",
    leadIndicators: [createIndicatorDraft("core"), createIndicatorDraft("core")],
    startDate: formatDateInputValue(new Date()),
    reviewDay: "Sunday",
    tacticLoadPreference: "balanced",
    week4Milestone: "",
    week8Milestone: "",
    successEvidence: "",
    dailyTimeBudget: "",
    preferredDays: [],
    personalConstraint: "",
  });

  useEffect(() => {
    const prerequisites = readTwelveWeekSetupPrerequisites();
    setAspirationalVision(prerequisites.aspirationalVision);

    if (prerequisites.status === "gate") {
      if (prerequisites.clearPendingFeasibility) {
        localStorage.removeItem(APP_STORAGE_KEYS.pendingFeasibilityResult);
        toast.error("Kết quả kiểm tra tính khả thi cũ không đọc được, làm lại nhanh");
        navigate("/feasibility");
      }
      setSetupGate(prerequisites.gate);
      setIsLoading(false);
      return;
    }

    if (prerequisites.staleFeasibility) {
      toast.warning("Kết quả kiểm tra tính khả thi hơi cũ, làm lại để dữ liệu chính xác?", {
        action: {
          label: "Làm lại",
          onClick: () => navigate("/feasibility"),
        },
        cancel: {
          label: "Dùng tạm",
          onClick: () => undefined,
        },
      });
    }

    setFocusArea(prerequisites.selectedFocusArea);
    setSmartGoal(prerequisites.parsedSmartGoal);
    setFeasibility(prerequisites.parsedFeasibility);
    setCurrentPlan(prerequisites.setupPlan);

    const adaptiveRecommendation = buildAdaptiveTemplateRecommendation({
      readinessScore: prerequisites.parsedFeasibility.adjustedScore,
      goalStatement: prerequisites.parsedSmartGoal.specific,
      measurableText: prerequisites.parsedSmartGoal.measurable,
    });
    const recommendedTpl = adaptiveRecommendation
      ? (TWELVE_WEEK_TEMPLATE_CATALOG.find((t) => t.id === adaptiveRecommendation.templateId) ?? null)
      : null;

    const smartMilestones = generateSmartMilestones(
      prerequisites.parsedSmartGoal.specific,
      prerequisites.parsedSmartGoal.measurable,
      prerequisites.smartGoalMetricName,
      prerequisites.smartGoalMetricUnit,
    );

    setDraft((previousDraft) => {
      const baseDraft = {
        ...previousDraft,
        templateId: recommendedTpl?.id ?? "",
        goalType: recommendedTpl?.goalType ?? "Personal Growth",
        vision12Week:
          previousDraft.vision12Week ||
          recommendedTpl?.vision12Week ||
          `Trong 12 tuần tới, tôi muốn biến mục tiêu “${prerequisites.parsedSmartGoal.specific}” thành một nhịp thực thi rõ ràng.`,
        week12Outcome:
          previousDraft.week12Outcome ||
          recommendedTpl?.week12Outcome ||
          prerequisites.parsedSmartGoal.measurable ||
          prerequisites.parsedSmartGoal.specific,
        week4Milestone:
          previousDraft.week4Milestone || recommendedTpl?.week4Milestone || smartMilestones.week4Milestone,
        week8Milestone:
          previousDraft.week8Milestone || recommendedTpl?.week8Milestone || smartMilestones.week8Milestone,
        lagMetricName: previousDraft.lagMetricName || recommendedTpl?.lagMetricName || smartMilestones.lagMetricName,
        lagMetricTarget:
          previousDraft.lagMetricTarget || recommendedTpl?.lagMetricTarget || smartMilestones.lagMetricTarget,
        lagMetricUnit: previousDraft.lagMetricUnit || recommendedTpl?.lagMetricUnit || smartMilestones.lagMetricUnit,
        tacticLoadPreference:
          previousDraft.tacticLoadPreference === "balanced"
            ? prerequisites.feasibilityDefaults.tacticLoadPreference || "balanced"
            : previousDraft.tacticLoadPreference,
        dailyTimeBudget: previousDraft.dailyTimeBudget || prerequisites.feasibilityDefaults.dailyTimeBudget || "1h",
        personalConstraint: (previousDraft.personalConstraint ||
          (prerequisites.feasibilityDefaults.personalConstraint === "time" ||
          prerequisites.feasibilityDefaults.personalConstraint === "motivation" ||
          prerequisites.feasibilityDefaults.personalConstraint === "consistency" ||
          prerequisites.feasibilityDefaults.personalConstraint === "complexity"
            ? prerequisites.feasibilityDefaults.personalConstraint
            : "")) as TwelveWeekSetupDraft["personalConstraint"],
        leadIndicators: recommendedTpl
          ? recommendedTpl.tactics.map((t) => ({
              id: createIndicatorId(),
              name: t.name,
              target: t.target,
              unit: t.unit,
              type: t.type,
              cadence: t.cadence,
            }))
          : previousDraft.leadIndicators,
      };

      if (!prerequisites.savedDraft) return baseDraft;

      try {
        const parsedDraft = JSON.parse(prerequisites.savedDraft) as Partial<TwelveWeekSetupDraft>;
        const normalizedReviewDay = normalizeReviewDay(parsedDraft.reviewDay);
        if (normalizedReviewDay.changed && parsedDraft.reviewDay !== undefined) {
          console.info("Invalid 12-week setup reviewDay draft reset to Sunday.", {
            reviewDay: parsedDraft.reviewDay,
          });
        }
        return {
          ...baseDraft,
          ...parsedDraft,
          templateId: parsedDraft.templateId ?? "",
          reviewDay: normalizedReviewDay.value,
          tacticLoadPreference:
            parsedDraft.tacticLoadPreference === "lighter" || parsedDraft.tacticLoadPreference === "push"
              ? parsedDraft.tacticLoadPreference
              : "balanced",
          dailyTimeBudget: parsedDraft.dailyTimeBudget ?? "",
          lagMetricUnit: parsedDraft.lagMetricUnit?.trim() ? parsedDraft.lagMetricUnit : baseDraft.lagMetricUnit,
          preferredDays: Array.isArray(parsedDraft.preferredDays) ? parsedDraft.preferredDays : [],
          personalConstraint:
            parsedDraft.personalConstraint === "time" ||
            parsedDraft.personalConstraint === "motivation" ||
            parsedDraft.personalConstraint === "consistency" ||
            parsedDraft.personalConstraint === "complexity"
              ? parsedDraft.personalConstraint
              : "",
          leadIndicators:
            Array.isArray(parsedDraft.leadIndicators) && parsedDraft.leadIndicators.length > 0
              ? parsedDraft.leadIndicators.map((indicator) => ({
                  id: typeof indicator?.id === "string" && indicator.id ? indicator.id : createIndicatorId(),
                  name: indicator?.name ?? "",
                  target: indicator?.target ?? "1",
                  unit: indicator?.unit ?? "lần/tuần",
                  type: indicator?.type === "optional" ? "optional" : "core",
                  cadence:
                    indicator?.cadence === "frontload" || indicator?.cadence === "backload"
                      ? indicator.cadence
                      : "spread",
                  commitment: normalizeIndicatorCommitmentDraft(indicator?.commitment),
                }))
              : baseDraft.leadIndicators,
        };
      } catch {
        return baseDraft;
      }
    });

    if (!prerequisites.savedDraft) {
      trackAnalyticsEvent(
        "twelve_week_setup_started",
        {
          source: "12_week_setup",
          current_plan: prerequisites.setupPlan,
          entry_mode: "smart_goal_handoff",
          template_tier: "none",
          has_saved_draft: false,
        },
        {
          legacyEventName: "12_week_setup_started",
          legacyPayload: {
            focusArea: prerequisites.selectedFocusArea,
            readinessScore: String(prerequisites.parsedFeasibility.adjustedScore),
          },
        },
      );
    }

    setAttemptedStepIndexes({});
    setIsLoading(false);
  }, [navigate]);

  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading || !smartGoal || !feasibility) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    setIsSavingDraft(true);

    // Debounce: save after 500ms of inactivity
    saveTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem(APP_STORAGE_KEYS.pending12WeekSetupDraft, JSON.stringify(draft));
      saveTimeoutRef.current = null;
      setIsSavingDraft(false);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [draft, feasibility, isLoading, smartGoal]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (currentStep > 0) {
        event.preventDefault();
        event.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentStep]);

  const handleJumpToStep = useCallback(
    (stepIndex: number) => {
      if (stepIndex < currentStep) {
        setCurrentStep(stepIndex);
      }
    },
    [currentStep],
  );

  const validIndicators = useMemo(
    () => draft.leadIndicators.filter((indicator) => indicator.name.trim().length > 0),
    [draft.leadIndicators],
  );
  const selectedTemplate = TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => template.id === draft.templateId) ?? null;
  const pendingTemplate = TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => template.id === pendingTemplateId) ?? null;
  const adaptiveTemplateRecommendation = useMemo(() => {
    if (!smartGoal || !feasibility) return null;

    return buildAdaptiveTemplateRecommendation({
      readinessScore: feasibility.adjustedScore,
      goalStatement: smartGoal.specific,
      measurableText: smartGoal.measurable,
    });
  }, [smartGoal, feasibility]);
  const recommendedTemplate =
    TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => template.id === adaptiveTemplateRecommendation?.templateId) ?? null;
  const selectedTemplateSupport = useMemo(() => {
    if (!selectedTemplate || !smartGoal || !feasibility) return null;

    return buildAdaptiveTemplateSupport({
      template: selectedTemplate,
      goalStatement: smartGoal.specific,
      measurableText: smartGoal.measurable,
      readinessScore: feasibility.adjustedScore,
    });
  }, [selectedTemplate, smartGoal, feasibility]);
  const recommendedTemplateSupport = useMemo(() => {
    if (!recommendedTemplate || !smartGoal || !feasibility) return null;

    return buildAdaptiveTemplateSupport({
      template: recommendedTemplate,
      goalStatement: smartGoal.specific,
      measurableText: smartGoal.measurable,
      readinessScore: feasibility.adjustedScore,
    });
  }, [recommendedTemplate, smartGoal, feasibility]);
  const setupGuideTemplate = selectedTemplate ?? recommendedTemplate;
  const setupGuideSupport = selectedTemplateSupport ?? recommendedTemplateSupport;
  const planLoadOptions = useMemo(
    () => ({
      tacticLoadPreference: draft.tacticLoadPreference,
      dailyTimeBudget: draft.dailyTimeBudget,
      preferredDays: draft.preferredDays,
    }),
    [draft.dailyTimeBudget, draft.preferredDays, draft.tacticLoadPreference],
  );
  const scheduledLeadIndicators = useMemo(
    () => buildLeadIndicatorSchedules(validIndicators, planLoadOptions),
    [validIndicators, planLoadOptions],
  );
  const previewTasks = useMemo(
    () => getPreviewTasks(validIndicators, planLoadOptions),
    [validIndicators, planLoadOptions],
  );
  const previewTaskGroups = useMemo(
    () => getPreviewTasksByIndicator(validIndicators, planLoadOptions),
    [validIndicators, planLoadOptions],
  );
  const cycleStartDate = useMemo(() => {
    const parsedStartDate = parseCalendarDate(draft.startDate) ?? new Date();
    return formatDateInputValue(getCycleWeekStart(parsedStartDate));
  }, [draft.startDate]);
  const cycleEndDate = useMemo(() => {
    const parsedStartDate = parseCalendarDate(cycleStartDate) ?? new Date();
    return formatDateInputValue(addDays(parsedStartDate, 83));
  }, [cycleStartDate]);
  const canRunBackendSync =
    !isDemoMode() &&
    auth.isConfigured &&
    !auth.authLoading &&
    Boolean(auth.user) &&
    !auth.userProfileLoading &&
    Boolean(auth.userProfile);
  const currentStepDescription =
    currentStep === 0
      ? "Làm rõ trạng thái bạn muốn đạt được khi 12 tuần kết thúc."
      : currentStep === 1
        ? "Chọn 2-4 hành động lặp lại hằng tuần để dẫn dắt đến kết quả mong muốn."
        : currentStep === 2
          ? "Chọn ngày khởi hành, ngày nhìn lại và tùy biến lịch 7 ngày ưu tiên."
          : "Xem trước giao diện check-in Hôm nay thực tế và kích hoạt để bắt đầu.";
  const currentStepWhy =
    currentStep === 0
      ? "Kết quả rõ giúp biết khi nào về đích — và tránh đổi đích giữa chu kỳ vì cảm xúc."
      : currentStep === 1
        ? "Hành động lặp lại là thứ bạn kiểm soát hoàn toàn hằng ngày, tạo nên sự tích lũy lớn."
        : currentStep === 2
          ? "Ngày bắt đầu chuẩn bị tinh thần và lịch review giúp bạn duy trì nhịp độ kỷ luật tự nhiên."
          : "Kế hoạch Hôm nay mô phỏng giao diện check-in thực tế. Sau khi kích hoạt, bạn sẽ bắt đầu ngay tuần 1.";

  if (isRealMode() && auth.authLoading) {
    return (
      <PageShell maxWidth="xl">
        <CoreFlowProgress currentStepId="twelve_week_setup" onExit={() => navigate("/")} />
        <FormSkeleton className="mt-6" aria-label="Đang kiểm tra tài khoản" />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell maxWidth="xl">
        <CoreFlowProgress currentStepId="twelve_week_setup" onExit={() => navigate("/")} />
        <FormSkeleton className="mt-6" aria-label="Đang chuẩn bị dữ liệu thiết lập 12 tuần" />
      </PageShell>
    );
  }

  if (setupGate === "needs_life_balance") {
    return (
      <CoreFlowGateState
        currentStepId="life_balance"
        eyebrow="Thiết lập 12 tuần"
        title="Hoàn thành Cân bằng cuộc sống trước khi tạo kế hoạch 12 tuần"
        description="Kế hoạch 12 tuần cần điểm cân bằng thật để biết mục tiêu đang gắn với lĩnh vực nào. Hãy bắt đầu từ đánh giá cân bằng rồi quay lại flow chính."
        actionLabel="Bắt đầu Cân bằng cuộc sống"
        onAction={() => navigate("/onboarding")}
        secondaryActionLabel="Về bảng điều khiển"
        onSecondaryAction={() => navigate("/")}
      />
    );
  }

  if (setupGate === "needs_life_insight") {
    return (
      <CoreFlowGateState
        currentStepId="life_insight"
        eyebrow="Thiết lập 12 tuần"
        title="Chọn trọng tâm trước khi tạo kế hoạch 12 tuần"
        description="Bạn cần một trọng tâm hợp lệ từ Góc nhìn cuộc sống để kế hoạch 12 tuần không bị quá rộng hoặc lệch khỏi dữ liệu cân bằng."
        actionLabel="Mở Góc nhìn cuộc sống"
        onAction={() => navigate("/life-insight")}
        secondaryActionLabel="Bắt đầu Cân bằng cuộc sống"
        onSecondaryAction={() => navigate("/onboarding")}
      />
    );
  }

  if (setupGate === "needs_smart_goal") {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Thiết lập 12 tuần"
        title="Viết mục tiêu SMART trước khi tạo kế hoạch 12 tuần"
        description="Kế hoạch cần mục tiêu đủ rõ về kết quả, chỉ số và thời hạn. Hoàn thiện mục tiêu SMART trước, sau đó kiểm tra tính khả thi và quay lại thiết lập."
        actionLabel="Quay lại viết mục tiêu"
        onAction={() => navigate("/smart-goal-setup")}
        secondaryActionLabel="Mở Góc nhìn cuộc sống"
        onSecondaryAction={() => navigate("/life-insight")}
      />
    );
  }

  if (setupGate === "needs_feasibility") {
    return (
      <CoreFlowGateState
        currentStepId="feasibility"
        eyebrow="Thiết lập 12 tuần"
        title="Kiểm tra tính khả thi trước khi tạo kế hoạch 12 tuần"
        description="Bạn đã có mục tiêu, nhưng cần kết quả kiểm tra để chọn tải việc, lịch review và mức cam kết phù hợp cho 12 tuần đầu."
        actionLabel="Mở kiểm tra tính khả thi"
        onAction={() => navigate("/feasibility")}
        secondaryActionLabel="Quay lại viết mục tiêu"
        onSecondaryAction={() => navigate("/smart-goal-setup")}
      />
    );
  }

  if (!smartGoal || !feasibility) {
    return (
      <CoreFlowGateState
        currentStepId="feasibility"
        eyebrow="Thiết lập 12 tuần"
        title="Kiểm tra tính khả thi trước khi tạo kế hoạch 12 tuần"
        description="Bạn đã có mục tiêu, nhưng cần kết quả kiểm tra để chọn tải việc, lịch review và mức cam kết phù hợp cho 12 tuần đầu."
        actionLabel="Mở kiểm tra tính khả thi"
        onAction={() => navigate("/feasibility")}
        secondaryActionLabel="Quay lại viết mục tiêu"
        onSecondaryAction={() => navigate("/smart-goal-setup")}
      />
    );
  }

  const coreCount = validIndicators.filter((indicator) => indicator.type !== "optional").length;
  const optionalCount = validIndicators.filter((indicator) => indicator.type === "optional").length;
  const weekOneTaskPreview =
    previewTasks.length > 0
      ? previewTasks
      : (setupGuideSupport?.personalizedTactics.map((tactic) => tactic.name).slice(0, 4) ?? []);
  const weekOneTaskWarning = getWeeklyTaskWarning(weekOneTaskPreview.length);
  const invalidTargetError =
    draft.leadIndicators
      .map((indicator, index) => getLeadIndicatorTargetValidationError(indicator, index))
      .find((error): error is string => error !== null) ?? null;
  const invalidUnitError =
    draft.leadIndicators
      .map((indicator, index) => getLeadIndicatorUnitValidationError(indicator, index))
      .find((error): error is string => error !== null) ?? null;
  const startDateValidation = getStartDateValidation(draft.startDate);
  const normalizedDraftReviewDay = normalizeReviewDay(draft.reviewDay);
  const milestoneError = getMilestoneValidationError({
    week4: draft.week4Milestone,
    week8: draft.week8Milestone,
    week12: draft.week12Outcome,
  });
  const rawCurrentStepValidationError = (() => {
    if (currentStep === 0) {
      if (!draft.goalType || !draft.week12Outcome.trim()) return "Làm rõ kết quả 12 tuần trước.";
      return milestoneError;
    }

    if (currentStep === 1) {
      if (draft.leadIndicators.length < 2 || draft.leadIndicators.length > 4) {
        return "Giữ từ 2 đến 4 việc lặp lại để bước này gọn và dễ giữ nhịp.";
      }
      if (draft.leadIndicators.some((indicator) => !indicator.name.trim())) {
        return "Cần đặt tên cho từng việc lặp lại trước khi tiếp tục.";
      }
      return invalidTargetError ?? invalidUnitError;
    }

    if (currentStep === 2) {
      if (!draft.lagMetricName.trim() || !cycleStartDate || !draft.reviewDay) {
        return "Chốt chỉ số chính, ngày bắt đầu và ngày nhìn lại.";
      }
      if (!draft.reviewDay || normalizedDraftReviewDay.changed) return "Chọn ngày nhìn lại hợp lệ.";
      return startDateValidation.error;
    }

    // Step 3: Preview & Activation
    if (!draft.goalType || !draft.week12Outcome.trim()) return "Làm rõ kết quả 12 tuần trước.";
    if (draft.leadIndicators.length < 2 || draft.leadIndicators.length > 4) {
      return "Giữ từ 2 đến 4 việc lặp lại để bước này gọn và dễ giữ nhịp.";
    }
    if (draft.leadIndicators.some((indicator) => !indicator.name.trim())) {
      return "Cần đặt tên cho từng việc lặp lại trước khi tiếp tục.";
    }
    if (!draft.lagMetricName.trim() || !cycleStartDate || !draft.reviewDay) {
      return "Chốt chỉ số chính, ngày bắt đầu và ngày nhìn lại.";
    }
    if (!draft.reviewDay || normalizedDraftReviewDay.changed) return "Chọn ngày nhìn lại hợp lệ.";
    return invalidTargetError ?? invalidUnitError ?? startDateValidation.error ?? milestoneError;
  })();

  const currentStepValidationError = attemptedStepIndexes[currentStep] ? rawCurrentStepValidationError : null;

  const applyTemplate = (template: TwelveWeekTemplateDefinition, announce = true) => {
    const nextPlan = getCurrentPlan();
    const adaptiveTemplateSupport =
      smartGoal && feasibility
        ? buildAdaptiveTemplateSupport({
            template,
            goalStatement: smartGoal.specific,
            measurableText: smartGoal.measurable,
            readinessScore: feasibility.adjustedScore,
          })
        : null;
    const nextTactics = adaptiveTemplateSupport?.personalizedTactics ?? template.tactics;

    setDraft((previousDraft) => {
      const timeBudget = previousDraft.dailyTimeBudget;
      const adjustTarget = (original: string): string => {
        const parsed = Number.parseInt(original, 10);
        if (Number.isNaN(parsed) || parsed <= 0) return original;
        if (timeBudget === "30min") return String(Math.max(1, parsed - 1));
        if (timeBudget === "2h+") return String(parsed + 1);
        return original;
      };

      const constraintLoadOverride =
        previousDraft.personalConstraint === "time" || previousDraft.personalConstraint === "consistency"
          ? ("lighter" as const)
          : previousDraft.personalConstraint === "motivation"
            ? ("balanced" as const)
            : undefined;

      return {
        ...previousDraft,
        templateId: template.id,
        goalType: template.goalType,
        vision12Week: template.vision12Week,
        week12Outcome: template.week12Outcome,
        lagMetricName: template.lagMetricName,
        lagMetricTarget: template.lagMetricTarget,
        lagMetricUnit: template.lagMetricUnit,
        reviewDay: adaptiveTemplateSupport?.recommendedReviewDay ?? template.reviewDay,
        tacticLoadPreference:
          constraintLoadOverride ??
          feasibility?.planLoad ??
          adaptiveTemplateSupport?.recommendedLoadPreference ??
          previousDraft.tacticLoadPreference,
        week4Milestone: adaptiveTemplateSupport?.week4MilestoneSuggestion ?? template.week4Milestone,
        week8Milestone: adaptiveTemplateSupport?.week8MilestoneSuggestion ?? template.week8Milestone,
        successEvidence: template.successEvidence,
        leadIndicators: nextTactics.map((tactic) => ({
          id: createIndicatorId(),
          name: tactic.name,
          target: adjustTarget(tactic.target),
          unit: tactic.unit,
          type: tactic.type,
          cadence: tactic.cadence,
        })),
      };
    });

    trackAppEvent("12_week_template_selected", undefined, {
      templateId: template.id,
      tier: template.requiredPlan ? "premium" : "free",
      plan: nextPlan,
    });
    trackTemplateApplied({
      source: "12_week_setup",
      currentPlan: nextPlan,
      templateId: template.id,
      templateName: template.name,
      tier: template.requiredPlan ? "premium" : "free",
      requiredPlan: template.requiredPlan ?? "FREE",
    });

    if (announce) {
      toast.success(`Đã áp dụng khung “${template.name}”.`, {
        description: "Bạn vẫn có thể sửa mọi việc lặp lại và cột mốc ngay trong bước này.",
      });
    }
  };

  const handleTemplateSelect = (template: TwelveWeekTemplateDefinition) => {
    if (!planSatisfiesRequirement(currentPlan, template.requiredPlan)) {
      if (template.requiredPlan) {
        const requiredPlan = template.requiredPlan as Exclude<PricingPlanCode, "FREE">;
        trackPremiumTemplateUnlockPrompted({
          source: "template_catalog",
          currentPlan,
          templateId: template.id,
          requiredPlan,
        });
        trackPaywallCtaClicked({
          context: "template",
          source: "template_catalog",
          currentPlan,
          recommendedPlan: requiredPlan,
          targetPlan: requiredPlan,
          placement: "locked_template_card",
        });
      }
      setPendingTemplateId(template.id);
      setPaywallReason("template");
      setIsPaywallOpen(true);
      return;
    }

    applyTemplate(template);
  };

  const handleCheckoutComplete = () => {
    const nextPlan = getCurrentPlan();
    setCurrentPlan(nextPlan);

    if (!pendingTemplateId) return;

    const unlockedTemplate = TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => template.id === pendingTemplateId);
    setPendingTemplateId(null);
    if (unlockedTemplate && planSatisfiesRequirement(nextPlan, unlockedTemplate.requiredPlan)) {
      applyTemplate(unlockedTemplate);
      return;
    }

    if (unlockedTemplate) {
      toast.info(`Khung “${unlockedTemplate.name}” vẫn cần gói ${unlockedTemplate.requiredPlan}.`);
    }
  };

  const handleChange = <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => {
    setDraft(
      (previousDraft) =>
        ({
          ...previousDraft,
          [key]: value,
        }) as TwelveWeekSetupDraft,
    );
  };

  const _handleTemplatePersonalizationChange = <K extends "dailyTimeBudget" | "personalConstraint">(
    key: K,
    value: TwelveWeekSetupDraft[K],
  ) => {
    handleChange(key, value);
    if (selectedTemplate) {
      setTimeout(() => applyTemplate(selectedTemplate, false), 0);
    }
  };

  const _handlePreferredDayToggle = (dayIndex: number) => {
    setDraft((previousDraft) => {
      const isActive = previousDraft.preferredDays.includes(dayIndex);
      return {
        ...previousDraft,
        preferredDays: isActive
          ? previousDraft.preferredDays.filter((day) => day !== dayIndex)
          : [...previousDraft.preferredDays, dayIndex],
      };
    });
  };

  const handleIndicatorChange = <K extends keyof LeadIndicatorDraft>(
    index: number,
    key: K,
    value: LeadIndicatorDraft[K],
  ) => {
    setDraft((previousDraft) => {
      const nextIndicators = [...previousDraft.leadIndicators];
      nextIndicators[index] = {
        ...nextIndicators[index],
        [key]: value,
      } as LeadIndicatorDraft;
      return { ...previousDraft, leadIndicators: nextIndicators };
    });
  };

  const handleAddIndicator = () => {
    setDraft((previousDraft) => {
      if (previousDraft.leadIndicators.length >= 4) return previousDraft;

      return {
        ...previousDraft,
        leadIndicators: [
          ...previousDraft.leadIndicators,
          createIndicatorDraft(previousDraft.leadIndicators.length < 2 ? "core" : "optional"),
        ],
      };
    });
  };

  const handleRemoveIndicator = (index: number) => {
    setDraft((previousDraft) => {
      if (previousDraft.leadIndicators.length <= 2) return previousDraft;

      return {
        ...previousDraft,
        leadIndicators: previousDraft.leadIndicators.filter((_, indicatorIndex) => indicatorIndex !== index),
      };
    });
  };

  const validateCurrentStep = () => {
    setAttemptedStepIndexes((previous) => ({ ...previous, [currentStep]: true }));
    if (rawCurrentStepValidationError) {
      toast.error(rawCurrentStepValidationError);
      if (
        currentStep !== 1 &&
        (rawCurrentStepValidationError === invalidTargetError ||
          rawCurrentStepValidationError === invalidUnitError)
      ) {
        setCurrentStep(1);
      } else if (
        currentStep !== 2 &&
        (rawCurrentStepValidationError === startDateValidation.error ||
          rawCurrentStepValidationError === "Chọn ngày nhìn lại hợp lệ." ||
          rawCurrentStepValidationError === "Chốt chỉ số chính, ngày bắt đầu và ngày nhìn lại.")
      ) {
        setCurrentStep(2);
      } else if (currentStep !== 0 && rawCurrentStepValidationError === milestoneError) {
        setCurrentStep(0);
      }
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (
      currentStep === 0 &&
      draft.templateId &&
      (draft.dailyTimeBudget || draft.preferredDays.length > 0 || draft.personalConstraint)
    ) {
      trackAppEvent("12_week_template_personalized", undefined, {
        templateId: draft.templateId,
        dailyTimeBudget: draft.dailyTimeBudget || "none",
        preferredDaysCount: String(draft.preferredDays.length),
        personalConstraint: draft.personalConstraint || "none",
      });
    }

    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate("/feasibility");
      return;
    }

    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (isRealMode() && !auth.user) {
      setCurrentStep(STEPS.length - 1);
      return;
    }

    const currentUserData = getUserData();
    if (hasReachedLimit(currentUserData, "maxActiveGoals") || hasReachedLimit(currentUserData, "max12WeekCycles")) {
      setPaywallReason("cycle_limit");
      setIsPaywallOpen(true);
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh";
    const goalId = addGoal({
      category: focusArea,
      title: smartGoal.specific.trim(),
      description: [smartGoal.measurable.trim(), smartGoal.achievable.trim(), smartGoal.relevant.trim()]
        .filter(Boolean)
        .join("\n\n"),
      deadline: cycleEndDate,
      aspirationalVisionId: aspirationalVision?.id,
      tasks: previewTasks.slice(0, 4).map((taskTitle, index) => ({
        id: `task_${Date.now()}_${index}`,
        title: taskTitle,
        completed: false,
      })),
      feasibilityResult: feasibility.resultType,
      readinessScore: feasibility.adjustedScore,
      focusArea,
      twelveWeekSystem: {
        goalType: draft.goalType,
        vision12Week: draft.vision12Week.trim(),
        cycleNumber: 1,
        templateId: selectedTemplate?.id,
        templateName: selectedTemplate?.name,
        lagMetric: {
          name: draft.lagMetricName.trim(),
          unit: draft.lagMetricUnit.trim(),
          target: draft.lagMetricTarget.trim(),
          currentValue: "",
        },
        leadIndicators: scheduledLeadIndicators.map((indicator) => ({
          id: indicator.id,
          name: indicator.name.trim(),
          target: indicator.target.trim() || "1",
          unit: indicator.unit.trim(),
          type: indicator.type,
          schedule: indicator.schedule,
          commitment: normalizeIndicatorCommitmentDraft(indicator.commitment),
        })),
        milestones: {
          week4: draft.week4Milestone.trim(),
          week8: draft.week8Milestone.trim(),
          week12: draft.week12Outcome.trim(),
        },
        successEvidence: draft.successEvidence.trim(),
        reviewDay: draft.reviewDay,
        week12Outcome: draft.week12Outcome.trim(),
        startDate: cycleStartDate,
        endDate: cycleEndDate,
        timezone,
        weekStartsOn: "Monday",
        status: "active",
        dailyReminderTime: "19:00",
        tacticLoadPreference: draft.tacticLoadPreference,
        preferredDays: draft.preferredDays.length > 0 ? draft.preferredDays : undefined,
        personalConstraint: draft.personalConstraint || undefined,
        reentryCount: 0,
        currentWeek: 1,
        totalWeeks: 12,
        weeklyPlans: buildWeeklyPlans(
          draft.week12Outcome.trim(),
          draft.week4Milestone.trim(),
          draft.week8Milestone.trim(),
          selectedTemplateSupport?.weekPlanFocuses,
        ),
        taskInstances: [],
        dailyCheckIns: [],
        weeklyReviews: [],
        scoreboard: buildScoreboard(),
      },
    });

    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goalId);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goalId);
    const createdSystem = getUserData().goals.find((goal) => goal.id === goalId)?.twelveWeekSystem;
    if (createdSystem) {
      enqueuePlanSnapshotUpdatedMutation(goalId, createdSystem, "setup");
      enqueueLeadMetricUpsertedMutations(goalId, createdSystem, "setup");
    }
    trackAnalyticsEvent(
      "twelve_week_plan_created",
      {
        goal_type: draft.goalType,
        focus_area: focusArea,
        total_weeks: 12,
        lead_indicator_count: validIndicators.length,
        core_indicator_count: coreCount,
        task_count: previewTasks.length,
        template_tier: selectedTemplate ? (selectedTemplate.requiredPlan ? "premium" : "free") : "none",
      },
      {
        goalId,
        legacyEventName: "12_week_plan_created",
        legacyPayload: {
          reviewDay: draft.reviewDay,
          coreTactics: String(coreCount),
          optionalTactics: String(optionalCount),
          templateId: selectedTemplate?.id ?? "custom",
          plan: currentPlan,
          dailyTimeBudget: draft.dailyTimeBudget || "none",
          preferredDaysCount: String(draft.preferredDays.length),
          personalConstraint: draft.personalConstraint || "none",
        },
      },
    );
    clearGoalPlanningDrafts();

    const backendGoalPayload = {
      title: smartGoal.specific.trim(),
      category: focusArea,
      description: [smartGoal.measurable, smartGoal.achievable, smartGoal.relevant]
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n\n"),
      deadline: cycleEndDate,
      status: "active",
      focusArea,
      feasibilityResult: {
        resultType: feasibility.resultType,
        adjustedScore: feasibility.adjustedScore,
        readinessScore: feasibility.readinessScore,
        wheelScore: feasibility.wheelScore,
        planLoad: feasibility.planLoad,
        bottleneck: feasibility.bottleneck,
        diagnosticScore: feasibility.diagnosticScore,
        maxDiagnosticScore: feasibility.maxDiagnosticScore,
      },
      readinessScore: feasibility.adjustedScore,
      tasks: previewTasks.slice(0, 4).map((taskTitle) => ({ title: taskTitle, completed: false })),
    } satisfies Parameters<typeof createGoal>[0];

    if (canRunBackendSync) {
      void (async () => {
        let backendGoalId: string | null = null;
        let isSyncError = false;

        try {
          const backendGoal = await createGoal(backendGoalPayload);
          backendGoalId = backendGoal.id;
          saveGoalLink(goalId, backendGoal.id);
        } catch (goalSyncError) {
          console.warn("Backend goal creation failed; keeping local-first 12-week plan.", goalSyncError);
          isSyncError = true;
        }

        let backendPlanId: string | null = null;
        try {
          backendPlanId = await planSetupActions.syncPlanForGoal({
            localGoalId: goalId,
            backendGoalId: backendGoalId ?? undefined,
            vision: draft.vision12Week.trim(),
            startDate: parseCalendarDate(cycleStartDate)?.toISOString() ?? new Date().toISOString(),
            totalWeeks: 12,
          });
        } catch (planSyncError) {
          console.warn("Backend plan sync failed.", planSyncError);
          isSyncError = true;
        }

        if (backendPlanId && backendGoalId) {
          try {
            await updateGoal(backendGoalId, { planId: backendPlanId });
          } catch (linkError) {
            console.warn("Failed to link backend goal to plan.", linkError);
            isSyncError = true;
          }
        } else if (!backendPlanId) {
          isSyncError = true;
        }

        if (isSyncError) {
          toast.warning("Lưu ngoại tuyến thành công!", {
            description: "Kế hoạch đã sẵn sàng trên thiết bị này nhưng chưa thể đồng bộ lên đám mây (Lỗi kết nối). Bạn có thể thử đồng bộ lại sau trong Cài đặt.",
            duration: 6000,
          });
        } else {
          toast.success("Đồng bộ đám mây hoàn tất.", {
            description: "Kế hoạch 12 tuần của bạn đã được sao lưu an toàn trên cloud.",
          });
        }
      })();
    }

    toast.success("Kế hoạch 12 tuần đã sẵn sàng.", {
      description: "Vào ngay màn Hôm nay để bắt đầu tuần đầu tiên.",
    });

    localStorage.setItem("show_12week_setup_success", "true");
    navigate("/12-week-system");
  };

  return (
    <PageShell maxWidth="xl">
      <div className="space-y-5 sm:space-y-6">
        <UpgradePaywallDialog
          open={isPaywallOpen}
          onOpenChange={setIsPaywallOpen}
          context="template"
          currentPlan={currentPlan}
          recommendedPlan={pendingTemplate?.requiredPlan ?? "PLUS"}
          source="12_week_setup"
          title={paywallReason === "cycle_limit" ? "Bạn đã có 1 chu kỳ đang chạy" : "Mở Plus để thiết lập nhanh hơn"}
          description={
            paywallReason === "cycle_limit"
              ? "Nâng cấp Plus để tạo thêm chu kỳ 12 tuần. Dữ liệu hiện có vẫn được giữ nguyên."
              : "Khung này phù hợp với kiểu mục tiêu và mức sẵn sàng của bạn. Mở Plus để dùng ngay."
          }
          onCheckoutComplete={handleCheckoutComplete}
        />

        <CoreFlowProgress
          currentStepId="twelve_week_setup"
          onExit={() => navigate("/")}
          className="[&_button]:min-h-10 [&_button]:px-3 [&_button]:py-2"
        />

        {/* Tiêu đề chính tối giản */}
        <section aria-labelledby="twelve-week-setup-title" className="space-y-4">
          {/* Banner visual anchor ở trên */}
          <div className="overflow-hidden rounded-card border border-app-line aspect-[16/5] w-full bg-app-bg shadow-app-sm">
            <img
              src="/twelve_week_roadmap.png"
              alt="Lộ trình hành trình 12 tuần"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-app-ink-muted">
                {getLifeAreaLabel(focusArea)} · Thiết lập kế hoạch 12 tuần
              </p>
              <h1
                id="twelve-week-setup-title"
                className="mt-3 max-w-3xl font-serif text-3xl font-medium leading-tight tracking-tight text-app-ink sm:text-4xl"
              >
                Tạo kế hoạch 12 tuần
              </h1>
            </div>
            {isSavingDraft ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-app-ink-muted shrink-0 select-none self-start sm:self-auto">
                <span className="h-2 w-2 rounded-full bg-app-accent animate-pulse" />
                Đang lưu nháp tự động...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-app-status-success shrink-0 select-none self-start sm:self-auto">
                <span className="h-2 w-2 rounded-full bg-app-status-success" />
                Đã lưu nháp an toàn
              </span>
            )}
          </div>

          <div className="mt-3.5 max-w-2xl bg-app-bg-subtle/50 dark:bg-app-bg-subtle/10 border border-app-line/60 rounded-xl p-3.5 flex items-start gap-2.5 shadow-3xs">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent text-xs"
              aria-hidden="true"
            >
              🎯
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-app-accent tracking-wider">Mục tiêu đang thiết lập</p>
              <p className="mt-0.5 text-xs font-medium text-app-ink leading-relaxed line-clamp-2 md:line-clamp-3">
                {smartGoal.specific.trim() || "mục tiêu của bạn"}
              </p>
            </div>
          </div>

          {aspirationalVision && (
            <p className="mt-3.5 max-w-2xl text-sm leading-6 text-app-ink-soft">
              Kế hoạch 12 tuần này phục vụ tầm nhìn 3 năm: {aspirationalVision.summary}
            </p>
          )}
          <p className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft">
            Dựa trên mục tiêu SMART của bạn, chúng tôi đã tự động chia nhỏ mốc lộ trình và điền sẵn kế hoạch. Bạn chỉ
            cần xem lại và bấm tiếp tục.
          </p>
        </section>

        {/* Giao diện 1 cột trung tâm "Journey Card Layout" */}
        <div className="mx-auto max-w-2xl lg:max-w-3xl space-y-6">
          <SetupStepShellLab
            title={STEPS[currentStep].title}
            description={currentStepDescription}
            whyThisMatters={currentStepWhy}
            currentStep={currentStep}
            stepCount={STEPS.length}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
            onJumpToStep={handleJumpToStep}
            stepError={currentStepValidationError}
            isNextDisabled={false}
            isSubmitDisabled={false}
            nextButtonLabel={
              currentStep === 0
                ? "Sắp xếp hành động cam kết ➔"
                : currentStep === 1
                  ? "Thiết lập lịch trình 📅"
                  : "Xem trước kế hoạch Hôm nay 👀"
            }
          >
            {currentStep === 0 && (
              <OutcomeStepLab
                draft={draft}
                onChange={handleChange}
                feasibility={feasibility}
                currentPlan={currentPlan}
                smartGoal={smartGoal}
                selectedTemplate={selectedTemplate}
                recommendedTemplate={recommendedTemplate}
                onTemplateSelect={handleTemplateSelect}
              />
            )}

            {currentStep === 1 && (
              <LeadIndicatorsStepLab
                draft={draft}
                showValidationErrors={Boolean(attemptedStepIndexes[1])}
                onAddIndicator={handleAddIndicator}
                onRemoveIndicator={handleRemoveIndicator}
                onIndicatorChange={handleIndicatorChange}
                coreCount={coreCount}
                optionalCount={optionalCount}
                setupGuideSupport={setupGuideSupport}
                setupGuideTemplate={setupGuideTemplate}
                selectedTemplate={selectedTemplate}
                weekOneTaskPreview={weekOneTaskPreview}
                weekOneTaskWarning={weekOneTaskWarning}
                weekOneTaskGroups={previewTaskGroups}
              />
            )}

            {currentStep === 2 && (
              <ScheduleStepLab
                draft={draft}
                cycleStartDate={cycleStartDate}
                cycleEndDate={cycleEndDate}
                onChange={handleChange}
                setupGuideSupport={setupGuideSupport}
                setupGuideTemplate={setupGuideTemplate}
                hasPreviewTasks={previewTasks.length > 0}
                weekOneTaskPreview={weekOneTaskPreview}
                weekOneTaskWarning={weekOneTaskWarning}
              />
            )}

            {currentStep === 3 && isRealMode() && !auth.user ? <RealModeLoginGate target="12WeekSetup" /> : null}

            {currentStep === 3 && !(isRealMode() && !auth.user) ? (
              <PlanPreviewStepLab
                draft={draft}
                smartGoal={smartGoal}
                feasibility={feasibility}
                focusArea={focusArea}
                selectedTemplate={selectedTemplate}
                validationMessage={currentStepValidationError}
                canConfirm={!currentStepValidationError}
              />
            ) : null}
          </SetupStepShellLab>
        </div>
      </div>
    </PageShell>
  );
}
