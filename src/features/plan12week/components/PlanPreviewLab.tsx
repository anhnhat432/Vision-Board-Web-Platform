import { Award, CalendarDays, CheckCircle, ClipboardCheck, Flag, Flame, Target, Zap } from "lucide-react";

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
    <div className="mx-auto max-w-4xl space-y-6 select-none animate-in fade-in duration-300">
      {/* Adventure Scroll (Chứng thư Viễn chinh) */}
      <section className="relative overflow-hidden rounded-3xl p-[2px] border border-indigo-200/60 dark:border-indigo-900/40 shadow-xl shadow-indigo-50/40 dark:shadow-none bg-gradient-to-tr from-indigo-500/10 via-transparent to-emerald-500/10">
        <div className="rounded-[22px] bg-white dark:bg-slate-900 p-6 sm:p-7 relative z-10">
          {/* Background radial glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200/50 dark:border-slate-800/40 pb-5 relative z-10">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-app-accent animate-pulse" />
                BẢN ĐỒ VIỄN CHINH 12 TUẦN (12-WEEK ROADMAP)
              </p>
              <h3 className="mt-2.5 font-serif text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Sẵn sàng Chinh phục Mục tiêu 🚀
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                Bản tóm tắt lộ trình 12 tuần của bạn đã được đúc kết. Hãy rà soát thật kỹ các cam kết trước khi rung
                chuông khởi phát chu kỳ mới!
              </p>
            </div>
            <Badge
              variant="brand"
              className="inline-flex min-h-10 shrink-0 items-center justify-center px-4.5 py-2 bg-gradient-to-r from-app-accent to-indigo-600 hover:brightness-105 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-500/20"
            >
              Lộ trình 12 tuần
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
            {/* Đích đến 12 tuần */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-950/10 p-4 hover:scale-[1.01] transition-all duration-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-100/30">
                <Award className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Mốc chốt Tuần 12
              </p>
              <p className="mt-1 line-clamp-3 text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-200">
                {draft.week12Outcome || "Chưa có nội dung"}
              </p>
            </div>

            {/* Chỉ số kết quả */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-950/10 p-4 hover:scale-[1.01] transition-all duration-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-100/30">
                <Zap className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Chỉ số đo lường (Lag Metric)
              </p>
              <p className="mt-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                {lagMetricLabel || "Chưa có chỉ số kết quả"}
              </p>
            </div>

            {/* Ngày khởi hành */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-950/10 p-4 hover:scale-[1.01] transition-all duration-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-100/30">
                <CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Ngày khởi hành chu kỳ
              </p>
              <p className="mt-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                {formatDateLabel(draft.startDate)}
              </p>
            </div>

            {/* Động lực cốt lõi */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-950/10 p-4 hover:scale-[1.01] transition-all duration-300 sm:col-span-2">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-100/30">
                  <Target className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                    Động lực thôi thúc chính
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-200 italic">
                    "{draft.vision12Week || "Chưa có nội dung"}"
                  </p>
                </div>
              </div>
            </div>

            {/* Ngày nhìn lại */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-950/10 p-4 hover:scale-[1.01] transition-all duration-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-100/30">
                <CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Ngày review nhìn lại tuần
              </p>
              <p className="mt-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                {formatReviewDayLabel(draft.reviewDay)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2-4 Việc lặp lại hằng tuần */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-slate-850/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl p-6 sm:p-7 transition-all duration-300 group select-none">
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/40 dark:border-slate-800/40 pb-4 relative z-10">
          <div>
            <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <CheckCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0 inline-block mr-1" aria-hidden="true" /> Hành
              động lặp lại cam kết (Lead Indicators)
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Các việc nhỏ lặp đi lặp lại hàng tuần tạo nên sự thay đổi vĩ đại
            </p>
          </div>
          <Badge
            variant="neutral"
            className="inline-flex min-h-8 shrink-0 items-center px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-full text-xs"
          >
            {leadMetrics.length} hành động
          </Badge>
        </div>

        <div className="mt-4 flex gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-indigo-500/5 p-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium relative z-10">
          <ClipboardCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-indigo-600" aria-hidden="true" />
          <p>
            Chỉ số thực thi (Execution Score) hằng tuần sẽ tự động tính toán dựa trên mức độ bạn hoàn thành các hành
            động này so với cam kết ban đầu. Hãy kiên trì!
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 relative z-10">
          {repeatedItems.length > 0 ? (
            repeatedItems.map((leadMetric) => (
              <div
                key={leadMetric.name}
                className="rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-950/10 p-4 hover:scale-[1.01] transition-transform duration-300"
              >
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>{leadMetric.name}</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-400 font-semibold">
                  Mục tiêu tuần:{" "}
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                    {leadMetric.weeklyTarget} lần / tuần
                  </span>
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 font-semibold">Chưa có việc lặp lại.</p>
          )}
        </div>
      </section>

      {/* Trọng tâm Tuần 1 & HÀNH ĐỘNG KHỞI PHÁT cực kỳ truyền cảm hứng */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-slate-850/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl p-6 sm:p-7 transition-all duration-300 group select-none">
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200/40 dark:border-slate-800/40 pb-4 relative z-10">
          <CalendarDays className="h-4.5 w-4.5 text-indigo-500 shrink-0 inline-block mr-1" aria-hidden="true" /> Trọng
          tâm & Hành động đầu tiên
        </h4>
        {week1 ? (
          <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold relative z-10">
            {week1.focus ? (
              <p className="flex items-start gap-1.5">
                <Target className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-700 dark:text-slate-200 font-bold">Trọng tâm tuần 1:</strong>{" "}
                  {week1.focus}
                </span>
              </p>
            ) : null}
            {week1.expectedOutput ? (
              <p className="flex items-start gap-1.5 whitespace-pre-line">
                <Flag className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-700 dark:text-slate-200 font-bold">Kết quả dự kiến:</strong>{" "}
                  {week1.expectedOutput}
                </span>
              </p>
            ) : null}

            {/* 🔥 CARD KHỞI PHÁT HÀNH ĐỘNG ĐẦU TIÊN (Momentum builder) */}
            <div className="mt-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-500/10 to-emerald-500/5 p-4.5 border-dashed flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-app-accent text-white shadow-lg shadow-app-accent/20 animate-bounce">
                  <Flame className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Hành động khởi phát đầu tiên của bạn
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    Vào ngày <strong className="text-app-accent font-bold">{formatDateLabel(draft.startDate)}</strong>,
                    hãy hoàn thành:
                    <span className="block font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      👉 {weekOneTasks[0]?.title || repeatedItems[0]?.name || "Hành động lặp lại tuần 1"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-full border border-emerald-500/15 text-[10px] font-extrabold">
                🚀 SẴN SÀNG HÀNH ĐỘNG
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {weekOneTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-950/10 px-4 py-3 hover:scale-[1.01] transition-transform duration-300"
                >
                  <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{task.title}</span>
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400 dark:text-slate-400 font-bold">
                    {formatDateLabel(task.scheduledDate)}
                  </p>
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
