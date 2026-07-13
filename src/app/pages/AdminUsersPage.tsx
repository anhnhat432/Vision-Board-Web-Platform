import { ChevronLeft, ChevronRight, Download, Search, Shield, Users as UsersIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  type AdminClassifyUsersResult,
  type AdminOperationalCategory,
  type AdminOperationalClassificationReason,
  type AdminUserListItem,
  type AdminUserListParams,
  adminClassifyUsers,
  adminListUsers,
} from "@/services/adminService";
import { AdminOperationalClassificationBadge } from "../components/admin/AdminOperationalClassificationBadge";
import { AdminOperationalClassificationDialog } from "../components/admin/AdminOperationalClassificationDialog";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { adminSurface } from "../components/admin/tokens";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, getErrorMessage, withTimeout } from "../components/admin/utils";
import { downloadCsv } from "../components/admin/csvExport";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const MAX_BULK_SELECTION = 100;

type UserOperationalCategory = AdminOperationalCategory | "all";

interface PendingBulkClassification {
  viewKey: string;
  payload: {
    category: AdminOperationalCategory;
    reason: AdminOperationalClassificationReason;
    note?: string;
  };
  changes: Array<{ userUid: string; requestId: string }>;
}

interface BulkResult {
  succeeded: number;
  failed: Array<{ userUid: string; errorCode: string }>;
  transportFailed?: boolean;
}

function parseOperationalCategory(value: string | null): UserOperationalCategory {
  if (value === "real" || value === "test" || value === "internal" || value === "all") return value;
  return "real";
}

function UserRowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3.5">
        <div className="h-4 w-4 animate-pulse rounded bg-app-accent-soft" />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-app-accent-soft" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded bg-app-accent-soft" />
            <div className="h-3 w-40 animate-pulse rounded bg-app-accent-soft" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-4 w-16 animate-pulse rounded bg-app-accent-soft" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-5 w-12 animate-pulse rounded-full bg-app-accent-soft" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft" />
      </td>
    </tr>
  );
}

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawOperationalCategory = searchParams.get("operationalCategory");
  const operationalCategory = parseOperationalCategory(rawOperationalCategory);
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUids, setSelectedUids] = useState<Set<string>>(() => new Set());
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [classificationBusy, setClassificationBusy] = useState(false);
  const [classificationError, setClassificationError] = useState<string | undefined>();
  const [pendingBulk, setPendingBulk] = useState<PendingBulkClassification | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const requestGeneration = useRef(0);
  const previousCategorySourceRef = useRef(rawOperationalCategory);
  const categorySourceChanged = previousCategorySourceRef.current !== rawOperationalCategory;
  const currentPage = categorySourceChanged ? 1 : page;

  const activeParams = useMemo<AdminUserListParams>(
    () => ({
      page: currentPage,
      role: roleFilter,
      q: search,
      operationalCategory,
    }),
    [currentPage, operationalCategory, roleFilter, search],
  );
  const activeViewKey = useMemo(
    () => JSON.stringify(activeParams),
    [activeParams],
  );
  const currentViewRef = useRef({ key: activeViewKey, params: activeParams });
  currentViewRef.current = { key: activeViewKey, params: activeParams };

  const loadUsers = useCallback(async (params: AdminUserListParams) => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setError(null);
    try {
      const res = await withTimeout(
        adminListUsers(params),
        ADMIN_LOAD_TIMEOUT_MS,
        "Hết thời gian tải danh sách người dùng.",
      );
      if (generation !== requestGeneration.current) return;
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setPage(res.page);
    } catch (err) {
      if (generation !== requestGeneration.current) return;
      setError(getErrorMessage(err, "Không thể tải danh sách người dùng."));
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, []);

  const clearClassificationState = useCallback(() => {
    setSelectedUids(new Set());
    setSelectionMessage(null);
    setClassificationOpen(false);
    setClassificationError(undefined);
    setPendingBulk(null);
    setBulkResult(null);
  }, []);

  useEffect(() => {
    if (rawOperationalCategory && rawOperationalCategory !== operationalCategory) {
      const normalized = new URLSearchParams(searchParams);
      normalized.set("operationalCategory", operationalCategory);
      setSearchParams(normalized, { replace: true });
    }
  }, [operationalCategory, rawOperationalCategory, searchParams, setSearchParams]);

  useEffect(() => {
    if (previousCategorySourceRef.current === rawOperationalCategory) return;
    previousCategorySourceRef.current = rawOperationalCategory;
    setPage(1);
    clearClassificationState();
  }, [clearClassificationState, rawOperationalCategory]);

  useEffect(() => {
    void loadUsers(activeParams);
  }, [activeParams, loadUsers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    clearClassificationState();
  };

  const handleRoleFilter = (role: string) => {
    setRoleFilter(role);
    setPage(1);
    clearClassificationState();
  };

  const handleCategoryChange = (value: string) => {
    const nextCategory = parseOperationalCategory(value);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("operationalCategory", nextCategory);
    setSearchParams(nextParams, { replace: true });
    setPage(1);
    clearClassificationState();
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    clearClassificationState();
  };

  const toggleUser = (uid: string) => {
    setSelectedUids((current) => {
      const next = new Set(current);
      if (next.has(uid)) {
        next.delete(uid);
        setSelectionMessage(null);
        return next;
      }
      if (next.size >= MAX_BULK_SELECTION) {
        setSelectionMessage(`Chỉ có thể chọn tối đa ${MAX_BULK_SELECTION} người dùng cho mỗi lần phân loại.`);
        return current;
      }
      next.add(uid);
      setSelectionMessage(null);
      return next;
    });
  };

  const toggleVisibleUsers = () => {
    const visibleUids = items.map((item) => item.firebaseUid);
    const allVisibleSelected = visibleUids.every((uid) => selectedUids.has(uid));
    setSelectedUids((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const uid of visibleUids) next.delete(uid);
        setSelectionMessage(null);
        return next;
      }
      const available = MAX_BULK_SELECTION - next.size;
      const missing = visibleUids.filter((uid) => !next.has(uid));
      for (const uid of missing.slice(0, Math.max(0, available))) next.add(uid);
      setSelectionMessage(
        missing.length > available
          ? `Chỉ có thể chọn tối đa ${MAX_BULK_SELECTION} người dùng cho mỗi lần phân loại.`
          : null,
      );
      return next;
    });
  };

  const submitBulkClassification = async (
    payload: PendingBulkClassification["payload"],
    changes?: PendingBulkClassification["changes"],
  ) => {
    const currentChanges = changes ?? [...selectedUids].map((userUid) => ({ userUid, requestId: crypto.randomUUID() }));
    if (currentChanges.length === 0) return;
    const submissionViewKey = currentViewRef.current.key;
    const command = { viewKey: submissionViewKey, payload, changes: currentChanges };
    setPendingBulk(command);
    setClassificationBusy(true);
    setClassificationError(undefined);
    try {
      const result: AdminClassifyUsersResult = await adminClassifyUsers({ ...payload, changes: currentChanges });
      const failed = result.results.filter(
        (item): item is { userUid: string; status: "failed"; errorCode: string } => item.status === "failed",
      );
      const retryableUids = new Set(
        failed.filter((item) => item.errorCode === "admin_audit_commit_unknown").map((item) => item.userUid),
      );
      const retryableChanges = currentChanges.filter((item) => retryableUids.has(item.userUid));
      if (submissionViewKey === currentViewRef.current.key) {
        setBulkResult({ succeeded: result.results.length - failed.length, failed });
        setPendingBulk(retryableChanges.length > 0 ? { viewKey: submissionViewKey, payload, changes: retryableChanges } : null);
        setSelectedUids(new Set(retryableChanges.map((item) => item.userUid)));
        setClassificationOpen(false);
      }
      await loadUsers(currentViewRef.current.params);
    } catch {
      if (submissionViewKey === currentViewRef.current.key) {
        setBulkResult({ succeeded: 0, failed: [], transportFailed: true });
        setClassificationError("Không thể gửi yêu cầu phân loại. Hãy thử lại.");
        setClassificationOpen(false);
      }
    } finally {
      setClassificationBusy(false);
    }
  };

  const retryPendingClassification = () => {
    if (!pendingBulk || pendingBulk.viewKey !== currentViewRef.current.key || classificationBusy) return;
    void submitBulkClassification(pendingBulk.payload, pendingBulk.changes);
  };

  const handleExportCsv = () => {
    if (items.length === 0) return;
    const headers = ["UID", "Email", "Tên", "Vai trò", "Gói", "Ngày tạo"];
    const rows = items.map((u) => [
      u.firebaseUid,
      u.email,
      u.displayName,
      u.role === "admin" ? "Admin" : "User",
      u.subscription?.planCode === "PLUS" ? "Plus" : "Free",
      formatDate(u.createdAt),
    ]);
    downloadCsv(`users-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success(`Đã xuất ${items.length} người dùng.`);
  };

  const visibleUids = items.map((item) => item.firebaseUid);
  const allVisibleSelected = visibleUids.length > 0 && visibleUids.every((uid) => selectedUids.has(uid));
  const retryUnknownCommit =
    pendingBulk && bulkResult?.failed.some((item) => item.errorCode === "admin_audit_commit_unknown");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý người dùng"
        description={`Tổng cộng ${total.toLocaleString("vi-VN")} người dùng`}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-app-line bg-app-bg-subtle text-app-ink hover:bg-app-accent-soft hover:text-app-ink"
            disabled={loading || items.length === 0}
            onClick={handleExportCsv}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
          <Input
            placeholder="Tìm theo email, tên, UID..."
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            className="pl-9 rounded-lg bg-app-surface border-app-line/60 transition-colors duration-150"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-app-ink-soft">
          Phân loại vận hành
          <select
            aria-label="Phân loại vận hành"
            value={operationalCategory}
            onChange={(event) => handleCategoryChange(event.target.value)}
            className="rounded-lg border border-app-line bg-app-surface px-2 py-1.5 text-sm text-app-ink"
          >
            <option value="real">Dữ liệu thật</option>
            <option value="test">Test</option>
            <option value="internal">Nội bộ</option>
            <option value="all">Tất cả</option>
          </select>
        </label>
        <div className="flex gap-2">
          {(["all", "user", "admin"] as const).map((role) => (
            <Button
              key={role}
              type="button"
              variant={roleFilter === role ? "default" : "outline"}
              size="sm"
              className={
                roleFilter === role
                  ? "rounded-lg bg-app-accent text-white shadow-sm hover:bg-app-accent-hover"
                  : "rounded-lg border-app-line/60 hover:bg-app-accent-soft hover:text-app-ink transition-colors duration-150"
              }
              onClick={() => handleRoleFilter(role)}
            >
              {role === "all" ? "Tất cả" : role === "admin" ? "Admin" : "User"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--r-card)] border border-app-line bg-app-bg-subtle/40 p-3">
        <p className="text-sm text-app-ink-soft">
          Đã chọn {selectedUids.size}/{MAX_BULK_SELECTION} người dùng.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={selectedUids.size === 0 || classificationBusy}
          onClick={() => {
            setClassificationError(undefined);
            setClassificationOpen(true);
          }}
        >
          Phân loại {selectedUids.size} người dùng
        </Button>
        {pendingBulk?.viewKey === activeViewKey ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={classificationBusy}
            onClick={retryPendingClassification}
          >
            {retryUnknownCommit ? "Thử lại mục chưa rõ kết quả" : "Thử lại phân loại"}
          </Button>
        ) : null}
        {selectionMessage ? (
          <p role="status" aria-live="polite" className="text-sm text-amber-700">
            {selectionMessage}
          </p>
        ) : null}
      </div>

      {bulkResult ? (
        <p role="status" aria-live="polite" className="text-sm text-app-ink-soft">
          {bulkResult.transportFailed
            ? "Không thể gửi yêu cầu phân loại. Bạn có thể thử lại."
            : `${bulkResult.succeeded} thành công, ${bulkResult.failed.length} thất bại${bulkResult.failed.length > 0 ? ` (${bulkResult.failed.map((item) => item.userUid).join(", ")})` : ""}.`}
        </p>
      ) : null}
      {classificationError ? (
        <p role="alert" className="text-sm text-rose-700">
          {classificationError}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-[var(--r-card)] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
        >
          {error}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 text-rose-700 dark:text-rose-200 underline"
            onClick={() => void loadUsers(activeParams)}
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      <div className={`${adminSurface.card} overflow-hidden`} aria-busy={loading}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app-line bg-gradient-to-r from-app-bg-subtle/80 to-app-bg-subtle/40">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả người dùng trên trang"
                    checked={allVisibleSelected}
                    disabled={loading || items.length === 0}
                    onChange={toggleVisibleUsers}
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Vai trò</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Gói</th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <UserRowSkeleton />
                  <UserRowSkeleton />
                  <UserRowSkeleton />
                  <UserRowSkeleton />
                  <UserRowSkeleton />
                </>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <AdminEmptyState
                      icon={UsersIcon}
                      title="Không tìm thấy người dùng"
                      description={search ? "Thử thay đổi từ khóa tìm kiếm." : "Chưa có người dùng nào."}
                    />
                  </td>
                </tr>
              ) : (
                items.map((user, index) => (
                  <tr
                    key={user.firebaseUid}
                    className={`border-b border-app-line/50 last:border-0 transition-colors duration-100 hover:bg-app-accent-soft/20 ${index % 2 === 0 ? "bg-app-surface" : "bg-app-bg-subtle/20"}`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${user.email || user.firebaseUid}`}
                        checked={selectedUids.has(user.firebaseUid)}
                        onChange={() => toggleUser(user.firebaseUid)}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <Link to={`/admin/users/${user.firebaseUid}`} className="group flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-app-accent-soft to-app-bg-subtle text-xs font-bold text-app-accent transition-transform duration-150 group-hover:scale-105">
                          {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-app-ink group-hover:text-app-accent transition-colors duration-150 truncate max-w-[200px]">
                            {user.displayName || user.email}
                          </p>
                          <p className="text-xs text-app-ink-muted truncate max-w-[200px]">{user.email}</p>
                          <AdminOperationalClassificationBadge classification={user.operationalClassification} />
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-app-accent-soft px-2.5 py-0.5 text-xs font-medium text-app-accent border border-app-accent/20">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs text-app-ink-muted">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${user.subscription?.planCode === "PLUS" ? "bg-app-accent-soft text-app-accent border-app-accent/20" : "bg-app-bg-subtle text-app-ink-soft border-app-line"}`}
                      >
                        {user.subscription?.planCode === "PLUS" ? "Plus" : "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-app-ink-muted text-xs">{formatDate(user.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              className="gap-1 rounded-lg border-app-line/60 hover:bg-app-accent-soft hover:text-app-ink transition-colors duration-150"
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
              className="gap-1 rounded-lg border-app-line/60 hover:bg-app-accent-soft hover:text-app-ink transition-colors duration-150"
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <AdminOperationalClassificationDialog
        open={classificationOpen}
        targetType="user"
        targetLabel={`${selectedUids.size} người dùng đã chọn`}
        initialCategory="real"
        pending={classificationBusy}
        error={classificationError}
        onOpenChange={(open) => {
          if (!classificationBusy) {
            setClassificationOpen(open);
            if (!open) setClassificationError(undefined);
          }
        }}
        onConfirm={(payload) => submitBulkClassification(payload)}
      />
    </div>
  );
}
