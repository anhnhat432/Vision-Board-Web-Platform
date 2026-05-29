import { useState, type Dispatch, type SetStateAction } from "react";
import { Gauge } from "lucide-react";

import { parseNumberInput } from "@/lib/smart-goal";
import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";
import { cn } from "@/app/components/ui/utils";

import { FieldError } from "../../../components/ui/field-error";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { helperTextClass, labelClass, requiredMarkerClass, textareaClass } from "./formStyles";

interface AchievableStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  currentStepHasDraftContent: boolean;
  archetype: GoalArchetype;
}

export function AchievableStep({
  smartData,
  setSmartData,
  currentStepHasDraftContent,
  archetype,
}: AchievableStepProps) {
  const [hasBlurredWeeklyHours, setHasBlurredWeeklyHours] = useState(false);
  
  const parsedWeeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours) ?? 0;
  const weeklyHoursInvalid = parsedWeeklyHours <= 0;
  const showWeeklyHoursError = weeklyHoursInvalid && (hasBlurredWeeklyHours || currentStepHasDraftContent);

  // Tính toán nhãn độ khả thi và màu sắc động dựa trên số giờ cam kết
  const getFeasibilityDetails = (hours: number) => {
    if (hours === 0) return { label: "Chưa chọn", color: "text-app-ink-muted bg-app-bg", colorBorder: "border-app-line" };
    if (hours <= 3) {
      return {
        label: "Nhẹ nhàng (Dễ dàng duy trì)",
        color: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
        colorBorder: "border-emerald-500/30",
        colorBar: "bg-emerald-500",
        shadow: "shadow-emerald-500/20"
      };
    }
    if (hours <= 8) {
      return {
        label: "Thách thức (Cần kỷ luật đều đặn)",
        color: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30",
        colorBorder: "border-blue-500/30",
        colorBar: "bg-blue-500",
        shadow: "shadow-blue-500/20"
      };
    }
    if (hours <= 15) {
      return {
        label: "Nỗ lực lớn (Phải ưu tiên hàng đầu)",
        color: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30",
        colorBorder: "border-amber-500/30",
        colorBar: "bg-amber-500",
        shadow: "shadow-amber-500/20"
      };
    }
    return {
      label: "Rủi ro quá tải (Khó giữ nhịp dài hạn)",
      color: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
      colorBorder: "border-rose-500/30",
      colorBar: "bg-rose-500",
      shadow: "shadow-rose-500/20"
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

  return (
    <div className="space-y-6">
      {/* Khung tương tác nhập số giờ bằng Slider vật lý */}
      <div className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm">
        <label htmlFor="smart-weekly-hours-slider" className={cn(labelClass, "flex items-center gap-1.5")}>
          <Gauge className="h-4 w-4 text-app-accent" />
          Thời gian cam kết mỗi tuần
          <span className={requiredMarkerClass} aria-hidden="true">*</span>
          <span className="sr-only"> bắt buộc</span>
        </label>
        
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          {/* Màn hình hiển thị số giờ hiện tại cỡ lớn */}
          <div className={cn(
            "flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-2xl border transition-all duration-300 shadow-sm",
            feasibility.colorBorder,
            feasibility.color
          )}>
            <span className="text-3xl font-extrabold tracking-tight">{parsedWeeklyHours}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">giờ/tuần</span>
          </div>

          {/* Slider và Nhãn trạng thái */}
          <div className="w-full space-y-3">
            <div className="relative flex items-center">
              <input
                id="smart-weekly-hours-slider"
                type="range"
                min="1"
                max="24"
                step="1"
                value={parsedWeeklyHours || 1}
                onChange={(e) => handleHoursChange(e.target.value)}
                onBlur={() => setHasBlurredWeeklyHours(true)}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-app-line accent-app-accent focus:outline-none"
                aria-invalid={showWeeklyHoursError}
                aria-describedby={showWeeklyHoursError ? "smart-weekly-hours-error" : undefined}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-app-ink-muted">
              <span>1 giờ</span>
              <span>12 giờ (trung bình)</span>
              <span>24 giờ</span>
            </div>

            {/* Thanh hiển thị tính khả thi thực tế */}
            {parsedWeeklyHours > 0 && (
              <div className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-all duration-300",
                feasibility.color,
                feasibility.colorBorder
              )}>
                <span className="flex h-2 w-2 rounded-full bg-current animate-pulse" />
                <span>Tính khả thi: {feasibility.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Hours Suggestions */}
        <div className="mt-5 flex flex-wrap gap-2 items-center border-t border-app-line/60 pt-4">
          <span className="text-[10px] font-bold text-app-accent">Chọn nhanh:</span>
          {["2", "4", "8", "12"].map((hours) => (
            <button
              key={hours}
              type="button"
              onClick={() => {
                handleHoursChange(hours);
                setHasBlurredWeeklyHours(true);
              }}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium shadow-sm",
                parsedWeeklyHours === Number(hours)
                  ? "bg-app-accent text-white border-app-accent shadow-md shadow-app-accent/20"
                  : "bg-app-accent-soft/30 hover:bg-app-accent-soft/60 text-app-accent border-app-accent/10"
              )}
            >
              {hours} giờ/tuần
            </button>
          ))}
        </div>

        <p className={cn(helperTextClass, "mt-3")}>
          Hãy chỉ đếm thời lượng bạn thực sự giữ vững được mỗi tuần trong vòng 12 tuần liên tục.
        </p>
        {showWeeklyHoursError ? (
          <FieldError id="smart-weekly-hours-error" message="Nhập số giờ mỗi tuần lớn hơn 0." role="alert" />
        ) : null}
      </div>

      {/* Kỹ năng cần có */}
      <div className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm">
        <label htmlFor="smart-required-skills" className={labelClass}>
          Kỹ năng cần có
        </label>
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
          className={`${textareaClass} min-h-[90px]`}
        />
        
        {/* 1-Click Skills Suggestions */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold text-app-accent">Gợi ý nhanh:</span>
          {(archetype === "habit_building"
            ? ["Kỷ luật tự giác", "Quản lý thời gian", "Thiết lập thói quen"]
            : archetype === "skill_learning"
              ? ["Tự học nghiên cứu", "Đọc hiểu tài liệu", "Thực hành thực tế"]
              : archetype === "project_completion"
                ? ["Lập kế hoạch công việc", "Giải quyết vấn đề", "Quản lý tiến độ"]
                : ["Quản lý thời gian", "Kỷ luật thực thi"]
          ).map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => {
                const current = smartData.achievable.required_skills.trim();
                const updated = current ? `${current}, ${skill}` : skill;
                setSmartData((previous) => ({
                  ...previous,
                  achievable: {
                    ...previous.achievable,
                    required_skills: updated,
                  },
                }));
              }}
              className="text-xs bg-app-accent-soft/30 hover:bg-app-accent-soft text-app-accent px-2.5 py-1 rounded-full border border-app-accent/10 transition-all duration-150 active:scale-[0.97]"
            >
              + {skill}
            </button>
          ))}
        </div>

        <p className={helperTextClass}>Liệt kê các kỹ năng thật sự cần thiết phục vụ giai đoạn này.</p>
      </div>

      {/* Nguồn lực hỗ trợ */}
      <div className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm">
        <label htmlFor="smart-support-resources" className={labelClass}>
          Nguồn lực hỗ trợ
        </label>
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
          className={`${textareaClass} min-h-[90px]`}
        />
        
        {/* 1-Click Resources Suggestions */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold text-app-accent">Gợi ý nhanh:</span>
          {(archetype === "habit_building"
            ? ["Ứng dụng ghi nhận", "Người đồng hành", "Chuông báo nhắc nhở"]
            : archetype === "skill_learning"
              ? ["Khóa học online", "Mentor hướng dẫn", "Cộng đồng học tập"]
              : archetype === "project_completion"
                ? ["Tài liệu hướng dẫn", "Mentor đánh giá", "Trello/Notion"]
                : ["Lịch tuần cá nhân", "Không gian yên tĩnh"]
          ).map((res) => (
            <button
              key={res}
              type="button"
              onClick={() => {
                const current = smartData.achievable.support_resources.trim();
                const updated = current ? `${current}, ${res}` : res;
                setSmartData((previous) => ({
                  ...previous,
                  achievable: {
                    ...previous.achievable,
                    support_resources: updated,
                  },
                }));
              }}
              className="text-xs bg-app-accent-soft/30 hover:bg-app-accent-soft text-app-accent px-2.5 py-1 rounded-full border border-app-accent/10 transition-all duration-150 active:scale-[0.97]"
            >
              + {res}
            </button>
          ))}
        </div>

        <p className={helperTextClass}>Điền những công cụ, con người bạn có thể tiếp cận được ngay.</p>
      </div>

      <ArchetypeHint archetype={archetype} variant="leadAction" />
    </div>
  );
}
