import type { LocalOrderV2, OrderStatus } from "./order";

interface LegacyOrderV1 {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  kitType?: string;
  goalId?: string | null;
  goalTitle?: string;
  focusArea?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  shippingAddress?: string;
  keywords?: unknown[];
  note?: string;
  visionBoardId?: string;
}

function normStatus(value: unknown): OrderStatus {
  if (value === "printing" || value === "shipping" || value === "delivered") return value;
  return "pending";
}

export function migrateOrderV1ToV2(raw: LegacyOrderV1): LocalOrderV2 {
  const now = new Date().toISOString();
  const kitMarker =
    typeof raw.kitType === "string" && raw.kitType
      ? `[Đơn cũ — kitType: ${raw.kitType}]`
      : "[Đơn cũ]";
  const existingNote = typeof raw.note === "string" ? raw.note : "";

  return {
    id: typeof raw.id === "string" ? raw.id : `legacy-${Math.random().toString(36).slice(2)}`,
    schemaVersion: 2,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
    status: normStatus(raw.status),
    lines: [
      {
        itemId: "frame:30x40",
        label: "Khung 30×40 cm",
        type: "frame",
        qty: 1,
        unitPriceVnd: 0,
        lineTotalVnd: 0,
      },
    ],
    subtotalVnd: 0,
    shippingVnd: 0,
    totalVnd: 0,
    fullName: typeof raw.fullName === "string" ? raw.fullName : "",
    email: typeof raw.email === "string" ? raw.email : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
    shippingAddress: typeof raw.shippingAddress === "string" ? raw.shippingAddress : "",
    goalId: typeof raw.goalId === "string" ? raw.goalId : null,
    goalTitle: typeof raw.goalTitle === "string" ? raw.goalTitle : "",
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.filter((k): k is string => typeof k === "string")
      : [],
    note: existingNote ? `${existingNote}\n\n${kitMarker}` : kitMarker,
  };
}
