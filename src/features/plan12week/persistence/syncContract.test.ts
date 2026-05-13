import { describe, expect, it } from "vitest";

import {
  getTwelveWeekSyncFeatureFlags,
  getTwelveWeekSyncReadiness,
  RETRYABLE_MUTATION_STATUSES,
  TWELVE_WEEK_SOURCE_OF_TRUTH_CONTRACT,
  TWELVE_WEEK_SYNC_STATUS_FLOW,
} from "./syncContract";

const enabledFeatureInput = {
  realMode: true,
  mutationSyncEnabled: true,
  pullSyncEnabled: true,
  apiConfigured: true,
};

describe("twelve week sync contract", () => {
  it("documents local-first source of truth rules", () => {
    expect(TWELVE_WEEK_SOURCE_OF_TRUTH_CONTRACT.demoMode).toContain("localStorage");
    expect(TWELVE_WEEK_SOURCE_OF_TRUTH_CONTRACT.realModeLocalFirst).toContain("Local writes");
    expect(TWELVE_WEEK_SYNC_STATUS_FLOW).toEqual(
      expect.arrayContaining(["local_saved", "queued", "synced", "conflict", "queue_failed_local_saved"]),
    );
  });

  it("keeps full sync behind pull sync while allowing drain-only mutation sync", () => {
    const flags = getTwelveWeekSyncFeatureFlags({
      ...enabledFeatureInput,
      pullSyncEnabled: false,
    });

    expect(flags.fullSyncEnabled).toBe(false);
    expect(flags.fullSyncBlockedReason).toBe("pull_sync_disabled");
    expect(flags.drainSyncEnabled).toBe(true);
    expect(flags.drainSyncBlockedReason).toBeNull();
  });

  it("blocks all cloud sync outside real mode", () => {
    const flags = getTwelveWeekSyncFeatureFlags({
      ...enabledFeatureInput,
      realMode: false,
    });

    expect(flags.fullSyncEnabled).toBe(false);
    expect(flags.drainSyncEnabled).toBe(false);
    expect(flags.fullSyncBlockedReason).toBe("demo_mode");
    expect(flags.drainSyncBlockedReason).toBe("demo_mode");
  });

  it("reports runtime readiness separately from feature flags", () => {
    const readiness = getTwelveWeekSyncReadiness({
      ...enabledFeatureInput,
      ownerUid: "user_1",
      userProfileReady: true,
      online: true,
      documentVisible: false,
    });

    expect(readiness.fullSyncEnabled).toBe(true);
    expect(readiness.fullSyncBaseReady).toBe(true);
    expect(readiness.drainSyncBaseReady).toBe(true);
    expect(readiness.drainSyncReady).toBe(false);
    expect(readiness.drainSyncBlockedReason).toBe("document_hidden");
  });

  it("defines retryable queue statuses used by local-first drain", () => {
    expect(RETRYABLE_MUTATION_STATUSES.has("pending")).toBe(true);
    expect(RETRYABLE_MUTATION_STATUSES.has("retry_scheduled")).toBe(true);
    expect(RETRYABLE_MUTATION_STATUSES.has("applied")).toBe(false);
    expect(RETRYABLE_MUTATION_STATUSES.has("failed_terminal")).toBe(false);
  });
});
