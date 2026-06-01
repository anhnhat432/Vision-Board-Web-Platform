import {
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
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { INCLUDED_DOCS } from "@/features/order/catalog/included";
import { formatVnd } from "@/features/order/lib/pricing";
import { apiClient } from "@/lib/api/apiClient";
import { getBackendOrderId } from "@/lib/api/orderLinkStore";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { type ApiOrder, getOrder as getBackendOrder } from "@/services/orderService";
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
  const body = encodeURIComponent(
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
          <div className="rounded-card border border-app-line bg-[color:var(--color-danger-bg)] p-8 text-center">
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
      return (
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-card border border-app-accent-soft bg-app-accent-soft p-8 text-center">
            <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-app-accent text-white">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="font-serif text-2xl font-medium text-app-ink mt-5">Plus đã kích hoạt!</h1>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">
              Đang chuyển bạn về trang gói để tiếp tục sử dụng Plus.
            </p>
          </div>
        </div>
      );
    }

    if (paymentTimedOut || paymentOrder.status === "failed") {
      return (
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-card border border-app-line bg-app-warm-soft p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-app-warm text-white">
              <Clock className="h-8 w-8" />
            </div>
            <h1 className="font-serif text-2xl font-medium text-app-ink mt-5">Đơn hàng đã huỷ</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-app-ink-soft">
              Đơn hàng đã huỷ, không nhận được chuyển khoản. Nếu bạn đã chuyển khoản, liên hệ {getSupportEmail()} để đội
              hỗ trợ kiểm tra.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button type="button" asChild className="bg-app-accent text-white hover:bg-app-accent">
                <a href={createSupportMailto(paymentOrder.orderId)}>
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
          <div className="overflow-hidden surface-raised rounded-xl border border-app-line bg-app-surface">
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
                {paymentOrder.qrDataUrl ? (
                  <img
                    src={paymentOrder.qrDataUrl}
                    alt={`QR chuyển khoản đơn ${paymentOrder.orderId}`}
                    className="mx-auto aspect-square w-full max-w-[360px] rounded-lg bg-app-surface p-3"
                  />
                ) : (
                  <div className="mx-auto flex aspect-square w-full max-w-[360px] items-center justify-center rounded-lg bg-app-surface text-app-ink-muted">
                    <QrCode className="h-16 w-16" />
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
            <div className="surface-raised rounded-xl border border-app-line bg-app-surface p-6">
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
              <div className="rounded-lg border border-app-line bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-fg)]">
                {paymentError}
              </div>
            )}

            <div className="rounded-card border border-app-line bg-app-bg p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-app-ink">
                  Cần biết cách xác nhận thanh toán, nhận Plus hoặc xử lý chuyển khoản sai?
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
                  Ngân hàng đôi khi chậm 3-5 phút. Nếu bạn đã chuyển và quá 10 phút chưa nhận quyền:
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    asChild
                    variant="outline"
                    className="border-app-line text-app-ink hover:bg-app-bg"
                  >
                    <a href={createSupportMailto(paymentOrder.orderId)}>
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
        <div className="surface-empty rounded-2xl border border-dashed border-app-line bg-app-bg/50 p-8 text-center lg:p-12">
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
          <Card className="border-0 shadow-lg">
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
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
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

                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    Chi tiết đơn
                  </div>
                  {order.lines && order.lines.length > 0 ? (
                    <ul className="mt-[var(--space-inline)] space-y-2 text-sm">
                      {order.lines.map((line) => (
                        <li key={`${line.itemId}-${line.qty}`} className="flex items-start justify-between gap-2">
                          <span className="text-slate-900">
                            {line.label}
                            {line.qty > 1 ? ` × ${line.qty}` : ""}
                          </span>
                          <span className="shrink-0 tabular-nums text-slate-700">{formatVnd(line.lineTotalVnd)}</span>
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
                    <p className="mt-[var(--space-inline)] text-sm leading-7 text-slate-600">
                      Đơn này được tạo từ phiên bản trước. Vui lòng liên hệ shop để xác nhận chi tiết.
                    </p>
                  )}
                  {typeof order.totalVnd === "number" && order.totalVnd > 0 && (
                    <div className="mt-3 flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-sm font-semibold">
                      <span>Tổng đơn</span>
                      <span className="tabular-nums">{formatVnd(order.totalVnd)}</span>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {hasKeywords
                      ? `${order.keywords.length} từ khóa đã được lưu cùng đơn này.`
                      : "Chưa có từ khóa cụ thể cho kit."}
                  </p>
                </div>
              </div>

              {(!order.lines || order.lines.length === 0) && (
                <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Đơn này được tạo từ phiên bản trước. Vui lòng liên hệ shop để xác nhận chi tiết và giá.
                </div>
              )}

              <div className="space-y-1 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Người nhận & giao hàng
                </p>
                <p className="text-sm text-slate-600">
                  Thông tin liên hệ và địa chỉ được tách riêng để hạn chế phải dò lại trong card.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-app-surface p-4">
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

                <div className="rounded-xl border border-slate-200 bg-app-surface p-4">
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
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Từ khóa & ghi chú
                    </p>
                    <p className="text-sm text-slate-600">
                      Những thông tin tinh chỉnh cho kit được gom riêng để đỡ lẫn với thông tin giao hàng.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Package className="h-3.5 w-3.5" />
                      Ghi chú cho kit
                    </div>

                    {hasKeywords && (
                      <div className="mt-[var(--space-inline)] flex flex-wrap gap-2">
                        {order.keywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="outline"
                            className="border-slate-200 bg-app-surface text-slate-700"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {hasNote && (
                      <p className="mt-[var(--space-inline)] text-sm leading-7 text-slate-600">{order.note}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
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
                    className={`flex items-start gap-4 rounded-xl border px-4 py-4 ${
                      isActive ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-app-surface"
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
                          <Badge variant="outline" className="border-emerald-200 bg-app-surface text-emerald-800">
                            Trạng thái hiện tại
                          </Badge>
                        )}
                        {!isCurrent && isCompleted && (
                          <Badge variant="outline" className="border-emerald-200 bg-app-surface text-emerald-800">
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
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
                  <p className="text-sm font-semibold text-rose-800">Đơn này đã bị huỷ.</p>
                  <p className="mt-1 text-sm leading-7 text-rose-700/80">
                    Bạn có thể tạo đơn mới nếu vẫn muốn đặt kit.
                  </p>
                </div>
              )}

              {demoMode && !isBackendBacked && !isCancelled && (
                <div className="stack-stack border-t border-slate-100 pt-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Điều khiển trạng thái
                    </p>
                    <p className="text-sm text-slate-600">Phần này chỉ xuất hiện khi đơn chưa kết nối máy chủ.</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Cập nhật trạng thái
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          Dùng để cập nhật đơn lưu trên thiết bị khi chưa có dữ liệu từ máy chủ.
                        </p>
                      </div>
                      <Badge variant="outline" className="border-slate-200 bg-app-surface text-slate-700">
                        Trên thiết bị
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      {nextStatus ? (
                        <>
                          <p className="text-sm text-slate-600">
                            Bước tiếp theo:{" "}
                            <span className="font-medium text-slate-900">{getOrderStatusLabel(nextStatus)}</span>
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
                  className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${
                    item.id === order.id
                      ? "border-sky-200 bg-sky-50"
                      : "border-slate-200 bg-app-surface hover:bg-slate-50"
                  }`}
                  onClick={() => navigate(`/order-status/${item.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.goalTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getOrderStatusLabel(item.status)}
                        {typeof item.totalVnd === "number" && item.totalVnd > 0 ? ` · ${formatVnd(item.totalVnd)}` : ""}
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
                      <Badge variant="outline" className="border-sky-200 bg-app-surface text-sky-700">
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
    <div
      className={`rounded-lg border p-4 ${highlight ? "border-app-line bg-app-warm-soft" : "border-app-line bg-app-bg"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">{label}</p>
          <p
            className={`mt-2 select-all break-all font-semibold ${highlight ? "text-lg text-app-warm" : "text-base text-app-ink"}`}
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
