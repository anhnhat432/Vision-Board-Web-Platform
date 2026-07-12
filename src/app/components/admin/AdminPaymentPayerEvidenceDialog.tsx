import type { AdminPaymentPayerSource } from "@/services/adminService";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const LABELS = {
  internal: "Nội bộ",
  external: "Nguồn ngoài",
  unknown: "Chưa xác định",
} as const;

const RECONCILIATION_DESCRIPTIONS: Record<keyof typeof LABELS, string> = {
  internal: "Tài khoản chuyển tiền trùng danh sách nội bộ đã cấu hình.",
  external: "Tài khoản chuyển tiền không nằm trong danh sách nội bộ đã cấu hình.",
  unknown: "PayOS không trả đủ dữ liệu tài khoản để kết luận.",
};

export function getPayerEvidenceDescription(payer: AdminPaymentPayerSource): string {
  if (payer.classification !== "unknown") {
    return RECONCILIATION_DESCRIPTIONS[payer.classification];
  }
  if (payer.accountMasked || payer.accountLast4) {
    return "PayOS đã cung cấp dữ liệu người chuyển, nhưng chưa thể so sánh. Hãy kiểm tra PAYMENT_PAYER_HASH_KEY và INTERNAL_PAYER_ACCOUNT_NUMBERS trên Render.";
  }
  if (payer.accountNameMasked || payer.bankName) {
    return "PayOS chỉ cung cấp một phần thông tin người chuyển nên chưa thể phân loại nguồn tiền.";
  }
  return "PayOS không cung cấp thông tin tài khoản người chuyển cho giao dịch này. Khả năng cung cấp phụ thuộc ngân hàng liên kết với PayOS.";
}

export interface AdminPaymentPayerEvidenceDialogProps {
  open: boolean;
  payer: AdminPaymentPayerSource | null;
  onOpenChange(open: boolean): void;
}

export function AdminPaymentPayerEvidenceDialog({
  open,
  payer,
  onOpenChange,
}: AdminPaymentPayerEvidenceDialogProps) {
  const rows: Array<[string, string]> = payer
    ? [
        ["Kết quả", LABELS[payer.classification]],
        ["Dữ liệu người chuyển", getPayerEvidenceDescription(payer)],
        ...(payer.accountNameMasked
          ? ([["Chủ tài khoản", payer.accountNameMasked]] as Array<[string, string]>)
          : []),
        ...(payer.accountMasked || payer.accountLast4
          ? ([["Số tài khoản", payer.accountMasked ?? `****${payer.accountLast4}`]] as Array<[string, string]>)
          : []),
        ...(payer.bankName ? ([["Ngân hàng", payer.bankName]] as Array<[string, string]>) : []),
        ...(payer.transactionReference
          ? ([["Mã giao dịch PayOS", payer.transactionReference]] as Array<[string, string]>)
          : []),
        ...(payer.transactionDateTime
          ? ([["Thời gian PayOS xác nhận", payer.transactionDateTime]] as Array<[string, string]>)
          : []),
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hồ sơ đối chiếu PayOS</DialogTitle>
          <DialogDescription>
            Kết quả chỉ so sánh với danh sách tài khoản nội bộ đã cấu hình, không chứng minh danh tính người chuyển tiền
            hoặc KYC.
          </DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-app-line rounded-[var(--r-card)] border border-app-line bg-app-bg-subtle">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
              <dt className="text-sm font-medium text-app-ink-muted">{label}</dt>
              <dd className="break-words text-sm text-app-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
