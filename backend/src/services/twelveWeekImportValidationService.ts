import { ApiError } from "../utils/apiError";

export interface TwelveWeekImportValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface TwelveWeekImportEntityCounts {
  goals: number;
  plans: number;
  weeks: number;
  tasks: number;
  leadIndicators: number;
  leadMetrics: number;
  dailyCheckIns: number;
  weeklyReviews: number;
}

export interface TwelveWeekImportValidationReport {
  status: "valid" | "invalid";
  mode: "validate_only";
  dryRun: true;
  acceptedEntityCounts: TwelveWeekImportEntityCounts;
  warnings: TwelveWeekImportValidationIssue[];
  errors: TwelveWeekImportValidationIssue[];
  normalizedClientIdsCount: number;
  idempotencyKey?: string;
  requestId?: string;
}

export interface TwelveWeekImportValidatedGoal {
  path: string;
  value: Record<string, unknown>;
}

export interface TwelveWeekImportValidationBundle {
  report: TwelveWeekImportValidationReport;
  goals: TwelveWeekImportValidatedGoal[];
}

interface ValidationContext {
  errors: TwelveWeekImportValidationIssue[];
  warnings: TwelveWeekImportValidationIssue[];
  counts: TwelveWeekImportEntityCounts;
  normalizedClientIds: Set<string>;
  idempotencyKey?: string;
  requestId?: string;
}

const MAX_IMPORT_VALIDATE_PAYLOAD_BYTES = 512 * 1024;
const MAX_CLIENT_ID_LENGTH = 120;
const MAX_IDEMPOTENCY_KEY_LENGTH = 240;
const MAX_GOALS_PER_REQUEST = 10;
const MAX_WEEKS_PER_PLAN = 12;
const MAX_TASKS_PER_PLAN = 500;
const MAX_LEAD_INDICATORS_PER_PLAN = 50;
const MAX_LEAD_METRICS_PER_PLAN = 200;
const MAX_DAILY_CHECK_INS_PER_PLAN = 366;
const MAX_WEEKLY_REVIEWS_PER_PLAN = 12;
const DAY_IN_MS = 86_400_000;

function createCounts(): TwelveWeekImportEntityCounts {
  return {
    goals: 0,
    plans: 0,
    weeks: 0,
    tasks: 0,
    leadIndicators: 0,
    leadMetrics: 0,
    dailyCheckIns: 0,
    weeklyReviews: 0,
  };
}

function createContext(): ValidationContext {
  return {
    errors: [],
    warnings: [],
    counts: createCounts(),
    normalizedClientIds: new Set<string>(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function addIssue(
  issues: TwelveWeekImportValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

function addError(ctx: ValidationContext, path: string, code: string, message: string): void {
  addIssue(ctx.errors, path, code, message);
}

function addWarning(ctx: ValidationContext, path: string, code: string, message: string): void {
  addIssue(ctx.warnings, path, code, message);
}

function asRecord(value: unknown, path: string, ctx: ValidationContext): Record<string, unknown> | null {
  if (!isRecord(value)) {
    addError(ctx, path, "invalid_object", `${path} must be an object.`);
    return null;
  }

  return value;
}

function validateOptionalString(
  value: unknown,
  path: string,
  ctx: ValidationContext,
  maxLength = MAX_CLIENT_ID_LENGTH,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    addError(ctx, path, "invalid_string", `${path} must be a string.`);
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    addError(ctx, path, "empty_string", `${path} cannot be empty.`);
    return undefined;
  }
  if (trimmed.length > maxLength) {
    addError(ctx, path, "string_too_long", `${path} cannot exceed ${maxLength} characters.`);
    return undefined;
  }

  return trimmed;
}

function validateOptionalBoolean(value: unknown, path: string, ctx: ValidationContext): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    addError(ctx, path, "invalid_boolean", `${path} must be a boolean.`);
    return undefined;
  }

  return value;
}

function validateOptionalNumber(value: unknown, path: string, ctx: ValidationContext): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    addError(ctx, path, "invalid_number", `${path} must be a finite number.`);
    return undefined;
  }

  return value;
}

