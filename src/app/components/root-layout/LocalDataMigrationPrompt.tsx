import { useEffect, useMemo, useState } from "react";
import { Database, Eye, ShieldCheck } from "lucide-react";
import type {
  LocalDataAccountImportResult,
  LocalDataMigrationCandidate,
  LocalDataMigrationSummary,
} from "../../utils/local-data-migration";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface LocalDataMigrationPromptProps {
  candidate: LocalDataMigrationCandidate | null;
  open: boolean;
  onImport: () => LocalDataAccountImportResult;
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

export function LocalDataMigrationPrompt({ candidate, open, onImport, onSkip }: LocalDataMigrationPromptProps) {
  const [showReview, setShowReview] = useState(false);
  const [importResult, setImportResult] = useState<LocalDataAccountImportResult | null>(null);
  const summaryItems = useMemo(() => (candidate ? buildSummaryItems(candidate.summary) : []), [candidate]);
  const accountSummaryItems = useMemo(
    () => (importResult?.accountSummary ? buildSummaryItems(importResult.accountSummary) : []),
    [importResult?.accountSummary],
  );

  useEffect(() => {
    if (!open) {
      setShowReview(false);
      setImportResult(null);
    }
  }, [open]);

  useEffect(() => {
    setImportResult(null);
  }, [candidate?.fingerprint]);

  if (!candidate) return null;

  const handleImport = () => {
    setImportResult(onImport());
  };

  const importSucceeded = importResult?.status === "imported";
  const importBlocked = importResult?.status === "blocked_existing_account_data";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onSkip();
      }}
    >
      <DialogContent className="max-w-xl">
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
              Phase 1 chỉ copy local trên browser này. Chưa gửi cloud, chưa sync nhiều thiết bị, và bản anonymous
              vẫn được giữ lại để tránh mất dữ liệu.
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

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={onSkip}>
            {importSucceeded ? "Done" : "Skip for now"}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
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
