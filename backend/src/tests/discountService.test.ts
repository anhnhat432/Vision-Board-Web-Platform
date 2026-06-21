import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateDiscountedAmount,
  resolveBestDiscount,
  type AppliedDiscount,
} from "../services/discountService";

function coupon(overrides: Partial<AppliedDiscount> = {}): AppliedDiscount {
  return {
    source: "coupon",
    discountPercent: 30,
    discountAmount: 30_000,
    discountType: "percentage",
    discountCode: "TEST30",
    discountId: "id_coupon",
    discountName: "Test 30%",
    ...overrides,
  };
}

function sale(overrides: Partial<AppliedDiscount> = {}): AppliedDiscount {
  return {
    source: "sale_event",
    discountPercent: 20,
    discountAmount: 20_000,
    discountType: "percentage",
    discountCode: "SALE20",
    discountId: "id_sale",
    discountName: "Sale 20%",
    ...overrides,
  };
}

describe("resolveBestDiscount", () => {
  it("trả về 'none' khi không có discount nào", () => {
    assert.deepEqual(resolveBestDiscount(null, null), { source: "none" });
  });

  it("trả về coupon khi chỉ có coupon", () => {
    const c = coupon();
    assert.deepEqual(resolveBestDiscount(c, null), c);
  });

  it("trả về sale khi chỉ có sale", () => {
    const s = sale();
    assert.deepEqual(resolveBestDiscount(null, s), s);
  });

  it("chọn coupon khi coupon cao hơn sale", () => {
    const c = coupon({ discountAmount: 50_000 });
    const s = sale({ discountAmount: 20_000 });
    const result = resolveBestDiscount(c, s);
    assert.equal(result.source, "coupon");
    assert.equal(result.discountAmount, 50_000);
  });

  it("chọn sale khi sale cao hơn coupon", () => {
    const c = coupon({ discountAmount: 10_000 });
    const s = sale({ discountAmount: 40_000 });
    const result = resolveBestDiscount(c, s);
    assert.equal(result.source, "sale_event");
    assert.equal(result.discountAmount, 40_000);
  });

  it("khi bằng nhau, ưu tiên coupon", () => {
    const c = coupon({ discountAmount: 30_000 });
    const s = sale({ discountAmount: 30_000 });
    const result = resolveBestDiscount(c, s);
    assert.equal(result.source, "coupon");
  });
});

describe("calculateDiscountedAmount", () => {
  it("trả về nguyên giá khi source là 'none'", () => {
    const { finalAmount, discountAmount } = calculateDiscountedAmount(99_000, { source: "none" });
    assert.equal(finalAmount, 99_000);
    assert.equal(discountAmount, 0);
  });

  it("tính đúng với discount 30% trên 99000", () => {
    const { finalAmount, discountAmount } = calculateDiscountedAmount(99_000, coupon({ discountAmount: 29_700 }));
    assert.equal(finalAmount, 69_300);
    assert.equal(discountAmount, 29_700);
  });

  it("tính đúng với fixed discount 50000 trên 99000", () => {
    const { finalAmount, discountAmount } = calculateDiscountedAmount(99_000, coupon({ discountType: "fixed", discountAmount: 50_000 }));
    assert.equal(finalAmount, 49_000);
    assert.equal(discountAmount, 50_000);
  });

  it("không cho phép finalAmount âm", () => {
    const { finalAmount } = calculateDiscountedAmount(50_000, coupon({ discountAmount: 100_000 }));
    assert.equal(finalAmount, 0);
  });

  it("trả về discountAmount = 0 khi không có discountAmount", () => {
    const { finalAmount, discountAmount } = calculateDiscountedAmount(99_000, coupon({ discountAmount: 0 }));
    assert.equal(finalAmount, 99_000);
    assert.equal(discountAmount, 0);
  });
});