function validateOptionalNumberRange(
  value: unknown,
  path: string,
  ctx: ValidationContext,
  min: number,
  max: number,
): number | undefined {
  const numberValue = validateOptionalNumber(value, path, ctx);
  if (numberValue === undefined) return undefined;
  if (numberValue < min || numberValue > max) {
    addError(ctx, path, "invalid_number_range", `${path} must be between ${min} and ${max}.`);
    return undefined;
  }

  return numberValue;
}

function validateOptionalSchedule(value: unknown, path: string, ctx: ValidationContext): void {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value)) {
    addError(ctx, path, "invalid_array", `${path} must be an array.`);
    return;
  }

  value.forEach((day, index) => {
    if (!Number.isInteger(day)) {
      addError(ctx, `${path}[${index}]`, "invalid_number", `${path}[${index}] must be an integer.`);
    }
  });
}

function validateOptionalMood(value: unknown, path: string, ctx: ValidationContext): void {
  if (value === undefined || value === null || value === "") return;
  if (value !== "low" && value !== "steady" && value !== "high") {
    addError(ctx, path, "invalid_mood", `${path} must be low, steady, or high.`);
  }
}

function validateOptionalWorkloadDecision(value: unknown, path: string, ctx: ValidationContext): void {
  if (value === undefined || value === null) return;
  if (value !== "keep same" && value !== "reduce slightly" && value !== "increase slightly" && value !== "") {
    addError(ctx, path, "invalid_workload_decision", `${path} must be a supported workload decision.`);
  }
}

function validateRequiredString(
  value: unknown,
  path: string,
  ctx: ValidationContext,
  maxLength = MAX_CLIENT_ID_LENGTH,
): string | null {
  const validated = validateOptionalString(value, path, ctx, maxLength);
  if (!validated) {
    if (value === undefined) {
      addError(ctx, path, "required", `${path} is required.`);
    }
    return null;
  }

  return validated;
}

function validateRequiredClientId(value: unknown, path: string, ctx: ValidationContext): string | null {
  const id = validateRequiredString(value, path, ctx);
  if (id) ctx.normalizedClientIds.add(id);
  return id;
}

function validateOptionalClientId(value: unknown, path: string, ctx: ValidationContext): string | undefined {
  const id = validateOptionalString(value, path, ctx);
  if (id) ctx.normalizedClientIds.add(id);
  return id;
}

function validateOptionalIdempotencyKey(value: unknown, path: string, ctx: ValidationContext): string | undefined {
  return validateOptionalString(value, path, ctx, MAX_IDEMPOTENCY_KEY_LENGTH);
}

function validateArray(
  value: unknown,
  path: string,
  ctx: ValidationContext,
  maxLength: number,
  options: { required?: boolean; minLength?: number } = {},
): unknown[] | null {
  if (value === undefined) {
    if (options.required) addError(ctx, path, "required", `${path} is required.`);
    return null;
  }

  if (!Array.isArray(value)) {
    addError(ctx, path, "invalid_array", `${path} must be an array.`);
    return null;
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    addError(ctx, path, "array_too_short", `${path} must contain at least ${options.minLength} item.`);
  }
  if (value.length > maxLength) {
    addError(ctx, path, "array_too_long", `${path} cannot contain more than ${maxLength} items.`);
  }

  return value;
}

function validateOptionalStringArray(value: unknown, path: string, ctx: ValidationContext, maxItems = 5): void {
  if (value === undefined || value === null) return;
  const items = validateArray(value, path, ctx, maxItems);
  if (!items) return;

  items.forEach((item, index) => {
    validateOptionalString(item, `${path}[${index}]`, ctx, 1000);
  });
}

function validateOptionalIsoDate(value: unknown, path: string, ctx: ValidationContext): void {
  if (value === undefined || value === null) return;
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(new Date(value).valueOf())) {
    addError(ctx, path, "invalid_date", `${path} must be a valid ISO date string.`);
  }
}

function validateWeekNumber(value: unknown, path: string, ctx: ValidationContext): number | null {
  if (!Number.isInteger(value)) {
    addError(ctx, path, "invalid_week_number", `${path} must be an integer between 1 and 12.`);
    return null;
  }

  const weekNumber = value as number;
  if (weekNumber < 1 || weekNumber > MAX_WEEKS_PER_PLAN) {
    addError(ctx, path, "invalid_week_number", `${path} must be between 1 and 12.`);
    return null;
  }

  return weekNumber;
}

