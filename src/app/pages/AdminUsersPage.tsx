import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Shield,
  Users as UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router";
import {
  type AdminUserListItem,
  type AdminUserListParams,
  adminListUsers,
} from "@/services/adminService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { adminSurface } from "../components/admin/tokens";
import {
  ADMIN_LOAD_TIMEOUT_MS,
  formatDate,
  getErrorMessage,
  withTimeout,
} from "../components/admin/utils";
import { downloadCsv } from "../components/admin/csvExport";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

function UserRowSkeleton() {
  return (
    <tr>
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
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const load = useCallback(async (params: AdminUserListParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await withTimeout(
        adminListUsers(params),
        ADMIN_LOAD_TIMEOUT_MS,
        "Hết thời gian tải danh sách người dùng.",
      );
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setPage(res.page);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách người dùng."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ page: 1, role: roleFilter, q: search });
  }, [load, roleFilter, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handlePageChange = (newPage: number) => {
    void load({ page: newPage, role: roleFilter, q: search });
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

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
          <Input
            placeholder="Tìm theo email, tên, UID..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 rounded-lg bg-app-surface border-app-line/60 transition-colors duration-150"
          />
        </div>
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
              onClick={() => setRoleFilter(role)}
            >
              {role === "all" ? "Tất cả" : role === "admin" ? "Admin" : "User"}
            </Button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-[var(--r-card)] border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 text-rose-700 dark:text-rose-200 underline"
            onClick={() => void load({ page, role: roleFilter, q: search })}
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
              <tr className="border-b border-app-line bg-gradient-to-r from-app-bg-subtle/80 to-app-bg-subtle/40">
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">
                  Gói
                </th>
                <th className="px-4 py-3 font-semibold text-app-ink-soft text-xs uppercase tracking-wider">
                  Ngày tạo
                </th>
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
                  <td colSpan={4}>
                    <AdminEmptyState
                      icon={UsersIcon}
                      title="Không tìm thấy người dùng"
                      description={
                        search
                          ? "Thử thay đổi từ khóa tìm kiếm."
                          : "Chưa có người dùng nào."
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((user, index) => (
                  <tr
                    key={user.firebaseUid}
                    className={`border-b border-app-line/50 last:border-0 transition-colors duration-100 hover:bg-app-accent-soft/20 ${
                      index % 2 === 0 ? "bg-app-surface" : "bg-app-bg-subtle/20"
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/admin/users/${user.firebaseUid}`}
                        className="group flex items-center gap-3"
                      >
                        {/* Avatar */}
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-app-accent-soft to-app-bg-subtle text-xs font-bold text-app-accent transition-transform duration-150 group-hover:scale-105">
                          {(user.displayName || user.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-app-ink group-hover:text-app-accent transition-colors duration-150 truncate max-w-[200px]">
                            {user.displayName || user.email}
                          </p>
                          <p className="text-xs text-app-ink-muted truncate max-w-[200px]">
                            {user.email}
                          </p>
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
                        <span className="text-xs text-app-ink-muted">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          user.subscription?.planCode === "PLUS"
                            ? "bg-app-accent-soft text-app-accent border-app-accent/20"
                            : "bg-app-bg-subtle text-app-ink-soft border-app-line"
                        }`}
                      >
                        {user.subscription?.planCode === "PLUS"
                          ? "Plus"
                          : "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-app-ink-muted text-xs">
                      {formatDate(user.createdAt)}
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
    </div>
  );
}