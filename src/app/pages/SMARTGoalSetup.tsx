import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CheckCircle2,
  Compass,
  Sparkles,
  Target,
} from "lucide-react";

import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Textarea } from "../components/ui/textarea";
import { APP_STORAGE_KEYS, getLifeAreaLabel } from "../utils/storage";
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
        return smartData.timeBound.target_date.trim()
          ? `Mốc đến ${smartData.timeBound.target_date.trim()}`
          : "";
      }
      return smartData.timeBound.target_weeks.trim()
        ? `Trong ${smartData.timeBound.target_weeks.trim()} tuần`
        : "";
    default:
      return "";
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
      return "Cần nhập tên chỉ số đo lường.";
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
    return smartData.timeBound.target_date.trim().length > 0
      ? null
      : "Hãy chọn ngày mục tiêu cho kế hoạch này.";
  }

  const targetWeeks = parseNumberInput(smartData.timeBound.target_weeks);
  if (targetWeeks === undefined || targetWeeks <= 0) {
    return "Số tuần mục tiêu phải là số dương hợp lệ.";
  }

  return null;
}

const SMART_STEPS = [
  {
    key: "specific" as keyof SMARTData,
    label: "Cụ thể",
    title: "Bạn muốn đạt được chính xác điều gì?",
    placeholder:
      "Ví dụ: Tôi muốn được thăng chức lên vị trí Lập trình viên cao cấp và dẫn dắt một dự án quan trọng.",
    description:
      "Mục tiêu càng rõ thì năng lượng hành động càng dễ tập trung. Tránh những câu quá rộng hoặc mơ hồ.",
    coaching: "Hãy mô tả kết quả cuối cùng, không chỉ nói về mong muốn chung chung.",
  },
  {
    key: "measurable" as keyof SMARTData,
    label: "Đo được",
    title: "Bạn sẽ biết mình đang tiến bộ bằng cách nào?",
    placeholder:
      "Ví dụ: Hoàn thành 3 khóa học nâng cao, dẫn dắt 2 tính năng lớn và nhận đánh giá tốt từ quản lý.",
    description:
      "Đặt ra dấu hiệu cụ thể để bạn không phải đoán cảm tính rằng mình có đang đi đúng hướng hay không.",
    coaching: "Hãy nghĩ bằng số lượng, cột mốc, đầu ra hoặc tiêu chí dễ quan sát.",
  },
  {
    key: "achievable" as keyof SMARTData,
    label: "Khả thi",
    title: "Bạn cần những nguồn lực, kỹ năng hay điều kiện nào?",
    placeholder:
      "Ví dụ: cần 5 giờ học mỗi tuần, mentor góp ý định kỳ và thời gian thực hành có lịch cố định.",
    description:
      "Phần này giúp mục tiêu bớt mơ hồ và kéo nó gần hơn với đời sống thật của bạn.",
    coaching: "Nghĩ đến thời gian, kỹ năng, người hỗ trợ và môi trường bạn cần.",
  },
  {
    key: "relevant" as keyof SMARTData,
    label: "Liên quan",
    title: "Tại sao mục tiêu này thực sự quan trọng với bạn?",
    placeholder:
      "Ví dụ: Vì nó gắn trực tiếp với tầm nhìn nghề nghiệp 3 năm tới và mức thu nhập tôi đang hướng đến.",
    description:
      "Khi mục tiêu gắn với một lý do đủ mạnh, bạn sẽ dễ giữ được kỷ luật hơn trong giai đoạn khó.",
    coaching: "Viết theo kiểu: mục tiêu này quan trọng vì...",
  },
  {
    key: "timeBound" as keyof SMARTData,
    label: "Thời hạn",
    title: "Bạn muốn đạt được điều này vào khi nào?",
    placeholder: "Ví dụ: Trong vòng 12 tháng, trước tháng 3 năm 2027.",
    description:
      "Thời hạn tạo ra nhịp. Không cần quá gấp, nhưng cần đủ rõ để buộc bạn ra quyết định.",
    coaching: "Nếu chưa chắc ngày cụ thể, ít nhất hãy đưa ra khung tuần hoặc tháng.",
  },
];

