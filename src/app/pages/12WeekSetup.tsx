import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  Flag,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  APP_STORAGE_KEYS,
  type PricingPlanCode,
  type TacticType,
  addGoal,
  clearGoalPlanningDrafts,
  formatDateInputValue,
  getCurrentPlan,
  getLifeAreaLabel,
  parseCalendarDate,
  trackAppEvent,
} from "../utils/storage";
import {
  trackPaywallCtaClicked,
  trackPremiumTemplateUnlockPrompted,
  trackTemplateApplied,
} from "../utils/monetization-analytics";
import {
  TWELVE_WEEK_TEMPLATE_CATALOG,
  buildAdaptiveTemplateRecommendation,
  buildAdaptiveTemplateSupport,
  getPlanLabel,
  planSatisfiesRequirement,
  type TwelveWeekTemplateDefinition,
} from "../utils/twelve-week-premium";
import {
  parsePendingSMARTGoal,
  parseSmartGoal,
  type PendingSMARTGoal,
} from "@/lib/smart-goal";
import { getWeeklyTaskWarning } from "@/features/plan12week/logic";
import { usePlanSetupSync } from "@/features/plan12week/hooks";

type ResultType = "realistic" | "challenging" | "too_ambitious";

interface PendingFeasibilityResult {
  resultType: ResultType;
  resultTitle: string;
  resultSummary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
}

interface LeadIndicatorDraft {
  id: string;
  name: string;
  target: string;
  unit: string;
  type: TacticType;
  cadence: "spread" | "frontload" | "backload";
}

interface TwelveWeekSetupDraft {
  templateId: string;
  goalType: string;
  vision12Week: string;
  week12Outcome: string;
  lagMetricName: string;
  lagMetricTarget: string;
  lagMetricUnit: string;
  leadIndicators: LeadIndicatorDraft[];
  startDate: string;
  reviewDay: string;
  tacticLoadPreference: "balanced" | "lighter" | "push";
  week4Milestone: string;
  week8Milestone: string;
  successEvidence: string;
  dailyTimeBudget: string;
  preferredDays: number[];
  personalConstraint: "time" | "motivation" | "consistency" | "complexity" | "";
}

const STEPS = [
  { id: "outcome", label: "Mục tiêu", title: "Mục tiêu 12 tuần" },
  { id: "tactics", label: "Tactic", title: "2-4 tactic giữ nhịp" },
  { id: "week1", label: "Tuần 1", title: "Tuần đầu tiên và lịch review" },
  { id: "finish", label: "Chốt", title: "Chốt hệ thống" },
] as const;

const GOAL_TYPES = [
  { value: "Skill Learning", label: "Học kỹ năng" },
  { value: "Habit Building", label: "Xây thói quen" },
  { value: "Fitness / Health", label: "Sức khỏe" },
  { value: "Exam / Study", label: "Thi cử / học tập" },
  { value: "Career / Job Search", label: "Sự nghiệp / tìm việc" },
  { value: "Finance / Saving", label: "Tài chính / tiết kiệm" },
  { value: "Project Completion", label: "Hoàn thành dự án" },
  { value: "Personal Growth", label: "Phát triển bản thân" },
  { value: "Other", label: "Khác" },
] as const;

const REVIEW_DAYS = [
  { value: "Monday", label: "Thứ Hai" },
  { value: "Tuesday", label: "Thứ Ba" },
  { value: "Wednesday", label: "Thứ Tư" },
  { value: "Thursday", label: "Thứ Năm" },
  { value: "Friday", label: "Thứ Sáu" },
  { value: "Saturday", label: "Thứ Bảy" },
  { value: "Sunday", label: "Chủ Nhật" },
] as const;

const LOAD_PREFERENCE_OPTIONS = [
  { value: "balanced", label: "Cân bằng" },
  { value: "lighter", label: "Nhẹ hơn" },
  { value: "push", label: "Đẩy mạnh" },
] as const;

function getLoadPreferenceLabel(value: TwelveWeekSetupDraft["tacticLoadPreference"]): string {
  return LOAD_PREFERENCE_OPTIONS.find((option) => option.value === value)?.label ?? "Cân bằng";
}

