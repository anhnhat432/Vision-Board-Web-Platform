import { ArrowRight, Cloud, Database, Download, Eye, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TwelveWeekImportResponse, TwelveWeekImportValidationReport } from "@/services/syncService";
import type {
  LocalDataAccountImportResult,
  LocalDataMigrationCandidate,
  LocalDataMigrationSummary,
} from "../../utils/local-data-migration";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

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
    formatCount(summary.goalCount, "mục tiêu"),
    formatCount(summary.twelveWeekSystemCount, "chu kỳ 12 tuần"),
    formatCount(summary.taskCount, "việc"),
    formatCount(summary.dailyCheckInCount, "check-in ngày"),
    formatCount(summary.weeklyReviewCount, "review tuần"),
    formatCount(summary.wheelRecordCount, "bản cân bằng cuộc sống"),
    formatCount(summary.reflectionCount, "ghi chú nhìn lại"),
    formatCount(summary.visionBoardCount, "vision board"),
  ].filter((item) => !item.startsWith("0 "));
}

function buildValidationCountSummary(report: TwelveWeekImportValidationReport | undefined): string | null {
  if (!report) return null;

  const counts = report.acceptedEntityCounts;
  return [
    formatCount(counts.goals, "mục tiêu"),
    formatCount(counts.plans, "kế hoạch"),
    formatCount(counts.weeks, "tuần"),
    formatCount(counts.tasks, "việc"),
    formatCount(counts.dailyCheckIns, "check-in ngày"),
    formatCount(counts.weeklyReviews, "review tuần"),
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: fingerprint is an intentional change trigger to reset state when a new migration candidate appears
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
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] bg-sky-50 text-sky-700">
            <Database className="h-5 w-5" />
          </div>
          <DialogTitle>Chuyển dữ liệu cũ vào tài khoản?</DialogTitle>
          <DialogDescription className="leading-6">
            Bạn vừa đăng nhập và trình duyệt này đang có dữ liệu đã tạo trước đó. Ứng dụng sẽ không tự ghi đè tài khoản.
            Nếu chọn nhập, một bản sao sẽ được chuyển vào tài khoản trên thiết bị này.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-[var(--r-card)] border border-app-line bg-app-bg-subtle p-4 text-sm text-app-ink-soft">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="leading-6">
              Dữ liệu cũ vẫn được giữ lại sau khi nhập. Bạn nên tải bản sao lưu trước khi tiếp tục.
            </p>
          </div>
        </div>

        {importResult ? (
          <div
            className={`rounded-[var(--r-card)] border p-4 text-sm leading-6 ${
              importSucceeded
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : importBlocked
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-red-200 bg-red-50 text-red-700"
            }`}
            role={importSucceeded ? "status" : "alert"}
          >
            {importSucceeded ? (
              <p>Đã chuyển dữ liệu vào tài khoản trên thiết bị này. Bản dữ liệu cũ vẫn được giữ nguyên.</p>
            ) : importBlocked ? (
              <div className="space-y-2">
                <p>
                  Tài khoản này đã có dữ liệu. Ứng dụng sẽ không ghi đè tự động. Hãy xem lại hoặc tải bản sao lưu trước
                  khi gộp dữ liệu.
                </p>
                {accountSummaryItems.length > 0 ? (
                  <p className="text-xs font-medium">Dữ liệu tài khoản hiện có: {accountSummaryItems.join(", ")}.</p>
                ) : null}
              </div>
            ) : importResult.status === "fingerprint_mismatch" ? (
              <p>Dữ liệu trên trình duyệt đã thay đổi. Hãy đóng hộp thoại và mở lại trước khi nhập.</p>
            ) : importResult.status === "inactive_auth_scope" ? (
              <p>Tài khoản hiện tại chưa sẵn sàng. Dữ liệu trên trình duyệt vẫn được giữ nguyên.</p>
            ) : (
              <p>Không thể nhập lúc này. Dữ liệu trên trình duyệt vẫn được giữ nguyên, hãy thử lại sau.</p>
            )}
          </div>
        ) : null}

        {showReview ? (
          <section
            className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-4"
            aria-label="Tóm tắt dữ liệu tìm thấy"
          >
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-app-ink">
                <Eye className="h-4 w-4 text-app-ink-muted" />
              Dữ liệu tìm thấy
            </div>
            {summaryItems.length > 0 ? (
              <ul className="grid gap-2 text-sm text-app-ink-soft sm:grid-cols-2">
                {summaryItems.map((item) => (
                    <li key={item} className="rounded-[var(--r-tile)] bg-app-bg-subtle px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-app-ink-soft">Không có mục nào cần nhập trong bản dữ liệu này.</p>
            )}
          </section>
        ) : null}

        {hasTwelveWeekData ? (
          <section
            className="rounded-[var(--r-card)] border border-sky-100 bg-sky-50/70 p-4"
            aria-label="Đồng bộ dữ liệu tài khoản"
          >
            <div className="flex items-start gap-3">
              <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-app-ink">Đồng bộ dữ liệu 12 tuần lên tài khoản</p>
                  <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                    Sau khi nhập vào tài khoản trên thiết bị này, bạn có thể gửi dữ liệu 12 tuần lên hệ thống để dùng
                    lại khi đổi máy hoặc đăng nhập lại.
                  </p>
                </div>

                {!importSucceeded ? (
                  <p className="rounded-[var(--r-tile)] bg-app-surface px-3 py-2 text-xs font-medium text-app-ink-soft">
                    Hãy nhập dữ liệu trên thiết bị vào tài khoản trước, sau đó mới đồng bộ lên hệ thống.
                  </p>
                ) : !cloudImportEnabled ? (
                  <p className="rounded-[var(--r-tile)] bg-app-surface px-3 py-2 text-xs font-medium text-amber-700">
                    {cloudImportUnavailableReason ??
                      "Đồng bộ dữ liệu tài khoản chưa được bật cho không gian làm việc này."}
                  </p>
                ) : cloudImportAlreadyCompleted && !cloudWriteSucceeded ? (
                  <p className="rounded-[var(--r-tile)] bg-app-surface px-3 py-2 text-xs font-medium text-emerald-700">
                    Dữ liệu này đã được đồng bộ lên tài khoản trước đó.
                  </p>
                ) : null}

                {/* Cloud import result */}
                {cloudWriteResult ? (
                  <div
                    className={`rounded-[var(--r-tile)] border px-3 py-2 text-sm leading-6 ${
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
                        Dữ liệu đã được ghi vào tài khoản. Bản trên thiết bị vẫn được giữ nguyên.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs">Dữ liệu trên thiết bị không bị ảnh hưởng. Bạn có thể thử lại.</p>
                    )}
                  </div>
                ) : null}

                {/* Confirmation dialog inline */}
                {showCloudImportConfirm && canRunCloudImport && !cloudWriteLoading ? (
                  <div className="rounded-[var(--r-tile)] border border-sky-200 bg-app-surface p-3 space-y-3">
                    <p className="text-sm font-medium text-app-ink">Xác nhận đồng bộ</p>
                    <p className="text-xs leading-5 text-app-ink-soft">
                      Dữ liệu 12 tuần sẽ được gửi lên tài khoản. Bản trên thiết bị vẫn được giữ nguyên. Nên tải bản sao
                      lưu trước khi tiếp tục.
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
                        <Button type="button" variant="outline" size="sm" onClick={onExportBackup}>
                          <Download className="h-3.5 w-3.5" />
                          Tải bản sao lưu
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" onClick={handleCloudImport}>
                        <Upload className="h-3.5 w-3.5" />
                        Xác nhận đồng bộ
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Dry-run validation results */}
                {cloudImportResult ? (
                  <div
                    className={`rounded-[var(--r-tile)] border px-3 py-2 text-sm leading-6 ${
                      cloudImportResult.status === "valid"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : cloudImportResult.status === "invalid"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-red-200 bg-red-50 text-red-700"
                    }`}
                    role={cloudImportResult.status === "valid" ? "status" : "alert"}
                  >
                    <p className="font-medium">{cloudImportResult.message}</p>
                    {cloudValidationSummary ? <p className="text-xs">Đã kiểm tra: {cloudValidationSummary}.</p> : null}
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
                      className="bg-app-surface"
                    >
                      {cloudImportChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Cloud className="h-4 w-4" />
                      )}
                      Kiểm tra dữ liệu
                    </Button>
                  ) : !cloudImportEnabled && cloudImportDryRunUnavailableReason ? null : null}

                  {/* Cloud import button */}
                  <Button
                    type="button"
                    onClick={() => setShowCloudImportConfirm(true)}
                    disabled={!canRunCloudImport || showCloudImportConfirm}
                    className="bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {cloudWriteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Đồng bộ lên tài khoản
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onSkip}>
              {importSucceeded || cloudWriteSucceeded ? "Xong" : "Để sau"}
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
                Đi tới hệ 12 tuần
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {onExportBackup ? (
              <Button type="button" variant="outline" onClick={onExportBackup}>
                <Download className="h-4 w-4" />
                Tải bản sao lưu
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setShowReview(true)}>
              Xem dữ liệu
            </Button>
            <Button type="button" onClick={handleImport} disabled={importSucceeded}>
              Nhập dữ liệu
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
