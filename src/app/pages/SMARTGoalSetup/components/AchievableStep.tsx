import { useState, type Dispatch, type SetStateAction } from "react";

import { parseNumberInput } from "@/lib/smart-goal";
import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";

import { FieldError } from "../../../components/ui/field-error";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { helperTextClass, inputClass, labelClass, requiredMarkerClass, textareaClass } from "./formStyles";

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
  const parsedWeeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours);
  const weeklyHoursInvalid = parsedWeeklyHours === undefined || parsedWeeklyHours <= 0;
  const showWeeklyHoursError = weeklyHoursInvalid && (hasBlurredWeeklyHours || currentStepHasDraftContent);

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="smart-weekly-hours" className={labelClass}>
          Thời gian mỗi tuần
          <span className={requiredMarkerClass} aria-hidden="true">*</span>
          <span className="sr-only"> bắt buộc</span>
        </label>
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
          onBlur={() => setHasBlurredWeeklyHours(true)}
          className={inputClass}
          aria-invalid={showWeeklyHoursError}
          aria-describedby={showWeeklyHoursError ? "smart-weekly-hours-error" : undefined}
        />
        
        {/* 1-Click Hours Suggestions */}
        <div className="mt-2.5 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold text-app-accent">Chọn nhanh:</span>
          {["2", "4", "6", "10"].map((hours) => (
            <button
              key={hours}
              type="button"
              onClick={() => {
                setSmartData((previous) => ({
                  ...previous,
                  achievable: {
                    ...previous.achievable,
                    weekly_time_commitment_hours: hours,
                  },
                }));
                setHasBlurredWeeklyHours(true);
              }}
              className="text-xs bg-app-accent-soft/30 hover:bg-app-accent-soft text-app-accent px-2.5 py-1 rounded-full border border-app-accent/10 transition-all duration-150 active:scale-[0.97]"
            >
              {hours} giờ/tuần
            </button>
          ))}
        </div>

        <p className={helperTextClass}>Chỉ đếm thời gian bạn giữ được đều — không phải lúc lý tưởng.</p>
        {showWeeklyHoursError ? (
          <FieldError id="smart-weekly-hours-error" message="Nhập số giờ mỗi tuần lớn hơn 0." role="alert" />
        ) : null}
      </div>

      <div>
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
          className={`${textareaClass} min-h-[80px]`}
        />
        
        {/* 1-Click Skills Suggestions */}
        <div className="mt-2 flex flex-wrap gap-2 items-center">
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

        <p className={helperTextClass}>Liệt kê kỹ năng thật sự ảnh hưởng tới kết quả giai đoạn này.</p>
      </div>

      <div>
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
          className={`${textareaClass} min-h-[80px]`}
        />
        
        {/* 1-Click Resources Suggestions */}
        <div className="mt-2 flex flex-wrap gap-2 items-center">
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

        <p className={helperTextClass}>Ghi cả người hỗ trợ lẫn tài liệu, công cụ bạn dùng được ngay.</p>
      </div>

      <ArchetypeHint archetype={archetype} variant="leadAction" />
    </div>
  );
}
