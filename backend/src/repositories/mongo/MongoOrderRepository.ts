import { OrderModel, type OrderStatus } from "../../models/OrderModel";

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  country: string;
}

export interface GoalSnapshot {
  goalId: string;
  title: string;
  focusArea?: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  changedAt: Date;
  changedBy: string;
}

export interface OrderEntity {
  id: string;
  userId: string;
  status: OrderStatus;
  kitType: string;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: ShippingAddress;
  note?: string;
  goalSnapshot?: GoalSnapshot;
  statusHistory: StatusHistoryEntry[];
  adminNote?: string;
  cancelledAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderData {
  userId: string;
  kitType: string;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: ShippingAddress;
  note?: string;
  goalSnapshot?: GoalSnapshot;
}

export interface UpdateOrderStatusData {
  status: OrderStatus;
  changedBy: string;
  adminNote?: string;
  cancelledAt?: Date;
  deliveredAt?: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose lean/toObject output is loosely typed
function mapOrder(doc: any): OrderEntity {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    status: doc.status as OrderStatus,
    kitType: doc.kitType,
    fullName: doc.fullName,
    email: doc.email,
    phone: doc.phone,
    shippingAddress: {
      line1: doc.shippingAddress.line1,
      line2: doc.shippingAddress.line2 ?? undefined,
      city: doc.shippingAddress.city,
      country: doc.shippingAddress.country,
    },
    note: doc.note ?? undefined,
    goalSnapshot: doc.goalSnapshot
      ? {
          goalId: doc.goalSnapshot.goalId,
          title: doc.goalSnapshot.title,
          focusArea: doc.goalSnapshot.focusArea ?? undefined,
        }
      : undefined,
    statusHistory: (doc.statusHistory ?? []).map(
      (entry: { status: string; changedAt: Date; changedBy: string }) => ({
        status: entry.status as OrderStatus,
        changedAt: entry.changedAt,
        changedBy: entry.changedBy,
      }),
    ),
    adminNote: doc.adminNote ?? undefined,
    cancelledAt: doc.cancelledAt ?? undefined,
    deliveredAt: doc.deliveredAt ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoOrderRepository {
  async createOrder(data: CreateOrderData): Promise<OrderEntity> {
    const doc = await OrderModel.create({
      userId: data.userId,
      status: "pending",
      kitType: data.kitType,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      shippingAddress: data.shippingAddress,
      note: data.note,
      goalSnapshot: data.goalSnapshot,
      statusHistory: [{ status: "pending", changedAt: new Date(), changedBy: data.userId }],
    });

    return mapOrder(doc.toObject());
  }

  async getOrderById(id: string): Promise<OrderEntity | null> {
    const doc = await OrderModel.findById(id).lean();
    return doc ? mapOrder(doc) : null;
  }

  async getOrdersByUserId(userId: string): Promise<OrderEntity[]> {
    const docs = await OrderModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => mapOrder(doc));
  }

  async getAllOrders(): Promise<OrderEntity[]> {
    const docs = await OrderModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => mapOrder(doc));
  }

  async updateOrderStatus(id: string, data: UpdateOrderStatusData): Promise<OrderEntity | null> {
    const historyEntry = {
      status: data.status,
      changedAt: new Date(),
      changedBy: data.changedBy,
    };

    const setFields: Record<string, unknown> = {
      status: data.status,
    };
    if (data.adminNote !== undefined) setFields.adminNote = data.adminNote;
    if (data.cancelledAt !== undefined) setFields.cancelledAt = data.cancelledAt;
    if (data.deliveredAt !== undefined) setFields.deliveredAt = data.deliveredAt;

    const doc = await OrderModel.findByIdAndUpdate(
      id,
      {
        $set: setFields,
        $push: { statusHistory: historyEntry },
      },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapOrder(doc) : null;
  }
}
