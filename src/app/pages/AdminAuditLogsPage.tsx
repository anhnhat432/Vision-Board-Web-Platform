import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Search, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type AdminAuditLogEntry,
  type AdminAuditLogListParams,
  adminListAuditLogs,
} from "@/services/adminService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { adminSurface } from "../components/admin/tokens";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, getErrorMessage, withTimeout } from "../components/admin/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

function AuditRowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-app-accent-soft" /></td>
      <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-app-accent-soft" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-app-accent-soft" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft" /></td>
      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-app-accent-soft" /></td>
    </tr>
  );
}

function PayloadPreview({ payload }: { payload?: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!payload || Object.keys(payload).length === 0) return null;

  const entries = Object.entries(payload);
  const preview = entries.slice(0, 3).map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(", ");

  return (
    <div className="mt-1">
      <button
        type="button"
        className="text-xs text-app-ink-muted hover:text-app-ink transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Thu gọn" : `${preview}${entries.length > 3 ? "..." : ""}`}
      </button>
      {expanded ? (
        <pre className="mt-1 max-h-32 overflow-auto rounded bg-app-bg-subtle p-2 text-xs text-app-ink-soft">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export function AdminAuditLogsPage() {
  const [items, setItems] = useState<AdminAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchAction, setSearchAction] = useState("");
  const [searchActor, setSearchActor] = useState("");
  const limit = 30;

  const load = useCallback(
    async (params: AdminAuditLogListParams) => {
      setLoading(true);
      setError(null);
      try {
        const res = await withTimeout(
          adminListAuditLogs(params),
          ADMIN_LOAD_TIMEOUT_MS,
          "Hết thời gian tải audit logs.",
        );
        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
      } catch (err) {
        setError(getErrorMessage(err, "Không thể tải audit logs."));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load({ page: 1, action: searchAction || undefined, actorUid: searchActor || undefined, limit });
  }, [load, searchAction, searchActor]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handlePageChange = (newPage: number) => {
    void load({ page: newPage, action: searchAction || undefined, actorUid: searchActor || undefined, limit });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Logs"
        description={`Tổng cộng ${total.toLocaleString("vi-VN")} hành động`}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
          <Input
            placeholder="Lọc theo action..."
            value={searchAction}
            onChange={(e) => setSearchAction(e.target.value)}
            className="pl-9 bg-app-surface border-app-line"
          />
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
          <Input
            placeholder="Lọc theo actor UID..."
            value={searchActor}
            onChange={(e) => setSearchActor(e.target.value)}
            className="pl-9 bg-app-surface border-app-line"
          />
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-[var(--r-card)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 text-red-700 underline"
            onClick={() => void load({ page, action: searchAction || undefined, actorUid: searchActor || undefined, limit })}
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      {/* Table */}
      <div className={`${adminSurface.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app-line bg-app-bg-subtle">
                <th className="px-4 py-3 font-medium text-app-ink-soft">Thời gian</th>
                <th className="px-4 py-3 font-medium text-app-ink-soft">Action</th>
                <th className="px-4 py-3 font-medium text-app-ink-soft">Actor</th>
                <th className="px-4 py-3 font-medium text-app-ink-soft">Target</th>
                <th className="px-4 py-3 font-medium text-app-ink-soft">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <AuditRowSkeleton />
                  <AuditRowSkeleton />
                  <AuditRowSkeleton />
                  <AuditRowSkeleton />
                  <AuditRowSkeleton />
                </>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <AdminEmptyState
                      icon={FileText}
                      title="Không có audit log"
                      description="Chưa có hành động quản trị nào được ghi nhận."
                    />
                  </td>
                </tr>
              ) : (
                items.map((log, i) => (
                  <tr key={log._id || i} className="border-b border-app-line last:border-0 hover:bg-app-bg-subtle/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-app-ink-muted whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-app-bg-subtle px-1.5 py-0.5 text-xs font-mono text-app-ink">
                        {log.action}
                      </span>
                      <PayloadPreview payload={log.payload} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-app-ink-muted truncate max-w-[160px]" title={log.actorUid}>
                        {log.actorEmail || log.actorUid}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-app-ink-soft">
                      <span className="font-mono">{log.target}</span>
                      {log.targetId ? (
                        <span className="ml-1 text-app-ink-muted">({log.targetId})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-app-ink-muted">
            Trang {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="gap-1 border-app-line"
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="gap-1 border-app-line"
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}