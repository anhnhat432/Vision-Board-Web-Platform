import { Types, type PipelineStage } from "mongoose";

import type { AdminOperationalClassificationSummary } from "../../models/OperationalClassification";
import { OrderModel, type OrderStatus } from "../../models/OrderModel";
import {
  asOptionalStage,
  buildEffectiveOperationalClassificationStages,
  buildOperationalScopeMatch,
  type OperationalScope,
  serializeProjectedOperationalClassification,
} from "../../services/adminOperationalClassificationQuery";
import { ApiError } from "../../utils/apiError";

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

export type OrderLineType = "frame" | "theme" | "sticker";

export interface OrderLine {
  itemId: string;
  label: string;
  type: OrderLineType;
  qty: number;
  unitPriceVnd: number;
  lineTotalVnd: number;
}

export interface OrderDiscount {
  source: "coupon" | "sale_event" | "env_fallback";
  discountCode?: string;
  discountId?: string;
  discountName?: string;
  discountPercent?: number;
  discountType?: "percentage" | "fixed";
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
}

export interface OrderEntity {
  id: string;
  userId: string;
  status: OrderStatus;
  schemaVersion: number;
  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
  discount?: OrderDiscount;
  keywords: string[];
  kitType?: string;
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

export interface AdminOrderEntity extends OrderEntity {
  operationalClassification: AdminOperationalClassificationSummary;
}

export interface AdminOrderListInput {
  q: string;
  status: OrderStatus | "all";
  frame: string | "all";
  dateFrom?: Date;
  dateToExclusive?: Date;
  operationalScope: OperationalScope;
  page: number;
  limit: number;
}

export interface AdminOrderListResult {
  items: AdminOrderEntity[];
  total: number;
  statusCounts: Record<OrderStatus | "all", number>;
  frameOptions: string[];
}

const MAX_ADMIN_ORDER_EXPORT_ROWS = 5_000;

export interface CreateOrderData {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: ShippingAddress;
  note?: string;
  goalSnapshot?: GoalSnapshot;
  schemaVersion: number;
  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
  discount?: OrderDiscount;
  keywords: string[];
  kitType?: string;
}

export interface UpdateOrderStatusData {
  status: OrderStatus;
  changedBy: string;
  adminNote?: string;
  cancelledAt?: Date;
  deliveredAt?: Date;
}

export interface UpdateAdminOrderData {
  fullName?: string;
  email?: string;
  phone?: string;
  shippingAddress?: ShippingAddress;
  note?: string;
  adminNote?: string;
}


function mapOrderDiscount(docDiscount: unknown): OrderDiscount | undefined {
  if (!docDiscount || typeof docDiscount !== "object") return undefined;
  const discount = docDiscount as Partial<OrderDiscount>;
  if (!discount.source || typeof discount.discountAmount !== "number") return undefined;
  return {
    source: discount.source,
    discountCode: discount.discountCode ?? undefined,
    discountId: discount.discountId ?? undefined,
    discountName: discount.discountName ?? undefined,
    discountPercent: discount.discountPercent ?? undefined,
    discountType: discount.discountType ?? undefined,
    discountAmount: discount.discountAmount,
    originalAmount: discount.originalAmount ?? 0,
    finalAmount: discount.finalAmount ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose lean/toObject output is loosely typed
function mapOrder(doc: any): OrderEntity {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    status: doc.status as OrderStatus,
    schemaVersion: doc.schemaVersion ?? 2,
    lines: Array.isArray(doc.lines)
      ? doc.lines.map(
          (line: {
            itemId: string;
            label: string;
            type: string;
            qty: number;
            unitPriceVnd: number;
            lineTotalVnd: number;
          }) => ({
            itemId: line.itemId,
            label: line.label,
            type: line.type as OrderLineType,
            qty: line.qty,
            unitPriceVnd: line.unitPriceVnd,
            lineTotalVnd: line.lineTotalVnd,
          }),
        )
      : [],
    subtotalVnd: doc.subtotalVnd ?? 0,
    shippingVnd: doc.shippingVnd ?? 0,
    totalVnd: doc.totalVnd ?? 0,
    discount: mapOrderDiscount(doc.discount),
    keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
    kitType: doc.kitType ?? undefined,
    fullName: doc.fullName,
    email: doc.email,
    phone: doc.phone,
    shippingAddress: {
      line1: doc.shippingAddress?.line1 ?? "",
      line2: doc.shippingAddress?.line2 ?? undefined,
      city: doc.shippingAddress?.city ?? "",
      country: doc.shippingAddress?.country ?? "",
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

function mapAdminOrder(doc: any): AdminOrderEntity {
  return {
    ...mapOrder(doc),
    operationalClassification: serializeProjectedOperationalClassification(doc as Record<string, unknown>),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildAdminOrderRowFilterStages(input: Pick<AdminOrderListInput, "q" | "status" | "frame" | "dateFrom" | "dateToExclusive">): PipelineStage.FacetPipelineStage[] {
  const stages: PipelineStage.FacetPipelineStage[] = [];

  if (input.q) {
    const search = escapeRegex(input.q);
    stages.push({
      $match: {
        $or: [
          { email: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: search, options: "i" } } },
        ],
      },
    });
  }

  if (input.status !== "all") stages.push({ $match: { status: input.status } });

  if (input.frame !== "all") {
    const frame = `^${escapeRegex(input.frame)}$`;
    stages.push({
      $match: {
        $or: [
          { lines: { $elemMatch: { type: "frame", label: { $regex: frame, $options: "i" } } } },
          { kitType: { $regex: frame, $options: "i" } },
        ],
      },
    });
  }

  if (input.dateFrom || input.dateToExclusive) {
    const createdAt: Record<string, Date> = {};
    if (input.dateFrom) createdAt.$gte = input.dateFrom;
    if (input.dateToExclusive) createdAt.$lt = input.dateToExclusive;
    stages.push({ $match: { createdAt } });
  }

  return stages;
}

function mapAdminOrderFacet(facet: {
  metadata?: Array<{ total?: number }>;
  items?: unknown[];
  statusCounts?: Array<{ _id?: string; count?: number }>;
  frameOptions?: Array<{ _id?: string }>;
}): AdminOrderListResult {
  const statusCounts: Record<OrderStatus | "all", number> = {
    pending: 0,
    confirmed: 0,
    printing: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
    all: 0,
  };
  for (const row of facet.statusCounts ?? []) {
    if (row._id && row._id in statusCounts) {
      statusCounts[row._id as OrderStatus] = row.count ?? 0;
      statusCounts.all += row.count ?? 0;
    }
  }

  return {
    total: facet.metadata?.[0]?.total ?? 0,
    items: (facet.items ?? []).map((item) => mapAdminOrder(item)),
    statusCounts,
    frameOptions: (facet.frameOptions ?? [])
      .map((row) => row._id)
      .filter((label): label is string => typeof label === "string" && label.length > 0),
  };
}

export class MongoOrderRepository {
  async createOrder(data: CreateOrderData): Promise<OrderEntity> {
    const doc = await OrderModel.create({
      userId: data.userId,
      status: "pending",
      schemaVersion: data.schemaVersion,
      lines: data.lines,
      subtotalVnd: data.subtotalVnd,
      shippingVnd: data.shippingVnd,
      totalVnd: data.totalVnd,
      discount: data.discount,
      keywords: data.keywords,
      kitType: data.kitType,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      shippingAddress: data.shippingAddress,
      note: data.note,
      goalSnapshot: data.goalSnapshot,
      statusHistory: [{ status: "pending", changedAt: new Date(), changedBy: data.userId }],
    });

    const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
    return mapOrder(obj);
  }

  async getOrderById(id: string): Promise<OrderEntity | null> {
    const doc = await OrderModel.findById(id).select("-__v -operationalClassification").lean();
    return doc ? mapOrder(doc) : null;
  }

  async getOrdersByUserId(userId: string): Promise<OrderEntity[]> {
    const docs = await OrderModel.find({ userId }).select("-__v -operationalClassification").sort({ createdAt: -1 }).lean();
    return docs.map((doc) => mapOrder(doc));
  }

  async getAllOrders(): Promise<OrderEntity[]> {
    const docs = await OrderModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => mapOrder(doc));
  }

  async getAdminOrders(input: AdminOrderListInput): Promise<AdminOrderListResult> {
    const rowFilterStages = buildAdminOrderRowFilterStages(input);
    const scopePipeline = [
      ...buildEffectiveOperationalClassificationStages({
        userIdField: "userId",
        recordClassificationField: "operationalClassification",
      }),
      ...asOptionalStage(buildOperationalScopeMatch(input.operationalScope)),
    ];
    const [facet] = await OrderModel.aggregate<{
      metadata: Array<{ total: number }>;
      items: unknown[];
      statusCounts: Array<{ _id: string; count: number }>;
      frameOptions: Array<{ _id: string }>;
    }>([
      ...scopePipeline,
      {
        $facet: {
          metadata: [...rowFilterStages, { $count: "total" }],
          items: [
            ...rowFilterStages,
            { $sort: { createdAt: -1 } },
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit },
          ],
          statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          frameOptions: [
            { $unwind: "$lines" },
            { $match: { "lines.type": "frame" } },
            { $group: { _id: "$lines.label" } },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);
    return mapAdminOrderFacet(facet ?? {});
  }

  async getAdminOrderById(id: string): Promise<AdminOrderEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const [order] = await OrderModel.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      ...buildEffectiveOperationalClassificationStages({
        userIdField: "userId",
        recordClassificationField: "operationalClassification",
      }),
    ]);
    return order ? mapAdminOrder(order) : null;
  }

  async getAdminOrdersForExport(input: Omit<AdminOrderListInput, "page" | "limit">): Promise<AdminOrderEntity[]> {
    const rows = await OrderModel.aggregate([
      ...buildEffectiveOperationalClassificationStages({
        userIdField: "userId",
        recordClassificationField: "operationalClassification",
      }),
      ...asOptionalStage(buildOperationalScopeMatch(input.operationalScope)),
      ...buildAdminOrderRowFilterStages(input),
      { $sort: { createdAt: -1 } },
      { $limit: MAX_ADMIN_ORDER_EXPORT_ROWS + 1 },
    ]);
    if (rows.length > MAX_ADMIN_ORDER_EXPORT_ROWS) {
      throw new ApiError(413, "Order export is too large. Narrow the filters.", undefined, "admin_order_export_too_large");
    }
    return rows.map((row) => mapAdminOrder(row));
  }

  async patchOrder(id: string, fields: { totalVnd?: number; discount?: undefined }): Promise<OrderEntity | null> {
    const setFields: Record<string, unknown> = {};
    if (fields.totalVnd !== undefined) setFields.totalVnd = fields.totalVnd;
    if (fields.discount === undefined) setFields.$unset = { discount: "" };

    const doc = await OrderModel.findByIdAndUpdate(
      id,
      setFields,
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapOrder(doc) : null;
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

  async updateAdminOrderFields(id: string, data: UpdateAdminOrderData): Promise<OrderEntity | null> {
    const setFields: Record<string, unknown> = {};

    if (data.fullName !== undefined) setFields.fullName = data.fullName;
    if (data.email !== undefined) setFields.email = data.email;
    if (data.phone !== undefined) setFields.phone = data.phone;
    if (data.shippingAddress !== undefined) setFields.shippingAddress = data.shippingAddress;
    if (data.note !== undefined) setFields.note = data.note || undefined;
    if (data.adminNote !== undefined) setFields.adminNote = data.adminNote || undefined;

    if (Object.keys(setFields).length === 0) {
      const doc = await OrderModel.findById(id).lean();
      return doc ? mapOrder(doc) : null;
    }

    const doc = await OrderModel.findByIdAndUpdate(
      id,
      { $set: setFields },
      { new: true, runValidators: true },
    ).lean();

    return doc ? mapOrder(doc) : null;
  }
}
