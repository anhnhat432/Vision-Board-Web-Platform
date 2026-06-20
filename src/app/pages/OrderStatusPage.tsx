import {
  CheckCircle2,
  ClipboardList,
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
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";
import { formatVnd } from "@/features/order/lib/pricing";
import { apiClient } from "@/lib/api/apiClient";
import { getBackendOrderId } from "@/lib/api/orderLinkStore";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { type ApiOrder, type KitPaymentSessionResponse, createKitPaymentSession, getOrder as getBackendOrder } from "@/services/orderService";
import { PageHero } from "../components/layout/PageHero";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { isDemoMode } from "../utils/app-mode";
import { formatVndAmount } from "../utils/billing-pricing";
import { logBillingUiError, toastBillingNetworkError } from "../utils/billing-ui-monitoring";
import {
  getLatestOrder,
  getNextOrderStatus,
  getOrderById,
  getOrderStatusLabel,
  getOrderStatusStepIndex,
  getOrders,
  type LocalOrder,
  type OrderStatus,
  updateOrderStatus,
} from "../utils/order-storage";
import { formatCalendarDate } from "../utils/storage";

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
  provider?: string | null;
  bankAccount: string;
  bankName: string;
  accountName: string;
  qrDataUrl: string;
  checkoutUrl?: string | null;
  expiresAt: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  description?: string | null;
  purpose?: string | null;
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

function isRenderableQrImageSrc(value: string | null | undefined): value is string {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//")
  );
}

