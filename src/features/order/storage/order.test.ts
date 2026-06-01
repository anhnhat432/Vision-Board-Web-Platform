import { beforeEach, describe, expect, it } from "vitest";

import { createLocalOrder, getOrderById, getOrders } from "./order";

beforeEach(() => {
  window.localStorage.clear();
});

const baseDraft = {
  lines: [
    {
      itemId: "frame:30x40",
      label: "F",
      type: "frame" as const,
      qty: 1,
      unitPriceVnd: 100,
      lineTotalVnd: 100,
    },
  ],
  subtotalVnd: 100,
  shippingVnd: 0,
  totalVnd: 100,
  fullName: "X",
  email: "x@y.z",
  phone: "1",
  shippingAddress: "Y",
  goalId: null,
  goalTitle: "",
  keywords: [],
  note: "",
};

describe("storage/order V2", () => {
  it("createLocalOrder writes schemaVersion=2", () => {
    const order = createLocalOrder({ ...baseDraft, totalVnd: 137000, subtotalVnd: 137000 });
    expect(order.schemaVersion).toBe(2);
    expect(getOrderById(order.id)?.totalVnd).toBe(137000);
  });

  it("getOrders sorts newest first", async () => {
    createLocalOrder({ ...baseDraft });
    await new Promise((r) => setTimeout(r, 10));
    const o2 = createLocalOrder({ ...baseDraft });
    expect(getOrders()[0]?.id).toBe(o2.id);
  });

  it("empty storage returns []", () => {
    expect(getOrders()).toEqual([]);
  });

  it("unknown id returns null", () => {
    expect(getOrderById("nope")).toBeNull();
  });
});
