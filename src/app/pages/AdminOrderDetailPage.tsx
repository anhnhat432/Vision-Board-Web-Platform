import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import type { AdminClassificationMutationPayload, AdminOperationalClassificationSummary } from "@/services/adminService";
import { type AdminApiOrder, adminClassifyPhysicalOrder, adminGetOrder } from "@/services/orderService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminOperationalClassificationBadge, getAdminOperationalClassificationSourceLabel } from "../components/admin/AdminOperationalClassificationBadge";
import { AdminOperationalClassificationDialog } from "../components/admin/AdminOperationalClassificationDialog";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import { AdminStatusBadge } from "../components/admin/AdminStatusBadge";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "../components/admin/statusMappings";
import { ADMIN_LOAD_TIMEOUT_MS, formatDate, formatVnd, getErrorMessage, withTimeout } from "../components/admin/utils";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-xs text-app-ink-muted shrink-0">{label}</span>
      <span className="text-sm text-app-ink text-right">{value || "—"}</span>
    </div>
  );
}

function getErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "errorCode" in error
    ? String(error.errorCode)
    : undefined;
}

const DEFAULT_OPERATIONAL_CLASSIFICATION: AdminOperationalClassificationSummary = {
  effectiveCategory: "real",
  source: "default",
};

function normalizeOrderOperationalClassification(order: AdminApiOrder): AdminApiOrder {
  return order.operationalClassification
    ? order
    : { ...order, operationalClassification: DEFAULT_OPERATIONAL_CLASSIFICATION };
}

function getEditableOperationalReason(
  reason: AdminOperationalClassificationSummary["reason"],
): AdminClassificationMutationPayload["reason"] | undefined {
  return reason === "legacy_sales_test" || reason === "legacy_sales_internal" ? undefined : reason;
}

function TimelineEntry({
  status,
  changedAt,
  changedBy,
  isLast,
}: {
  status: string;
  changedAt: string;
  changedBy: string;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <span
          className={`mt-1.5 h-2.5 w-2.5 rounded-full border-2 ${
            isLast
              ? "border-app-accent bg-app-accent"
              : "border-app-line-strong bg-app-bg"
          }`}
        />
        {!isLast ? <span className="w-px flex-1 bg-app-line/60" /> : null}
      </div>
      <div className={`pb-4 ${isLast ? "" : ""}`}>
        <p className="text-sm font-medium text-app-ink">
          {ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}
        </p>
        <p className="text-xs text-app-ink-muted">
          {formatDate(changedAt)} · bởi {changedBy === "system" ? "Hệ thống" : changedBy.slice(0, 8)}
        </p>
      </div>
    </div>
  );
}

