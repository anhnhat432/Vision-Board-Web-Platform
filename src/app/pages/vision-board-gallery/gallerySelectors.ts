import type { VisionBoard } from "@/app/utils/storage";

/** Tuỳ chọn sắp xếp thư viện vision board. */
export type VisionBoardSort = "newest" | "oldest" | "name" | "items";

/** Số liệu thống kê hiển thị ở khối Bento của Library_Page. */
export interface GalleryStats {
  total: number;
  yearsCount: number;
  totalItemsCount: number;
  avgItems: number;
  distribution: { image: number; quote: number; icon: number };
}

/**
 * Lọc theo tên (case-insensitive, trim) + lọc năm + sắp xếp.
 * Bóc tách nguyên trạng logic `filteredAndSortedBoards` trong VisionBoardGallery.
 */
export function filterAndSortBoards(
  boards: readonly VisionBoard[],
  searchTerm: string,
  selectedYear: string,
  sortBy: VisionBoardSort,
): VisionBoard[] {
  let result = [...boards];

  // 1. Tìm kiếm theo tên
  if (searchTerm.trim() !== "") {
    const term = searchTerm.toLowerCase();
    result = result.filter((board) => board.name.toLowerCase().includes(term));
  }

  // 2. Lọc theo năm
  if (selectedYear !== "all") {
    result = result.filter((board) => board.year === selectedYear);
  }

  // 3. Sắp xếp
  result.sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "items") {
      return b.items.length - a.items.length;
    }
    return 0;
  });

  return result;
}

/**
 * Gom nhóm theo `year`, giữ thứ tự phần tử trong nhóm.
 * Bóc tách nguyên trạng logic `boardsByYear` trong VisionBoardGallery.
 */
export function groupBoardsByYear(
  boards: readonly VisionBoard[],
): Record<string, VisionBoard[]> {
  return boards.reduce(
    (acc, board) => {
      if (!acc[board.year]) acc[board.year] = [];
      acc[board.year].push(board);
      return acc;
    },
    {} as Record<string, VisionBoard[]>,
  );
}

/**
 * true khi viewMode grid + không search + sort newest (điều kiện gom nhóm hiện tại).
 * Bóc tách nguyên trạng `isGroupedByYear` trong VisionBoardGallery.
 */
export function resolveGroupedByYear(
  viewMode: "grid" | "list",
  searchTerm: string,
  sortBy: VisionBoardSort,
): boolean {
  return viewMode === "grid" && !searchTerm && sortBy === "newest";
}

/**
 * Tính stats (tổng, số năm, tổng phần tử, trung bình, phân bổ %).
 * Bóc tách nguyên trạng logic `totalItems` + `stats` trong VisionBoardGallery.
 */
export function computeGalleryStats(boards: readonly VisionBoard[]): GalleryStats {
  const total = boards.length;

  let imgCount = 0;
  let quoteCount = 0;
  let iconCount = 0;
  boards.forEach((b) => {
    b.items.forEach((item) => {
      if (item.type === "image") imgCount++;
      else if (item.type === "quote") quoteCount++;
      else if (item.type === "icon") iconCount++;
    });
  });

  const totalItems = boards.reduce((sum, board) => sum + board.items.length, 0);
  const yearsCount = new Set(boards.map((b) => b.year)).size;

  return {
    total,
    yearsCount,
    totalItemsCount: totalItems,
    avgItems: total ? Math.round(totalItems / total) : 0,
    distribution: {
      image: totalItems ? Math.round((imgCount / totalItems) * 100) : 0,
      quote: totalItems ? Math.round((quoteCount / totalItems) * 100) : 0,
      icon: totalItems ? Math.round((iconCount / totalItems) * 100) : 0,
    },
  };
}
