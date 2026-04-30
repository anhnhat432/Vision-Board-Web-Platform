import { readBackendLinkMap, writeBackendLinkMap } from "@/app/utils/backend-link-storage";

const ORDER_LINK_STORAGE_KEY = "backend_order_links";

// Maps local (UUID) order ID → backend (MongoDB ObjectId) order ID
type OrderLinkMap = Record<string, string>;

function readLinkMap(): OrderLinkMap {
  return readBackendLinkMap<OrderLinkMap>(ORDER_LINK_STORAGE_KEY);
}

function writeLinkMap(nextMap: OrderLinkMap): void {
  writeBackendLinkMap(ORDER_LINK_STORAGE_KEY, nextMap);
}

export function saveOrderLink(localOrderId: string, backendOrderId: string): void {
  const nextMap = readLinkMap();
  nextMap[localOrderId] = backendOrderId;
  writeLinkMap(nextMap);
}

export function getBackendOrderId(localOrderId: string): string | null {
  return readLinkMap()[localOrderId] ?? null;
}