export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [classificationBusy, setClassificationBusy] = useState(false);
  const [classificationError, setClassificationError] = useState<string | undefined>();
  const classificationRequestRef = useRef<{ commandKey: string; requestId: string } | null>(null);
  const classificationMutationRef = useRef(0);
  const loadGeneration = useRef(0);
  const currentIdRef = useRef(id);
  const previousIdRef = useRef(id);
  currentIdRef.current = id;

  const load = useCallback(async (requestedId = currentIdRef.current) => {
    if (!requestedId) return;
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError(null);
    try {
      const data = await withTimeout(
        adminGetOrder(requestedId),
        ADMIN_LOAD_TIMEOUT_MS,
        "Hết thời gian tải chi tiết đơn hàng.",
      );
      if (generation !== loadGeneration.current || requestedId !== currentIdRef.current) return;
      setOrder(normalizeOrderOperationalClassification(data));
    } catch (err) {
      if (generation !== loadGeneration.current || requestedId !== currentIdRef.current) return;
      setError(getErrorMessage(err, "Không thể tải chi tiết đơn hàng."));
    } finally {
      if (generation === loadGeneration.current && requestedId === currentIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(id);
  }, [id, load]);

  useEffect(() => {
    if (previousIdRef.current === id) return;
    previousIdRef.current = id;
    classificationMutationRef.current += 1;
    classificationRequestRef.current = null;
    setClassificationBusy(false);
    setClassificationOpen(false);
    setClassificationError(undefined);
  }, [id]);

  const handleClassification = async (payload: Omit<AdminClassificationMutationPayload, "requestId">) => {
    const targetOrder = order;
    const targetId = id;
    if (!targetOrder || !targetId) return;
    if (targetOrder.operationalClassification.source === "user" && payload.category === "real") {
      setClassificationError("Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng.");
      return;
    }
    const commandKey = JSON.stringify({ id: targetId, ...payload, note: payload.note?.trim() || null });
    const current = classificationRequestRef.current;
    const requestId = current?.commandKey === commandKey ? current.requestId : crypto.randomUUID();
    classificationRequestRef.current = { commandKey, requestId };
    const mutation = ++classificationMutationRef.current;
    setClassificationBusy(true);
    setClassificationError(undefined);
    try {
      const result = await adminClassifyPhysicalOrder(targetId, { ...payload, requestId });
      if (mutation !== classificationMutationRef.current || targetId !== currentIdRef.current) return;
      if (result.status === "updated" || result.status === "unchanged") {
        await load();
        if (mutation !== classificationMutationRef.current || targetId !== currentIdRef.current) return;
        classificationRequestRef.current = null;
        setClassificationOpen(false);
      } else {
        classificationRequestRef.current = null;
        setClassificationError("Không thể phân loại đơn in. Hãy thử lại.");
      }
    } catch (err) {
      if (mutation !== classificationMutationRef.current || targetId !== currentIdRef.current) return;
      const errorCode = getErrorCode(err);
      if (errorCode === "admin_classification_request_conflict") {
        await load();
        if (mutation !== classificationMutationRef.current || targetId !== currentIdRef.current) return;
        setClassificationError("Dữ liệu đã thay đổi. Chi tiết đơn đã được tải lại.");
      } else if (errorCode === "admin_audit_commit_unknown" || !errorCode) {
        setClassificationError("Kết quả phân loại chưa rõ. Hãy thử lại cùng yêu cầu này.");
      } else {
        classificationRequestRef.current = null;
        setClassificationError("Không thể phân loại đơn in. Hãy thử lại.");
      }
    } finally {
      if (mutation === classificationMutationRef.current) setClassificationBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-app-ink-soft motion-reduce:animate-none" aria-hidden="true" />
        <span className="sr-only">Đang tải chi tiết đơn hàng</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1 text-sm text-app-ink-muted hover:text-app-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại danh sách
        </Link>
        <AdminFeedbackBanner
          tone="error"
          summary={error || "Không tìm thấy đơn hàng."}
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Thử lại
            </Button>
          }
        />
      </div>
    );
  }

  const frameLine = order.lines?.find((l) => l.type === "frame");
  const themeLines = order.lines?.filter((l) => l.type === "theme") ?? [];
  const stickerLines = order.lines?.filter((l) => l.type === "sticker") ?? [];
  const visibleLines = [...(frameLine ? [frameLine] : []), ...themeLines, ...stickerLines];
  const shippingAddr = order.shippingAddress;
  const statusHistory = order.statusHistory ?? [];

  return (
    <div className="space-y-6">
      <Link
        to="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-app-ink-muted transition-colors hover:text-app-ink motion-reduce:transition-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Quay lại danh sách
      </Link>

      <AdminPageHeader
        title={`Đơn ${order.id.slice(-8).toUpperCase()}`}
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={classificationBusy}
            onClick={() => {
              classificationMutationRef.current += 1;
              classificationRequestRef.current = null;
              setClassificationError(undefined);
              setClassificationOpen(true);
            }}
          >
            Phân loại dữ liệu
          </Button>
        }
        description={
          <span className="flex items-center gap-2 mt-1">
            <AdminOperationalClassificationBadge classification={order.operationalClassification} />
            <AdminStatusBadge tone={ORDER_STATUS_TONES[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </AdminStatusBadge>
            <span className="text-app-ink-muted">·</span>
            <span className="text-xs text-app-ink-muted">
              {getAdminOperationalClassificationSourceLabel(order.operationalClassification.source)}
            </span>
            <span className="text-app-ink-muted">·</span>
            <span className="inline-flex items-center gap-1 text-xs text-app-ink-muted">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              {formatDate(order.createdAt)}
            </span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <AdminDataPanel title="Khách hàng" contentClassName="space-y-1 p-5">
            <InfoRow label="Họ tên" value={order.fullName} />
            <InfoRow
              label="Email"
              value={
                <a href={`mailto:${order.email}`} className="text-app-accent hover:underline">
                  {order.email}
                </a>
              }
            />
            <InfoRow
              label="SĐT"
              value={
                <a href={`tel:${order.phone}`} className="text-app-accent hover:underline">
                  {order.phone}
                </a>
              }
            />
          </AdminDataPanel>

          <AdminDataPanel title="Địa chỉ giao hàng" contentClassName="p-5">
            <p className="text-sm text-app-ink leading-relaxed">
              {shippingAddr?.line1 || "—"}
              {shippingAddr?.line2 ? <><br />{shippingAddr.line2}</> : null}
              {shippingAddr?.city ? <><br />{shippingAddr.city}</> : null}
            </p>
          </AdminDataPanel>

          {(order.note || order.adminNote) ? (
            <AdminDataPanel title="Ghi chú" contentClassName="space-y-3 p-5">
              {order.note ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-app-ink-muted/70 mb-1">
                    Ghi chú khách hàng
                  </h3>
                  <p className="text-sm text-app-ink-soft leading-relaxed">{order.note}</p>
                </div>
              ) : null}
              {order.adminNote ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-app-ink-muted/70 mb-1">
                    Ghi chú nội bộ
                  </h3>
                  <p className="text-sm text-app-ink-soft leading-relaxed">{order.adminNote}</p>
                </div>
              ) : null}
            </AdminDataPanel>
          ) : null}

          {order.goalSnapshot?.title ? (
            <AdminDataPanel title="Mục tiêu gắn kèm" contentClassName="p-5">
              <p className="text-sm text-app-ink-soft">{order.goalSnapshot.title}</p>
            </AdminDataPanel>
          ) : null}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <AdminDataPanel title="Sản phẩm trong đơn">
            <Table containerClassName="rounded-none border-0 shadow-none" className="text-app-ink-soft">
              <TableCaption className="sr-only">Sản phẩm trong đơn</TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Loại</TableHead>
                  <TableHead scope="col">Tên</TableHead>
                  <TableHead scope="col" className="text-right">SL</TableHead>
                  <TableHead scope="col" className="text-right">Đơn giá</TableHead>
                  <TableHead scope="col" className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLines.map((line) => (
                  <TableRow key={`${line.type}-${line.itemId}`}>
                    <TableCell>
                      <AdminStatusBadge tone="neutral">
                        {line.type === "frame" ? "Khung" : line.type === "theme" ? "Ảnh" : "Sticker"}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-app-ink">{line.label}</TableCell>
                    <TableCell className="text-right tabular-nums text-app-ink">{line.qty}</TableCell>
                    <TableCell className="text-right tabular-nums text-app-ink-soft">
                      {formatVnd(line.unitPriceVnd)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-app-ink">
                      {formatVnd(line.lineTotalVnd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminDataPanel>

          <AdminDataPanel title="Tổng tiền" contentClassName="p-5">
            <div className="space-y-2 tabular-nums">
              <div className="flex justify-between text-sm">
                <span className="text-app-ink-muted">Tạm tính</span>
                <span className="text-app-ink">{formatVnd(order.subtotalVnd ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-app-ink-muted">Phí vận chuyển</span>
                <span className="text-app-ink">{formatVnd(order.shippingVnd ?? 0)}</span>
              </div>
              {order.discount ? (
                <div className="flex justify-between text-sm">
                  <span className="text-app-ink-muted">
                    Giảm giá
                    {order.discount.discountCode ? (
                      <span className="ml-1 font-mono text-xs">({order.discount.discountCode})</span>
                    ) : null}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    -{formatVnd(order.discount.discountAmount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-app-line pt-2 text-base">
                <span className="font-semibold text-app-ink">Tổng cộng</span>
                <span className="font-bold text-app-ink">{formatVnd(order.totalVnd ?? 0)}</span>
              </div>
            </div>
          </AdminDataPanel>

          {statusHistory.length > 0 ? (
            <AdminDataPanel title="Lịch sử trạng thái" contentClassName="p-5">
              <div className="ml-1">
                {statusHistory.map((entry, index) => (
                  <TimelineEntry
                    key={`${entry.status}-${entry.changedAt}`}
                    status={entry.status}
                    changedAt={entry.changedAt}
                    changedBy={entry.changedBy}
                    isLast={index === statusHistory.length - 1}
                  />
                ))}
              </div>
            </AdminDataPanel>
          ) : null}

          <AdminDataPanel title="Thông tin hệ thống" contentClassName="p-5">
            <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-app-ink-muted">Mã đơn:</span>{" "}
                <span className="font-mono text-xs text-app-ink">{order.id}</span>
              </div>
              <div>
                <span className="text-app-ink-muted">User ID:</span>{" "}
                <span className="font-mono text-xs text-app-ink">{order.userId}</span>
              </div>
              <div>
                <span className="text-app-ink-muted">Ngày tạo:</span>{" "}
                <span className="text-app-ink-soft">{formatDate(order.createdAt)}</span>
              </div>
              <div>
                <span className="text-app-ink-muted">Cập nhật:</span>{" "}
                <span className="text-app-ink-soft">{formatDate(order.updatedAt)}</span>
              </div>
              {order.cancelledAt ? (
                <div>
                  <span className="text-app-ink-muted">Hủy lúc:</span>{" "}
                  <span className="text-rose-500">{formatDate(order.cancelledAt)}</span>
                </div>
              ) : null}
              {order.deliveredAt ? (
                <div>
                  <span className="text-app-ink-muted">Giao lúc:</span>{" "}
                  <span className="text-emerald-500">{formatDate(order.deliveredAt)}</span>
                </div>
              ) : null}
            </div>
          </AdminDataPanel>
        </div>
      </div>

      <AdminOperationalClassificationDialog
        open={classificationOpen}
        targetType="physical_order"
        targetLabel={order.id}
        initialCategory={order.operationalClassification.effectiveCategory}
        initialReason={getEditableOperationalReason(order.operationalClassification.reason)}
        initialNote={order.operationalClassification.note}
        pending={classificationBusy}
        error={classificationError}
        disableRealCategory={
          order.operationalClassification.source === "user"
          && order.operationalClassification.effectiveCategory !== "real"
        }
        disabledRealCategoryReason="Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng."
        onOpenChange={(open) => {
          if (!open && !classificationBusy) {
            classificationMutationRef.current += 1;
            classificationRequestRef.current = null;
            setClassificationOpen(false);
            setClassificationError(undefined);
          }
        }}
        onConfirm={handleClassification}
      />
    </div>
  );
}

export default AdminOrderDetailPage;