function validateOptionalWeekNumber(value: unknown, path: string, ctx: ValidationContext): number | undefined {
  if (value === undefined) return undefined;
  return validateWeekNumber(value, path, ctx) ?? undefined;
}

function normalizeDateKey(value: string): string | null {
  const trimmed = value.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
  if (dateOnlyMatch?.[1]) return dateOnlyMatch[1];

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.valueOf())) return null;
  return parsed.toISOString().slice(0, 10);
}

function validateDateKey(value: unknown, path: string, ctx: ValidationContext): string | null {
  if (typeof value !== "string" || !value.trim()) {
    addError(ctx, path, "invalid_date", `${path} must be a valid date string.`);
    return null;
  }

  const normalized = normalizeDateKey(value);
  if (!normalized) {
    addError(ctx, path, "invalid_date", `${path} must be a valid date string.`);
    return null;
  }

  return normalized;
}

function getCalendarDayIndex(dateKey: string): number | null {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / DAY_IN_MS);
}

function getWeekNumberFromDate(startDate: string | null, date: string | null): number | null {
  if (!startDate || !date) return null;
  const startIndex = getCalendarDayIndex(startDate);
  const dateIndex = getCalendarDayIndex(date);
  if (startIndex === null || dateIndex === null) return null;
  return Math.floor((dateIndex - startIndex) / 7) + 1;
}

function checkDuplicateId(
  id: string | null | undefined,
  seen: Set<string>,
  path: string,
  ctx: ValidationContext,
  entityName: string,
): void {
  if (!id) return;
  if (seen.has(id)) {
    addError(ctx, path, "duplicate_client_id", `${entityName} client id must be unique within the import payload.`);
    return;
  }
  seen.add(id);
}

function makeReport(ctx: ValidationContext, status: "valid" | "invalid"): TwelveWeekImportValidationReport {
  return {
    status,
    mode: "validate_only",
    dryRun: true,
    acceptedEntityCounts: ctx.counts,
    warnings: ctx.warnings,
    errors: ctx.errors,
    normalizedClientIdsCount: ctx.normalizedClientIds.size,
    idempotencyKey: ctx.idempotencyKey,
    requestId: ctx.requestId,
  };
}

function getPayloadSizeBytes(payload: unknown): number {
  return Buffer.byteLength(JSON.stringify(payload) ?? "null", "utf8");
}

function extractGoals(payload: unknown, ctx: ValidationContext): Array<{ path: string; value: unknown }> {
  const root = asRecord(payload, "body", ctx);
  if (!root) return [];

  ctx.idempotencyKey = validateOptionalIdempotencyKey(root.idempotencyKey, "idempotencyKey", ctx);
  ctx.requestId = validateOptionalString(root.requestId, "requestId", ctx, MAX_IDEMPOTENCY_KEY_LENGTH);

  if (isRecord(root.workspace)) {
    const goals = validateArray(root.workspace.goals, "workspace.goals", ctx, MAX_GOALS_PER_REQUEST, {
      required: true,
      minLength: 1,
    });
    return goals?.map((value, index) => ({ path: `workspace.goals[${index}]`, value })) ?? [];
  }

  if (Array.isArray(root.goals)) {
    const goals = validateArray(root.goals, "goals", ctx, MAX_GOALS_PER_REQUEST, {
      minLength: 1,
    });
    return goals?.map((value, index) => ({ path: `goals[${index}]`, value })) ?? [];
  }

  if (root.goal !== undefined) {
    return [{ path: "goal", value: root.goal }];
  }

  if (root.clientGoalId !== undefined || root.plan !== undefined) {
    return [{ path: "body", value: root }];
  }

  addError(
    ctx,
    "body",
    "unsupported_import_shape",
    "Request body must be a 12-week import payload or a workspace.goals import wrapper.",
  );
  return [];
}

