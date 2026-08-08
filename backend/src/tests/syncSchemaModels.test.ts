import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DailyCheckInModel } from "../models/DailyCheckInModel";
import { DiscountModel } from "../models/DiscountModel";
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
  options: { unique?: boolean; partialField?: string; tombstoneScoped?: boolean; partialExpression?: Record<string, unknown> } = {},
): void {
  const index = model.schema.indexes().find(([candidateKeys]) => hasMatchingKeys(candidateKeys, keys));
  assert.ok(index, `Expected index ${JSON.stringify(keys)} to exist`);

  const [, indexOptions] = index;
  if (options.unique !== undefined) {
    assert.equal(indexOptions.unique, options.unique);
  }
  if (options.partialExpression) {
    assert.deepEqual(indexOptions.partialFilterExpression, options.partialExpression);
  } else if (options.partialField) {
    assert.deepEqual(indexOptions.partialFilterExpression, {
      [options.partialField]: { $type: "string" },
      ...(options.tombstoneScoped ? { deletedAt: null } : {}),
    });
  } else if (options.tombstoneScoped) {
    assert.deepEqual(indexOptions.partialFilterExpression, { deletedAt: null });
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
    assertIndex(asModelLike(GoalModel), { userId: 1, clientGoalId: 1 }, { unique: true, partialField: "clientGoalId", tombstoneScoped: true });
    assertIndex(asModelLike(GoalModel), { userId: 1, deletedAt: 1 });
    assertIndex(asModelLike(GoalModel), { userId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(asModelLike(PlanModel), { userId: 1, clientPlanId: 1 }, { unique: true, partialField: "clientPlanId", tombstoneScoped: true });
    assertIndex(asModelLike(PlanModel), { userId: 1, clientGoalId: 1 }, { partialField: "clientGoalId", tombstoneScoped: true });
    assertIndex(asModelLike(PlanModel), { userId: 1, deletedAt: 1 });
    assertIndex(asModelLike(PlanModel), { userId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(asModelLike(WeekModel), { planId: 1, weekNumber: 1 }, { unique: true, tombstoneScoped: true });
    assertIndex(asModelLike(WeekModel), { planId: 1, clientWeekId: 1 }, { unique: true, partialField: "clientWeekId", tombstoneScoped: true });
    assertIndex(asModelLike(WeekModel), { planId: 1, clientPlanId: 1 }, { partialField: "clientPlanId", tombstoneScoped: true });
    assertIndex(asModelLike(WeekModel), { planId: 1, deletedAt: 1 });
    assertIndex(asModelLike(WeekModel), { planId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(asModelLike(TaskModel), { weekId: 1, clientTaskId: 1 }, { unique: true, partialField: "clientTaskId", tombstoneScoped: true });
    assertIndex(asModelLike(TaskModel), { weekId: 1, clientWeekId: 1 }, { partialField: "clientWeekId", tombstoneScoped: true });
    assertIndex(asModelLike(TaskModel), { weekId: 1, deletedAt: 1 });
    assertIndex(asModelLike(TaskModel), { weekId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(
      asModelLike(LeadMetricModel),
      { userId: 1, clientPlanId: 1, clientWeekId: 1, clientMetricId: 1 },
      {
        unique: true,
        partialExpression: {
          userId: { $type: "string" },
          clientPlanId: { $type: "string" },
          clientWeekId: { $type: "string" },
          clientMetricId: { $type: "string" },
          deletedAt: null,
        },
      },
    );
    assertIndex(
      asModelLike(LeadMetricModel),
      { weekId: 1, clientMetricId: 1 },
      { unique: true, partialField: "clientMetricId", tombstoneScoped: true },
    );
    assertIndex(asModelLike(LeadMetricModel), { weekId: 1, clientWeekId: 1 }, { partialField: "clientWeekId", tombstoneScoped: true });
    assertIndex(asModelLike(LeadMetricModel), { weekId: 1, deletedAt: 1 });
    assertIndex(asModelLike(LeadMetricModel), { weekId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(asModelLike(DailyCheckInModel), { userId: 1, clientPlanId: 1, localDate: 1 }, { unique: true, tombstoneScoped: true });
    assertIndex(
      asModelLike(DailyCheckInModel),
      { userId: 1, clientCheckInId: 1 },
      { unique: true, partialField: "clientCheckInId", tombstoneScoped: true },
    );
    assertIndex(asModelLike(DailyCheckInModel), { userId: 1, deletedAt: 1 });
    assertIndex(asModelLike(DailyCheckInModel), { userId: 1, syncUpdatedAt: 1, _id: 1 });

    assertIndex(asModelLike(WeekReviewModel), { weekId: 1 }, { unique: true, tombstoneScoped: true });
    assertIndex(
      asModelLike(WeekReviewModel),
      { userId: 1, clientPlanId: 1, weekNumber: 1 },
      {
        unique: true,
        partialExpression: { userId: { $type: "string" }, clientPlanId: { $type: "string" }, deletedAt: null },
      },
    );
    assertIndex(
      asModelLike(WeekReviewModel),
      { userId: 1, clientReviewId: 1 },
      {
        unique: true,
        partialExpression: { userId: { $type: "string" }, clientReviewId: { $type: "string" }, deletedAt: null },
      },
    );
    assertIndex(asModelLike(WeekReviewModel), { userId: 1, deletedAt: 1 });
    assertIndex(asModelLike(WeekReviewModel), { userId: 1, syncUpdatedAt: 1, _id: 1 });
  });

  it("keeps canonical weekly review fields additive and accepts legacy documents", () => {
    const optionalFields = [
      "commitmentsKept",
      "commitmentsMissed",
      "insights",
      "nextWeekCommitments",
      "keepTactic",
      "reduceTactic",
      "lastReviewAt",
    ];

    for (const field of optionalFields) {
      assert.equal(getPathOptions(asModelLike(WeekReviewModel), field).required, false);
    }

    const canonicalReview = new WeekReviewModel({
      weekId: "64f000000000000000000001",
      weekNumber: 4,
      executionScore: 81,
      commitmentsKept: [" Deep work ", "", "Exercise"],
      commitmentsMissed: ["Exercise"],
      insights: "Morning work was more reliable",
      nextWeekCommitments: ["Finish portfolio", "Train twice"],
      keepTactic: "Morning deep work",
      reduceTactic: "Optional evening work",
      lastReviewAt: new Date("2026-08-08T08:00:00.000Z"),
    });
    assert.equal(canonicalReview.validateSync(), undefined);
    assert.deepEqual(canonicalReview.commitmentsKept, ["Deep work", "Exercise"]);

    const legacyReview = new WeekReviewModel({
      weekId: "64f000000000000000000002",
      weekNumber: 3,
      executionScore: 60,
      reflection: "Legacy reflection",
      adjustments: "Legacy adjustment",
    });
    assert.equal(legacyReview.validateSync(), undefined);
  });

  it("keeps discount code unique through one schema source", () => {
    const discountModel = asModelLike(DiscountModel);
    assert.equal(getPathOptions(discountModel, "code").unique, true);

    const codeIndexes = discountModel.schema
      .indexes()
      .filter(([keys]) => hasMatchingKeys(keys, { code: 1 }));

    assert.equal(codeIndexes.length, 1);
    assert.equal(codeIndexes[0]?.[1].unique, true);
  });
});
