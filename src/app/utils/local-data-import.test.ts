import { beforeEach, describe, expect, it } from "vitest";
import { createDataExportJson } from "./local-data-backup";
import {
  MAX_LOCAL_DATA_IMPORT_BYTES,
  fingerprintLocalDataImport,
  prepareLocalDataImportCandidate,
  summarizeLocalDataImport,
} from "./local-data-import";
import { getUserData, resetUserDataCache } from "./storage";

describe("local data import candidate", () => {
  beforeEach(() => {
    localStorage.clear();
    resetUserDataCache();
  });

  it("rejects an oversized file before parsing", () => {
    const result = prepareLocalDataImportCandidate({
      fileName: "too-large.json",
      sizeBytes: MAX_LOCAL_DATA_IMPORT_BYTES + 1,
      text: "{}",
      currentData: getUserData(),
    });
    expect(result).toEqual({ status: "invalid", reason: "file_too_large" });
  });

  it("rejects invalid JSON and partial account exports", () => {
    const currentData = getUserData();
    expect(
      prepareLocalDataImportCandidate({ fileName: "bad.json", sizeBytes: 4, text: "{bad", currentData }),
    ).toMatchObject({ status: "invalid", reason: "invalid_backup" });
    expect(
      prepareLocalDataImportCandidate({
        fileName: "partial.json",
        sizeBytes: 100,
        text: createDataExportJson(currentData),
        currentData,
      }),
    ).toMatchObject({ status: "invalid", reason: "invalid_backup" });
  });

  it("sanitizes account-bound fields and preserves the current identity", () => {
    const currentData = { ...getUserData(), userId: "current_identity" };
    const fileData = {
      ...currentData,
      userId: "foreign_identity",
      subscription: {
        planCode: "PLUS",
        status: "active",
        billingCycle: "monthly",
        startedAt: "2026-08-01T00:00:00.000Z",
        providerMode: "api_contract",
      },
      entitlements: [
        {
          key: "advanced_analytics",
          sourcePlan: "PLUS",
          grantedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      eventLog: [{ id: "event_1", type: "test", createdAt: "2026-08-07T00:00:00.000Z" }],
      syncOutbox: [],
      isHydratedFromDemo: true,
    };

    const result = prepareLocalDataImportCandidate({
      fileName: "backup.json",
      sizeBytes: 100,
      text: JSON.stringify(fileData),
      currentData,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("candidate not ready");
    expect(result.candidate.data.userId).toBe("current_identity");
    expect(result.candidate.data.subscription).toBeNull();
    expect(result.candidate.data.entitlements).toEqual([]);
    expect(result.candidate.data.eventLog).toEqual([]);
    expect(result.candidate.data.isHydratedFromDemo).not.toBe(true);
  });

  it("summarizes supported product records and creates stable change fingerprints", () => {
    const data = getUserData();
    expect(summarizeLocalDataImport(data)).toMatchObject({ goalCount: data.goals.length });
    expect(fingerprintLocalDataImport(data)).toBe(fingerprintLocalDataImport(JSON.parse(JSON.stringify(data))));
  });
});
