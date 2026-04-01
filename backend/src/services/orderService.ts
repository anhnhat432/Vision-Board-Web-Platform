import { MongoGoalRepository } from "../repositories/mongo/MongoGoalRepository";
import {
  MongoOrderRepository,
  type GoalSnapshot,
  type ShippingAddress,
  type UpdateOrderStatusData,
} from "../repositories/mongo/MongoOrderRepository";
import { ApiError } from "../utils/apiError";
import type { OrderStatus } from "../models/OrderModel";

export interface CreateOrderPayload {
  kitType: string;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    country: string;
  };
  note?: string;
  goalId?: string;
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

// Valid forward transitions for admin. Users may only cancel pending orders separately.
const ADMIN_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["printing", "cancelled"],
  printing: ["shipping", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

class OrderService {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly goalRepository: MongoGoalRepository,
  ) {}

  async createOrder(userId: string, payload: CreateOrderPayload) {
    if (!payload.kitType?.trim()) throw new ApiError(400, "kitType is required.");
    if (!payload.fullName?.trim()) throw new ApiError(400, "fullName is required.");
    if (!payload.email?.trim()) throw new ApiError(400, "email is required.");
    if (!payload.phone?.trim()) throw new ApiError(400, "phone is required.");
    if (!payload.shippingAddress) throw new ApiError(400, "shippingAddress is required.");
    if (!payload.shippingAddress.line1?.trim()) {
      throw new ApiError(400, "shippingAddress.line1 is required.");
    }
    if (!payload.shippingAddress.city?.trim()) {
      throw new ApiError(400, "shippingAddress.city is required.");
    }
    if (!payload.shippingAddress.country?.trim()) {
      throw new ApiError(400, "shippingAddress.country is required.");
    }

    let goalSnapshot: GoalSnapshot | undefined;
    if (payload.goalId) {
      const goal = await this.goalRepository.getGoalById(payload.goalId);
      if (!goal) throw new ApiError(400, "Provided goalId does not exist.");
      if (goal.userId !== userId) {
        throw new ApiError(403, "You do not have access to this goal.");
      }
      goalSnapshot = {
        goalId: goal.id,
        title: goal.title,
        focusArea: goal.focusArea,
      };
    }

    const shippingAddress: ShippingAddress = {
      line1: payload.shippingAddress.line1.trim(),
      line2: payload.shippingAddress.line2?.trim(),
      city: payload.shippingAddress.city.trim(),
      country: payload.shippingAddress.country.trim(),
    };

    return this.orderRepository.createOrder({
      userId,
      kitType: payload.kitType.trim(),
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      shippingAddress,
      note: payload.note?.trim(),
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
