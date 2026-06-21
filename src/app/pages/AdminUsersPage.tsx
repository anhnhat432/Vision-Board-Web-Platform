import { ChevronLeft, ChevronRight, Search, Shield, Users as UsersIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  type AdminUserListItem,
  type AdminUserListParams,
  adminListUsers,
} from "@/services/adminService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { adminSurface } from "../components/admin/tokens";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, getErrorMessage, withTimeout } from "../components/admin/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

function UserRowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-app-accent-soft" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-app-accent-soft" /></td>
      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-app-accent-soft" /></td>
      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-app-accent-soft" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-app-accent-soft" /></td>
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

  const load = useCallback(
    async (params: AdminUserListParams) => {
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
    },
    [],
  );

  useEffect(() => {
    void load({ page: 1, role: roleFilter, q: search });
  }, [load, roleFilter, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handlePageChange = (newPage: number) => {
    void load({ page: newPage, role: roleFilter, q: search });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý người dùng"
        description={`Tổng cộng ${total.toLocaleString("vi-VN")} người dùng`}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
          <Input
            placeholder="Tìm theo email, tên, UID..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 bg-app-surface border-app-line"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "user", "admin"] as const).map((role) => (
            <Button
              key={role}
              type="button"
              variant={roleFilter === role ? "default" : "outline"}
              size="sm"
              className={roleFilter === role ? "bg-app-accent text-app-ink" : "border-app-line"}
              onClick={() => setRoleFilter(role)}
            >
              {role === "all" ? "Tất cả" : role === "admin" ? "Admin" : "User"}
            </Button>
          ))}
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
              <tr className="border-b border-app-line bg-app-bg-subtle">
                <th className="px-4 py-3 font-medium text-app-ink-soft">Người dùng</th>
                <th className="px-4 py-3 font-medium text-app-ink-soft">Vai trò</th>
                <th className="px-4 py-3 font-medium text-app-ink-soft">Gói</th>
                <th className="px-4 py-3 font-medium text-app-ink-soft">Mục tiêu</th>
                <th className="px-4 py-3 font-medium text-app-ink-soft">Ngày tạo</th>
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
                items.map((user) => (
                  <tr key={user.firebaseUid} className="border-b border-app-line last:border-0 hover:bg-app-bg-subtle/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/admin/users/${user.firebaseUid}`} className="group block">
                        <p className="font-medium text-app-ink group-hover:text-app-accent transition-colors truncate max-w-[240px]">
                          {user.displayName || user.email}
                        </p>
                        <p className="text-xs text-app-ink-muted truncate max-w-[240px]">{user.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-app-accent">
                          <Shield className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs text-app-ink-muted">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-[var(--r-pill)] border px-2.5 py-0.5 text-xs font-medium ${
                          user.subscription?.planCode === "PLUS"
                            ? "bg-app-accent-soft text-app-accent border-app-accent/30"
                            : "bg-app-bg-subtle text-app-ink-soft border-app-line-strong"
                        }`}
                      >
                        {user.subscription?.planCode === "PLUS" ? "Plus" : "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-app-ink-soft">
                      {user.goalCount}
                    </td>
                    <td className="px-4 py-3 text-app-ink-muted text-xs">
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