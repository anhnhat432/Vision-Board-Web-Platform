import assert from "node:assert/strict";

import { ApiError } from "../utils/apiError";

export const ownerUserId = "user_owner";
export const otherUserId = "user_other";

export const ids = {
  goal: "507f1f77bcf86cd799439011",
  otherGoal: "507f1f77bcf86cd799439012",
  plan: "507f1f77bcf86cd799439021",
  otherPlan: "507f1f77bcf86cd799439022",
  week: "507f1f77bcf86cd799439031",
  otherWeek: "507f1f77bcf86cd799439032",
  task: "507f1f77bcf86cd799439041",
  otherTask: "507f1f77bcf86cd799439042",
  metric: "507f1f77bcf86cd799439051",
  otherMetric: "507f1f77bcf86cd799439052",
  metricLog: "507f1f77bcf86cd799439053",
};

export async function assertApiError(
  action: Promise<unknown>,
  statusCode: number,
  messageIncludes?: string,
): Promise<void> {
  await assert.rejects(
    action,
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.statusCode, statusCode);
      if (messageIncludes) {
        assert.match(error.message, new RegExp(messageIncludes));
      }
      return true;
    },
  );
}