function validateLeadIndicators(plan: Record<string, unknown>, path: string, ctx: ValidationContext): void {
  const leadIndicators = validateArray(
    plan.leadIndicators,
    `${path}.leadIndicators`,
    ctx,
    MAX_LEAD_INDICATORS_PER_PLAN,
  );
  if (!leadIndicators) return;

  const seenLeadIndicatorIds = new Set<string>();
  leadIndicators.forEach((item, index) => {
    const indicatorPath = `${path}.leadIndicators[${index}]`;
    const indicator = asRecord(item, indicatorPath, ctx);
    if (!indicator) return;

    ctx.counts.leadIndicators += 1;
    const leadIndicatorId =
      validateOptionalClientId(indicator.leadIndicatorId, `${indicatorPath}.leadIndicatorId`, ctx) ??
      validateOptionalClientId(indicator.id, `${indicatorPath}.id`, ctx);
    checkDuplicateId(leadIndicatorId, seenLeadIndicatorIds, `${indicatorPath}.leadIndicatorId`, ctx, "Lead indicator");
  });
}

function validateWeeks(
  plan: Record<string, unknown>,
  path: string,
  clientPlanId: string | null,
  ctx: ValidationContext,
): { weekIds: Set<string>; weekIdByNumber: Map<number, string> } {
  const weekIds = new Set<string>();
  const weekIdByNumber = new Map<number, string>();
  const seenWeekNumbers = new Set<number>();
  const weeks = validateArray(plan.weeks, `${path}.weeks`, ctx, MAX_WEEKS_PER_PLAN, {
    required: true,
    minLength: 1,
  });
  if (!weeks) return { weekIds, weekIdByNumber };

  weeks.forEach((item, index) => {
    const weekPath = `${path}.weeks[${index}]`;
    const week = asRecord(item, weekPath, ctx);
    if (!week) return;

    ctx.counts.weeks += 1;
    const clientWeekId = validateRequiredClientId(week.clientWeekId, `${weekPath}.clientWeekId`, ctx);
    checkDuplicateId(clientWeekId, weekIds, `${weekPath}.clientWeekId`, ctx, "Week");

    const weekPlanId = validateOptionalClientId(week.clientPlanId, `${weekPath}.clientPlanId`, ctx);
    if (clientPlanId && weekPlanId && weekPlanId !== clientPlanId) {
      addError(ctx, `${weekPath}.clientPlanId`, "client_plan_mismatch", "Week clientPlanId must match plan.clientPlanId.");
    }

    const weekNumber = validateWeekNumber(week.weekNumber, `${weekPath}.weekNumber`, ctx);
    if (weekNumber !== null) {
      if (seenWeekNumbers.has(weekNumber)) {
        addError(ctx, `${weekPath}.weekNumber`, "duplicate_week_number", "Week number must be unique within a plan.");
      } else {
        seenWeekNumbers.add(weekNumber);
      }
      if (clientWeekId) weekIdByNumber.set(weekNumber, clientWeekId);
    }
  });

  return { weekIds, weekIdByNumber };
}

function validateTasks(
  plan: Record<string, unknown>,
  path: string,
  clientPlanId: string | null,
  weekIds: Set<string>,
  weekIdByNumber: Map<number, string>,
  ctx: ValidationContext,
): void {
  const tasks = validateArray(plan.tasks, `${path}.tasks`, ctx, MAX_TASKS_PER_PLAN);
  if (!tasks) return;

  const seenTaskIds = new Set<string>();
  tasks.forEach((item, index) => {
    const taskPath = `${path}.tasks[${index}]`;
    const task = asRecord(item, taskPath, ctx);
    if (!task) return;

    ctx.counts.tasks += 1;
    const clientTaskId = validateRequiredClientId(task.clientTaskId, `${taskPath}.clientTaskId`, ctx);
    checkDuplicateId(clientTaskId, seenTaskIds, `${taskPath}.clientTaskId`, ctx, "Task");

    const taskPlanId = validateOptionalClientId(task.clientPlanId, `${taskPath}.clientPlanId`, ctx);
    if (clientPlanId && taskPlanId && taskPlanId !== clientPlanId) {
      addError(ctx, `${taskPath}.clientPlanId`, "client_plan_mismatch", "Task clientPlanId must match plan.clientPlanId.");
    }

    const clientWeekId = validateRequiredClientId(task.clientWeekId, `${taskPath}.clientWeekId`, ctx);
    if (clientWeekId && weekIds.size > 0 && !weekIds.has(clientWeekId)) {
      addError(ctx, `${taskPath}.clientWeekId`, "unknown_week", "Task clientWeekId must reference an imported week.");
    }

    const weekNumber = validateOptionalWeekNumber(task.weekNumber, `${taskPath}.weekNumber`, ctx);
    const expectedWeekId = weekNumber === undefined ? undefined : weekIdByNumber.get(weekNumber);
    if (clientWeekId && expectedWeekId && clientWeekId !== expectedWeekId) {
      addError(ctx, `${taskPath}.weekNumber`, "week_mapping_mismatch", "Task weekNumber does not match clientWeekId.");
    }
  });
}

