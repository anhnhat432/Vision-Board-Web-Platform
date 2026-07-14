import { ArrowLeft, ArrowRight, Loader2, Percent, Plus, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { useAdminSearch } from "../components/admin/AdminSearchContext";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { AdminToolbar } from "../components/admin/AdminToolbar";
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
import { Checkbox } from "../components/ui/checkbox";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

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

type FormStep = 1 | 2 | 3;
const TOTAL_STEPS = 3;

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showInactive, setShowInactive] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDiscountSummary | null>(null);
  const [form, setForm] = useState<AdminDiscountCreatePayload>({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminDiscountSummary | null>(null);

  const [usagesOpen, setUsagesOpen] = useState(false);
  const [usagesDiscount, setUsagesDiscount] = useState<AdminDiscountSummary | null>(null);
  const [usages, setUsages] = useState<AdminCouponUsageSummary[]>([]);
  const [usagesTotal, setUsagesTotal] = useState(0);
  const [usagesLoading, setUsagesLoading] = useState(false);
  const [usagesError, setUsagesError] = useState<string | null>(null);
  const limit = 100;

  const handleSearchChange = useCallback((next: string) => {
    setPage(1);
    setQuery(next);
  }, []);
  useAdminSearch(query, handleSearchChange, "Tìm mã, tên discount");

  const loadDiscounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminListDiscounts({
        q: query,
        type: typeFilter || undefined,
        active: showInactive ? undefined : true,
        page,
        limit,
      });
      const boundedPages = Math.max(1, result.totalPages);
      if (page > boundedPages) {
        setPage(boundedPages);
        return;
      }
      setItems(result.items);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(boundedPages);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tải danh sách giảm giá."));
    } finally {
      setLoading(false);
    }
  }, [page, query, showInactive, typeFilter]);

  useEffect(() => {
    if (authLoading || userProfileLoading) return;
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    void loadDiscounts();
  }, [authLoading, isAdmin, user, userProfileLoading, loadDiscounts]);

  const openCreate = () => {
    setFormError(null);
    setEditing(null);
    setCurrentStep(1);
    setForm({
      ...DEFAULT_FORM,
      startsAt: new Date().toISOString(),
    });
    setFormOpen(true);
  };

  const openEdit = (d: AdminDiscountSummary) => {
    setFormError(null);
    setEditing(d);
    setCurrentStep(1);
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
    setFormError(null);
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
      setFormError(getErrorMessage(err, "Không thể lưu discount."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (d: AdminDiscountSummary) => {
    setMutationError(null);
    try {
      await adminUpdateDiscount(d._id, { active: !d.active });
      toast.success(d.active ? "Đã vô hiệu hóa." : "Đã kích hoạt.");
      await loadDiscounts();
    } catch (err) {
      setMutationError(getErrorMessage(err, "Không thể thay đổi trạng thái."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setMutationError(null);
    try {
      await adminDeleteDiscount(deleteTarget._id);
      toast.success("Đã vô hiệu hóa discount.");
      setDeleteTarget(null);
      await loadDiscounts();
    } catch (err) {
      setMutationError(getErrorMessage(err, "Không thể xóa discount."));
    }
  };

  const openUsages = async (d: AdminDiscountSummary) => {
    setUsagesError(null);
    setUsagesDiscount(d);
    setUsagesOpen(true);
    setUsagesLoading(true);
    try {
      const result = await adminListCouponUsages(d._id, 1, 50);
      setUsages(result.items);
      setUsagesTotal(result.total);
    } catch (err) {
      setUsagesError(getErrorMessage(err, "Không thể tải lịch sử sử dụng."));
    } finally {
      setUsagesLoading(false);
    }
  };

  const isExpired = (d: AdminDiscountSummary): boolean => {
    if (!d.endsAt) return false;
    return new Date(d.endsAt) < new Date();
  };

  const toggleAppliesTo = (target: string) => {
    setForm((f) => {
      const current = f.appliesTo ?? ["PLUS", "physical_order"];
      if (current.includes(target)) {
        const next = current.filter((t) => t !== target);
        return { ...f, appliesTo: next.length > 0 ? next : ["PLUS"] };
      }
      return { ...f, appliesTo: [...current, target] };
    });
  };

  const previewOriginal = 99000;
  const previewFinal = form.discountType === "percentage"
    ? Math.max(previewOriginal - Math.round(previewOriginal * form.discountValue / 100), 1000)
    : Math.max(previewOriginal - form.discountValue, 1000);

  return (
    <div className="page-enter space-y-6">
      <AdminPageHeader
        title="Quản lý giảm giá"
        description="Tạo và quản lý mã giảm giá (coupon) và đợt sale."
      />

      <AdminToolbar
        label="Bộ lọc giảm giá"
        meta={`${total.toLocaleString("vi-VN")} discount`}
        actions={
          <>
            <Button type="button" onClick={openCreate} disabled={!isAdmin}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Tạo mới
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadDiscounts()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
                aria-hidden="true"
              />
              Tải lại
            </Button>
          </>
        }
      >
        <div className="relative w-full sm:max-w-md md:hidden">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Tìm kiếm giảm giá"
            autoComplete="off"
            placeholder="Tìm mã, tên discount"
            value={query}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter || "all"}
          onValueChange={(value) => {
            setPage(1);
            setTypeFilter(value === "all" ? "" : value);
          }}
        >
          <SelectTrigger className="w-[160px]" aria-label="Loại discount">
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
            onCheckedChange={(checked) => {
              setPage(1);
              setShowInactive(checked);
            }}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer text-sm text-app-ink-muted">
            Hiện đã tắt
          </Label>
        </div>
      </AdminToolbar>

      {error ? (
        <AdminFeedbackBanner
          tone="error"
          summary={error}
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void loadDiscounts()}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      {mutationError && deleteTarget === null ? (
        <AdminFeedbackBanner
          tone="error"
          summary={mutationError}
          onDismiss={() => setMutationError(null)}
          dismissLabel="Đóng lỗi cập nhật discount"
        />
      ) : null}

      <AdminDataPanel
        title="Danh sách discount"
        description="Mã, loại, giá trị, thời gian hiệu lực, lượt dùng và trạng thái."
        busy={loading}
      >
        {loading && items.length === 0 ? (
          <div className="flex items-center gap-3 p-8 text-app-ink-muted" role="status">
            <Loader2
              className="h-5 w-5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>Đang tải discount...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <AdminEmptyState icon={Percent} title="Chưa có discount nào." />
          </div>
        ) : (
          <Table containerClassName="rounded-none border-0 shadow-none">
            <TableCaption className="sr-only">Danh sách discount</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Loại</TableHead>
                <TableHead scope="col">Mã</TableHead>
                <TableHead scope="col">Tên</TableHead>
                <TableHead scope="col" className="text-right">
                  Giảm
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Đã dùng
                </TableHead>
                <TableHead scope="col">Hiệu lực</TableHead>
                <TableHead scope="col">Trạng thái</TableHead>
                <TableHead scope="col" className="text-right">
                  Hành động
                </TableHead>
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
                  <TableCell className="text-right text-sm font-medium tabular-nums">
                    {getDiscountLabel(d)}
                    {d.minAmount ? (
                      <span className="ml-1 text-xs text-app-ink-muted">
                        (tối thiểu {formatVnd(d.minAmount)})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {getUsageLabel(d)}
                    {d.type === "coupon" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-auto p-0 text-xs text-app-accent"
                        onClick={() => void openUsages(d)}
                      >
                        Chi tiết
                      </Button>
                    ) : null}
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
                      {d.active && isExpired(d) ? (
                        <AdminStatusBadge tone="pending">Hết hạn</AdminStatusBadge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(d)}>
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleToggleActive(d)}
                      >
                        {d.active ? "Tắt" : "Bật"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-app-status-error"
                        onClick={() => {
                          setMutationError(null);
                          setDeleteTarget(d);
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminDataPanel>

      {totalPages > 1 ? (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          disabled={loading}
          itemLabel="discount"
          onPageChange={setPage}
        />
      ) : null}

      {/* Create/Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setCurrentStep(1);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa discount" : "Tạo discount mới"}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span>
                {editing ? "Cập nhật thông tin discount." : "Điền thông tin để tạo discount mới."}
              </span>
              <span className="ml-auto text-xs font-medium tabular-nums text-app-ink-muted">
                Bước {currentStep}/{TOTAL_STEPS}
              </span>
            </DialogDescription>
          </DialogHeader>

          {formError ? (
            <AdminFeedbackBanner
              tone="error"
              summary={formError}
              onDismiss={() => setFormError(null)}
              dismissLabel="Đóng lỗi lưu discount"
            />
          ) : null}

          {/* Step progress bar */}
          <div className="flex gap-1.5">
            {([1, 2, 3] as FormStep[]).map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors motion-reduce:transition-none ${
                  s <= currentStep ? "bg-app-accent" : "bg-app-line"
                }`}
              />
            ))}
          </div>

          <div className="space-y-5 py-2">
            {/* ─── Step 1: Thông tin cơ bản ─── */}
            {currentStep === 1 && (
              <>
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
                    <p className="text-[11px] text-app-ink-muted">
                      Coupon = mã nhập tay. Đợt sale = tự động áp dụng.
                    </p>
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
                  <Label htmlFor="discount-code">Mã code</Label>
                  <Input
                    id="discount-code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="VD: SUMMER2026"
                    disabled={!!editing}
                    className="uppercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="discount-name">Tên hiển thị</Label>
                  <Input
                    id="discount-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Giảm 30% ra mắt"
                  />
                </div>

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
                    className="max-w-[200px]"
                  />
                  {form.discountType === "percentage" && (
                    <p className="text-[11px] text-app-ink-muted">
                      {form.discountValue}% của giá gốc = {formatVnd(Math.round(previewOriginal * form.discountValue / 100))}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ─── Step 2: Điều kiện áp dụng ─── */}
            {currentStep === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div className="space-y-2">
                  <Label>Áp dụng cho</Label>
                  <div className="space-y-2 rounded-card border border-app-line bg-app-muted/40 p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="apply-plus"
                        checked={(form.appliesTo ?? []).includes("PLUS")}
                        onCheckedChange={() => toggleAppliesTo("PLUS")}
                      />
                      <Label htmlFor="apply-plus" className="cursor-pointer text-sm">
                        <span className="font-medium">PLUS</span>
                        <span className="ml-1.5 text-xs text-app-ink-muted">Gói nâng cấp</span>
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="apply-kit"
                        checked={(form.appliesTo ?? []).includes("physical_order")}
                        onCheckedChange={() => toggleAppliesTo("physical_order")}
                      />
                      <Label htmlFor="apply-kit" className="cursor-pointer text-sm">
                        <span className="font-medium">Vision Board Kit</span>
                        <span className="ml-1.5 text-xs text-app-ink-muted">Sản phẩm vật lý</span>
                      </Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ─── Step 3: Thời gian + Kích hoạt + Preview ─── */}
            {currentStep === 3 && (
              <>
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
                    <Label>Kết thúc</Label>
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
                    <p className="text-[11px] text-app-ink-muted">Để trống nếu không giới hạn</p>
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

                {/* Preview panel */}
                <div className="rounded-card border border-app-line bg-app-muted/30 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-app-ink-muted">
                    Xem trước hiển thị
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {DISCOUNT_TYPE_LABELS[form.type] ?? form.type}
                    </Badge>
                    <span className="font-mono text-sm uppercase text-app-ink">{form.code || "CODE"}</span>
                  </div>
                  <p className="text-sm font-semibold text-app-ink">{form.name || "Tên discount"}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-sm text-app-ink-muted line-through">
                      {formatVnd(previewOriginal)}
                    </span>
                    <span className="text-lg font-semibold text-app-status-success">
                      {formatVnd(previewFinal)}
                    </span>
                    <Badge className="ml-1 bg-app-status-success/15 text-app-status-success text-[11px]">
                      {form.discountType === "percentage" ? `-${form.discountValue}%` : `-${formatVnd(form.discountValue)}`}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(form.appliesTo ?? ["PLUS"]).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t === "PLUS" ? "PLUS" : "Vision Board Kit"}
                      </Badge>
                    ))}
                  </div>
                  {form.minAmount ? (
                    <p className="mt-1.5 text-[11px] text-app-ink-muted">
                      Đơn tối thiểu: {formatVnd(form.minAmount)}
                    </p>
                  ) : null}
                  {form.maxUses ? (
                    <p className="mt-0.5 text-[11px] text-app-ink-muted">
                      Giới hạn: {form.maxUses} lượt
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex items-center gap-2 sm:gap-0">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((s) => (s - 1) as FormStep)}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Quay lại
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFormOpen(false);
                setCurrentStep(1);
                setFormError(null);
              }}
            >
              Hủy
            </Button>
            <div className="flex-1" />
            {currentStep < TOTAL_STEPS ? (
              <Button size="sm" onClick={() => setCurrentStep((s) => (s + 1) as FormStep)}>
                Tiếp theo
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Đang lưu…" : editing ? "Cập nhật" : "Tạo discount"}
              </Button>
            )}
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
          {mutationError ? (
            <AdminFeedbackBanner
              tone="error"
              summary={mutationError}
              onDismiss={() => setMutationError(null)}
              dismissLabel="Đóng lỗi cập nhật discount"
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Vô hiệu hóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Usages Dialog */}
      <Dialog
        open={usagesOpen}
        onOpenChange={(open) => {
          setUsagesOpen(open);
          if (!open) setUsagesError(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lịch sử sử dụng: {usagesDiscount?.code}</DialogTitle>
            <DialogDescription>
              {usagesTotal} lượt sử dụng
            </DialogDescription>
          </DialogHeader>
          {usagesError ? <AdminFeedbackBanner tone="error" summary={usagesError} /> : null}
          {usagesLoading ? (
            <div className="flex items-center gap-3 py-8" role="status">
              <Loader2
                className="h-5 w-5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <span>Đang tải...</span>
            </div>
          ) : usages.length === 0 ? (
            <p className="py-8 text-center text-sm text-app-ink-muted">Chưa có lượt sử dụng nào.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableCaption className="sr-only">Lịch sử sử dụng discount</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Người dùng</TableHead>
                    <TableHead scope="col">Đơn hàng</TableHead>
                    <TableHead scope="col">Thời gian</TableHead>
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
