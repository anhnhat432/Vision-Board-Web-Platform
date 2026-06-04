import type { AssistantAction } from "../parseActions";
import type { AssistantEvalCase } from "./assistantEvalCases";

export interface EvalResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  actualReply: string;
  actualActions: AssistantAction[];
  failures: string[];
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  results: EvalResult[];
}

/**
 * Runs a set of assistant evaluation cases using a reply generator function.
 * Verifies correctness across several dimensions:
 * 1. String inclusion (shouldContain)
 * 2. String exclusion (shouldNotContain)
 * 3. Expected action types (expectedActionTypes)
 * 4. Forbidden action types (forbiddenActionTypes)
 * 5. Word count limit (maxWords)
 * 6. Clarification behavior (mustAskClarifyingQuestion)
 * 7. Correct task ID referencing (mustUseExistingTaskId)
 */
export async function runAssistantEvals(
  cases: AssistantEvalCase[],
  generateReply: (
    input: string,
    context: AssistantEvalCase["context"],
  ) => Promise<{ content: string; actions: AssistantAction[] }>,
): Promise<EvalSummary> {
  const results: EvalResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const c of cases) {
    const failures: string[] = [];
    try {
      const { content, actions } = await generateReply(c.input, c.context);
      const normalizedContent = content.toLowerCase();

      // 1. shouldContain check
      if (c.expected.shouldContain) {
        for (const word of c.expected.shouldContain) {
          if (!normalizedContent.includes(word.toLowerCase())) {
            failures.push(`Reply does not contain expected text: "${word}"`);
          }
        }
      }

      // 2. shouldNotContain check
      if (c.expected.shouldNotContain) {
        for (const word of c.expected.shouldNotContain) {
          if (normalizedContent.includes(word.toLowerCase())) {
            failures.push(`Reply contains forbidden text: "${word}"`);
          }
        }
      }

      // 3. expectedActionTypes check
      if (c.expected.expectedActionTypes) {
        for (const type of c.expected.expectedActionTypes) {
          const hasAction = actions.some((a) => a.type === type);
          if (!hasAction) {
            failures.push(`Expected action type "${type}" was not generated`);
          }
        }
      }

      // 4. forbiddenActionTypes check
      if (c.expected.forbiddenActionTypes) {
        for (const type of c.expected.forbiddenActionTypes) {
          const hasAction = actions.some((a) => a.type === type);
          if (hasAction) {
            failures.push(`Forbidden action type "${type}" was generated`);
          }
        }
      }

      // 5. maxWords check
      if (c.expected.maxWords) {
        const words = content.trim().split(/\s+/).filter(Boolean).length;
        if (words > c.expected.maxWords) {
          failures.push(`Word count ${words} exceeded max limit of ${c.expected.maxWords}`);
        }
      }

      // 6. mustAskClarifyingQuestion check
      if (c.expected.mustAskClarifyingQuestion) {
        const hasClarification =
          normalizedContent.includes("?") ||
          normalizedContent.includes("bạn vui lòng") ||
          normalizedContent.includes("chọn") ||
          normalizedContent.includes("không thấy") ||
          normalizedContent.includes("nào");
        if (!hasClarification) {
          failures.push("Expected AI to ask a clarifying question, but reply did not seem to contain one");
        }
      }

      // 7. mustUseExistingTaskId check
      if (c.expected.mustUseExistingTaskId) {
        const existingTaskIds = new Set<string>();

        if (c.context.todayTasks && Array.isArray(c.context.todayTasks)) {
          for (const t of c.context.todayTasks) {
            if (t.id) existingTaskIds.add(t.id);
          }
        }
        if (c.context.stuckSignals?.overdueTasks && Array.isArray(c.context.stuckSignals.overdueTasks)) {
          for (const t of c.context.stuckSignals.overdueTasks) {
            if (t.id) existingTaskIds.add(t.id);
          }
        }

        for (const action of actions) {
          const taskId = action.payload?.taskId;
          if (typeof taskId === "string" && !existingTaskIds.has(taskId)) {
            failures.push(`Action used non-existent taskId: "${taskId}"`);
          }
        }
      }

      const passed = failures.length === 0;
      if (passed) passedCount++;
      else failedCount++;

      results.push({
        caseId: c.id,
        caseName: c.name,
        passed,
        actualReply: content,
        actualActions: actions,
        failures,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      failedCount++;
      results.push({
        caseId: c.id,
        caseName: c.name,
        passed: false,
        actualReply: "",
        actualActions: [],
        failures: [`Error running case: ${message}`],
      });
    }
  }

  return {
    total: cases.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