function validateLeadMetrics(
  plan: Record<string, unknown>,
  path: string,
  clientPlanId: string | null,
  weekIds: Set<string>,
  ctx: ValidationContext,
): void {
  const leadMetrics = validateArray(plan.leadMetrics, `${path}.leadMetrics`, ctx, MAX_LEAD_METRICS_PER_PLAN);
  if (!leadMetrics) return;

  const seenMetricIds = new Set<string>();
  leadMetrics.forEach((item, index) => {
    const metricPath = `${path}.leadMetrics[${index}]`;
    const metric = asRecord(item, metricPath, ctx);
    if (!metric) return;

    ctx.counts.leadMetrics += 1;
    const clientMetricId = validateRequiredClientId(metric.clientMetricId, `${metricPath}.clientMetricId`, ctx);
    checkDuplicateId(clientMetricId, seenMetricIds, `${metricPath}.clientMetricId`, ctx, "Lead metric");

    const metricPlanId = validateOptionalClientId(metric.clientPlanId, `${metricPath}.clientPlanId`, ctx);
    if (clientPlanId && metricPlanId && metricPlanId !== clientPlanId) {
      addError(ctx, `${metricPath}.clientPlanId`, "client_plan_mismatch", "Lead metric clientPlanId must match plan.clientPlanId.");
    }

    const clientWeekId = validateRequiredClientId(metric.clientWeekId, `${metricPath}.clientWeekId`, ctx);
    if (clientWeekId && weekIds.size > 0 && !weekIds.has(clientWeekId)) {
      addError(ctx, `${metricPath}.clientWeekId`, "unknown_week", "Lead metric clientWeekId must reference an imported week.");
    }

    validateOptionalString(metric.name, `${metricPath}.name`, ctx, 200);
    validateOptionalNumberRange(metric.weeklyTarget, `${metricPath}.weeklyTarget`, ctx, 0, 10_000);
    validateOptionalString(metric.target, `${metricPath}.target`, ctx, 200);
    validateOptionalNumberRange(metric.currentValue ?? metric.current, `${metricPath}.currentValue`, ctx, 0, 10_000);
    validateOptionalString(metric.unit, `${metricPath}.unit`, ctx, 120);
    validateOptionalString(metric.frequency, `${metricPath}.frequency`, ctx, 120);
    validateOptionalNumberRange(metric.priority, `${metricPath}.priority`, ctx, 0, 1000);
    validateOptionalSchedule(metric.schedule, `${metricPath}.schedule`, ctx);
  });
}

