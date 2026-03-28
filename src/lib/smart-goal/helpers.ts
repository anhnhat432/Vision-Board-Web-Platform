import type {
  PendingSMARTGoal,
  SmartGoal,
  SmartGoalDomain,
  SmartGoalSummary,
} from "./types";

export interface BuildSmartGoalInput {
  focusArea: string;
  specificGoalStatement: string;
  measurableMetricName: string;
  measurableMetricUnit?: string;
  measurableBaselineValue?: number;
  measurableTargetValue: number;
  achievableWeeklyTimeCommitmentHours: number;
  achievableRequiredSkills: string[];
  achievableSupportResources: string[];
  relevantMotivationReason: string;
  relevantLifeDimensionAlignment?: string;
  timeBoundTargetDate?: string;
  timeBoundTargetWeeks?: number;
  id?: string;
  createdAt?: string;
}

const SMART_GOAL_DOMAINS: readonly SmartGoalDomain[] = [
  "career",
  "health",
  "finance",
  "learning",
  "relationship",
  "life",
];

const OUTCOME_INDICATOR_PATTERN = /\b(become|reach|complete|build|launch|achieve)\b/i;
const MIN_WEEKLY_TIME_COMMITMENT_HOURS = 1;
const MAX_WEEKLY_TIME_COMMITMENT_HOURS = 60;
const DEFAULT_TARGET_VALUE = 1;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanText(value: string): string {
  return value.trim();
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePositiveNumber(value: unknown): number | undefined {
  const parsed = normalizeNumber(value);
  if (parsed === undefined || parsed <= 0) return undefined;
  return parsed;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    return normalizeListInput(value);
  }

  return [];
}

function clampWeeklyTimeCommitmentHours(value: unknown): number {
  const parsed = normalizeNumber(value) ?? MIN_WEEKLY_TIME_COMMITMENT_HOURS;
  if (parsed < MIN_WEEKLY_TIME_COMMITMENT_HOURS) return MIN_WEEKLY_TIME_COMMITMENT_HOURS;
  if (parsed > MAX_WEEKLY_TIME_COMMITMENT_HOURS) return MAX_WEEKLY_TIME_COMMITMENT_HOURS;
  return parsed;
}

function normalizeMetricUnit(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = cleanText(value);
  return normalized || undefined;
}

function extractNumbersFromText(value: string): number[] {
  const matches = value.match(/-?\d+(?:\.\d+)?/g) ?? [];

  return matches
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function extractDateFromText(value: string): string | undefined {
  const match = value.match(/\b\d{4}-\d{2}-\d{2}\b/);
  return match?.[0];
}

function parseMetricLabel(value: string): { metricName: string; metricUnit?: string } {
  const normalized = cleanText(value);
  if (!normalized) return { metricName: "" };

  const label = normalized.includes(":")
    ? cleanText(normalized.slice(0, normalized.indexOf(":")))
    : normalized;

  const unitMatch = label.match(/^(.*)\(([^)]+)\)$/);
  if (!unitMatch) {
    return { metricName: label };
  }

  const metricName = cleanText(unitMatch[1] ?? "");
  const metricUnit = cleanText(unitMatch[2] ?? "");

  return {
    metricName,
    metricUnit: metricUnit || undefined,
  };
}

function parseLegacyMeasurableText(value: string): {
  metricName: string;
  metricUnit?: string;
  baselineValue?: number;
  targetValue?: number;
} {
  const trimmedValue = cleanText(value);
  if (!trimmedValue) {
    return {
      metricName: "",
    };
  }

  const { metricName, metricUnit } = parseMetricLabel(trimmedValue);
  const numbers = extractNumbersFromText(trimmedValue);

  if (trimmedValue.includes("->") && numbers.length >= 2) {
    return {
      metricName,
      metricUnit,
      baselineValue: numbers[0],
      targetValue: numbers[numbers.length - 1],
    };
  }

  if (numbers.length >= 1) {
    return {
      metricName,
      metricUnit,
      targetValue: numbers[numbers.length - 1],
    };
  }

  return {
    metricName,
    metricUnit,
  };
}

