import { calculateFeasibilityScore, type DimensionScores } from "@/lib/feasibility";
import { FEASIBILITY_WEIGHTS } from "@/lib/feasibility/config";

describe("feasibilityScore", () => {
  it("uses configured weights for final feasibility score", () => {
    const scores: DimensionScores = {
      capacity: 0.8,
      readiness: 0.6,
      risk: 0.5,
      context: 0.7,
    };

    const expected =
      scores.capacity * FEASIBILITY_WEIGHTS.capacity +
      scores.readiness * FEASIBILITY_WEIGHTS.readiness +
      scores.risk * FEASIBILITY_WEIGHTS.risk +
      scores.context * FEASIBILITY_WEIGHTS.context;

    expect(calculateFeasibilityScore(scores)).toBeCloseTo(expected, 10);
  });

  it("clamps final score to unit interval", () => {
    const tooHigh: DimensionScores = {
      capacity: 2,
      readiness: 2,
      risk: 2,
      context: 2,
    };

    const tooLow: DimensionScores = {
      capacity: -1,
      readiness: -1,
      risk: -1,
      context: -1,
    };

    expect(calculateFeasibilityScore(tooHigh)).toBe(1);
    expect(calculateFeasibilityScore(tooLow)).toBe(0);
  });
});
