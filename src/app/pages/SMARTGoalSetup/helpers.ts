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
import type { DimensionScore, QualityDimension, SmartGoalQualityResult } from "@/lib/smart-goal/quality";

import { DEFAULT_TARGET_WEEKS } from "./constants";
import type { GoalClarityItem, SMARTData, SmartStepKey } from "./types";

export function createInitialSMARTData(): SMARTData {
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

export function buildSMARTDataFromDraft(parsed: unknown): SMARTData {
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

export function formatStepDraft(stepKey: SmartStepKey, smartData: SMARTData): string {
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

export function hasStepDraftContent(stepKey: SmartStepKey, smartData: SMARTData): boolean {
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

export function getStepValidationError(stepKey: SmartStepKey, smartData: SMARTData): string | null {
  if (stepKey === "specific") {
    const value = smartData.specific.goal_statement.trim();
    if (value.length < 10) {
      return "Mục tiêu cụ thể cần ít nhất 10 ký tự có nghĩa";
    }
    return null;
  }

  if (stepKey === "measurable") {
    if (smartData.measurable.metric_name.trim().length === 0) {
      return "Chọn một con số hoặc dấu hiệu rõ để theo dõi.";
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
      return "Tối thiểu 15 ký tự để lý do đủ rõ.";
    }
    return null;
  }

  if (smartData.timeBound.mode === "date") {
    return smartData.timeBound.target_date.trim().length > 0 ? null : "Chọn ngày mục tiêu cho kế hoạch này.";
  }

  const targetWeeks = parseNumberInput(smartData.timeBound.target_weeks);
  if (targetWeeks === undefined || targetWeeks <= 0) {
    return "Số tuần mục tiêu phải là số dương hợp lệ.";
  }

  return null;
}

export function buildSmartGoalFromFormData(smartData: SMARTData, focusArea: string): SmartGoal {
  return buildSmartGoal({
    focusArea,
    specificGoalStatement: smartData.specific.goal_statement,
    measurableMetricName: smartData.measurable.metric_name,
    measurableBaselineValue: parseNumberInput(smartData.measurable.baseline_value),
    measurableTargetValue: parseNumberInput(smartData.measurable.target_value) ?? 0,
    achievableWeeklyTimeCommitmentHours:
      parseNumberInput(smartData.achievable.weekly_time_commitment_hours) ?? 0,
    achievableRequiredSkills: normalizeListInput(smartData.achievable.required_skills),
    achievableSupportResources: normalizeListInput(smartData.achievable.support_resources),
    relevantMotivationReason: smartData.relevant.motivation_reason,
    relevantLifeDimensionAlignment: smartData.relevant.life_dimension_alignment,
    timeBoundTargetDate:
      smartData.timeBound.mode === "date" ? smartData.timeBound.target_date : undefined,
    timeBoundTargetWeeks:
      smartData.timeBound.mode === "weeks"
        ? parseNumberInput(smartData.timeBound.target_weeks)
        : undefined,
  });
}

const STEP_QUALITY_DIMENSIONS: Record<SmartStepKey, QualityDimension[]> = {
  specific: ["specificity"],
  measurable: ["measurableClarity", "baselineTargetQuality"],
  achievable: ["achievableRealism", "resourceSupportClarity"],
  relevant: ["relevanceMotivation"],
  timeBound: ["timeBoundClarity", "twelveWeekCompatibility"],
};

const DIMENSION_HINTS: Partial<Record<QualityDimension, string>> = {
  specificity:
    "Gợi ý: dùng động từ kết quả rõ ràng như đạt, hoàn thành, xây dựng để mục tiêu có hướng.",
  measurableClarity: "Gợi ý: thêm đơn vị đo giúp chỉ số rõ ràng hơn.",
  baselineTargetQuality:
    "Gợi ý: thêm mốc hiện tại (baseline) để đánh giá khoảng cách cần vượt qua.",
  resourceSupportClarity:
    "Gợi ý: thêm kỹ năng và nguồn hỗ trợ giúp kiểm tra tính khả thi chính xác hơn.",
  relevanceMotivation:
    "Gợi ý: gắn với lĩnh vực cuộc sống (sự nghiệp, sức khỏe...) giúp giữ cam kết lâu hơn.",
  twelveWeekCompatibility:
    "Gợi ý: chu kỳ 8–16 tuần phù hợp nhất với hệ thống 12 tuần.",
};

export function getStepQualityHint(
  stepKey: SmartStepKey,
  qualityResult: SmartGoalQualityResult,
  hasContent: boolean,
): string | null {
  if (!hasContent) return null;

  const dimensionKeys = STEP_QUALITY_DIMENSIONS[stepKey];
  if (!dimensionKeys) return null;

  const weakDimensions = dimensionKeys
    .map((key) => qualityResult.dimensions.find((d: DimensionScore) => d.dimension === key))
    .filter(
      (d): d is DimensionScore => d !== undefined && d.score < d.maxScore * 0.5,
    );

  if (weakDimensions.length === 0) return null;

  return DIMENSION_HINTS[weakDimensions[0].dimension] ?? null;
}

export function getQualityScoreBucket(score: number): string {
  if (score < 20) return "0-19";
  if (score < 40) return "20-39";
  if (score < 60) return "40-59";
  if (score < 80) return "60-79";
  return "80-100";
}

export function buildGoalClarityItems(smartData: SMARTData): GoalClarityItem[] {
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
      detail: metricReady
        ? "Đã có chỉ số và mốc muốn chạm tới."
        : "Cần một chỉ số và mốc muốn chạm tới để tránh đoán cảm tính.",
      done: metricReady,
      stepKey: "measurable",
    },
    {
      id: "achievable",
      label: "Có thời gian thật",
      detail:
        weeklyHours !== undefined && weeklyHours > 0
          ? `Bạn đang dành khoảng ${weeklyHours} giờ mỗi tuần.`
          : "Nhập số giờ mỗi tuần bạn thật sự giữ được.",
      done: weeklyHours !== undefined && weeklyHours > 0,
      stepKey: "achievable",
    },
    {
      id: "relevant",
      label: "Có lý do đủ mạnh",
      detail:
        motivation.length >= 15
          ? "Lý do đã đủ rõ để nhắc bạn khi khó giữ nhịp."
          : "Viết lý do đủ thật để mục tiêu này đáng theo đuổi.",
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
