import { describe, expect, it } from "vitest";
import type { AssistantGoldenExample } from "../../assistantFeedback";
import { EVAL_CASES } from "../assistantEvalCases";
import {
  feedbackToEvalCases,
  mergeFeedbackEvalCases,
} from "../feedbackToEvalCase";

let counter = 0;
function makeGolden(overrides: Partial<AssistantGoldenExample>): AssistantGoldenExample {
  counter += 1;
  return {
    id: `golden_${counter}`,
    userId: "user_1",
    route: "/today",
    rating: "not_helpful",
    createdAt: "2026-06-03T10:00:00.000Z",
    userMessage: "hoàn thành task giúp tôi",
    assistantMessage: "ok",
    context: null,
    ...overrides,
  };
}

describe("feedbackToEvalCases", () => {
  it("only converts not_helpful feedback with matching reasons", () => {
    const examples = [
      makeGolden({ rating: "helpful", reason: "wrong_context" }),
      makeGolden({ reason: "too_long" }),
      makeGolden({ reason: "wrong_context" }),
    ];

    const cases = feedbackToEvalCases(examples);
    expect(cases).toHaveLength(1);
    expect(cases[0].name).toContain("wrong_context");
  });

  it("derives clarification expectation for wrong_context with empty context", () => {
    const examples = [
      makeGolden({
        reason: "wrong_context",
        context: { currentWeek: null, goals: [], todayTasks: [] } as unknown as AssistantGoldenExample["context"],
      }),
    ];

    const [evalCase] = feedbackToEvalCases(examples);
    expect(evalCase.expected.mustAskClarifyingQuestion).toBe(true);
    expect(evalCase.expected.forbiddenActionTypes).toContain("create_goal");
  });

  it("forbids the wrong action type that was executed", () => {
    const examples = [
      makeGolden({
        reason: "wrong_action",
        expectedActionType: "mark_task_done",
        actionExecution: { actionType: "create_task", success: true, message: "" },
      }),
    ];

    const [evalCase] = feedbackToEvalCases(examples);
    expect(evalCase.expected.expectedActionTypes).toContain("mark_task_done");
    expect(evalCase.expected.forbiddenActionTypes).toContain("create_task");
    expect(evalCase.expected.mustUseExistingTaskId).toBe(true);
  });

  it("redacts secrets from the user message used as eval input", () => {
    const examples = [
      makeGolden({
        reason: "wrong_context",
        userMessage: "api_key=sk_live_abcd1234efgh5678ijkl tôi cần giúp",
      }),
    ];

    const [evalCase] = feedbackToEvalCases(examples);
    expect(evalCase.input).not.toContain("sk_live_abcd1234efgh5678ijkl");
    expect(evalCase.input.toLowerCase()).toContain("redacted");
  });

  it("deduplicates identical feedback signals", () => {
    const examples = [
      makeGolden({ reason: "wrong_context" }),
      makeGolden({ reason: "wrong_context" }),
    ];
    const cases = feedbackToEvalCases(examples);
    expect(cases).toHaveLength(1);
  });

  it("respects the maxCases limit", () => {
    const examples = [
      makeGolden({ reason: "wrong_context", userMessage: "câu hỏi một" }),
      makeGolden({ reason: "wrong_context", userMessage: "câu hỏi hai" }),
      makeGolden({ reason: "wrong_context", userMessage: "câu hỏi ba" }),
    ];
    const cases = feedbackToEvalCases(examples, { maxCases: 2 });
    expect(cases).toHaveLength(2);
  });

  it("skips feedback without a usable expectation", () => {
    const examples = [makeGolden({ reason: "wrong_action" })];
    const cases = feedbackToEvalCases(examples);
    expect(cases).toHaveLength(0);
  });
});

describe("mergeFeedbackEvalCases", () => {
  it("appends new cases without duplicating ids", () => {
    const feedbackCases = feedbackToEvalCases([makeGolden({ reason: "wrong_context" })]);
    const merged = mergeFeedbackEvalCases(EVAL_CASES, feedbackCases);
    expect(merged.length).toBe(EVAL_CASES.length + feedbackCases.length);

    const mergedTwice = mergeFeedbackEvalCases(merged, feedbackCases);
    expect(mergedTwice.length).toBe(merged.length);
  });
});
