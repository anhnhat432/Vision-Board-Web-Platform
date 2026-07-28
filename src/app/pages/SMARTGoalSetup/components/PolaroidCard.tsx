import { AnimatePresence, motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/app/components/ui/utils";
import type { SmartGoalStarter } from "../../../utils/smart-goal-starters";
import type { SMARTData } from "../types";

interface PolaroidCardProps {
  smartData: SMARTData;
  smartGoalStarter: SmartGoalStarter;
  isGoldStandard: boolean;
  isMobile?: boolean;
}

type SegmentState = "filled" | "empty";

function PreviewSegment({
  children,
  state,
}: {
  children: ReactNode;
  state: SegmentState;
}) {
  return (
    <motion.span
      className={cn(
        "inline rounded-input px-1.5 py-0.5 transition-colors duration-300",
        state === "filled"
          ? "bg-app-accent-subtle font-extrabold text-app-accent"
          : "border-b border-dashed border-app-ink-muted/50 text-app-ink-muted",
      )}
      animate={state === "filled" ? { opacity: [0.78, 1] } : undefined}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.span>
  );
}

export function PolaroidCard({
  smartData,
  smartGoalStarter,
  isGoldStandard,
  isMobile = false,
}: PolaroidCardProps) {
  const specText = smartData.specific.goal_statement.trim();
  const measTarget = smartData.measurable.target_value.trim();
  const measMetric = smartData.measurable.metric_name.trim();
  const achHours = smartData.achievable.weekly_time_commitment_hours.trim();
  const relReason = smartData.relevant.motivation_reason.trim();
  const timeDate =
    smartData.timeBound.mode === "date"
      ? smartData.timeBound.target_date.trim()
      : smartData.timeBound.target_weeks.trim()
        ? `trong ${smartData.timeBound.target_weeks.trim()} tuần`
        : "";

  const progressItems = [
    { label: "Kết quả", done: specText.length > 0 },
    { label: "Chỉ số", done: measTarget.length > 0 },
    { label: "Thời gian", done: achHours.length > 0 },
    { label: "Lý do", done: relReason.length > 0 },
    { label: "Deadline", done: timeDate.length > 0 },
  ];
  const doneCount = progressItems.filter((item) => item.done).length;
  const nextMissing = progressItems.find((item) => !item.done)?.label.toLocaleLowerCase("vi-VN");

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[30px] border border-app-line bg-[linear-gradient(180deg,var(--app-surface)_0%,var(--app-bg-subtle)_100%)] p-4 shadow-[0_24px_80px_-60px_rgba(23,21,15,0.5)] sm:p-5",
        isMobile ? "mx-auto max-w-md rounded-[24px]" : "",
      )}
      aria-label="Bản xem trước mục tiêu SMART"
    >
      <AnimatePresence>
        {isGoldStandard && (
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: -4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full border border-app-accent/20 bg-app-accent-subtle px-3 py-1 text-[11px] font-extrabold text-app-accent shadow-app-sm"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" /> Đủ rõ
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold text-app-ink-muted">
            Bản mục tiêu
          </p>
          <h3 className="mt-1 text-xl font-extrabold leading-tight tracking-[-0.035em] text-app-ink" style={{ fontFamily: "'Bricolage Grotesque', serif" }}>
            Câu mục tiêu của bạn
          </h3>
        </div>
        <span className="shrink-0 rounded-full border border-app-line bg-app-surface/80 px-2.5 py-1 text-xs font-extrabold text-app-ink-soft">
          {doneCount}/5
        </span>
      </div>

      <div className="mt-4 rounded-card-lg border border-app-line bg-app-surface/75 p-4 text-[14px] leading-8 text-app-ink sm:text-[15px] sm:leading-9">
        Tôi sẽ{" "}
        <PreviewSegment state={specText ? "filled" : "empty"}>
          {specText || smartGoalStarter.specificGoalStatement || "viết rõ kết quả muốn đạt"}
        </PreviewSegment>{" "}
        và đo bằng{" "}
        <PreviewSegment state={measTarget ? "filled" : "empty"}>
          {measTarget ? `${measTarget} ${measMetric || "đơn vị"}` : smartGoalStarter.metricName || "một chỉ số cụ thể"}
        </PreviewSegment>
        . Tôi dành{" "}
        <PreviewSegment state={achHours ? "filled" : "empty"}>
          {achHours ? `${achHours} giờ/tuần` : `${smartGoalStarter.weeklyHours} giờ/tuần`}
        </PreviewSegment>{" "}
        vì{" "}
        <PreviewSegment state={relReason ? "filled" : "empty"}>
          {relReason || "lý do đủ quan trọng với mình"}
        </PreviewSegment>{" "}
        và hoàn thành{" "}
        <PreviewSegment state={timeDate ? "filled" : "empty"}>
          {timeDate || `trong ${smartGoalStarter.targetWeeks} tuần`}
        </PreviewSegment>
        .
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Các phần SMART đã rõ">
        {progressItems.map((item) => (
          <li
            key={item.label}
            className={cn(
              "flex min-h-10 items-center justify-center gap-1.5 rounded-card border px-2 text-center text-[10px] font-extrabold leading-tight",
              item.done
                ? "border-app-accent/20 bg-app-accent-subtle text-app-accent"
                : "border-app-line bg-app-surface/80 text-app-ink-muted",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border",
                item.done ? "border-app-accent bg-app-accent text-white" : "border-app-line bg-app-bg-subtle",
              )}
            >
              {item.done ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : null}
            </span>
            {item.label}
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-[16px] border border-app-line bg-app-surface/80 px-3 py-2 text-xs font-bold leading-5 text-app-ink-soft">
        {nextMissing ? `Thiếu tiếp theo: ${nextMissing}. Preview cập nhật khi bạn nhập.` : "Đã đủ 5 mảnh để chuyển sang kế hoạch."}
      </p>
    </section>
  );
}