import { beforeEach, describe, expect, it } from "vitest";
import { mockProvider, resetAssistantSession } from "../assistantEngine";
import type { AssistantContext } from "../buildAssistantContext";
import { EVAL_CASES } from "../evals/assistantEvalCases";
import { parseAssistantReply } from "../parseActions";

const BASE_CONTEXT: AssistantContext = {
  currentWeek: null,
  weeksTotal: 12,
  goals: [],
  todayTasks: [],
  lastReflectionDate: null,
  feasibility: null,
  latestWeeklyReview: null,
  stuckSignals: {
    latestObstacle: null,
    missedCommitments: [],
    overdueOpenCount: 0,
    overdueTasks: [],
  },
  trend: {
    completionLast4Weeks: [],
    direction: "unknown",
  },
  streak: {
    daysWithCompletedTask: 0,
  },
  upcomingDeadlines: [],
  pageContext: {
    route: "/",
    currentStep: null,
    nextSuggestedStep: null,
    formDraft: {},
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function buildEvalContext(overrides: (typeof EVAL_CASES)[number]["context"]): AssistantContext {
  const pageContext = asRecord(overrides.pageContext);
  const formDraft = asRecord(pageContext.formDraft);
  const assistantMemory = overrides.assistantMemory
    ? {
        recurringObstacles: [],
        userPreferences: [],
        rejectedPatterns: [],
        recentCorrections: [],
        oftenMissedTasks: [],
        ...overrides.assistantMemory,
      }
    : undefined;

  return {
    ...BASE_CONTEXT,
    ...overrides,
    assistantMemory,
    stuckSignals: {
      ...BASE_CONTEXT.stuckSignals,
      ...asRecord(overrides.stuckSignals),
    },
    trend: {
      ...BASE_CONTEXT.trend,
      ...asRecord(overrides.trend),
    },
    streak: {
      ...BASE_CONTEXT.streak,
      ...asRecord(overrides.streak),
    },
    pageContext: {
      ...BASE_CONTEXT.pageContext,
      ...pageContext,
      formDraft: {
        ...BASE_CONTEXT.pageContext.formDraft,
        ...formDraft,
      },
    },
  } as AssistantContext;
}

function getTaskId(payload: unknown): string | null {
  const raw = asRecord(payload);
  return typeof raw.taskId === "string" ? raw.taskId : null;
}

describe("AI Assistant Evaluation Suite", () => {
  beforeEach(() => {
    resetAssistantSession();
  });

  for (const tc of EVAL_CASES) {
    it(`[${tc.id}] ${tc.name}`, async () => {
      const context = buildEvalContext(tc.context);
      const reply = await mockProvider.send(tc.input, context);
      const parsed = parseAssistantReply(reply);

      if (tc.expected.shouldContain) {
        for (const word of tc.expected.shouldContain) {
          expect(reply.toLowerCase()).toContain(word.toLowerCase());
        }
      }

      if (tc.expected.shouldNotContain) {
        for (const word of tc.expected.shouldNotContain) {
          expect(reply.toLowerCase()).not.toContain(word.toLowerCase());
        }
      }

      if (tc.expected.expectedActionTypes) {
        const parsedTypes = parsed.actions.map((act) => act.type);
        for (const expectedType of tc.expected.expectedActionTypes) {
          expect(parsedTypes).toContain(expectedType);
        }
      }

      if (tc.expected.forbiddenActionTypes) {
        const parsedTypes = parsed.actions.map((act) => act.type);
        for (const forbiddenType of tc.expected.forbiddenActionTypes) {
          expect(parsedTypes).not.toContain(forbiddenType);
        }
      }

      if (tc.expected.maxWords) {
        const wordCount = parsed.textContent.split(/\s+/).filter(Boolean).length;
        expect(wordCount).toBeLessThanOrEqual(tc.expected.maxWords);
      }

      if (tc.expected.mustAskClarifyingQuestion) {
        const normalizedReply = reply
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const hasQuestionMark =
          reply.includes("?") ||
          normalizedReply.includes("khong") ||
          normalizedReply.includes("gi") ||
          normalizedReply.includes("nao") ||
          normalizedReply.includes("cu the") ||
          normalizedReply.includes("vui long");
        expect(hasQuestionMark).toBe(true);
      }

      if (tc.expected.mustUseExistingTaskId) {
        const validTaskIds = new Set<string>();
        for (const task of context.todayTasks) validTaskIds.add(task.id);
        for (const task of context.stuckSignals.overdueTasks) validTaskIds.add(task.id);

        for (const action of parsed.actions) {
          if (
            action.type === "mark_task_done" ||
            action.type === "update_task_status" ||
            action.type === "reschedule_task"
          ) {
            const taskId = getTaskId(action.payload);
            expect(taskId).not.toBeNull();
            expect(validTaskIds.has(taskId ?? "")).toBe(true);
          }
        }
      }
    });
  }
});
