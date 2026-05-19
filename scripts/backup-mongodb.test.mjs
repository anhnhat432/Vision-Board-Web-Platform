import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildEncryptedArchivePath,
  buildR2ObjectKey,
  encryptArchiveWithGpg,
  getR2ConfigFromEnv,
  uploadArtifactToR2,
} from "./backup-mongodb.mjs";

describe("MongoDB backup GPG encryption", () => {
  it("passes the GPG passphrase through stdin instead of argv", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "vision-board-backup-"));
    const archivePath = path.join(tempDir, "backup.archive.gz");
    writeFileSync(archivePath, "archive");

    const result = encryptArchiveWithGpg({
      archivePath,
      passphrase: "do-not-leak",
      spawnSyncImpl(command, args, options) {
        expect(command).toBe("gpg");
        expect(args).not.toContain("do-not-leak");
        expect(options.input).toBe("do-not-leak\n");
        writeFileSync(buildEncryptedArchivePath(archivePath), "encrypted");
        return { status: 0, stderr: "", stdout: "" };
      },
    });

    expect(result.encryptedPath).toBe(`${archivePath}.gpg`);
    expect(result.sizeBytes).toBe(Buffer.byteLength("encrypted"));
  });
});

describe("MongoDB backup R2 config", () => {
  it("uses Cloudflare R2 defaults and the backup prefix env alias", () => {
    expect(
      getR2ConfigFromEnv({
        R2_ACCOUNT_ID: "account",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "bucket",
        MONGODB_BACKUP_R2_PREFIX: "mongodb/vision-board/",
      }),
    ).toEqual({
      accountId: "account",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucket: "bucket",
      endpoint: "https://account.r2.cloudflarestorage.com",
      prefix: "mongodb/vision-board",
    });
  });

  it("requires a complete R2 config when any R2 setting is present", () => {
    expect(() => getR2ConfigFromEnv({ R2_ACCOUNT_ID: "account" })).toThrow(
      "Missing R2 backup config: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET",
    );
  });
});

describe("MongoDB backup R2 upload", () => {
  it("uploads the encrypted artifact to the configured object key and verifies it", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "vision-board-backup-"));
    const artifactPath = path.join(tempDir, "backup.archive.gz.gpg");
    writeFileSync(artifactPath, "encrypted");

    const requests = [];
    const result = await uploadArtifactToR2({
      artifactPath,
      objectKey: buildR2ObjectKey({ artifactPath, prefix: "mongodb/vision-board" }),
      config: {
        accountId: "account",
        accessKeyId: "access",
        secretAccessKey: "secret",
        bucket: "bucket",
        endpoint: "https://account.r2.cloudflarestorage.com",
        prefix: "mongodb/vision-board",
      },
      now: new Date("2026-05-18T00:00:00Z"),
      fetchImpl: async (url, init) => {
        requests.push({ url: String(url), init });
        return { ok: true, status: init.method === "HEAD" ? 200 : 201, text: async () => "" };
      },
    });

    expect(result.objectUri).toBe("r2://bucket/mongodb/vision-board/backup.archive.gz.gpg");
    expect(result.sizeBytes).toBe(Buffer.byteLength("encrypted"));
    expect(requests).toHaveLength(2);
    expect(requests[0].url).toBe(
      "https://account.r2.cloudflarestorage.com/bucket/mongodb/vision-board/backup.archive.gz.gpg",
    );
    expect(requests[0].init.method).toBe("PUT");
    expect(readFileSync(artifactPath, "utf8")).toBe("encrypted");
    expect(requests[1].init.method).toBe("HEAD");
  });
});
