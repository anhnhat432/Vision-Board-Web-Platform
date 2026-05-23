import type { TwelveWeekImportValidationReport } from "@/services/syncService";
import { getRouteTone as getFallbackRouteTone } from "./routeMeta";

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

export function getImportValidationReportFromError(
  error: unknown,
): TwelveWeekImportValidationReport | null {
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

export function getRouteTone(pathname: string): string | undefined {
  if (pathname.startsWith("/login")) return "onboarding";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/12-week-setup")) return "setup";
  if (pathname.startsWith("/12-week-system")) return "system";
  if (pathname.startsWith("/smart-goal-setup")) return "setup";
  if (pathname.startsWith("/feasibility")) return "setup";
  if (pathname.startsWith("/life-insight")) return "setup";
  if (pathname.startsWith("/life-balance")) return "balance";
  if (pathname.startsWith("/vision")) return "vision";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/achievements")) return "achievements";
  if (pathname.startsWith("/billing")) return "billing";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/gallery")) return "vision";
  if (pathname.startsWith("/vision-board")) return "vision";
  if (pathname.startsWith("/goals")) return "system";

  const fallbackTone = getFallbackRouteTone(pathname);
  return fallbackTone === "default" ? undefined : fallbackTone;
}
