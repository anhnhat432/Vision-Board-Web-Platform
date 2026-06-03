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
    <div className="mx-auto max-w-4xl space-y-6 select-none motion-safe:animate-in motion-safe:fade-in duration-300">
      {/* Adventure Scroll (Chứng thư Viễn chinh) */}
      <section className="relative overflow-hidden rounded-card border border-app-line bg-app-surface shadow-app-md p-6 sm:p-7">
        {/* Background radial glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-app-accent/5 rounded-pill blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-app-accent/5 rounded-pill blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-app-line/60 pb-5 relative z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-app-accent flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-app-accent animate-pulse" />
              Bản đồ viễn chinh 12 tuần · 12-Week Roadmap
            </p>
            <h3 className="mt-2.5 font-serif text-2xl font-bold text-app-ink flex items-center gap-2">
              Sẵn sàng Chinh phục Mục tiêu 🚀
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-app-ink-soft font-medium">
              Bản tóm tắt lộ trình 12 tuần của bạn đã được đúc kết. Hãy rà soát thật kỹ các cam kết trước khi rung
              chuông khởi phát chu kỳ mới!
            </p>
          </div>
          <Badge
            variant="neutral"
            className="inline-flex min-h-8 shrink-0 items-center justify-center px-3 py-1 bg-app-bg-subtle border border-app-line text-app-ink-soft font-semibold rounded-pill text-xs"
          >
            Lộ trình 12 tuần
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
          {/* Đích đến 12 tuần */}
          <div className="rounded-card border border-app-line bg-app-bg-subtle/50 p-4 hover:scale-[1.01] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-control bg-app-accent-soft text-app-accent border border-app-accent/15">
              <Award className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Mốc chốt Tuần 12
            </p>
            <p className="mt-1 line-clamp-3 text-xs font-bold leading-relaxed text-app-ink">
              {draft.week12Outcome || "Chưa có nội dung"}
            </p>
          </div>

          {/* Chỉ số kết quả */}
          <div className="rounded-card border border-app-line bg-app-bg-subtle/50 p-4 hover:scale-[1.01] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-control bg-app-accent-soft text-app-accent border border-app-accent/15">
              <Zap className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Chỉ số đo lường (Lag Metric)
            </p>
            <p className="mt-1.5 text-xs font-extrabold text-app-accent">
              {lagMetricLabel || "Chưa có chỉ số kết quả"}
            </p>
          </div>

          {/* Ngày khởi hành */}
          <div className="rounded-card border border-app-line bg-app-bg-subtle/50 p-4 hover:scale-[1.01] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-control bg-app-accent-soft text-app-accent border border-app-accent/15">
              <CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Ngày khởi hành chu kỳ
            </p>
            <p className="mt-1.5 text-xs font-bold text-app-ink">
              {formatDateLabel(draft.startDate)}
            </p>
          </div>

          {/* Động lực cốt lõi */}
          <div className="rounded-card border border-app-line bg-app-bg-subtle/50 p-4 hover:scale-[1.01] transition-all duration-300 sm:col-span-2">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent border border-app-accent/15">
                <Target className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
                  Động lực thôi thúc chính
                </p>
                <p className="mt-1 line-clamp-3 text-xs font-bold leading-relaxed text-app-ink italic">
                  “{draft.vision12Week || "Chưa có nội dung"}”
                </p>
              </div>
            </div>
          </div>

          {/* Ngày nhìn lại */}
          <div className="rounded-card border border-app-line bg-app-bg-subtle/50 p-4 hover:scale-[1.01] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-control bg-app-accent-soft text-app-accent border border-app-accent/15">
              <CalendarDays className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
              Ngày review nhìn lại tuần
            </p>
            <p className="mt-1.5 text-xs font-bold text-app-ink">
              {formatReviewDayLabel(draft.reviewDay)}
            </p>
          </div>
        </div>
      </section>

      {/* Trục Lộ trình Tuyến tính 12 Tuần (Linear Timeline Roadmap) */}
      <section className="relative overflow-hidden rounded-card border border-app-line bg-app-surface shadow-app-md p-5 sm:p-6 select-none">
        <div className="border-b border-app-line/60 pb-3 mb-5">
          <h4 className="text-sm font-extrabold text-app-ink flex items-center gap-1.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-app-accent animate-pulse" />
            Lộ trình Chiến dịch 12 Tuần
          </h4>
          <p className="mt-1 text-xs text-app-ink-soft font-medium">
            Sơ đồ chặng đường phi hành thực tế của bạn qua các cột mốc thời gian
          </p>
        </div>

        {/* Timeline ngang trên Desktop, dọc trên Mobile */}
        <div className="relative pt-2">
          {/* Đường nối dọc trên Mobile, ẩn trên Desktop */}
          <div className="absolute left-4.5 top-8 bottom-8 w-[2px] bg-app-line/60 sm:hidden" aria-hidden="true" />
          
          {/* Đường nối ngang trên Desktop, ẩn trên Mobile */}
          <div className="absolute left-6 right-6 top-[28px] h-[3px] bg-app-line/60 rounded-full hidden sm:block" aria-hidden="true" />

          <div className="grid gap-6 sm:grid-cols-4 relative z-10">
            {/* Mốc 1: Tuần 1 */}
            <div className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-4 sm:gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent text-white shadow-sm ring-4 ring-app-accent-soft/30 font-bold text-xs">
                W1
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-app-ink">Tuần 1: Khởi động</h5>
                <p className="mt-1 text-[11px] text-app-ink-soft leading-normal">
                  Chạy đà và thiết lập nhịp độ kỷ luật cho các hành động lặp lại.
                </p>
              </div>
            </div>

            {/* Mốc 2: Tuần 4 */}
            <div className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-4 sm:gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent border-2 border-app-accent font-bold text-xs">
                W4
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-app-ink">Tuần 4: Tạo đà</h5>
                <p className="mt-1 text-[11px] text-app-ink-soft leading-normal italic">
                  “{draft.week4Milestone || "Chạy đà thuận lợi, bắt đầu có thói quen" }”
                </p>
              </div>
            </div>

            {/* Mốc 3: Tuần 8 */}
            <div className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-4 sm:gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent border-2 border-app-accent font-bold text-xs">
                W8
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-app-ink">Tuần 8: Tăng tốc</h5>
                <p className="mt-1 text-[11px] text-app-ink-soft leading-normal italic">
                  “{draft.week8Milestone || "Bứt phá giới hạn, hoàn thành phần lớn khối lượng" }”
                </p>
              </div>
            </div>

            {/* Mốc 4: Tuần 12 */}
            <div className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-4 sm:gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent text-white shadow-sm ring-4 ring-app-accent-soft/30 font-bold text-xs">
                W12
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-app-accent">Tuần 12: Đích đến</h5>
                <p className="mt-1 text-[11px] font-bold text-app-ink leading-normal italic">
                  “{draft.week12Outcome || "Cán mốc mục tiêu và gặt hái quả ngọt" }”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2-4 Việc lặp lại hằng tuần */}
      <section className="relative overflow-hidden rounded-card border border-app-line bg-app-surface shadow-app-md p-5 sm:p-6 transition-all duration-300 group select-none">
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-app-accent/5 rounded-pill blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line/60 pb-4 relative z-10">
          <div>
            <h4 className="text-base font-extrabold text-app-ink flex items-center gap-1.5">
              <CheckCircle className="h-4.5 w-4.5 text-app-accent shrink-0 inline-block mr-1" aria-hidden="true" /> Hành
              động lặp lại cam kết (Lead Indicators)
            </h4>
            <p className="mt-1 text-xs text-app-ink-soft font-medium">
              Các việc nhỏ lặp đi lặp lại hàng tuần tạo nên sự thay đổi vĩ đại
            </p>
          </div>
          <Badge
            variant="neutral"
            className="inline-flex min-h-7 shrink-0 items-center px-3 bg-app-bg-subtle border border-app-line text-app-ink-soft font-bold rounded-pill text-xs"
          >
            {leadMetrics.length} hành động
          </Badge>
        </div>

        <div className="mt-4 flex gap-3 rounded-card border border-app-line bg-app-bg-subtle p-3.5 text-xs leading-relaxed text-app-ink-soft font-medium relative z-10">
          <ClipboardCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-app-accent" aria-hidden="true" />
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
                className="rounded-card border border-app-line bg-app-bg-subtle/50 p-4 hover:scale-[1.01] transition-transform duration-300"
              >
                <p className="text-xs font-bold text-app-ink flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-app-accent shrink-0 mt-0.5" />
                  <span>{leadMetric.name}</span>
                </p>
                <p className="mt-1.5 text-xs text-app-ink-muted font-medium">
                  Mục tiêu tuần:{" "}
                  <span className="text-app-accent font-bold">
                    {leadMetric.weeklyTarget} lần / tuần
                  </span>
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-app-ink-muted font-semibold">Chưa có việc lặp lại.</p>
          )}
        </div>
      </section>

      {/* Trọng tâm Tuần 1 & HÀNH ĐỘNG KHỞI PHÁT cực kỳ truyền cảm hứng */}
      <section className="relative overflow-hidden rounded-card border border-app-line bg-app-surface shadow-app-md p-5 sm:p-6 transition-all duration-300 group select-none">
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-app-accent/5 rounded-pill blur-2xl pointer-events-none" />

        <h4 className="text-base font-extrabold text-app-ink flex items-center gap-1.5 border-b border-app-line/60 pb-4 relative z-10">
          <CalendarDays className="h-4.5 w-4.5 text-app-accent shrink-0 inline-block mr-1" aria-hidden="true" /> Trọng
          tâm & Hành động đầu tiên
        </h4>
        {week1 ? (
          <div className="mt-4 space-y-4 text-xs leading-relaxed text-app-ink-soft font-semibold relative z-10">
            {week1.focus ? (
              <p className="flex items-start gap-1.5">
                <Target className="h-4 w-4 text-app-accent shrink-0 mt-0.5" />
                <span>
                  <strong className="text-app-ink font-bold">Trọng tâm tuần 1:</strong>{" "}
                  {week1.focus}
                </span>
              </p>
            ) : null}
            {week1.expectedOutput ? (
              <p className="flex items-start gap-1.5 whitespace-pre-line">
                <Flag className="h-4 w-4 text-app-accent shrink-0 mt-0.5" />
                <span>
                  <strong className="text-app-ink font-bold">Kết quả dự kiến:</strong>{" "}
                  {week1.expectedOutput}
                </span>
              </p>
            ) : null}

            {/* 🔥 CARD KHỞI PHÁT HÀNH ĐỘNG ĐẦU TIÊN (Momentum builder) */}
            <div className="mt-5 rounded-card border border-app-line bg-app-bg-subtle p-4 border-dashed flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-app-accent text-white shadow-app-sm animate-pulse">
                  <Flame className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-bold text-app-ink uppercase tracking-wide">
                    Hành động khởi phát đầu tiên của bạn
                  </h5>
                  <p className="text-[11px] text-app-ink-soft font-medium mt-0.5">
                    Vào ngày <strong className="text-app-accent font-bold">{formatDateLabel(draft.startDate)}</strong>,
                    hãy hoàn thành:
                    <span className="block font-bold text-app-accent mt-0.5">
                      👉 {weekOneTasks[0]?.title || repeatedItems[0]?.name || "Hành động lặp lại tuần 1"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 bg-app-status-success/10 text-app-status-success px-3.5 py-1.5 rounded-pill border border-app-status-success/20 text-[10px] font-bold">
                🚀 SẴN SÀNG HÀNH ĐỘNG
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {weekOneTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="rounded-card border border-app-line bg-app-bg-subtle/50 px-4 py-3 hover:scale-[1.01] transition-transform duration-300"
                >
                  <p className="font-bold text-app-ink flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-app-accent shrink-0 mt-0.5" />
                    <span>{task.title}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-app-ink-muted font-semibold">
                    {formatDateLabel(task.scheduledDate)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-app-ink-muted font-semibold relative z-10">Chưa có dữ liệu tuần 1.</p>
        )}
      </section>
    </div>
  );
}
