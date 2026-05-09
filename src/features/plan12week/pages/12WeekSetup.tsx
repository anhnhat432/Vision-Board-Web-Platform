import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Compass, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";

import { CoreFlowGateState } from '@/app/components/CoreFlowGateState';
import { CoreFlowProgress } from '@/app/components/CoreFlowProgress';
import { PageShell } from '@/app/components/PageShell';
import { UpgradePaywallDialog } from '@/app/components/UpgradePaywallDialog';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { trackAnalyticsEvent } from '@/app/utils/analytics';
import {
  APP_STORAGE_KEYS,
  type PricingPlanCode,
  addGoal,
  clearGoalPlanningDrafts,
  formatDateInputValue,
  getCurrentPlan,
  getLifeAreaLabel,
  getUserData,
  parseCalendarDate,
  trackAppEvent,
} from '@/app/utils/storage';
import { getScoredLifeArea, hasRealLifeBalance } from '@/app/utils/core-flow-guard';
import {
  trackPaywallCtaClicked,
  trackPremiumTemplateUnlockPrompted,
  trackTemplateApplied,
} from '@/app/utils/monetization-analytics';
import {
  TWELVE_WEEK_TEMPLATE_CATALOG,
  buildAdaptiveTemplateRecommendation,
  buildAdaptiveTemplateSupport,
  planSatisfiesRequirement,
  type TwelveWeekTemplateDefinition,
} from '@/app/utils/twelve-week-premium';
import { parsePendingSMARTGoal, parseSmartGoal, type PendingSMARTGoal } from "@/lib/smart-goal";
import { getWeeklyTaskWarning } from "@/features/plan12week/logic";
import { usePlanSetupSync } from "@/features/plan12week/hooks";
import { enqueuePlanSnapshotUpdatedMutation } from "@/features/plan12week/persistence/planSnapshotMutation";
import { enqueueLeadMetricUpsertedMutations } from "@/features/plan12week/persistence/leadMetricMutation";
import { createGoal, updateGoal } from "@/services/goalService";
import { saveGoalLink } from "@/lib/api/goalLinkStore";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { isDemoMode } from '@/app/utils/app-mode';
import { STEPS } from "./12WeekSetup/constants";
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
  getPreviewTasks,
  getPreviewTasksByIndicator,
  isPendingFeasibilityResult,
} from "./12WeekSetup/helpers";
import type { LeadIndicatorDraft, PendingFeasibilityResult, TwelveWeekSetupDraft } from "./12WeekSetup/types";
import { SetupStepShell } from "./12WeekSetup/components/SetupStepShell";
import { OutcomeStep } from "./12WeekSetup/components/OutcomeStep";
import { LeadIndicatorsStep } from "./12WeekSetup/components/LeadIndicatorsStep";
import { ScheduleStep } from "./12WeekSetup/components/ScheduleStep";
import { PlanPreviewStep } from "@/features/plan12week/components/PlanPreviewStep";

type TwelveWeekSetupGate = "none" | "needs_life_balance" | "needs_life_insight" | "needs_smart_goal" | "needs_feasibility";

