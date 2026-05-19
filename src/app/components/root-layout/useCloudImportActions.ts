import { useCallback } from "react";

import { shouldEnable12WeekCloudImport, shouldEnable12WeekImportDryRun } from "../../utils/app-mode";
import { getUserData, trackAppEvent } from "../../utils/storage";
import {
  hasCompletedCloudImport,
  markCloudImportCompleted,
  type LocalDataMigrationCandidate,
} from "../../utils/local-data-migration";
import {
  createTwelveWeekImportPayload,
  type TwelveWeekImportPayload,
} from "@/features/plan12week/persistence/twelveWeekImportPayload";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import {
  post12WeekImport,
  post12WeekImportValidation,
  type TwelveWeekImportRequest,
  type TwelveWeekImportValidationReport,
  type TwelveWeekImportValidationRequest,
} from "@/services/syncService";
import type { CloudImportDryRunResult, CloudImportResult } from "./LocalDataMigrationPrompt";

interface UseCloudImportActionsOptions {
  demoMode: boolean;
  userUid: string | null;
  localDataMigrationCandidate: LocalDataMigrationCandidate | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isImportValidationReport(value: unknown): value is TwelveWeekImportValidationReport {
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

function getImportValidationReportFromError(error: unknown): TwelveWeekImportValidationReport | null {
  if (!isRecord(error)) return null;

  if (isImportValidationReport(error.details)) return error.details;
  if (isRecord(error.details) && isImportValidationReport(error.details.details)) {
    return error.details.details;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Không thể kiểm tra dữ liệu tài khoản lúc này.";
}

function createImportValidationRequestId(): string {
  return `import_validate_${Date.now().toString(36)}`;
}

function createCloudImportId(): string {
  return `cloud_import_${Date.now().toString(36)}`;
}

function getImportPayloads(): TwelveWeekImportPayload[] {
  return getUserData()
    .goals.map(createTwelveWeekImportPayload)
    .filter((payload): payload is TwelveWeekImportPayload => Boolean(payload));
}

function getCloudImportUnavailableReason({
  demoMode,
  userUid,
  apiConfigured,
  featureEnabled,
  loginMessage,
  disabledMessage,
}: {
  demoMode: boolean;
  userUid: string | null;
  apiConfigured: boolean;
  featureEnabled: boolean;
  loginMessage: string;
  disabledMessage: string;
}): string | undefined {
  if (demoMode) return "Dữ liệu hiện chỉ lưu trên thiết bị này, chưa bật nhập dữ liệu tài khoản.";
  if (!userUid) return loginMessage;
  if (!apiConfigured) return "Kết nối tài khoản chưa được cấu hình cho không gian làm việc này.";
  if (!featureEnabled) return disabledMessage;
  return undefined;
}

export function useCloudImportActions({
  demoMode,
  userUid,
  localDataMigrationCandidate,
}: UseCloudImportActionsOptions) {
  const apiConfigured = isApiBaseUrlConfigured();
  const dryRunFeatureEnabled = shouldEnable12WeekImportDryRun();
  const cloudImportFeatureEnabled = shouldEnable12WeekCloudImport();
  const cloudImportDryRunEnabled = !demoMode && Boolean(userUid) && apiConfigured && dryRunFeatureEnabled;
  const cloudImportEnabled = !demoMode && Boolean(userUid) && apiConfigured && cloudImportFeatureEnabled;
  const cloudImportDryRunUnavailableReason = getCloudImportUnavailableReason({
    demoMode,
    userUid,
    apiConfigured,
    featureEnabled: dryRunFeatureEnabled,
    loginMessage: "Bạn cần đăng nhập trước khi kiểm tra dữ liệu tài khoản.",
    disabledMessage: "Kiểm tra dữ liệu trước khi đồng bộ chưa được bật.",
  });
  const cloudImportUnavailableReason = getCloudImportUnavailableReason({
    demoMode,
    userUid,
    apiConfigured,
    featureEnabled: cloudImportFeatureEnabled,
    loginMessage: "Bạn cần đăng nhập trước khi nhập dữ liệu tài khoản.",
    disabledMessage: "Đồng bộ dữ liệu tài khoản chưa được bật.",
  });
  const cloudImportAlreadyCompleted = Boolean(
    userUid && localDataMigrationCandidate && hasCompletedCloudImport(userUid, localDataMigrationCandidate.fingerprint),
  );

  const handleValidateCloudImport = useCallback(async (): Promise<CloudImportDryRunResult> => {
    if (cloudImportDryRunUnavailableReason) {
      return { status: "skipped", message: cloudImportDryRunUnavailableReason };
    }

    const importPayloads = getImportPayloads();
    if (importPayloads.length === 0) {
      return {
        status: "skipped",
        message: "Tài khoản chưa có dữ liệu 12 tuần để kiểm tra.",
      };
    }

    const requestId = createImportValidationRequestId();
    const request: TwelveWeekImportValidationRequest = {
      requestId,
      idempotencyKey: `account_scope_import_dry_run:${requestId}`,
      source: "account_scope_import_dry_run",
      mode: "validate_only",
      workspace: {
        goals: importPayloads,
      },
    };

    try {
      const report = await post12WeekImportValidation(request);
      return {
        status: report.status === "valid" ? "valid" : "invalid",
        message:
          report.status === "valid"
            ? "Dữ liệu hợp lệ để đồng bộ lên tài khoản. Chưa có dữ liệu nào bị thay đổi."
            : "Dữ liệu chưa sẵn sàng để đồng bộ lên tài khoản.",
        report,
      };
    } catch (error) {
      const report = getImportValidationReportFromError(error);
      if (report) {
        return {
          status: "invalid",
          message: "Dữ liệu chưa sẵn sàng để đồng bộ lên tài khoản.",
          report,
        };
      }

      return {
        status: "error",
        message: getErrorMessage(error),
      };
    }
  }, [cloudImportDryRunUnavailableReason]);

  const handleCloudImport = useCallback(async (): Promise<CloudImportResult> => {
    if (cloudImportUnavailableReason) {
      return { status: "skipped", message: cloudImportUnavailableReason };
    }

    if (!userUid) {
      return { status: "skipped", message: "Bạn cần đăng nhập trước khi nhập dữ liệu tài khoản." };
    }

    const importPayloads = getImportPayloads();
    if (importPayloads.length === 0) {
      return {
        status: "skipped",
        message: "Tài khoản chưa có dữ liệu 12 tuần để đồng bộ.",
      };
    }

    trackAppEvent("cloud_import_started", undefined, {
      goalCount: String(importPayloads.length),
      source: "local_data_migration_prompt",
    });

    const importId = createCloudImportId();
    const request: TwelveWeekImportRequest = {
      importId,
      idempotencyKey: `account_scope_cloud_import:${importId}`,
      source: "account_scope_cloud_import",
      workspace: {
        goals: importPayloads,
      },
    };

    try {
      const response = await post12WeekImport(request);
      const succeeded = response.status === "applied" || response.status === "duplicate";

      if (succeeded && localDataMigrationCandidate) {
        markCloudImportCompleted(userUid, localDataMigrationCandidate.fingerprint);
      }

      trackAppEvent(succeeded ? "cloud_import_succeeded" : "cloud_import_partial", undefined, {
        status: response.status,
        importId,
      });

      return {
        status: response.status,
        message:
          response.status === "applied"
            ? "Dữ liệu đã được đồng bộ lên tài khoản thành công."
            : response.status === "duplicate"
              ? "Dữ liệu này đã được đồng bộ lên tài khoản trước đó."
              : response.status === "partial"
                ? "Đồng bộ dữ liệu thành công một phần. Một số mục có thể chưa được lưu."
                : response.message || "Đồng bộ dữ liệu thất bại.",
        response,
      };
    } catch (error) {
      trackAppEvent("cloud_import_failed", undefined, {
        errorCode: isRecord(error) && typeof error.errorCode === "string" ? error.errorCode : "unknown",
        importId,
      });

      return {
        status: "error",
        message:
          isRecord(error) && typeof error.message === "string" && error.message.trim()
            ? error.message
            : "Không thể đồng bộ dữ liệu tài khoản lúc này. Dữ liệu trên thiết bị vẫn an toàn.",
      };
    }
  }, [cloudImportUnavailableReason, localDataMigrationCandidate, userUid]);

  return {
    cloudImportDryRunEnabled,
    cloudImportDryRunUnavailableReason,
    handleValidateCloudImport,
    cloudImportEnabled,
    cloudImportUnavailableReason,
    cloudImportAlreadyCompleted,
    handleCloudImport,
  };
}
