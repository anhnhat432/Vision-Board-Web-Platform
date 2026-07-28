// Feature: library-page-ui-alignment, Property 7: Thống kê chính xác và nhất quán —
// với mọi danh sách VisionBoard, computeGalleryStats cho total/totalItemsCount/
// yearsCount/avgItems/distribution đúng công thức, mỗi phần trăm ∈ [0, 100].
// Validates: Requirements 10.3

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { VisionBoard, VisionBoardItem } from "@/app/utils/storage";
import { computeGalleryStats } from "./gallerySelectors";

const PROPERTY_TAG =
  "Feature: library-page-ui-alignment, Property 7: Thống kê chính xác và nhất quán";

// Generator một item: chỉ quan tâm tới `type` cho thống kê phân bổ,
// trộn đều image/quote/icon. Các trường layout giữ giá trị hợp lệ tối thiểu.
const itemArb: fc.Arbitrary<VisionBoardItem> = fc
  .constantFrom("image", "quote", "icon")
  .chain((type) =>
    fc.record({
      id: fc.string(),
      type: fc.constant(type as VisionBoardItem["type"]),
      content: fc.string(),
      x: fc.constant(0),
      y: fc.constant(0),
      width: fc.constant(1),
      height: fc.constant(1),
    }),
  );

// Generator một board: `year` lấy từ pool nhỏ để tạo trùng nhóm; `items` gồm cả
// mảng rỗng để phủ trường hợp totalItemsCount === 0.
const boardArb: fc.Arbitrary<VisionBoard> = fc.record({
  id: fc.string(),
  name: fc.string(),
  year: fc.constantFrom("2023", "2024", "2025", "2026"),
  createdAt: fc.date({ noInvalidDate: true }).map((d) => d.toISOString()),
  items: fc.array(itemArb, { maxLength: 8 }),
});

const boardsArb: fc.Arbitrary<VisionBoard[]> = fc.array(boardArb, { maxLength: 20 });

describe("computeGalleryStats — Property 7", () => {
  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(boardsArb, (boards) => {
        const stats = computeGalleryStats(boards);

        // total === số lượng board
        expect(stats.total).toBe(boards.length);

        // totalItemsCount === tổng số item
        const expectedItems = boards.reduce((sum, b) => sum + b.items.length, 0);
        expect(stats.totalItemsCount).toBe(expectedItems);

        // yearsCount === số năm phân biệt
        const expectedYears = new Set(boards.map((b) => b.year)).size;
        expect(stats.yearsCount).toBe(expectedYears);

        // avgItems === round(totalItemsCount / total), = 0 khi total === 0
        const expectedAvg =
          stats.total > 0 ? Math.round(expectedItems / stats.total) : 0;
        expect(stats.avgItems).toBe(expectedAvg);

        // distribution: phần trăm làm tròn theo từng loại trên tổng item
        let img = 0;
        let quote = 0;
        let icon = 0;
        for (const b of boards) {
          for (const item of b.items) {
            if (item.type === "image") img++;
            else if (item.type === "quote") quote++;
            else if (item.type === "icon") icon++;
          }
        }

        if (expectedItems === 0) {
          expect(stats.distribution).toEqual({ image: 0, quote: 0, icon: 0 });
        } else {
          expect(stats.distribution.image).toBe(
            Math.round((img / expectedItems) * 100),
          );
          expect(stats.distribution.quote).toBe(
            Math.round((quote / expectedItems) * 100),
          );
          expect(stats.distribution.icon).toBe(
            Math.round((icon / expectedItems) * 100),
          );
        }

        // Mỗi phần trăm phải nằm trong [0, 100]
        for (const pct of Object.values(stats.distribution)) {
          expect(pct).toBeGreaterThanOrEqual(0);
          expect(pct).toBeLessThanOrEqual(100);
        }
      }),
      { numRuns: 100 },
    );
  });
});
