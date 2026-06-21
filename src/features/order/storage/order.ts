import { generateId } from "@/app/utils/storage-types";
import type { CatalogItemType } from "@/features/order/catalog/types";

import { migrateOrderV1ToV2 } from "./migration";

export const ORDER_STORAGE_KEY = "visionboard_orders_v1";
export const ORDER_SCHEMA_VERSION = 2 as const;

export type OrderStatus = "pending" | "printing" | "shipping" | "delivered";

export interface OrderLine {
  itemId: string;
  label: string;
  type: CatalogItemType;
  qty: number;
  unitPriceVnd: number;
  lineTotalVnd: number;
}

export interface LocalOrderDiscount {
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

export interface LocalOrderV2 {
  id: string;
  schemaVersion: 2;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  subtotalVnd: number;
  shippingVnd: number;
  totalVnd: number;
  discount?: LocalOrderDiscount;
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  goalId: string | null;
  goalTitle: string;
  keywords: string[];
  note: string;
}

export type LocalOrder = LocalOrderV2;

export interface CreateLocalOrderInput
  extends Omit<LocalOrderV2, "id" | "schemaVersion" | "createdAt" | "updatedAt" | "status"> {
  status?: OrderStatus;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseOrders(raw: string | null): LocalOrderV2[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item: unknown) => {
      if (typeof item !== "object" || item === null) return [];
      const record = item as { schemaVersion?: unknown };
      if (record.schemaVersion === 2) return [item as LocalOrderV2];
      try {
        return [migrateOrderV1ToV2(item)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function saveOrders(orders: LocalOrderV2[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

export function getOrders(): LocalOrderV2[] {
  if (!canUseStorage()) return [];
  return parseOrders(window.localStorage.getItem(ORDER_STORAGE_KEY)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getOrderById(id: string): LocalOrderV2 | null {
  return getOrders().find((order) => order.id === id) ?? null;
}

export function getLatestOrder(): LocalOrderV2 | null {
  return getOrders()[0] ?? null;
}

export function createLocalOrder(input: CreateLocalOrderInput): LocalOrderV2 {
  const now = new Date().toISOString();
  const order: LocalOrderV2 = {
    id: generateId("order"),
    schemaVersion: 2,
    createdAt: now,
    updatedAt: now,
    status: input.status ?? "pending",
    lines: input.lines,
    subtotalVnd: input.subtotalVnd,
    shippingVnd: input.shippingVnd,
    totalVnd: input.totalVnd,
    discount: input.discount,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    shippingAddress: input.shippingAddress,
    goalId: input.goalId,
    goalTitle: input.goalTitle,
    keywords: input.keywords,
    note: input.note,
  };
  saveOrders([order, ...getOrders()]);
  return order;
}
