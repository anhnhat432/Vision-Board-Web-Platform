import { clampToUnitInterval, normalizeQuestionScore } from "./normalizeQuestionScore";

export type DimensionKey = "capacity" | "readiness" | "risk" | "context";

export type QuestionScoreAnswers = Record<number, number>;

export interface DimensionScores {
  capacity: number;
  readiness: number;
  risk: number;
  context: number;
}

const DIMENSION_QUESTION_IDS: Record<Exclude<DimensionKey, "context">, readonly number[]> = {
  capacity: [1, 2],
  readiness: [3, 4],
  risk: [5, 6],
};

const CONTEXT_QUESTION_ID = 7;

function getWheelNormalizedScore(wheelScore: number): number {
  const normalizedWheel = wheelScore <= 10 ? wheelScore / 10 : wheelScore / 100;
  return clampToUnitInterval(normalizedWheel);
}

function getNormalizedQuestionScore(
  answers: QuestionScoreAnswers,
  questionId: number,
): number {
  return normalizeQuestionScore(answers[questionId] ?? 1);
}

function averageNormalizedScores(scores: number[]): number {
  if (scores.length === 0) return 0;
  return clampToUnitInterval(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function calculateDimensionScore(
  dimensionKey: DimensionKey,
  answers: QuestionScoreAnswers,
  wheelScore: number,
): number {
  switch (dimensionKey) {
    case "capacity":
      return averageNormalizedScores(
        DIMENSION_QUESTION_IDS.capacity.map((id) =>
          getNormalizedQuestionScore(answers, id),
        ),
      );
    case "readiness":
      return averageNormalizedScores(
        DIMENSION_QUESTION_IDS.readiness.map((id) =>
          getNormalizedQuestionScore(answers, id),
        ),
      );
    case "risk":
      return averageNormalizedScores(
        DIMENSION_QUESTION_IDS.risk.map((id) =>
          getNormalizedQuestionScore(answers, id),
        ),
      );
    case "context": {
      const contextQuestionScore = getNormalizedQuestionScore(answers, CONTEXT_QUESTION_ID);
      const wheelNormalized = getWheelNormalizedScore(wheelScore);
      return clampToUnitInterval(contextQuestionScore * 0.8 + wheelNormalized * 0.2);
    }
    default:
      return 0;
  }
}

export function calculateDimensionScores(
  answers: QuestionScoreAnswers,
  wheelScore: number,
): DimensionScores {
  return {
    capacity: calculateDimensionScore("capacity", answers, wheelScore),
    readiness: calculateDimensionScore("readiness", answers, wheelScore),
    risk: calculateDimensionScore("risk", answers, wheelScore),
    context: calculateDimensionScore("context", answers, wheelScore),
  };
}
