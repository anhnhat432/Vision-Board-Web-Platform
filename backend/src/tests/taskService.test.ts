import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TaskService } from "../services/taskService";
import { assertApiError, ids, otherUserId, ownerUserId } from "./testHelpers";

const now = new Date("2026-01-01T00:00:00.000Z");

function createTaskFixture() {
  const plans = new Map([
    [
      ids.plan,
      {
        id: ids.plan,
        userId: ownerUserId,
        vision: "Owner plan",
        startDate: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherPlan,
      {
        id: ids.otherPlan,
        userId: otherUserId,
        vision: "Other plan",
        startDate: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);
  const weeks = new Map([
    [
      ids.week,
      {
        id: ids.week,
        planId: ids.plan,
        weekNumber: 1,
        focus: "Week focus",
        expectedOutput: "Output",
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherWeek,
      {
        id: ids.otherWeek,
        planId: ids.otherPlan,
        weekNumber: 1,
        focus: "Other week",
        expectedOutput: "Other output",
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);
  const tasks = new Map([
    [
      ids.task,
      {
        id: ids.task,
        weekId: ids.week,
        title: "Initial task",
        status: "todo" as const,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      ids.otherTask,
      {
        id: ids.otherTask,
        weekId: ids.otherWeek,
        title: "Private task",
        status: "todo" as const,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  const planRepository = {
    async getPlanById(id: string) {
      return plans.get(id) ?? null;
    },
  };
  const weekRepository = {
    async getWeekById(id: string) {
      return weeks.get(id) ?? null;
    },
  };
  const taskRepository = {
    async addTask(data: Record<string, unknown>) {
      const task = {
        id: `507f1f77bcf86cd7994390${tasks.size + 70}`,
        status: "todo",
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      tasks.set(task.id, task as never);
      return task;
    },
    async getTaskById(id: string) {
      return tasks.get(id) ?? null;
    },
    async updateTask(id: string, updates: Record<string, unknown>) {
      const task = tasks.get(id);
      if (!task) return null;
      const updated = { ...task, ...updates, updatedAt: now };
      tasks.set(id, updated as never);
      return updated;
    },
    async deleteTask(id: string) {
      return tasks.delete(id);
    },
  };

  return {
    service: new TaskService(planRepository as never, weekRepository as never, taskRepository as never),
    tasks,
  };
}

describe("task CRUD", () => {
  it("adds a task to an owned week", async () => {
    const { service } = createTaskFixture();

    const task = await service.addTaskToWeek(ownerUserId, ids.week, {
      title: "  Draft launch notes  ",
      scheduledDate: "2026-02-01T00:00:00.000Z",
    });

    assert.equal(task.weekId, ids.week);
    assert.equal(task.title, "Draft launch notes");
    assert.equal(task.status, "todo");
    assert.equal(task.scheduledDate?.toISOString(), "2026-02-01T00:00:00.000Z");
  });

  it("updates and deletes an owned task", async () => {
    const { service, tasks } = createTaskFixture();

    const updated = await service.updateTask(ownerUserId, ids.task, {
      title: "  Updated task  ",
      status: "done",
    });
    assert.equal(updated?.title, "Updated task");
    assert.equal(updated?.status, "done");

    const deleted = await service.deleteTask(ownerUserId, ids.task);
    assert.equal(deleted, true);
    assert.equal(tasks.has(ids.task), false);
  });

  it("rejects cross-user task and week access", async () => {
    const { service } = createTaskFixture();

    await assertApiError(service.addTaskToWeek(ownerUserId, ids.otherWeek, { title: "Nope" }), 403, "access");
    await assertApiError(service.updateTask(ownerUserId, ids.otherTask, { status: "done" }), 403, "access");
  });

  it("rejects invalid task ids and invalid task payloads", async () => {
    const { service } = createTaskFixture();

    await assertApiError(service.updateTask(ownerUserId, "not-an-object-id", { status: "done" }), 400, "ObjectId");
    await assertApiError(service.addTaskToWeek(ownerUserId, ids.week, { title: "   " }), 400, "title");
    await assertApiError(service.updateTask(ownerUserId, ids.task, {}), 400, "at least one");
  });
});
