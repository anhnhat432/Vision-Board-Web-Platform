import { describe, expect, it } from "vitest";
import { getFocusInsight, type LifeAreaScore } from "./life-balance-insight";

const allAreas: LifeAreaScore[] = [
  { name: "Career", score: 5 },
  { name: "Finance", score: 6 },
  { name: "Health", score: 3 },
  { name: "Education", score: 7 },
  { name: "Relationships", score: 4 },
  { name: "Family", score: 8 },
  { name: "Personal Growth", score: 5 },
  { name: "Leisure", score: 2 },
];

describe("getFocusInsight", () => {
  // ── Test 1: Cùng lĩnh vực nhưng khi là thấp nhất vs cao nhất → headline KHÁC ──
  it("cùng lĩnh vực, thấp nhất vs cao nhất → headline khác nhau", () => {
    // Leisure score=2 là thấp nhất
    const leisure: LifeAreaScore = { name: "Leisure", score: 2 };
    const insightLowest = getFocusInsight(leisure, allAreas, "Giải trí");

    // Tạo tập dữ liệu mà Leisure là cao nhất
    const allAreasHigh: LifeAreaScore[] = [
      { name: "Career", score: 3 },
      { name: "Finance", score: 2 },
      { name: "Health", score: 1 },
      { name: "Leisure", score: 9 },
    ];
    const leisureHigh: LifeAreaScore = { name: "Leisure", score: 9 };
    const insightHighest = getFocusInsight(leisureHigh, allAreasHigh, "Giải trí");

    expect(insightLowest.headline).toContain("thấp nhất");
    expect(insightHighest.headline).toContain("thế mạnh lớn nhất");
    expect(insightLowest.headline).not.toBe(insightHighest.headline);
  });

  // ── Test 2: Hai lĩnh vực khác nhau → reason KHÁC nhau ──
  it("hai lĩnh vực khác nhau → reason khác nhau", () => {
    const career: LifeAreaScore = { name: "Career", score: 5 };
    const health: LifeAreaScore = { name: "Health", score: 3 };

    const careerInsight = getFocusInsight(career, allAreas, "Sự nghiệp");
    const healthInsight = getFocusInsight(health, allAreas, "Sức khỏe");

    expect(careerInsight.reason).toContain("Sự nghiệp");
    expect(healthInsight.reason).toContain("Sức khỏe");
    expect(careerInsight.reason).not.toBe(healthInsight.reason);
  });

  // ── Test 3: Cùng lĩnh vực, score=2 vs score=8 → tip sắc thái khác ──
  it("cùng lĩnh vực, score thấp vs cao → tip có sắc thái khác biệt", () => {
    const lowLeisure: LifeAreaScore = { name: "Leisure", score: 2 };
    const highLeisure: LifeAreaScore = { name: "Leisure", score: 8 };

    const lowInsight = getFocusInsight(lowLeisure, allAreas, "Giải trí");
    const highInsight = getFocusInsight(highLeisure, allAreas, "Giải trí");

    // Tip score thấp (<=3): chứa "phục hồi"
    expect(lowInsight.tip).toMatch(/phục hồi/i);
    // Tip score cao (>=7): chứa "bứt phá" hoặc "nâng tầm"
    expect(highInsight.tip).toMatch(/bứt phá|nâng tầm/i);
    // Hai tip phải khác nhau
    expect(lowInsight.tip).not.toBe(highInsight.tip);
  });

  // ── Test 4: headline chứa số điểm và giá trị trung bình ──
  it("headline chứa số điểm và giá trị trung bình", () => {
    const career: LifeAreaScore = { name: "Career", score: 5 };
    const insight = getFocusInsight(career, allAreas, "Sự nghiệp");

    // Phải chứa số điểm
    expect(insight.headline).toContain("5/10");

    // Phải chứa giá trị trung bình (sum=40, count=8, avg=5.0)
    expect(insight.headline).toContain("5.0");
  });

  // ── Bổ sung: tip dải giữa (4-6) chứa "củng cố" hoặc "nền tảng" ──
  it("tip dải trung bình chứa từ khóa củng cố nền tảng", () => {
    const career: LifeAreaScore = { name: "Career", score: 5 };
    const insight = getFocusInsight(career, allAreas, "Sự nghiệp");
    expect(insight.tip).toMatch(/củng cố|nền tảng/i);
  });

  // ── Bổ sung: headline cho area dưới trung bình ──
  it("headline cho area dưới trung bình có cụm 'dưới mức trung bình'", () => {
    const relationships: LifeAreaScore = { name: "Relationships", score: 4 };
    const insight = getFocusInsight(relationships, allAreas, "Mối quan hệ");
    expect(insight.headline).toContain("dưới mức trung bình");
    expect(insight.headline).toContain("dư địa");
  });

  // ── Bổ sung: headline cho area trên trung bình ──
  it("headline cho area trên trung bình có cụm 'trên trung bình'", () => {
    const finance: LifeAreaScore = { name: "Finance", score: 6 };
    const insight = getFocusInsight(finance, allAreas, "Tài chính");
    expect(insight.headline).toContain("trên trung bình");
    expect(insight.headline).toContain("thế mạnh bền vững");
  });
});
