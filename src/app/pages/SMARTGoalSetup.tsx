import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, CircleAlert, CheckCircle2, Compass, Sparkles, Target } from "lucide-react";

import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Textarea } from "../components/ui/textarea";
import { getScoredLifeArea, hasRealLifeBalance } from "../utils/core-flow-guard";
import { APP_STORAGE_KEYS, getLifeAreaLabel, getUserData } from "../utils/storage";
import {
  buildSmartGoal,
  hasOutcomeIndicator,
  isPendingSMARTGoal,
  normalizeListInput,
  parseNumberInput,
  parseSmartGoal,
  stringifyListInput,
  type SmartGoal,
} from "@/lib/smart-goal";

interface SMARTData {
  specific: {
    goal_statement: string;
  };
  measurable: {
    metric_name: string;
    baseline_value: string;
    target_value: string;
  };
  achievable: {
    weekly_time_commitment_hours: string;
    required_skills: string;
    support_resources: string;
  };
  relevant: {
    motivation_reason: string;
    life_dimension_alignment: string;
  };
  timeBound: {
    mode: "date" | "weeks";
    target_date: string;
    target_weeks: string;
  };
}

type SmartStepKey = keyof SMARTData;

interface GoalClarityItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  stepKey: SmartStepKey;
}

const DEFAULT_TARGET_WEEKS = "12";

function createInitialSMARTData(): SMARTData {
  return {
    specific: {
      goal_statement: "",
    },
    measurable: {
      metric_name: "",
      baseline_value: "",
      target_value: "",
    },
    achievable: {
      weekly_time_commitment_hours: "",
      required_skills: "",
      support_resources: "",
    },
    relevant: {
      motivation_reason: "",
      life_dimension_alignment: "",
    },
    timeBound: {
      mode: "weeks",
      target_date: "",
      target_weeks: DEFAULT_TARGET_WEEKS,
    },
  };
}

function extractNumberFromText(value: string): number | undefined {
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  return parseNumberInput(match[0]);
}

function extractDateFromText(value: string): string {
  const match = value.match(/\b\d{4}-\d{2}-\d{2}\b/);
  return match?.[0] ?? "";
}

function buildSMARTDataFromDraft(parsed: unknown): SMARTData {
  const parsedSmartGoal = parseSmartGoal(parsed, "");
  if (parsedSmartGoal) {
    return {
      specific: {
        goal_statement: parsedSmartGoal.specific.goal_statement,
      },
      measurable: {
        metric_name: parsedSmartGoal.measurable.metric_name,
        baseline_value:
          parsedSmartGoal.measurable.baseline_value !== undefined
            ? String(parsedSmartGoal.measurable.baseline_value)
            : "",
        target_value: String(parsedSmartGoal.measurable.target_value),
      },
      achievable: {
        weekly_time_commitment_hours: String(parsedSmartGoal.achievable.weekly_time_commitment_hours),
        required_skills: stringifyListInput(parsedSmartGoal.achievable.required_skills),
        support_resources: stringifyListInput(parsedSmartGoal.achievable.support_resources),
      },
      relevant: {
        motivation_reason: parsedSmartGoal.relevant.motivation_reason,
        life_dimension_alignment: parsedSmartGoal.relevant.life_dimension_alignment ?? "",
      },
      timeBound: {
        mode: parsedSmartGoal.time_bound.target_date ? "date" : "weeks",
        target_date: parsedSmartGoal.time_bound.target_date ?? "",
        target_weeks:
          parsedSmartGoal.time_bound.target_weeks !== undefined
            ? String(parsedSmartGoal.time_bound.target_weeks)
            : DEFAULT_TARGET_WEEKS,
      },
    };
  }

  if (isPendingSMARTGoal(parsed)) {
    const legacyHours = extractNumberFromText(parsed.achievable);
    const legacyDate = extractDateFromText(parsed.timeBound);
    const legacyWeeks = extractNumberFromText(parsed.timeBound);

    return {
      specific: {
        goal_statement: parsed.specific,
      },
      measurable: {
        metric_name: parsed.measurable,
        baseline_value: "",
        target_value: "",
      },
      achievable: {
        weekly_time_commitment_hours: legacyHours !== undefined ? String(legacyHours) : "",
        required_skills: "",
        support_resources: parsed.achievable,
      },
      relevant: {
        motivation_reason: parsed.relevant,
        life_dimension_alignment: "",
      },
      timeBound: {
        mode: legacyDate ? "date" : "weeks",
        target_date: legacyDate,
        target_weeks: legacyWeeks !== undefined ? String(legacyWeeks) : DEFAULT_TARGET_WEEKS,
      },
    };
  }

  return createInitialSMARTData();
}

