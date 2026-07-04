import { BookOpen, Check, ChevronDown, Gauge, Lightbulb, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { cn } from "@/app/components/ui/utils";
import { parseNumberInput } from "@/lib/smart-goal";
import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";

import { FieldError } from "../../../components/ui/field-error";
import { Textarea } from "../../../components/ui/textarea";
import { FOCUS_AREA_EXAMPLES } from "../constants";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { helperTextClass, labelClass, requiredMarkerClass, textareaClass } from "./formStyles";

interface AchievableStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  currentStepHasDraftContent: boolean;
  archetype: GoalArchetype;
  focusArea?: string;
}

const getDailyCommitmentString = (weeklyHours: number) => {
  if (weeklyHours <= 0) return "";
  const totalMinutes = weeklyHours * 60;
  const dailyMinutes = Math.round(totalMinutes / 7);
  if (dailyMinutes < 60) {
    return `tương đương khoảng ~${dailyMinutes} phút mỗi ngày`;
  }
  const dailyHours = weeklyHours / 7;
  return `tương đương khoảng ~${dailyHours.toFixed(1).replace(".0", "")} giờ mỗi ngày`;
};

interface AccordionSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ id, title, icon, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="rounded-[14px] border border-app-line/70 bg-app-surface/40 overflow-hidden">
      <button
        id={id}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-app-bg-subtle/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-inset"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-app-ink">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
            {icon}
          </span>
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-app-ink-muted transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
        aria-hidden={!isOpen}
      >
        <div className="p-4 pt-0">{children}</div>
      </div>
    </div>
  );
}

