import { useState, type Dispatch, type SetStateAction } from "react";

import { FieldError } from "../../../components/ui/field-error";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { SMARTData } from "../types";
import { helperTextClass, inputClass, labelClass, requiredMarkerClass, textareaClass } from "./formStyles";
import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";

interface RelevantStepProps {
  smartData: SMARTData;
  setSmartData: Dispatch<SetStateAction<SMARTData>>;
  placeholder: string;
  currentStepHasDraftContent: boolean;
  archetype?: GoalArchetype;
}

export function RelevantStep({ smartData, setSmartData, placeholder, currentStepHasDraftContent, archetype }: RelevantStepProps) {
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
          className={`${textareaClass} min-h-[120px]`}
          aria-invalid={showMotivationError}
          aria-describedby={showMotivationError ? "smart-relevant-reason-error" : undefined}
        />
        
        {/* 1-Click Motivation Suggestions */}
        <div className="mt-3 bg-app-bg/40 p-3 rounded-xl border border-app-line/60">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-app-accent mb-2 flex items-center gap-1">
            <span>❤️</span> Gợi ý lý do nhanh (1-Click Suggestions):
          </p>
          <div className="flex flex-col gap-1.5">
            {(() => {
              const suggestions = (() => {
                switch (archetype) {
                  case "habit_building":
                    return [
                      { reason: "Để duy trì lối sống lành mạnh, nâng động và tăng năng lượng làm việc mỗi ngày", alignment: "Sức khỏe & Thân tâm" },
                      { reason: "Để cải thiện sự tập trung, rèn luyện tính nhất quán và giảm căng thẳng tinh thần", alignment: "Phát triển bản thân" }
                    ];
                  case "skill_learning":
                    return [
                      { reason: "Để gia tăng năng lực chuyên môn, tự tin mở rộng cơ hội thăng tiến trong sự nghiệp", alignment: "Sự nghiệp & Công việc" },
                      { reason: "Để làm chủ kiến thức mới, tăng tính cạnh tranh cá nhân và tự tin giải quyết vấn đề", alignment: "Học tập & Trí tuệ" }
                    ];
                  case "project_completion":
                    return [
                      { reason: "Để hiện thực hóa ý tưởng ấp ủ bấy lâu và tạo ra sản phẩm thực tế của riêng mình", alignment: "Dự án cá nhân" },
                      { reason: "Để tạo nền tảng vững chắc và khẳng định uy tín năng lực cho các dự án tương lai", alignment: "Sự nghiệp & Đột phá" }
                    ];
                  case "financial_goal":
                    return [
                      { reason: "Để xây dựng quỹ dự phòng tài chính an toàn, bảo vệ bản thân trước rủi ro", alignment: "Tài chính & Tích lũy" },
                      { reason: "Để tối ưu dòng tiền, đầu tư hiệu quả phục vụ mục tiêu tự do tài chính dài hạn", alignment: "Tài chính cá nhân" }
                    ];
                  default:
                    return [
                      { reason: "Để nâng cấp phiên bản bản thân tốt hơn, hoàn thành cam kết và rèn tính nhất quán", alignment: "Phát triển bản thân" },
                      { reason: "Để sắp xếp lại nhịp sống cân bằng, dọn dẹp stress và tạo không gian thư thái", alignment: "Cân bằng cuộc sống" }
                    ];
                }
              })();

              return suggestions.map((suggestion) => (
                <button
                  key={suggestion.reason}
                  type="button"
                  onClick={() => {
                    setSmartData((previous) => ({
                      ...previous,
                      relevant: {
                        motivation_reason: suggestion.reason,
                        life_dimension_alignment: suggestion.alignment,
                      },
                    }));
                    setHasBlurredMotivation(true);
                  }}
                  className="text-xs text-left bg-app-surface hover:bg-app-accent-soft/30 text-app-ink px-3 py-2 rounded-lg border border-app-line hover:border-app-accent/20 transition-all duration-150 active:scale-[0.99] w-full block shadow-sm"
                >
                  ✨ <span className="font-medium">{suggestion.reason}</span> <span className="text-[10px] text-app-ink-muted">({suggestion.alignment})</span>
                </button>
              ));
            })()}
          </div>
        </div>

        <p className={helperTextClass}>
          Mô tả động lực sâu sắc từ bên trong. 
          Ví dụ tốt: <span className="font-semibold text-app-ink">"Để có quỹ khẩn cấp giúp gia đình an tâm trước rủi ro phát sinh"</span>. 
          Ví dụ xấu: <span className="line-through text-app-ink-muted">"Kiếm nhiều tiền hơn"</span>.
        </p>
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