export function TwelveWeekSetup() {
  const navigate = useNavigate();
  const { actions: planSetupActions } = usePlanSetupSync();
  const auth = useAuthContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [setupGate, setSetupGate] = useState<TwelveWeekSetupGate>("none");
  const [currentPlan, setCurrentPlan] = useState<PricingPlanCode>(getCurrentPlan());
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState("");
  const [smartGoal, setSmartGoal] = useState<PendingSMARTGoal | null>(null);
  const [feasibility, setFeasibility] = useState<PendingFeasibilityResult | null>(null);
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
    const data = getUserData();
    if (!hasRealLifeBalance(data)) {
      setSetupGate("needs_life_balance");
      setIsLoading(false);
      return;
    }

    const selectedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const pendingSmartGoal = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    const pendingFeasibilityResult = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult);

    if (!selectedFocusArea) {
      setSetupGate("needs_life_insight");
      setIsLoading(false);
      return;
    }

    if (!pendingSmartGoal) {
      setSetupGate("needs_smart_goal");
      setIsLoading(false);
      return;
    }

    if (!pendingFeasibilityResult) {
      setSetupGate("needs_feasibility");
      setIsLoading(false);
      return;
    }

    let parsedSmartGoalValue: unknown;
    try {
      parsedSmartGoalValue = JSON.parse(pendingSmartGoal);
    } catch {
      setSetupGate("needs_smart_goal");
      setIsLoading(false);
      return;
    }

    const normalizedSmartGoal = parseSmartGoal(parsedSmartGoalValue, selectedFocusArea);
    if (normalizedSmartGoal) {
      localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, JSON.stringify(normalizedSmartGoal));
    }

    const parsedSmartGoal = parsePendingSMARTGoal(normalizedSmartGoal ?? parsedSmartGoalValue, selectedFocusArea);
    if (!parsedSmartGoal) {
      setSetupGate("needs_smart_goal");
      setIsLoading(false);
      return;
    }

    let parsedFeasibility: unknown;
    try {
      parsedFeasibility = JSON.parse(pendingFeasibilityResult);
    } catch {
      setSetupGate("needs_feasibility");
      setIsLoading(false);
      return;
    }

    if (!isPendingFeasibilityResult(parsedFeasibility)) {
      setSetupGate("needs_feasibility");
      setIsLoading(false);
      return;
    }

    if (!getScoredLifeArea(data, selectedFocusArea)) {
      setSetupGate("needs_life_insight");
      setIsLoading(false);
      return;
    }

    const savedDraft = localStorage.getItem(APP_STORAGE_KEYS.pending12WeekSetupDraft);
    const feasibilityDefaults = getFeasibilityDraftDefaults(parsedFeasibility);
    const setupPlan = getCurrentPlan();
    setFocusArea(selectedFocusArea);
    setSmartGoal(parsedSmartGoal);
    setFeasibility(parsedFeasibility);
    setCurrentPlan(setupPlan);

    setDraft((previousDraft) => {
      const baseDraft = {
        ...previousDraft,
        vision12Week:
          previousDraft.vision12Week ||
          `Trong 12 tuần tới, tôi muốn biến mục tiêu "${parsedSmartGoal.specific}" thành một nhịp thực thi rõ ràng.`,
        week12Outcome: previousDraft.week12Outcome || parsedSmartGoal.measurable || parsedSmartGoal.specific,
        lagMetricName: previousDraft.lagMetricName || parsedSmartGoal.measurable || "Chỉ số kết quả chính",
        tacticLoadPreference:
          previousDraft.tacticLoadPreference === "balanced"
            ? feasibilityDefaults.tacticLoadPreference
            : previousDraft.tacticLoadPreference,
        dailyTimeBudget: previousDraft.dailyTimeBudget || feasibilityDefaults.dailyTimeBudget,
        personalConstraint: previousDraft.personalConstraint || feasibilityDefaults.personalConstraint,
      };

      if (!savedDraft) return baseDraft;

      try {
        const parsedDraft = JSON.parse(savedDraft) as Partial<TwelveWeekSetupDraft>;
        return {
          ...baseDraft,
          ...parsedDraft,
          templateId: parsedDraft.templateId ?? "",
          tacticLoadPreference:
            parsedDraft.tacticLoadPreference === "lighter" || parsedDraft.tacticLoadPreference === "push"
              ? parsedDraft.tacticLoadPreference
              : "balanced",
          dailyTimeBudget: parsedDraft.dailyTimeBudget ?? "",
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
                }))
              : baseDraft.leadIndicators,
        };
      } catch {
        return baseDraft;
      }
    });

    if (!savedDraft) {
      trackAnalyticsEvent(
        "twelve_week_setup_started",
        {
          source: "12_week_setup",
          current_plan: setupPlan,
          entry_mode: "smart_goal_handoff",
          template_tier: "none",
          has_saved_draft: false,
        },
        {
          legacyEventName: "12_week_setup_started",
          legacyPayload: {
            focusArea: selectedFocusArea,
            readinessScore: String(parsedFeasibility.adjustedScore),
          },
        },
      );
    }

    setIsLoading(false);
  }, []);

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

  const handleJumpToStep = useCallback((stepIndex: number) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  }, [currentStep]);

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
      ? "Làm rõ kết quả bạn muốn chạm tới sau 12 tuần."
      : currentStep === 1
        ? "Chọn 2-4 việc bạn kiểm soát được và lặp lại được mỗi tuần."
        : currentStep === 2
          ? "Chốt ngày bắt đầu, ngày nhìn lại và chỉ số kết quả."
          : "Xem trước kế hoạch tự động, chỉnh sửa nếu cần và xác nhận.";
  const currentStepWhy =
    currentStep === 0
      ? "Kết quả rõ giúp biết khi nào về đích — và tránh đổi đích giữa chu kỳ vì cảm xúc."
      : currentStep === 1
        ? "Việc lặp lại là phần bạn kiểm soát được. Đo việc, không đo kết quả — kết quả tự đến khi việc đều."
        : currentStep === 2
          ? "Lịch và buổi nhìn lại cố định giúp duy trì khi động lực giảm — quan trọng hơn nội dung từng tuần."
          : "Kế hoạch được tạo tự động từ mục tiêu và việc lặp lại. Bạn có thể xem trước tuần 1 với lịch cụ thể và chỉnh sửa trước khi xác nhận.";

  if (isLoading) {
    return (
      <CoreFlowGateState
        currentStepId="twelve_week_setup"
        eyebrow="Thiết lập 12 tuần"
        title="Đang chuẩn bị dữ liệu thiết lập 12 tuần"
        description="Đang lấy lại mục tiêu, kết quả kiểm tra và bản nháp gần nhất."
        loading
      />
    );
  }

  if (setupGate === "needs_life_balance") {
    return (
      <CoreFlowGateState
        currentStepId="life_balance"
        eyebrow="Thiết lập 12 tuần"
        title="Hoàn thành Life Balance trước khi tạo kế hoạch 12 tuần"
        description="Kế hoạch 12 tuần cần điểm cân bằng thật để biết mục tiêu đang gắn với lĩnh vực nào. Hãy bắt đầu từ đánh giá cân bằng rồi quay lại flow chính."
        actionLabel="Bắt đầu Life Balance"
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
        description="Bạn cần một trọng tâm hợp lệ từ Life Insight để kế hoạch 12 tuần không bị quá rộng hoặc lệch khỏi dữ liệu cân bằng."
        actionLabel="Mở Life Insight"
        onAction={() => navigate("/life-insight")}
        secondaryActionLabel="Bắt đầu Life Balance"
        onSecondaryAction={() => navigate("/onboarding")}
      />
    );
  }

  if (setupGate === "needs_smart_goal") {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Thiết lập 12 tuần"
        title="Viết SMART Goal trước khi tạo kế hoạch 12 tuần"
        description="Kế hoạch cần mục tiêu đủ rõ về kết quả, chỉ số và thời hạn. Hoàn thiện SMART Goal trước, sau đó kiểm tra tính khả thi và quay lại thiết lập."
        actionLabel="Quay lại viết mục tiêu"
        onAction={() => navigate("/smart-goal-setup")}
        secondaryActionLabel="Mở Life Insight"
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
      toast.success(`Đã áp dụng khung "${template.name}".`, {
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
      toast.info(`Khung "${unlockedTemplate.name}" vẫn cần gói ${unlockedTemplate.requiredPlan}.`);
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
    const invalidTargetError = draft.leadIndicators
      .map((indicator, index) => getLeadIndicatorTargetValidationError(indicator, index))
      .find((error): error is string => error !== null);

    if (currentStep >= 1 && invalidTargetError) {
      toast.error(invalidTargetError);
      if (currentStep !== 1) setCurrentStep(1);
      return false;
    }

    if (currentStep === 0 && (!draft.goalType || !draft.vision12Week.trim() || !draft.week12Outcome.trim())) {
      toast.error("Làm rõ kết quả 12 tuần trước.");
      return false;
    }

    if (currentStep === 1 && (validIndicators.length < 2 || validIndicators.length > 4)) {
      toast.error("Giữ từ 2 đến 4 việc lặp lại để bước này gọn và dễ giữ nhịp.");
      return false;
    }

    if (currentStep === 2 && (!draft.lagMetricName.trim() || !draft.startDate || !draft.reviewDay)) {
      toast.error("Chốt chỉ số chính, ngày bắt đầu và ngày nhìn lại.");
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
    if (!validateCurrentStep() || validIndicators.length < 2 || validIndicators.length > 4) {
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
          unit: indicator.unit.trim() || "lần/tuần",
          type: indicator.type,
          schedule: indicator.schedule,
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
          startDate: new Date(cycleStartDate).toISOString(),
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

    toast.success("Kế hoạch 12 tuần đã sẵn sàng.", {
      description: "Kế hoạch được lưu trên trình duyệt này. Vào ngay màn Hôm nay để bắt đầu tuần đầu tiên.",
    });

    navigate("/12-week-system");
  };

  return (
    <PageShell maxWidth="hero" className="space-y-6 sm:space-y-8 page-enter">
      <UpgradePaywallDialog
        open={isPaywallOpen}
        onOpenChange={setIsPaywallOpen}
        context="template"
        currentPlan={currentPlan}
        recommendedPlan={pendingTemplate?.requiredPlan ?? "PLUS"}
        source="12_week_setup"
        title="Mở Plus để thiết lập nhanh hơn"
        description="Khung này phù hợp với kiểu mục tiêu và mức sẵn sàng của bạn. Mở Plus để dùng ngay."
        onCheckoutComplete={handleCheckoutComplete}
      />

      <CoreFlowProgress currentStepId="twelve_week_setup" onExit={() => navigate("/")} />

      <Card className="hero-surface overflow-hidden border-0 text-white glass-surface-gradient-border ambient-glow">
        <CardContent className="relative p-5 sm:p-6 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_22%)] opacity-90" />
          <div className="relative max-w-4xl">
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Compass className="h-4 w-4" />
                Thiết lập 12 tuần
              </div>
              <div className="space-y-4">
                <h1 className="gradient-text max-w-3xl text-2xl font-bold tracking-normal sm:text-4xl lg:text-5xl">
                  Chốt chu kỳ 12 tuần gọn, rõ và vào việc ngay.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/82 sm:text-base lg:text-lg">
                  Sau bước này bạn có kết quả rõ, 2-4 việc lặp lại có lịch, và tuần 1 đủ nhẹ để bắt đầu.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  <Target className="mr-1 h-3.5 w-3.5" />
                  Ưu tiên: {getLifeAreaLabel(focusArea)}
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Sẵn sàng: {feasibility.adjustedScore}/20
                </Badge>
                {feasibility.bottleneck && (
                  <Badge
                    variant="outline"
                    className="hidden rounded-full border-white/18 bg-white/12 px-4 py-2 text-white sm:inline-flex"
                  >
                    Cần chú ý: {feasibility.bottleneck.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SetupStepShell
        title={STEPS[currentStep].title}
        description={currentStepDescription}
        whyThisMatters={currentStepWhy}
        currentStep={currentStep}
        stepCount={STEPS.length}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={handleSubmit}
        onJumpToStep={handleJumpToStep}
      >
        {currentStep === 0 && (
          <OutcomeStep
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
          <LeadIndicatorsStep
            draft={draft}
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
          <ScheduleStep
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

        {currentStep === 3 && (
          <PlanPreviewStep
            draft={draft}
            smartGoal={smartGoal}
            feasibility={feasibility}
            focusArea={focusArea}
            selectedTemplate={selectedTemplate}
            onBack={handleBack}
            onSubmit={handleSubmit}
            onChange={handleChange}
          />
        )}
      </SetupStepShell>
    </PageShell>
  );
}
