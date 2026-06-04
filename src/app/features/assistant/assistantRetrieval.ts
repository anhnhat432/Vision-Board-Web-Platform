import { getUserData } from "@/app/utils/storage";
import type { Goal } from "@/app/utils/storage-types";
import { getMemoryItems, redactSensitive } from "./assistantMemory";
import type { AssistantRetrievedMemory } from "./types";

export type { AssistantRetrievedMemory };

interface RetrievalCandidate {
  source: AssistantRetrievedMemory["source"];
  title: string;
  snippet: string;
  date?: string;
  goalId?: string;
  taskId?: string;
  tags?: string[];
  type?: string;
}

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 10;
const MAX_TITLE_LENGTH = 160;
const MAX_SNIPPET_LENGTH = 220;

export function removeAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D");
}

export function tokenize(text: string): string[] {
  return removeAccents(text.toLowerCase())
    .split(/[\s,.:;!?"'()\-\[\]/]+/)
    .filter((token) => token.length > 1);
}

function boundedText(value: unknown, maxLength: number): string {
  return redactSensitive(String(value ?? "")).trim().slice(0, maxLength);
}

function calculateGoalProgress(goal: Goal): number {
  if (!goal.tasks || goal.tasks.length === 0) return 0;
  const completed = goal.tasks.filter((task) => task.completed).length;
  return Math.round((completed / goal.tasks.length) * 100);
}

function normalizeLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

function addGoalCandidates(goal: Goal, candidates: RetrievalCandidate[]): void {
  candidates.push({
    source: "goal",
    title: goal.title,
    snippet: `Goal: ${goal.title} (Category: ${goal.category || "other"}, Progress: ${calculateGoalProgress(goal)}%, Deadline: ${goal.deadline || "None"})`,
    date: goal.createdAt ? goal.createdAt.slice(0, 10) : undefined,
    goalId: goal.id,
  });

  const system = goal.twelveWeekSystem;
  if (!system) return;

  candidates.push({
    source: "goal",
    title: `Outcome 12 tuan cho ${goal.title}`,
    snippet: `Outcome 12 tuan: ${system.week12Outcome || "None"} (Lag Metric: ${system.lagMetric?.name || "None"} target ${system.lagMetric?.target || "None"})`,
    date: system.startDate ? system.startDate.slice(0, 10) : undefined,
    goalId: goal.id,
  });

  for (const review of system.weeklyReviews || []) {
    candidates.push({
      source: "weekly_review",
      title: `Weekly Review tuan ${review.weekNumber} cua ${goal.title}`,
      snippet: `Weekly Review tuan ${review.weekNumber}: Tro ngai: ${review.mainObstacle || "None"}. Uu tien tuan toi: ${review.nextWeekPriority || "None"}. Khoi luong: ${review.workloadDecision || "None"}`,
      date: review.lastReviewAt ? review.lastReviewAt.slice(0, 10) : undefined,
      goalId: goal.id,
    });
  }

  for (const task of system.taskInstances || []) {
    candidates.push({
      source: "task",
      title: `Task: ${task.title}`,
      snippet: `Task: ${task.title} (Tuan ${task.weekNumber}, Ngay ${task.scheduledDate}, Xong: ${task.completed})`,
      date: task.scheduledDate,
      goalId: goal.id,
      taskId: task.id,
    });
  }
}

function addAssistantMemoryCandidates(candidates: RetrievalCandidate[], userId: string | null = null): void {
  try {
    const items = getMemoryItems(userId);
    for (const item of items) {
      candidates.push({
        source: "assistant_memory",
        title: `Memory - Type: ${item.type}`,
        snippet: item.content,
        date: item.createdAt,
        type: item.type,
        tags: item.tags,
      });
    }
  } catch {
    // Retrieval should never block if memory is broken
  }
}

function applyTimeDecay(score: number, candidateDate: string | undefined, referenceDate: Date): number {
  if (!candidateDate) return score;

  const parsedDate = new Date(candidateDate);
  if (Number.isNaN(parsedDate.getTime())) return score;

  const diffTime = Math.abs(referenceDate.getTime() - parsedDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return score / (1 + 0.01 * diffDays);
}

export function retrieveAssistantKnowledge(
  query: string,
  options?: { limit?: number; referenceDate?: Date; userId?: string | null; activeGoalId?: string | null },
): AssistantRetrievedMemory[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  let data: ReturnType<typeof getUserData> | null = null;
  try {
    data = getUserData();
  } catch {}

  const candidates: RetrievalCandidate[] = [];
  if (data) {
    for (const goal of data.goals || []) {
      addGoalCandidates(goal, candidates);
    }

    for (const reflection of data.reflections || []) {
      candidates.push({
        source: "reflection",
        title: reflection.title || "Nhin lai cuoc song",
        snippet: `Reflection: ${reflection.title || "Nhin lai"} - ${reflection.content || ""} (${reflection.mood || "Khong ro tam trang"})`,
        date: reflection.date ? reflection.date.slice(0, 10) : undefined,
      });
    }
  }

  const userId = options?.userId ?? null;
  addAssistantMemoryCandidates(candidates, userId);

  const queryTokens = tokenize(trimmedQuery);
  const referenceDate = options?.referenceDate || new Date();
  const results: AssistantRetrievedMemory[] = [];

  const lowerQuery = trimmedQuery.toLowerCase();
  const isCorrectionQuery =
    lowerQuery.includes("sửa") ||
    lowerQuery.includes("không phải") ||
    lowerQuery.includes("trước đó") ||
    lowerQuery.includes("nhắc");

  for (const candidate of candidates) {
    const titleTokens = tokenize(candidate.title);
    const snippetTokens = tokenize(candidate.snippet);
    const tagTokens = candidate.tags ? candidate.tags.flatMap((t) => tokenize(t)) : [];

    let score = 0;
    for (const queryToken of queryTokens) {
      if (titleTokens.includes(queryToken)) score += 2;
      if (snippetTokens.includes(queryToken)) score += 1;
      if (tagTokens.includes(queryToken)) score += 2;
    }

    if (score <= 0) continue;

    // Phạt/Thưởng bổ sung (Heuristics)
    // 1. Thưởng nếu là goal active hiện tại
    if (options?.activeGoalId && candidate.goalId === options.activeGoalId) {
      score += 1.0;
    }

    // 2. Thưởng correction nếu query là correction-related
    if (candidate.type === "assistant_correction" && isCorrectionQuery) {
      score += 1.5;
    }

    const decayedScore = applyTimeDecay(score, candidate.date, referenceDate);
    results.push({
      source: candidate.source,
      title: boundedText(candidate.title, MAX_TITLE_LENGTH),
      snippet: boundedText(candidate.snippet, MAX_SNIPPET_LENGTH),
      score: Math.round(decayedScore * 100) / 100,
      date: candidate.date,
      goalId: candidate.goalId,
      taskId: candidate.taskId,
    });
  }

  results.sort((left, right) => right.score - left.score);
  return results.slice(0, normalizeLimit(options?.limit));
}
