import type { BulkSyncRequest } from "../types/bulkSync";

const MAX_TOTAL_ITEMS = 500;
const VALID_TASK_STATUSES = new Set(["todo", "doing", "done"]);

interface ValidationOk {
  ok: true;
  data: BulkSyncRequest;
}

interface ValidationFail {
  ok: false;
  message: string;
}

type ValidationResult = ValidationOk | ValidationFail;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateWeeks(weeks: unknown): string | null {
  if (!Array.isArray(weeks)) return "weeks must be an array.";
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    if (!isRecord(w)) return `weeks[${i}] must be an object.`;
    if (typeof w.weekId !== "string" || !w.weekId.trim()) return `weeks[${i}].weekId is required.`;
  }
  return null;
}

function validateTasks(tasks: unknown): string | null {
  if (!Array.isArray(tasks)) return "tasks must be an array.";
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (!isRecord(t)) return `tasks[${i}] must be an object.`;
    if (typeof t.weekId !== "string" || !t.weekId.trim()) return `tasks[${i}].weekId is required.`;
    if (typeof t.title !== "string") return `tasks[${i}].title must be a string.`;
    if (t.status !== undefined && !VALID_TASK_STATUSES.has(t.status as string)) {
      return `tasks[${i}].status must be one of: todo, doing, done.`;
    }
  }
  return null;
}

function validateMetricLogs(logs: unknown): string | null {
  if (!Array.isArray(logs)) return "metricLogs must be an array.";
  for (let i = 0; i < logs.length; i++) {
    const l = logs[i];
    if (!isRecord(l)) return `metricLogs[${i}] must be an object.`;
    if (typeof l.weekId !== "string" || !l.weekId.trim()) return `metricLogs[${i}].weekId is required.`;
    if (typeof l.metricName !== "string" || !l.metricName.trim()) return `metricLogs[${i}].metricName is required.`;
    if (typeof l.date !== "string" || !l.date.trim()) return `metricLogs[${i}].date is required.`;
    if (typeof l.value !== "number" || !Number.isFinite(l.value)) return `metricLogs[${i}].value must be a number.`;
    if (typeof l.completed !== "boolean") return `metricLogs[${i}].completed must be a boolean.`;
  }
  return null;
}

function validateReviews(reviews: unknown): string | null {
  if (!Array.isArray(reviews)) return "reviews must be an array.";
  for (let i = 0; i < reviews.length; i++) {
    const r = reviews[i];
    if (!isRecord(r)) return `reviews[${i}] must be an object.`;
    if (typeof r.weekId !== "string" || !r.weekId.trim()) return `reviews[${i}].weekId is required.`;
    if (typeof r.weekNumber !== "number" || !Number.isInteger(r.weekNumber) || r.weekNumber < 1 || r.weekNumber > 12) {
      return `reviews[${i}].weekNumber must be an integer 1–12.`;
    }
    if (typeof r.executionScore !== "number" || !Number.isFinite(r.executionScore)) {
      return `reviews[${i}].executionScore must be a number.`;
    }
  }
  return null;
}

export function validateBulkSyncRequest(body: unknown): ValidationResult {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const weeks = body.weeks ?? [];
  const tasks = body.tasks ?? [];
  const metricLogs = body.metricLogs ?? [];
  const reviews = body.reviews ?? [];

  if (!Array.isArray(weeks) || !Array.isArray(tasks) || !Array.isArray(metricLogs) || !Array.isArray(reviews)) {
    return { ok: false, message: "weeks, tasks, metricLogs, and reviews must be arrays (or omitted)." };
  }

  const totalItems = weeks.length + tasks.length + metricLogs.length + reviews.length;
  if (totalItems > MAX_TOTAL_ITEMS) {
    return { ok: false, message: `Total items (${totalItems}) exceeds the limit of ${MAX_TOTAL_ITEMS}.` };
  }

  if (totalItems === 0) {
    return { ok: false, message: "At least one item (week, task, metricLog, or review) is required." };
  }

  if (weeks.length > 0) {
    const err = validateWeeks(weeks);
    if (err) return { ok: false, message: err };
  }

  if (tasks.length > 0) {
    const err = validateTasks(tasks);
    if (err) return { ok: false, message: err };
  }

  if (metricLogs.length > 0) {
    const err = validateMetricLogs(metricLogs);
    if (err) return { ok: false, message: err };
  }

  if (reviews.length > 0) {
    const err = validateReviews(reviews);
    if (err) return { ok: false, message: err };
  }

  return {
    ok: true,
    data: {
      weeks: weeks as BulkSyncRequest["weeks"],
      tasks: tasks as BulkSyncRequest["tasks"],
      metricLogs: metricLogs as BulkSyncRequest["metricLogs"],
      reviews: reviews as BulkSyncRequest["reviews"],
    },
  };
}
