/**
 * User Intent v1 — lightweight category captured early in the funnel.
 *
 * Purpose: ask users a low-friction question about what kind of outcome
 * they want ("build a habit", "finish a project", …) so downstream steps
 * (SMART hints, archetype inference in Feasibility/12WeekSetup) can
 * pre-hint without forcing a category.
 *
 * Design constraints (v1):
 *  - Selection is **optional**. Missing intent → same behavior as before.
 *  - Storage lives in a standalone localStorage key — **not** inside
 *    `UserData` — so there is no migration risk.
 *  - Never contains user free text. Only an enum id + ISO timestamp.
 *  - Deterministic mapping to `GoalArchetype` for downstream modules.
 *  - Analytics emits only the id; never any text a user typed.
 */

import type { GoalArchetype } from "@/lib/smart-goal/goalArchetypes";

import { APP_STORAGE_KEYS } from "./storage-constants";

// ---- Taxonomy ---------------------------------------------------------------

/** The 7 positive intents asked in onboarding, plus a safe "unsure" escape. */
export type UserIntentId =
  | "complete_project"
  | "build_habit"
  | "learn_skill"
  | "improve_health"
  | "prepare_exam"
  | "grow_finance"
  | "find_direction"
  | "unsure";

export interface UserIntentRecord {
  intent: UserIntentId;
  /** ISO timestamp of last write. Useful for analytics only — never user-facing. */
  updatedAt: string;
}

export interface UserIntentOption {
  id: UserIntentId;
  /** Vietnamese label, friendly, no jargon. */
  label: string;
  /** One-line gentle description. */
  description: string;
}

const INTENT_OPTIONS: readonly UserIntentOption[] = [
  {
    id: "complete_project",
    label: "Hoàn thành một dự án",
    description: "Bạn đang có một việc lớn cần đẩy về đích trong 3 tháng tới.",
  },
  {
    id: "build_habit",
    label: "Xây một thói quen",
    description: "Bạn muốn một việc nhỏ lặp lại đều đặn cho đến khi thành nếp.",
  },
  {
    id: "learn_skill",
    label: "Học một kỹ năng",
    description: "Bạn muốn luyện đều tay và có kết quả cụ thể để kiểm chứng.",
  },
  {
    id: "improve_health",
    label: "Cải thiện sức khỏe",
    description: "Bạn muốn tập, vận động hoặc điều chỉnh lối sống một cách bền.",
  },
  {
    id: "prepare_exam",
    label: "Chuẩn bị thi hoặc chứng chỉ",
    description: "Bạn có mốc thi rõ và cần một lộ trình giữ nhịp học đến ngày thi.",
  },
  {
    id: "grow_finance",
    label: "Tăng thu nhập hoặc tiết kiệm",
    description: "Bạn muốn cải thiện một con số tài chính cụ thể trong chu kỳ.",
  },
  {
    id: "find_direction",
    label: "Tìm lại định hướng",
    description: "Bạn chưa chắc chắn, muốn thử để thấy rõ hơn cần ưu tiên gì.",
  },
  {
    id: "unsure",
    label: "Chưa chắc, cứ đi tiếp",
    description: "Không cần chọn ngay — bạn có thể quay lại chỉnh sau.",
  },
] as const;

export function getUserIntentOptions(): readonly UserIntentOption[] {
  return INTENT_OPTIONS;
}

export function getUserIntentLabel(intent: UserIntentId): string {
  return INTENT_OPTIONS.find((option) => option.id === intent)?.label ?? "Chưa chắc, cứ đi tiếp";
}

export function isUserIntentId(value: unknown): value is UserIntentId {
  return typeof value === "string" && INTENT_OPTIONS.some((option) => option.id === value);
}

// ---- Storage ---------------------------------------------------------------

const STORAGE_KEY = APP_STORAGE_KEYS.userIntent;

function readStorage(): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore quota / privacy-mode failures; missing intent is already valid.
  }
}

function removeStorage(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Read the stored intent record. Returns `null` when no choice has ever
 * been made (fresh users, privacy-mode browsers, or cleared data).
 */
export function getUserIntent(): UserIntentRecord | null {
  const raw = readStorage();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<UserIntentRecord>;
    if (!isUserIntentId(record.intent)) return null;
    return {
      intent: record.intent,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Convenience: just the id (or `null` when unset). */
export function getUserIntentId(): UserIntentId | null {
  return getUserIntent()?.intent ?? null;
}

/**
 * Persist a user's intent choice. Writes only the id + timestamp — never
 * any derived label or free text.
 */
export function setUserIntent(intent: UserIntentId, now: Date = new Date()): UserIntentRecord {
  const record: UserIntentRecord = { intent, updatedAt: now.toISOString() };
  writeStorage(JSON.stringify(record));
  return record;
}

export function clearUserIntent(): void {
  removeStorage();
}

// ---- Archetype mapping -----------------------------------------------------

const INTENT_TO_ARCHETYPE: Record<UserIntentId, GoalArchetype> = {
  complete_project: "project_completion",
  build_habit: "habit_building",
  learn_skill: "skill_learning",
  improve_health: "health_fitness",
  prepare_exam: "exam_study",
  grow_finance: "financial_goal",
  // "Looking for direction" and "unsure" are deliberately `other` —
  // downstream modules treat `other` as a generic fallback, which is
  // exactly what a user who is still exploring needs.
  find_direction: "other",
  unsure: "other",
};

/**
 * Map an intent id to a deterministic archetype. `unsure` and
 * `find_direction` map to `"other"` on purpose — downstream archetype
 * overlays are already designed to degrade gracefully for that case.
 */
export function getArchetypeForIntent(intent: UserIntentId): GoalArchetype {
  return INTENT_TO_ARCHETYPE[intent];
}

/** Does this intent carry a concrete archetype hint we can act on? */
export function hasActionableArchetypeHint(intent: UserIntentId | null | undefined): boolean {
  if (!intent) return false;
  return INTENT_TO_ARCHETYPE[intent] !== "other";
}

// ---- Analytics safety -----------------------------------------------------

/**
 * Analytics-safe payload for logging the intent choice. Returns **only**
 * the id (no label, no description, no timestamp by default). Callers
 * should merge this with their event-specific fields.
 */
export function buildIntentAnalyticsPayload(intent: UserIntentId): { intent_id: UserIntentId } {
  return { intent_id: intent };
}
