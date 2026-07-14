import { FileText, Search } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import {
  type AdminAuditLogEntry,
  type AdminAuditLogListParams,
  adminListAuditLogs,
} from "@/services/adminService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { AdminToolbar } from "../components/admin/AdminToolbar";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, getErrorMessage, withTimeout } from "../components/admin/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

function AuditRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="h-4 w-32 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-40 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-24 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-16 animate-pulse rounded bg-app-accent-soft motion-reduce:animate-none" />
      </TableCell>
    </TableRow>
  );
}

function PayloadPreview({
  action,
  payload,
}: {
  action: string;
  payload?: Record<string, unknown> | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  if (!payload || Object.keys(payload).length === 0) return null;

  const entries = Object.entries(payload);
  const preview = entries.slice(0, 3).map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(", ");

  return (
    <div className="mt-1">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={`${expanded ? "Ẩn" : "Xem"} payload ${action}`}
        className="text-xs text-app-ink-muted transition-colors hover:text-app-ink motion-reduce:transition-none"
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? "Thu gọn" : `${preview}${entries.length > 3 ? "..." : ""}`}
      </button>
      {expanded ? (
        <pre
          id={contentId}
          className="mt-1 max-h-32 overflow-auto rounded bg-app-bg-subtle p-2 text-xs text-app-ink-soft"
        >
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

      <AdminToolbar label="Bộ lọc audit logs" meta={`Hiển thị ${items.length} / ${total} hành động`}>
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Lọc theo action"
            autoComplete="off"
            placeholder="Lọc theo action..."
            value={searchAction}
            onChange={(event) => {
              setPage(1);
              setSearchAction(event.target.value);
            }}
            className="border-app-line bg-app-surface pl-9"
          />
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Lọc theo actor UID"
            autoComplete="off"
            placeholder="Lọc theo actor UID..."
            value={searchActor}
            onChange={(event) => {
              setPage(1);
              setSearchActor(event.target.value);
            }}
            className="border-app-line bg-app-surface pl-9"
          />
        </div>
      </AdminToolbar>

      {error ? (
        <AdminFeedbackBanner
          tone="error"
          summary={error}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void load({
                  page,
                  action: searchAction || undefined,
                  actorUid: searchActor || undefined,
                  limit,
                })
              }
            >
              Thử lại
            </Button>
          }
        />
      ) : null}

      <AdminDataPanel
        title="Audit logs đã ghi nhận"
        description="Theo dõi hành động quản trị, đối tượng tác động và kết quả xử lý."
        busy={loading}
      >
        <Table containerClassName="rounded-none border-0 shadow-none" className="text-app-ink-soft">
          <TableCaption className="sr-only">Danh sách audit logs</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Thời gian</TableHead>
              <TableHead scope="col">Action</TableHead>
              <TableHead scope="col">Actor</TableHead>
              <TableHead scope="col">Target</TableHead>
              <TableHead scope="col">Kết quả</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {loading && items.length === 0 ? (
                <>
                  <AuditRowSkeleton />
                  <AuditRowSkeleton />
                  <AuditRowSkeleton />
                  <AuditRowSkeleton />
                  <AuditRowSkeleton />
                </>
              ) : items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="whitespace-normal p-4">
                    <AdminEmptyState
                      icon={FileText}
                      title="Không có audit log"
                      description="Chưa có hành động quản trị nào được ghi nhận."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((log, i) => (
                  <TableRow key={log._id || i}>
                    <TableCell className="text-xs text-app-ink-muted">
                      {formatDate(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-app-bg-subtle px-1.5 py-0.5 font-mono text-xs text-app-ink">
                        {log.action}
                      </span>
                      <PayloadPreview action={log.action} payload={log.payload} />
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[200px] truncate text-xs text-app-ink-soft" title={log.actorUid}>
                        {log.actorEmail || log.actorUid}
                      </p>
                      {log.actorEmail ? (
                        <p className="mt-1 max-w-[200px] truncate font-mono text-xs text-app-ink-muted">
                          {log.actorUid}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-app-ink-soft">
                      <span className="font-mono">{log.target}</span>
                      {log.targetId ? (
                        <span className="ml-1 text-app-ink-muted">({log.targetId})</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge tone={log.success ? "completed" : "failed"}>
                        {log.success ? "Thành công" : "Thất bại"}
                      </AdminStatusBadge>
                    </TableCell>
                  </TableRow>
                ))
              )}
          </TableBody>
        </Table>
      </AdminDataPanel>

      {totalPages > 1 ? (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          disabled={loading}
          itemLabel="audit logs"
          onPageChange={handlePageChange}
        />
      ) : null}
    </div>
  );
}