export function SMARTGoalSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [focusArea, setFocusArea] = useState<string>("");
  const [smartData, setSmartData] = useState<SMARTData>(createInitialSMARTData());

  useEffect(() => {
    const area = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const fallbackArea = area || "Personal Growth";
    setFocusArea(fallbackArea);

    const draft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    if (!draft) return;

    try {
      const parsed = JSON.parse(draft);
      const parsedFocusArea =
        isPendingSMARTGoal(parsed) && parsed.focusArea.trim().length > 0
          ? parsed.focusArea
          : "";

      if (area && parsedFocusArea && parsedFocusArea !== area) {
        return;
      }

      if (!area && parsedFocusArea) {
        setFocusArea(parsedFocusArea);
      }

      setSmartData(buildSMARTDataFromDraft(parsed));
    } catch {
      // Ignore malformed drafts.
    }
  }, []);

  const currentStepData = SMART_STEPS[currentStep];
  const totalSteps = SMART_STEPS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const completedCount = useMemo(
    () =>
      SMART_STEPS.filter((step) => getStepValidationError(step.key as SmartStepKey, smartData) === null)
        .length,
    [smartData],
  );
  const currentStepError = getStepValidationError(currentStepData.key as SmartStepKey, smartData);
  const specificLength = smartData.specific.goal_statement.trim().length;
  const parsedBaselineValue = parseNumberInput(smartData.measurable.baseline_value);
  const parsedTargetValue = parseNumberInput(smartData.measurable.target_value);
  const metricNameMissing = smartData.measurable.metric_name.trim().length === 0;
  const baselineInvalid =
    smartData.measurable.baseline_value.trim().length > 0 && parsedBaselineValue === undefined;
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
      timeBoundTargetDate:
        smartData.timeBound.mode === "date" ? smartData.timeBound.target_date : undefined,
      timeBoundTargetWeeks:
        smartData.timeBound.mode === "weeks" ? targetWeeks : undefined,
    });

    localStorage.setItem(
      APP_STORAGE_KEYS.pendingSmartGoal,
      JSON.stringify(smartGoal),
    );

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

  const currentStepKey = currentStepData.key as SmartStepKey;
  const isCurrentStepValid = currentStepError === null;
  const currentStepSoftWarning =
    currentStepKey === "specific" &&
    currentStepError === null &&
    !hasOutcomeIndicator(smartData.specific.goal_statement)
      ? "Gợi ý: nên dùng động từ kết quả rõ ràng như đạt, hoàn thành, xây dựng, ra mắt hoặc chạm mốc."
      : null;
  const currentStepActionHint =
    currentStep < totalSteps - 1
      ? "Hoàn tất bước này để mở bước tiếp theo trong flow SMART."
      : "Hoàn tất bước này để chuyển sang bước kiểm tra tính khả thi.";

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
            aria-invalid={currentStepKey === "specific" && currentStepError !== null}
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
              Chỉ số đo lường
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
              aria-invalid={currentStepKey === "measurable" && metricNameMissing}
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
              aria-invalid={currentStepKey === "measurable" && targetInvalid}
              />
            </div>
          </div>
          <p className="text-sm text-slate-500">Nếu bạn nhập cả hai mốc, hệ thống sẽ kiểm tra để mốc mục tiêu lớn hơn mốc hiện tại.</p>
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
              aria-invalid={currentStepKey === "achievable" && weeklyHoursInvalid}
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
            <p className="text-sm text-slate-500">Chỉ cần liệt kê những kỹ năng thật sự ảnh hưởng tới kết quả của giai đoạn này.</p>
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
              aria-invalid={currentStepKey === "relevant" && motivationInvalid}
            />
            <p className="text-sm text-slate-500">Hãy viết đủ cụ thể để khi mệt bạn vẫn nhớ vì sao mục tiêu này đáng giữ.</p>
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
          <p className="text-sm text-slate-600">Chọn cách chốt thời hạn phù hợp nhất với cách bạn muốn theo dõi kế hoạch này.</p>
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
            <p className="text-sm text-slate-500">Gợi ý: 12 tuần là chu kỳ hợp lý để nối sang phần planning tiếp theo.</p>
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
            <p className="text-sm text-slate-500">Chọn mốc ngày đủ rõ để bạn có thể review tiến độ ngược trở lại.</p>
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

            <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Mục tiêu SMART
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-3xl font-bold tracking-normal lg:text-4xl">
                    Chúng ta sẽ biến insight vừa có thành một mục tiêu đủ rõ để bắt đầu hành động.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    SMART không phải chỉ để viết cho đẹp. Nó giúp mục tiêu của bạn trở nên rõ hơn,
                    thực tế hơn và dễ mang sang bước đánh giá khả thi cũng như hệ 12 tuần phía sau.
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

              <div className="flow-panel p-5 sm:p-6">
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>Bước {currentStep + 1} / {totalSteps}</span>
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
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
                  <div className="flow-panel mt-4 px-4 py-3 text-sm text-slate-600">
                    {currentStepData.coaching}
                  </div>
                </div>
                {renderCurrentStepFields()}
                {currentStepError ? (
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
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tiếp tục flow SMART</p>
                    <p className="text-sm text-slate-600">{currentStepActionHint}</p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" className="flex-1" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4" />
                      Quay lại
                    </Button>
                    <Button className="flex-1" onClick={handleNext} disabled={!isCurrentStepValid}>
                      {currentStep < totalSteps - 1
                        ? "Tiếp theo"
                        : "Tiếp theo: kiểm tra tính khả thi"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <div className="space-y-5 xl:sticky xl:top-28">
            <Card className="flow-panel">
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Bản nháp hiện tại
                </p>

                <div className="mt-5 space-y-3">
                  {SMART_STEPS.map((step) => (
                    <div
                      key={step.key}
                      className="flow-muted p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {step.label}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {formatStepDraft(step.key as SmartStepKey, smartData) ||
                          "Chưa có nội dung cho phần này."}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
