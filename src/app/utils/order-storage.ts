// DEPRECATED: re-export từ features/order/storage. Code mới nên dùng @/features/order/storage/order.

export type {
  CreateLocalOrderInput,
  LocalOrderDiscount,
  LocalOrderV2,
  OrderLine,
  OrderStatus,
} from "@/features/order/storage/order";
export {
  createLocalOrder,
  getLatestOrder,
  getOrderById,
  getOrders,
  ORDER_SCHEMA_VERSION,
  ORDER_STORAGE_KEY,
} from "@/features/order/storage/order";

import { type LocalOrderV2, ORDER_STORAGE_KEY, type OrderStatus } from "@/features/order/storage/order";

// Legacy compat: OrderStatusPage cũ build LocalOrder shape lai V1+V2. Phase 3 sẽ migrate sạch.
export type LocalOrder = Omit<LocalOrderV2, "schemaVersion" | "lines" | "subtotalVnd" | "shippingVnd" | "totalVnd"> &
  Partial<Pick<LocalOrderV2, "schemaVersion" | "lines" | "subtotalVnd" | "shippingVnd" | "totalVnd">> & {
    focusArea?: string;
    kitType?: string;
  };

// Legacy stubs — không dùng nữa nhưng giữ để build không vỡ ở consumer cũ.
// Sẽ xoá khi tất cả consumer đã migrate.
export type OrderKitType = string;
export function getKitTypeLabel(_kitType: string | undefined): string {
  return "Kit Vision Board";
}

const ORDER_STATUS_FLOW: OrderStatus[] = ["pending", "printing", "shipping", "delivered"];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function updateOrderStatus(orderId: string, status: OrderStatus): LocalOrder | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const idx = parsed.findIndex(
    (o): o is { id: string } => typeof o === "object" && o !== null && (o as { id?: unknown }).id === orderId,
  );
  if (idx === -1) return null;
  const updated = {
    ...(parsed[idx] as Record<string, unknown>),
    status,
    updatedAt: new Date().toISOString(),
  };
  parsed[idx] = updated;
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(parsed));
  return updated as LocalOrder;
}

export function getNextOrderStatus(status: OrderStatus): OrderStatus | null {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);
  if (currentIndex === -1 || currentIndex === ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[currentIndex + 1];
}

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "printing":
      return "Đang in kit";
    case "shipping":
      return "Đang giao";
    case "delivered":
      return "Đã giao";
    default:
      return "Chờ xác nhận";
  }
}

export function getOrderStatusStepIndex(status: OrderStatus): number {
  switch (status) {
    case "printing":
      return 1;
    case "shipping":
      return 2;
    case "delivered":
      return 3;
    default:
      return 0;
  }
}
