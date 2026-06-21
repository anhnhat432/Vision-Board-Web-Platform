import { Percent, Plus, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  adminCreateDiscount,
  adminDeleteDiscount,
  adminListCouponUsages,
  adminListDiscounts,
  adminUpdateDiscount,
  type AdminCouponUsageSummary,
  type AdminDiscountCreatePayload,
  type AdminDiscountSummary,
} from "@/services/adminService";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { useAdminSearch } from "../components/admin/AdminSearchContext";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { formatDate, formatVnd, getErrorMessage } from "../components/admin/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  coupon: "Coupon",
  sale_event: "Đợt sale",
};

const DEFAULT_FORM: AdminDiscountCreatePayload = {
  type: "coupon",
  code: "",
  name: "",
  discountType: "percentage",
  discountValue: 10,
  startsAt: new Date().toISOString(),
  appliesTo: ["PLUS", "physical_order"],
};

function getDiscountLabel(d: AdminDiscountSummary): string {
  if (d.discountType === "percentage") return `${d.discountValue}%`;
  return formatVnd(d.discountValue);
}

function getUsageLabel(d: AdminDiscountSummary): string {
  if (d.maxUses) return `${d.usedCount}/${d.maxUses}`;
  return `${d.usedCount}`;
}

export function AdminDiscountsPage() {
  const { authLoading, user, userProfile, userProfileLoading } = useAuthContext();
  const isAdmin = userProfile?.role === "admin";

  const [items, setItems] = useState<AdminDiscountSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showInactive, setShowInactive] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDiscountSummary | null>(null);
  const [form, setForm] = useState<AdminDiscountCreatePayload>({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminDiscountSummary | null>(null);

  const [usagesOpen, setUsagesOpen] = useState(false);
  const [usagesDiscount, setUsagesDiscount] = useState<AdminDiscountSummary | null>(null);
  const [usages, setUsages] = useState<AdminCouponUsageSummary[]>([]);
  const [usagesTotal, setUsagesTotal] = useState(0);
  const [usagesLoading, setUsagesLoading] = useState(false);

  const handleSearchChange = useCallback((next: string) => setQuery(next), []);
  useAdminSearch(query, handleSearchChange, "Tìm mã, tên discount");

  const loadDiscounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminListDiscounts({
        q: query,
        type: typeFilter || undefined,
        active: showInactive ? undefined : true,
        limit: 100,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách giảm giá."));
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter, showInactive]);

  const queryRef = useRef(query);
  queryRef.current = query;
  const typeRef = useRef(typeFilter);
  typeRef.current = typeFilter;
  const inactiveRef = useRef(showInactive);
  inactiveRef.current = showInactive;

  useEffect(() => {
    if (authLoading || userProfileLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    void loadDiscounts();
  }, [authLoading, isAdmin, user, userProfileLoading, loadDiscounts]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...DEFAULT_FORM,
      startsAt: new Date().toISOString(),
    });
    setFormOpen(true);
  };

  const openEdit = (d: AdminDiscountSummary) => {
    setEditing(d);
    setForm({
      type: d.type,
      code: d.code,
      name: d.name,
      discountType: d.discountType,
      discountValue: d.discountValue,
      minAmount: d.minAmount ?? undefined,
      maxUses: d.maxUses ?? undefined,
      startsAt: d.startsAt,
      endsAt: d.endsAt ?? undefined,
      appliesTo: d.appliesTo,
      active: d.active,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Vui lòng nhập mã và tên.");
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await adminUpdateDiscount(editing._id, form);
        toast.success("Đã cập nhật discount.");
      } else {
        await adminCreateDiscount(form);
        toast.success("Đã tạo discount.");
      }
      setFormOpen(false);
      await loadDiscounts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể lưu discount."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (d: AdminDiscountSummary) => {
    try {
      await adminUpdateDiscount(d._id, { active: !d.active });
      toast.success(d.active ? "Đã vô hiệu hóa." : "Đã kích hoạt.");
      await loadDiscounts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể thay đổi trạng thái."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminDeleteDiscount(deleteTarget._id);
      toast.success("Đã vô hiệu hóa discount.");
      setDeleteTarget(null);
      await loadDiscounts();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể xóa discount."));
    }
  };

  const openUsages = async (d: AdminDiscountSummary) => {
    setUsagesDiscount(d);
    setUsagesOpen(true);
    setUsagesLoading(true);
    try {
      const result = await adminListCouponUsages(d._id, 1, 50);
      setUsages(result.items);
      setUsagesTotal(result.total);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể tải lịch sử sử dụng."));
    } finally {
      setUsagesLoading(false);
    }
  };

  const isExpired = (d: AdminDiscountSummary): boolean => {
    if (!d.endsAt) return false;
    return new Date(d.endsAt) < new Date();
  };

  return (
    <div className="page-enter space-y-6">
      <AdminPageHeader
        title="Quản lý giảm giá"
        description="Tạo và quản lý mã giảm giá (coupon) và đợt sale."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openCreate} disabled={!isAdmin}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo mới
        </Button>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tất cả loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="coupon">Coupon</SelectItem>
            <SelectItem value="sale_event">Đợt sale</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm text-app-ink-muted cursor-pointer">
            Hiện đã tắt
          </Label>
        </div>
        <Button variant="outline" size="sm" onClick={loadDiscounts} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Tải lại
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-8 text-app-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Đang tải...</span>
        </div>
      )}

      {error && !loading && (
        <AdminEmptyState icon={X} title={error} />
      )}

      {!loading && !error && items.length === 0 && (
        <AdminEmptyState
          icon={Percent}
          title="Chưa có discount nào."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="rounded-card border border-app-line bg-app-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Giảm</TableHead>
                <TableHead>Đã dùng</TableHead>
                <TableHead>Hiệu lực</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d._id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {DISCOUNT_TYPE_LABELS[d.type] ?? d.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm uppercase">{d.code}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{d.name}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {getDiscountLabel(d)}
                    {d.minAmount ? (
                      <span className="ml-1 text-xs text-app-ink-muted">
                        (tối thiểu {formatVnd(d.minAmount)})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getUsageLabel(d)}
                    {d.type === "coupon" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-auto p-0 text-xs text-app-accent"
                        onClick={() => openUsages(d)}
                      >
                        Chi tiết
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-app-ink-muted">
                    {formatDate(d.startsAt)}
                    {d.endsAt ? ` → ${formatDate(d.endsAt)}` : " → Không giới hạn"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {d.active ? (
                        <AdminStatusBadge tone="completed">Hoạt động</AdminStatusBadge>
                      ) : (
                        <AdminStatusBadge tone="expired">Đã tắt</AdminStatusBadge>
                      )}
                      {d.active && isExpired(d) && (
                        <AdminStatusBadge tone="pending">Hết hạn</AdminStatusBadge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(d)}
                      >
                        {d.active ? "Tắt" : "Bật"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-app-status-error"
                        onClick={() => setDeleteTarget(d)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t border-app-line px-4 py-3 text-sm text-app-ink-muted">
            {total} discount
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa discount" : "Tạo discount mới"}</DialogTitle>
            <DialogDescription>
              {editing ? "Cập nhật thông tin discount." : "Điền thông tin để tạo discount mới."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Loại</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                  disabled={!!editing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coupon">Coupon</SelectItem>
                    <SelectItem value="sale_event">Đợt sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hình thức giảm</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v) => setForm({ ...form, discountType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Phần trăm (%)</SelectItem>
                    <SelectItem value="fixed">Số tiền cố định (VNĐ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mã code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="VD: SUMMER2026"
                disabled={!!editing}
                className="uppercase font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tên hiển thị</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Giảm 30% ra mắt"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Giá trị giảm</Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm({ ...form, discountValue: Math.max(0, Number(e.target.value)) })
                  }
                  min={0}
                  max={form.discountType === "percentage" ? 100 : undefined}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Đơn tối thiểu (VNĐ)</Label>
                <Input
                  type="number"
                  value={form.minAmount ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minAmount: e.target.value ? Math.max(0, Number(e.target.value)) : undefined,
                    })
                  }
                  min={0}
                  placeholder="Không giới hạn"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Số lượt dùng tối đa</Label>
                <Input
                  type="number"
                  value={form.maxUses ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maxUses: e.target.value ? Math.max(1, Number(e.target.value)) : undefined,
                    })
                  }
                  min={1}
                  placeholder="Không giới hạn"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Áp dụng cho</Label>
                <Select
                  value={form.appliesTo?.[0] ?? "PLUS"}
                  onValueChange={(v) => setForm({ ...form, appliesTo: [v] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLUS">PLUS</SelectItem>
                    <SelectItem value="physical_order">Vision Board Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bắt đầu</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt ? form.startsAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      startsAt: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString(),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kết thúc (để trống nếu không giới hạn)</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt ? form.endsAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      endsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    })
                  }
                />
              </div>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Switch
                  id="form-active"
                  checked={form.active !== false}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label htmlFor="form-active" className="cursor-pointer">
                  Kích hoạt
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Đang lưu…" : editing ? "Cập nhật" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vô hiệu hóa discount?</AlertDialogTitle>
            <AlertDialogDescription>
              Discount "{deleteTarget?.name}" (mã {deleteTarget?.code}) sẽ bị vô hiệu hóa.
              Hành động này không xóa dữ liệu nhưng discount sẽ không còn áp dụng được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Vô hiệu hóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Usages Dialog */}
      <Dialog open={usagesOpen} onOpenChange={setUsagesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lịch sử sử dụng: {usagesDiscount?.code}</DialogTitle>
            <DialogDescription>
              {usagesTotal} lượt sử dụng
            </DialogDescription>
          </DialogHeader>
          {usagesLoading ? (
            <div className="flex items-center gap-3 py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Đang tải...</span>
            </div>
          ) : usages.length === 0 ? (
            <p className="py-8 text-center text-sm text-app-ink-muted">Chưa có lượt sử dụng nào.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Đơn hàng</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usages.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell className="font-mono text-xs">{u.userId}</TableCell>
                      <TableCell className="font-mono text-xs">{u.orderId}</TableCell>
                      <TableCell className="text-xs">{formatDate(u.usedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
