/**
 * Property-based test cho `resolveCoreFlowPosition`.
 *
 * Feature: core-flow-ui-upgrade, Property 3: Vị trí Core_Flow nhất quán với thứ tự bước.
 *
 * Generator: sinh `CoreFlowCompletion` (6 cờ boolean độc lập) và `currentStepId`
 * BẤT KỲ trong `CORE_FLOW_STEP_ORDER` (`fc.constantFrom`), `numRuns: 100`.
 * Pure test — không render DOM, không I/O.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5
 */

// Feature: core-flow-ui-upgrade, Property 3

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  CORE_FLOW_STEP_ORDER,
  type CoreFlowCompletion,
  type CoreFlowStepId,
  resolveCoreFlowPosition,
} from "./core-flow-position";

/** Generator cho `CoreFlowCompletion`: mỗi bước một cờ boolean độc lập. */
const completionArb: fc.Arbitrary<CoreFlowCompletion> = fc.record({
  life_balance: fc.boolean(),
  life_insight: fc.boolean(),
  smart_goal: fc.boolean(),
  feasibility: fc.boolean(),
  twelve_week_setup: fc.boolean(),
  today: fc.boolean(),
});

/** Generator cho `currentStepId`: một bước bất kỳ trong thứ tự Core_Flow. */
const stepIdArb: fc.Arbitrary<CoreFlowStepId> = fc.constantFrom(
  ...CORE_FLOW_STEP_ORDER,
);

describe("resolveCoreFlowPosition — Property 3", () => {
  it("vị trí Core_Flow nhất quán với thứ tự bước", () => {
    fc.assert(
      fc.property(stepIdArb, completionArb, (currentStepId, completion) => {
        const position = resolveCoreFlowPosition(currentStepId, completion);
        const totalSteps = CORE_FLOW_STEP_ORDER.length;
        const currentIndex = CORE_FLOW_STEP_ORDER.indexOf(currentStepId);

        // totalSteps luôn bằng độ dài thứ tự Core_Flow.
        expect(position.totalSteps).toBe(totalSteps);

        // firstIncompleteStepId là bước `false` đầu tiên theo thứ tự, hoặc null
        // khi tất cả bước đã `true`.
        const expectedFirstIncomplete =
          CORE_FLOW_STEP_ORDER.find((stepId) => !completion[stepId]) ?? null;
        expect(position.firstIncompleteStepId).toBe(expectedFirstIncomplete);
        if (CORE_FLOW_STEP_ORDER.every((stepId) => completion[stepId])) {
          expect(position.firstIncompleteStepId).toBeNull();
        } else {
          expect(position.firstIncompleteStepId).not.toBeNull();
          // Bước trả về phải thực sự chưa hoàn tất.
          expect(
            completion[position.firstIncompleteStepId as CoreFlowStepId],
          ).toBe(false);
        }

        // stepNumber nằm trong [1, totalSteps] và bằng chỉ số 1-based của
        // currentStepId.
        expect(position.stepNumber).toBe(currentIndex + 1);
        expect(position.stepNumber).toBeGreaterThanOrEqual(1);
        expect(position.stepNumber).toBeLessThanOrEqual(totalSteps);

        // nextStepId === null KHI VÀ CHỈ KHI currentStepId là bước cuối; ngược
        // lại là bước liền sau đúng thứ tự.
        const isLastStep = currentIndex === totalSteps - 1;
        if (isLastStep) {
          expect(position.nextStepId).toBeNull();
        } else {
          expect(position.nextStepId).not.toBeNull();
          expect(position.nextStepId).toBe(
            CORE_FLOW_STEP_ORDER[currentIndex + 1],
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
