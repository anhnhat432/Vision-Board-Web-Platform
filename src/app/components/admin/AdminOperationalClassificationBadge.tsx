import type { AdminOperationalClassificationSummary } from "@/services/adminService";
import { AdminStatusBadge } from "./AdminStatusBadge";

export function getAdminOperationalClassificationSourceLabel(
  source: AdminOperationalClassificationSummary["source"],
): string {
  if (source === "user") return "Theo phân loại tài khoản";
  if (source === "record") return "Đánh dấu trực tiếp";
  if (source === "legacy_sales_review") return "Theo duyệt KPI cũ";
  return "Mặc định dữ liệu thật";
}

export function AdminOperationalClassificationBadge({
  classification,
}: {
  classification: AdminOperationalClassificationSummary;
}) {
  if (classification.effectiveCategory === "real") return null;

  const isTest = classification.effectiveCategory === "test";
  return <AdminStatusBadge tone={isTest ? "pending" : "expired"}>{isTest ? "Test" : "Nội bộ"}</AdminStatusBadge>;
}
