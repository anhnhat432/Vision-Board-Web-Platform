import type { Dispatch, SetStateAction } from "react";

import { parseNumberInput } from "@/lib/smart-goal";
import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";

import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";
import { ArchetypeHint } from "./ArchetypeHint";
import { helperTextClass, inputClass, labelClass, textareaClass } from "./formStyles";

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
  const parsedWeeklyHours = parseNumberInput(smartData.achievable.weekly_time_commitment_hours);
  const weeklyHoursInvalid = parsedWeeklyHours === undefined || parsedWeeklyHours <= 0;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="smart-weekly-hours" className={labelClass}>
          Thời gian mỗi tuần
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
          className={inputClass}
          aria-invalid={weeklyHoursInvalid && currentStepHasDraftContent}
        />
        <p className={helperTextClass}>Chỉ đếm thời gian bạn giữ được đều — không phải lúc lý tưởng.</p>
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
          className={textareaClass}
        />
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
          className={textareaClass}
        />
        <p className={helperTextClass}>Ghi cả người hỗ trợ lẫn tài liệu, công cụ bạn dùng được ngay.</p>
      </div>

      <ArchetypeHint archetype={archetype} variant="leadAction" />
    </div>
  );
}