export function AchievableStep({
  smartData,
  setSmartData,
  currentStepHasDraftContent,
  archetype,
  focusArea,
}: AchievableStepProps) {
  const [hasBlurredWeeklyHours, setHasBlurredWeeklyHours] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    time: true,
    skills: false,
    resources: false,
  });

  const parsedWeeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours) ?? 0;
  const weeklyHoursInvalid = parsedWeeklyHours <= 0;
  const showWeeklyHoursError = weeklyHoursInvalid && (hasBlurredWeeklyHours || currentStepHasDraftContent);

  const getFeasibilityDetails = (hours: number) => {
    if (hours === 0)
      return { label: "Chưa chọn", color: "text-app-ink-muted bg-app-bg", colorBorder: "border-app-line" };
    if (hours <= 3) {
      return {
        label: "Nhẹ nhàng (Dễ dàng duy trì)",
        color: "text-app-status-success bg-app-status-success/10 dark:bg-app-status-success/20",
        colorBorder: "border-app-status-success/30",
      };
    }
    if (hours <= 8) {
      return {
        label: "Thách thức (Cần kỷ luật đều đặn)",
        color: "text-app-status-info bg-app-status-info/10 dark:bg-app-status-info/20",
        colorBorder: "border-app-status-info/30",
      };
    }
    if (hours <= 15) {
      return {
        label: "Nỗ lực lớn (Phải ưu tiên hàng đầu)",
        color: "text-app-status-warning bg-app-status-warning/10 dark:bg-app-status-warning/20",
        colorBorder: "border-app-status-warning/30",
      };
    }
    return {
      label: "Rủi ro quá tải (Khó giữ nhịp dài hạn)",
      color: "text-app-status-error bg-app-status-error/10 dark:bg-app-status-error/20",
      colorBorder: "border-app-status-error/30",
    };
  };

  const feasibility = getFeasibilityDetails(parsedWeeklyHours);

  const handleHoursChange = (val: string) => {
    setSmartData((previous) => ({
      ...previous,
      achievable: {
        ...previous.achievable,
        weekly_time_commitment_hours: val,
      },
    }));
  };

  const toggleSection = (key: string) => {
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const focusSkillSuggestions = () => {
    if (!focusArea || !FOCUS_AREA_EXAMPLES[focusArea]) return [];
    return FOCUS_AREA_EXAMPLES[focusArea].achievable.flatMap((a) => a.skills.split(",").map((s) => s.trim()));
  };

  const focusResourceSuggestions = () => {
    if (!focusArea || !FOCUS_AREA_EXAMPLES[focusArea]) return [];
    return FOCUS_AREA_EXAMPLES[focusArea].achievable.flatMap((a) => a.resources.split(",").map((r) => r.trim()));
  };

  const skillSuggestions = (() => {
    const fromFocus = focusSkillSuggestions();
    if (fromFocus.length > 0) return [...new Set(fromFocus)];
    switch (archetype) {
      case "habit_building":
        return [
          "Kỷ luật tự giác",
          "Quản lý thời gian",
          "Thiết lập thói quen",
          "Theo dõi tiến độ hàng ngày",
        ];
      case "skill_learning":
        return ["Tự học nghiên cứu", "Đọc hiểu tài liệu", "Thực hành thực tế", "Nhận phản hồi và sửa lỗi"];
      case "project_completion":
        return ["Lập kế hoạch công việc", "Giải quyết vấn đề", "Quản lý tiến độ", "Phối hợp nhóm/đối tác"];
      case "financial_goal":
        return ["Quản lý ngân sách", "Theo dõi dòng tiền", "Phân tích chi phí-cơ hội", "Kỷ luật tiêu dùng"];
      default:
        return ["Quản lý thời gian", "Kỷ luật thực thi", "Tự quan sát và điều chỉnh"];
    }
  })();

  const resourceSuggestions = (() => {
    const fromFocus = focusResourceSuggestions();
    if (fromFocus.length > 0) return [...new Set(fromFocus)];
    switch (archetype) {
      case "habit_building":
        return ["Ứng dụng ghi nhận", "Người đồng hành", "Chuông báo nhắc nhở", "Bảng theo dõi thói quen"];
      case "skill_learning":
        return ["Khóa học online", "Mentor hướng dẫn", "Cộng đồng học tập", "Tài liệu và bài tập thực hành"];
      case "project_completion":
        return ["Tài liệu hướng dẫn", "Mentor đánh giá", "Trello/Notion", "Template check-list công việc"];
      case "financial_goal":
        return ["Ứng dụng quản lý chi tiêu", "Bảng theo dõi tiết kiệm", "Tư vấn tài chính", "Tài khoản tiết kiệm riêng"];
      default:
        return ["Lịch tuần cá nhân", "Không gian yên tĩnh", "Người đồng hành đồng lòng"];
    }
  })();

  const appendToField = (field: "required_skills" | "support_resources", value: string) => {
    setSmartData((previous) => {
      const current = previous.achievable[field].trim();
      const updated = current ? `${current}, ${value}` : value;
      return {
        ...previous,
        achievable: {
          ...previous.achievable,
          [field]: updated,
        },
      };
    });
  };

  return (
    <div className="space-y-4">
      <AccordionSection
        id="achievable-time"
        title="Thời gian mỗi tuần"
        icon={<Gauge className="h-3.5 w-3.5" />}
        isOpen={openSections.time}
        onToggle={() => toggleSection("time")}
      >
        <div className="space-y-4">
          <label
            htmlFor="smart-weekly-hours-slider"
            className={cn(labelClass, "flex items-center gap-1.5")}
          >
            Bạn dành bao nhiêu giờ/tuần?
            <span className={requiredMarkerClass} aria-hidden="true">
              *
            </span>
            <span className="sr-only"> bắt buộc</span>
          </label>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
            <div
              className={cn(
                "flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed transition-all duration-300 bg-app-surface",
                feasibility.colorBorder,
                feasibility.color
              )}
            >
              <div className="absolute -top-2 left-1/2 hidden -translate-x-1/2" />
              <span className="text-3xl font-extrabold tabular-nums tracking-[-0.03em]">{parsedWeeklyHours}</span>
              <span className="text-[10px] font-bold text-current/75">giờ/tuần</span>
            </div>

            <div className="w-full space-y-3">
              <input
                id="smart-weekly-hours-slider"
                type="range"
                min="1"
                max="24"
                step="1"
                value={parsedWeeklyHours || 1}
                onChange={(e) => handleHoursChange(e.target.value)}
                onBlur={() => setHasBlurredWeeklyHours(true)}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-app-line accent-app-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2"
                aria-invalid={showWeeklyHoursError}
                aria-describedby={showWeeklyHoursError ? "smart-weekly-hours-error" : undefined}
              />

              <div className="flex items-center justify-between text-xs text-app-ink-muted">
                <span>1 giờ</span>
                <span>12 giờ</span>
                <span>24 giờ</span>
              </div>

              {parsedWeeklyHours > 0 && (
                <div
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-all duration-300",
                    feasibility.color,
                    feasibility.colorBorder
                  )}
                >
                  <span className="flex h-2 w-2 rounded-full bg-current" />
                  <span>Tính khả thi: {feasibility.label}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {["2", "4", "8", "12"].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => {
                  handleHoursChange(hours);
                  setHasBlurredWeeklyHours(true);
                }}
                className={cn(
                  "inline-flex min-h-9 items-center justify-center text-xs px-3 py-1.5 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none",
                  parsedWeeklyHours === Number(hours)
                    ? "bg-app-accent text-white border-app-accent shadow-app-md shadow-app-accent/20"
                    : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/10"
                )}
              >
                {hours} giờ/tuần
              </button>
            ))}
          </div>

          <p className={cn(helperTextClass, "!mt-2")}>
            Cam kết thời gian thực tế bạn duy trì được mỗi tuần.
            {parsedWeeklyHours > 0 && (
              <>
                {" "}
                Định mức: <span className="font-bold text-app-ink">{parsedWeeklyHours} giờ/tuần</span> (
                {getDailyCommitmentString(parsedWeeklyHours)}).
              </>
            )}
          </p>
          {showWeeklyHoursError ? (
            <FieldError id="smart-weekly-hours-error" message="Nhập số giờ mỗi tuần lớn hơn 0." role="alert" />
          ) : null}
        </div>
      </AccordionSection>

      <AccordionSection
        id="achievable-skills"
        title="Kỹ năng cần rèn luyện"
        icon={<BookOpen className="h-3.5 w-3.5" />}
        isOpen={openSections.skills}
        onToggle={() => toggleSection("skills")}
      >
        <div className="space-y-3">
          <Textarea
            id="smart-required-skills"
            placeholder="Ví dụ: Kỹ năng thuyết trình, Lập trình React cơ bản..."
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
            className={`${textareaClass} min-h-[90px]`}
          />

          <div className="flex flex-wrap gap-1.5">
            {skillSuggestions.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => appendToField("required_skills", skill)}
                className="inline-flex items-center gap-1 text-xs bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-2.5 py-1.5 rounded-full border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:outline-none cursor-pointer shadow-sm"
              >
                + {skill}
              </button>
            ))}
          </div>

          <p className={cn(helperTextClass, "!mt-2")}>
            Liệt kê các kỹ năng, cách nhau bằng dấu phẩy.
          </p>
        </div>
      </AccordionSection>

      <AccordionSection
        id="achievable-resources"
        title="Nguồn lực & công cụ hỗ trợ"
        icon={<Check className="h-3.5 w-3.5" />}
        isOpen={openSections.resources}
        onToggle={() => toggleSection("resources")}
      >
        <div className="space-y-3">
          <Textarea
            id="smart-support-resources"
            placeholder="Ví dụ: Tài khoản Udemy, sách chuyên ngành, mentor..."
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
            className={`${textareaClass} min-h-[90px]`}
          />

          <div className="flex flex-wrap gap-1.5">
            {resourceSuggestions.map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => appendToField("support_resources", res)}
                className="inline-flex items-center gap-1 text-xs bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-2.5 py-1.5 rounded-full border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:outline-none cursor-pointer shadow-sm"
              >
                + {res}
              </button>
            ))}
          </div>

          <p className={cn(helperTextClass, "!mt-2")}>
            Liệt kê nguồn lực hoặc công cụ giúp bạn duy trì mục tiêu.
          </p>
        </div>
      </AccordionSection>

      <details className="group rounded-[14px] border border-app-line bg-app-bg-subtle p-3.5 select-none">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-bold text-app-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-app-accent" aria-hidden="true" /> Mẹo chọn nguồn lực thực tế
          </span>
          <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-2.5 border-t border-app-line pt-3 sm:grid-cols-2">
          <div className="rounded-xl border border-app-accent/10 bg-app-accent-soft/40 p-3 flex items-start gap-2.5 text-xs leading-relaxed">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent mt-0.5">
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-app-accent">Nên chọn:</p>
              <p className="mt-0.5 text-app-ink-soft italic">
                "Khóa học Udemy đã mua" hoặc "1 người bạn cùng tham gia."
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-app-status-error/10 bg-app-status-error/10 p-3 flex items-start gap-2.5 text-xs leading-relaxed">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-status-error/10 text-app-status-error mt-0.5">
              <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-app-status-error">Tránh:</p>
              <p className="mt-0.5 text-app-ink-soft italic">
                "Nhờ chuyên gia hàng đầu" hoặc nguồn lực chưa chắc chắn.
              </p>
            </div>
          </div>
        </div>
      </details>

      <ArchetypeHint archetype={archetype} variant="leadAction" />
    </div>
  );
}
