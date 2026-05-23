import { OrderCatalogModel } from "../models/OrderCatalogModel";
import type { OrderStatus } from "../models/OrderModel";
import { MongoGoalRepository } from "../repositories/mongo/MongoGoalRepository";
import {
  MongoOrderRepository,
  type GoalSnapshot,
  type OrderLine,
  type OrderLineType,
  type ShippingAddress,
  type UpdateOrderStatusData,
} from "../repositories/mongo/MongoOrderRepository";
import { ApiError } from "../utils/apiError";

export interface StickerSelectionPayload {
  itemId: string;
  qty: number;
}

export interface CreateOrderPayload {
  itemIds?: unknown;
  sticker?: unknown;
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  shippingAddress?: unknown;
  note?: unknown;
  goalId?: unknown;
  goalTitle?: unknown;
  keywords?: unknown;
  kitType?: unknown;
  // Bất kỳ field nào khác client gửi (ví dụ priceVnd) sẽ bị bỏ qua bởi server.
  [key: string]: unknown;
}

export interface AdminUpdateStatusPayload {
  status: OrderStatus;
  adminNote?: string;
}

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "printing",
  "shipping",
  "delivered",
  "cancelled",
];

const ADMIN_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["printing", "cancelled"],
  printing: ["shipping", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

interface CatalogItemLean {
  itemId: string;
  type: OrderLineType;
  label: string;
  priceVnd: number;
  isActive: boolean;
  maxQty?: number;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function buildShippingAddress(value: unknown): ShippingAddress {
  if (typeof value === "string") {
    return { line1: value.trim(), city: "", country: "" };
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return {
      line1: asString(obj.line1).trim(),
      line2: typeof obj.line2 === "string" ? obj.line2.trim() : undefined,
      city: asString(obj.city).trim(),
      country: asString(obj.country).trim(),
    };
  }
  return { line1: "", city: "", country: "" };
}

class OrderService {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly goalRepository: MongoGoalRepository,
  ) {}

  async createOrder(userId: string, payload: CreateOrderPayload) {
    // 1. Reject legacy v1 payload (kitType signal)
    if (typeof payload.kitType === "string") {
      throw new ApiError(
        400,
        "Phiên bản cũ, vui lòng tải lại trang.",
        undefined,
        "legacy_payload",
      );
    }

    // 2. Validate basic shipping fields
    const fullName = asString(payload.fullName).trim();
    const email = asString(payload.email).trim();
    const phone = asString(payload.phone).trim();
    if (!fullName) throw new ApiError(400, "fullName is required.");
    if (!email) throw new ApiError(400, "email is required.");
    if (!phone) throw new ApiError(400, "phone is required.");

    const shippingAddress = buildShippingAddress(payload.shippingAddress);
    if (!shippingAddress.line1) {
      throw new ApiError(400, "shippingAddress is required.");
    }

    // 3. Validate itemIds
    const itemIds = Array.isArray(payload.itemIds)
      ? payload.itemIds.filter((id): id is string => typeof id === "string")
      : [];
    if (itemIds.length === 0) {
      throw new ApiError(400, "itemIds rỗng.", undefined, "invalid_payload");
    }

    // 4. Fetch catalog (only active)
    const items = (await OrderCatalogModel.find({
      itemId: { $in: itemIds },
      isActive: true,
    }).lean()) as unknown as CatalogItemLean[];
    const byId = new Map(items.map((i) => [i.itemId, i]));
    const missing = itemIds.filter((id) => !byId.has(id));
    if (missing.length) {
      throw new ApiError(
        400,
        `Items không khả dụng: ${missing.join(", ")}`,
        undefined,
        "items_unavailable",
      );
    }

    // 5. Build lines (preserve order from itemIds)
    const lines: OrderLine[] = itemIds.map((id) => {
      const item = byId.get(id);
      if (!item) {
        throw new ApiError(400, `Item không khả dụng: ${id}`, undefined, "items_unavailable");
      }
      return {
        itemId: item.itemId,
        label: item.label,
        type: item.type,
        qty: 1,
        unitPriceVnd: item.priceVnd,
        lineTotalVnd: item.priceVnd,
      };
    });

    // 6. Handle sticker (optional)
    const stickerInput = payload.sticker as
      | { itemId?: unknown; qty?: unknown }
      | null
      | undefined;
    if (stickerInput && typeof stickerInput.itemId === "string" && stickerInput.itemId.length > 0) {
      const stickerItem = (await OrderCatalogModel.findOne({
        itemId: stickerInput.itemId,
        isActive: true,
        type: "sticker",
      }).lean()) as unknown as CatalogItemLean | null;
      if (!stickerItem) {
        throw new ApiError(400, "Sticker không khả dụng.", undefined, "sticker_unavailable");
      }
      const maxQty = stickerItem.maxQty ?? 10;
      const rawQty = Number(stickerInput.qty);
      const qty = Number.isFinite(rawQty)
        ? Math.max(1, Math.min(maxQty, Math.floor(rawQty)))
        : 1;
      lines.push({
        itemId: stickerItem.itemId,
        label: stickerItem.label,
        type: stickerItem.type,
        qty,
        unitPriceVnd: stickerItem.priceVnd,
        lineTotalVnd: stickerItem.priceVnd * qty,
      });
    }

    const subtotalVnd = lines.reduce((s, l) => s + l.lineTotalVnd, 0);
    const shippingVnd = 0;
    const totalVnd = subtotalVnd + shippingVnd;

    // 7. Goal snapshot (optional)
    let goalSnapshot: GoalSnapshot | undefined;
    const goalIdRaw = payload.goalId;
    if (typeof goalIdRaw === "string" && goalIdRaw.length > 0) {
      const goal = await this.goalRepository.getGoalById(goalIdRaw);
      if (!goal) throw new ApiError(400, "Provided goalId does not exist.");
      if (goal.userId !== userId) {
        throw new ApiError(403, "You do not have access to this goal.");
      }
      goalSnapshot = {
        goalId: goal.id,
        title: goal.title,
        focusArea: goal.focusArea,
      };
    } else if (typeof payload.goalTitle === "string" && payload.goalTitle.trim().length > 0) {
      // Frontend cho phép user nhập tên goal tự do (không link goalId).
      goalSnapshot = {
        goalId: "",
        title: payload.goalTitle.trim(),
      };
    }

    const keywords = Array.isArray(payload.keywords)
      ? payload.keywords.filter((k): k is string => typeof k === "string")
      : [];

    const note = typeof payload.note === "string" ? payload.note.trim() || undefined : undefined;

    return this.orderRepository.createOrder({
      userId,
      schemaVersion: 2,
      lines,
      subtotalVnd,
      shippingVnd,
      totalVnd,
      keywords,
      fullName,
      email,
      phone,
      shippingAddress,
      note,
      goalSnapshot,
    });
  }

  async getUserOrders(userId: string) {
    return this.orderRepository.getOrdersByUserId(userId);
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.orderRepository.getOrderById(orderId);
    if (!order) throw new ApiError(404, "Order not found.");
    if (order.userId !== userId) throw new ApiError(403, "You do not have access to this order.");
    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.orderRepository.getOrderById(orderId);
    if (!order) throw new ApiError(404, "Order not found.");
    if (order.userId !== userId) throw new ApiError(403, "You do not have access to this order.");
    if (order.status !== "pending") {
      throw new ApiError(409, "Only pending orders can be cancelled.");
    }

    const updated = await this.orderRepository.updateOrderStatus(orderId, {
      status: "cancelled",
      changedBy: userId,
      cancelledAt: new Date(),
    });

    if (!updated) throw new ApiError(404, "Order not found.");
    return updated;
  }

  async adminGetOrders() {
    return this.orderRepository.getAllOrders();
  }

  async adminUpdateStatus(adminUid: string, orderId: string, payload: AdminUpdateStatusPayload) {
    if (!payload.status || !VALID_STATUSES.includes(payload.status)) {
      throw new ApiError(400, `status must be one of: ${VALID_STATUSES.join(", ")}.`);
    }

    const order = await this.orderRepository.getOrderById(orderId);
    if (!order) throw new ApiError(404, "Order not found.");

    const allowedNext = ADMIN_STATUS_TRANSITIONS[order.status];
    if (!allowedNext.includes(payload.status)) {
      const allowed = allowedNext.length ? allowedNext.join(", ") : "none";
      throw new ApiError(
        409,
        `Cannot transition order from "${order.status}" to "${payload.status}". Allowed: ${allowed}.`,
      );
    }

    const updateData: UpdateOrderStatusData = {
      status: payload.status,
      changedBy: adminUid,
    };
    if (payload.adminNote !== undefined) updateData.adminNote = payload.adminNote;
    if (payload.status === "cancelled") updateData.cancelledAt = new Date();
    if (payload.status === "delivered") updateData.deliveredAt = new Date();

    const updated = await this.orderRepository.updateOrderStatus(orderId, updateData);
    if (!updated) throw new ApiError(404, "Order not found.");
    return updated;
  }
}

const orderRepository = new MongoOrderRepository();
const goalRepository = new MongoGoalRepository();

export const orderService = new OrderService(orderRepository, goalRepository);