function formatStepDraft(stepKey: SmartStepKey, smartData: SMARTData): string {
  switch (stepKey) {
    case "specific":
      return smartData.specific.goal_statement.trim();
    case "measurable": {
      const metricName = smartData.measurable.metric_name.trim();
      const baseline = smartData.measurable.baseline_value.trim();
      const target = smartData.measurable.target_value.trim();

      if (!metricName && !target) return "";
      if (baseline) return `${metricName}: ${baseline} -> ${target}`;
      return metricName ? `${metricName}: ${target}` : target;
    }
    case "achievable": {
      const parts: string[] = [];
      const weeklyHours = smartData.achievable.weekly_time_commitment_hours.trim();
      const skills = normalizeListInput(smartData.achievable.required_skills);
      const support = normalizeListInput(smartData.achievable.support_resources);

      if (weeklyHours) parts.push(`${weeklyHours} giờ/tuần`);
      if (skills.length > 0) parts.push(`Kỹ năng: ${skills.join(", ")}`);
      if (support.length > 0) parts.push(`Hỗ trợ: ${support.join(", ")}`);

      return parts.join(". ");
    }
    case "relevant": {
      const motivation = smartData.relevant.motivation_reason.trim();
      const alignment = smartData.relevant.life_dimension_alignment.trim();

      if (!motivation) return "";
      return alignment ? `${motivation} (${alignment})` : motivation;
    }
    case "timeBound":
      if (smartData.timeBound.mode === "date") {
        return smartData.timeBound.target_date.trim() ? `Mốc đến ${smartData.timeBound.target_date.trim()}` : "";
      }
      return smartData.timeBound.target_weeks.trim() ? `Trong ${smartData.timeBound.target_weeks.trim()} tuần` : "";
    default:
      return "";
  }
}

function hasStepDraftContent(stepKey: SmartStepKey, smartData: SMARTData): boolean {
  switch (stepKey) {
    case "specific":
      return smartData.specific.goal_statement.trim().length > 0;
    case "measurable":
      return (
        smartData.measurable.metric_name.trim().length > 0 ||
        smartData.measurable.baseline_value.trim().length > 0 ||
        smartData.measurable.target_value.trim().length > 0
      );
    case "achievable":
      return (
        smartData.achievable.weekly_time_commitment_hours.trim().length > 0 ||
        smartData.achievable.required_skills.trim().length > 0 ||
        smartData.achievable.support_resources.trim().length > 0
      );
    case "relevant":
      return (
        smartData.relevant.motivation_reason.trim().length > 0 ||
        smartData.relevant.life_dimension_alignment.trim().length > 0
      );
    case "timeBound":
      return smartData.timeBound.mode === "date" || smartData.timeBound.target_weeks.trim() !== DEFAULT_TARGET_WEEKS;
    default:
      return false;
  }
}

function getStepValidationError(stepKey: SmartStepKey, smartData: SMARTData): string | null {
  if (stepKey === "specific") {
    const value = smartData.specific.goal_statement.trim();
    if (value.length < 20) {
      return "Mục tiêu cần dài tối thiểu 20 ký tự.";
    }
    return null;
  }

  if (stepKey === "measurable") {
    if (smartData.measurable.metric_name.trim().length === 0) {
      return "Hãy chọn một con số hoặc dấu hiệu rõ để theo dõi.";
    }

    const targetValue = parseNumberInput(smartData.measurable.target_value);
    if (targetValue === undefined) {
      return "Cần nhập mốc mục tiêu hợp lệ.";
    }

    const baselineInput = smartData.measurable.baseline_value.trim();
    if (baselineInput && parseNumberInput(baselineInput) === undefined) {
      return "Mốc hiện tại phải là một con số hợp lệ.";
    }
    if (baselineInput) {
      const baselineValue = parseNumberInput(baselineInput);
      if (baselineValue !== undefined && targetValue <= baselineValue) {
        return "Mốc mục tiêu phải lớn hơn mốc hiện tại.";
      }
    }

    return null;
  }

  if (stepKey === "achievable") {
    const weeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours);
    if (weeklyHours === undefined || weeklyHours <= 0) {
      return "Thời gian mỗi tuần phải lớn hơn 0.";
    }
    return null;
  }

  if (stepKey === "relevant") {
    if (smartData.relevant.motivation_reason.trim().length < 15) {
      return "Lý do theo đuổi cần tối thiểu 15 ký tự.";
    }
    return null;
  }

  if (smartData.timeBound.mode === "date") {
    return smartData.timeBound.target_date.trim().length > 0 ? null : "Hãy chọn ngày mục tiêu cho kế hoạch này.";
  }

  const targetWeeks = parseNumberInput(smartData.timeBound.target_weeks);
  if (targetWeeks === undefined || targetWeeks <= 0) {
    return "Số tuần mục tiêu phải là số dương hợp lệ.";
  }

  return null;
}

