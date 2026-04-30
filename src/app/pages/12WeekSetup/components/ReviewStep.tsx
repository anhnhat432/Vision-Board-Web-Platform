import type { PendingSMARTGoal } from "@/lib/smart-goal";
import type { AdaptiveTemplateSupport, TwelveWeekTemplateDefinition } from "@/app/utils/twelve-week-premium";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { getLifeAreaLabel } from "@/app/utils/storage";
import { getGoalTypeLabel, getLoadPreferenceLabel, getReviewDayLabel } from "../helpers";
import type { TwelveWeekSetupDraft } from "../types";

interface ReviewStepProps {
  smartGoal: PendingSMARTGoal;
  draft: TwelveWeekSetupDraft;
  focusArea: string;
  selectedTemplate: TwelveWeekTemplateDefinition | null;
  setupGuideSupport: AdaptiveTemplateSupport | null;
  setupGuideTemplate: TwelveWeekTemplateDefinition | null;
  weekOneTaskPreview: string[];
  weekOneTaskWarning: string | null;
  onChange: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
}

export function ReviewStep({
  smartGoal,
  draft,
  focusArea,
  selectedTemplate,
  setupGuideSupport,
  setupGuideTemplate,
  weekOneTaskPreview,
  weekOneTaskWarning,
  onChange,
}: ReviewStepProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-5">
        <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tóm tắt kế hoạch</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">{smartGoal.specific}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{draft.vision12Week}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">{getGoalTypeLabel(draft.goalType)}</Badge>
            <Badge variant="outline">{getLifeAreaLabel(focusArea)}</Badge>
            <Badge variant="outline">Nhìn lại {getReviewDayLabel(draft.reviewDay)}</Badge>
            <Badge variant="outline">Nhịp {getLoadPreferenceLabel(draft.tacticLoadPreference)}</Badge>
            {selectedTemplate && <Badge variant="outline">Khung {selectedTemplate.name}</Badge>}
          </div>
        </div>

        <details className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
            Mở phần nâng cao (tùy chọn)
          </summary>
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="milestone-week-4">Mốc tuần 4</Label>
                <Input
                  id="milestone-week-4"
                  value={draft.week4Milestone}
                  onChange={(event) => onChange("week4Milestone", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-week-8">Mốc tuần 8</Label>
                <Input
                  id="milestone-week-8"
                  value={draft.week8Milestone}
                  onChange={(event) => onChange("week8Milestone", event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="success-evidence">Bằng chứng thành công muốn thấy</Label>
              <Textarea
                id="success-evidence"
                rows={3}
                value={draft.successEvidence}
                onChange={(event) => onChange("successEvidence", event.target.value)}
              />
            </div>
          </div>
        </details>
      </div>

      <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/72 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sau khi tạo xong</p>
        <div className="rounded-[22px] border border-white/70 bg-white/78 p-4 text-sm leading-7 text-slate-700">
          Bạn sẽ đi thẳng vào trung tâm 12 tuần, nơi có màn Hôm nay, Tuần, Tiến độ và Cài đặt trong cùng một nhịp.
        </div>
        {setupGuideSupport && setupGuideTemplate && (
          <div className="rounded-[22px] border border-slate-900 bg-slate-950 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-white/54">Tuần đầu sẽ khởi động như thế nào</p>
            <p className="mt-2 text-base font-semibold">{setupGuideSupport.week1Headline}</p>
            <p className="mt-2 text-sm leading-7 text-white/78">{setupGuideSupport.week1Support}</p>
          </div>
        )}
        <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tuần đầu có gì</p>
          <div className="mt-3 space-y-2">
            {weekOneTaskPreview.length === 0 ? (
              <p className="text-sm text-slate-500">
                Bạn có thể thêm hoặc chỉnh việc trước khi tạo kế hoạch để tuần đầu hiện rõ hơn.
              </p>
            ) : (
              weekOneTaskPreview.map((task) => (
                <div key={task} className="rounded-2xl border border-white/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  {task}
                </div>
              ))
            )}
          </div>
          {weekOneTaskWarning ? <p className="mt-3 text-xs text-amber-600">{weekOneTaskWarning}</p> : null}
        </div>
        {(draft.week4Milestone || draft.week8Milestone) && (
          <div className="rounded-[22px] border border-white/70 bg-white/78 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mốc giữa chu kỳ</p>
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border border-white/70 bg-slate-50/80 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tuần 4</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{draft.week4Milestone}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-slate-50/80 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tuần 8</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{draft.week8Milestone}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
