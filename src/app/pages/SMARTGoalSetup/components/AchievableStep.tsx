import { useState, type Dispatch, type SetStateAction } from "react";
import { Gauge, BookOpen, Wrench, Check, X } from "lucide-react";

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

import { parseNumberInput } from "@/lib/smart-goal";
import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";
import { cn } from "@/app/components/ui/utils";

import { FieldError } from "../../../components/ui/field-error";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { helperTextClass, labelClass, requiredMarkerClass, textareaClass } from "./formStyles";

import { FOCUS_AREA_EXAMPLES } from "../constants";

interface AchievableStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  currentStepHasDraftContent: boolean;
  archetype: GoalArchetype;
  focusArea?: string;
}

export function AchievableStep({
  smartData,
  setSmartData,
  currentStepHasDraftContent,
  archetype,
  focusArea,
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
      {/* PHẦN 1: THỜI GIAN CAM KẾT */}
      <div className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm space-y-2">
        <label htmlFor="smart-weekly-hours-slider" className={cn(labelClass, "flex items-center gap-1.5 text-base font-bold text-app-ink border-b border-app-line/60 pb-2")}>
          <Gauge className="h-4.5 w-4.5 text-app-accent" />
          Thời gian bạn dành cho mục tiêu mỗi tuần
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
                "text-xs px-3 py-2 rounded-full border transition-all duration-150 active:scale-[0.97] font-medium shadow-sm cursor-pointer",
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
          Cam kết thời gian thực tế bạn chắc chắn duy trì được mỗi tuần.
          {parsedWeeklyHours > 0 && (
            <>
              {" "}Định mức: <span className="font-bold text-app-ink">{parsedWeeklyHours} giờ/tuần</span> ({getDailyCommitmentString(parsedWeeklyHours)}).
            </>
          )}
        </p>
        {showWeeklyHoursError ? (
          <FieldError id="smart-weekly-hours-error" message="Nhập số giờ mỗi tuần lớn hơn 0." role="alert" />
        ) : null}
      </div>

      {/* PHẦN 2: KỸ NĂNG CẦN CÓ */}
      <div className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm space-y-2">
        <label htmlFor="smart-required-skills" className={cn(labelClass, "flex items-center gap-1.5 text-base font-bold text-app-ink border-b border-app-line/60 pb-2")}>
          <BookOpen className="h-4.5 w-4.5 text-app-accent" />
          Kỹ năng bạn muốn tập trung rèn luyện
        </label>
        <Textarea
          id="smart-required-skills"
          placeholder="Ví dụ: Kỹ năng thuyết trình, Lập trình React cơ bản, Giao tiếp tiếng Anh, Đọc nhanh..."
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

        <div className="mt-3 grid gap-3 sm:grid-cols-2 select-none">
          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-50/20 dark:bg-emerald-950/5 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-300 hover:shadow-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-emerald-800 dark:text-emerald-400">Nên tập trung (Vừa sức 12 tuần):</p>
              <p className="text-app-ink-soft mt-0.5 font-serif italic">"Tìm hiểu cú pháp React cơ bản" hoặc "Kỹ năng quản lý thời gian Pomodoro."</p>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-500/10 bg-rose-50/20 dark:bg-rose-950/5 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-305 hover:shadow-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-450 mt-0.5">
              <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-rose-750 dark:text-rose-455">Tránh đặt quá lớn (Khó đạt sớm):</p>
              <p className="text-app-ink-soft mt-0.5 font-serif italic">"Master toàn bộ ngành khoa học máy tính" hoặc "Trở thành diễn giả xuất chúng."</p>
            </div>
          </div>
        </div>
        
        {/* 1-Click Skills Suggestions */}
        <div className="mt-4 bg-app-bg/50 p-4 rounded-2xl border border-app-line/60">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-app-accent mb-2.5 flex items-center gap-1.5 select-none">
            <span>💡</span> Gợi ý nhanh (1-Click Suggestions):
          </p>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const skillSuggestions = (() => {
                if (focusArea && FOCUS_AREA_EXAMPLES[focusArea]) {
                  return FOCUS_AREA_EXAMPLES[focusArea].achievable[0].skills.split(",").map((s) => s.trim());
                }
                return archetype === "habit_building"
                  ? ["Kỷ luật tự giác", "Quản lý thời gian", "Thiết lập thói quen"]
                  : archetype === "skill_learning"
                    ? ["Tự học nghiên cứu", "Đọc hiểu tài liệu", "Thực hành thực tế"]
                    : archetype === "project_completion"
                      ? ["Lập kế hoạch công việc", "Giải quyết vấn đề", "Quản lý tiến độ"]
                      : ["Quản lý thời gian", "Kỷ luật thực thi"];
              })();

              return skillSuggestions.map((skill) => (
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
                  className="text-xs bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-3 py-2 rounded-full border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.97] cursor-pointer shadow-sm"
                >
                  + {skill}
                </button>
              ));
            })()}
          </div>
        </div>

        <p className={helperTextClass}>
          Ví dụ: <span className="font-medium text-app-ink">"Đọc tài liệu tiếng Anh, Lập trình React cơ bản"</span>. Giúp xác định xem bạn có cần dành thời gian học thêm kỹ năng mới hay không.
        </p>
      </div>

      {/* PHẦN 3: NGUỒN LỰC HỖ TRỢ */}
      <div className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm space-y-2">
        <label htmlFor="smart-support-resources" className={cn(labelClass, "flex items-center gap-1.5 text-base font-bold text-app-ink border-b border-app-line/60 pb-2")}>
          <Wrench className="h-4.5 w-4.5 text-app-accent" />
          Nguồn lực và công cụ hỗ trợ bạn
        </label>
        <Textarea
          id="smart-support-resources"
          placeholder="Ví dụ: Tài khoản Udemy, sách chuyên ngành, mentor định hướng, nhóm tự học..."
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

        <div className="mt-3 grid gap-3 sm:grid-cols-2 select-none">
          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-50/20 dark:bg-emerald-950/5 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-300 hover:shadow-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-emerald-800 dark:text-emerald-400">Nên chọn nguồn lực sẵn có (Dễ tiếp cận):</p>
              <p className="text-app-ink-soft mt-0.5 font-serif italic">"Khóa học Udemy đã mua" hoặc "1 người bạn cùng tham gia thử thách chạy bộ."</p>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-500/10 bg-rose-50/20 dark:bg-rose-950/5 p-3.5 flex items-start gap-2.5 text-xs leading-relaxed transition-all duration-305 hover:shadow-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-450 mt-0.5">
              <X className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-rose-750 dark:text-rose-455">Tránh dựa vào nguồn lực chưa chắc chắn:</p>
              <p className="text-app-ink-soft mt-0.5 font-serif italic">"Nhờ chuyên gia hàng đầu hướng dẫn trực tiếp" hoặc "Mua thiết bị đắt tiền chưa có ngân sách."</p>
            </div>
          </div>
        </div>
        
        {/* 1-Click Resources Suggestions */}
        <div className="mt-4 bg-app-bg/50 p-4 rounded-2xl border border-app-line/60">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-app-accent mb-2.5 flex items-center gap-1.5 select-none">
            <span>💡</span> Gợi ý nhanh (1-Click Suggestions):
          </p>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const resSuggestions = (() => {
                if (focusArea && FOCUS_AREA_EXAMPLES[focusArea]) {
                  return FOCUS_AREA_EXAMPLES[focusArea].achievable[0].resources.split(",").map((r) => r.trim());
                }
                return archetype === "habit_building"
                  ? ["Ứng dụng ghi nhận", "Người đồng hành", "Chuông báo nhắc nhở"]
                  : archetype === "skill_learning"
                    ? ["Khóa học online", "Mentor hướng dẫn", "Cộng đồng học tập"]
                    : archetype === "project_completion"
                      ? ["Tài liệu hướng dẫn", "Mentor đánh giá", "Trello/Notion"]
                      : ["Lịch tuần cá nhân", "Không gian yên tĩnh"];
              })();

              return resSuggestions.map((res) => (
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
                  className="text-xs bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-3 py-2 rounded-full border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.97] cursor-pointer shadow-sm"
                >
                  + {res}
                </button>
              ));
            })()}
          </div>
        </div>

        <p className={helperTextClass}>
          Ví dụ: <span className="font-medium text-app-ink">"Tài khoản học Udemy, Sách hướng dẫn, Bạn học cùng"</span>. Đảm bảo bạn có đủ công cụ hỗ trợ để không bị tắc nghẽn khi bắt đầu.
        </p>
      </div>

      <ArchetypeHint archetype={archetype} variant="leadAction" />
    </div>
  );
}
