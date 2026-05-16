import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  QrCode,
  RefreshCw,
  Target,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate, useParams } from "react-router";

import { EmptyOrdersIllustration } from "../components/illustrations";
import { PageHero } from "../components/layout/PageHero";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  getKitTypeLabel,
  getLatestOrder,
  getNextOrderStatus,
  getOrderById,
  getOrders,
  getOrderStatusLabel,
  getOrderStatusStepIndex,
  updateOrderStatus,
  type LocalOrder,
  type OrderStatus,
} from "../utils/order-storage";
import { formatCalendarDate } from "../utils/storage";
import { isDemoMode } from "../utils/app-mode";
import { logBillingUiError, toastBillingNetworkError } from "../utils/billing-ui-monitoring";
import { formatVndAmount } from "../utils/billing-pricing";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/apiClient";
import { getOrder as getBackendOrder, type ApiOrder } from "@/services/orderService";
import { getBackendOrderId } from "@/lib/api/orderLinkStore";

const UNLINKED_GOAL_TITLE = "Chưa gắn mục tiêu cụ thể";
const DEFAULT_FOCUS_AREA = "Chưa chọn trọng tâm";
const PAYMENT_ORDER_ID_PREFIX = "VB";
const PAYMENT_POLL_INTERVAL_MS = 5_000;
const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;
const TRANSFER_CONFIRM_DELAY_MS = 30 * 1000;
const PAYMENT_HELP_DELAY_MS = 5 * 60 * 1000;
const REDIRECT_AFTER_SUCCESS_MS = 1_200;

function getSupportEmail(): string {
  return import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";
}

type PaymentOrderStatus = "pending" | "completed" | "expired" | "failed";

interface PaymentOrderStatusResponse {
  orderId: string;
  status: PaymentOrderStatus;
  amount: number;
  currency: string;
  bankAccount: string;
  bankName: string;
  accountName: string;
  qrDataUrl: string;
  expiresAt: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  description?: string | null;
}