function validateDailyCheckIns(
  plan: Record<string, unknown>,
  path: string,
  clientGoalId: string | null,
  clientPlanId: string | null,
  startDate: string | null,
  totalWeeks: number,
  weekIds: Set<string>,
  weekIdByNumber: Map<number, string>,
  ctx: ValidationContext,
): void {
  const checkIns = validateArray(plan.dailyCheckIns, `${path}.dailyCheckIns`, ctx, MAX_DAILY_CHECK_INS_PER_PLAN);
  if (!checkIns) return;

  const seenCheckInIds = new Set<string>();
  checkIns.forEach((item, index) => {
    const checkInPath = `${path}.dailyCheckIns[${index}]`;
    const checkIn = asRecord(item, checkInPath, ctx);
    if (!checkIn) return;

    ctx.counts.dailyCheckIns += 1;
    const clientCheckInId = validateRequiredClientId(checkIn.clientCheckInId, `${checkInPath}.clientCheckInId`, ctx);
    checkDuplicateId(clientCheckInId, seenCheckInIds, `${checkInPath}.clientCheckInId`, ctx, "Daily check-in");

    const checkInGoalId = validateOptionalClientId(checkIn.clientGoalId, `${checkInPath}.clientGoalId`, ctx);
    if (clientGoalId && checkInGoalId && checkInGoalId !== clientGoalId) {
      addError(ctx, `${checkInPath}.clientGoalId`, "client_goal_mismatch", "Daily check-in clientGoalId must match goal.clientGoalId.");
    }

    const checkInPlanId = validateOptionalClientId(checkIn.clientPlanId, `${checkInPath}.clientPlanId`, ctx);
    if (clientPlanId && checkInPlanId && checkInPlanId !== clientPlanId) {
      addError(ctx, `${checkInPath}.clientPlanId`, "client_plan_mismatch", "Daily check-in clientPlanId must match plan.clientPlanId.");
    }

    const clientWeekId = validateRequiredClientId(checkIn.clientWeekId, `${checkInPath}.clientWeekId`, ctx);
    if (clientWeekId && weekIds.size > 0 && !weekIds.has(clientWeekId)) {
      addError(ctx, `${checkInPath}.clientWeekId`, "unknown_week", "Daily check-in clientWeekId must reference an imported week.");
    }

    const weekNumber = validateWeekNumber(checkIn.weekNumber, `${checkInPath}.weekNumber`, ctx);
    const expectedWeekId = weekNumber === null ? undefined : weekIdByNumber.get(weekNumber);
    if (clientWeekId && expectedWeekId && clientWeekId !== expectedWeekId) {
      addError(ctx, `${checkInPath}.weekNumber`, "week_mapping_mismatch", "Daily check-in weekNumber does not match clientWeekId.");
    }

    const date = validateDateKey(checkIn.localDate ?? checkIn.date, `${checkInPath}.date`, ctx);
    const derivedWeekNumber = getWeekNumberFromDate(startDate, date);
    if (date && weekNumber !== null && derivedWeekNumber !== null) {
      if (derivedWeekNumber < 1 || derivedWeekNumber > totalWeeks) {
        addWarning(ctx, `${checkInPath}.date`, "date_outside_plan", "Daily check-in date falls outside the plan week range.");
      } else if (derivedWeekNumber !== weekNumber) {
        addWarning(ctx, `${checkInPath}.weekNumber`, "date_week_mismatch", "Daily check-in date maps to a different plan week.");
      }
    }

    validateOptionalBoolean(checkIn.didWorkToday, `${checkInPath}.didWorkToday`, ctx);
    validateOptionalString(checkIn.whichLeadIndicatorWorkedOn, `${checkInPath}.whichLeadIndicatorWorkedOn`, ctx, 500);
    validateOptionalString(checkIn.amountDone, `${checkInPath}.amountDone`, ctx, 1000);
    validateOptionalString(checkIn.outputCreated, `${checkInPath}.outputCreated`, ctx, 3000);
    validateOptionalString(checkIn.obstacleOrIssue, `${checkInPath}.obstacleOrIssue`, ctx, 3000);
    validateOptionalNumberRange(checkIn.dailySelfRating, `${checkInPath}.dailySelfRating`, ctx, 0, 5);
    validateOptionalString(checkIn.optionalNote, `${checkInPath}.optionalNote`, ctx, 3000);
    validateOptionalMood(checkIn.mood, `${checkInPath}.mood`, ctx);
  });
}

