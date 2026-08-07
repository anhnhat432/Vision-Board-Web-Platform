import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalDataMigrationCandidate } from "../../utils/local-data-migration";
import type { UserData } from "../../utils/storage-types";
import { useCloudImportActions } from "./useCloudImportActions";

const mocks = vi.hoisted(() => ({
  createPayload: vi.fn(() => ({ goal: { clientGoalId: "goal_1" } })),
  postValidation: vi.fn(),
  postImport: vi.fn(),
  trackAppEvent: vi.fn(),
  markCloudImportCompleted: vi.fn(),
}));

vi.mock("@/features/plan12week/persistence/twelveWeekImportPayload", () => ({
  createTwelveWeekImportPayload: mocks.createPayload,
}));
vi.mock("@/lib/api/apiClient", () => ({ isApiBaseUrlConfigured: () => true }));
vi.mock("@/services/syncService", () => ({
  post12WeekImportValidation: mocks.postValidation,
  post12WeekImport: mocks.postImport,
}));
vi.mock("../../utils/app-mode", () => ({
  shouldEnable12WeekImportDryRun: () => true,
  shouldEnable12WeekCloudImport: () => true,
}));
vi.mock("../../utils/storage", () => ({
  getUserData: () => ({ goals: [{ id: "goal_1" }] }) as UserData,
  trackAppEvent: mocks.trackAppEvent,
}));
vi.mock("../../utils/local-data-migration", () => ({
  hasCompletedCloudImport: () => false,
  markCloudImportCompleted: mocks.markCloudImportCompleted,
}));

const candidate: LocalDataMigrationCandidate = {
  data: { goals: [] } as unknown as UserData,
  fingerprint: "candidate_fp",
  summary: {
    goalCount: 1,
    twelveWeekSystemCount: 1,
    taskCount: 0,
    dailyCheckInCount: 0,
    weeklyReviewCount: 0,
    wheelRecordCount: 0,
    reflectionCount: 0,
    visionBoardCount: 0,
  },
};

const validReport = {
  status: "valid" as const,
  mode: "validate_only" as const,
  dryRun: true as const,
  acceptedEntityCounts: {
    goals: 1,
    plans: 1,
    weeks: 12,
    tasks: 0,
    leadIndicators: 0,
    leadMetrics: 0,
    dailyCheckIns: 0,
    weeklyReviews: 0,
  },
  warnings: [],
  errors: [],
  normalizedClientIdsCount: 0,
};

describe("useCloudImportActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.postValidation.mockResolvedValue(validReport);
    mocks.postImport.mockResolvedValue({ status: "applied", importId: "cloud_import_1" });
  });

  it("tracks settings file import without writing migration completion state", async () => {
    const { result } = renderHook(() =>
      useCloudImportActions({
        demoMode: false,
        userUid: "owner_a",
        localDataMigrationCandidate: candidate,
        trackingSource: "settings_file_import",
        recordMigrationCompletion: false,
      }),
    );

    await act(async () => {
      await expect(result.current.handleCloudImport()).resolves.toMatchObject({ status: "applied" });
    });

    expect(mocks.trackAppEvent).toHaveBeenCalledWith("cloud_import_started", undefined, {
      goalCount: "1",
      source: "settings_file_import",
    });
    expect(mocks.markCloudImportCompleted).not.toHaveBeenCalled();
  });

  it("keeps the marker untouched when validation is invalid or import is partial", async () => {
    mocks.postValidation.mockResolvedValueOnce({
      ...validReport,
      status: "invalid",
      errors: [{ path: "workspace.goals[0]", code: "invalid_goal", message: "Invalid goal" }],
    });
    mocks.postImport.mockResolvedValueOnce({ status: "partial", importId: "cloud_import_1" });
    const { result } = renderHook(() =>
      useCloudImportActions({
        demoMode: false,
        userUid: "owner_a",
        localDataMigrationCandidate: null,
        trackingSource: "settings_file_import",
        recordMigrationCompletion: false,
      }),
    );
    await expect(result.current.handleValidateCloudImport()).resolves.toMatchObject({ status: "invalid" });
    await expect(result.current.handleCloudImport()).resolves.toMatchObject({ status: "partial" });
    expect(mocks.markCloudImportCompleted).not.toHaveBeenCalled();
  });

  it("keeps migration defaults for the original consumer", async () => {
    const { result } = renderHook(() =>
      useCloudImportActions({ demoMode: false, userUid: "owner_a", localDataMigrationCandidate: candidate }),
    );
    await act(async () => {
      await result.current.handleCloudImport();
    });
    expect(mocks.trackAppEvent).toHaveBeenCalledWith("cloud_import_started", undefined, {
      goalCount: "1",
      source: "local_data_migration_prompt",
    });
    expect(mocks.markCloudImportCompleted).toHaveBeenCalledWith("owner_a", "candidate_fp");
  });
});
