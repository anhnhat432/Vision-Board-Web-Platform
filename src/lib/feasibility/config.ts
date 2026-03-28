import type { DimensionKey } from "./dimensionScore";

export const FEASIBILITY_WEIGHTS: Record<DimensionKey, number> = {
  capacity: 0.3,
  readiness: 0.3,
  risk: 0.2,
  context: 0.2,
};
