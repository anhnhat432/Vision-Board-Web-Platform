#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
const mongodumpBin = resolveMongodumpBin();
const gpgBin = resolveGpgBin();

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

function resolveMongodumpBin() {
  const configuredBin = getOptionValue("--mongodump-bin") ?? process.env.MONGODUMP_BIN;
  if (configuredBin?.trim()) return configuredBin.trim();

  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
    const defaultMongoToolsBin = path.join(programFiles, "MongoDB", "Tools", "100", "bin", "mongodump.exe");
    if (existsSync(defaultMongoToolsBin)) return defaultMongoToolsBin;
  }

  return "mongodump";
}

function resolveGpgBin() {
  const configuredBin = getOptionValue("--gpg-bin") ?? process.env.GPG_BIN;
  if (configuredBin?.trim()) return configuredBin.trim();

  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
    const candidates = [
      path.join(programFiles, "GnuPG", "bin", "gpg.exe"),
      path.join(programFilesX86, "GnuPG", "bin", "gpg.exe"),
      path.join(programFiles, "Git", "usr", "bin", "gpg.exe"),
    ];
    const existingPath = candidates.find((candidate) => existsSync(candidate));
    if (existingPath) return existingPath;
  }

  return "gpg";
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

function getMongoUri(envFileValues = parseEnvFile(envFile)) {
  return process.env.MONGODB_URI?.trim() || envFileValues.MONGODB_URI?.trim() || "";
}

