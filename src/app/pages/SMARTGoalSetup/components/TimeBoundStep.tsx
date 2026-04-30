import type { Dispatch, SetStateAction } from "react";

import { parseNumberInput } from "@/lib/smart-goal";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { DEFAULT_TARGET_WEEKS } from "../constants";
import type { SMARTData } from "../types";

interface TimeBoundStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
}

export function TimeBoundStep({ smartData, setSmartData }: TimeBoundStepProps) {
  const parsedTargetWeeks = parseNumberInput(smartData.timeBound.target_weeks);
  const targetWeeksInvalid =
    smartData.timeBound.mode === "weeks" && (parsedTargetWeeks === undefined || parsedTargetWeeks <= 0);
  const targetDateInvalid = smartData.timeBound.mode === "date" && smartData.timeBound.target_date.trim().length === 0;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm text-slate-600">
          Chọn cách chốt thời hạn phù hợp nhất với cách bạn muốn theo dõi kế hoạch này.
        </p>
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
          <p className="text-sm text-slate-500">
            Gợi ý: 12 tuần là chu kỳ hợp lý để nối sang bước lập kế hoạch tiếp theo.
          </p>
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
          <p className="text-sm text-slate-500">Chọn mốc ngày đủ rõ để bạn có thể nhìn lại tiến độ.</p>
        </div>
      )}
    </div>
  );
}
