// GĐ5: Tests cho rollout/A-B assignment (canary cohort + variant deterministic).
// Khởi tạo env bắt buộc trước khi import module validate env.
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/assistant-test";
process.env.FIREBASE_PROJECT_ID ??= "assistant-test";
process.env.FIREBASE_CLIENT_EMAIL ??= "firebase-admin@example.test";
process.env.FIREBASE_PRIVATE_KEY ??= "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";

delete process.env.AI_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GROQ_API_KEY;

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideRollout, getConfiguredVariants } from "../services/assistantRollout";
import { hashSession } from "../services/assistantTelemetry";

async function withEnv(
  overrides: Record<string, unknown>,
  fn: () => void | Promise<void>,
): Promise<void> {
  const { env } = await import("../config/env");
  const originals: Record<string, unknown> = {};
  for (const key of Object.keys(overrides)) {
    originals[key] = (env as any)[key];
    (env as any)[key] = overrides[key];
  }
  try {
    await fn();
  } finally {
    for (const key of Object.keys(originals)) {
      (env as any)[key] = originals[key];
    }
  }
}

describe("assistantRollout - canary cohort", () => {
  it("demo mode luôn inCohort và control", async () => {
    await withEnv({ AI_CANARY_PERCENT: 0, AI_EXPERIMENT: "exp1", AI_EXPERIMENT_VARIANTS: "control,variant_a" }, () => {
      const decision = decideRollout("demo", undefined);
      assert.equal(decision.inCohort, true);
      assert.equal(decision.variant, "control");
    });
  });

  it("thiếu sessionHash luôn inCohort và control", async () => {
    await withEnv({ AI_CANARY_PERCENT: 0 }, () => {
      const decision = decideRollout("real", undefined);
      assert.equal(decision.inCohort, true);
      assert.equal(decision.variant, "control");
    });
  });

  it("canary 100% => mọi user inCohort", async () => {
    await withEnv({ AI_CANARY_PERCENT: 100 }, () => {
      const hash = hashSession("user-abc")!;
      assert.equal(decideRollout("real", hash).inCohort, true);
    });
  });

  it("canary 0% => không user nào inCohort (real, có hash)", async () => {
    await withEnv({ AI_CANARY_PERCENT: 0 }, () => {
      const hash = hashSession("user-abc")!;
      assert.equal(decideRollout("real", hash).inCohort, false);
    });
  });

  it("quyết định deterministic cho cùng sessionHash", async () => {
    await withEnv({ AI_CANARY_PERCENT: 50, AI_EXPERIMENT: "exp1", AI_EXPERIMENT_VARIANTS: "control,variant_a" }, () => {
      const hash = hashSession("stable-user")!;
      const a = decideRollout("real", hash);
      const b = decideRollout("real", hash);
      assert.deepEqual(a, b);
    });
  });

  it("canary ~percent: tỉ lệ inCohort xấp xỉ ngưỡng trên nhiều user", async () => {
    await withEnv({ AI_CANARY_PERCENT: 30 }, () => {
      let inCohort = 0;
      const total = 2000;
      for (let i = 0; i < total; i++) {
        const hash = hashSession(`user-${i}`)!;
        if (decideRollout("real", hash).inCohort) inCohort += 1;
      }
      const pct = (inCohort / total) * 100;
      assert.ok(pct > 22 && pct < 38, `expected ~30%, got ${pct}`);
    });
  });
});

describe("assistantRollout - variant assignment", () => {
  it("không experiment => control", async () => {
    await withEnv({ AI_EXPERIMENT: "", AI_EXPERIMENT_VARIANTS: "control,variant_a" }, () => {
      const hash = hashSession("user-x")!;
      assert.equal(decideRollout("real", hash).variant, "control");
    });
  });

  it("một variant => luôn variant đó", async () => {
    await withEnv({ AI_EXPERIMENT: "exp1", AI_EXPERIMENT_VARIANTS: "control" }, () => {
      const hash = hashSession("user-x")!;
      assert.equal(decideRollout("real", hash).variant, "control");
    });
  });

  it("nhiều variant => phân bổ trên cả hai nhánh", async () => {
    await withEnv({ AI_EXPERIMENT: "exp1", AI_EXPERIMENT_VARIANTS: "control,variant_a" }, () => {
      const counts = new Map<string, number>();
      for (let i = 0; i < 1000; i++) {
        const hash = hashSession(`u-${i}`)!;
        const v = decideRollout("real", hash).variant;
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      assert.ok((counts.get("control") ?? 0) > 100);
      assert.ok((counts.get("variant_a") ?? 0) > 100);
    });
  });

  it("getConfiguredVariants bỏ rỗng và trim", async () => {
    await withEnv({ AI_EXPERIMENT_VARIANTS: " control , , variant_a " }, () => {
      assert.deepEqual(getConfiguredVariants(), ["control", "variant_a"]);
    });
  });
});
