import { describe, expect, it } from "vitest";

import { migrateOrderV1ToV2 } from "./migration";

describe("migrateOrderV1ToV2", () => {
  const v1 = {
    id: "o1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
    status: "pending",
    kitType: "vision-kit",
    goalId: "g1",
    goalTitle: "Goal",
    focusArea: "Career",
    fullName: "A",
    email: "a@b.c",
    phone: "1",
    shippingAddress: "X",
    keywords: ["a"],
    note: "hello",
  };

  it("maps to v2 with default frame line + empty themes/sticker", () => {
    const v2 = migrateOrderV1ToV2(v1);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.lines).toEqual([
      {
        itemId: "frame:30x40",
        label: "Khung 30×40 cm",
        type: "frame",
        qty: 1,
        unitPriceVnd: 0,
        lineTotalVnd: 0,
      },
    ]);
    expect(v2.subtotalVnd).toBe(0);
    expect(v2.totalVnd).toBe(0);
  });

  it("appends marker into note", () => {
    const v2 = migrateOrderV1ToV2(v1);
    expect(v2.note).toContain("[Đơn cũ — kitType: vision-kit]");
    expect(v2.note).toContain("hello");
  });

  it("preserves id/createdAt/shipping/goal", () => {
    const v2 = migrateOrderV1ToV2(v1);
    expect(v2.id).toBe("o1");
    expect(v2.createdAt).toBe("2024-01-01T00:00:00Z");
    expect(v2.goalId).toBe("g1");
  });

  it("fills defaults when fields missing", () => {
    const partial = {
      id: "o2",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      status: "pending",
    };
    const v2 = migrateOrderV1ToV2(partial as never);
    expect(v2.fullName).toBe("");
    expect(v2.keywords).toEqual([]);
  });

  it("uses [Đơn cũ] when kitType missing", () => {
    const v2 = migrateOrderV1ToV2({ ...v1, kitType: undefined } as never);
    expect(v2.note).toContain("[Đơn cũ]");
    expect(v2.note).not.toContain("kitType:");
  });
});
