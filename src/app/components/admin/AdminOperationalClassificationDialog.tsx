import { useEffect, useRef, useState } from "react";
import type {
  AdminClassificationMutationPayload,
  AdminOperationalCategory,
  AdminOperationalClassificationReason,
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
} from "../ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const REASONS_BY_CATEGORY: Record<AdminOperationalCategory, readonly AdminOperationalClassificationReason[]> = {
  real: ["confirmed_real"],
  test: ["test_account", "automated_qa", "other"],
  internal: ["internal_team", "other"],
};

const REASON_LABELS: Record<AdminOperationalClassificationReason, string> = {
  confirmed_real: "Xác nhận dữ liệu thật",
  test_account: "Tài khoản kiểm thử",
  automated_qa: "Kiểm thử tự động",
  internal_team: "Đội ngũ nội bộ",
  other: "Lý do khác",
};

interface ClassificationDraft {
  category: AdminOperationalCategory;
  reason: AdminOperationalClassificationReason;
  note: string;
}

export interface AdminOperationalClassificationDialogProps {
  open: boolean;
  targetType: "user" | "payment_order" | "physical_order";
  targetLabel: string;
  initialCategory: AdminOperationalCategory;
  initialReason?: AdminOperationalClassificationReason;
  initialNote?: string;
  pending: boolean;
  error?: string;
  onOpenChange(open: boolean): void;
  onConfirm(payload: Omit<AdminClassificationMutationPayload, "requestId">): Promise<void> | void;
}

function createDraft(
  category: AdminOperationalCategory,
  initialReason?: AdminOperationalClassificationReason,
  initialNote?: string,
): ClassificationDraft {
  const reasons = REASONS_BY_CATEGORY[category];
  const reason = initialReason && reasons.includes(initialReason) ? initialReason : reasons[0];
  return { category, reason, note: initialNote ?? "" };
}

function isOperationalCategory(value: string): value is AdminOperationalCategory {
  return value === "real" || value === "test" || value === "internal";
}

function isOperationalReason(value: string): value is AdminOperationalClassificationReason {
  return REASONS_BY_CATEGORY.real.includes(value as AdminOperationalClassificationReason)
    || REASONS_BY_CATEGORY.test.includes(value as AdminOperationalClassificationReason)
    || REASONS_BY_CATEGORY.internal.includes(value as AdminOperationalClassificationReason);
}

export function AdminOperationalClassificationDialog({
  open,
  targetType,
  targetLabel,
  initialCategory,
  initialReason,
  initialNote,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: AdminOperationalClassificationDialogProps) {
  const resetDraft = () => createDraft(initialCategory, initialReason, initialNote);
  const [draft, setDraft] = useState(resetDraft);
  const [validationError, setValidationError] = useState<string>();
  const wasOpen = useRef(open);

  // Reset only at open/close boundaries so edits are not overwritten while the dialog remains open.
  useEffect(() => {
    if (open !== wasOpen.current) {
      setDraft(resetDraft());
      setValidationError(undefined);
      wasOpen.current = open;
    }
  }, [open, initialCategory, initialReason, initialNote]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDraft(resetDraft());
      setValidationError(undefined);
    }
    onOpenChange(nextOpen);
  };

  const handleCategoryChange = (value: string) => {
    if (!isOperationalCategory(value)) return;
    setDraft((current) => ({
      ...current,
      category: value,
      reason: REASONS_BY_CATEGORY[value][0],
    }));
    setValidationError(undefined);
  };

  const handleReasonChange = (value: string) => {
    if (!isOperationalReason(value) || !REASONS_BY_CATEGORY[draft.category].includes(value)) return;
    setDraft((current) => ({ ...current, reason: value }));
    setValidationError(undefined);
  };

  const handleConfirm = async (event: Event) => {
    event.preventDefault();
    const note = draft.note.trim();
    if (draft.reason === "other" && !note) {
      setValidationError("Nhập ghi chú cho lý do khác.");
      return;
    }
    if (note.length > 200) {
      setValidationError("Ghi chú không được quá 200 ký tự.");
      return;
    }

    setValidationError(undefined);
    await onConfirm({
      category: draft.category,
      reason: draft.reason,
      ...(note ? { note } : {}),
    });
  };

  const currentError = validationError ?? error;
  const reasons = REASONS_BY_CATEGORY[draft.category];

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Phân loại dữ liệu vận hành</AlertDialogTitle>
          <AlertDialogDescription>
            Cập nhật phân loại cho {targetLabel}. Thay đổi này chỉ ảnh hưởng báo cáo, không thay đổi quyền hoặc trạng thái đơn.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4">
          {targetType === "user" ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Phân loại tài khoản sẽ áp dụng cho Plus, thanh toán và in ấn trong báo cáo.
            </p>
          ) : null}

          <div className="grid gap-2">
            <label htmlFor="admin-operational-category" className="text-sm font-medium text-app-ink">
              Phân loại
            </label>
            <Select value={draft.category} onValueChange={handleCategoryChange} disabled={pending}>
              <SelectTrigger id="admin-operational-category" aria-label="Phân loại">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="real">Dữ liệu thật</SelectItem>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="internal">Nội bộ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="admin-operational-reason" className="text-sm font-medium text-app-ink">
              Lý do
            </label>
            <Select value={draft.reason} onValueChange={handleReasonChange} disabled={pending}>
              <SelectTrigger id="admin-operational-reason" aria-label="Lý do">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {REASON_LABELS[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="admin-operational-note" className="text-sm font-medium text-app-ink">
              Ghi chú
            </label>
            <textarea
              id="admin-operational-note"
              aria-label="Ghi chú"
              value={draft.note}
              maxLength={200}
              disabled={pending}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
              className="min-h-24 rounded-lg border border-app-line bg-app-surface px-3 py-2 text-sm text-app-ink outline-none focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/20"
            />
            <p className="text-xs text-app-ink-soft">Tối đa 200 ký tự. Lý do khác cần có ghi chú.</p>
          </div>

          <p className="text-xs text-app-ink-soft">
            Không nhập mật khẩu, secret, thông tin ngân hàng hoặc dữ liệu khách hàng không cần thiết vào ghi chú.
          </p>
          {currentError ? <p role="alert" className="text-sm text-red-700">{currentError}</p> : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={handleConfirm}>
            Xác nhận phân loại
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
