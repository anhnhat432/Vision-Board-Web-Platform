// G7: Tests cho circuit breaker của provider AI (Groq).
// Khởi tạo env bắt buộc trước khi import module validate env.
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  canRequest,
  getCircuitSnapshot,
  getCircuitState,
  isTransientProviderErrorCode,
  recordFailure,
  recordSuccess,
  resetCircuitBreaker,
} from "../services/assistantCircuitBreaker";
import { env } from "../config/env";

const THRESHOLD = 4;
const COOLDOWN = 30_000;

describe("assistantCircuitBreaker", () => {
  beforeEach(() => {
    resetCircuitBreaker();
    env.AI_GROQ_CIRCUIT_FAILURE_THRESHOLD = THRESHOLD;
    env.AI_GROQ_CIRCUIT_COOLDOWN_MS = COOLDOWN;
  });

  it("phân loại đúng lỗi transient vs non-transient", () => {
    assert.equal(isTransientProviderErrorCode("ASSISTANT_PROVIDER_RATE_LIMIT"), true);
    assert.equal(isTransientProviderErrorCode("ASSISTANT_PROVIDER_TIMEOUT"), true);
    assert.equal(isTransientProviderErrorCode("ASSISTANT_PROVIDER_SERVER_ERROR"), true);
    assert.equal(isTransientProviderErrorCode("ASSISTANT_PROVIDER_AUTH_ERROR"), false);
    assert.equal(isTransientProviderErrorCode("ASSISTANT_PROVIDER_NOT_CONFIGURED"), false);
    assert.equal(isTransientProviderErrorCode(undefined), false);
  });

  it("mặc định closed và cho phép request", () => {
    assert.equal(getCircuitState(), "closed");
    assert.equal(canRequest(), true);
  });

  it("lỗi non-transient không mở circuit", () => {
    for (let i = 0; i < THRESHOLD + 2; i++) {
      recordFailure("ASSISTANT_PROVIDER_AUTH_ERROR");
    }
    assert.equal(getCircuitState(), "closed");
    assert.equal(canRequest(), true);
  });

  it("mở circuit sau khi đủ ngưỡng lỗi transient liên tiếp", () => {
    const now = 1_000_000;
    for (let i = 0; i < THRESHOLD; i++) {
      recordFailure("ASSISTANT_PROVIDER_RATE_LIMIT", now);
    }
    assert.equal(getCircuitState(now), "open");
    assert.equal(canRequest(now), false);
    const snapshot = getCircuitSnapshot(now);
    assert.equal(snapshot.state, "open");
    assert.equal(snapshot.retryAfterMs, COOLDOWN);
  });

  it("success giữa chừng reset bộ đếm", () => {
    recordFailure("ASSISTANT_PROVIDER_TIMEOUT");
    recordFailure("ASSISTANT_PROVIDER_TIMEOUT");
    recordSuccess();
    for (let i = 0; i < THRESHOLD - 1; i++) {
      recordFailure("ASSISTANT_PROVIDER_TIMEOUT");
    }
    // Mới 3 lỗi sau reset, chưa đủ threshold.
    assert.equal(getCircuitState(), "closed");
  });

  it("chuyển half_open sau cooldown và chỉ cho 1 request thăm dò", () => {
    const opened = 2_000_000;
    for (let i = 0; i < THRESHOLD; i++) {
      recordFailure("ASSISTANT_PROVIDER_SERVER_ERROR", opened);
    }
    const afterCooldown = opened + COOLDOWN + 1;
    assert.equal(getCircuitState(afterCooldown), "half_open");
    // Request thăm dò đầu tiên được phép.
    assert.equal(canRequest(afterCooldown), true);
    // Request song song thứ hai bị chặn.
    assert.equal(canRequest(afterCooldown), false);
  });

  it("half_open + success -> đóng lại circuit", () => {
    const opened = 3_000_000;
    for (let i = 0; i < THRESHOLD; i++) {
      recordFailure("ASSISTANT_PROVIDER_RATE_LIMIT", opened);
    }
    const afterCooldown = opened + COOLDOWN + 1;
    assert.equal(canRequest(afterCooldown), true);
    recordSuccess();
    assert.equal(getCircuitState(afterCooldown), "closed");
    assert.equal(canRequest(afterCooldown), true);
  });

  it("half_open + failure -> mở lại circuit", () => {
    const opened = 4_000_000;
    for (let i = 0; i < THRESHOLD; i++) {
      recordFailure("ASSISTANT_PROVIDER_TIMEOUT", opened);
    }
    const afterCooldown = opened + COOLDOWN + 1;
    assert.equal(canRequest(afterCooldown), true);
    recordFailure("ASSISTANT_PROVIDER_TIMEOUT", afterCooldown);
    assert.equal(getCircuitState(afterCooldown), "open");
    assert.equal(canRequest(afterCooldown), false);
  });
});