function createSupportMailto(orderId: string, isKitOrder = false): string {
  const subject = encodeURIComponent(`Hỗ trợ thanh toán đơn ${orderId}`);
  const body = isKitOrder
    ? encodeURIComponent(
        `Chào đội hỗ trợ,\n\nTôi đã chuyển khoản cho đơn kit ${orderId} nhưng trạng thái chưa được cập nhật. Nhờ đội kiểm tra giúp.\n`,
      )
    : encodeURIComponent(
        `Chào đội hỗ trợ,\n\nTôi đã chuyển khoản cho đơn ${orderId} nhưng chưa nhận quyền Plus. Nhờ đội kiểm tra giúp.\n`,
      );
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
  const addressParts = [
    api.shippingAddress.line1,
    api.shippingAddress.line2,
    api.shippingAddress.city,
    api.shippingAddress.country,
  ]
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
  const [failedQrImageSrc, setFailedQrImageSrc] = useState<string | null>(null);
  const paymentPageOpenedAtRef = useRef(Date.now());
  const paymentRedirectedRef = useRef(false);
  const paymentMode = isPaymentOrderId(params.orderId);

  const fetchPaymentOrder = useCallback(
    async (orderId: string) => {
      setPaymentError(null);
      try {
        const data = await apiClient.get<PaymentOrderStatusResponse>(`/billing/orders/${encodeURIComponent(orderId)}`);
        setPaymentOrder(data);
        if (data.status === "completed" && !paymentRedirectedRef.current) {
          paymentRedirectedRef.current = true;
          setSuccessRedirecting(true);
          const isKitOrder = data.purpose === "physical_order";
          if (isKitOrder) {
            toast.success("Đơn kit đã thanh toán!");
          } else {
            toast.success("Plus đã kích hoạt!");
          }
          window.setTimeout(() => {
            navigate(isKitOrder ? "/orders" : "/billing/plan", { replace: true });
          }, REDIRECT_AFTER_SUCCESS_MS);
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
    },
    [navigate],
  );

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
        if (
          currentOrder?.status === "completed" ||
          currentOrder?.status === "expired" ||
          currentOrder?.status === "failed"
        ) {
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

  const openHostedCheckout = useCallback(() => {
    if (!paymentOrder?.checkoutUrl) return;
    window.location.assign(paymentOrder.checkoutUrl);
  }, [paymentOrder?.checkoutUrl]);

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
      if (
        toastBillingNetworkError(error, {
          surface: "OrderStatusPage",
          action: "confirm_transfer",
          orderId: paymentOrder.orderId,
          amount: paymentOrder.amount,
          status: paymentOrder.status,
        })
      ) {
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
  const paymentTimedOut = Boolean(
    paymentOrder?.status === "expired" ||
      (paymentOrder?.status === "pending" && paymentExpiresAtMs && paymentNow >= paymentExpiresAtMs),
  );
  const showTransferConfirmButton = Boolean(
    paymentOrder?.status === "pending" &&
      paymentElapsedOnPageMs >= TRANSFER_CONFIRM_DELAY_MS &&
      !transferConfirmedByUser &&
      !paymentTimedOut,
  );
  const showSlowPaymentHelp = Boolean(
    paymentOrder?.status === "pending" && paymentElapsedOnPageMs >= PAYMENT_HELP_DELAY_MS && !paymentTimedOut,
  );
  const transferDescription = paymentOrder?.description?.trim() || paymentOrder?.orderId || "";
  const hasHostedCheckout = Boolean(paymentOrder?.checkoutUrl);
  const isHostedPayosCheckout = paymentOrder?.provider?.toLowerCase() === "payos" && hasHostedCheckout;
  const shouldRenderQrImage = Boolean(
    paymentOrder?.qrDataUrl &&
      isRenderableQrImageSrc(paymentOrder.qrDataUrl) &&
      paymentOrder.qrDataUrl !== failedQrImageSrc &&
      !isHostedPayosCheckout,
  );

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
            <Loader2 className="h-8 w-8 animate-spin text-app-accent" />
            <p className="text-sm text-app-ink-muted">Đang tải trạng thái thanh toán...</p>
          </div>
        </div>
      );
    }

    if (paymentError && !paymentOrder) {
      return (
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-card border border-app-status-error/20 bg-app-status-error/8 p-8 text-center">
            <h1 className="font-serif text-xl font-medium text-app-ink">Không tải được đơn thanh toán</h1>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">{paymentError}</p>
            <Button
              type="button"
              className="mt-6 bg-app-accent text-white hover:bg-app-accent"
              onClick={() => params.orderId && void fetchPaymentOrder(params.orderId)}
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại trang
            </Button>
          </div>
        </div>
      );
    }

    if (!paymentOrder) return null;

    if (successRedirecting || paymentOrder.status === "completed") {
      const isKitPayment = paymentOrder.purpose === "physical_order";
      return (
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-card border border-app-accent-soft bg-app-accent-soft p-8 text-center">
            <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-app-accent text-white">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="font-serif text-2xl font-medium text-app-ink mt-5">
              {isKitPayment ? "Đơn kit đã thanh toán!" : "Plus đã kích hoạt!"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">
              {isKitPayment
                ? "Đơn kit đã được xác nhận thanh toán. Đang chuyển bạn về danh sách đơn."
                : "Đang chuyển bạn về trang gói để tiếp tục sử dụng Plus."}
            </p>
          </div>
        </div>
      );
    }

    if (paymentTimedOut || paymentOrder.status === "failed") {
      const isKitPayment = paymentOrder.purpose === "physical_order";
      return (
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-card border border-app-status-error/20 bg-app-status-error/8 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <XCircle className="h-8 w-8 text-app-status-error" />
            </div>
            <h1 className="font-serif text-2xl font-medium text-app-ink mt-5">Đơn hàng đã huỷ</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-app-ink-soft">
              {isKitPayment
                ? `Đơn kit đã huỷ, không nhận được chuyển khoản. Nếu bạn đã chuyển khoản, liên hệ ${getSupportEmail()} để đội hỗ trợ kiểm tra.`
                : `Đơn hàng đã huỷ, không nhận được chuyển khoản. Nếu bạn đã chuyển khoản, liên hệ ${getSupportEmail()} để đội hỗ trợ kiểm tra.`}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button type="button" asChild className="bg-app-accent text-white hover:bg-app-accent">
                <a href={createSupportMailto(paymentOrder.orderId, isKitPayment)}>
                  <Mail className="h-4 w-4" />
                  Liên hệ hỗ trợ
                </a>
              </Button>
              <Button type="button" variant="outline" asChild className="border-app-line text-app-ink hover:bg-app-bg">
                <Link to="/billing/faq">Xem FAQ thanh toán</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-app-line text-app-ink hover:bg-app-bg"
              >
                <RefreshCw className="h-4 w-4" />
                Tải lại trang
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
          <div className="overflow-hidden surface-raised rounded-card border border-app-line bg-app-surface">
            <div className="border-b border-app-line p-5 text-center sm:p-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                <QrCode className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-2xl font-medium text-app-ink">Quét QR để chuyển khoản</h2>
              <p className="mt-1 text-sm text-app-ink-muted">
                Giữ nguyên số tiền và nội dung. Hệ thống thường xác nhận trong 1-2 phút.
              </p>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-lg border border-app-line bg-app-bg p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Mã đơn hàng</p>
                <p className="mt-2 select-all break-all font-serif text-3xl font-medium text-app-ink">
                  {paymentOrder.orderId}
                </p>
              </div>

              <div className="rounded-lg border border-app-line bg-app-bg p-4">
                {isHostedPayosCheckout ? (
                  <div className="mx-auto flex aspect-square w-full max-w-[360px] flex-col items-center justify-center rounded-lg bg-app-surface p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                      <QrCode className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-app-ink">Mở cổng PayOS để quét QR</p>
                    <p className="mt-2 text-xs leading-5 text-app-ink-muted">
                      PayOS sẽ hiển thị mã QR hợp lệ và xác nhận giao dịch trên cổng thanh toán.
                    </p>
                    <Button
                      type="button"
                      className="mt-4 bg-app-accent text-white hover:bg-app-accent"
                      onClick={openHostedCheckout}
                    >
                      <QrCode className="h-4 w-4" />
                      Mở cổng PayOS
                    </Button>
                  </div>
                ) : shouldRenderQrImage ? (
                  <img
                    src={paymentOrder.qrDataUrl}
                    alt={`QR chuyển khoản đơn ${paymentOrder.orderId}`}
                    className="mx-auto aspect-square w-full max-w-[360px] rounded-lg bg-app-surface p-3"
                    onError={() => setFailedQrImageSrc(paymentOrder.qrDataUrl)}
                  />
                ) : (
                  <div className="mx-auto flex aspect-square w-full max-w-[360px] flex-col items-center justify-center rounded-lg bg-app-surface p-6 text-center text-app-ink-muted">
                    <QrCode className="h-16 w-16" />
                    <p className="mt-3 text-sm font-medium text-app-ink">QR chưa khả dụng</p>
                    <p className="mt-1 text-xs leading-5">
                      Vui lòng dùng đúng số tiền và nội dung chuyển khoản ở cột bên phải.
                    </p>
                    {hasHostedCheckout && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4 border-app-line text-app-ink hover:bg-app-bg"
                        onClick={openHostedCheckout}
                      >
                        <QrCode className="h-4 w-4" />
                        Mở cổng thanh toán
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center" role="status" aria-live="polite">
                <div className="inline-flex items-center gap-2 rounded-full bg-app-warm-soft px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-app-warm" />
                  <span className="text-sm font-semibold text-app-ink">Đang chờ xác nhận chuyển khoản</span>
                </div>
                <p className="mt-2 text-sm font-medium text-app-ink-muted">
                  Đơn hàng sẽ huỷ trong {formatCountdown(paymentTimeLeftMs)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="surface-raised rounded-card border border-app-line bg-app-surface p-6">
              <h3 className="mb-1 text-lg font-semibold text-app-ink">Thông tin chuyển khoản</h3>
              <p className="text-sm text-app-ink-muted">
                Nhấn nút sao chép từng dòng để tránh nhập sai. Nội dung chuyển khoản là phần quan trọng nhất.
              </p>
              <div className="mt-4 space-y-3">
                <PaymentInfoRow
                  label="Số tiền"
                  value={`${formatVndAmount(paymentOrder.amount)} ${paymentOrder.currency}`}
                  copyValue={String(paymentOrder.amount)}
                  copyKey="amount"
                  copiedKey={copiedPaymentField}
                  onCopy={copyPaymentValue}
                  highlight
                />
                <PaymentInfoRow
                  label="Ngân hàng nhận"
                  value={paymentOrder.bankName}
                  copyValue={paymentOrder.bankName}
                  copyKey="bank"
                  copiedKey={copiedPaymentField}
                  onCopy={copyPaymentValue}
                />
                <PaymentInfoRow
                  label="STK ngân hàng nhận"
                  value={paymentOrder.bankAccount}
                  copyValue={paymentOrder.bankAccount}
                  copyKey="account"
                  copiedKey={copiedPaymentField}
                  onCopy={copyPaymentValue}
                  highlight
                />
                <PaymentInfoRow
                  label="Chủ tài khoản"
                  value={paymentOrder.accountName}
                  copyValue={paymentOrder.accountName}
                  copyKey="name"
                  copiedKey={copiedPaymentField}
                  onCopy={copyPaymentValue}
                />
                <PaymentInfoRow
                  label="Nội dung chuyển khoản"
                  value={transferDescription}
                  copyValue={transferDescription}
                  copyKey="description"
                  copiedKey={copiedPaymentField}
                  onCopy={copyPaymentValue}
                  highlight
                />
              </div>
            </div>

            {paymentError && (
              <div className="rounded-lg border border-app-status-error/20 bg-app-status-error/8 p-3 text-sm text-app-status-error">
                {paymentError}
              </div>
            )}

            <div className="rounded-card border border-app-line bg-app-bg p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-app-ink">
                  {paymentOrder.purpose === "physical_order"
                    ? "Cần biết cách xác nhận thanh toán đơn kit hoặc xử lý chuyển khoản sai?"
                    : "Cần biết cách xác nhận thanh toán, nhận Plus hoặc xử lý chuyển khoản sai?"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="border-app-line text-app-ink hover:bg-app-bg"
                >
                  <Link to="/billing/faq">Xem FAQ thanh toán</Link>
                </Button>
              </div>
            </div>

            {showTransferConfirmButton && (
              <div className="rounded-card border border-app-line bg-app-accent-soft p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-app-ink">
                    Đã chuyển khoản? Bấm để đội hỗ trợ thấy bạn đã xác nhận khi cần kiểm tra.
                  </p>
                  <Button
                    type="button"
                    onClick={handleUserConfirmedTransfer}
                    disabled={confirmingTransfer}
                    className="bg-app-accent text-white hover:bg-app-accent"
                  >
                    {confirmingTransfer ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Tôi đã chuyển khoản xong
                  </Button>
                </div>
              </div>
            )}

            {transferConfirmedByUser && (
              <div className="rounded-lg border border-app-line bg-app-accent-soft p-4 text-sm font-medium leading-6 text-app-accent">
                Cảm ơn bạn! Chúng tôi đang xác nhận giao dịch (thường 1-2 phút).
              </div>
            )}

            {showSlowPaymentHelp && (
              <div className="rounded-card border border-app-line bg-app-warm-soft p-6">
                <h3 className="font-serif text-base font-medium text-app-ink">Quá lâu chưa thấy phản hồi?</h3>
                <p className="mt-1 text-sm text-app-ink-muted">
                  {paymentOrder.purpose === "physical_order"
                    ? "Ngân hàng đôi khi chậm 3-5 phút. Nếu bạn đã chuyển và quá 10 phút trạng thái chưa được cập nhật:"
                    : "Ngân hàng đôi khi chậm 3-5 phút. Nếu bạn đã chuyển và quá 10 phút chưa nhận quyền:"}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    asChild
                    variant="outline"
                    className="border-app-line text-app-ink hover:bg-app-bg"
                  >
                    <a href={createSupportMailto(paymentOrder.orderId, paymentOrder.purpose === "physical_order")}>
                      <Mail className="h-4 w-4" />
                      Liên hệ hỗ trợ
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="border-app-line text-app-ink hover:bg-app-bg"
                  >
                    <Link to="/billing/faq">Xem FAQ thanh toán</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="border-app-line text-app-ink hover:bg-app-bg"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tải lại trang
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="stack-section pb-12">
        <div className="surface-empty rounded-card-lg border border-dashed border-app-line bg-app-bg/50 p-8 text-center lg:p-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-app-bg text-app-ink">
            <ClipboardList className="h-10 w-10 text-app-accent" />
          </div>
          <h1 className="font-serif text-3xl font-medium text-app-ink mt-6">
            Chưa có đơn nào trong không gian làm việc của bạn
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-base text-app-ink-muted">
            Hiện chưa tìm thấy đơn theo mã đang mở. Bạn có thể tạo đơn mới hoặc quay lại luồng mục tiêu để chọn hướng đi
            tiếp theo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("/order")} className="bg-app-accent text-white hover:bg-app-accent">
              <Package className="h-4 w-4" />
              Tạo đơn kit
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/goals")}
              className="border-app-line text-app-ink hover:bg-app-bg"
            >
              Quay lại luồng mục tiêu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = backendRawStatus === "cancelled";
  const shouldShowPaymentCta = order.status === "pending" && !isCancelled;
  const visualTimelineStep = getOrderStatusStepIndex(order.status);
  const nextStatus = isBackendBacked ? null : getNextOrderStatus(order.status);
  const hasGoalLink = Boolean(order.goalId || (order.goalTitle.trim() && order.goalTitle !== UNLINKED_GOAL_TITLE));
  const hasKeywords = order.keywords.length > 0;
  const hasNote = order.note.trim().length > 0;
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

  return (
    <div className="stack-section mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <PageHero
        className="page-enter"
        eyebrow="THEO DÕI ĐƠN HÀNG"
        title="Theo dõi trạng thái đơn kit hiện tại"
        description={
          hasGoalLink
            ? `Đơn này đang bám theo mục tiêu "${order.goalTitle}" trong nhóm ${order.focusArea}.`
            : "Đơn này chưa gắn với mục tiêu cụ thể, nhưng vẫn có thể theo dõi đầy đủ như một kit độc lập."
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="stack-section">
          <Card className="border-0 shadow-app-lg">
            <CardHeader>
              <CardTitle>Chi tiết đơn</CardTitle>
              <CardDescription>
                Những thông tin chính của đơn, người nhận và kit được gom lại để dễ quét nhanh.
              </CardDescription>
            </CardHeader>

            <CardContent className="stack-section">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Mục tiêu & kit
                </p>
                <p className="text-sm text-muted-foreground">
                  Giữ phần định hướng và cấu hình kit ở cùng một cụm để quét nhanh hơn.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-card border border-app-line bg-app-bg-subtle p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-app-accent" />
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

                <div className="rounded-card border border-app-line bg-app-bg-subtle p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    Chi tiết đơn
                  </div>
                  {order.lines && order.lines.length > 0 ? (
                    <ul className="mt-[var(--space-inline)] space-y-2 text-sm">
                      {order.lines.map((line) => (
                        <li key={`${line.itemId}-${line.qty}`} className="flex items-start justify-between gap-2">
                          <span className="text-app-ink">
                            {line.label}
                            {line.qty > 1 ? ` × ${line.qty}` : ""}
                          </span>
                          <span className="shrink-0 tabular-nums text-app-ink-soft">
                            {formatVnd(line.lineTotalVnd)}
                          </span>
                        </li>
                      ))}
                      {INCLUDED_DOCS.map((doc) => (
                        <li key={doc.id} className="flex items-start justify-between gap-2 text-muted-foreground">
                          <span>{doc.label}</span>
                          <span className="shrink-0">Tặng kèm — 0đ</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-[var(--space-inline)] text-sm leading-7 text-app-ink-soft">
                      Đơn này được tạo từ phiên bản trước. Vui lòng liên hệ shop để xác nhận chi tiết.
                    </p>
                  )}
                  {typeof order.totalVnd === "number" && order.totalVnd > 0 && (
                    <div className="mt-3 flex items-center justify-between border-t border-app-line pt-3 text-sm font-semibold">
                      <span>Tổng đơn</span>
                      <span className="tabular-nums">{formatVnd(order.totalVnd)}</span>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-app-ink-muted">
                    {hasKeywords
                      ? `${order.keywords.length} từ khóa đã được lưu cùng đơn này.`
                      : "Chưa có từ khóa cụ thể cho kit."}
                  </p>
                </div>
              </div>

              {(!order.lines || order.lines.length === 0) && (
                <div className="rounded border border-app-status-warning/40 bg-app-status-warning/10 px-3 py-2 text-xs text-app-ink">
                  Đơn này được tạo từ phiên bản trước. Vui lòng liên hệ shop để xác nhận chi tiết và giá.
                </div>
              )}

              <div className="space-y-1 border-t border-app-line pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                  Người nhận & giao hàng
                </p>
                <p className="text-sm text-app-ink-soft">
                  Thông tin liên hệ và địa chỉ được tách riêng để hạn chế phải dò lại trong card.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-card border border-app-line bg-app-surface p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                    <Mail className="h-3.5 w-3.5" />
                    Người nhận
                  </div>
                  <p className="mt-[var(--space-inline)] text-sm font-semibold text-app-ink">{order.fullName}</p>
                  <p className="mt-1 text-sm text-app-ink-soft">{order.email}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-app-ink-soft">
                    <Phone className="h-3.5 w-3.5" />
                    {order.phone || "Chưa bổ sung số điện thoại"}
                  </div>
                </div>

                <div className="rounded-card border border-app-line bg-app-surface p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    Địa chỉ giao
                  </div>
                  <p className="mt-[var(--space-inline)] text-sm leading-7 text-app-ink-soft">
                    {order.shippingAddress}
                  </p>
                </div>
              </div>

              {(hasKeywords || hasNote) && (
                <div className="stack-stack border-t border-app-line pt-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                      Từ khóa & ghi chú
                    </p>
                    <p className="text-sm text-app-ink-soft">
                      Những thông tin tinh chỉnh cho kit được gom riêng để đỡ lẫn với thông tin giao hàng.
                    </p>
                  </div>

                  <div className="rounded-card border border-app-line bg-app-bg-subtle p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                      <Package className="h-3.5 w-3.5" />
                      Ghi chú cho kit
                    </div>

                    {hasKeywords && (
                      <div className="mt-[var(--space-inline)] flex flex-wrap gap-2">
                        {order.keywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="outline"
                            className="border-app-line bg-app-surface text-app-ink-soft"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {hasNote && (
                      <p className="mt-[var(--space-inline)] text-sm leading-7 text-app-ink-soft">{order.note}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-app-lg">
            <CardHeader>
              <CardTitle>Tiến trình đơn</CardTitle>
              <CardDescription>
                Dòng thời gian nhỏ cho luồng đơn hiện tại, gồm đủ 4 bước từ chờ xác nhận đến đã giao.
              </CardDescription>
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
                    className={`flex items-start gap-4 rounded-card border px-4 py-4 ${
                      isActive
                        ? "border-app-status-success/40 bg-app-status-success/10"
                        : "border-app-line bg-app-surface"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tile)] ${
                        isActive ? "bg-app-status-success text-white" : "bg-app-bg-subtle text-app-ink-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${isActive ? "text-app-ink" : "text-app-ink-soft"}`}>
                          {getOrderStatusLabel(step.status)}
                        </p>
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="border-app-status-success/40 bg-app-surface text-app-status-success"
                          >
                            Trạng thái hiện tại
                          </Badge>
                        )}
                        {!isCurrent && isCompleted && (
                          <Badge
                            variant="outline"
                            className="border-app-status-success/40 bg-app-surface text-app-status-success"
                          >
                            Đã hoàn thành
                          </Badge>
                        )}
                      </div>
                      <p className={`mt-1 text-sm leading-7 ${isActive ? "text-app-ink-soft" : "text-app-ink-muted"}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}

              {isCancelled && (
                <div className="rounded-card border border-app-status-error/30 bg-app-status-error/10 p-4">
                  <p className="text-sm font-semibold text-app-status-error">Đơn này đã bị huỷ.</p>
                  <p className="mt-1 text-sm leading-7 text-app-ink-soft">
                    Bạn có thể tạo đơn mới nếu vẫn muốn đặt kit.
                  </p>
                </div>
              )}

              {demoMode && !isBackendBacked && !isCancelled && (
                <div className="stack-stack border-t border-app-line pt-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                      Điều khiển trạng thái
                    </p>
                    <p className="text-sm text-app-ink-soft">Phần này chỉ xuất hiện khi đơn chưa kết nối máy chủ.</p>
                  </div>

                  <div className="rounded-card border border-app-line bg-app-bg-subtle p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                          Cập nhật trạng thái
                        </p>
                        <p className="mt-2 text-sm leading-7 text-app-ink-soft">
                          Dùng để cập nhật đơn lưu trên thiết bị khi chưa có dữ liệu từ máy chủ.
                        </p>
                      </div>
                      <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
                        Trên thiết bị
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      {nextStatus ? (
                        <>
                          <p className="text-sm text-app-ink-soft">
                            Bước tiếp theo:{" "}
                            <span className="font-medium text-app-ink">{getOrderStatusLabel(nextStatus)}</span>
                          </p>
                          <Button type="button" size="sm" variant="outline" onClick={handleAdvanceStatus}>
                            Chuyển sang bước tiếp theo
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-app-ink-soft">Đơn đã ở bước cuối cùng trên thiết bị này.</p>
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
          {shouldShowPaymentCta ? (
            <KitPaymentCta
              order={order}
              user={user}
              demoMode={demoMode}
              navigate={navigate}
            />
          ) : null}

          <Card className="border-0 shadow-app-lg">
            <CardHeader>
              <CardTitle>Đơn gần đây</CardTitle>
              <CardDescription>Giữ luồng đơn gọn và cho phép mở nhanh lại các đơn vừa tạo.</CardDescription>
            </CardHeader>

            <CardContent className="stack-tight">
              {recentOrders.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-card border px-4 py-4 text-left transition-colors ${
                    item.id === order.id
                      ? "border-app-status-info/40 bg-app-status-info/10"
                      : "border-app-line bg-app-surface hover:bg-app-bg-subtle"
                  }`}
                  onClick={() => navigate(`/order-status/${item.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-app-ink">{item.goalTitle}</p>
                      <p className="mt-1 text-xs text-app-ink-muted">
                        {getOrderStatusLabel(item.status)}
                        {typeof item.totalVnd === "number" && item.totalVnd > 0 ? ` · ${formatVnd(item.totalVnd)}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-app-ink-muted">
                        {formatCalendarDate(item.createdAt, "vi-VN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {item.id === order.id && (
                      <Badge
                        variant="outline"
                        className="border-app-status-info/40 bg-app-surface text-app-status-info"
                      >
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

function KitPaymentCta({
  order,
  user,
  demoMode,
  navigate,
}: {
  order: LocalOrder;
  user: { uid: string; email?: string | null; emailVerified?: boolean } | null;
  demoMode: boolean;
  navigate: (path: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const backendOrderId = getBackendOrderId(order.id);

  const handleCreatePayment = useCallback(async () => {
    if (!backendOrderId || creating) return;
    setCreating(true);
    setPaymentError(null);
    try {
      const session: KitPaymentSessionResponse = await createKitPaymentSession(backendOrderId);
      navigate(`/order-status/${session.paymentOrderId}`);
    } catch (error: unknown) {
      if (toastBillingNetworkError(error, { surface: "OrderStatusPage", action: "create_kit_payment", orderId: backendOrderId })) {
        setPaymentError("Mạng có vấn đề, vui lòng thử lại");
      } else {
        logBillingUiError(error, { surface: "OrderStatusPage", action: "create_kit_payment", orderId: backendOrderId });
        setPaymentError(error instanceof Error ? error.message : "Không tạo được phiên thanh toán.");
      }
    } finally {
      setCreating(false);
    }
  }, [backendOrderId, creating, navigate]);

  const canPayOnline = Boolean(user && backendOrderId);
  const showLocalOnly = demoMode || (!user || !backendOrderId);

  return (
    <Card className="border border-app-accent/20 bg-app-accent-soft/40 shadow-app-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4 text-app-accent" />
          Thanh toán đơn kit
        </CardTitle>
        <CardDescription>
          Hoàn tất thanh toán để đội Dear Our Future xác nhận và chuẩn bị kit của bạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {typeof order.totalVnd === "number" && order.totalVnd > 0 ? (
          <div className="flex items-center justify-between rounded-lg border border-app-line bg-app-surface px-3 py-2 text-sm">
            <span className="text-app-ink-soft">Tổng đơn</span>
            <span className="font-semibold tabular-nums text-app-accent">{formatVnd(order.totalVnd)}</span>
          </div>
        ) : null}

        {showLocalOnly ? (
          <div className="rounded-lg border border-app-warm-border/30 bg-app-warm-soft p-3 text-sm text-app-warm-strong">
            {!user
              ? "Đăng nhập để tạo QR thanh toán trực tuyến cho đơn kit."
              : "Đơn kit đang đồng bộ lên máy chủ. QR thanh toán trực tuyến sẽ khả dụng sau khi đồng bộ hoàn tất."}
          </div>
        ) : (
          <Button
            type="button"
            className="w-full bg-app-accent text-white hover:bg-app-accent"
            onClick={handleCreatePayment}
            disabled={creating || !canPayOnline}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
            {creating ? "Đang tạo QR..." : "Thanh toán ngay / Xem mã QR"}
          </Button>
        )}

        {paymentError && (
          <div className="rounded-lg border border-app-status-error/20 bg-app-status-error/8 p-3 text-sm text-app-status-error">
            {paymentError}
          </div>
        )}
      </CardContent>
    </Card>
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
    <div
      className={`rounded-lg border p-4 ${highlight ? "border-app-warm-border/30 bg-app-warm-soft" : "border-app-line bg-app-bg"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">{label}</p>
          <p
            className={`mt-2 select-all break-all font-semibold ${highlight ? "text-lg text-app-warm-strong" : "text-base text-app-ink"}`}
          >
            {value}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onCopy(copyValue, copyKey)}
          aria-label={`Sao chép ${label}`}
          className="border-app-line text-app-ink-muted hover:bg-app-bg"
        >
          {copied ? <CheckCircle2 className="h-4 w-4 text-app-accent" /> : <Copy className="h-4 w-4" />}
          {copied ? "Đã copy" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
