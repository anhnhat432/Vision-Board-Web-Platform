import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Mail,
  MapPin,
  Package,
  Phone,
  Target,
  Truck,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";

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
import { useAuthContext } from "@/lib/auth/AuthContext";
import { getOrder as getBackendOrder, type ApiOrder } from "@/services/orderService";
import { getBackendOrderId } from "@/lib/api/orderLinkStore";

const UNLINKED_GOAL_TITLE = "Chưa gắn mục tiêu cụ thể";
const DEFAULT_FOCUS_AREA = "Chưa chọn trọng tâm";

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
    description: "Đơn đã được ghi nhận trong local workspace và chờ xác nhận.",
    icon: ClipboardList,
  },
  {
    status: "printing",
    description: "Kit đang được chuẩn bị nội dung và xử lý ở bước in của flow demo.",
    icon: Package,
  },
  {
    status: "shipping",
    description: "Kit đã sẵn sàng đi giao trong local order flow hiện tại.",
    icon: Truck,
  },
  {
    status: "delivered",
    description: "Đơn đã được đánh dấu giao thành công trong flow demo cục bộ.",
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

  useEffect(() => {
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
  }, [params.orderId, user]);

  if (!order) {
    return (
      <div className="space-y-8 pb-12">
        <Card className="overflow-hidden border-0 gradient-slate shadow-[0_28px_70px_-38px_rgba(15,23,42,0.18)]">
          <CardContent className="p-10 text-center lg:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <ClipboardList className="h-10 w-10" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">Chưa có đơn nào trong workspace của bạn</h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
              Hiện chưa tìm thấy đơn theo mã đang mở. Bạn có thể tạo đơn mới hoặc quay lại flow mục tiêu để chọn hướng đi tiếp theo.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate("/order")}>
                <Package className="h-4 w-4" />
                Tạo đơn kit
              </Button>
              <Button variant="outline" onClick={() => navigate("/goals")}>
                Quay lại flow mục tiêu
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
    <div className="space-y-8 pb-12">
      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="relative p-5 sm:p-6 lg:p-8">
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Truck className="h-4 w-4" />
                Theo dõi đơn hàng
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  Theo dõi trạng thái đơn kit hiện tại.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-white/82 lg:text-lg">
                  Trang này gom lại thông tin chính của đơn, kit và tiến trình giao hiện tại. Flow vẫn là local-only, nhưng đã đủ rõ để demo và review trải nghiệm đặt đơn.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  {getOrderStatusLabel(order.status)}
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  {getKitTypeLabel(order.kitType)}
                </Badge>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-white/70">
                {hasGoalLink
                  ? `Đơn này đang bám theo mục tiêu "${order.goalTitle}" trong nhóm ${order.focusArea}.`
                  : "Đơn này chưa gắn với mục tiêu cụ thể, nhưng vẫn có thể theo dõi đầy đủ như một kit độc lập."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/14 bg-white/12 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Tóm tắt đơn</p>
              <div className="mt-4 grid gap-2.5">
                {summaryItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-black/12 px-4 py-3.5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </div>
                      <p className="mt-2 text-base font-semibold text-white">{item.value}</p>
                      <p className="mt-1 text-xs leading-6 text-white/64">{item.note}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="border-0 shadow-[0_24px_55px_-34px_rgba(15,23,42,0.18)]">
            <CardHeader>
              <CardTitle>Chi tiết đơn</CardTitle>
              <CardDescription>Những thông tin chính của đơn, người nhận và kit được gom lại để dễ quét nhanh.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Mục tiêu & kit</p>
                <p className="text-sm text-slate-600">Giữ phần định hướng và cấu hình kit ở cùng một cụm để quét nhanh hơn.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <Target className="h-3.5 w-3.5" />
                    Mục tiêu đang gắn
                  </div>
                  <p className="mt-3 text-base font-semibold text-slate-900">
                    {hasGoalLink ? order.goalTitle : "Đơn này chưa gắn mục tiêu"}
                  </p>
                  <p className="mt-1 text-sm leading-7 text-slate-600">
                    {hasGoalLink
                      ? `Kit đang bám theo nhóm ${order.focusArea}.`
                      : "Bạn vẫn có thể theo dõi đơn như một kit độc lập trong flow hiện tại."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <Package className="h-3.5 w-3.5" />
                    Cấu hình kit
                  </div>
                  <p className="mt-3 text-base font-semibold text-slate-900">{getKitTypeLabel(order.kitType)}</p>
                  <p className="mt-1 text-sm leading-7 text-slate-600">
                    {hasKeywords ? `${order.keywords.length} keyword đã được lưu cùng đơn này.` : "Chưa có keyword cụ thể cho kit."}
                  </p>
                </div>
              </div>

              <div className="space-y-1 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Người nhận & giao hàng</p>
                <p className="text-sm text-slate-600">Thông tin liên hệ và địa chỉ được tách riêng để hạn chế phải dò lại trong card.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    Người nhận
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{order.fullName}</p>
                  <p className="mt-1 text-sm text-slate-600">{order.email}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-3.5 w-3.5" />
                    {order.phone || "Chưa bổ sung số điện thoại"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    Địa chỉ giao
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{order.shippingAddress}</p>
                </div>
              </div>

              {(hasKeywords || hasNote) && (
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Keyword & ghi chú</p>
                    <p className="text-sm text-slate-600">Những thông tin tinh chỉnh cho kit được gom riêng để đỡ lẫn với thông tin giao hàng.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Package className="h-3.5 w-3.5" />
                      Ghi chú cho kit
                    </div>

                    {hasKeywords && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="border-slate-200 bg-white text-slate-700">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {hasNote && <p className="mt-3 text-sm leading-7 text-slate-600">{order.note}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-[0_24px_55px_-34px_rgba(15,23,42,0.18)]">
            <CardHeader>
              <CardTitle>Tiến trình đơn</CardTitle>
              <CardDescription>Timeline nhỏ cho local order flow hiện tại, bao gồm đầy đủ 4 bước từ chờ xác nhận đến đã giao.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {ORDER_TIMELINE_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < visualTimelineStep;
                const isCurrent = index === visualTimelineStep;
                const isActive = index <= visualTimelineStep;

                return (
                  <div
                    key={step.status}
                    className={`flex items-start gap-4 rounded-2xl border px-4 py-4 ${
                      isActive ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
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
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
                  <p className="text-sm font-semibold text-rose-800">Đơn này đã bị huỷ.</p>
                  <p className="mt-1 text-sm leading-7 text-rose-700/80">
                    Bạn có thể tạo đơn mới nếu vẫn muốn đặt kit.
                  </p>
                </div>
              )}

              {demoMode && !isBackendBacked && !isCancelled && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Điều khiển trạng thái</p>
                  <p className="text-sm text-slate-600">Phần này chỉ xuất hiện khi đơn chưa gắn backend.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cập nhật trạng thái</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Dùng để cập nhật đơn lưu trên thiết bị khi chưa có dữ liệu từ backend.
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
                        <p className="text-sm text-slate-600">Đơn đã ở bước cuối cùng của flow demo.</p>
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

        <div className="space-y-6">
          <Card className="border-0 shadow-[0_24px_55px_-34px_rgba(15,23,42,0.18)]">
            <CardHeader>
              <CardTitle>Đơn gần đây</CardTitle>
              <CardDescription>Giữ local order flow gọn và cho phép mở nhanh lại các đơn vừa tạo.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {recentOrders.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
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