function validateWeeklyReviews(
  plan: Record<string, unknown>,
  path: string,
  clientGoalId: string | null,
  clientPlanId: string | null,
  weekIds: Set<string>,
  weekIdByNumber: Map<number, string>,
  ctx: ValidationContext,
): void {
  const reviews = validateArray(plan.weeklyReviews, `${path}.weeklyReviews`, ctx, MAX_WEEKLY_REVIEWS_PER_PLAN);
  if (!reviews) return;

  const seenReviewIds = new Set<string>();
  reviews.forEach((item, index) => {
    const reviewPath = `${path}.weeklyReviews[${index}]`;
    const review = asRecord(item, reviewPath, ctx);
    if (!review) return;

    ctx.counts.weeklyReviews += 1;
    const clientReviewId = validateRequiredClientId(review.clientReviewId, `${reviewPath}.clientReviewId`, ctx);
    checkDuplicateId(clientReviewId, seenReviewIds, `${reviewPath}.clientReviewId`, ctx, "Weekly review");

    const reviewGoalId = validateOptionalClientId(review.clientGoalId, `${reviewPath}.clientGoalId`, ctx);
    if (clientGoalId && reviewGoalId && reviewGoalId !== clientGoalId) {
      addError(ctx, `${reviewPath}.clientGoalId`, "client_goal_mismatch", "Weekly review clientGoalId must match goal.clientGoalId.");
    }

    const reviewPlanId = validateOptionalClientId(review.clientPlanId, `${reviewPath}.clientPlanId`, ctx);
    if (clientPlanId && reviewPlanId && reviewPlanId !== clientPlanId) {
      addError(ctx, `${reviewPath}.clientPlanId`, "client_plan_mismatch", "Weekly review clientPlanId must match plan.clientPlanId.");
    }

    const clientWeekId = validateRequiredClientId(review.clientWeekId, `${reviewPath}.clientWeekId`, ctx);
    if (clientWeekId && weekIds.size > 0 && !weekIds.has(clientWeekId)) {
      addError(ctx, `${reviewPath}.clientWeekId`, "unknown_week", "Weekly review clientWeekId must reference an imported week.");
    }

    const weekNumber = validateWeekNumber(review.weekNumber, `${reviewPath}.weekNumber`, ctx);
    const expectedWeekId = weekNumber === null ? undefined : weekIdByNumber.get(weekNumber);
    if (clientWeekId && expectedWeekId && clientWeekId !== expectedWeekId) {
      addError(ctx, `${reviewPath}.weekNumber`, "week_mapping_mismatch", "Weekly review weekNumber does not match clientWeekId.");
    }

    validateOptionalNumberRange(review.executionScore, `${reviewPath}.executionScore`, ctx, 0, 100);
    validateOptionalNumberRange(review.leadCompletionPercent, `${reviewPath}.leadCompletionPercent`, ctx, 0, 100);
    validateOptionalString(review.lagProgressValue, `${reviewPath}.lagProgressValue`, ctx, 1000);
    validateOptionalString(review.biggestOutputThisWeek, `${reviewPath}.biggestOutputThisWeek`, ctx, 3000);
    validateOptionalString(review.mainObstacle, `${reviewPath}.mainObstacle`, ctx, 3000);
    validateOptionalString(review.nextWeekPriority, `${reviewPath}.nextWeekPriority`, ctx, 3000);
    validateOptionalWorkloadDecision(review.workloadDecision, `${reviewPath}.workloadDecision`, ctx);
    validateOptionalBoolean(review.reviewCompleted, `${reviewPath}.reviewCompleted`, ctx);
    validateOptionalStringArray(review.commitmentsKept, `${reviewPath}.commitmentsKept`, ctx);
    validateOptionalStringArray(review.commitmentsMissed, `${reviewPath}.commitmentsMissed`, ctx);
    validateOptionalString(review.insights, `${reviewPath}.insights`, ctx, 3000);
    validateOptionalStringArray(review.nextWeekCommitments, `${reviewPath}.nextWeekCommitments`, ctx);
    validateOptionalString(review.keepTactic, `${reviewPath}.keepTactic`, ctx, 3000);
    validateOptionalString(review.reduceTactic, `${reviewPath}.reduceTactic`, ctx, 3000);
    validateOptionalString(review.reflection, `${reviewPath}.reflection`, ctx, 3000);
    validateOptionalString(review.adjustments, `${reviewPath}.adjustments`, ctx, 3000);
    validateOptionalIsoDate(review.lastReviewAt, `${reviewPath}.lastReviewAt`, ctx);
    validateOptionalNumberRange(review.progressScore, `${reviewPath}.progressScore`, ctx, 0, 10);
    validateOptionalNumberRange(review.disciplineScore, `${reviewPath}.disciplineScore`, ctx, 0, 10);
    validateOptionalNumberRange(review.focusScore, `${reviewPath}.focusScore`, ctx, 0, 10);
    validateOptionalNumberRange(review.improvementScore, `${reviewPath}.improvementScore`, ctx, 0, 10);
    validateOptionalNumberRange(review.outputQualityScore, `${reviewPath}.outputQualityScore`, ctx, 0, 10);
    validateOptionalNumberRange(review.completedLeadIndicators, `${reviewPath}.completedLeadIndicators`, ctx, 0, 100);
  });
}

