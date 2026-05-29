import { CalendarDays, ClipboardCheck, Target, Zap } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import type { TwelveWeekSetupDraft } from "@/app/pages/12WeekSetup/types";

interface PlanPreviewLabProps {
  draft: TwelveWeekSetupDraft;
  previewPlan: {
    vision: string;
    weeks: Array<{
      weekNumber: number;
      focus: string;
      expectedOutput: string;
      leadMetrics: Array<{ name: string; weeklyTarget: number }>;
      tasks: Array<{ id: string; title: string; scheduledDate: string }>;
    }>;
  };
}

const formatDateLabel = (value: string) => {
  if (!value) return "Chưa chọn";

  return new Date(value).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
};

const REVIEW_DAY_LABELS: Record<string, string> = {
  Monday: "Thứ Hai",
  Tuesday: "Thứ Ba",
  Wednesday: "Thứ Tư",
  Thursday: "Thứ Năm",
  Friday: "Thứ Sáu",
  Saturday: "Thứ Bảy",
  Sunday: "Chủ Nhật",
};

const formatReviewDayLabel = (value: string) => REVIEW_DAY_LABELS[value] ?? (value || "Chưa chọn");

export function PlanPreviewLab({ draft, previewPlan }: PlanPreviewLabProps) {
  const week1 = previewPlan.weeks.find((week) => week.weekNumber === 1);
  const leadMetrics = week1?.leadMetrics ?? [];
  const weekOneTasks = week1?.tasks ?? [];
  const repeatedItems = leadMetrics.slice(0, 4);
  const lagMetricLabel = draft.lagMetricName.trim()
    ? `${draft.lagMetricName.trim()}: ${[draft.lagMetricTarget.trim(), draft.lagMetricUnit.trim()].filter(Boolean).join(" ")}`.trim()
    : "";

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      {/* Nhúng custom styles cho viền óng ánh của Adventure Scroll */}
      <style>{`
        @keyframes border-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-scroll-border {
          background-size: 300% 300%;
          animation: border-shimmer 6s ease infinite;
        }
      `}</style>

      {/* Adventure Scroll (Chứng thư Viễn chinh) */}
      <section className="relative overflow-hidden rounded-3xl p-[2.5px] bg-gradient-to-r from-indigo-500 via-purple-500 via-pink-500 via-amber-400 via-emerald-500 to-indigo-500 animate-scroll-border shadow-2xl shadow-indigo-500/10">
        <div className="rounded-[22px] bg-white dark:bg-slate-900 p-6 sm:p-8 relative z-10">
          
          {/* Background radial glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200/40 dark:border-slate-800/40 pb-5 relative z-10">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                📜 TỜ TRÌNH KHỞI HÀNH (ADVENTURE SCROLL)
              </p>
              <h3 className="mt-2.5 font-serif italic text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>⛰️</span> Chứng thư Viễn chinh 12 Tuần
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
                Bản tóm tắt hành trình được tự động đúc từ các lựa chọn cam kết của bạn. Hãy rà soát thật kỹ trước khi rung chuông khởi phát.
              </p>
            </div>
            <Badge variant="brand" className="inline-flex min-h-10 shrink-0 items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold rounded-full text-xs shadow-lg shadow-indigo-500/20">
              👑 Giai đoạn 12 Tuần
            </Badge>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10 p-4.5 hover:scale-[1.02] transition-transform duration-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100/30">
                <Target className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Đích đến sau 12 tuần</p>
              <p className="mt-1 line-clamp-3 text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-200">{draft.week12Outcome || "Chưa có nội dung"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10 p-4.5 hover:scale-[1.02] transition-transform duration-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100/30">
                <Zap className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Chỉ số kết quả (Lag Metric)</p>
              <p className="mt-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                {lagMetricLabel || "Chưa có chỉ số kết quả"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10 p-4.5 hover:scale-[1.02] transition-transform duration-300 sm:col-span-2 lg:col-span-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100/30">
                  <Target className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Vì sao mục tiêu này quan trọng (Tầm nhìn)</p>
                  <p className="mt-1.5 line-clamp-4 max-w-3xl text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-200 italic">
                    "{draft.vision12Week || "Chưa có nội dung"}"
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10 p-4.5 hover:scale-[1.02] transition-transform duration-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100/30">
                <CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Ngày bắt đầu khởi hành</p>
              <p className="mt-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">{formatDateLabel(draft.startDate)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10 p-4.5 hover:scale-[1.02] transition-transform duration-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100/30">
                <CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Ngày nhìn lại tuần</p>
              <p className="mt-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">{formatReviewDayLabel(draft.reviewDay)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/10 p-4.5 hover:scale-[1.02] transition-transform duration-300 sm:col-span-2 lg:col-span-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100/30">
                <CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Tuần 1 sẽ bắt đầu bằng gì</p>
              <p className="mt-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                {weekOneTasks.length > 0 ? `${weekOneTasks.length} việc đầu tiên` : "Giữ nhịp việc lặp lại"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2-4 Việc lặp lại hằng tuần */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-slate-850/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl p-6 sm:p-8 transition-all duration-300 group select-none">
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/40 dark:border-slate-800/40 pb-4 relative z-10">
          <div>
            <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>🚀</span> Hành động lặp lại hằng tuần (Lead Indicators)
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Cam kết tập trung vào việc nhỏ hằng tuần để gặt hái kết quả lớn.
            </p>
          </div>
          <Badge variant="neutral" className="inline-flex min-h-9 shrink-0 items-center px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 font-bold rounded-full text-xs">
            {leadMetrics.length} hành động
          </Badge>
        </div>

        <div className="mt-4 flex gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-indigo-500/5 p-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold relative z-10">
          <ClipboardCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-indigo-500" aria-hidden="true" />
          <p>
            Hiệu suất thực thi hằng tuần chỉ đo xem bạn đã hoàn thành bao nhiêu việc lặp lại so với cam kết. Đây không phải điểm số phán xét, mà là la bàn chánh niệm giúp bạn vững tin tiếp bước. Ví dụ hoàn thành 8/10 việc = 80%.
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 relative z-10">
          {repeatedItems.length > 0 ? (
            repeatedItems.map((leadMetric) => (
              <div key={leadMetric.name} className="rounded-2xl border border-slate-250/50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-950/10 p-4 hover:scale-[1.01] transition-transform duration-300">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>{leadMetric.name}</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-450 dark:text-slate-400 font-semibold">
                  Mục tiêu tuần: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{leadMetric.weeklyTarget} lần / tuần</span>
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 font-semibold">Chưa có việc lặp lại.</p>
          )}
        </div>
      </section>

      {/* Trọng tâm Tuần 1 */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-slate-850/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl p-6 sm:p-8 transition-all duration-300 group select-none">
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200/40 dark:border-slate-800/40 pb-4 relative z-10">
          <span>🌱</span> Điểm xuất phát của Tuần 1
        </h4>
        {week1 ? (
          <div className="mt-4 space-y-3.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold relative z-10">
            {week1.focus ? (
              <p className="flex items-start gap-1.5">
                <span className="text-indigo-500 text-sm">🎯</span>
                <span>
                  <strong className="text-slate-700 dark:text-slate-200 font-extrabold">Trọng tâm tuần:</strong> {week1.focus}
                </span>
              </p>
            ) : null}
            {week1.expectedOutput ? (
              <p className="flex items-start gap-1.5 whitespace-pre-line">
                <span className="text-emerald-500 text-sm">🏁</span>
                <span>
                  <strong className="text-slate-700 dark:text-slate-200 font-extrabold">Kết quả dự kiến:</strong> {week1.expectedOutput}
                </span>
              </p>
            ) : null}
            
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {weekOneTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-250/50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-950/10 px-4.5 py-3 hover:scale-[1.01] transition-transform duration-300">
                  <p className="font-bold text-slate-750 dark:text-slate-150 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>{task.title}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-slate-450 dark:text-slate-400 font-bold">{formatDateLabel(task.scheduledDate)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400 font-semibold relative z-10">Chưa có dữ liệu tuần 1.</p>
        )}
      </section>
    </div>
  );
}