function buildGoalClarityItems(smartData: SMARTData): GoalClarityItem[] {
  const specific = smartData.specific.goal_statement.trim();
  const metricName = smartData.measurable.metric_name.trim();
  const baselineInput = smartData.measurable.baseline_value.trim();
  const baselineValue = parseNumberInput(baselineInput);
  const targetValue = parseNumberInput(smartData.measurable.target_value);
  const weeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours);
  const motivation = smartData.relevant.motivation_reason.trim();
  const timeReady =
    smartData.timeBound.mode === "date"
      ? smartData.timeBound.target_date.trim().length > 0
      : (parseNumberInput(smartData.timeBound.target_weeks) ?? 0) > 0;
  const metricReady =
    metricName.length > 0 &&
    targetValue !== undefined &&
    (baselineInput.length === 0 || baselineValue !== undefined) &&
    (baselineValue === undefined || targetValue > baselineValue);

  return [
    {
      id: "specific",
      label: "Kết quả cụ thể",
      detail:
        specific.length >= 20
          ? hasOutcomeIndicator(specific)
            ? "Câu mục tiêu đã có hướng kết quả rõ."
            : "Nên thêm một động từ kết quả như đạt, hoàn thành, xây dựng, ra mắt."
          : "Viết rõ điều bạn muốn đạt bằng một câu đủ cụ thể.",
      done: specific.length >= 20 && hasOutcomeIndicator(specific),
      stepKey: "specific",
    },
    {
      id: "measurable",
      label: "Có dấu hiệu theo dõi",
      detail: metricReady ? "Đã có chỉ số và mốc muốn chạm tới." : "Cần một chỉ số và mốc muốn chạm tới để tránh đoán cảm tính.",
      done: metricReady,
      stepKey: "measurable",
    },
    {
      id: "achievable",
      label: "Có thời gian thật",
      detail:
        weeklyHours !== undefined && weeklyHours > 0
          ? `Bạn đang dành khoảng ${weeklyHours} giờ mỗi tuần.`
          : "Hãy nhập số giờ mỗi tuần bạn thật sự có thể giữ.",
      done: weeklyHours !== undefined && weeklyHours > 0,
      stepKey: "achievable",
    },
    {
      id: "relevant",
      label: "Có lý do đủ mạnh",
      detail: motivation.length >= 15 ? "Lý do đã đủ rõ để nhắc bạn khi khó giữ nhịp." : "Viết lý do đủ thật để mục tiêu này đáng theo đuổi.",
      done: motivation.length >= 15,
      stepKey: "relevant",
    },
    {
      id: "timeBound",
      label: "Có mốc nhìn lại",
      detail: timeReady ? "Đã có mốc thời gian để kiểm tra tiến độ." : "Chọn số tuần hoặc ngày đích cho mục tiêu này.",
      done: timeReady,
      stepKey: "timeBound",
    },
  ];
}

