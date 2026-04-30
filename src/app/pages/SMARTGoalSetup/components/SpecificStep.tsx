import type { Dispatch, SetStateAction } from "react";

import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";

interface SpecificStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  placeholder: string;
  showError: boolean;
}

export function SpecificStep({ smartData, setSmartData, placeholder, showError }: SpecificStepProps) {
  const specificLength = smartData.specific.goal_statement.trim().length;

  return (
    <div className="space-y-3">
      <Label htmlFor="smart-specific" className="text-base">
        Câu trả lời của bạn
      </Label>
      <Textarea
        id="smart-specific"
        placeholder={placeholder}
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
        aria-invalid={showError}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <p>Viết như một kết quả cụ thể mà bạn có thể nhìn thấy hoặc kiểm chứng.</p>
        <p>{specificLength}/20 ký tự tối thiểu</p>
      </div>
    </div>
  );
}
