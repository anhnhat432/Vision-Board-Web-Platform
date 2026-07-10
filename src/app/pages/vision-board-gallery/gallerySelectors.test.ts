// Feature: library-page-ui-alignment, Property 6: Lọc/sắp xếp/gom nhóm bảo toàn hành vi (oracle)
//
// Validates: Requirements 10.2
//
// Với mọi danh sách VisionBoard và tổ hợp (searchTerm, selectedYear, sortBy, viewMode):
//  - filterAndSortBoards trả về ĐÚNG tập con thoả điều kiện tìm kiếm (case-insensitive sau trim)
//    và lọc năm (selectedYear === "all" hoặc board.year === selectedYear);
//  - kết quả được sắp xếp đúng theo sortBy (newest/oldest theo createdAt, name theo localeCompare,
//    items theo số phần tử giảm dần);
//  - groupBoardsByYear cho phân hoạch bảo toàn: hợp mọi nhóm bằng đúng đa tập input, mỗi board
//    nằm đúng nhóm board.year;
//  - resolveGroupedByYear trả true khi và chỉ khi viewMode === "grid" && searchTerm === "" && sortBy === "newest".

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { VisionBoard, VisionBoardItem, VisionBoardItemType } from "@/app/utils/storage";
import {
  filterAndSortBoards,
  groupBoardsByYear,
  resolveGroupedByYear,
  type VisionBoardSort,
} from "./gallerySelectors";

// Tập năm nhỏ để tạo trùng nhóm (collision) khi gom nhóm theo năm.
const YEARS = ["2023", "2024", "2025", "2026"] as const;

const SORTS: readonly VisionBoardSort[] = ["newest", "oldest", "name", "items"];
const VIEW_MODES = ["grid", "list"] as const;

// Loại item: gồm cả loại không nằm trong distribution để phản ánh dữ liệu thật.
const ITEM_TYPES: readonly VisionBoardItemType[] = [
  "image",
  "quote",
  "icon",
  "goal_card",
  "sticker",
];

const arbItem: fc.Arbitrary<VisionBoardItem> = fc.record({
  id: fc.string(),
  type: fc.constantFrom(...ITEM_TYPES),
  content: fc.string(),
  x: fc.integer(),
  y: fc.integer(),
  width: fc.integer({ min: 0, max: 1000 }),
  height: fc.integer({ min: 0, max: 1000 }),
});

// Tên: gồm chuỗi có/không khoảng trắng thừa và unicode để kiểm case-insensitive + trim.
const arbName: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constantFrom(
    "Ước mơ 2025",
    "  Kế hoạch  ",
    "Dream Board",
    "café ☕ vision",
    "DREAM board",
    "",
    "vision",
  ),
);

