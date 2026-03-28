import {
  calculateDimensionScore,
  calculateDimensionScores,
  type QuestionScoreAnswers,
} from "@/lib/feasibility";

describe("dimensionScore", () => {
  it("calculates averaging rules for capacity/readiness/risk", () => {
    const answers: QuestionScoreAnswers = {
      1: 4, // 1.0
      2: 1, // 0.0
      3: 2, // 0.333...
      4: 3, // 0.666...
      5: 4, // 1.0
      6: 2, // 0.333...
      7: 1,
    };

    expect(calculateDimensionScore("capacity", answers, 6)).toBeCloseTo(0.5, 6);
    expect(calculateDimensionScore("readiness", answers, 6)).toBeCloseTo(0.5, 6);
    expect(calculateDimensionScore("risk", answers, 6)).toBeCloseTo((1 + 1 / 3) / 2, 6);
  });

  it("calculates context with wheel score on 0-10 scale", () => {
    const answers: QuestionScoreAnswers = {
      1: 1,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
      6: 1,
      7: 4, // 1.0
    };

    // context = (Q7_norm * 0.8) + (wheelNormalized * 0.2)
    expect(calculateDimensionScore("context", answers, 7)).toBeCloseTo(0.94, 6);
  });

  it("calculates context with wheel score on 0-100 scale", () => {
    const answers: QuestionScoreAnswers = {
      1: 1,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
      6: 1,
      7: 2, // 0.333...
    };

    // context = (0.333... * 0.8) + (0.8 * 0.2)
    expect(calculateDimensionScore("context", answers, 80)).toBeCloseTo(
      (1 / 3) * 0.8 + 0.8 * 0.2,
      6,
    );
  });

  it("collects all normalized scores via calculateDimensionScores", () => {
    const answers: QuestionScoreAnswers = {
      1: 4,
      2: 1,
      3: 2,
      4: 3,
      5: 4,
      6: 2,
      7: 4,
    };

    const result = calculateDimensionScores(answers, 7);

    expect(result.capacity).toBeCloseTo(0.5, 6);
    expect(result.readiness).toBeCloseTo(0.5, 6);
    expect(result.risk).toBeCloseTo((1 + 1 / 3) / 2, 6);
    expect(result.context).toBeCloseTo(0.94, 6);
  });
});
