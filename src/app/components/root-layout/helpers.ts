import type { TwelveWeekImportValidationReport } from "@/services/syncService";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isImportValidationReport(value: unknown): value is TwelveWeekImportValidationReport {
  return (
    isRecord(value) &&
    (value.status === "valid" || value.status === "invalid") &&
    value.mode === "validate_only" &&
    value.dryRun === true &&
    isRecord(value.acceptedEntityCounts) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.errors)
  );
}

export function getImportValidationReportFromError(error: unknown): TwelveWeekImportValidationReport | null {
  if (!isRecord(error)) return null;

  if (isImportValidationReport(error.details)) return error.details;
  if (isRecord(error.details) && isImportValidationReport(error.details.details)) {
    return error.details.details;
  }

  return null;
}

export function getErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Không thể kiểm tra dữ liệu tài khoản lúc này.";
}

export function createImportValidationRequestId(): string {
  return `import_validate_${Date.now().toString(36)}`;
}

export function createCloudImportId(): string {
  return `cloud_import_${Date.now().toString(36)}`;
}


