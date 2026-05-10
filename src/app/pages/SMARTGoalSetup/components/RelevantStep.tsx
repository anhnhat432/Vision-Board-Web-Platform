import type { Dispatch, SetStateAction } from "react";

import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";

interface RelevantStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  placeholder: string;
  currentStepHasDraftContent: boolean;
}

export function RelevantStep({
  smartData,
  setSmartData,
  placeholder,
  currentStepHasDraftContent,
}: RelevantStepProps) {
  const motivationInvalid = smartData.relevant.motivation_reason.trim().length < 15;

  return (
    <div className="stack-stack">
      <div className="stack-tight">
        <Label htmlFor="smart-relevant-reason" className="text-base">
          Lý do bạn thật sự muốn theo đuổi
        </Label>
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
          className="min-h-[160px] resize-none text-base leading-7"
          aria-invalid={motivationInvalid && currentStepHasDraftContent}
        />
        <p className="text-sm text-slate-500">
          Viết đủ cụ thể để khi mệt vẫn nhớ vì sao mục tiêu này đáng giữ.
        </p>
      </div>
      <div className="stack-tight">
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
