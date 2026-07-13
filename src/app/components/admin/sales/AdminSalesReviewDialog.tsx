import { useEffect, useState } from "react";

import type {
  AdminReviewSalesOrderPayload,
  AdminSalesExclusionReason,
  AdminSalesReportRow,
} from "@/services/adminService";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { Textarea } from "../../ui/textarea";

export interface AdminSalesReviewDialogProps {
  item: AdminSalesReportRow | null;
  busy: boolean;
  error: string | null;
  onOpenChange(open: boolean): void;
  onConfirm(payload: AdminReviewSalesOrderPayload): Promise<void>;
}

const EXCLUSION_REASONS: Array<{ value: AdminSalesExclusionReason; label: string }> = [
  { value: "internal_team", label: "Giao dịch nội bộ" },
  { value: "test", label: "Giao dịch kiểm thử" },
  { value: "duplicate", label: "Giao dịch trùng lặp" },
  { value: "other", label: "Lý do khác" },
];

const REVIEW_NOTE_ID = "admin-sales-review-note";

export function AdminSalesReviewDialog({
  item,
  busy,
  error,
  onOpenChange,
  onConfirm,
}: AdminSalesReviewDialogProps) {
  const [status, setStatus] = useState<"included" | "excluded">("included");
  const [exclusionReason, setExclusionReason] = useState<AdminSalesExclusionReason | "">("");
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    if (!item) return;
    setStatus(item.reporting.kpiStatus === "excluded" ? "excluded" : "included");
    setExclusionReason(item.reporting.exclusionReason ?? "");
    setReviewNote("");
  }, [item]);

  const note = reviewNote.trim();
  const validationError =
    status === "excluded" && !exclusionReason
      ? "Chọn lý do loại khỏi KPI."
      : status === "excluded" && exclusionReason === "other" && !note
        ? "Nhập ghi chú cho lý do khác."
        : status === "included" && item?.isManualCompletion && !note
          ? "Đơn hoàn tất thủ công cần ghi chú đối chiếu."
          : null;

  return (
    <AlertDialog open={item !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duyệt KPI {item?.orderId}</AlertDialogTitle>
          <AlertDialogDescription>
            Chỉ cập nhật trạng thái báo cáo. Thao tác này không thay đổi thanh toán, gói dịch vụ hoặc quyền truy cập.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <fieldset className="grid gap-3" disabled={busy}>
          <legend className="text-sm font-medium text-app-ink">Quyết định KPI</legend>
          <label className="flex items-center gap-2 text-sm text-app-ink">
            <input
              type="radio"
              name="sales-kpi-status"
              checked={status === "included"}
              onChange={() => setStatus("included")}
            />
            Được tính KPI
          </label>
          <label className="flex items-center gap-2 text-sm text-app-ink">
            <input
              type="radio"
              name="sales-kpi-status"
              checked={status === "excluded"}
              onChange={() => setStatus("excluded")}
            />
            Không tính KPI
          </label>
          {status === "excluded" ? (
            <label className="grid gap-2 text-sm font-medium text-app-ink">
              Lý do loại khỏi KPI
              <select
                value={exclusionReason}
                onChange={(event) => setExclusionReason(event.target.value as AdminSalesExclusionReason | "")}
                className="h-11 rounded-lg border border-app-line bg-app-surface px-3 text-sm text-app-ink"
              >
                <option value="">Chọn lý do</option>
                {EXCLUSION_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
              </select>
            </label>
          ) : null}
          <label htmlFor={REVIEW_NOTE_ID} className="grid gap-2 text-sm font-medium text-app-ink">
            Ghi chú duyệt
            <Textarea id={REVIEW_NOTE_ID} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          </label>
        </fieldset>
        {validationError ? <p role="alert" className="text-sm text-rose-600">{validationError}</p> : null}
        {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || Boolean(validationError)}
            onClick={async (event) => {
              event.preventDefault();
              if (validationError) return;
              const payload: AdminReviewSalesOrderPayload = status === "included"
                ? { kpiStatus: "included", ...(note ? { reviewNote: note } : {}) }
                : {
                    kpiStatus: "excluded",
                    exclusionReason: exclusionReason as AdminSalesExclusionReason,
                    ...(note ? { reviewNote: note } : {}),
                  };
              await onConfirm(payload);
            }}
          >
            {busy ? "Đang lưu..." : "Xác nhận duyệt"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
