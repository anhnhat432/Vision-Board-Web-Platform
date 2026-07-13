import { AdminFeedbackBanner } from "./AdminFeedbackBanner";

export interface AdminBulkClassificationResult {
  updated: number;
  unchanged: number;
  failed: Array<{ userUid: string; errorCode: string }>;
  transportFailed?: boolean;
}

interface AdminBulkClassificationFeedbackProps {
  result: AdminBulkClassificationResult;
  onDismiss: () => void;
}

export function AdminBulkClassificationFeedback({
  result,
  onDismiss,
}: AdminBulkClassificationFeedbackProps) {
  const hasFailures = result.failed.length > 0;
  const summary = result.transportFailed
    ? "Không thể gửi yêu cầu phân loại. Bạn có thể thử lại."
    : `${result.updated} đã cập nhật, ${result.unchanged} không thay đổi, ${result.failed.length} thất bại.`;

  return (
    <AdminFeedbackBanner
      tone={result.transportFailed ? "error" : hasFailures ? "warning" : "success"}
      summary={summary}
      onDismiss={onDismiss}
      dismissLabel="Đóng thông báo kết quả phân loại"
      detailsLabel={hasFailures ? `${result.failed.length} mục thất bại` : undefined}
      details={
        hasFailures ? (
          <ul className="space-y-1 break-all">
            {result.failed.map((item) => (
              <li key={`${item.userUid}:${item.errorCode}`}>
                {item.userUid} · {item.errorCode}
              </li>
            ))}
          </ul>
        ) : undefined
      }
    />
  );
}
