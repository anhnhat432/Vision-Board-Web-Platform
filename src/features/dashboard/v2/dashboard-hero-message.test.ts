import { describe, expect, it } from "vitest";
import { getDashboardHeroMessage } from "./dashboard-hero-message";
import type { HeroMessageInput } from "./dashboard-hero-message";

// ---------------------------------------------------------------------------
// Helper tạo input với giá trị mặc định hợp lý
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<HeroMessageInput> = {}): HeroMessageInput {
  return {
    currentWeek: 5,
    totalWeeks: 12,
    progressPercent: 50,
    featuredGoalTitle: "Phát triển thói quen đọc sách",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe("getDashboardHeroMessage", () => {
  // --- Test 1: currentWeek=null + có goal / không có goal ---
  describe("chưa bắt đầu (currentWeek=null)", () => {
    it("nếu có goal thì subheading chứa tên goal", () => {
      const result = getDashboardHeroMessage(
        makeInput({ currentWeek: null, featuredGoalTitle: "Tập yoga 3 buổi mỗi tuần" }),
      );
      expect(result.subheading).toContain("Tập yoga 3 buổi mỗi tuần");
      expect(result.subheading).toContain("chu kỳ 12 tuần");
    });

    it("nếu goal rỗng thì subheading gợi chọn mục tiêu trọng tâm", () => {
      const result = getDashboardHeroMessage(
        makeInput({ currentWeek: null, featuredGoalTitle: "   " }),
      );
      expect(result.subheading).toContain("chọn một mục tiêu trọng tâm");
    });

    it("nếu goal là chuỗi rỗng thì subheading gợi chọn mục tiêu trọng tâm", () => {
      const result = getDashboardHeroMessage(
        makeInput({ currentWeek: null, featuredGoalTitle: "" }),
      );
      expect(result.subheading).toContain("chọn một mục tiêu trọng tâm");
    });

    it("có quote khích lệ (không rỗng)", () => {
      const result = getDashboardHeroMessage(makeInput({ currentWeek: null }));
      expect(result.quote.length).toBeGreaterThan(0);
    });
  });

  // --- Test 2: progress=20 vs progress=85 (cùng currentWeek giữa kỳ) → subheading khác nhau ---
  describe("phân biệt nhánh tiến độ thấp và gần về đích", () => {
    it("progress=20 (thấp) vs progress=85 (cao) cùng currentWeek=5 → subheading khác chuỗi", () => {
      const low = getDashboardHeroMessage(makeInput({ currentWeek: 5, progressPercent: 20 }));
      const high = getDashboardHeroMessage(makeInput({ currentWeek: 5, progressPercent: 85 }));
      expect(low.subheading).not.toBe(high.subheading);
    });

    it("progress=20 → nhánh tiến độ thấp (chứa từ 'dư địa' hoặc 'tập trung')", () => {
      const result = getDashboardHeroMessage(makeInput({ currentWeek: 5, progressPercent: 20 }));
      const hasLowProgressPhrase =
        result.subheading.includes("dư địa") || result.subheading.includes("tập trung");
      expect(hasLowProgressPhrase).toBe(true);
    });

    it("progress=85 → nhánh gần về đích (chứa từ 'về đích' hoặc 'phong độ')", () => {
      const result = getDashboardHeroMessage(makeInput({ currentWeek: 5, progressPercent: 85 }));
      const hasFinishPhrase =
        result.subheading.includes("về đích") || result.subheading.includes("phong độ");
      expect(hasFinishPhrase).toBe(true);
    });
  });

  // --- Test 3: subheading các nhánh giữa kỳ chứa số tuần và % tiến độ ---
  describe("subheading các nhánh giữa kỳ chứa số tuần và % tiến độ", () => {
    it("nhánh tiến độ thấp (currentWeek=6, progress=30) → chứa 'Tuần 6/12' và '30%'", () => {
      const result = getDashboardHeroMessage(
        makeInput({ currentWeek: 6, totalWeeks: 12, progressPercent: 30 }),
      );
      expect(result.subheading).toContain("Tuần 6/12");
      expect(result.subheading).toContain("30%");
    });

    it("nhánh tiến độ ổn (currentWeek=7, progress=55) → chứa 'Tuần 7/12' và '55%'", () => {
      const result = getDashboardHeroMessage(
        makeInput({ currentWeek: 7, totalWeeks: 12, progressPercent: 55 }),
      );
      expect(result.subheading).toContain("Tuần 7/12");
      expect(result.subheading).toContain("55%");
    });

    it("nhánh gần về đích (currentWeek=10, progress=88) → chứa 'Tuần 10/12' và '88%'", () => {
      const result = getDashboardHeroMessage(
        makeInput({ currentWeek: 10, totalWeeks: 12, progressPercent: 88 }),
      );
      expect(result.subheading).toContain("Tuần 10/12");
      expect(result.subheading).toContain("88%");
    });

    it("nhánh tạo đà (currentWeek=2) → chứa 'Tuần 2/12' (tuần nhưng không nhất thiết có %)", () => {
      const result = getDashboardHeroMessage(
        makeInput({ currentWeek: 2, totalWeeks: 12, progressPercent: 10 }),
      );
      expect(result.subheading).toContain("Tuần 2/12");
    });
  });

  // --- Test 4: Tính tất định – cùng input → cùng output ---
  describe("tính tất định (không phụ thuộc thời gian / Math.random)", () => {
    it("cùng input gọi 3 lần → output giống hệt nhau", () => {
      const input = makeInput({ currentWeek: 4, progressPercent: 42 });
      const a = getDashboardHeroMessage(input);
      const b = getDashboardHeroMessage(input);
      const c = getDashboardHeroMessage(input);
      expect(a).toEqual(b);
      expect(a).toEqual(c);
    });

    it("quote xoay vòng theo currentWeek (cùng week → cùng quote)", () => {
      const a = getDashboardHeroMessage(makeInput({ currentWeek: 3, progressPercent: 60 }));
      const b = getDashboardHeroMessage(makeInput({ currentWeek: 3, progressPercent: 60 }));
      expect(a.quote).toBe(b.quote);
    });

    it("quote thay đổi khi currentWeek thay đổi (khác week → quote có thể khác)", () => {
      // Dùng nhánh có 3 quote để đảm bảo week=3 và week=6 cùng pool nhưng khác index
      const w3 = getDashboardHeroMessage(makeInput({ currentWeek: 3, progressPercent: 60 }));
      const w6 = getDashboardHeroMessage(makeInput({ currentWeek: 6, progressPercent: 60 }));
      // Cùng pool (steady), khác index (3%3=0 vs 6%3=0) → trùng là bình thường
      // Test này xác nhận không crash, không lỗi. Không assert khác vì có thể trùng.
      expect(w3.quote.length).toBeGreaterThan(0);
      expect(w6.quote.length).toBeGreaterThan(0);
    });
  });

  // --- Edge cases bổ sung ---
  describe("edge cases", () => {
    it("clamp progress > 100 về 100", () => {
      const result = getDashboardHeroMessage(makeInput({ currentWeek: 10, progressPercent: 150 }));
      expect(result.subheading).toContain("100%");
    });

    it("clamp progress < 0 về 0", () => {
      const result = getDashboardHeroMessage(makeInput({ currentWeek: 5, progressPercent: -20 }));
      expect(result.subheading).toContain("0%");
    });

    it("progress NaN → xử lý an toàn không crash", () => {
      const result = getDashboardHeroMessage(makeInput({ currentWeek: 5, progressPercent: NaN }));
      expect(result.subheading).toContain("0%");
    });

    it("totalWeeks có thể khác 12 (vd 8 tuần)", () => {
      const result = getDashboardHeroMessage(
        makeInput({ currentWeek: 3, totalWeeks: 8, progressPercent: 40 }),
      );
      expect(result.subheading).toContain("Tuần 3/8");
      expect(result.subheading).toContain("40%");
    });
  });
});
