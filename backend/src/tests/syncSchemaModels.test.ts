import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { GoalModel } from "../models/GoalModel";
import { LeadMetricModel } from "../models/LeadMetricModel";
import { PlanModel } from "../models/PlanModel";
import { TaskModel } from "../models/TaskModel";
import { WeekModel } from "../models/WeekModel";
import { WeekReviewModel } from "../models/WeekReviewModel";

type SchemaPath = {
  options?: Record<string, unknown>;
};

type SchemaLike = {
  path(name: string): SchemaPath | undefined;
  indexes(): Array<[Record<string, unknown>, Record<string, unknown>]>;
};

type ModelLike = {
  schema: SchemaLike;
};

function asModelLike(model: unknown): ModelLike {
  return model as ModelLike;
}

function getPathOptions(model: ModelLike, pathName: string): Record<string, unknown> {
  const schemaPath = model.schema.path(pathName);
  assert.ok(schemaPath, `${pathName} schema path should exist`);
  return schemaPath.options ?? {};
}

function hasMatchingKeys(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  const expectedEntries = Object.entries(expected);
  return (
    Object.keys(actual).length === expectedEntries.length &&
    expectedEntries.every(([key, value]) => actual[key] === value)
  );
}

function assertIndex(
  model: ModelLike,
  keys: Record<string, unknown>,
  options: { unique?: boolean; partialField?: string } = {},
): void {
  const index = model.schema.indexes().find(([candidateKeys]) => hasMatchingKeys(candidateKeys, keys));
  assert.ok(index, `Expected index ${JSON.stringify(keys)} to exist`);

  const [, indexOptions] = index;
  if (options.unique !== undefined) {
    assert.equal(indexOptions.unique, options.unique);
  }
  if (options.partialField) {
    assert.deepEqual(indexOptions.partialFilterExpression, {
      [options.partialField]: { $type: "string" },
    });
  }
}

function assertSharedSyncFields(model: ModelLike): void {
  for (const field of ["deletedAt", "lastMutationId", "syncUpdatedAt"]) {
    assert.equal(getPathOptions(model, field).required, false);
  }

  const revisionOptions = getPathOptions(model, "revision");
  assert.equal(revisionOptions.required, false);
  assert.equal(revisionOptions.default, 1);
}

describe("sync-ready schema metadata", () => {
  it("adds optional client ids and sync metadata without making legacy records invalid", () => {
    const modelFields = [
      [asModelLike(GoalModel), ["clientGoalId"]],
      [asModelLike(PlanModel), ["clientPlanId", "clientGoalId"]],
      [asModelLike(WeekModel), ["clientWeekId", "clientPlanId"]],
      [asModelLike(TaskModel), ["clientTaskId", "clientWeekId", "clientPlanId"]],
      [asModelLike(LeadMetricModel), ["clientMetricId", "clientWeekId", "clientPlanId"]],
      [asModelLike(WeekReviewModel), ["clientPlanId", "clientWeekId", "clientReviewId"]],
    ] as const;

    for (const [model, clientFields] of modelFields) {
      assertSharedSyncFields(model);
      for (const field of clientFields) {
        assert.equal(getPathOptions(model, field).required, false);
      }
    }

    assertSharedSyncFields(asModelLike(DailyCheckInModel));
    assert.equal(getPathOptions(asModelLike(DailyCheckInModel), "clientGoalId").required, false);
    assert.equal(getPathOptions(asModelLike(DailyCheckInModel), "clientWeekId").required, false);
    assert.equal(getPathOptions(asModelLike(DailyCheckInModel), "clientCheckInId").required, false);
    assert.equal(getPathOptions(asModelLike(DailyCheckInModel), "clientPlanId").required, true);
    assert.equal(getPathOptions(asModelLike(DailyCheckInModel), "localDate").required, true);
  });

  it("adds safe partial indexes for client id lookup and future delta pull", () => {
    assertIndex(asModelLike(GoalModel), { userId: 1, clientGoalId: 1 }, { unique: true, partialField: "clientGoalId" });
    assertIndex(asModelLike(GoalModel), { userId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(asModelLike(PlanModel), { userId: 1, clientPlanId: 1 }, { unique: true, partialField: "clientPlanId" });
    assertIndex(asModelLike(PlanModel), { userId: 1, clientGoalId: 1 }, { partialField: "clientGoalId" });
    assertIndex(asModelLike(PlanModel), { userId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(asModelLike(WeekModel), { planId: 1, clientWeekId: 1 }, { unique: true, partialField: "clientWeekId" });
    assertIndex(asModelLike(WeekModel), { planId: 1, clientPlanId: 1 }, { partialField: "clientPlanId" });
    assertIndex(asModelLike(WeekModel), { planId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(asModelLike(TaskModel), { weekId: 1, clientTaskId: 1 }, { unique: true, partialField: "clientTaskId" });
    assertIndex(asModelLike(TaskModel), { weekId: 1, clientWeekId: 1 }, { partialField: "clientWeekId" });
    assertIndex(asModelLike(TaskModel), { weekId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(
      asModelLike(LeadMetricModel),
      { weekId: 1, clientMetricId: 1 },
      { unique: true, partialField: "clientMetricId" },
    );
    assertIndex(asModelLike(LeadMetricModel), { weekId: 1, clientWeekId: 1 }, { partialField: "clientWeekId" });
    assertIndex(asModelLike(LeadMetricModel), { weekId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(asModelLike(DailyCheckInModel), { userId: 1, clientPlanId: 1, localDate: 1 }, { unique: true });
    assertIndex(
      asModelLike(DailyCheckInModel),
      { userId: 1, clientCheckInId: 1 },
      { unique: true, partialField: "clientCheckInId" },
    );
    assertIndex(asModelLike(DailyCheckInModel), { userId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(
      asModelLike(WeekReviewModel),
      { userId: 1, clientPlanId: 1, weekNumber: 1 },
      { unique: true },
    );
    assertIndex(
      asModelLike(WeekReviewModel),
      { userId: 1, clientReviewId: 1 },
      { unique: true },
    );
    assertIndex(asModelLike(WeekReviewModel), { userId: 1, syncUpdatedAt: 1, _id: 1 });
  });
});