function hasAnySmartGoalPayload(value: Record<string, unknown>): boolean {
  return (
    "specific" in value ||
    "measurable" in value ||
    "achievable" in value ||
    "relevant" in value ||
    "time_bound" in value ||
    "timeBound" in value ||
    "focusArea" in value
  );
}

function normalizeMeasurableSection(measurable: SmartGoal["measurable"]): SmartGoal["measurable"] {
  const targetValue = normalizeNumber(measurable.target_value) ?? DEFAULT_TARGET_VALUE;
  const baselineValue = normalizeNumber(measurable.baseline_value);

  const normalized: SmartGoal["measurable"] = {
    metric_name: cleanText(measurable.metric_name),
    target_value: targetValue,
  };

  const metricUnit = normalizeMetricUnit(measurable.metric_unit);
  if (metricUnit) {
    normalized.metric_unit = metricUnit;
  }

  if (baselineValue !== undefined && targetValue > baselineValue) {
    normalized.baseline_value = baselineValue;
  }

  return normalized;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function estimateGoalDifficulty(goal: SmartGoal): "easy" | "medium" | "hard" {
  const baselineValue = goal.measurable.baseline_value ?? 0;
  const weeklyHours = clampWeeklyTimeCommitmentHours(goal.achievable.weekly_time_commitment_hours);
  const delta = Math.max(0, goal.measurable.target_value - baselineValue);
  const difficultyScore = delta / weeklyHours;

  if (difficultyScore < 1) return "easy";
  if (difficultyScore <= 3) return "medium";
  return "hard";
}

function buildGoalSummary(goal: SmartGoal): SmartGoalSummary {
  const summary: SmartGoalSummary = {
    goal: cleanText(goal.specific.goal_statement),
    metric: cleanText(goal.measurable.metric_name),
    target: goal.measurable.target_value,
    weekly_commitment: goal.achievable.weekly_time_commitment_hours,
    difficulty: estimateGoalDifficulty(goal),
  };

  if (goal.measurable.metric_unit) {
    summary.metric_unit = goal.measurable.metric_unit;
  }

  if (goal.time_bound.target_weeks !== undefined) {
    summary.timeline_weeks = goal.time_bound.target_weeks;
  }

  return summary;
}

function toSmartGoalFromUnknown(
  value: Record<string, unknown>,
  fallbackFocusArea: string,
): SmartGoal | null {
  if (!hasAnySmartGoalPayload(value)) {
    return null;
  }

  const specificSection = isObjectRecord(value.specific) ? value.specific : null;
  const measurableSection = isObjectRecord(value.measurable) ? value.measurable : null;
  const achievableSection = isObjectRecord(value.achievable) ? value.achievable : null;
  const relevantSection = isObjectRecord(value.relevant) ? value.relevant : null;
  const timeBoundSection = isObjectRecord(value.time_bound) ? value.time_bound : null;

  const legacySpecific = typeof value.specific === "string" ? value.specific : "";
  const legacyMeasurable = typeof value.measurable === "string" ? value.measurable : "";
  const legacyAchievable = typeof value.achievable === "string" ? value.achievable : "";
  const legacyRelevant = typeof value.relevant === "string" ? value.relevant : "";
  const legacyTimeBound = typeof value.timeBound === "string" ? value.timeBound : "";

  const parsedLegacyMeasurable = parseLegacyMeasurableText(legacyMeasurable);

  const baselineValue =
    normalizeNumber(measurableSection?.baseline_value) ?? parsedLegacyMeasurable.baselineValue;
  const explicitTargetValue =
    normalizeNumber(measurableSection?.target_value) ?? parsedLegacyMeasurable.targetValue;
  const targetValue =
    explicitTargetValue ??
    (baselineValue !== undefined ? baselineValue + 1 : DEFAULT_TARGET_VALUE);

  const weeklyTimeCommitmentHours =
    normalizeNumber(achievableSection?.weekly_time_commitment_hours) ??
    extractNumbersFromText(legacyAchievable)[0] ??
    MIN_WEEKLY_TIME_COMMITMENT_HOURS;

  const requiredSkills = normalizeStringArray(achievableSection?.required_skills);
  const supportResources = normalizeStringArray(achievableSection?.support_resources);

  if (supportResources.length === 0 && cleanText(legacyAchievable)) {
    supportResources.push(cleanText(legacyAchievable));
  }

  const rawTargetDate =
    (typeof timeBoundSection?.target_date === "string" && cleanText(timeBoundSection.target_date)) ||
    extractDateFromText(legacyTimeBound);
  const rawTargetWeeks =
    normalizeNumber(timeBoundSection?.target_weeks) ?? extractNumbersFromText(legacyTimeBound)[0];

  const rawGoal: SmartGoal = {
    id: typeof value.id === "string" ? cleanText(value.id) || createSmartGoalId() : createSmartGoalId(),
    domain: isSmartGoalDomain(value.domain)
      ? value.domain
      : mapFocusAreaToDomain(
          typeof value.focusArea === "string" ? value.focusArea : fallbackFocusArea,
        ),
    specific: {
      goal_statement:
        (typeof specificSection?.goal_statement === "string" && specificSection.goal_statement) ||
        legacySpecific ||
        "",
    },
    measurable: {
      metric_name:
        (typeof measurableSection?.metric_name === "string" && measurableSection.metric_name) ||
        parsedLegacyMeasurable.metricName ||
        "",
      target_value: targetValue,
    },
    achievable: {
      weekly_time_commitment_hours: weeklyTimeCommitmentHours,
      required_skills: requiredSkills,
      support_resources: supportResources,
    },
    relevant: {
      motivation_reason:
        (typeof relevantSection?.motivation_reason === "string" &&
          relevantSection.motivation_reason) ||
        legacyRelevant ||
        "",
    },
    time_bound: {
      target_date: rawTargetDate || undefined,
      target_weeks: rawTargetWeeks,
    },
    created_at:
      typeof value.created_at === "string" && cleanText(value.created_at)
        ? value.created_at
        : new Date().toISOString(),
  };

  const metricUnit =
    normalizeMetricUnit(measurableSection?.metric_unit) ?? parsedLegacyMeasurable.metricUnit;
  if (metricUnit) {
    rawGoal.measurable.metric_unit = metricUnit;
  }

  if (baselineValue !== undefined) {
    rawGoal.measurable.baseline_value = baselineValue;
  }

  if (
    typeof relevantSection?.life_dimension_alignment === "string" &&
    cleanText(relevantSection.life_dimension_alignment)
  ) {
    rawGoal.relevant.life_dimension_alignment = cleanText(
      relevantSection.life_dimension_alignment,
    );
  }

  return normalizeSmartGoal(rawGoal);
}

function formatMeasurable(goal: SmartGoal): string {
  const metricName = cleanText(goal.measurable.metric_name);
  const metricUnit = normalizeMetricUnit(goal.measurable.metric_unit);
  const metricLabel = metricName
    ? metricUnit
      ? `${metricName} (${metricUnit})`
      : metricName
    : "";
  const targetValue = formatNumber(goal.measurable.target_value);
  const baselineValue =
    goal.measurable.baseline_value !== undefined
      ? formatNumber(goal.measurable.baseline_value)
      : null;

  if (!metricLabel && !targetValue) return "";

  if (baselineValue !== null) {
    return metricLabel
      ? `${metricLabel}: ${baselineValue} -> ${targetValue}`
      : `${baselineValue} -> ${targetValue}`;
  }

  return metricLabel ? `${metricLabel}: ${targetValue}` : targetValue;
}

function formatAchievable(goal: SmartGoal): string {
  const parts: string[] = [];

  if (
    Number.isFinite(goal.achievable.weekly_time_commitment_hours) &&
    goal.achievable.weekly_time_commitment_hours > 0
  ) {
    parts.push(`${formatNumber(goal.achievable.weekly_time_commitment_hours)} gio/tuan`);
  }

  const requiredSkills = goal.achievable.required_skills
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (requiredSkills.length > 0) {
    parts.push(`Ky nang: ${requiredSkills.join(", ")}`);
  }

  const supportResources = goal.achievable.support_resources
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (supportResources.length > 0) {
    parts.push(`Ho tro: ${supportResources.join(", ")}`);
  }

  return parts.join(". ");
}

function formatTimeBound(goal: SmartGoal): string {
  if (goal.time_bound.target_date) {
    return `Moc den ${goal.time_bound.target_date}`;
  }

  if (
    goal.time_bound.target_weeks !== undefined &&
    Number.isFinite(goal.time_bound.target_weeks)
  ) {
    return `Trong ${formatNumber(goal.time_bound.target_weeks)} tuan`;
  }

  return "";
}

function looksLikeLegacyPendingSmartGoal(value: Record<string, unknown>): boolean {
  const hasPendingKeys =
    "focusArea" in value ||
    "specific" in value ||
    "measurable" in value ||
    "achievable" in value ||
    "relevant" in value ||
    "timeBound" in value;

  if (!hasPendingKeys) {
    return false;
  }

  const sections = [value.specific, value.measurable, value.achievable, value.relevant, value.timeBound];
  return sections.every((section) => !isObjectRecord(section));
}

export function mapFocusAreaToDomain(focusArea: string): SmartGoalDomain {
  const normalized = focusArea.trim().toLowerCase();

  if (normalized === "career") return "career";
  if (normalized === "health") return "health";
  if (normalized === "finance") return "finance";
  if (normalized === "education") return "learning";
  if (normalized === "relationships" || normalized === "family") return "relationship";

  return "life";
}

export function hasOutcomeIndicator(statement: string): boolean {
  const trimmedStatement = statement.trim();
  if (!trimmedStatement) return false;

  return OUTCOME_INDICATOR_PATTERN.test(trimmedStatement);
}

export function normalizeListInput(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function stringifyListInput(values: string[]): string {
  return values
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join("\n");
}

export function createSmartGoalId(now = new Date()): string {
  return `smart_goal_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeTimeBound(
  timeBound: SmartGoal["time_bound"] | undefined,
): SmartGoal["time_bound"] {
  const targetWeeks = normalizePositiveNumber(timeBound?.target_weeks);
  const targetDate =
    typeof timeBound?.target_date === "string" ? cleanText(timeBound.target_date) : "";

  if (targetWeeks !== undefined) {
    return { target_weeks: targetWeeks };
  }

  if (targetDate) {
    return { target_date: targetDate };
  }

  return {};
}

export function normalizeSmartGoal(goal: SmartGoal): SmartGoal {
  const normalizedGoal: SmartGoal = {
    id: cleanText(goal.id) || createSmartGoalId(),
    domain: isSmartGoalDomain(goal.domain) ? goal.domain : "life",
    specific: {
      goal_statement: cleanText(goal.specific.goal_statement),
    },
    measurable: normalizeMeasurableSection(goal.measurable),
    achievable: {
      weekly_time_commitment_hours: clampWeeklyTimeCommitmentHours(
        goal.achievable.weekly_time_commitment_hours,
      ),
      required_skills: normalizeStringArray(goal.achievable.required_skills),
      support_resources: normalizeStringArray(goal.achievable.support_resources),
    },
    relevant: {
      motivation_reason: cleanText(goal.relevant.motivation_reason),
    },
    time_bound: normalizeTimeBound(goal.time_bound),
    created_at: cleanText(goal.created_at) || new Date().toISOString(),
  };

  if (goal.relevant.life_dimension_alignment?.trim()) {
    normalizedGoal.relevant.life_dimension_alignment = cleanText(
      goal.relevant.life_dimension_alignment,
    );
  }

  normalizedGoal.goal_summary = buildGoalSummary(normalizedGoal);

  return normalizedGoal;
}

export function parseSmartGoal(
  value: unknown,
  fallbackFocusArea: string,
): SmartGoal | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  if (isSmartGoal(value)) {
    return normalizeSmartGoal(value);
  }

  return toSmartGoalFromUnknown(value, fallbackFocusArea);
}

export function buildSmartGoal(input: BuildSmartGoalInput): SmartGoal {
  const draft: SmartGoal = {
    id: input.id ?? createSmartGoalId(),
    domain: mapFocusAreaToDomain(input.focusArea),
    specific: {
      goal_statement: cleanText(input.specificGoalStatement),
    },
    measurable: {
      metric_name: cleanText(input.measurableMetricName),
      target_value: input.measurableTargetValue,
    },
    achievable: {
      weekly_time_commitment_hours: input.achievableWeeklyTimeCommitmentHours,
      required_skills: normalizeStringArray(input.achievableRequiredSkills),
      support_resources: normalizeStringArray(input.achievableSupportResources),
    },
    relevant: {
      motivation_reason: cleanText(input.relevantMotivationReason),
    },
    time_bound: {
      target_date: input.timeBoundTargetDate,
      target_weeks: input.timeBoundTargetWeeks,
    },
    created_at: input.createdAt ?? new Date().toISOString(),
  };

  if (input.measurableMetricUnit?.trim()) {
    draft.measurable.metric_unit = cleanText(input.measurableMetricUnit);
  }

  if (input.measurableBaselineValue !== undefined) {
    draft.measurable.baseline_value = input.measurableBaselineValue;
  }

  if (input.relevantLifeDimensionAlignment?.trim()) {
    draft.relevant.life_dimension_alignment = cleanText(input.relevantLifeDimensionAlignment);
  }

  return normalizeSmartGoal(draft);
}

export function isSmartGoalDomain(value: unknown): value is SmartGoalDomain {
  return typeof value === "string" && SMART_GOAL_DOMAINS.includes(value as SmartGoalDomain);
}

export function isSmartGoal(value: unknown): value is SmartGoal {
  if (!isObjectRecord(value)) return false;

  const specific = value.specific;
  const measurable = value.measurable;
  const achievable = value.achievable;
  const relevant = value.relevant;
  const timeBound = value.time_bound;
  const goalSummary = value.goal_summary;

  if (!isObjectRecord(specific)) return false;
  if (!isObjectRecord(measurable)) return false;
  if (!isObjectRecord(achievable)) return false;
  if (!isObjectRecord(relevant)) return false;
  if (!isObjectRecord(timeBound)) return false;

  const baselineValue = measurable.baseline_value;
  const metricUnit = measurable.metric_unit;
  const targetDate = timeBound.target_date;
  const targetWeeks = timeBound.target_weeks;

  const hasValidGoalSummary =
    goalSummary === undefined ||
    (isObjectRecord(goalSummary) &&
      typeof goalSummary.goal === "string" &&
      typeof goalSummary.metric === "string" &&
      (goalSummary.metric_unit === undefined || typeof goalSummary.metric_unit === "string") &&
      typeof goalSummary.target === "number" &&
      Number.isFinite(goalSummary.target) &&
      typeof goalSummary.weekly_commitment === "number" &&
      Number.isFinite(goalSummary.weekly_commitment) &&
      (goalSummary.timeline_weeks === undefined ||
        (typeof goalSummary.timeline_weeks === "number" &&
          Number.isFinite(goalSummary.timeline_weeks))) &&
      (goalSummary.difficulty === undefined ||
        goalSummary.difficulty === "easy" ||
        goalSummary.difficulty === "medium" ||
        goalSummary.difficulty === "hard"));

  return (
    typeof value.id === "string" &&
    isSmartGoalDomain(value.domain) &&
    typeof specific.goal_statement === "string" &&
    typeof measurable.metric_name === "string" &&
    (metricUnit === undefined || typeof metricUnit === "string") &&
    typeof measurable.target_value === "number" &&
    Number.isFinite(measurable.target_value) &&
    (baselineValue === undefined ||
      (typeof baselineValue === "number" && Number.isFinite(baselineValue))) &&
    typeof achievable.weekly_time_commitment_hours === "number" &&
    Number.isFinite(achievable.weekly_time_commitment_hours) &&
    Array.isArray(achievable.required_skills) &&
    achievable.required_skills.every((item) => typeof item === "string") &&
    Array.isArray(achievable.support_resources) &&
    achievable.support_resources.every((item) => typeof item === "string") &&
    typeof relevant.motivation_reason === "string" &&
    (relevant.life_dimension_alignment === undefined ||
      typeof relevant.life_dimension_alignment === "string") &&
    (targetDate === undefined || typeof targetDate === "string") &&
    (targetWeeks === undefined ||
      (typeof targetWeeks === "number" && Number.isFinite(targetWeeks))) &&
    typeof value.created_at === "string" &&
    hasValidGoalSummary
  );
}

export function isPendingSMARTGoal(value: unknown): value is PendingSMARTGoal {
  if (!isObjectRecord(value)) return false;

  return (
    typeof value.focusArea === "string" &&
    typeof value.specific === "string" &&
    typeof value.measurable === "string" &&
    typeof value.achievable === "string" &&
    typeof value.relevant === "string" &&
    typeof value.timeBound === "string"
  );
}

export function toPendingSMARTGoal(goal: SmartGoal, focusArea: string): PendingSMARTGoal {
  const normalizedGoal = normalizeSmartGoal(goal);

  return {
    focusArea: cleanText(focusArea),
    specific: normalizedGoal.specific.goal_statement,
    measurable: formatMeasurable(normalizedGoal),
    achievable: formatAchievable(normalizedGoal),
    relevant: normalizedGoal.relevant.motivation_reason,
    timeBound: formatTimeBound(normalizedGoal),
  };
}

export function parsePendingSMARTGoal(
  value: unknown,
  fallbackFocusArea: string,
): PendingSMARTGoal | null {
  if (isPendingSMARTGoal(value)) {
    return {
      focusArea: cleanText(value.focusArea) || fallbackFocusArea,
      specific: cleanText(value.specific),
      measurable: cleanText(value.measurable),
      achievable: cleanText(value.achievable),
      relevant: cleanText(value.relevant),
      timeBound: cleanText(value.timeBound),
    };
  }

  if (isObjectRecord(value) && looksLikeLegacyPendingSmartGoal(value)) {
    return {
      focusArea:
        (typeof value.focusArea === "string" && cleanText(value.focusArea)) || fallbackFocusArea,
      specific: typeof value.specific === "string" ? cleanText(value.specific) : "",
      measurable: typeof value.measurable === "string" ? cleanText(value.measurable) : "",
      achievable: typeof value.achievable === "string" ? cleanText(value.achievable) : "",
      relevant: typeof value.relevant === "string" ? cleanText(value.relevant) : "",
      timeBound: typeof value.timeBound === "string" ? cleanText(value.timeBound) : "",
    };
  }

  const normalizedSmartGoal = parseSmartGoal(value, fallbackFocusArea);
  if (!normalizedSmartGoal) {
    return null;
  }

  return toPendingSMARTGoal(normalizedSmartGoal, fallbackFocusArea);
}

export function parseNumberInput(value: string): number | undefined {
  return normalizeNumber(value);
}
