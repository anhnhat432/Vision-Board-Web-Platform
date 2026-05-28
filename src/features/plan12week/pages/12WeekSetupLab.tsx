import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { CoreFlowGateState } from "@/app/components/CoreFlowGateState";
import { CoreFlowProgress } from "@/app/components/CoreFlowProgress";
import { PageShell } from "@/app/components/PageShell";
import { FormSkeleton } from "@/app/components/ui/skeleton";
import { RealModeLoginGate } from "@/app/components/RealModeLoginGate";
import { UpgradePaywallDialog } from "@/app/components/UpgradePaywallDialog";
import { trackAnalyticsEvent } from "@/app/utils/analytics";
import {
  APP_STORAGE_KEYS,
  type LeadIndicatorCommitment,
  type PricingPlanCode,
  addGoal,
  clearGoalPlanningDrafts,
  formatDateInputValue,
  getCurrentPlan,
  getLifeAreaLabel,
  getUserData,
  parseCalendarDate,
  trackAppEvent,
} from "@/app/utils/storage";
import { getScoredLifeArea, hasRealLifeBalance } from "@/app/utils/core-flow-guard";
import { hasReachedLimit } from "@/app/utils/feature-entitlements";
import {
  trackPaywallCtaClicked,
  trackPremiumTemplateUnlockPrompted,
  trackTemplateApplied,
} from "@/app/utils/monetization-analytics";
import {
  TWELVE_WEEK_TEMPLATE_CATALOG,
  buildAdaptiveTemplateRecommendation,
  buildAdaptiveTemplateSupport,
  planSatisfiesRequirement,
  type TwelveWeekTemplateDefinition,
} from "@/app/utils/twelve-week-premium";
import { parsePendingSMARTGoal, parseSmartGoal, type PendingSMARTGoal } from "@/lib/smart-goal";
import { getWeeklyTaskWarning } from "@/features/plan12week/logic";
import { usePlanSetupSync } from "@/features/plan12week/hooks";
import { enqueuePlanSnapshotUpdatedMutation } from "@/features/plan12week/persistence/planSnapshotMutation";
import { enqueueLeadMetricUpsertedMutations } from "@/features/plan12week/persistence/leadMetricMutation";
import { createGoal, updateGoal } from "@/services/goalService";
import { saveGoalLink } from "@/lib/api/goalLinkStore";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { isDemoMode, isRealMode } from "@/app/utils/app-mode";
import type { AspirationalVision as AspirationalVisionModel } from "@/app/utils/storage-types";
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
import { SetupStepShellLab } from "./12WeekSetup/components/SetupStepShellLab";
import { OutcomeStepLab } from "./12WeekSetup/components/OutcomeStepLab";
import { LeadIndicatorsStepLab } from "./12WeekSetup/components/LeadIndicatorsStepLab";
import { ScheduleStepLab } from "./12WeekSetup/components/ScheduleStepLab";
import { PlanPreviewStepLab } from "@/features/plan12week/components/PlanPreviewStepLab";

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
  const [isVisionPromptDismissed, setIsVisionPromptDismissed] = useState(false);
  const [attemptedStepIndexes, setAttemptedStepIndexes] = useState<Record<number, boolean>>({});
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
        toast.error("K?t qu? ki?m tra tính kh? thi cu không d?c du?c, làm l?i nhanh");
        navigate("/feasibility");
      }
      setSetupGate(prerequisites.gate);
      setIsLoading(false);
      return;
    }

    if (prerequisites.staleFeasibility) {
      toast.warning("K?t qu? ki?m tra tính kh? thi hoi cu, làm l?i d? d? li?u chính xác?", {
        action: {
          label: "Làm l?i",
          onClick: () => navigate("/feasibility"),
        },
        cancel: {
          label: "Dùng t?m",
          onClick: () => undefined,
        },
      });
    }

    setFocusArea(prerequisites.selectedFocusArea);
    setSmartGoal(prerequisites.parsedSmartGoal);
    setFeasibility(prerequisites.parsedFeasibility);
    setCurrentPlan(prerequisites.setupPlan);

    setDraft((previousDraft) => {
      const baseDraft = {
        ...previousDraft,
        vision12Week:
          previousDraft.vision12Week ||
          `Trong 12 tu?n t?i, tôi mu?n bi?n m?c tiêu "${prerequisites.parsedSmartGoal.specific}" thành m?t nh?p th?c thi rõ ràng.`,
        week12Outcome:
          previousDraft.week12Outcome ||
          prerequisites.parsedSmartGoal.measurable ||
          prerequisites.parsedSmartGoal.specific,
        lagMetricName:
          previousDraft.lagMetricName ||
          prerequisites.smartGoalMetricName ||
          prerequisites.parsedSmartGoal.measurable ||
          "Ch? s? k?t qu? chính",
        lagMetricUnit: previousDraft.lagMetricUnit || prerequisites.smartGoalMetricUnit,
        tacticLoadPreference:
          previousDraft.tacticLoadPreference === "balanced"
            ? prerequisites.feasibilityDefaults.tacticLoadPreference
            : previousDraft.tacticLoadPreference,
        dailyTimeBudget: previousDraft.dailyTimeBudget || prerequisites.feasibilityDefaults.dailyTimeBudget,
        personalConstraint: previousDraft.personalConstraint || prerequisites.feasibilityDefaults.personalConstraint,
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
                  unit: indicator?.unit ?? "l?n/tu?n",
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

    // Debounce: save after 500ms of inactivity
    saveTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem(APP_STORAGE_KEYS.pending12WeekSetupDraft, JSON.stringify(draft));
      saveTimeoutRef.current = null;
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [draft, feasibility, isLoading, smartGoal]);

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
      ? "Làm rõ tr?ng thái b?n mu?n d?t du?c khi 12 tu?n k?t thúc."
      : currentStep === 1
        ? "Ch?n 2-4 vi?c b?n ki?m soát du?c và l?p l?i du?c m?i tu?n."
        : currentStep === 2
          ? "Ch?t ngày b?t d?u, ngày xem l?i tu?n và ch? s? k?t qu?."
          : "Xem tru?c k? ho?ch t? d?ng, ch?nh s?a n?u c?n và xác nh?n.";
  const currentStepWhy =
    currentStep === 0
      ? "K?t qu? rõ giúp bi?t khi nào v? dích — và tránh d?i dích gi?a chu k? vì c?m xúc."
      : currentStep === 1
        ? "Vi?c l?p l?i là vi?c b?n ch? d?ng làm d?u. Ch? s? k?t qu? là con s? xem l?i sau d? bi?t vi?c dó có t?o ti?n b? không."
        : currentStep === 2
          ? "M?t ngày xem l?i c? d?nh giúp b?n bi?t tu?n v?a r?i có l?ch không và tu?n t?i c?n ch?nh gì."
          : "K? ho?ch du?c t?o t? d?ng t? m?c tiêu và vi?c l?p l?i. Sau khi luu, b?n s? vào ph?n th?c thi h?ng tu?n và màn Hôm nay d? b?t d?u.";

  if (isRealMode() && auth.authLoading) {
    return (
      <PageShell maxWidth="xl">
        <CoreFlowProgress currentStepId="twelve_week_setup" onExit={() => navigate("/")} />
        <FormSkeleton className="mt-6" aria-label="Ðang ki?m tra tài kho?n" />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell maxWidth="xl">
        <CoreFlowProgress currentStepId="twelve_week_setup" onExit={() => navigate("/")} />
        <FormSkeleton className="mt-6" aria-label="Ðang chu?n b? d? li?u thi?t l?p 12 tu?n" />
      </PageShell>
    );
  }

  if (setupGate === "needs_life_balance") {
    return (
      <CoreFlowGateState
        currentStepId="life_balance"
        eyebrow="Thi?t l?p 12 tu?n"
        title="Hoàn thành Cân b?ng cu?c s?ng tru?c khi t?o k? ho?ch 12 tu?n"
        description="K? ho?ch 12 tu?n c?n di?m cân b?ng th?t d? bi?t m?c tiêu dang g?n v?i linh v?c nào. Hãy b?t d?u t? dánh giá cân b?ng r?i quay l?i flow chính."
        actionLabel="B?t d?u Cân b?ng cu?c s?ng"
        onAction={() => navigate("/onboarding")}
        secondaryActionLabel="V? b?ng di?u khi?n"
        onSecondaryAction={() => navigate("/")}
      />
    );
  }

  if (setupGate === "needs_life_insight") {
    return (
      <CoreFlowGateState
        currentStepId="life_insight"
        eyebrow="Thi?t l?p 12 tu?n"
        title="Ch?n tr?ng tâm tru?c khi t?o k? ho?ch 12 tu?n"
        description="B?n c?n m?t tr?ng tâm h?p l? t? Góc nhìn cu?c s?ng d? k? ho?ch 12 tu?n không b? quá r?ng ho?c l?ch kh?i d? li?u cân b?ng."
        actionLabel="M? Góc nhìn cu?c s?ng"
        onAction={() => navigate("/life-insight")}
        secondaryActionLabel="B?t d?u Cân b?ng cu?c s?ng"
        onSecondaryAction={() => navigate("/onboarding")}
      />
    );
  }

  if (setupGate === "needs_smart_goal") {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Thi?t l?p 12 tu?n"
        title="Vi?t m?c tiêu SMART tru?c khi t?o k? ho?ch 12 tu?n"
        description="K? ho?ch c?n m?c tiêu d? rõ v? k?t qu?, ch? s? và th?i h?n. Hoàn thi?n m?c tiêu SMART tru?c, sau dó ki?m tra tính kh? thi và quay l?i thi?t l?p."
        actionLabel="Quay l?i vi?t m?c tiêu"
        onAction={() => navigate("/smart-goal-setup")}
        secondaryActionLabel="M? Góc nhìn cu?c s?ng"
        onSecondaryAction={() => navigate("/life-insight")}
      />
    );
  }

  if (setupGate === "needs_feasibility") {
    return (
      <CoreFlowGateState
        currentStepId="feasibility"
        eyebrow="Thi?t l?p 12 tu?n"
        title="Ki?m tra tính kh? thi tru?c khi t?o k? ho?ch 12 tu?n"
        description="B?n dã có m?c tiêu, nhung c?n k?t qu? ki?m tra d? ch?n t?i vi?c, l?ch review và m?c cam k?t phù h?p cho 12 tu?n d?u."
        actionLabel="M? ki?m tra tính kh? thi"
        onAction={() => navigate("/feasibility")}
        secondaryActionLabel="Quay l?i vi?t m?c tiêu"
        onSecondaryAction={() => navigate("/smart-goal-setup")}
      />
    );
  }

  if (!smartGoal || !feasibility) {
    return (
      <CoreFlowGateState
        currentStepId="feasibility"
        eyebrow="Thi?t l?p 12 tu?n"
        title="Ki?m tra tính kh? thi tru?c khi t?o k? ho?ch 12 tu?n"
        description="B?n dã có m?c tiêu, nhung c?n k?t qu? ki?m tra d? ch?n t?i vi?c, l?ch review và m?c cam k?t phù h?p cho 12 tu?n d?u."
        actionLabel="M? ki?m tra tính kh? thi"
        onAction={() => navigate("/feasibility")}
        secondaryActionLabel="Quay l?i vi?t m?c tiêu"
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
      if (!draft.goalType || !draft.vision12Week.trim()) return "Làm rõ k?t qu? 12 tu?n tru?c.";
      return milestoneError;
    }

    if (currentStep === 1) {
      if (draft.leadIndicators.length < 2 || draft.leadIndicators.length > 4) {
        return "Gi? t? 2 d?n 4 vi?c l?p l?i d? bu?c này g?n và d? gi? nh?p.";
      }
      if (draft.leadIndicators.some((indicator) => !indicator.name.trim())) {
        return "C?n d?t tên cho t?ng vi?c l?p l?i tru?c khi ti?p t?c.";
      }
      return invalidTargetError ?? invalidUnitError;
    }

    if (currentStep === 2) {
      if (!draft.lagMetricName.trim() || !cycleStartDate || !draft.reviewDay) {
        return "Ch?t ch? s? chính, ngày b?t d?u và ngày nhìn l?i.";
      }
      if (!draft.reviewDay || normalizedDraftReviewDay.changed) return "Ch?n ngày nhìn l?i h?p l?.";
      return startDateValidation.error;
    }

    if (!draft.goalType || !draft.vision12Week.trim()) return "Làm rõ k?t qu? 12 tu?n tru?c.";
    if (draft.leadIndicators.length < 2 || draft.leadIndicators.length > 4) {
      return "Gi? t? 2 d?n 4 vi?c l?p l?i d? bu?c này g?n và d? gi? nh?p.";
    }
    if (draft.leadIndicators.some((indicator) => !indicator.name.trim())) {
      return "C?n d?t tên cho t?ng vi?c l?p l?i tru?c khi ti?p t?c.";
    }
    if (!draft.lagMetricName.trim() || !cycleStartDate || !draft.reviewDay) {
      return "Ch?t ch? s? chính, ngày b?t d?u và ngày nhìn l?i.";
    }
    if (!draft.reviewDay || normalizedDraftReviewDay.changed) return "Ch?n ngày nhìn l?i h?p l?.";
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
      toast.success(`Ðã áp d?ng khung "${template.name}".`, {
        description: "B?n v?n có th? s?a m?i vi?c l?p l?i và c?t m?c ngay trong bu?c này.",
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
      toast.info(`Khung "${unlockedTemplate.name}" v?n c?n gói ${unlockedTemplate.requiredPlan}.`);
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

  const handleTemplatePersonalizationChange = <K extends "dailyTimeBudget" | "personalConstraint">(
    key: K,
    value: TwelveWeekSetupDraft[K],
  ) => {
    handleChange(key, value);
    if (selectedTemplate) {
      setTimeout(() => applyTemplate(selectedTemplate, false), 0);
    }
  };

  const handlePreferredDayToggle = (dayIndex: number) => {
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
        (rawCurrentStepValidationError === invalidTargetError || rawCurrentStepValidationError === invalidUnitError)
      ) {
        setCurrentStep(1);
      } else if (
        currentStep !== 2 &&
        (rawCurrentStepValidationError === startDateValidation.error ||
          rawCurrentStepValidationError === "Ch?n ngày nhìn l?i h?p l?.")
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

        try {
          const backendGoal = await createGoal(backendGoalPayload);
          backendGoalId = backendGoal.id;
          saveGoalLink(goalId, backendGoal.id);
        } catch (goalSyncError) {
          console.warn("Backend goal creation failed; keeping local-first 12-week plan.", goalSyncError);
        }

        const backendPlanId = await planSetupActions.syncPlanForGoal({
          localGoalId: goalId,
          backendGoalId: backendGoalId ?? undefined,
          vision: draft.vision12Week.trim(),
          startDate: parseCalendarDate(cycleStartDate)?.toISOString() ?? new Date().toISOString(),
          totalWeeks: 12,
        });

        if (!backendPlanId) {
          console.warn("Backend plan sync did not return a plan id; skipping backend goal plan link.");
          return;
        }

        if (!backendGoalId) {
          return;
        }

        try {
          await updateGoal(backendGoalId, { planId: backendPlanId });
        } catch (linkError) {
          console.warn("Failed to link backend goal to plan.", linkError);
        }
      })();
    }

    toast.success("K? ho?ch 12 tu?n dã s?n sàng.", {
      description: "Vào ngay màn Hôm nay d? b?t d?u tu?n d?u tiên.",
    });

    navigate("/12-week-system");
  };

  return (
    <PageShell maxWidth="lg">
      <div className="space-y-5 sm:space-y-6">
        <UpgradePaywallDialog
          open={isPaywallOpen}
          onOpenChange={setIsPaywallOpen}
          context="template"
          currentPlan={currentPlan}
          recommendedPlan={pendingTemplate?.requiredPlan ?? "PLUS"}
          source="12_week_setup"
          title={paywallReason === "cycle_limit" ? "B?n dã có 1 chu k? dang ch?y" : "M? Plus d? thi?t l?p nhanh hon"}
          description={
            paywallReason === "cycle_limit"
              ? "Nâng c?p Plus d? t?o thêm chu k? 12 tu?n. D? li?u hi?n có v?n du?c gi? nguyên."
              : "Khung này phù h?p v?i ki?u m?c tiêu và m?c s?n sàng c?a b?n. M? Plus d? dùng ngay."
          }
          onCheckoutComplete={handleCheckoutComplete}
        />

        <CoreFlowProgress
          currentStepId="twelve_week_setup"
          onExit={() => navigate("/")}
          className="[&_button]:min-h-10 [&_button]:px-3 [&_button]:py-2"
        />

        {!isVisionPromptDismissed ? (
          <section
            className="rounded-card border border-app-warm-border bg-app-warm-soft p-4 sm:p-5 md:p-6"
            aria-label="T?m nhìn dài h?n"
          >
            <span className="inline-flex min-h-10 items-center rounded-full bg-app-surface px-3 py-2 text-xs font-medium text-app-warm">
              T?m nhìn dài h?n
            </span>
            {aspirationalVision ? (
              <p className="mt-3 font-serif text-lg font-medium leading-7 text-app-warm-strong">
                K? ho?ch 12 tu?n này ph?c v? t?m nhìn 3 nam: {aspirationalVision.summary}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-app-ink-soft">
                  Ð?t m?c tiêu 12 tu?n. Phuong pháp g?c khuyên g?n v?i t?m nhìn 3 nam.
                </p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    to="/vision"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-app-warm px-3.5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-warm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
                  >
                    Ði?n 2 phút ?
                  </Link>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg px-3.5 py-3 text-sm font-medium text-app-ink-muted transition-colors duration-150 hover:bg-app-surface hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
                    onClick={() => setIsVisionPromptDismissed(true)}
                  >
                    B? qua
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : null}

        <section aria-labelledby="twelve-week-setup-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
            {getLifeAreaLabel(focusArea)} · Thi?t l?p k? ho?ch 12 tu?n
          </p>
          <h1
            id="twelve-week-setup-title"
            className="mt-3 max-w-3xl font-serif text-3xl font-medium leading-tight tracking-tight text-app-ink sm:text-4xl"
          >
            T?o k? ho?ch 12 tu?n cho {smartGoal.specific.trim() || "m?c tiêu c?a b?n"}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft">
            B?n dang ? bu?c t?ng “K? ho?ch 12 tu?n”. Bên du?i là wizard 4 bu?c nh? d? thi?t l?p: k?t qu?, vi?c l?p l?i, l?ch nhìn l?i và rà soát.
          </p>
          <div className="mt-4 surface-raised rounded-xl border border-app-line bg-app-surface p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-app-ink-muted">M?c tiêu hi?n t?i</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-app-ink">
              {smartGoal.specific.trim()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-app-ink-muted">
              <span className="rounded-full bg-app-accent-soft px-2.5 py-1 font-medium text-app-accent">
                S?n sàng {feasibility.adjustedScore}/20
              </span>
              {feasibility.bottleneck ? (
                <span className="rounded-full border border-app-line bg-app-bg px-2.5 py-1">
                  C?n chú ý: {feasibility.bottleneck.label}
                </span>
              ) : null}
              <Link
                to="/smart-goal-setup"
                className="inline-flex min-h-10 items-center rounded-full border border-app-line bg-app-surface px-3 py-2 font-medium text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                S?a m?c tiêu
              </Link>
            </div>
          </div>
        </section>

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
        >
          {currentStep === 0 && (
            <OutcomeStepLab
              feasibility={feasibility}
              draft={draft}
              currentPlan={currentPlan}
              smartGoal={smartGoal}
              selectedTemplate={selectedTemplate}
              recommendedTemplate={recommendedTemplate}
              adaptiveTemplateRecommendation={adaptiveTemplateRecommendation}
              recommendedTemplateSupport={recommendedTemplateSupport}
              onChange={handleChange}
              onTemplateSelect={handleTemplateSelect}
              onTemplatePersonalizationChange={handleTemplatePersonalizationChange}
              onPreferredDayToggle={handlePreferredDayToggle}
            />
          )}

          {currentStep === 1 && (
            <LeadIndicatorsStepLab
              draft={draft}
              showValidationErrors={Boolean(attemptedStepIndexes[1])}
              coreCount={coreCount}
              optionalCount={optionalCount}
              setupGuideSupport={setupGuideSupport}
              setupGuideTemplate={setupGuideTemplate}
              selectedTemplate={selectedTemplate}
              weekOneTaskPreview={weekOneTaskPreview}
              weekOneTaskWarning={weekOneTaskWarning}
              weekOneTaskGroups={previewTaskGroups}
              onAddIndicator={handleAddIndicator}
              onRemoveIndicator={handleRemoveIndicator}
              onIndicatorChange={handleIndicatorChange}
            />
          )}

          {currentStep === 2 && (
            <ScheduleStepLab
              draft={draft}
              cycleStartDate={cycleStartDate}
              cycleEndDate={cycleEndDate}
              setupGuideSupport={setupGuideSupport}
              setupGuideTemplate={setupGuideTemplate}
              hasPreviewTasks={previewTasks.length > 0}
              weekOneTaskPreview={weekOneTaskPreview}
              weekOneTaskWarning={weekOneTaskWarning}
              onChange={handleChange}
            />
          )}

          {currentStep === 3 && isRealMode() && !auth.user ? (
            <RealModeLoginGate target="12WeekSetup" />
          ) : null}

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
    </PageShell>
  );
}
