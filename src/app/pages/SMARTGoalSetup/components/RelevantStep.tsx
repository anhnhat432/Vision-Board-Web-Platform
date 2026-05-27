import { useState, type Dispatch, type SetStateAction } from "react";

import { FieldError } from "../../../components/ui/field-error";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";
import { errorTextClass, helperTextClass, inputClass, labelClass, requiredMarkerClass, textareaClass } from "./formStyles";

interface RelevantStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  placeholder: string;
  currentStepHasDraftContent: boolean;
}

export function RelevantStep({ smartData, setSmartData, placeholder, currentStepHasDraftContent }: RelevantStepProps) {
  const [hasBlurredMotivation, setHasBlurredMotivation] = useState(false);
  const motivationInvalid = smartData.relevant.motivation_reason.trim().length < 15;
  const showMotivationError = motivationInvalid && (hasBlurredMotivation || currentStepHasDraftContent);

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="smart-relevant-reason" className={labelClass}>
          Lý do bạn thật sự muốn theo đuổi
          <span className={requiredMarkerClass} aria-hidden="true">*</span>
          <span className="sr-only"> bắt buộc</span>
        </label>
        <Textarea
          id="smart-relevant-reason"
          placeholder={placeholder}
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
          onBlur={() => setHasBlurredMotivation(true)}
          className={`${textareaClass} min-h-[160px]`}
          aria-invalid={showMotivationError}
          aria-describedby={showMotivationError ? "smart-relevant-reason-error" : undefined}
        />
        <p className={helperTextClass}>Viết đủ cụ thể để khi mệt vẫn nhớ vì sao mục tiêu này đáng giữ.</p>
        {showMotivationError ? (
          <FieldError id="smart-relevant-reason-error" message="Viết ít nhất 15 ký tự để lý do đủ rõ." role="alert" />
        ) : null}
      </div>
      <div>
        <label htmlFor="smart-life-alignment" className={labelClass}>
          Lĩnh vực cuộc sống liên quan (tuỳ chọn)
        </label>
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
          className={inputClass}
        />
        <p className={helperTextClass}>Bạn có thể bỏ qua nếu lý do ở trên đã đủ rõ.</p>
      </div>
    </div>
  );
}