function isPendingFeasibilityResult(value: unknown): value is PendingFeasibilityResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;

  return (
    (result.resultType === "realistic" ||
      result.resultType === "challenging" ||
      result.resultType === "too_ambitious") &&
    typeof result.resultTitle === "string" &&
    typeof result.resultSummary === "string" &&
    typeof result.recommendation === "string" &&
    typeof result.readinessScore === "number" &&
    typeof result.adjustedScore === "number" &&
    typeof result.wheelScore === "number"
  );
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function createIndicatorId(): string {
  return `indicator_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createIndicatorDraft(type: TacticType = "core"): LeadIndicatorDraft {
  return {
    id: createIndicatorId(),
    name: "",
    target: type === "core" ? "2" : "1",
    unit: "lần/tuần",
    type,
    cadence: "spread",
  };
}

function buildScheduleOffsets(target: string, cadence: LeadIndicatorDraft["cadence"]): number[] {
  const parsedTarget = Number.parseInt(target, 10);
  const frequency = Number.isFinite(parsedTarget) && parsedTarget > 0 ? Math.min(parsedTarget, 7) : 1;

  if (cadence === "frontload") {
    return Array.from({ length: frequency }, (_, index) => Math.min(index, 6));
  }

  if (cadence === "backload") {
    return Array.from({ length: frequency }, (_, index) => Math.max(0, 7 - frequency + index));
  }

  switch (frequency) {
    case 1:
      return [1];
    case 2:
      return [1, 4];
    case 3:
      return [1, 3, 5];
    case 4:
      return [0, 2, 4, 6];
    case 5:
      return [0, 1, 2, 4, 6];
    case 6:
      return [0, 1, 2, 3, 4, 6];
    default:
      return [0, 1, 2, 3, 4, 5, 6];
  }
}

function getCycleWeekStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const delta = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - delta);
  return start;
}

function buildWeeklyPlans(
  week12Outcome: string,
  week4Milestone: string,
  week8Milestone: string,
  focusOverrides?: string[],
) {
  return Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    const phaseName = weekNumber <= 4 ? "Foundation" : weekNumber <= 8 ? "Build / Acceleration" : "Finish / Execution";

    return {
      weekNumber,
      phaseName,
      focus:
        focusOverrides?.[index] ??
        (weekNumber <= 4
          ? "Giữ nhịp tactic cốt lõi thật đều."
          : weekNumber <= 8
            ? "Tăng tốc điều đang hiệu quả và tạo đầu ra thật."
            : "Về đích gọn, ưu tiên ít nhưng rõ."),
      milestone:
        weekNumber === 4
          ? week4Milestone
          : weekNumber === 8
            ? week8Milestone
            : weekNumber === 12
              ? week12Outcome
              : "",
      completed: false,
    };
  });
}

function buildScoreboard() {
  return Array.from({ length: 12 }, (_, index) => ({
    weekNumber: index + 1,
    leadCompletionPercent: 0,
    mainMetricProgress: "",
    outputDone: "",
    reviewDone: false,
    weeklyScore: 0,
  }));
}

function getPreviewTasks(indicators: LeadIndicatorDraft[]): string[] {
  return indicators
    .filter((indicator) => indicator.name.trim())
    .flatMap((indicator) => {
      const parsedTarget = Number.parseInt(indicator.target, 10);
      const count = Number.isFinite(parsedTarget) && parsedTarget > 0 ? Math.min(parsedTarget, 3) : 1;

      return Array.from({ length: count }, (_, index) =>
        count === 1 ? indicator.name.trim() : `${indicator.name.trim()} ${index + 1}`,
      );
    })
    .slice(0, 6);
}

export function TwelveWeekSetup() {
  const navigate = useNavigate();
  const { actions: planSetupActions } = usePlanSetupSync();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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
    const selectedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const pendingSmartGoal = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    const pendingFeasibilityResult = localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult);

    if (!selectedFocusArea || !pendingSmartGoal || !pendingFeasibilityResult) {
      toast.info("Bạn cần hoàn thành SMART goal và feasibility trước khi vào hệ 12 tuần.");
      navigate("/smart-goal-setup");
      return;
    }

    try {
      const parsedSmartGoalValue = JSON.parse(pendingSmartGoal);
      const normalizedSmartGoal = parseSmartGoal(parsedSmartGoalValue, selectedFocusArea);
      if (normalizedSmartGoal) {
        localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, JSON.stringify(normalizedSmartGoal));
      }

      const parsedSmartGoal = parsePendingSMARTGoal(
        normalizedSmartGoal ?? parsedSmartGoalValue,
        selectedFocusArea,
      );
      const parsedFeasibility = JSON.parse(pendingFeasibilityResult);
      const savedDraft = localStorage.getItem(APP_STORAGE_KEYS.pending12WeekSetupDraft);

      if (!parsedSmartGoal || !isPendingFeasibilityResult(parsedFeasibility)) {
        throw new Error("invalid-draft");
      }

      setFocusArea(selectedFocusArea);
      setSmartGoal(parsedSmartGoal);
      setFeasibility(parsedFeasibility);
      setCurrentPlan(getCurrentPlan());

      setDraft((previousDraft) => {
        const baseDraft = {
          ...previousDraft,
          vision12Week:
            previousDraft.vision12Week ||
            `Trong 12 tuần tới, tôi muốn biến mục tiêu "${parsedSmartGoal.specific}" thành một nhịp thực thi rõ ràng.`,
          week12Outcome: previousDraft.week12Outcome || parsedSmartGoal.measurable || parsedSmartGoal.specific,
          lagMetricName: previousDraft.lagMetricName || parsedSmartGoal.measurable || "Chỉ số kết quả chính",
        };

        if (!savedDraft) return baseDraft;

        try {
          const parsedDraft = JSON.parse(savedDraft) as Partial<TwelveWeekSetupDraft>;
          return {
            ...baseDraft,
            ...parsedDraft,
            templateId: parsedDraft.templateId ?? "",
            tacticLoadPreference:
              parsedDraft.tacticLoadPreference === "lighter" ||
              parsedDraft.tacticLoadPreference === "push"
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
        trackAppEvent("12_week_setup_started", undefined, {
          focusArea: selectedFocusArea,
          readinessScore: String(parsedFeasibility.adjustedScore),
        });
      }
    } catch {
      toast.info("Dữ liệu tạm thời chưa hợp lệ. Mình sẽ đưa bạn quay lại bước trước.");
      navigate("/smart-goal-setup");
      return;
    }

    setIsLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem(APP_STORAGE_KEYS.pending12WeekSetupDraft, JSON.stringify(draft));
  }, [draft, isLoading]);

  const validIndicators = useMemo(
    () => draft.leadIndicators.filter((indicator) => indicator.name.trim().length > 0),
    [draft.leadIndicators],
  );
  const selectedTemplate =
    TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => template.id === draft.templateId) ?? null;
  const pendingTemplate =
    TWELVE_WEEK_TEMPLATE_CATALOG.find((template) => template.id === pendingTemplateId) ?? null;
  const adaptiveTemplateRecommendation = useMemo(() => {
    if (!smartGoal || !feasibility) return null;

    return buildAdaptiveTemplateRecommendation({
      readinessScore: feasibility.adjustedScore,
      goalStatement: smartGoal.specific,
      measurableText: smartGoal.measurable,
    });
  }, [smartGoal, feasibility]);
  const recommendedTemplate =
    TWELVE_WEEK_TEMPLATE_CATALOG.find(
      (template) => template.id === adaptiveTemplateRecommendation?.templateId,
    ) ?? null;
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
  const previewTasks = useMemo(() => getPreviewTasks(validIndicators), [validIndicators]);
  const progressValue = ((currentStep + 1) / STEPS.length) * 100;
  const cycleStartDate = useMemo(() => {
    const parsedStartDate = parseCalendarDate(draft.startDate) ?? new Date();
    return formatDateInputValue(getCycleWeekStart(parsedStartDate));
  }, [draft.startDate]);
  const cycleEndDate = useMemo(() => {
    const parsedStartDate = parseCalendarDate(cycleStartDate) ?? new Date();
    return formatDateInputValue(addDays(parsedStartDate, 83));
  }, [cycleStartDate]);

  if (isLoading || !smartGoal || !feasibility) return null;

  const coreCount = validIndicators.filter((indicator) => indicator.type !== "optional").length;
  const optionalCount = validIndicators.filter((indicator) => indicator.type === "optional").length;
  const weekOneTaskPreview =
    previewTasks.length > 0
      ? previewTasks
      : setupGuideSupport?.personalizedTactics.map((tactic) => tactic.name).slice(0, 4) ?? [];
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
          ? "lighter" as const
          : previousDraft.personalConstraint === "motivation"
            ? "balanced" as const
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
          adaptiveTemplateSupport?.recommendedLoadPreference ?? previousDraft.tacticLoadPreference,
        week4Milestone:
          adaptiveTemplateSupport?.week4MilestoneSuggestion ?? template.week4Milestone,
        week8Milestone:
          adaptiveTemplateSupport?.week8MilestoneSuggestion ?? template.week8Milestone,
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
        description: "Bạn vẫn có thể sửa mọi tactic và cột mốc ngay trong flow này.",
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

  const handleChange = <K extends keyof TwelveWeekSetupDraft>(
    key: K,
    value: TwelveWeekSetupDraft[K],
  ) => {
    setDraft((previousDraft) => ({
      ...previousDraft,
      [key]: value,
    }) as TwelveWeekSetupDraft);
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
    if (currentStep === 0 && (!draft.goalType || !draft.vision12Week.trim() || !draft.week12Outcome.trim())) {
      toast.error("Hãy làm rõ outcome 12 tuần trước.");
      return false;
    }

    if (currentStep === 1 && (validIndicators.length < 2 || validIndicators.length > 4)) {
      toast.error("Giữ từ 2 đến 4 tactic để flow gọn và dễ giữ nhịp.");
      return false;
    }

    if (currentStep === 2 && (!draft.lagMetricName.trim() || !draft.startDate || !draft.reviewDay)) {
      toast.error("Hãy chốt chỉ số chính, ngày bắt đầu và ngày review.");
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStep === 0 && draft.templateId && (draft.dailyTimeBudget || draft.preferredDays.length > 0 || draft.personalConstraint)) {
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
        templateId: selectedTemplate?.id,
        templateName: selectedTemplate?.name,
        lagMetric: {
          name: draft.lagMetricName.trim(),
          unit: draft.lagMetricUnit.trim(),
          target: draft.lagMetricTarget.trim(),
          currentValue: "",
        },
        leadIndicators: validIndicators.map((indicator) => ({
          id: indicator.id,
          name: indicator.name.trim(),
          target: indicator.target.trim() || "1",
          unit: indicator.unit.trim() || "lần/tuần",
          type: indicator.type,
          schedule: buildScheduleOffsets(indicator.target, indicator.cadence),
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
    trackAppEvent("12_week_plan_created", goalId, {
      reviewDay: draft.reviewDay,
      coreTactics: String(coreCount),
      optionalTactics: String(optionalCount),
      templateId: selectedTemplate?.id ?? "custom",
      plan: currentPlan,
      dailyTimeBudget: draft.dailyTimeBudget || "none",
      preferredDaysCount: String(draft.preferredDays.length),
      personalConstraint: draft.personalConstraint || "none",
    });
    clearGoalPlanningDrafts();

    await planSetupActions.syncPlanForGoal({
      goalId,
      vision: draft.vision12Week.trim(),
      startDate: new Date(cycleStartDate).toISOString(),
      totalWeeks: 12,
    });

    toast.success("Hệ 12 tuần đã sẵn sàng.", {
      description: "Bạn có thể vào ngay màn Hôm nay để bắt đầu tuần đầu tiên.",
    });

    navigate("/12-week-system");
  };

  return (
    <div className="space-y-8 pb-12">
      <UpgradePaywallDialog
        open={isPaywallOpen}
        onOpenChange={setIsPaywallOpen}
        context="template"
        currentPlan={currentPlan}
        recommendedPlan={pendingTemplate?.requiredPlan ?? "PLUS"}
        source="12_week_setup"
        title="Mở Plus để setup nhanh hơn"
        description="Bạn đang chọn một khung Plus. Mở Plus để đi vào ngay một cách vận hành phù hợp hơn với kiểu mục tiêu và mức sẵn sàng của bạn."
        onCheckoutComplete={handleCheckoutComplete}
      />

      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="relative p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_22%)] opacity-90" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_360px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Compass className="h-4 w-4" />
                Thiết lập 12 tuần
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                  Chốt một chu kỳ 12 tuần gọn, rõ và vào việc ngay.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                  Bạn sẽ rời khỏi màn này với một outcome rõ, 2-4 tactic có lịch thực thi, và một tuần đầu tiên đủ nhẹ để bắt đầu ngay.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  <Target className="mr-1 h-3.5 w-3.5" />
                  Ưu tiên: {getLifeAreaLabel(focusArea)}
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Độ sẵn sàng: {feasibility.adjustedScore}/20
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  Gói: {getPlanLabel(currentPlan)}
                </Badge>
              </div>
            </div>
            <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
              <div className="flex items-center justify-between text-sm text-white/72">
                <span>Bước {currentStep + 1} / {STEPS.length}</span>
                <span>{Math.round(progressValue)}%</span>
              </div>
              <Progress value={progressValue} className="mt-3 h-2.5 bg-white/20" aria-label={`Tiến độ thiết lập: ${Math.round(progressValue)}%`} />
              <ol className="mt-6 space-y-3" aria-label="Các bước thiết lập">
                {STEPS.map((step, index) => {
                  const active = index === currentStep;
                  const done = index < currentStep;

                  return (
                    <li
                      key={step.id}
                      aria-current={active ? "step" : undefined}
                      className={`rounded-[22px] border px-4 py-3 transition-all ${
                        active
                          ? "border-white/22 bg-white/14"
                          : done
                            ? "border-white/10 bg-black/10"
                            : "border-white/8 bg-black/6"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          aria-hidden="true"
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                            active
                              ? "hero-cta bg-white text-slate-900"
                              : done
                                ? "bg-white/18 text-white"
                                : "bg-white/8 text-white/60"
                          }`}
                        >
                          {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{step.label}</p>
                          <p className="text-xs text-white/62">{step.title}</p>
                          <span className="sr-only">{done ? "— đã hoàn thành" : active ? "— đang thực hiện" : "— chưa bắt đầu"}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep].title}</CardTitle>
            <CardDescription>
              {currentStep === 0 && "Làm rõ điều bạn muốn chạm tới sau 12 tuần."}
              {currentStep === 1 && "Chỉ giữ vài tactic có thể lặp lại gần như mỗi tuần."}
              {currentStep === 2 && "Chốt ngày bắt đầu, ngày review và hình dung tuần đầu."}
              {currentStep === 3 && "Kiểm tra lần cuối, còn phần nâng cao thì để tùy chọn."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 0 && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <div className="space-y-3 rounded-[28px] border border-white/70 bg-white/72 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Bắt đầu nhanh bằng khung gợi ý</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Thay vì tìm một template đúng chủ đề, bạn chỉ cần chọn kiểu vận hành phù hợp. Sau đó vẫn sửa lại toàn bộ cho sát mục tiêu của mình.
                        </p>
                      </div>
                      <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                        Gói {getPlanLabel(currentPlan)}
                      </Badge>
                    </div>
                    {recommendedTemplate && adaptiveTemplateRecommendation && (
                      <div className="rounded-[24px] border border-sky-200 gradient-sky p-4 shadow-[0_18px_40px_-34px_rgba(37,99,235,0.18)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                              Gợi ý cho mục tiêu này
                            </p>
                            <p className="mt-2 text-lg font-semibold text-slate-950">
                              {recommendedTemplate.name}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              {adaptiveTemplateRecommendation.reason}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-sky-200 bg-white text-sky-800">
                            {recommendedTemplate.requiredPlan ? getPlanLabel(recommendedTemplate.requiredPlan) : "Free"}
                          </Badge>
                        </div>
                        <Button
                          className="mt-4"
                          variant={selectedTemplate?.id === recommendedTemplate.id ? "outline" : "default"}
                          onClick={() => handleTemplateSelect(recommendedTemplate)}
                        >
                          {selectedTemplate?.id === recommendedTemplate.id
                            ? "Đang dùng khung gợi ý"
                            : "Dùng khung gợi ý này"}
                        </Button>
                        {recommendedTemplateSupport && (
                          <div className="mt-4 grid gap-3">
                            <div className="rounded-[20px] border border-sky-200 bg-white/86 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                                Tuần 1 nên thắng ở đâu
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-950">
                                {recommendedTemplateSupport.week1Headline}
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {recommendedTemplateSupport.week1Support}
                              </p>
                            </div>
                            <div className="rounded-[20px] border border-sky-200 bg-white/86 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                                Nhịp nên giữ
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {recommendedTemplateSupport.week1CadenceHint}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      {TWELVE_WEEK_TEMPLATE_CATALOG.map((template) => {
                        const isLocked = !planSatisfiesRequirement(currentPlan, template.requiredPlan);
                        const isSelected = selectedTemplate?.id === template.id;

                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleTemplateSelect(template)}
                            className={`rounded-[24px] border p-4 text-left transition-all ${
                              isSelected
                                ? "border-slate-900 bg-slate-900 text-white shadow-[0_22px_50px_-32px_rgba(15,23,42,0.48)]"
                                : isLocked
                                  ? "border-violet-200 bg-violet-50/86 hover:border-violet-300"
                                  : "border-white/70 bg-white/84 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className={`font-semibold ${isSelected ? "text-white" : "text-slate-950"}`}>
                                    {template.name}
                                  </p>
                                  <Badge
                                    variant={template.requiredPlan ? "default" : "outline"}
                                    className={
                                      isSelected
                                        ? "border-white/15 bg-white/10 text-white hover:bg-white/10"
                                        : template.requiredPlan
                                          ? "bg-violet-600 text-white hover:bg-violet-600"
                                          : "border-slate-300 bg-white text-slate-700"
                                    }
                                  >
                                    {template.requiredPlan ? `Khung ${getPlanLabel(template.requiredPlan)}` : "Khung Free"}
                                  </Badge>
                                </div>
                                <p className={`mt-1 text-sm ${isSelected ? "text-white/74" : "text-slate-600"}`}>
                                  {template.subtitle}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  isSelected
                                    ? "border-white/15 bg-white/10 text-white"
                                    : "border-slate-300 bg-white text-slate-700"
                                }
                              >
                                {isSelected ? "Đang dùng" : isLocked ? "Đang khóa" : "Sẵn sàng"}
                              </Badge>
                            </div>
                            <p className={`mt-3 text-sm leading-7 ${isSelected ? "text-white/84" : "text-slate-600"}`}>
                              {template.description}
                            </p>
                            <div
                              className={`mt-3 rounded-[20px] border px-3 py-3 text-sm leading-6 ${
                                isSelected
                                  ? "border-white/12 bg-white/8 text-white/82"
                                  : "border-white/70 bg-white/72 text-slate-600"
                              }`}
                            >
                              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isSelected ? "text-white/54" : "text-slate-400"}`}>
                                Hợp khi
                              </p>
                              <p className="mt-2">{template.bestFor}</p>
                            </div>
                            <div
                              className={`mt-3 rounded-[20px] border px-3 py-3 text-sm leading-6 ${
                                isSelected
                                  ? "border-white/12 bg-white/8 text-white/82"
                                  : "border-white/70 bg-white/72 text-slate-600"
                              }`}
                            >
                              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isSelected ? "text-white/54" : "text-slate-400"}`}>
                                Tuần 1 sẽ có gì
                              </p>
                              <p className="mt-2">{template.firstWeekWin}</p>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {template.idealFor.map((item) => (
                                <Badge
                                  key={`${template.id}_${item}`}
                                  variant="outline"
                                  className={
                                    isSelected
                                      ? "border-white/15 bg-white/10 text-white"
                                      : "border-slate-200 bg-slate-50 text-slate-700"
                                  }
                                >
                                  {item}
                                </Badge>
                              ))}
                              {template.tactics.slice(0, 2).map((tactic) => (
                                <Badge
                                  key={`${template.id}_${tactic.name}`}
                                  variant="outline"
                                  className={
                                    isSelected
                                      ? "border-white/15 bg-white/10 text-white"
                                      : "border-slate-200 bg-slate-50 text-slate-700"
                                  }
                                >
                                  {tactic.name}
                                </Badge>
                              ))}
                            </div>
                            {isLocked && (
                              <div className="mt-4 flex items-center justify-between border-t border-violet-200/60 pt-3">
                                <span className="text-xs font-semibold text-violet-700">Cần gói Plus để dùng khung này</span>
                                <span className="text-xs font-semibold text-violet-600">Mở khóa →</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedTemplate && (
                    <div className="space-y-4 rounded-[28px] border border-emerald-200 gradient-emerald p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Cá nhân hóa khung
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Trả lời nhanh 3 câu để khung tự điều chỉnh lượng tactic và nhịp phù hợp.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="daily-time-budget">Mỗi ngày bạn có thể dành bao lâu?</Label>
                        <Select
                          value={draft.dailyTimeBudget}
                          onValueChange={(value) => {
                            handleChange("dailyTimeBudget", value);
                            if (selectedTemplate) {
                              setTimeout(() => applyTemplate(selectedTemplate, false), 0);
                            }
                          }}
                        >
                          <SelectTrigger id="daily-time-budget" aria-label="Chọn ngân sách thời gian mỗi ngày">
                            <SelectValue placeholder="Chọn thời lượng" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30min">30 phút</SelectItem>
                            <SelectItem value="1h">1 giờ</SelectItem>
                            <SelectItem value="1.5h">1.5 giờ</SelectItem>
                            <SelectItem value="2h+">2+ giờ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Những ngày nào bạn muốn tập trung?</Label>
                        <div className="flex flex-wrap gap-2">
                          {(["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const).map((dayLabel, dayIndex) => {
                            const isActive = draft.preferredDays.includes(dayIndex);
                            return (
                              <button
                                key={dayLabel}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => {
                                  setDraft((previousDraft) => ({
                                    ...previousDraft,
                                    preferredDays: isActive
                                      ? previousDraft.preferredDays.filter((d) => d !== dayIndex)
                                      : [...previousDraft.preferredDays, dayIndex],
                                  }));
                                }}
                                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                                  isActive
                                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400"
                                }`}
                              >
                                {dayLabel}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-slate-500">
                          {draft.preferredDays.length === 0
                            ? "Chưa chọn — mặc định dàn đều cả tuần."
                            : `Đã chọn ${draft.preferredDays.length} ngày.`}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="personal-constraint">Trở ngại lớn nhất hiện tại?</Label>
                        <Select
                          value={draft.personalConstraint}
                          onValueChange={(value) => {
                            handleChange("personalConstraint", value as TwelveWeekSetupDraft["personalConstraint"]);
                            if (selectedTemplate) {
                              setTimeout(() => applyTemplate(selectedTemplate, false), 0);
                            }
                          }}
                        >
                          <SelectTrigger id="personal-constraint" aria-label="Chọn trở ngại lớn nhất">
                            <SelectValue placeholder="Chọn trở ngại" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="time">Thiếu thời gian</SelectItem>
                            <SelectItem value="motivation">Khó giữ động lực</SelectItem>
                            <SelectItem value="consistency">Hay bị đứt nhịp</SelectItem>
                            <SelectItem value="complexity">Mục tiêu phức tạp, chưa biết bắt đầu</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                          {draft.personalConstraint === "time" && "Hệ thống sẽ ưu tiên giữ nhẹ và tập trung."}
                          {draft.personalConstraint === "motivation" && "Hệ thống sẽ ưu tiên thắng nhỏ sớm và giảm ma sát."}
                          {draft.personalConstraint === "consistency" && "Hệ thống sẽ ưu tiên nhịp đều thay vì tải cao."}
                          {draft.personalConstraint === "complexity" && "Hệ thống sẽ giúp tách lớp rõ hơn."}
                          {!draft.personalConstraint && "Chọn trở ngại để hệ thống điều chỉnh phù hợp hơn."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="goal-type">Loại mục tiêu</Label>
                    <Select value={draft.goalType} onValueChange={(value) => handleChange("goalType", value)}>
                      <SelectTrigger id="goal-type" aria-label="Chọn loại mục tiêu">
                        <SelectValue placeholder="Chọn loại mục tiêu" />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_TYPES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vision-12-week">Tầm nhìn 12 tuần</Label>
                    <Textarea id="vision-12-week" rows={4} value={draft.vision12Week} onChange={(event) => handleChange("vision12Week", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week-12-outcome">Outcome muốn chạm tới ở tuần 12</Label>
                    <Textarea id="week-12-outcome" rows={3} value={draft.week12Outcome} onChange={(event) => handleChange("week12Outcome", event.target.value)} />
                  </div>
                </div>
                <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/72 p-5">
                  <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {selectedTemplate ? "Khung đang dùng" : setupGuideTemplate ? "Khung nên bắt đầu" : "Khung đang dùng"}
                    </p>
                    {setupGuideTemplate ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-slate-950">{setupGuideTemplate.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{setupGuideTemplate.subtitle}</p>
                          </div>
                          <Badge
                            variant={setupGuideTemplate.requiredPlan ? "default" : "outline"}
                            className={
                              setupGuideTemplate.requiredPlan
                                ? "bg-violet-600 text-white hover:bg-violet-600"
                                : "border-slate-300 bg-white text-slate-700"
                            }
                          >
                            {setupGuideTemplate.requiredPlan ? getPlanLabel(setupGuideTemplate.requiredPlan) : "Free"}
                          </Badge>
                        </div>
                        <div className="rounded-[18px] border border-white/70 bg-white/86 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vì sao khung này chạy được</p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">{setupGuideTemplate.whyItWorks}</p>
                        </div>
                        <div className="rounded-[18px] border border-white/70 bg-white/86 p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tuần đầu sẽ thắng ở đâu</p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">
                            {setupGuideSupport?.week1Support ?? setupGuideTemplate.firstWeekWin}
                          </p>
                        </div>
                        {setupGuideSupport && (
                          <div className="rounded-[18px] border border-white/70 bg-slate-950 p-4 text-white">
                            <p className="text-xs uppercase tracking-[0.16em] text-white/54">
                              Nhịp nên giữ ở tuần 1
                            </p>
                            <p className="mt-2 text-sm font-semibold">
                              {setupGuideSupport.week1Headline}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-white/78">
                              {setupGuideSupport.week1CadenceHint}
                            </p>
                          </div>
                        )}
                        {!selectedTemplate && (
                          <p className="text-xs leading-6 text-slate-500">
                            Đây là khung gợi ý nổi bật cho mục tiêu này. Bạn có thể áp dụng, rồi sửa tactic theo đúng hoàn cảnh của mình.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Chưa chọn khung nào. Bạn vẫn có thể đi theo flow custom, nhưng khung gợi ý sẽ giúp tuần đầu bớt phải nghĩ từ trang trắng.
                      </p>
                    )}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Nguồn vào từ SMART</p>
                  <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Specific</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{smartGoal.specific}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Measurable</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{smartGoal.measurable}</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Giữ 2-4 tactic cho cả chu kỳ</p>
                      <p className="mt-1 text-sm text-slate-500">Tactic cốt lõi được ưu tiên trong điểm tuần. Tactic tùy chọn là phần thêm khi bạn còn sức.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddIndicator} disabled={draft.leadIndicators.length >= 4}>
                      Thêm tactic
                    </Button>
                  </div>

                  {draft.leadIndicators.map((indicator, index) => (
                    <div key={indicator.id} className="rounded-[24px] border border-white/70 bg-white/72 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">Tactic {index + 1}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={indicator.type === "optional" ? "outline" : "default"}>
                            {indicator.type === "optional" ? "Tùy chọn" : "Cốt lõi"}
                          </Badge>
                          {draft.leadIndicators.length > 2 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveIndicator(index)}>
                              Xóa
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`tactic-name-${index}`}>Tên tactic</Label>
                          <Input
                            id={`tactic-name-${index}`}
                            value={indicator.name}
                            onChange={(event) => handleIndicatorChange(index, "name", event.target.value)}
                            placeholder="Ví dụ: viết 3 bài, tập 2 buổi, gửi 5 outreach..."
                          />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="space-y-2">
                            <Label htmlFor={`tactic-type-${index}`}>Loại</Label>
                            <Select
                              value={indicator.type}
                              onValueChange={(value) =>
                                handleIndicatorChange(index, "type", value as TacticType)
                              }
                            >
                              <SelectTrigger id={`tactic-type-${index}`} aria-label={`Chọn loại cho tactic ${index + 1}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="core">Cốt lõi</SelectItem>
                                <SelectItem value="optional">Tùy chọn</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`tactic-target-${index}`}>Tần suất / tuần</Label>
                            <Input id={`tactic-target-${index}`} value={indicator.target} onChange={(event) => handleIndicatorChange(index, "target", event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`tactic-unit-${index}`}>Đơn vị</Label>
                            <Input id={`tactic-unit-${index}`} value={indicator.unit} onChange={(event) => handleIndicatorChange(index, "unit", event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`tactic-cadence-${index}`}>Nhịp</Label>
                            <Select
                              value={indicator.cadence}
                              onValueChange={(value) =>
                                handleIndicatorChange(
                                  index,
                                  "cadence",
                                  value as LeadIndicatorDraft["cadence"],
                                )
                              }
                            >
                              <SelectTrigger id={`tactic-cadence-${index}`} aria-label={`Chọn nhịp cho tactic ${index + 1}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="spread">Trải đều</SelectItem>
                                <SelectItem value="frontload">Đầu tuần</SelectItem>
                                <SelectItem value="backload">Cuối tuần</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/72 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Xem trước tuần 1</p>
                  <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cốt lõi / Tùy chọn</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {coreCount} cốt lõi • {optionalCount} tùy chọn
                    </p>
                  </div>
                  {setupGuideSupport && setupGuideTemplate && (
                    <div className="rounded-[22px] border border-slate-900 bg-slate-950 p-4 text-white">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/54">
                        {selectedTemplate ? "Tuần 1 theo khung đang dùng" : "Nếu đi theo khung gợi ý này"}
                      </p>
                      <p className="mt-2 text-base font-semibold">{setupGuideSupport.week1Headline}</p>
                      <p className="mt-2 text-sm leading-7 text-white/78">
                        {setupGuideSupport.week1Support}
                      </p>
                      <p className="mt-3 rounded-2xl border border-white/12 bg-white/8 px-3 py-3 text-sm text-white/74">
                        {setupGuideSupport.week1CadenceHint}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {weekOneTaskPreview.length === 0 ? (
                      <p className="text-sm text-slate-500">Thêm tactic để thấy tuần đầu tiên sẽ trông như thế nào.</p>
                    ) : (
                      weekOneTaskPreview.map((task) => (
                        <div key={task} className="rounded-2xl border border-white/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                          {task}
                        </div>
                      ))
                    )}
                  </div>
                  {weekOneTaskWarning ? (
                    <p className="text-xs text-amber-600">{weekOneTaskWarning}</p>
                  ) : null}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cycle-start-date">Ngày bắt đầu chu kỳ</Label>
                      <Input id="cycle-start-date" type="date" value={draft.startDate} onChange={(event) => handleChange("startDate", event.target.value)} />
                      <p className="text-xs text-slate-500">Hệ thống sẽ canh chu kỳ về Thứ Hai để việc và điểm tuần khớp nhau.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review-day">Ngày review hằng tuần</Label>
                      <Select value={draft.reviewDay} onValueChange={(value) => handleChange("reviewDay", value)}>
                        <SelectTrigger id="review-day" aria-label="Chọn ngày review hằng tuần">
                          <SelectValue placeholder="Chọn ngày review" />
                        </SelectTrigger>
                        <SelectContent>
                          {REVIEW_DAYS.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week-load-preference">Nhịp tuần mặc định</Label>
                    <Select
                      value={draft.tacticLoadPreference}
                      onValueChange={(value) =>
                        handleChange(
                          "tacticLoadPreference",
                          value as TwelveWeekSetupDraft["tacticLoadPreference"],
                        )
                      }
                    >
                      <SelectTrigger id="week-load-preference" aria-label="Chọn nhịp tuần mặc định">
                        <SelectValue placeholder="Chọn nhịp tuần mặc định" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOAD_PREFERENCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Đây là nhịp khởi đầu của chu kỳ. Bạn vẫn có thể chỉnh lại sau trong phần Cài đặt.
                    </p>
                  </div>
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="lag-metric-name">Chỉ số kết quả chính</Label>
                      <Input id="lag-metric-name" value={draft.lagMetricName} onChange={(event) => handleChange("lagMetricName", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lag-metric-target">Mục tiêu</Label>
                      <Input id="lag-metric-target" value={draft.lagMetricTarget} onChange={(event) => handleChange("lagMetricTarget", event.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lag-metric-unit">Đơn vị của chỉ số</Label>
                    <Input id="lag-metric-unit" value={draft.lagMetricUnit} onChange={(event) => handleChange("lagMetricUnit", event.target.value)} />
                  </div>
                </div>
                <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/72 p-5">
                  <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <CalendarDays className="h-4 w-4" />
                      <p className="text-sm font-semibold">Chu kỳ 12 tuần</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{cycleStartDate} đến {cycleEndDate}</p>
                  </div>
                  {setupGuideSupport && setupGuideTemplate && (
                    <div className="rounded-[22px] border border-slate-900 bg-slate-950 p-4 text-white">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/54">
                        Nhịp nên giữ ở tuần 1
                      </p>
                      <p className="mt-2 text-base font-semibold">{setupGuideSupport.week1Headline}</p>
                      <p className="mt-2 text-sm leading-7 text-white/78">
                        {setupGuideSupport.week1Support}
                      </p>
                      <div className="mt-3 rounded-2xl border border-white/12 bg-white/8 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/54">
                          Gợi ý giữ nhịp
                        </p>
                        <p className="mt-2 text-sm leading-7 text-white/78">
                          {setupGuideSupport.week1CadenceHint}
                        </p>
                      </div>
                    </div>
                  )}
                  {setupGuideSupport && (
                    <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Review và tải tuần gợi ý
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/70 bg-slate-50/80 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Review
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {draft.reviewDay}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {setupGuideSupport.recommendedReviewReason}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-slate-50/80 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Nhịp tuần
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {getLoadPreferenceLabel(draft.tacticLoadPreference)}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {setupGuideSupport.recommendedLoadReason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {(draft.week4Milestone || draft.week8Milestone) && (
                    <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        Mốc gợi ý theo khung
                      </p>
                      <div className="mt-3 space-y-3">
                        <div className="rounded-2xl border border-white/70 bg-slate-50/80 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Tuần 4
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">
                            {draft.week4Milestone}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-slate-50/80 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Tuần 8
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">
                            {draft.week8Milestone}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      {previewTasks.length > 0 ? "Những việc sẽ hiện ở màn Hôm nay" : "Tuần đầu nên mở bằng"}
                    </p>
                    <div className="mt-3 space-y-2">
                      {weekOneTaskPreview.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Khi bạn chốt khung hoặc thêm tactic, tuần đầu sẽ hiện rõ các việc cần mở ở màn Hôm nay.
                        </p>
                      ) : (
                        weekOneTaskPreview.map((task) => (
                          <div key={task} className="rounded-2xl border border-white/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                            {task}
                          </div>
                        ))
                      )}
                    </div>
                    {weekOneTaskWarning ? (
                      <p className="mt-3 text-xs text-amber-600">{weekOneTaskWarning}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tóm tắt hệ thống</p>
                    <h3 className="mt-3 text-xl font-semibold text-slate-900">{smartGoal.specific}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{draft.vision12Week}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{draft.goalType}</Badge>
                      <Badge variant="outline">{getLifeAreaLabel(focusArea)}</Badge>
                      <Badge variant="outline">Review {draft.reviewDay}</Badge>
                      <Badge variant="outline">Nhịp {getLoadPreferenceLabel(draft.tacticLoadPreference)}</Badge>
                      {selectedTemplate && <Badge variant="outline">Khung {selectedTemplate.name}</Badge>}
                    </div>
                  </div>

                  <details className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                      Mở phần nâng cao (tùy chọn)
                    </summary>
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="milestone-week-4">Milestone tuần 4</Label>
                          <Input id="milestone-week-4" value={draft.week4Milestone} onChange={(event) => handleChange("week4Milestone", event.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="milestone-week-8">Milestone tuần 8</Label>
                          <Input id="milestone-week-8" value={draft.week8Milestone} onChange={(event) => handleChange("week8Milestone", event.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="success-evidence">Bằng chứng thành công muốn thấy</Label>
                        <Textarea id="success-evidence" rows={3} value={draft.successEvidence} onChange={(event) => handleChange("successEvidence", event.target.value)} />
                      </div>
                    </div>
                  </details>
                </div>

                <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/72 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sau khi tạo xong</p>
                  <div className="rounded-[22px] border border-white/70 bg-white/78 p-4 text-sm leading-7 text-slate-700">
                    Bạn sẽ đi thẳng vào trung tâm 12 tuần, nơi có màn Hôm nay, Tuần, Tiến độ và Cài đặt trong cùng một nhịp.
                  </div>
                  {setupGuideSupport && setupGuideTemplate && (
                    <div className="rounded-[22px] border border-slate-900 bg-slate-950 p-4 text-white">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/54">
                        Tuần đầu sẽ khởi động như thế nào
                      </p>
                      <p className="mt-2 text-base font-semibold">{setupGuideSupport.week1Headline}</p>
                      <p className="mt-2 text-sm leading-7 text-white/78">
                        {setupGuideSupport.week1Support}
                      </p>
                    </div>
                  )}
                  <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tuần đầu có gì</p>
                    <div className="mt-3 space-y-2">
                      {weekOneTaskPreview.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Bạn có thể thêm hoặc chỉnh tactic trước khi tạo hệ thống để tuần đầu hiện rõ hơn.
                        </p>
                      ) : (
                        weekOneTaskPreview.map((task) => (
                          <div key={task} className="rounded-2xl border border-white/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                            {task}
                          </div>
                        ))
                      )}
                    </div>
                    {weekOneTaskWarning ? (
                      <p className="mt-3 text-xs text-amber-600">{weekOneTaskWarning}</p>
                    ) : null}
                  </div>
                  {(draft.week4Milestone || draft.week8Milestone) && (
                    <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mốc giữa chu kỳ</p>
                      <div className="mt-3 space-y-3">
                        <div className="rounded-2xl border border-white/70 bg-slate-50/80 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tuần 4</p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">{draft.week4Milestone}</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-slate-50/80 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tuần 8</p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">{draft.week8Milestone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3 border-t border-white/70 pt-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext}>
                  Tiếp tục
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>
                  <Flag className="h-4 w-4" />
                  Tạo hệ thống 12 tuần
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
