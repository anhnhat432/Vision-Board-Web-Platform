import { generateId } from "./storage-types";

export type OrderKitType = "vision-kit" | "focus-kit" | "reset-kit";

export type OrderStatus = "pending" | "printing" | "shipping" | "delivered";

export interface LocalOrder {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  goalId: string | null;
  goalTitle: string;
  focusArea: string;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  keywords: string[];
  note: string;
  kitType: OrderKitType;
}

export interface CreateLocalOrderInput {
  goalId?: string | null;
  goalTitle?: string;
  focusArea?: string;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  keywords?: string[];
  note?: string;
  kitType: OrderKitType;
}

const ORDER_STORAGE_KEY = "visionboard_orders_v1";
const DEFAULT_GOAL_TITLE = "Chưa gắn mục tiêu cụ thể";
const DEFAULT_FOCUS_AREA = "Chưa chọn trọng tâm";
const ORDER_STATUS_FLOW: OrderStatus[] = ["pending", "printing", "shipping", "delivered"];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeOrderStatus(status: unknown): OrderStatus {
  switch (status) {
    case "printing":
    case "shipping":
    case "delivered":
      return status;
    case "confirmed":
    case "preparing":
      return "printing";
    case "ready_to_ship":
      return "shipping";
    default:
      return "pending";
  }
}

function parseOrders(raw: string | null): LocalOrder[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.id !== "string" ||
        typeof item.createdAt !== "string" ||
        typeof item.updatedAt !== "string" ||
        typeof item.status !== "string" ||
        typeof item.fullName !== "string" ||
        typeof item.email !== "string" ||
        typeof item.shippingAddress !== "string" ||
        typeof item.kitType !== "string" ||
        !Array.isArray(item.keywords)
      ) {
        return [];
      }

      return [
        {
          ...item,
          status: normalizeOrderStatus(item.status),
          goalId: typeof item.goalId === "string" ? item.goalId : null,
          goalTitle: typeof item.goalTitle === "string" && item.goalTitle.trim() ? item.goalTitle : DEFAULT_GOAL_TITLE,
          focusArea: typeof item.focusArea === "string" && item.focusArea.trim() ? item.focusArea : DEFAULT_FOCUS_AREA,
          phone: typeof item.phone === "string" ? item.phone : "",
          note: typeof item.note === "string" ? item.note : "",
          keywords: item.keywords.filter((keyword: unknown): keyword is string => typeof keyword === "string"),
        } satisfies LocalOrder,
      ];
    });
  } catch {
    return [];
  }
}

function saveOrders(orders: LocalOrder[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

export function getOrders(): LocalOrder[] {
  if (!canUseStorage()) return [];
  return parseOrders(window.localStorage.getItem(ORDER_STORAGE_KEY)).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function getOrderById(orderId: string): LocalOrder | null {
  return getOrders().find((order) => order.id === orderId) ?? null;
}

export function getLatestOrder(): LocalOrder | null {
  return getOrders()[0] ?? null;
}

export function createLocalOrder(input: CreateLocalOrderInput): LocalOrder {
  const now = new Date().toISOString();
  const nextOrder: LocalOrder = {
    id: generateId("order"),
    createdAt: now,
    updatedAt: now,
    status: "pending",
    goalId: input.goalId ?? null,
    goalTitle: input.goalTitle?.trim() || DEFAULT_GOAL_TITLE,
    focusArea: input.focusArea?.trim() || DEFAULT_FOCUS_AREA,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    shippingAddress: input.shippingAddress.trim(),
    keywords: (input.keywords ?? []).map((keyword) => keyword.trim()).filter(Boolean),
    note: input.note?.trim() ?? "",
    kitType: input.kitType,
  };

  const orders = getOrders();
  orders.unshift(nextOrder);
  saveOrders(orders);
  return nextOrder;
}

export function updateOrderStatus(orderId: string, status: OrderStatus): LocalOrder | null {
  const orders = getOrders();
  const orderIndex = orders.findIndex((order) => order.id === orderId);
  if (orderIndex === -1) return null;

  const updatedOrder: LocalOrder = {
    ...orders[orderIndex],
    status,
    updatedAt: new Date().toISOString(),
  };

  orders[orderIndex] = updatedOrder;
  saveOrders(orders);
  return updatedOrder;
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

export function getKitTypeLabel(kitType: OrderKitType): string {
  switch (kitType) {
    case "focus-kit":
      return "Focus Kit";
    case "reset-kit":
      return "Reset Kit";
    default:
      return "Vision Kit";
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