function getBackupPassphrase(envFileValues = parseEnvFile(envFile)) {
  return (
    process.env.MONGODB_BACKUP_GPG_PASSPHRASE?.trim() ||
    process.env.BACKUP_ENCRYPTION_PASSPHRASE?.trim() ||
    envFileValues.MONGODB_BACKUP_GPG_PASSPHRASE?.trim() ||
    envFileValues.BACKUP_ENCRYPTION_PASSPHRASE?.trim() ||
    ""
  );
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

function checkBinaryAvailable(binaryPath, versionArgs = ["--version"]) {
  const result = spawnSync(binaryPath, versionArgs, {
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
    if (!/^vision-board-mongodb-.+\.archive\.gz(?:\.gpg)?$/.test(entry.name)) continue;

    const filePath = path.join(directory, entry.name);
    const stat = statSync(filePath);
    if (stat.mtimeMs >= cutoff) continue;

    rmSync(filePath, { force: true });
    deletedCount++;
  }

  return deletedCount;
}

function cleanPrefix(value) {
  return (value ?? "").trim().replace(/^\/+|\/+$/g, "");
}

function trimEnvValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildEncryptedArchivePath(archivePath) {
  return `${archivePath}.gpg`;
}

export function getR2ConfigFromEnv(env = process.env) {
  const required = {
    R2_ACCOUNT_ID: trimEnvValue(env.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: trimEnvValue(env.R2_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: trimEnvValue(env.R2_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY),
    R2_BUCKET: trimEnvValue(env.R2_BUCKET),
  };
  const hasAnyRequiredR2Value = Object.values(required).some(Boolean);

  if (!hasAnyRequiredR2Value) return null;

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing R2 backup config: ${missing.join(", ")}`);
  }

  const endpoint =
    trimEnvValue(env.R2_ENDPOINT) || `https://${required.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  return {
    accountId: required.R2_ACCOUNT_ID,
    accessKeyId: required.R2_ACCESS_KEY_ID,
    secretAccessKey: required.R2_SECRET_ACCESS_KEY,
    bucket: required.R2_BUCKET,
    endpoint: endpoint.replace(/\/+$/g, ""),
    prefix: cleanPrefix(env.MONGODB_BACKUP_R2_PREFIX || env.R2_PREFIX || "mongodb/vision-board"),
  };
}

export function buildR2ObjectKey({ artifactPath, prefix }) {
  const fileName = path.basename(artifactPath);
  const cleanedPrefix = cleanPrefix(prefix);
  return cleanedPrefix ? `${cleanedPrefix}/${fileName}` : fileName;
}

export function encryptArchiveWithGpg({
  archivePath,
  passphrase,
  spawnSyncImpl = spawnSync,
  gpgBin: configuredGpgBin = "gpg",
}) {
  if (!passphrase) {
    throw new Error("Missing MONGODB_BACKUP_GPG_PASSPHRASE for GPG encryption.");
  }

  const encryptedPath = buildEncryptedArchivePath(archivePath);
  const result = spawnSyncImpl(
    configuredGpgBin,
    [
      "--batch",
      "--yes",
      "--symmetric",
      "--cipher-algo",
      "AES256",
      "--pinentry-mode",
      "loopback",
      "--passphrase-fd",
      "0",
      "--output",
      encryptedPath,
      archivePath,
    ],
    {
      encoding: "utf8",
      input: `${passphrase}\n`,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    if (result.stderr) console.error(result.stderr.trim());
    throw new Error(`gpg failed with exit code ${result.status ?? "unknown"}.`);
  }

  return {
    encryptedPath,
    sizeBytes: statSync(encryptedPath).size,
  };
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodePathSegments(value) {
  return value.split("/").map(encodeRfc3986).join("/");
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function toAmzDates(now) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function buildCanonicalQuery(query = {}) {
  return Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(String(value))])
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function signR2Request({ method, config, objectKey = "", query, body = Buffer.alloc(0), now = new Date() }) {
  const endpointUrl = new URL(config.endpoint);
  const canonicalUri = `/${encodeRfc3986(config.bucket)}${objectKey ? `/${encodePathSegments(objectKey)}` : ""}`;
  const canonicalQuery = buildCanonicalQuery(query);
  const payloadHash = sha256Hex(body);
  const { amzDate, dateStamp } = toAmzDates(now);
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = [
    `host:${endpointUrl.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), "auto"), "s3"),
    "aws4_request",
  );
  const signature = hmac(signingKey, stringToSign, "hex");
  const requestUrl = new URL(canonicalUri, config.endpoint);
  requestUrl.search = canonicalQuery;

  return {
    url: requestUrl.toString(),
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  };
}

async function readResponseText(response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

export async function uploadArtifactToR2({
  artifactPath,
  objectKey,
  config,
  now = new Date(),
  fetchImpl = fetch,
}) {
  const body = readFileSync(artifactPath);
  const putRequest = signR2Request({ method: "PUT", config, objectKey, body, now });
  const putResponse = await fetchImpl(putRequest.url, {
    method: "PUT",
    headers: {
      ...putRequest.headers,
      "content-type": "application/octet-stream",
    },
    body,
  });

  if (!putResponse.ok) {
    const responseText = await readResponseText(putResponse);
    throw new Error(`R2 upload failed with status ${putResponse.status}${responseText ? `: ${responseText}` : ""}`);
  }

  const headRequest = signR2Request({ method: "HEAD", config, objectKey, now });
  const headResponse = await fetchImpl(headRequest.url, {
    method: "HEAD",
    headers: headRequest.headers,
  });

  if (!headResponse.ok) {
    const responseText = await readResponseText(headResponse);
    throw new Error(`R2 upload verification failed with status ${headResponse.status}${responseText ? `: ${responseText}` : ""}`);
  }

  return {
    objectKey,
    objectUri: `r2://${config.bucket}/${objectKey}`,
    sizeBytes: body.length,
  };
}

function decodeXmlEntity(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseS3ListObjectsXml(xml) {
  return Array.from(xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)).map(([, block]) => {
    const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1] ?? "";
    const lastModified = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1] ?? "";
    return {
      key: decodeXmlEntity(key),
      lastModified,
    };
  });
}

async function pruneOldR2Backups({ config, retentionDays: daysToKeep, now = new Date(), fetchImpl = fetch }) {
  const prefix = config.prefix ? `${config.prefix}/` : "";
  const listRequest = signR2Request({
    method: "GET",
    config,
    query: {
      "list-type": "2",
      prefix,
    },
    now,
  });
  const listResponse = await fetchImpl(listRequest.url, {
    method: "GET",
    headers: listRequest.headers,
  });

  if (!listResponse.ok) {
    const responseText = await readResponseText(listResponse);
    throw new Error(`R2 prune list failed with status ${listResponse.status}${responseText ? `: ${responseText}` : ""}`);
  }

  const xml = await listResponse.text();
  const cutoff = now.getTime() - daysToKeep * 24 * 60 * 60 * 1000;
  const expiredObjects = parseS3ListObjectsXml(xml).filter((item) => {
    if (!item.key.endsWith(".archive.gz.gpg")) return false;
    const timestamp = Date.parse(item.lastModified);
    return Number.isFinite(timestamp) && timestamp < cutoff;
  });

  for (const item of expiredObjects) {
    const deleteRequest = signR2Request({ method: "DELETE", config, objectKey: item.key, now });
    const deleteResponse = await fetchImpl(deleteRequest.url, {
      method: "DELETE",
      headers: deleteRequest.headers,
    });

    if (!deleteResponse.ok) {
      const responseText = await readResponseText(deleteResponse);
      throw new Error(`R2 prune delete failed with status ${deleteResponse.status}${responseText ? `: ${responseText}` : ""}`);
    }
  }

  return expiredObjects.length;
}

function printBackupPlan({ uri, archivePath, passphrase, r2Config }) {
  const dbName = getDatabaseName(uri);

  console.log("MongoDB backup");
  console.log(`Mode: ${dryRun ? "dry-run" : "write"}`);
  console.log(`Env file fallback: ${envFile}`);
  console.log(`Database: ${dbName}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Archive path: ${archivePath}`);
  console.log(`GPG encryption: ${passphrase ? "enabled" : "disabled"}`);
  console.log(`R2 upload: ${r2Config ? `enabled (${r2Config.bucket}/${r2Config.prefix || "<root>"})` : "disabled"}`);
  console.log(`Retention: ${noPrune ? "disabled" : `${retentionDays} day(s)`}`);
  console.log(`mongodump: ${mongodumpBin}`);
}

async function main() {
  const envFileValues = parseEnvFile(envFile);
  const uri = getMongoUri(envFileValues);
  if (!uri) {
    console.error("Missing MONGODB_URI. Set it in the environment or backend/.env.");
    process.exit(1);
  }

  const r2Config = getR2ConfigFromEnv({ ...envFileValues, ...process.env });
  const passphrase = getBackupPassphrase(envFileValues);
  if (r2Config && !passphrase) {
    console.error("Refusing R2 upload without MONGODB_BACKUP_GPG_PASSPHRASE.");
    process.exit(1);
  }

  const toolCheck = checkBinaryAvailable(mongodumpBin);
  if (!toolCheck.ok) {
    console.error(`mongodump is not available: ${toolCheck.message}`);
    console.error("Install MongoDB Database Tools, or set MONGODUMP_BIN to the mongodump executable path.");
    process.exit(1);
  }

  if (passphrase) {
    const gpgCheck = checkBinaryAvailable(gpgBin);
    if (!gpgCheck.ok) {
      console.error(`gpg is not available: ${gpgCheck.message}`);
      console.error("Install GnuPG, or set GPG_BIN to the gpg executable path.");
      process.exit(1);
    }
  }

  const dbName = sanitizeFilenamePart(getDatabaseName(uri));
  const archivePath = path.join(outputDir, `vision-board-mongodb-${dbName}-${getTimestamp()}.archive.gz`);
  printBackupPlan({ uri, archivePath, passphrase, r2Config });

  if (dryRun) {
    console.log(`mongodump check: ${toolCheck.message}`);
    if (passphrase) console.log("gpg check: available");
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

  const archiveStat = statSync(archivePath);
  console.log(`Backup created: ${archivePath}`);
  console.log(`Backup size: ${(archiveStat.size / 1024 / 1024).toFixed(2)} MB`);

  let artifactPath = archivePath;
  if (passphrase) {
    const encrypted = encryptArchiveWithGpg({ archivePath, passphrase, gpgBin });
    artifactPath = encrypted.encryptedPath;
    console.log(`Encrypted backup created: ${encrypted.encryptedPath}`);
    console.log(`Encrypted backup size: ${(encrypted.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  }

  if (r2Config) {
    const objectKey = buildR2ObjectKey({ artifactPath, prefix: r2Config.prefix });
    const upload = await uploadArtifactToR2({ artifactPath, objectKey, config: r2Config });
    console.log(`R2 upload verified: ${upload.objectUri}`);
    console.log(`R2 upload size: ${(upload.sizeBytes / 1024 / 1024).toFixed(2)} MB`);

    if (!noPrune) {
      const r2DeletedCount = await pruneOldR2Backups({
        config: r2Config,
        retentionDays,
      });
      console.log(`Old R2 backups pruned: ${r2DeletedCount}`);
    }
  }

  if (!noPrune) {
    const deletedCount = pruneOldBackups(outputDir);
    console.log(`Old local backups pruned: ${deletedCount}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
