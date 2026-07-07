import { describe, expect, it } from "vitest";
import { ASSISTANT_ACTION_CONTRACT_CASES, buildActionBlock } from "@shared/assistantActionContractCases";
import { sanitizeActionPayload, VALID_ACTION_TYPES, VALID_ROUTES } from "@shared/assistantActionSchema";
import { parseAssistantReply } from "../parseActions";

describe("assistant action schema contract (frontend)", () => {
  it("covers all 11 action types exactly once", () => {
    const caseTypes = ASSISTANT_ACTION_CONTRACT_CASES.map((c) => c.type).sort();
    const schemaTypes = [...VALID_ACTION_TYPES].sort();
    expect(caseTypes).toEqual(schemaTypes);
    expect(new Set(caseTypes).size).toBe(11);
  });

  it("frontend route whitelist matches the shared schema and drops the phantom /today-v2 route", () => {
    expect(VALID_ROUTES).toContain("/today");
    expect(VALID_ROUTES).toContain("/journal");
    expect(VALID_ROUTES).not.toContain("/reflection");
    expect(VALID_ROUTES).not.toContain("/today-v2");
  });

  for (const testCase of ASSISTANT_ACTION_CONTRACT_CASES) {
    it(`frontend parseAssistantReply produces the shared payload for ${testCase.type}`, () => {
      const result = parseAssistantReply(buildActionBlock(testCase));
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe(testCase.type);
      expect(result.actions[0].payload).toEqual(testCase.expectedPayload);
    });

    it(`shared sanitizeActionPayload matches the contract for ${testCase.type}`, () => {
      const sanitized = sanitizeActionPayload(testCase.type, testCase.rawPayload);
      expect(sanitized).toEqual(testCase.expectedPayload);
    });
  }
});
