import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Cloud, Database, Download, Eye, Loader2, ShieldCheck, Upload } from "lucide-react";
import type {
  LocalDataAccountImportResult,
  LocalDataMigrationCandidate,
  LocalDataMigrationSummary,
} from "../../utils/local-data-migration";
import type { TwelveWeekImportValidationReport } from "@/services/syncService";
import type { TwelveWeekImportResponse } from "@/services/syncService";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export type CloudImportDryRunResultStatus = "valid" | "invalid" | "skipped" | "error";

export interface CloudImportDryRunResult {
  status: CloudImportDryRunResultStatus;
  message: string;
  report?: TwelveWeekImportValidationReport;
}

export type CloudImportResultStatus = "applied" | "duplicate" | "partial" | "failed" | "skipped" | "error";

export interface CloudImportResult {
  status: CloudImportResultStatus;
  message: string;
  response?: TwelveWeekImportResponse;
}

interface LocalDataMigrationPromptProps {
  candidate: LocalDataMigrationCandidate | null;
  open: boolean;
  onImport: () => LocalDataAccountImportResult;
  onValidateCloudImport?: () => Promise<CloudImportDryRunResult>;
  onCloudImport?: () => Promise<CloudImportResult>;
  cloudImportDryRunEnabled?: boolean;
  cloudImportEnabled?: boolean;
  cloudImportUnavailableReason?: string;
  cloudImportDryRunUnavailableReason?: string;
  cloudImportAlreadyCompleted?: boolean;
  onExportBackup?: () => void;
  onSkip: () => void;
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}`;
}

function buildSummaryItems(summary: LocalDataMigrationSummary): string[] {
  return [
    formatCount(summary.goalCount, "goals"),
    formatCount(summary.twelveWeekSystemCount, "12-week systems"),
    formatCount(summary.taskCount, "tasks"),
    formatCount(summary.dailyCheckInCount, "daily check-ins"),
    formatCount(summary.weeklyReviewCount, "weekly reviews"),
    formatCount(summary.wheelRecordCount, "life balance snapshots"),
    formatCount(summary.reflectionCount, "reflections"),
    formatCount(summary.visionBoardCount, "vision boards"),
  ].filter((item) => !item.startsWith("0 "));
}

function buildValidationCountSummary(report: TwelveWeekImportValidationReport | undefined): string | null {
  if (!report) return null;

  const counts = report.acceptedEntityCounts;
  return [
    formatCount(counts.goals, "goals"),
    formatCount(counts.plans, "plans"),
    formatCount(counts.weeks, "weeks"),
    formatCount(counts.tasks, "tasks"),
    formatCount(counts.dailyCheckIns, "daily check-ins"),
    formatCount(counts.weeklyReviews, "weekly reviews"),
  ]
    .filter((item) => !item.startsWith("0 "))
    .join(", ");
}

export function LocalDataMigrationPrompt({
  candidate,
  open,
  onImport,
  onValidateCloudImport,
  onCloudImport,
  cloudImportDryRunEnabled = false,
  cloudImportEnabled = false,
  cloudImportUnavailableReason,
  cloudImportDryRunUnavailableReason,
  cloudImportAlreadyCompleted = false,
  onExportBackup,
  onSkip,
}: LocalDataMigrationPromptProps) {
  const [showReview, setShowReview] = useState(false);
  const [importResult, setImportResult] = useState<LocalDataAccountImportResult | null>(null);
  const [cloudImportResult, setCloudImportResult] = useState<CloudImportDryRunResult | null>(null);
  const [cloudImportChecking, setCloudImportChecking] = useState(false);
  const [cloudWriteResult, setCloudWriteResult] = useState<CloudImportResult | null>(null);
  const [cloudWriteLoading, setCloudWriteLoading] = useState(false);
  const [showCloudImportConfirm, setShowCloudImportConfirm] = useState(false);
  const summaryItems = useMemo(() => (candidate ? buildSummaryItems(candidate.summary) : []), [candidate]);
  const accountSummaryItems = useMemo(
    () => (importResult?.accountSummary ? buildSummaryItems(importResult.accountSummary) : []),
    [importResult?.accountSummary],
  );

  useEffect(() => {
    if (!open) {
      setShowReview(false);
      setImportResult(null);
      setCloudImportResult(null);
      setCloudImportChecking(false);
      setCloudWriteResult(null);
      setCloudWriteLoading(false);
      setShowCloudImportConfirm(false);
    }
  }, [open]);

  useEffect(() => {
    setImportResult(null);
    setCloudImportResult(null);
    setCloudImportChecking(false);
    setCloudWriteResult(null);
    setCloudWriteLoading(false);
    setShowCloudImportConfirm(false);
  }, [candidate?.fingerprint]);

  if (!candidate) return null;

  const handleImport = () => {
    setImportResult(onImport());
    setCloudImportResult(null);
    setCloudWriteResult(null);
  };

  const importSucceeded = importResult?.status === "imported";
  const importBlocked = importResult?.status === "blocked_existing_account_data";
  const hasTwelveWeekData = candidate.summary.twelveWeekSystemCount > 0;
  const canRunCloudDryRun =
    importSucceeded && cloudImportDryRunEnabled && Boolean(onValidateCloudImport) && !cloudImportChecking;
  const cloudValidationSummary = buildValidationCountSummary(cloudImportResult?.report);

  const canRunCloudImport =
    importSucceeded &&
    cloudImportEnabled &&
    Boolean(onCloudImport) &&
    !cloudWriteLoading &&
    !cloudImportAlreadyCompleted;
  const cloudWriteSucceeded = cloudWriteResult?.status === "applied" || cloudWriteResult?.status === "duplicate";

  const handleValidateCloudImport = async () => {
    if (!onValidateCloudImport) return;

    setCloudImportChecking(true);
    setCloudImportResult(null);
    try {
      setCloudImportResult(await onValidateCloudImport());
    } finally {
      setCloudImportChecking(false);
    }
  };

  const handleCloudImport = async () => {
    if (!onCloudImport) return;

    setCloudWriteLoading(true);
    setCloudWriteResult(null);
    try {
      setCloudWriteResult(await onCloudImport());
    } finally {
      setCloudWriteLoading(false);
      setShowCloudImportConfirm(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onSkip();
      }}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Database className="h-5 w-5" />
          </div>
          <DialogTitle>Có dữ liệu local trên trình duyệt này</DialogTitle>
          <DialogDescription className="leading-6">
            Bạn vừa đăng nhập. App sẽ không tự import hoặc ghi đè workspace account. Nếu chọn Import, dữ liệu
            anonymous sẽ được copy vào workspace account trên trình duyệt này.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="leading-6">
              Dữ liệu anonymous vẫn được giữ lại sau import. Bạn nên export backup trước khi import cloud.
            </p>
          </div>
        </div>

        {importResult ? (
          <div
            className={`rounded-2xl border p-4 text-sm leading-6 ${
              importSucceeded
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : importBlocked
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-red-200 bg-red-50 text-red-700"
            }`}
            role={importSucceeded ? "status" : "alert"}
          >
            {importSucceeded ? (
              <p>
                Đã copy dữ liệu vào account scope trên trình duyệt này. Đây chưa phải cloud sync hoàn chỉnh, và bản
                anonymous vẫn được giữ nguyên.
              </p>
            ) : importBlocked ? (
              <div className="space-y-2">
                <p>
                  Account này đã có dữ liệu local/account. Phase 1 sẽ không ghi đè tự động. Hãy review hoặc export dữ
                  liệu trước khi merge thủ công ở phase sau.
                </p>
                {accountSummaryItems.length > 0 ? (
                  <p className="text-xs font-medium">
                    Dữ liệu account hiện có: {accountSummaryItems.join(", ")}.
                  </p>
                ) : null}
              </div>
            ) : importResult.status === "fingerprint_mismatch" ? (
              <p>Snapshot anonymous đã thay đổi. Hãy đóng prompt và mở lại trước khi import.</p>
            ) : importResult.status === "inactive_auth_scope" ? (
              <p>Workspace account hiện tại chưa sẵn sàng. Dữ liệu anonymous vẫn được giữ nguyên.</p>
            ) : (
              <p>Không thể import lúc này. Dữ liệu anonymous vẫn được giữ nguyên, hãy thử lại sau.</p>
            )}
          </div>
        ) : null}

        {showReview ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="Local data summary">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Eye className="h-4 w-4 text-slate-500" />
              Local data found
            </div>
            {summaryItems.length > 0 ? (
              <ul className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                {summaryItems.map((item) => (
                  <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">Không có mục nào cần import trong snapshot này.</p>
            )}
          </section>
        ) : null}

        {hasTwelveWeekData ? (
          <section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4" aria-label="Cloud import">
            <div className="flex items-start gap-3">
              <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Import dữ liệu lên cloud</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Gửi dữ liệu 12 tuần từ browser này lên backend account. Dữ liệu local/anonymous vẫn được giữ
                    nguyên sau import.
                  </p>
                </div>

                {!importSucceeded ? (
                  <p className="rounded-xl bg-white/75 px-3 py-2 text-xs font-medium text-slate-600">
                    Hãy import local data vào account scope trên trình duyệt này trước khi import cloud.
                  </p>
                ) : !cloudImportEnabled ? (
                  <p className="rounded-xl bg-white/75 px-3 py-2 text-xs font-medium text-amber-700">
                    {cloudImportUnavailableReason ?? "Cloud import chưa được bật cho workspace này."}
                  </p>
                ) : cloudImportAlreadyCompleted && !cloudWriteSucceeded ? (
                  <p className="rounded-xl bg-white/75 px-3 py-2 text-xs font-medium text-emerald-700">
                    Dữ liệu này đã được import lên cloud trước đó.
                  </p>
                ) : null}

                {/* Cloud import result */}
                {cloudWriteResult ? (
                  <div
                    className={`rounded-xl border px-3 py-2 text-sm leading-6 ${
                      cloudWriteSucceeded
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : cloudWriteResult.status === "partial"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-red-200 bg-red-50 text-red-700"
                    }`}
                    role={cloudWriteSucceeded ? "status" : "alert"}
                  >
                    <p className="font-medium">{cloudWriteResult.message}</p>
                    {cloudWriteSucceeded ? (
                      <p className="mt-1 text-xs">
                        Dữ liệu đã được ghi lên cloud. Bản local/anonymous vẫn được giữ nguyên.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs">
                        Dữ liệu local không bị ảnh hưởng. Bạn có thể thử lại.
                      </p>
                    )}
                  </div>
                ) : null}

                {/* Confirmation dialog inline */}
                {showCloudImportConfirm && canRunCloudImport && !cloudWriteLoading ? (
                  <div className="rounded-xl border border-sky-200 bg-white p-3 space-y-3">
                    <p className="text-sm font-medium text-slate-900">Xác nhận import cloud</p>
                    <p className="text-xs leading-5 text-slate-600">
                      Dữ liệu 12 tuần sẽ được gửi lên backend. Bản anonymous/local vẫn được giữ nguyên. Nên export
                      backup trước khi tiếp tục.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCloudImportConfirm(false)}
                      >
                        Hủy
                      </Button>
                      {onExportBackup ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={onExportBackup}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Export backup
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCloudImport}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Xác nhận import
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Dry-run validation results */}
                {cloudImportResult ? (
                  <div
                    className={`rounded-xl border px-3 py-2 text-sm leading-6 ${
                      cloudImportResult.status === "valid"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : cloudImportResult.status === "invalid"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-red-200 bg-red-50 text-red-700"
                    }`}
                    role={cloudImportResult.status === "valid" ? "status" : "alert"}
                  >
                    <p className="font-medium">{cloudImportResult.message}</p>
                    {cloudValidationSummary ? <p className="text-xs">Validated: {cloudValidationSummary}.</p> : null}
                    {cloudImportResult.report?.warnings.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                        {cloudImportResult.report.warnings.slice(0, 3).map((warning) => (
                          <li key={`${warning.path}:${warning.code}`}>
                            {warning.path}: {warning.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {cloudImportResult.report?.errors.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                        {cloudImportResult.report.errors.slice(0, 3).map((error) => (
                          <li key={`${error.path}:${error.code}`}>
                            {error.path}: {error.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {/* Dry-run button */}
                  {cloudImportDryRunEnabled ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleValidateCloudImport}
                      disabled={!canRunCloudDryRun}
                      className="bg-white"
                    >
                      {cloudImportChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                      Kiểm tra payload
                    </Button>
                  ) : !cloudImportEnabled && cloudImportDryRunUnavailableReason ? null : null}

                  {/* Cloud import button */}
                  <Button
                    type="button"
                    onClick={() => setShowCloudImportConfirm(true)}
                    disabled={!canRunCloudImport || showCloudImportConfirm}
                    className="bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {cloudWriteLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Import lên cloud
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onSkip}>
              {importSucceeded || cloudWriteSucceeded ? "Done" : "Skip for now"}
            </Button>
            {cloudWriteSucceeded ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onSkip();
                  window.location.href = "/12-week-system";
                }}
              >
                <ArrowRight className="h-4 w-4" />
                Đi tới 12-week system
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {onExportBackup ? (
              <Button type="button" variant="outline" onClick={onExportBackup}>
                <Download className="h-4 w-4" />
                Export backup
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setShowReview(true)}>
              Review local data
            </Button>
            <Button type="button" onClick={handleImport} disabled={importSucceeded}>
              Import local data
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