function isPaymentOrderId(value: string | undefined): value is string {
  return Boolean(value?.toUpperCase().startsWith(PAYMENT_ORDER_ID_PREFIX));
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getPaymentExpiresAt(order: PaymentOrderStatusResponse | null): number | null {
  if (!order) return null;
  if (order.expiresAt) {
    const expiresAtMs = new Date(order.expiresAt).getTime();
    if (Number.isFinite(expiresAtMs)) return expiresAtMs;
  }
  if (order.createdAt) {
    const createdAtMs = new Date(order.createdAt).getTime();
    if (Number.isFinite(createdAtMs)) return createdAtMs + PAYMENT_TIMEOUT_MS;
  }
  return null;
}

function createSupportMailto(orderId: string): string {
  const subject = encodeURIComponent(`Hỗ trợ thanh toán đơn ${orderId}`);
  const body = encodeURIComponent(`Chào đội hỗ trợ,\n\nTôi đã chuyển khoản cho đơn ${orderId} nhưng chưa nhận quyền Plus. Nhờ đội kiểm tra giúp.\n`);
  return `mailto:${getSupportEmail()}?subject=${subject}&body=${body}`;
}

/** Map backend status → local display status. Backend has "confirmed"/"cancelled" which local doesn't. */
function normalizeBackendStatus(status: string): OrderStatus {
  switch (status) {
    case "printing":
    case "shipping":
    case "delivered":
      return status;
    case "confirmed":
      return "printing";
    default:
      return "pending";
  }
}

/** Convert an ApiOrder to the LocalOrder display shape so the rest of the page renders unchanged. */
function mapBackendOrderToLocal(api: ApiOrder, localOrder: LocalOrder | null): LocalOrder {
  const addressParts = [api.shippingAddress.line1, api.shippingAddress.line2, api.shippingAddress.city, api.shippingAddress.country]
    .filter(Boolean)
    .join(", ");

  return {
    id: localOrder?.id ?? api.id,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    status: api.status === "cancelled" ? "pending" : normalizeBackendStatus(api.status),
    goalId: api.goalSnapshot?.goalId ?? localOrder?.goalId ?? null,
    goalTitle: api.goalSnapshot?.title ?? localOrder?.goalTitle ?? UNLINKED_GOAL_TITLE,
    focusArea: api.goalSnapshot?.focusArea ?? localOrder?.focusArea ?? DEFAULT_FOCUS_AREA,
    fullName: api.fullName,
    email: api.email,
    phone: api.phone,
    shippingAddress: addressParts || localOrder?.shippingAddress || "",
    keywords: localOrder?.keywords ?? [],
    note: api.note ?? localOrder?.note ?? "",
    kitType: (api.kitType as LocalOrder["kitType"]) ?? localOrder?.kitType ?? "vision-kit",
  };
}

const ORDER_TIMELINE_STEPS: ReadonlyArray<{
  status: OrderStatus;
  description: string;
  icon: typeof ClipboardList;
}> = [
  {
    status: "pending",
    description: "Đơn đã được ghi nhận trên thiết bị này và chờ xác nhận.",
    icon: ClipboardList,
  },
  {
    status: "printing",
    description: "Kit đang được chuẩn bị nội dung và xử lý ở bước in.",
    icon: Package,
  },
  {
    status: "shipping",
    description: "Kit đã sẵn sàng đi giao trong luồng đơn hiện tại.",
    icon: Truck,
  },
  {
    status: "delivered",
    description: "Đơn đã được đánh dấu giao thành công trong luồng trên thiết bị này.",
    icon: CheckCircle2,
  },
];

export function OrderStatusPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuthContext();
  const demoMode = isDemoMode();
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const [recentOrders, setRecentOrders] = useState<LocalOrder[]>([]);
  const [isBackendBacked, setIsBackendBacked] = useState(false);
  const [backendRawStatus, setBackendRawStatus] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrderStatusResponse | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentNow, setPaymentNow] = useState(() => Date.now());
  const [copiedPaymentField, setCopiedPaymentField] = useState<string | null>(null);
  const [transferConfirmedByUser, setTransferConfirmedByUser] = useState(false);
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);
  const [successRedirecting, setSuccessRedirecting] = useState(false);
  const paymentPageOpenedAtRef = useRef(Date.now());
  const paymentRedirectedRef = useRef(false);
  const paymentMode = isPaymentOrderId(params.orderId);

  const fetchPaymentOrder = useCallback(async (orderId: string) => {
    setPaymentError(null);
    try {
      const data = await apiClient.get<PaymentOrderStatusResponse>(`/billing/orders/${encodeURIComponent(orderId)}`);
      setPaymentOrder(data);
      if (data.status === "completed" && !paymentRedirectedRef.current) {
        paymentRedirectedRef.current = true;
        setSuccessRedirecting(true);
        toast.success("Plus đã kích hoạt!");
        window.setTimeout(() => navigate("/billing/plan", { replace: true }), REDIRECT_AFTER_SUCCESS_MS);
      }
    } catch (error: unknown) {
      if (toastBillingNetworkError(error, { surface: "OrderStatusPage", action: "fetch_payment_order", orderId })) {
        setPaymentError("Mạng có vấn đề, vui lòng thử lại");
      } else {
        logBillingUiError(error, { surface: "OrderStatusPage", action: "fetch_payment_order", orderId });
        setPaymentError(error instanceof Error ? error.message : "Không tải được trạng thái thanh toán.");
      }
    } finally {
      setPaymentLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!paymentMode || !params.orderId) return;

    setOrder(null);
    setRecentOrders([]);
    setPaymentLoading(true);
    paymentPageOpenedAtRef.current = Date.now();
    paymentRedirectedRef.current = false;
    void fetchPaymentOrder(params.orderId);

    const poll = window.setInterval(() => {
      setPaymentOrder((currentOrder) => {
        const expiresAt = getPaymentExpiresAt(currentOrder);
        if (currentOrder?.status === "completed" || currentOrder?.status === "expired" || currentOrder?.status === "failed") {
          window.clearInterval(poll);
          return currentOrder;
        }
        if (expiresAt && Date.now() >= expiresAt) {
          window.clearInterval(poll);
          return currentOrder;
        }
        void fetchPaymentOrder(params.orderId as string);
        return currentOrder;
      });
    }, PAYMENT_POLL_INTERVAL_MS);

    return () => window.clearInterval(poll);
  }, [fetchPaymentOrder, params.orderId, paymentMode]);

  useEffect(() => {
    if (!paymentMode) return;
    const timer = window.setInterval(() => setPaymentNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [paymentMode]);

  const copyPaymentValue = useCallback((value: string, key: string) => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopiedPaymentField(key);
        window.setTimeout(() => setCopiedPaymentField((current) => (current === key ? null : current)), 1600);
      })
      .catch(() => setPaymentError("Không sao chép được. Bạn có thể chọn và sao chép thủ công."));
  }, []);

  const handleUserConfirmedTransfer = useCallback(async () => {
    if (!paymentOrder || confirmingTransfer) return;
    setConfirmingTransfer(true);
    setPaymentError(null);
    try {
      await apiClient.post(`/billing/orders/${encodeURIComponent(paymentOrder.orderId)}/userConfirmedTransfer`, {
        userConfirmedTransferAt: new Date().toISOString(),
      });
      setTransferConfirmedByUser(true);
    } catch (error: unknown) {
      if (toastBillingNetworkError(error, {
        surface: "OrderStatusPage",
        action: "confirm_transfer",
        orderId: paymentOrder.orderId,
        amount: paymentOrder.amount,
        status: paymentOrder.status,
      })) {
        setPaymentError("Mạng có vấn đề, vui lòng thử lại");
      } else {
        logBillingUiError(error, {
          surface: "OrderStatusPage",
          action: "confirm_transfer",
          orderId: paymentOrder.orderId,
          amount: paymentOrder.amount,
          status: paymentOrder.status,
        });
        setPaymentError(error instanceof Error ? error.message : "Không ghi nhận được xác nhận chuyển khoản.");
      }
    } finally {
      setConfirmingTransfer(false);
    }
  }, [confirmingTransfer, paymentOrder]);

  const paymentExpiresAtMs = getPaymentExpiresAt(paymentOrder);
  const paymentTimeLeftMs = paymentExpiresAtMs ? Math.max(0, paymentExpiresAtMs - paymentNow) : PAYMENT_TIMEOUT_MS;
  const paymentElapsedOnPageMs = paymentNow - paymentPageOpenedAtRef.current;
  const paymentTimedOut = Boolean(paymentOrder?.status === "expired" || (paymentOrder?.status === "pending" && paymentExpiresAtMs && paymentNow >= paymentExpiresAtMs));
  const showTransferConfirmButton = Boolean(paymentOrder?.status === "pending" && paymentElapsedOnPageMs >= TRANSFER_CONFIRM_DELAY_MS && !transferConfirmedByUser && !paymentTimedOut);
  const showSlowPaymentHelp = Boolean(paymentOrder?.status === "pending" && paymentElapsedOnPageMs >= PAYMENT_HELP_DELAY_MS && !paymentTimedOut);
  const transferDescription = paymentOrder?.description?.trim() || paymentOrder?.orderId || "";

  useEffect(() => {
    if (paymentMode) return;
    const nextRecentOrders = getOrders();
    const matchedOrder = params.orderId ? getOrderById(params.orderId) : getLatestOrder();

    setRecentOrders(nextRecentOrders);
    setOrder(matchedOrder);
    setIsBackendBacked(false);
    setBackendRawStatus(null);
    document.title = "Trạng thái đơn kit - Dear Our Future";

    // If authenticated and we have a backend link for this order, fetch backend status
    if (user && matchedOrder) {
      const backendId = getBackendOrderId(matchedOrder.id);
      if (backendId) {
        getBackendOrder(backendId)
          .then((backendOrder) => {
            setOrder(mapBackendOrderToLocal(backendOrder, matchedOrder));
            setIsBackendBacked(true);
            setBackendRawStatus(backendOrder.status);
          })
          .catch(() => {
            // Backend fetch failed — keep showing local order data
          });
      }
    }
  }, [params.orderId, paymentMode, user]);

  if (paymentMode) {
    if (paymentLoading && !paymentOrder) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-500">Đang tải trạng thái thanh toán...</p>
          </div>
        </div>
      );
    }

    if (paymentError && !paymentOrder) {
      return (
        <div className="mx-auto max-w-md px-4 py-12">
          <Card className="border-red-200 bg-red-50/80 text-center shadow-lg">
            <CardContent className="p-8">
              <h1 className="text-xl font-bold text-red-800">Không tải được đơn thanh toán</h1>
              <p className="mt-2 text-sm leading-6 text-red-700">{paymentError}</p>
              <Button type="button" className="mt-6" onClick={() => params.orderId && void fetchPaymentOrder(params.orderId)}>
                <RefreshCw className="h-4 w-4" />
                Tải lại trang
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!paymentOrder) return null;

    if (successRedirecting || paymentOrder.status === "completed") {
      return (
        <div className="mx-auto max-w-md px-4 py-12">
          <Card className="overflow-hidden border-emerald-200 bg-emerald-50/90 text-center shadow-xl">
            <CardContent className="p-8">
              <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-[var(--r-pill)] bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h1 className="mt-5 text-2xl font-bold text-emerald-900">Plus đã kích hoạt!</h1>
              <p className="mt-2 text-sm leading-6 text-emerald-800">Đang chuyển bạn về trang gói để tiếp tục sử dụng Plus.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (paymentTimedOut || paymentOrder.status === "failed") {
      return (
        <div className="mx-auto max-w-2xl px-4 py-12">
          <Card className="border-amber-200 bg-amber-50/90 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[var(--r-pill)] bg-amber-100 text-amber-700">
                <Clock className="h-8 w-8" />
              </div>
              <h1 className="mt-5 text-2xl font-bold text-amber-900">Đơn hàng đã huỷ</h1>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-amber-800">
                Đơn hàng đã huỷ, không nhận được chuyển khoản. Nếu bạn đã chuyển khoản, liên hệ {getSupportEmail()} để đội hỗ trợ kiểm tra.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button type="button" asChild>
                  <a href={createSupportMailto(paymentOrder.orderId)}>
                    <Mail className="h-4 w-4" />
                    Liên hệ hỗ trợ
                  </a>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/billing/faq">Xem FAQ thanh toán</Link>
                </Button>
                <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4" />
                  Tải lại trang
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
          <Card className="overflow-hidden border-indigo-100 bg-white shadow-xl shadow-indigo-100/60">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--r-pill)] bg-indigo-100 text-indigo-700">
                <QrCode className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl text-slate-950">Quét QR để chuyển khoản</CardTitle>
              <CardDescription>Giữ nguyên số tiền và nội dung. Hệ thống thường xác nhận trong 1-2 phút.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-7">
              <div className="rounded-[var(--r-card)] border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mã đơn hàng</p>
                <p className="mt-2 select-all break-all text-3xl font-black tracking-wide text-slate-950 sm:text-4xl">{paymentOrder.orderId}</p>
              </div>

              <div className="rounded-[var(--r-card)] border border-indigo-100 bg-indigo-50/60 p-4">
                {paymentOrder.qrDataUrl ? (
                  <img src={paymentOrder.qrDataUrl} alt={`QR chuyển khoản đơn ${paymentOrder.orderId}`} className="mx-auto aspect-square w-full max-w-[360px] rounded-[var(--r-card)] bg-white p-3 shadow-sm" />
                ) : (
                  <div className="mx-auto flex aspect-square w-full max-w-[360px] items-center justify-center rounded-[var(--r-card)] bg-white text-slate-400">
                    <QrCode className="h-16 w-16" />
                  </div>
                )}
              </div>

              <div className="text-center" role="status" aria-live="polite">
                <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-indigo-50 px-4 py-2 text-indigo-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-semibold">Đang chờ xác nhận chuyển khoản</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-600">Đơn hàng sẽ huỷ trong {formatCountdown(paymentTimeLeftMs)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-slate-200 bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Thông tin chuyển khoản</CardTitle>
                <CardDescription>Nhấn nút sao chép từng dòng để tránh nhập sai. Nội dung chuyển khoản là phần quan trọng nhất.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <PaymentInfoRow label="Số tiền" value={`${formatVndAmount(paymentOrder.amount)} ${paymentOrder.currency}`} copyValue={String(paymentOrder.amount)} copyKey="amount" copiedKey={copiedPaymentField} onCopy={copyPaymentValue} highlight />
                <PaymentInfoRow label="Ngân hàng nhận" value={paymentOrder.bankName} copyValue={paymentOrder.bankName} copyKey="bank" copiedKey={copiedPaymentField} onCopy={copyPaymentValue} />
                <PaymentInfoRow label="STK ngân hàng nhận" value={paymentOrder.bankAccount} copyValue={paymentOrder.bankAccount} copyKey="account" copiedKey={copiedPaymentField} onCopy={copyPaymentValue} highlight />
                <PaymentInfoRow label="Chủ tài khoản" value={paymentOrder.accountName} copyValue={paymentOrder.accountName} copyKey="name" copiedKey={copiedPaymentField} onCopy={copyPaymentValue} />
                <PaymentInfoRow label="Nội dung chuyển khoản" value={transferDescription} copyValue={transferDescription} copyKey="description" copiedKey={copiedPaymentField} onCopy={copyPaymentValue} highlight />
              </CardContent>
            </Card>

            {paymentError && (
              <div className="rounded-[var(--r-card)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">{paymentError}</div>
            )}

            <Card className="border-slate-200 bg-slate-50/90 shadow-sm">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-700">
                  Cần biết cách xác nhận thanh toán, nhận Plus hoặc xử lý chuyển khoản sai?
                </p>
                <Button type="button" variant="outline" asChild>
                  <Link to="/billing/faq">Xem FAQ thanh toán</Link>
                </Button>
              </CardContent>
            </Card>

            {showTransferConfirmButton && (
              <Card className="border-emerald-100 bg-emerald-50/80 shadow-sm">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-emerald-900">Đã chuyển khoản? Bấm để đội hỗ trợ thấy bạn đã xác nhận khi cần kiểm tra.</p>
                  <Button type="button" onClick={handleUserConfirmedTransfer} disabled={confirmingTransfer} className="bg-emerald-600 hover:bg-emerald-700">
                    {confirmingTransfer ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Tôi đã chuyển khoản xong
                  </Button>
                </CardContent>
              </Card>
            )}

            {transferConfirmedByUser && (
              <div className="rounded-[var(--r-card)] border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                Cảm ơn bạn! Chúng tôi đang xác nhận giao dịch (thường 1-2 phút).
              </div>
            )}

            {showSlowPaymentHelp && (
              <Card className="border-amber-200 bg-amber-50/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-amber-950">Quá lâu chưa thấy phản hồi?</CardTitle>
                  <CardDescription className="text-amber-800">
                    Ngân hàng đôi khi chậm 3-5 phút. Nếu bạn đã chuyển và quá 10 phút chưa nhận quyền:
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" asChild variant="outline" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
                    <a href={createSupportMailto(paymentOrder.orderId)}>
                      <Mail className="h-4 w-4" />
                      Liên hệ hỗ trợ
                    </a>
                  </Button>
                  <Button type="button" variant="outline" asChild className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
                    <Link to="/billing/faq">Xem FAQ thanh toán</Link>
                  </Button>
                  <Button type="button" variant="outline" onClick={() => window.location.reload()} className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
                    <RefreshCw className="h-4 w-4" />
                    Tải lại trang
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="stack-section pb-12">
        <Card className="overflow-hidden border-0 gradient-slate shadow-2xl">
          <CardContent className="p-10 text-center lg:p-14">
            <EmptyOrdersIllustration className="mx-auto mb-4 w-40 text-violet-500 opacity-80" />
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[var(--r-tile)] bg-slate-900 text-white">
              <ClipboardList className="h-10 w-10" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">Chưa có đơn nào trong không gian làm việc của bạn</h1>
            <p className="mx-auto mt-[var(--space-inline)] max-w-2xl text-base text-slate-500">
              Hiện chưa tìm thấy đơn theo mã đang mở. Bạn có thể tạo đơn mới hoặc quay lại luồng mục tiêu để chọn hướng đi tiếp theo.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate("/order")}>
                <Package className="h-4 w-4" />
                Tạo đơn kit
              </Button>
              <Button variant="outline" onClick={() => navigate("/goals")}>
                Quay lại luồng mục tiêu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCancelled = backendRawStatus === "cancelled";
  const visualTimelineStep = getOrderStatusStepIndex(order.status);
  const nextStatus = isBackendBacked ? null : getNextOrderStatus(order.status);
  const hasGoalLink = Boolean(order.goalId || (order.goalTitle.trim() && order.goalTitle !== UNLINKED_GOAL_TITLE));
  const hasKeywords = order.keywords.length > 0;
  const hasNote = order.note.trim().length > 0;
  const createdAtLabel = formatCalendarDate(order.createdAt, "vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const updatedAtLabel = formatCalendarDate(order.updatedAt, "vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const refreshOrders = (fallbackOrder?: LocalOrder) => {
    const nextRecentOrders = getOrders();
    const matchedOrder = params.orderId ? getOrderById(params.orderId) : getLatestOrder();

    setRecentOrders(nextRecentOrders);
    setOrder(matchedOrder ?? fallbackOrder ?? null);
  };

  const handleAdvanceStatus = () => {
    if (!nextStatus) return;

    const updatedOrder = updateOrderStatus(order.id, nextStatus);
    if (!updatedOrder) return;
    refreshOrders(updatedOrder);
  };

  const handleCreateAnotherOrder = () => {
    if (order.goalId) {
      navigate("/order", { state: { goalId: order.goalId } });
      return;
    }

    navigate("/order");
  };

  const summaryItems = [
    {
      label: "Mã đơn",
      value: order.id,
      note: "Dùng để mở lại đúng đơn trong local flow.",
      icon: ClipboardList,
    },
    {
      label: "Ngày tạo",
      value: createdAtLabel,
      note: `Cập nhật gần nhất: ${updatedAtLabel}.`,
      icon: CalendarDays,
    },
    {
      label: "Trạng thái",
      value: getOrderStatusLabel(order.status),
      note: "Timeline bên dưới sẽ phản ánh đúng trạng thái hiện tại.",
      icon: Truck,
    },
    {
      label: "Loại kit",
      value: getKitTypeLabel(order.kitType),
      note: hasGoalLink ? order.focusArea : "Đơn đang ở chế độ độc lập.",
      icon: Package,
    },
  ];

  return (
    <div className="stack-section pb-12">
      <PageHero
        className="page-enter"
        eyebrow="Theo dõi đơn hàng"
        eyebrowIcon={<Truck className="h-3.5 w-3.5" />}
        title={
          <>
            Theo dõi <span className="text-gradient-vibrant">trạng thái đơn kit</span> hiện tại.
          </>
        }
        description={
          hasGoalLink
            ? `Đơn này đang bám theo mục tiêu "${order.goalTitle}" trong nhóm ${order.focusArea}.`
            : "Đơn này chưa gắn với mục tiêu cụ thể, nhưng vẫn có thể theo dõi đầy đủ như một kit độc lập."
        }
        primaryCta={
          <Badge variant="neutral" className="px-3 py-1.5 text-[12px]">
            {getOrderStatusLabel(order.status)}
          </Badge>
        }
        secondaryCta={
          <Badge variant="neutral" className="px-3 py-1.5 text-[12px]">
            {getKitTypeLabel(order.kitType)}
          </Badge>
        }
        aside={
          <div className="rounded-[var(--r-tile)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4 shadow-sm">
            <EmptyOrdersIllustration className="mb-2 hidden w-20 text-[color:var(--tone-shell-primary)] opacity-50 sm:block" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tóm tắt đơn</p>
            <div className="mt-3 grid gap-2">
              {summaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card px-3 py-2.5"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <Icon className="h-3 w-3 text-[color:var(--tone-shell-primary)]" />
                      {item.label}
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-foreground">{item.value}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{item.note}</p>
                  </div>
                );
              })}
            </div>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="stack-section">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Chi tiết đơn</CardTitle>
              <CardDescription>Những thông tin chính của đơn, người nhận và kit được gom lại để dễ quét nhanh.</CardDescription>
            </CardHeader>

            <CardContent className="stack-section">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mục tiêu & kit</p>
                <p className="text-sm text-muted-foreground">Giữ phần định hướng và cấu hình kit ở cùng một cụm để quét nhanh hơn.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-[color:var(--tone-shell-primary)]" />
                    Mục tiêu đang gắn
                  </div>
                  <p className="mt-[var(--space-inline)] text-base font-semibold text-foreground">
                    {hasGoalLink ? order.goalTitle : "Đơn này chưa gắn mục tiêu"}
                  </p>
                  <p className="mt-1 text-sm leading-7 text-muted-foreground">
                    {hasGoalLink
                      ? `Kit đang bám theo nhóm ${order.focusArea}.`
                      : "Bạn vẫn có thể theo dõi đơn như một kit độc lập trong flow hiện tại."}
                  </p>
                </div>

                <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    Cấu hình kit
                  </div>
                  <p className="mt-[var(--space-inline)] text-base font-semibold text-slate-900">{getKitTypeLabel(order.kitType)}</p>
                  <p className="mt-1 text-sm leading-7 text-slate-600">
                    {hasKeywords ? `${order.keywords.length} từ khóa đã được lưu cùng đơn này.` : "Chưa có từ khóa cụ thể cho kit."}
                  </p>
                </div>
              </div>

              <div className="space-y-1 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Người nhận & giao hàng</p>
                <p className="text-sm text-slate-600">Thông tin liên hệ và địa chỉ được tách riêng để hạn chế phải dò lại trong card.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[var(--r-card)] border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    Người nhận
                  </div>
                  <p className="mt-[var(--space-inline)] text-sm font-semibold text-slate-900">{order.fullName}</p>
                  <p className="mt-1 text-sm text-slate-600">{order.email}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-3.5 w-3.5" />
                    {order.phone || "Chưa bổ sung số điện thoại"}
                  </div>
                </div>

                <div className="rounded-[var(--r-card)] border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    Địa chỉ giao
                  </div>
                  <p className="mt-[var(--space-inline)] text-sm leading-7 text-slate-600">{order.shippingAddress}</p>
                </div>
              </div>

              {(hasKeywords || hasNote) && (
                <div className="stack-stack border-t border-slate-100 pt-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Từ khóa & ghi chú</p>
                    <p className="text-sm text-slate-600">Những thông tin tinh chỉnh cho kit được gom riêng để đỡ lẫn với thông tin giao hàng.</p>
                  </div>

                  <div className="rounded-[var(--r-card)] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Package className="h-3.5 w-3.5" />
                      Ghi chú cho kit
                    </div>

                    {hasKeywords && (
                      <div className="mt-[var(--space-inline)] flex flex-wrap gap-2">
                        {order.keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="border-slate-200 bg-white text-slate-700">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {hasNote && <p className="mt-[var(--space-inline)] text-sm leading-7 text-slate-600">{order.note}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Tiến trình đơn</CardTitle>
              <CardDescription>Dòng thời gian nhỏ cho luồng đơn hiện tại, gồm đủ 4 bước từ chờ xác nhận đến đã giao.</CardDescription>
            </CardHeader>

            <CardContent className="stack-section">
              {ORDER_TIMELINE_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < visualTimelineStep;
                const isCurrent = index === visualTimelineStep;
                const isActive = index <= visualTimelineStep;

                return (
                  <div
                    key={step.status}
                    className={`flex items-start gap-4 rounded-[var(--r-card)] border px-4 py-4 ${
                      isActive ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tile)] ${
                        isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${isActive ? "text-emerald-900" : "text-slate-700"}`}>
                          {getOrderStatusLabel(step.status)}
                        </p>
                        {isCurrent && (
                          <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-800">
                            Trạng thái hiện tại
                          </Badge>
                        )}
                        {!isCurrent && isCompleted && (
                          <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-800">
                            Đã hoàn thành
                          </Badge>
                        )}
                      </div>
                      <p className={`mt-1 text-sm leading-7 ${isActive ? "text-emerald-800/80" : "text-slate-500"}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}

              {isCancelled && (
                <div className="rounded-[var(--r-card)] border border-rose-200 bg-rose-50/80 p-4">
                  <p className="text-sm font-semibold text-rose-800">Đơn này đã bị huỷ.</p>
                  <p className="mt-1 text-sm leading-7 text-rose-700/80">
                    Bạn có thể tạo đơn mới nếu vẫn muốn đặt kit.
                  </p>
                </div>
              )}

              {demoMode && !isBackendBacked && !isCancelled && (
              <div className="stack-stack border-t border-slate-100 pt-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Điều khiển trạng thái</p>
                  <p className="text-sm text-slate-600">Phần này chỉ xuất hiện khi đơn chưa kết nối máy chủ.</p>
                </div>

                <div className="rounded-[var(--r-card)] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cập nhật trạng thái</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Dùng để cập nhật đơn lưu trên thiết bị khi chưa có dữ liệu từ máy chủ.
                      </p>
                    </div>
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                      Trên thiết bị
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    {nextStatus ? (
                      <>
                        <p className="text-sm text-slate-600">
                          Bước tiếp theo: <span className="font-medium text-slate-900">{getOrderStatusLabel(nextStatus)}</span>
                        </p>
                        <Button type="button" size="sm" variant="outline" onClick={handleAdvanceStatus}>
                          Chuyển sang bước tiếp theo
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600">Đơn đã ở bước cuối cùng trên thiết bị này.</p>
                        <Button type="button" size="sm" variant="outline" disabled>
                          Đã hoàn tất
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="stack-section">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Đơn gần đây</CardTitle>
              <CardDescription>Giữ luồng đơn gọn và cho phép mở nhanh lại các đơn vừa tạo.</CardDescription>
            </CardHeader>

            <CardContent className="stack-tight">
              {recentOrders.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-[var(--r-card)] border px-4 py-4 text-left transition-colors ${
                    item.id === order.id ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => navigate(`/order-status/${item.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.goalTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getOrderStatusLabel(item.status)} · {getKitTypeLabel(item.kitType)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatCalendarDate(item.createdAt, "vi-VN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {item.id === order.id && (
                      <Badge variant="outline" className="border-sky-200 bg-white text-sky-700">
                        Đang xem
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={handleCreateAnotherOrder}>
              <Package className="h-4 w-4" />
              {hasGoalLink ? "Tạo thêm kit từ mục tiêu này" : "Tạo đơn mới"}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/goals")}>
              {hasGoalLink ? "Quay lại danh sách mục tiêu" : "Quay lại mục tiêu"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentInfoRow({
  label,
  value,
  copyValue,
  copyKey,
  copiedKey,
  onCopy,
  highlight,
}: {
  label: string;
  value: string;
  copyValue: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
  highlight?: boolean;
}) {
  const copied = copiedKey === copyKey;

  return (
    <div className={`rounded-[var(--r-card)] border p-4 ${highlight ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50/70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className={`mt-2 select-all break-all font-bold ${highlight ? "text-lg text-indigo-900" : "text-base text-slate-900"}`}>{value}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => onCopy(copyValue, copyKey)} aria-label={`Sao chép ${label}`}>
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Đã copy" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