// createdAt: ISO ngẫu nhiên trong khoảng hợp lệ.
const arbCreatedAt: fc.Arbitrary<string> = fc
  .date({
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("2035-12-31T23:59:59.000Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString());

const arbVisionBoard: fc.Arbitrary<VisionBoard> = fc.record({
  id: fc.string(),
  name: arbName,
  year: fc.constantFrom(...YEARS),
  items: fc.array(arbItem, { maxLength: 8 }),
  createdAt: arbCreatedAt,
});

// Đảm bảo id duy nhất giữa các board để so sánh đa tập theo id đáng tin cậy
// (đồng thời phép so theo tham chiếu object vẫn dùng được vì filterAndSortBoards chỉ shallow-copy).
function withUniqueIds(boards: VisionBoard[]): VisionBoard[] {
  return boards.map((b, i) => ({ ...b, id: `${i}::${b.id}` }));
}

const arbBoards: fc.Arbitrary<VisionBoard[]> = fc
  .array(arbVisionBoard, { maxLength: 12 })
  .map(withUniqueIds);

// searchTerm: gồm "", chuỗi ngẫu nhiên, và các fragment khớp tên đã dựng ở trên.
const arbSearchTerm: fc.Arbitrary<string> = fc.oneof(
  fc.constant(""),
  fc.string(),
  fc.constantFrom("dream", "DREAM", "vision", "  ", "ước", "café", "kế hoạch"),
);

// selectedYear: "all", năm có trong tập, hoặc năm không xuất hiện.
const arbSelectedYear: fc.Arbitrary<string> = fc.constantFrom("all", ...YEARS, "1999");

/** Oracle tham chiếu cho bước lọc (độc lập với thuật toán của module). */
function expectedFilter(
  boards: readonly VisionBoard[],
  searchTerm: string,
  selectedYear: string,
): VisionBoard[] {
  return boards.filter((board) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      board.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === "all" || board.year === selectedYear;
    return matchesSearch && matchesYear;
  });
}

/** So sánh đa tập theo tham chiếu object (id-agnostic, an toàn với trùng lặp). */
function sameMultiset(a: readonly VisionBoard[], b: readonly VisionBoard[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<VisionBoard, number>();
  for (const x of a) counts.set(x, (counts.get(x) ?? 0) + 1);
  for (const y of b) {
    const c = counts.get(y);
    if (!c) return false;
    counts.set(y, c - 1);
  }
  return [...counts.values()].every((c) => c === 0);
}

describe("gallerySelectors — Property 6: filter/sort/group bảo toàn hành vi", () => {
  it("filterAndSortBoards trả về đúng tập con và sắp xếp đúng theo sortBy", () => {
    fc.assert(
      fc.property(
        arbBoards,
        arbSearchTerm,
        arbSelectedYear,
        fc.constantFrom(...SORTS),
        (boards, searchTerm, selectedYear, sortBy) => {
          const result = filterAndSortBoards(boards, searchTerm, selectedYear, sortBy);
          const expectedSubset = expectedFilter(boards, searchTerm, selectedYear);

          // (a) Kết quả là đúng tập con thoả điều kiện lọc (bảo toàn đa tập).
          expect(sameMultiset(result, expectedSubset)).toBe(true);

          // (b) Mọi phần tử trong kết quả đều thoả điều kiện lọc.
          for (const board of result) {
            const matchesSearch =
              searchTerm.trim() === "" ||
              board.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesYear = selectedYear === "all" || board.year === selectedYear;
            expect(matchesSearch && matchesYear).toBe(true);
          }

          // (c) Thứ tự sắp xếp đúng theo sortBy (kiểm tra từng cặp liền kề).
          for (let i = 0; i + 1 < result.length; i++) {
            const a = result[i];
            const b = result[i + 1];
            if (sortBy === "newest") {
              expect(new Date(a.createdAt).getTime()).toBeGreaterThanOrEqual(
                new Date(b.createdAt).getTime(),
              );
            } else if (sortBy === "oldest") {
              expect(new Date(a.createdAt).getTime()).toBeLessThanOrEqual(
                new Date(b.createdAt).getTime(),
              );
            } else if (sortBy === "name") {
              expect(a.name.localeCompare(b.name)).toBeLessThanOrEqual(0);
            } else {
              expect(a.items.length).toBeGreaterThanOrEqual(b.items.length);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("groupBoardsByYear cho phân hoạch bảo toàn theo năm", () => {
    fc.assert(
      fc.property(arbBoards, (boards) => {
        const groups = groupBoardsByYear(boards);

        // (a) Mỗi board nằm đúng nhóm board.year.
        for (const [year, list] of Object.entries(groups)) {
          for (const board of list) {
            expect(board.year).toBe(year);
          }
        }

        // (b) Hợp mọi nhóm bằng đúng đa tập input.
        const union = Object.values(groups).flat();
        expect(sameMultiset(union, boards)).toBe(true);

        // (c) Không có key năm nào nằm ngoài các năm thực sự xuất hiện.
        const actualYears = new Set(boards.map((b) => b.year));
        for (const year of Object.keys(groups)) {
          expect(actualYears.has(year)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("resolveGroupedByYear true iff grid + searchTerm rỗng + sort newest", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VIEW_MODES),
        arbSearchTerm,
        fc.constantFrom(...SORTS),
        (viewMode, searchTerm, sortBy) => {
          const actual = resolveGroupedByYear(viewMode, searchTerm, sortBy);
          const expected = viewMode === "grid" && searchTerm === "" && sortBy === "newest";
          expect(actual).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});
