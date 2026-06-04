const STORAGE_PREFIX = "assistant.pending_clarification";
const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MAX_CANDIDATES = 7;
const MAX_LABEL_LENGTH = 160;

export type PendingAssistantClarificationIntent = "mark_task_done" | "update_task_status";

export interface AssistantClarificationCandidate {
  id: string;
  label: string;
  goalId?: string;
  weekId?: string;
  dayKey?: string;
}

export interface PendingAssistantClarification {
  kind: "task_selection";
  intent: PendingAssistantClarificationIntent;
  question: string;
  candidates: AssistantClarificationCandidate[];
  createdAt: string;
  expiresAt: string;
}

export type PendingAssistantClarificationSummary = Pick<
  PendingAssistantClarification,
  "kind" | "intent" | "question" | "candidates" | "createdAt" | "expiresAt"
>;

export type ClarificationResolution =
  | {
      status: "selected";
      pending: PendingAssistantClarification;
      candidate: AssistantClarificationCandidate;
    }
  | {
      status: "cancelled";
      pending: PendingAssistantClarification;
    }
  | {
      status: "expired";
      pending: PendingAssistantClarification;
    }
  | {
      status: "unresolved";
      pending: PendingAssistantClarification;
      question: string;
    };

function getStorageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}`;
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function redactSensitive(text: string): string {
  return text
    .replace(/[\w-]{24,}/g, "[REDACTED]")
    .replace(/(api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|private[_\s-]?key)\s*[:=]\s*[^\s,]+/gi, "$1: [REDACTED]")
    .replace(/\b[\w-]*(?:api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|private[_\s-]?key)[\w-]*\b/gi, "[REDACTED]");
}

function sanitizeText(value: unknown, maxLength: number): string {
  return redactSensitive(String(value ?? "").trim()).slice(0, maxLength);
}

function normalizeCandidate(value: unknown): AssistantClarificationCandidate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = sanitizeText(raw.id, 100);
  const label = sanitizeText(raw.label, MAX_LABEL_LENGTH);
  if (!id || !label) return null;

  return {
    id,
    label,
    goalId: raw.goalId ? sanitizeText(raw.goalId, 100) : undefined,
    weekId: raw.weekId ? sanitizeText(raw.weekId, 100) : undefined,
    dayKey: raw.dayKey ? sanitizeText(raw.dayKey, 40) : undefined,
  };
}

function normalizePending(value: unknown): PendingAssistantClarification | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.kind !== "task_selection") return null;
  if (raw.intent !== "mark_task_done" && raw.intent !== "update_task_status") return null;
  if (!Array.isArray(raw.candidates)) return null;

  const candidates = raw.candidates
    .map(normalizeCandidate)
    .filter((candidate): candidate is AssistantClarificationCandidate => candidate !== null)
    .slice(0, MAX_CANDIDATES);
  if (candidates.length === 0) return null;

  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : "";
  const expiresAt = typeof raw.expiresAt === "string" ? raw.expiresAt : "";
  if (!createdAt || !expiresAt || Number.isNaN(Date.parse(createdAt)) || Number.isNaN(Date.parse(expiresAt))) {
    return null;
  }

  const question = sanitizeText(raw.question, 500) || buildClarificationQuestion(raw.intent, candidates);

  return {
    kind: "task_selection",
    intent: raw.intent,
    question,
    candidates,
    createdAt,
    expiresAt,
  };
}

function isCancelReply(reply: string): boolean {
  const normalized = normalizeText(reply);
  return /\b(huy|thoi|bo qua|cancel|khong can|bo di|huy di)\b/.test(normalized);
}

function isConfirmReply(reply: string): boolean {
  const normalized = normalizeText(reply);
  return /\b(ok|okay|yes|dong y|dung roi|chuan|tick di|lam di|confirm|xac nhan)\b/.test(normalized);
}

function detectOrdinalIndex(reply: string, maxLength: number): number | null {
  const normalized = normalizeText(reply);
  const numericMatch = normalized.match(/^(?:#?\s*)?(?:so|cai|task|viec|thu)?\s*(\d{1,2})$/);
  if (numericMatch) {
    const index = Number(numericMatch[1]) - 1;
    return index >= 0 && index < maxLength ? index : null;
  }

  const looseNumericMatch = normalized.match(/\b(?:so|cai|task|viec|thu)\s*(\d{1,2})\b/);
  if (looseNumericMatch) {
    const index = Number(looseNumericMatch[1]) - 1;
    return index >= 0 && index < maxLength ? index : null;
  }

  const ordinals: Array<[RegExp, number]> = [
    [/\b(dau tien|thu nhat|mot)\b/, 0],
    [/\b(thu hai|hai)\b/, 1],
    [/\b(thu ba|ba)\b/, 2],
    [/\b(thu tu|bon|tu)\b/, 3],
    [/\b(thu nam|nam)\b/, 4],
    [/\b(thu sau|sau)\b/, 5],
    [/\b(thu bay|bay)\b/, 6],
  ];

  for (const [pattern, index] of ordinals) {
    if (index < maxLength && pattern.test(normalized)) return index;
  }

  return null;
}

const FUZZY_STOPWORDS = new Set([
  "task",
  "viec",
  "nhiem",
  "vu",
  "cong",
  "cai",
  "so",
  "thu",
  "tick",
  "xong",
  "hoan",
  "thanh",
  "danh",
  "dau",
  "bo",
  "chon",
  "di",
  "nhe",
]);

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !FUZZY_STOPWORDS.has(token));
}

function scoreCandidate(reply: string, candidate: AssistantClarificationCandidate): number {
  const normalizedReply = normalizeText(reply);
  const normalizedId = normalizeText(candidate.id);
  const normalizedLabel = normalizeText(candidate.label);
  if (normalizedReply.includes(normalizedId)) return 120;
  if (normalizedReply.includes(normalizedLabel)) return 100;

  const queryTokens = tokenize(reply);
  const labelTokens = new Set(tokenize(candidate.label));
  if (queryTokens.length === 0 || labelTokens.size === 0) return 0;

  const overlap = queryTokens.filter((token) => labelTokens.has(token) || normalizedLabel.includes(token));
  if (overlap.length === 0) return 0;

  const queryCoverage = overlap.length / queryTokens.length;
  const labelCoverage = overlap.length / labelTokens.size;
  return Math.round(queryCoverage * 70 + labelCoverage * 30);
}

function resolveCandidateByText(
  reply: string,
  candidates: AssistantClarificationCandidate[],
): AssistantClarificationCandidate | null {
  const scored = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(reply, candidate) }))
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  const second = scored[1];
  if (!best || best.score < 40) return null;
  if (second && best.score - second.score < 10) return null;
  return best.candidate;
}

export function buildClarificationQuestion(
  intent: PendingAssistantClarificationIntent,
  candidates: AssistantClarificationCandidate[],
): string {
  const action = intent === "mark_task_done" ? "tick" : "bỏ tick";
  const lines = candidates
    .slice(0, MAX_CANDIDATES)
    .map((candidate, index) => `${index + 1}. ${candidate.label}`)
    .join("\n");
  return `Bạn muốn ${action} task nào?\n${lines}`;
}

export function createTaskSelectionClarification(input: {
  intent: PendingAssistantClarificationIntent;
  candidates: AssistantClarificationCandidate[];
  question?: string;
  now?: Date;
  ttlMs?: number;
}): PendingAssistantClarification {
  const now = input.now ?? new Date();
  const candidates = input.candidates
    .map(normalizeCandidate)
    .filter((candidate): candidate is AssistantClarificationCandidate => candidate !== null)
    .slice(0, MAX_CANDIDATES);

  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + (input.ttlMs ?? DEFAULT_TTL_MS)).toISOString();

  return {
    kind: "task_selection",
    intent: input.intent,
    question: sanitizeText(input.question, 500) || buildClarificationQuestion(input.intent, candidates),
    candidates,
    createdAt,
    expiresAt,
  };
}

export function isPendingAssistantClarificationExpired(
  pending: PendingAssistantClarification,
  referenceDate = new Date(),
): boolean {
  return Date.parse(pending.expiresAt) <= referenceDate.getTime();
}

export function setPendingAssistantClarification(
  userId: string | null,
  pending: PendingAssistantClarification,
): void {
  if (typeof localStorage === "undefined") return;
  const normalized = normalizePending(pending);
  if (!normalized) return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(normalized));
  } catch {}
}

export function getPendingAssistantClarification(
  userId: string | null,
  referenceDate = new Date(),
): PendingAssistantClarification | null {
  if (typeof localStorage === "undefined") return null;
  const key = getStorageKey(userId);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const pending = normalizePending(JSON.parse(raw));
    if (!pending) {
      localStorage.removeItem(key);
      return null;
    }
    if (isPendingAssistantClarificationExpired(pending, referenceDate)) {
      localStorage.removeItem(key);
      return null;
    }
    return pending;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function readStoredPendingAssistantClarification(userId: string | null): PendingAssistantClarification | null {
  if (typeof localStorage === "undefined") return null;
  const key = getStorageKey(userId);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const pending = normalizePending(JSON.parse(raw));
    if (!pending) {
      localStorage.removeItem(key);
      return null;
    }
    return pending;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearPendingAssistantClarification(userId: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch {}
}

export function resolveClarificationReply(
  reply: string,
  pending: PendingAssistantClarification,
  referenceDate = new Date(),
): ClarificationResolution {
  if (isPendingAssistantClarificationExpired(pending, referenceDate)) {
    return { status: "expired", pending };
  }

  if (isCancelReply(reply)) {
    return { status: "cancelled", pending };
  }

  if (pending.candidates.length === 1 && isConfirmReply(reply)) {
    return { status: "selected", pending, candidate: pending.candidates[0] };
  }

  const ordinalIndex = detectOrdinalIndex(reply, pending.candidates.length);
  if (ordinalIndex !== null) {
    return { status: "selected", pending, candidate: pending.candidates[ordinalIndex] };
  }

  const textMatch = resolveCandidateByText(reply, pending.candidates);
  if (textMatch) {
    return { status: "selected", pending, candidate: textMatch };
  }

  return {
    status: "unresolved",
    pending,
    question: `${pending.question}\n\nMình chưa nhận ra lựa chọn vừa rồi. Bạn có thể trả lời bằng số thứ tự hoặc tên task.`,
  };
}
