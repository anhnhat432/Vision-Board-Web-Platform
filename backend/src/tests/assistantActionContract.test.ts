// Khởi tạo env bắt buộc trước khi import file validate env
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSISTANT_ACTION_CONTRACT_CASES,
  buildActionBlock,
} from "../shared/assistantActionContractCases";
import { sanitizeActionPayload, VALID_ACTION_TYPES, VALID_ROUTES } from "../shared/assistantActionSchema";
import { parseAndValidateAIResponse } from "../services/aiAssistantService";

describe("assistant action schema contract (backend)", () => {
  it("covers all 11 action types exactly once", () => {
    const caseTypes = ASSISTANT_ACTION_CONTRACT_CASES.map((c) => c.type).sort();
    const schemaTypes = [...VALID_ACTION_TYPES].sort();
    assert.deepEqual(caseTypes, schemaTypes);
    assert.equal(new Set(caseTypes).size, 11);
  });

  it("backend route whitelist matches the shared schema and drops the phantom /today-v2 route", () => {
    assert.ok((VALID_ROUTES as readonly string[]).includes("/today"));
    assert.ok((VALID_ROUTES as readonly string[]).includes("/journal"));
    assert.ok(!(VALID_ROUTES as readonly string[]).includes("/reflection"));
    assert.ok(!(VALID_ROUTES as readonly string[]).includes("/today-v2"));
  });

  for (const testCase of ASSISTANT_ACTION_CONTRACT_CASES) {
    it(`backend parseAndValidateAIResponse produces the shared payload for ${testCase.type}`, () => {
      const result = parseAndValidateAIResponse(buildActionBlock(testCase));
      assert.equal(result.proposedActions.length, 1);
      assert.equal(result.proposedActions[0].type, testCase.type);
      assert.deepEqual(result.proposedActions[0].payload, testCase.expectedPayload);
    });

    it(`shared sanitizeActionPayload matches the contract for ${testCase.type}`, () => {
      const sanitized = sanitizeActionPayload(testCase.type, testCase.rawPayload);
      assert.deepEqual(sanitized, testCase.expectedPayload);
    });
  }
});