const SMART_STEPS = [
  {
    key: "specific" as keyof SMARTData,
    label: "Điều muốn đạt",
    title: "Bạn muốn có kết quả gì?",
    placeholder: "Ví dụ: Tôi muốn được thăng chức lên vị trí Lập trình viên cao cấp và dẫn dắt một dự án quan trọng.",
    description: "Viết bằng một câu rõ ràng để chính bạn nhìn vào là biết mình đang hướng tới điều gì.",
    coaching: "Nói về kết quả cuối cùng, không chỉ viết mong muốn chung chung.",
    completionHint: "Viết một kết quả đủ rõ để người khác đọc cũng hiểu bạn muốn đạt điều gì.",
  },
  {
    key: "measurable" as keyof SMARTData,
    label: "Con số theo dõi",
    title: "Bạn sẽ biết mình đang tiến bộ bằng dấu hiệu nào?",
    placeholder: "Ví dụ: Hoàn thành 3 khóa học nâng cao, dẫn dắt 2 tính năng lớn và nhận đánh giá tốt từ quản lý.",
    description: "Chọn một dấu hiệu cụ thể để bạn không phải đoán mò mình có đang đi đúng hướng hay không.",
    coaching: "Có thể là số lượng, cột mốc, đầu ra hoặc một tiêu chí dễ quan sát.",
    completionHint: "Chốt một chỉ số, mốc hiện tại và mốc muốn chạm tới.",
  },
  {
    key: "achievable" as keyof SMARTData,
    label: "Điều kiện thật",
    title: "Bạn thật sự có gì để làm mục tiêu này?",
    placeholder: "Ví dụ: cần 5 giờ học mỗi tuần, mentor góp ý định kỳ và thời gian thực hành có lịch cố định.",
    description: "Phần này kéo mục tiêu về đời sống thật: thời gian, kỹ năng, người hỗ trợ và nguồn lực bạn có.",
    coaching: "Đừng viết phiên bản lý tưởng. Hãy viết phần bạn thật sự có thể giữ đều.",
    completionHint: "Điền thời gian mỗi tuần, kỹ năng và nguồn lực thực tế bạn có thể dựa vào.",
  },
  {
    key: "relevant" as keyof SMARTData,
    label: "Lý do",
    title: "Vì sao mục tiêu này đáng theo đuổi?",
    placeholder: "Ví dụ: Vì nó gắn trực tiếp với tầm nhìn nghề nghiệp 3 năm tới và mức thu nhập tôi đang hướng đến.",
    description: "Khi mục tiêu gắn với một lý do đủ mạnh, bạn sẽ dễ giữ được kỷ luật hơn trong giai đoạn khó.",
    coaching: "Viết như đang tự nhắc mình: mục tiêu này quan trọng vì...",
    completionHint: "Nêu lý do đủ thật để mục tiêu này đáng theo đuổi trong vài tuần tới.",
  },
  {
    key: "timeBound" as keyof SMARTData,
    label: "Mốc thời gian",
    title: "Bạn muốn chạm tới kết quả này vào khi nào?",
    placeholder: "Ví dụ: Trong vòng 12 tháng, trước tháng 3 năm 2027.",
    description: "Mốc thời gian tạo ra nhịp. Không cần quá gấp, nhưng cần đủ rõ để bạn biết khi nào phải nhìn lại.",
    coaching: "Nếu chưa chắc ngày cụ thể, ít nhất hãy đưa ra khung tuần hoặc tháng.",
    completionHint: "Chốt số tuần hoặc ngày đích trước khi chuyển sang kiểm tra tính thực tế.",
  },
];