function validateGoal(goalValue: unknown, path: string, ctx: ValidationContext): void {
  const goal = asRecord(goalValue, path, ctx);
  if (!goal) return;

  ctx.counts.goals += 1;
  const clientGoalId = validateRequiredClientId(goal.clientGoalId, `${path}.clientGoalId`, ctx);
  const plan = asRecord(goal.plan, `${path}.plan`, ctx);
  if (!plan) return;

  ctx.counts.plans += 1;
  const clientPlanId = validateRequiredClientId(plan.clientPlanId, `${path}.plan.clientPlanId`, ctx);
  const planClientGoalId = validateOptionalClientId(plan.clientGoalId, `${path}.plan.clientGoalId`, ctx);
  if (clientGoalId && planClientGoalId && planClientGoalId !== clientGoalId) {
    addError(ctx, `${path}.plan.clientGoalId`, "client_goal_mismatch", "Plan clientGoalId must match goal.clientGoalId.");
  }

  const startDate =
    plan.startDate === undefined
      ? (addWarning(ctx, `${path}.plan.startDate`, "missing_start_date", "Plan startDate is missing, so daily date/week mapping cannot be fully verified."),
        null)
      : validateDateKey(plan.startDate, `${path}.plan.startDate`, ctx);
  const totalWeeks = validateOptionalWeekNumber(plan.totalWeeks, `${path}.plan.totalWeeks`, ctx) ?? MAX_WEEKS_PER_PLAN;

  const { weekIds, weekIdByNumber } = validateWeeks(plan, `${path}.plan`, clientPlanId, ctx);
  validateLeadIndicators(plan, `${path}.plan`, ctx);
  validateTasks(plan, `${path}.plan`, clientPlanId, weekIds, weekIdByNumber, ctx);
  validateLeadMetrics(plan, `${path}.plan`, clientPlanId, weekIds, ctx);
  validateDailyCheckIns(plan, `${path}.plan`, clientGoalId, clientPlanId, startDate, totalWeeks, weekIds, weekIdByNumber, ctx);
  validateWeeklyReviews(plan, `${path}.plan`, clientGoalId, clientPlanId, weekIds, weekIdByNumber, ctx);
}

export class TwelveWeekImportValidationService {
  validateImportPayload(userId: string, payload: unknown): TwelveWeekImportValidationReport {
    return this.validateAndExtractImportPayload(userId, payload).report;
  }

  validateAndExtractImportPayload(_userId: string, payload: unknown): TwelveWeekImportValidationBundle {
    const sizeBytes = getPayloadSizeBytes(payload);
    if (sizeBytes > MAX_IMPORT_VALIDATE_PAYLOAD_BYTES) {
      throw new ApiError(400, "12-week import payload is too large.", {
        maxBytes: MAX_IMPORT_VALIDATE_PAYLOAD_BYTES,
        actualBytes: sizeBytes,
      });
    }

    const ctx = createContext();
    const goals = extractGoals(payload, ctx);
    goals.forEach(({ path, value }) => validateGoal(value, path, ctx));

    if (ctx.errors.length > 0) {
      throw new ApiError(400, "12-week import payload validation failed.", makeReport(ctx, "invalid"));
    }

    return {
      report: makeReport(ctx, "valid"),
      goals: goals.map(({ path, value }) => ({
        path,
        value: value as Record<string, unknown>,
      })),
    };
  }
}

export const twelveWeekImportValidationService = new TwelveWeekImportValidationService();
