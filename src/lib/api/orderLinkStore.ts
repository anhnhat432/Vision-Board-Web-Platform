const ORDER_LINK_STORAGE_KEY = "backend_order_links";

// Maps local (UUID) order ID → backend (MongoDB ObjectId) order ID
type OrderLinkMap = Record<string, string>;

function readLinkMap(): OrderLinkMap {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = localStorage.getItem(ORDER_LINK_STORAGE_KEY);
    if (!rawValue) return {};

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!parsedValue || typeof parsedValue !== "object") return {};

    return parsedValue as OrderLinkMap;
  } catch {
    return {};
  }
}

function writeLinkMap(nextMap: OrderLinkMap): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ORDER_LINK_STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // ignore storage errors
  }
}

export function saveOrderLink(localOrderId: string, backendOrderId: string): void {
  const nextMap = readLinkMap();
  nextMap[localOrderId] = backendOrderId;
  writeLinkMap(nextMap);
}

export function getBackendOrderId(localOrderId: string): string | null {
  return readLinkMap()[localOrderId] ?? null;
}
