import { CheckCircle2, CloudOff, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { NextWeekHandoffPreview } from "@/features/plan12week/logic";

import { getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

interface WeeklyReviewNextWeekHandoffProps {
  preview: NextWeekHandoffPreview;
  onConfirm: (
    selection: { applyPriority: boolean; applyWorkload: boolean },
  ) => Promise<WeeklyReviewNextWeekHandoffResult>;
  onOpenTodayTab?: () => void;
}

export type WeeklyReviewNextWeekHandoffResult =
  | { status: "applied"; syncStatus: "synced" | "pending" }
  | { status: "noop" | "unavailable" }
  | { status: "failed"; reason: "unavailable" | "local_save_failed" };

type HandoffStatus = "idle" | "declined" | "unavailable" | "applied" | "pending" | "failed" | "noop";

function getUnavailableCopy(preview: Extract<NextWeekHandoffPreview, { status: "unavailable" }>): string {
  if (preview.reason === "final_week") {
    return "Review đã lưu. Đây là tuần cuối — không có kế hoạch tuần sau để áp dụng. Hãy chuyển sang tổng kết chu kỳ.";
  }
  if (preview.reason === "historical_review") {
    return "Review lịch sử đã lưu. Kế hoạch các tuần đã bắt đầu không thay đổi.";
  }
  return "Review chưa thể áp dụng cho một tuần tương lai.";
}

export function WeeklyReviewNextWeekHandoff({
  preview,
  onConfirm,
  onOpenTodayTab,
}: WeeklyReviewNextWeekHandoffProps) {
  const [applyPriority, setApplyPriority] = useState(preview.status === "available" && preview.priorityWillChange);
  const [applyWorkload, setApplyWorkload] = useState(
    preview.status === "available" && preview.workloadWillChange &&
      (preview.workloadDecision === "reduce slightly" || preview.workloadDecision === "increase slightly"),
  );
  const [status, setStatus] = useState<HandoffStatus>("idle");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const applyInFlightRef = useRef(false);
  const reviewedWeekNumberRef = useRef(preview.reviewedWeekNumber);

  useEffect(() => {
    if (reviewedWeekNumberRef.current === preview.reviewedWeekNumber) return;
    reviewedWeekNumberRef.current = preview.reviewedWeekNumber;
    setApplyPriority(preview.status === "available" && preview.priorityWillChange);
    setApplyWorkload(
      preview.status === "available" && preview.workloadWillChange &&
        (preview.workloadDecision === "reduce slightly" || preview.workloadDecision === "increase slightly"),
    );
    setStatus("idle");
    setIsConfirmOpen(false);
  }, [preview]);

  if (preview.status === "unavailable") {
    return (
      <section
        aria-labelledby="weekly-review-handoff-heading"
        className="rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface p-4 shadow-[var(--app-shadow-card)] sm:p-5"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">Bước tiếp theo</p>
        <h4 id="weekly-review-handoff-heading" className="mt-1 font-serif text-lg font-bold text-app-ink">
          Review đã được chốt
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-app-ink-soft">{getUnavailableCopy(preview)}</p>
        {onOpenTodayTab && (
          <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onOpenTodayTab}>
            Quay lại Hôm nay
          </Button>
        )}
      </section>
    );
  }

  const hasWorkloadEffect =
    preview.workloadWillChange &&
    (preview.workloadDecision === "reduce slightly" || preview.workloadDecision === "increase slightly");
  const hasSelection = (applyPriority && preview.priorityWillChange) || (applyWorkload && hasWorkloadEffect);
  const workloadActionLabel =
    preview.workloadDecision === "reduce slightly"
      ? "Giảm tải tùy chọn"
      : "Khôi phục việc tùy chọn đã tạm bỏ";

  if (!preview.priorityWillChange && !hasWorkloadEffect) {
    return (
      <section className="rounded-[var(--app-radius-card-lg)] border border-app-status-success/25 bg-app-status-success/5 p-4 shadow-[var(--app-shadow-card)] sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-app-status-success" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold leading-relaxed text-app-ink">
              Review đã lưu. Kế hoạch tuần sau đã khớp với lựa chọn của bạn.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">
              Không có ưu tiên, mức tải hoặc công việc nào cần thay đổi.
            </p>
          </div>
        </div>
        {onOpenTodayTab && (
          <Button type="button" className="mt-4 min-h-11" onClick={onOpenTodayTab}>
            Quay lại thực thi
          </Button>
        )}
      </section>
    );
  }

  const confirmApply = async () => {
    if (applyInFlightRef.current || !hasSelection) return;
    applyInFlightRef.current = true;
    setIsApplying(true);
    try {
      const result = await onConfirm({
        applyPriority: applyPriority && preview.priorityWillChange,
        applyWorkload: applyWorkload && hasWorkloadEffect,
      });
      if (result.status === "applied") {
        setStatus(result.syncStatus === "pending" ? "pending" : "applied");
      } else if (result.status === "noop") {
        setStatus("noop");
      } else if (result.status === "failed") {
        setStatus("failed");
      } else {
        setStatus("unavailable");
      }
      setIsConfirmOpen(false);
    } finally {
      applyInFlightRef.current = false;
      setIsApplying(false);
    }
  };

  if (status === "declined") {
    return (
      <section className="rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface p-4 shadow-[var(--app-shadow-card)] sm:p-5">
        <p className="text-sm font-semibold text-app-ink">Review đã lưu. Kế hoạch tuần sau được giữ nguyên.</p>
        <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">
          Các câu trả lời vẫn nằm trong review; không có lịch hoặc task nào bị đổi.
        </p>
        {onOpenTodayTab && (
          <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onOpenTodayTab}>
            Quay lại Hôm nay
          </Button>
        )}
      </section>
    );
  }

  if (status === "unavailable") {
    return (
      <section className="rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface p-4 shadow-[var(--app-shadow-card)] sm:p-5">
        <p className="text-sm font-semibold text-app-ink">Review đã lưu. Kế hoạch tuần sau chưa thay đổi.</p>
        <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">
          Bước áp dụng không còn khả dụng cho tuần này. Hãy mở Hôm nay để kiểm tra trạng thái kế hoạch mới nhất.
        </p>
        {onOpenTodayTab && (
          <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onOpenTodayTab}>
            Quay lại Hôm nay
          </Button>
        )}
      </section>
    );
  }

  if (status === "applied" || status === "pending" || status === "noop") {
    const message =
      status === "pending"
        ? "Thay đổi đã áp dụng trên thiết bị này. Máy chủ chưa xác nhận và sẽ tự đồng bộ khi sẵn sàng."
        : status === "noop"
          ? "Review đã lưu. Kế hoạch tuần sau đã khớp với lựa chọn của bạn."
          : "Review đã lưu. Thay đổi tuần sau đã được áp dụng.";
    return (
      <section className="rounded-[var(--app-radius-card-lg)] border border-app-status-success/25 bg-app-status-success/5 p-4 shadow-[var(--app-shadow-card)] sm:p-5">
        <div className="flex items-start gap-3">
          {status === "pending" ? (
            <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-app-status-warning" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-app-status-success" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm font-semibold leading-relaxed text-app-ink">{message}</p>
            <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">
              Tuần hiện tại vẫn được giữ nguyên; chỉ Tuần {preview.nextWeekNumber} nằm trong bước chuyển này.
            </p>
          </div>
        </div>
        {onOpenTodayTab && (
          <Button type="button" className="mt-4 min-h-11" onClick={onOpenTodayTab}>
            Quay lại thực thi
          </Button>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="weekly-review-handoff-heading"
      className="rounded-[var(--app-radius-card-lg)] border border-app-warm-border/25 bg-app-warm-soft/20 p-4 shadow-[var(--app-shadow-card)] sm:p-5"
    >
      <AlertDialog open={isConfirmOpen} onOpenChange={(open) => !isApplying && setIsConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Áp dụng thay đổi cho Tuần {preview.nextWeekNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Review đã lưu riêng. Chỉ các mục được chọn bên dưới mới thay đổi kế hoạch tuần sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-xl border border-app-line bg-app-bg-subtle/40 p-3 text-sm text-app-ink-soft">
            {applyPriority && preview.priorityWillChange && <p>Tiêu điểm mới: {preview.proposedPriority}</p>}
            {applyWorkload && hasWorkloadEffect && (
              <p>
                {workloadActionLabel}: {preview.affectedOptionalTaskCount} việc tùy chọn; mức tải {" "}
                {getWorkloadDecisionLabel(preview.workloadDecision)}.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>Quay lại xem trước</AlertDialogCancel>
            <AlertDialogAction
              disabled={isApplying || !hasSelection}
              onClick={(event) => {
                event.preventDefault();
                void confirmApply();
              }}
            >
              {isApplying ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                  Đang áp dụng…
                </>
              ) : (
                "Áp dụng đã chọn"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-app-warm" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-warm">Xác nhận tuần sau</p>
          <h4 id="weekly-review-handoff-heading" className="mt-1 font-serif text-lg font-bold text-app-ink">
            Review đã lưu. Kế hoạch tuần sau chưa thay đổi.
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-app-ink-soft sm:text-sm">
            Chọn đúng phần bạn muốn áp dụng. Ghi chú giữ/giảm trong review không tự được đoán thành công việc.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {preview.priorityWillChange && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-app-line bg-app-surface p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--app-accent)]"
              checked={applyPriority}
              onChange={(event) => setApplyPriority(event.target.checked)}
            />
            <span className="min-w-0 text-sm text-app-ink-soft">
              <span className="block font-semibold text-app-ink">Đổi tiêu điểm Tuần {preview.nextWeekNumber}</span>
              <span className="mt-1 block break-words">
                <span className="line-through opacity-65">{preview.currentPriority || "Chưa đặt"}</span>
                <span className="mx-1.5">→</span>
                <span className="font-semibold text-app-warm-strong">{preview.proposedPriority}</span>
              </span>
            </span>
          </label>
        )}

        {hasWorkloadEffect && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-app-line bg-app-surface p-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--app-accent)]"
              checked={applyWorkload}
              onChange={(event) => setApplyWorkload(event.target.checked)}
            />
            <span className="min-w-0 text-sm text-app-ink-soft">
              <span className="block font-semibold text-app-ink">{workloadActionLabel}</span>
              <span className="mt-1 block">
                {preview.affectedOptionalTaskCount} việc tùy chọn · {getWorkloadDecisionLabel(preview.workloadDecision)}.
                {preview.workloadDecision === "increase slightly" && " Không tạo task mới."}
              </span>
            </span>
          </label>
        )}
      </div>

      {status === "failed" && (
        <div className="mt-4 rounded-xl border border-app-status-error/25 bg-app-status-error/5 p-3">
          <p className="text-sm font-semibold text-app-status-error">
            Review đã lưu. Thay đổi kế hoạch tuần sau chưa áp dụng được.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11"
            onClick={() => setIsConfirmOpen(true)}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Thử áp dụng lại
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          className="min-h-11"
          disabled={!hasSelection || isApplying}
          onClick={() => setIsConfirmOpen(true)}
        >
          Xác nhận thay đổi tuần sau
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={isApplying}
          onClick={() => setStatus("declined")}
        >
          Giữ kế hoạch hiện tại
        </Button>
      </div>
    </section>
  );
}
