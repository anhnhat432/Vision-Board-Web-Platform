#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const args = process.argv.slice(2);
const dryRun = hasFlag("--dry-run") || hasFlag("--check");
const noPrune = hasFlag("--no-prune");
const envFile = getOptionValue("--env-file") ?? path.join("backend", ".env");
const outputDir = path.resolve(
  rootDir,
  getOptionValue("--out-dir") ?? process.env.MONGODB_BACKUP_DIR ?? path.join("backups", "mongodb"),
);
const retentionDays = parsePositiveInt(
  getOptionValue("--retention-days") ?? process.env.MONGODB_BACKUP_RETENTION_DAYS,
  14,
);
const mongodumpBin = getOptionValue("--mongodump-bin") ?? process.env.MONGODUMP_BIN ?? "mongodump";

function hasFlag(name) {
  return args.includes(name);
}

function getOptionValue(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1).trim();

  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1]) return args[index + 1].trim();

  return undefined;
}

function parsePositiveInt(rawValue, fallback) {
  if (!rawValue) return fallback;

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(value) || value < 1) return fallback;

  return value;
}

function parseEnvFile(relativePath) {
  const absolutePath = path.resolve(rootDir, relativePath);
  if (!existsSync(absolutePath)) return {};

  const values = {};
  const content = readFileSync(absolutePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function getMongoUri() {
  const envFileValues = parseEnvFile(envFile);
  return process.env.MONGODB_URI?.trim() || envFileValues.MONGODB_URI?.trim() || "";
}

function getDatabaseName(uri) {
  try {
    const parsed = new URL(uri);
    const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, "")).trim();
    return dbName || "all-databases";
  } catch {
    return "unknown-database";
  }
}

function getTimestamp() {
  return new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:]/g, "")
    .replace("T", "-");
}

function sanitizeFilenamePart(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "mongodb";
}

function checkMongodumpAvailable() {
  const result = spawnSync(mongodumpBin, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error) {
    return {
      ok: false,
      message: result.error.message,
    };
  }

  return {
    ok: result.status === 0,
    message: (result.stdout || result.stderr || "").split(/\r?\n/)[0] || `exit ${result.status}`,
  };
}

function pruneOldBackups(directory, now = Date.now()) {
  if (!existsSync(directory)) return 0;

  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/^vision-board-mongodb-.+\.archive\.gz$/.test(entry.name)) continue;

    const filePath = path.join(directory, entry.name);
    const stat = statSync(filePath);
    if (stat.mtimeMs >= cutoff) continue;

    rmSync(filePath, { force: true });
    deletedCount++;
  }

  return deletedCount;
}

function printBackupPlan({ uri, archivePath }) {
  const dbName = getDatabaseName(uri);

  console.log("MongoDB backup");
  console.log(`Mode: ${dryRun ? "dry-run" : "write"}`);
  console.log(`Env file fallback: ${envFile}`);
  console.log(`Database: ${dbName}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Archive path: ${archivePath}`);
  console.log(`Retention: ${noPrune ? "disabled" : `${retentionDays} day(s)`}`);
}

function main() {
  const uri = getMongoUri();
  if (!uri) {
    console.error("Missing MONGODB_URI. Set it in the environment or backend/.env.");
    process.exit(1);
  }

  const toolCheck = checkMongodumpAvailable();
  if (!toolCheck.ok) {
    console.error(`mongodump is not available: ${toolCheck.message}`);
    console.error("Install MongoDB Database Tools, or set MONGODUMP_BIN to the mongodump executable path.");
    process.exit(1);
  }

  const dbName = sanitizeFilenamePart(getDatabaseName(uri));
  const archivePath = path.join(outputDir, `vision-board-mongodb-${dbName}-${getTimestamp()}.archive.gz`);
  printBackupPlan({ uri, archivePath });

  if (dryRun) {
    console.log(`mongodump check: ${toolCheck.message}`);
    console.log("Dry run complete. No backup file was created.");
    return;
  }

  mkdirSync(outputDir, { recursive: true });

  const dumpResult = spawnSync(
    mongodumpBin,
    ["--uri", uri, `--archive=${archivePath}`, "--gzip"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  if (dumpResult.status !== 0) {
    if (dumpResult.stderr) console.error(dumpResult.stderr.trim());
    console.error(`mongodump failed with exit code ${dumpResult.status ?? "unknown"}.`);
    process.exit(dumpResult.status ?? 1);
  }

  const stat = statSync(archivePath);
  console.log(`Backup created: ${archivePath}`);
  console.log(`Backup size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

  if (!noPrune) {
    const deletedCount = pruneOldBackups(outputDir);
    console.log(`Old backups pruned: ${deletedCount}`);
  }
}

main();