export function SMARTGoalSetup() {
  const navigate = useNavigate();
  const [setupState, setSetupState] = useState<"checking" | "needs_life_balance" | "needs_life_insight" | "ready">(
    "checking",
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [focusArea, setFocusArea] = useState<string>("");
  const [smartData, setSmartData] = useState<SMARTData>(createInitialSMARTData());

  useEffect(() => {
    const data = getUserData();
    if (!hasRealLifeBalance(data)) {
      setSetupState("needs_life_balance");
      return;
    }

    const area = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    if (!area || !getScoredLifeArea(data, area)) {
      setSetupState("needs_life_insight");
      return;
    }

    setFocusArea(area);

    const draft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    if (!draft) {
      setSetupState("ready");
      return;
    }

    try {
      const parsed = JSON.parse(draft);
      const parsedFocusArea = isPendingSMARTGoal(parsed) && parsed.focusArea.trim().length > 0 ? parsed.focusArea : "";

      if (area && parsedFocusArea && parsedFocusArea !== area) {
        setSetupState("ready");
        return;
      }

      if (!area && parsedFocusArea) {
        setFocusArea(parsedFocusArea);
      }

      setSmartData(buildSMARTDataFromDraft(parsed));
    } catch {
      // Ignore malformed drafts.
    }

    setSetupState("ready");
  }, []);

  const currentStepData = SMART_STEPS[currentStep];
  const totalSteps = SMART_STEPS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const completedCount = useMemo(
    () => SMART_STEPS.filter((step) => getStepValidationError(step.key as SmartStepKey, smartData) === null).length,
    [smartData],
  );
  const clarityItems = useMemo(() => buildGoalClarityItems(smartData), [smartData]);
  const clarityDoneCount = clarityItems.filter((item) => item.done).length;
  const clarityProgress = (clarityDoneCount / clarityItems.length) * 100;
  const summaryRows = useMemo(
    () =>
      SMART_STEPS.map((step) => ({
        key: step.key as SmartStepKey,
        label: step.label,
        value: formatStepDraft(step.key as SmartStepKey, smartData) || "Chưa có nội dung cho phần này.",
      })),
    [smartData],
  );
  const currentStepError = getStepValidationError(currentStepData.key as SmartStepKey, smartData);
  const specificLength = smartData.specific.goal_statement.trim().length;
  const parsedBaselineValue = parseNumberInput(smartData.measurable.baseline_value);
  const parsedTargetValue = parseNumberInput(smartData.measurable.target_value);
  const metricNameMissing = smartData.measurable.metric_name.trim().length === 0;
  const baselineInvalid = smartData.measurable.baseline_value.trim().length > 0 && parsedBaselineValue === undefined;
  const targetInvalid =
    parsedTargetValue === undefined ||
    (parsedBaselineValue !== undefined && parsedTargetValue !== undefined && parsedTargetValue <= parsedBaselineValue);
  const parsedWeeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours);
  const weeklyHoursInvalid = parsedWeeklyHours === undefined || parsedWeeklyHours <= 0;
  const motivationInvalid = smartData.relevant.motivation_reason.trim().length < 15;
  const parsedTargetWeeks = parseNumberInput(smartData.timeBound.target_weeks);
  const targetWeeksInvalid =
    smartData.timeBound.mode === "weeks" && (parsedTargetWeeks === undefined || parsedTargetWeeks <= 0);
  const targetDateInvalid = smartData.timeBound.mode === "date" && smartData.timeBound.target_date.trim().length === 0;

  const handleGoToFeasibility = () => {
    const measurableTarget = parseNumberInput(smartData.measurable.target_value);
    const weeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours);
    const measurableBaseline = parseNumberInput(smartData.measurable.baseline_value);
    const targetWeeks = parseNumberInput(smartData.timeBound.target_weeks);

    if (measurableTarget === undefined || weeklyHours === undefined) {
      return;
    }
    if (measurableBaseline !== undefined && measurableTarget <= measurableBaseline) {
      return;
    }

    const smartGoal: SmartGoal = buildSmartGoal({
      focusArea,
      specificGoalStatement: smartData.specific.goal_statement,
      measurableMetricName: smartData.measurable.metric_name,
      measurableBaselineValue: measurableBaseline,
      measurableTargetValue: measurableTarget,
      achievableWeeklyTimeCommitmentHours: weeklyHours,
      achievableRequiredSkills: normalizeListInput(smartData.achievable.required_skills),
      achievableSupportResources: normalizeListInput(smartData.achievable.support_resources),
      relevantMotivationReason: smartData.relevant.motivation_reason,
      relevantLifeDimensionAlignment: smartData.relevant.life_dimension_alignment,
      timeBoundTargetDate: smartData.timeBound.mode === "date" ? smartData.timeBound.target_date : undefined,
      timeBoundTargetWeeks: smartData.timeBound.mode === "weeks" ? targetWeeks : undefined,
    });

    localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, JSON.stringify(smartGoal));

    navigate("/feasibility");
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    handleGoToFeasibility();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      return;
    }

    navigate("/life-insight");
  };

  const handleJumpToStep = (stepKey: SmartStepKey) => {
    const nextStep = SMART_STEPS.findIndex((step) => step.key === stepKey);
    if (nextStep >= 0) setCurrentStep(nextStep);
  };

  const currentStepKey = currentStepData.key as SmartStepKey;
  const isCurrentStepValid = currentStepError === null;
  const currentStepHasDraftContent = hasStepDraftContent(currentStepKey, smartData);
  const shouldShowCurrentStepError = currentStepError !== null && currentStepHasDraftContent;
  const currentStepSoftWarning =
    currentStepKey === "specific" &&
    currentStepError === null &&
    !hasOutcomeIndicator(smartData.specific.goal_statement)
      ? "Gợi ý: nên dùng động từ kết quả rõ ràng như đạt, hoàn thành, xây dựng, ra mắt hoặc chạm mốc."
      : null;
  const currentStepActionHint = currentStepData.completionHint;

  if (setupState === "checking") {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Viết mục tiêu"
        loading
        title="Đang chuẩn bị bước viết mục tiêu"
        description="Mình đang kiểm tra dữ liệu cân bằng cuộc sống và trọng tâm đã chọn trước khi mở phần viết mục tiêu."
      />
    );
  }

  if (setupState === "needs_life_balance") {
    return (
      <CoreFlowGateState
        currentStepId="life_balance"
        eyebrow="Viết mục tiêu"
        title="Hoàn thành bước cân bằng trước"
        description="Bước viết mục tiêu cần đi sau dữ liệu cân bằng cuộc sống thật. Hãy chấm điểm các lĩnh vực trước để mục tiêu không bắt đầu từ số mặc định."
        actionLabel="Bắt đầu cân bằng"
        onAction={() => navigate("/onboarding")}
      />
    );
  }

  if (setupState === "needs_life_insight") {
    return (
      <CoreFlowGateState
        currentStepId="life_insight"
        eyebrow="Viết mục tiêu"
        title="Chọn trọng tâm trước"
        description="Bạn đã có dữ liệu cân bằng cuộc sống, nhưng chưa chọn lĩnh vực trọng tâm. Hãy chọn một trọng tâm rồi quay lại viết mục tiêu."
        actionLabel="Mở bước chọn trọng tâm"
        onAction={() => navigate("/life-insight")}
      />
    );
  }

  const renderCurrentStepFields = () => {
    if (currentStepKey === "specific") {
      return (
        <div className="space-y-3">
          <Label htmlFor="smart-specific" className="text-base">
            Câu trả lời của bạn
          </Label>
          <Textarea
            id="smart-specific"
            placeholder={currentStepData.placeholder}
            value={smartData.specific.goal_statement}
            onChange={(event) =>
              setSmartData((previous) => ({
                ...previous,
                specific: {
                  goal_statement: event.target.value,
                },
              }))
            }
            className="min-h-[180px] resize-none text-base leading-7"
            aria-invalid={currentStepKey === "specific" && shouldShowCurrentStepError}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <p>Viết như một kết quả cụ thể mà bạn có thể nhìn thấy hoặc kiểm chứng.</p>
            <p>{specificLength}/20 ký tự tối thiểu</p>
          </div>
        </div>
      );
    }

    if (currentStepKey === "measurable") {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="smart-metric-name" className="text-base">
              Con số hoặc dấu hiệu theo dõi
            </Label>
            <Input
              id="smart-metric-name"
              placeholder="Ví dụ: điểm IELTS, số dự án hoàn thành, doanh thu..."
              value={smartData.measurable.metric_name}
              onChange={(event) =>
                setSmartData((previous) => ({
                  ...previous,
                  measurable: {
                    ...previous.measurable,
                    metric_name: event.target.value,
                  },
                }))
              }
              aria-invalid={currentStepKey === "measurable" && metricNameMissing && currentStepHasDraftContent}
            />
            <p className="text-sm text-slate-500">Chọn một chỉ số đủ rõ để bạn biết mình đang tiến lên hay đứng yên.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smart-baseline">Mốc hiện tại (tuỳ chọn)</Label>
              <Input
                id="smart-baseline"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="VD: 5.5"
                value={smartData.measurable.baseline_value}
                onChange={(event) =>
                  setSmartData((previous) => ({
                    ...previous,
                    measurable: {
                      ...previous.measurable,
                      baseline_value: event.target.value,
                    },
                  }))
                }
                aria-invalid={currentStepKey === "measurable" && baselineInvalid}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smart-target">Mốc mục tiêu</Label>
              <Input
                id="smart-target"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="VD: 7.0"
                value={smartData.measurable.target_value}
                onChange={(event) =>
                  setSmartData((previous) => ({
                    ...previous,
                    measurable: {
                      ...previous.measurable,
                      target_value: event.target.value,
                    },
                  }))
                }
                aria-invalid={currentStepKey === "measurable" && targetInvalid && currentStepHasDraftContent}
              />
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Nếu bạn nhập cả hai mốc, hệ thống sẽ kiểm tra để mốc mục tiêu lớn hơn mốc hiện tại.
          </p>
        </div>
      );
    }

    if (currentStepKey === "achievable") {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="smart-weekly-hours" className="text-base">
              Thời gian mỗi tuần
            </Label>
            <Input
              id="smart-weekly-hours"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="VD: 6"
              value={smartData.achievable.weekly_time_commitment_hours}
              onChange={(event) =>
                setSmartData((previous) => ({
                  ...previous,
                  achievable: {
                    ...previous.achievable,
                    weekly_time_commitment_hours: event.target.value,
                  },
                }))
              }
              aria-invalid={currentStepKey === "achievable" && weeklyHoursInvalid && currentStepHasDraftContent}
            />
            <p className="text-sm text-slate-500">Chỉ tính khung thời gian bạn thực sự có thể giữ đều mỗi tuần.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smart-required-skills">Kỹ năng cần có</Label>
            <Textarea
              id="smart-required-skills"
              placeholder="Mỗi dòng một kỹ năng, hoặc ngăn cách bằng dấu phẩy."
              value={smartData.achievable.required_skills}
              onChange={(event) =>
                setSmartData((previous) => ({
                  ...previous,
                  achievable: {
                    ...previous.achievable,
                    required_skills: event.target.value,
                  },
                }))
              }
              className="min-h-[120px] resize-none text-base leading-7"
            />
            <p className="text-sm text-slate-500">
              Chỉ cần liệt kê những kỹ năng thật sự ảnh hưởng tới kết quả của giai đoạn này.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smart-support-resources">Nguồn lực hỗ trợ</Label>
            <Textarea
              id="smart-support-resources"
              placeholder="Ví dụ: mentor, khóa học, tài liệu, người đồng hành..."
              value={smartData.achievable.support_resources}
              onChange={(event) =>
                setSmartData((previous) => ({
                  ...previous,
                  achievable: {
                    ...previous.achievable,
                    support_resources: event.target.value,
                  },
                }))
              }
              className="min-h-[120px] resize-none text-base leading-7"
            />
            <p className="text-sm text-slate-500">Hãy ghi cả người hỗ trợ lẫn tài nguyên bạn có thể dùng ngay.</p>
          </div>
        </div>
      );
    }

    if (currentStepKey === "relevant") {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="smart-relevant-reason" className="text-base">
              Lý do bạn thật sự muốn theo đuổi
            </Label>
            <Textarea
              id="smart-relevant-reason"
              placeholder={currentStepData.placeholder}
              value={smartData.relevant.motivation_reason}
              onChange={(event) =>
                setSmartData((previous) => ({
                  ...previous,
                  relevant: {
                    ...previous.relevant,
                    motivation_reason: event.target.value,
                  },
                }))
              }
              className="min-h-[160px] resize-none text-base leading-7"
              aria-invalid={currentStepKey === "relevant" && motivationInvalid && currentStepHasDraftContent}
            />
            <p className="text-sm text-slate-500">
              Hãy viết đủ cụ thể để khi mệt bạn vẫn nhớ vì sao mục tiêu này đáng giữ.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="smart-life-alignment">Lĩnh vực cuộc sống liên quan (tuỳ chọn)</Label>
            <Input
              id="smart-life-alignment"
              placeholder="Ví dụ: sự nghiệp, tài chính, sức khỏe..."
              value={smartData.relevant.life_dimension_alignment}
              onChange={(event) =>
                setSmartData((previous) => ({
                  ...previous,
                  relevant: {
                    ...previous.relevant,
                    life_dimension_alignment: event.target.value,
                  },
                }))
              }
            />
            <p className="text-sm text-slate-500">Bạn có thể bỏ qua nếu lý do ở trên đã đủ rõ.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm text-slate-600">
            Chọn cách chốt thời hạn phù hợp nhất với cách bạn muốn theo dõi kế hoạch này.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant={smartData.timeBound.mode === "weeks" ? "default" : "outline"}
            onClick={() =>
              setSmartData((previous) => ({
                ...previous,
                timeBound: {
                  ...previous.timeBound,
                  mode: "weeks",
                  target_date: "",
                  target_weeks: previous.timeBound.target_weeks || DEFAULT_TARGET_WEEKS,
                },
              }))
            }
          >
            Theo số tuần
          </Button>
          <Button
            variant={smartData.timeBound.mode === "date" ? "default" : "outline"}
            onClick={() =>
              setSmartData((previous) => ({
                ...previous,
                timeBound: {
                  ...previous.timeBound,
                  mode: "date",
                },
              }))
            }
          >
            Theo ngày cụ thể
          </Button>
        </div>

        {smartData.timeBound.mode === "weeks" ? (
          <div className="space-y-2">
            <Label htmlFor="smart-target-weeks" className="text-base">
              Số tuần mục tiêu
            </Label>
            <Input
              id="smart-target-weeks"
              type="number"
              inputMode="numeric"
              min={1}
              value={smartData.timeBound.target_weeks}
              onChange={(event) =>
                setSmartData((previous) => ({
                  ...previous,
                  timeBound: {
                    ...previous.timeBound,
                    target_weeks: event.target.value,
                  },
                }))
              }
              aria-invalid={targetWeeksInvalid}
            />
            <p className="text-sm text-slate-500">
              Gợi ý: 12 tuần là chu kỳ hợp lý để nối sang bước lập kế hoạch tiếp theo.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="smart-target-date" className="text-base">
              Ngày mục tiêu
            </Label>
            <Input
              id="smart-target-date"
              type="date"
              value={smartData.timeBound.target_date}
              onChange={(event) =>
                setSmartData((previous) => ({
                  ...previous,
                  timeBound: {
                    ...previous.timeBound,
                    target_date: event.target.value,
                  },
                }))
              }
              aria-invalid={targetDateInvalid}
            />
            <p className="text-sm text-slate-500">Chọn mốc ngày đủ rõ để bạn có thể nhìn lại tiến độ.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flow-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-7xl space-y-5"
      >
        <CoreFlowProgress currentStepId="smart_goal" />

        <Card className="hero-surface flow-surface overflow-hidden">
          <CardContent className="relative p-5 sm:p-6 lg:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

            <div className="relative max-w-4xl">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Viết mục tiêu rõ
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-3xl font-bold tracking-normal lg:text-4xl">
                    Biến trọng tâm vừa chọn thành một mục tiêu rõ, đo được và đủ thực tế để bắt đầu.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Màn này chỉ giữ 5 câu hỏi quan trọng: muốn đạt gì, đo bằng gì, có đủ điều kiện không, vì sao đáng
                    làm, và khi nào cần nhìn lại. Sau đó mục tiêu sẽ đi sang bước kiểm tra tính thực tế.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    Liên kết với: {getLifeAreaLabel(focusArea)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Hoàn thành: {completedCount}/{totalSteps}
                  </Badge>
                </div>
              </div>

              <div className="hidden flow-panel p-5 sm:p-6">
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>
                    Bước {currentStep + 1} / {totalSteps}
                  </span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="mt-3 h-2.5 bg-white/20" />

                <div className="mt-6 space-y-3">
                  {SMART_STEPS.map((step, index) => {
                    const done = getStepValidationError(step.key as SmartStepKey, smartData) === null;
                    const active = index === currentStep;

                    return (
                      <div
                        key={step.key}
                        className={`rounded-[22px] border px-4 py-3 transition-all ${
                          active
                            ? "border-slate-300 bg-slate-100"
                            : done
                              ? "border-slate-200 bg-white"
                              : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mx-auto max-w-4xl">
          <Card className="flow-panel overflow-hidden">
            <CardContent className="p-5 sm:p-6 lg:p-7">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flow-muted p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                    {currentStepData.label}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-slate-900">{currentStepData.title}</h2>
                  <p className="mt-3 text-base leading-7 text-slate-600">{currentStepData.description}</p>
                  <div className="flow-panel mt-4 px-4 py-3 text-sm text-slate-600">{currentStepData.coaching}</div>
                </div>
                {renderCurrentStepFields()}
                <div className="rounded-[24px] border border-slate-200 bg-white/82 p-4 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.22)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Độ rõ của mục tiêu</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Hoàn thành các điểm này để mục tiêu dễ chuyển sang kế hoạch 12 tuần hơn.
                      </p>
                    </div>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      {clarityDoneCount}/{clarityItems.length}
                    </Badge>
                  </div>
                  <Progress value={clarityProgress} className="mt-4 h-2" aria-label={`Độ rõ của mục tiêu: ${clarityDoneCount}/${clarityItems.length}`} />
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {clarityItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleJumpToStep(item.stepKey)}
                        className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                          item.done
                            ? "border-emerald-200 bg-emerald-50/80 hover:border-emerald-300"
                            : "border-slate-200 bg-slate-50/80 hover:border-violet-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                              item.done ? "bg-emerald-600 text-white" : "bg-white text-slate-400"
                            }`}
                          >
                            {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">{item.detail}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {currentStepKey === "timeBound" ? (
                  <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Tóm tắt trước khi kiểm tra</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Xem lại nhanh các phần chính trước khi sang bước kiểm tra tính thực tế.
                        </p>
                      </div>
                      <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-700">
                        Sẵn sàng: {clarityDoneCount}/{clarityItems.length}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {summaryRows.map((row) => (
                        <div key={row.key} className="rounded-2xl border border-white/80 bg-white/82 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                {row.label}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-700">{row.value}</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleJumpToStep(row.key)}>
                              Sửa
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {shouldShowCurrentStepError ? (
                  <Alert className="border-rose-200 bg-rose-50/85 text-rose-700">
                    <CircleAlert className="h-4 w-4" />
                    <AlertTitle>Cần hoàn tất bước này</AlertTitle>
                    <AlertDescription className="text-rose-700/90">{currentStepError}</AlertDescription>
                  </Alert>
                ) : null}
                {currentStepSoftWarning ? (
                  <Alert className="border-amber-200 bg-amber-50/85 text-amber-700">
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle>Gợi ý để mục tiêu rõ hơn</AlertTitle>
                    <AlertDescription className="text-amber-700/90">{currentStepSoftWarning}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flow-muted p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Tiếp tục viết mục tiêu
                    </p>
                    <p className="text-sm text-slate-600">{currentStepActionHint}</p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" className="flex-1" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4" />
                      Quay lại
                    </Button>
                    <Button className="flex-1" onClick={handleNext} disabled={!isCurrentStepValid}>
                      {currentStep < totalSteps - 1 ? "Tiếp theo" : "Tiếp theo: kiểm tra tính thực tế"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <details className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white/78 p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.24)]">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Xem lại mục tiêu đang viết
            </summary>

            <div className="mt-4 space-y-3">
              {SMART_STEPS.map((step) => (
                <div key={step.key} className="flow-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {formatStepDraft(step.key as SmartStepKey, smartData) || "Chưa có nội dung cho phần này."}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </motion.div>
    </div>
  );
}
