#!/usr/bin/env node

/**
 * Launch smoke test for backend/API production or staging deploys.
 *
 * Safety defaults:
 * - Does not create payments.
 * - Does not delete accounts unless SMOKE_ALLOW_DESTRUCTIVE=true.
 * - Does not send valid Casso webhook simulation unless SMOKE_ALLOW_WEBHOOK_SIMULATION=true.
 * - Never prints tokens, secrets, or raw protected payloads.
 */

import { createHmac } from "node:crypto";

const RAW_BASE_URL = process.env.SMOKE_BASE_URL?.trim() ?? "";
const FRONTEND_ORIGIN = process.env.SMOKE_FRONTEND_ORIGIN?.trim() ?? "";
const AUTH_TOKEN = process.env.SMOKE_AUTH_TOKEN?.trim() ?? "";
const TEST_ORDER_ID = process.env.SMOKE_TEST_ORDER_ID?.trim().toUpperCase() ?? "";
const CASSO_SECRET = process.env.SMOKE_CASSO_SECRET?.trim() ?? "";
const ALLOW_DESTRUCTIVE = process.env.SMOKE_ALLOW_DESTRUCTIVE === "true";
const ALLOW_WEBHOOK_SIMULATION = process.env.SMOKE_ALLOW_WEBHOOK_SIMULATION === "true";
const DEFAULT_TIMEOUT_MS = 15_000;
const DUMMY_ORDER_ID = "VB00000000";

const passed = [];
const failed = [];
const skipped = [];

function normalizeBaseUrl(raw) {
  return raw.replace(/\/+$/, "");
}

const BASE_URL = normalizeBaseUrl(RAW_BASE_URL);

function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiBase = BASE_URL.endsWith("/api") ? BASE_URL : `${BASE_URL}/api`;
  return `${apiBase}${normalizedPath}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function statusLabel(response) {
  return `${response.status} ${response.statusText}`.trim();
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function summarizeBody(body) {
  if (!body || typeof body !== "object") return "no JSON body";
  const parts = [];
  if ("success" in body) parts.push(`success=${String(body.success)}`);
  if ("errorCode" in body) parts.push(`errorCode=${String(body.errorCode)}`);
  if ("message" in body) parts.push(`message=${String(body.message).slice(0, 120)}`);
  if ("data" in body && body.data && typeof body.data === "object") {
    const data = body.data;
    if ("status" in data) parts.push(`data.status=${String(data.status)}`);
    if ("provider" in data) parts.push(`data.provider=${String(data.provider)}`);
  }
  return parts.length > 0 ? parts.join(", ") : "JSON body received";
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const headers = new Headers(options.headers ?? {});
    if (!headers.has("Accept")) headers.set("Accept", "application/json");

    return await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function request(method, path, options = {}) {
  const response = await fetchWithTimeout(apiUrl(path), {
    ...options,
    method,
  });
  const body = await parseBody(response);
  return { response, body };
}

function authHeaders() {
  return {
    Authorization: `Bearer ${AUTH_TOKEN}`,
  };
}

function jsonHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    ...extra,
  };
}

async function run(name, fn) {
  try {
    const detail = await fn();
    passed.push({ name, detail: detail ?? "ok" });
    console.log(`[PASS] ${name}${detail ? ` - ${detail}` : ""}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failed.push({ name, detail: message });
    console.error(`[FAIL] ${name} - ${message}`);
  }
}

function skip(name, reason, options = {}) {
  skipped.push({ name, detail: reason, blocking: options.blocking === true });
  console.log(`[SKIP] ${name} - ${reason}`);
}

function expectStatus(response, expected, body) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert(
    allowed.includes(response.status),
    `expected HTTP ${allowed.join("/")}, got ${statusLabel(response)} (${summarizeBody(body)})`,
  );
}

function expectJsonSuccess(body) {
  assert(body && typeof body === "object", "expected JSON object body");
  assert(body.success === true, `expected success=true (${summarizeBody(body)})`);
}

function sortObjectDeep(value) {
  if (Array.isArray(value)) return value.map(sortObjectDeep);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortObjectDeep(value[key]);
      return sorted;
    }, {});
}

function signCassoPayload(payload, secret) {
  const sortedPayload = JSON.stringify(sortObjectDeep(payload));
  return createHmac("sha512", secret).update(sortedPayload).digest("hex");
}

function printSummary() {
  const blockingSkips = skipped.filter((item) => item.blocking);
  const recommendation = failed.length > 0
    ? "NO-GO: auto smoke has failures. Fix before launch."
    : blockingSkips.length > 0
      ? "NO-GO: required smoke coverage skipped. Provide missing env, rerun."
      : skipped.length > 0
        ? "GO for safe automated subset. Complete skipped manual/flagged checks before final production go."
        : "GO: automated smoke passed.";

  console.log("\nLaunch smoke summary");
  console.log(`passed: ${passed.length}`);
  console.log(`failed: ${failed.length}`);
  console.log(`skipped: ${skipped.length}`);
  console.log(`recommendation: ${recommendation}`);

  if (failed.length > 0) {
    console.log("\nFailed checks");
    for (const item of failed) console.log(`- ${item.name}: ${item.detail}`);
  }

  if (skipped.length > 0) {
    console.log("\nSkipped checks");
    for (const item of skipped) {
      const prefix = item.blocking ? "blocking" : "safe";
      console.log(`- ${item.name}: ${item.detail} (${prefix})`);
    }
  }
}

async function main() {
  if (!BASE_URL) {
    console.error("SMOKE_BASE_URL is required. Example: SMOKE_BASE_URL=https://api.example.com npm run smoke:launch");
    process.exit(1);
  }

  console.log("Launch smoke test");
  console.log(`target API base: ${BASE_URL.endsWith("/api") ? BASE_URL : `${BASE_URL}/api`}`);
  console.log(`safe mode: destructive=${ALLOW_DESTRUCTIVE ? "enabled" : "disabled"}, validWebhookSimulation=${ALLOW_WEBHOOK_SIMULATION ? "enabled" : "disabled"}`);

  await run("backend health returns 200", async () => {
    const { response, body } = await request("GET", "/health");
    expectStatus(response, 200, body);
    expectJsonSuccess(body);
    assert(body.data?.status === "ok", `expected data.status=ok (${summarizeBody(body)})`);
    return summarizeBody(body);
  });

  if (!FRONTEND_ORIGIN) {
    skip("CORS preflight", "SMOKE_FRONTEND_ORIGIN missing", { blocking: true });
  } else {
    await run("CORS preflight allows configured frontend origin", async () => {
      const { response, body } = await request("OPTIONS", "/health", {
        headers: {
          Origin: FRONTEND_ORIGIN,
          "Access-Control-Request-Method": "GET",
        },
      });
      expectStatus(response, [200, 204], body);
      const allowOrigin = response.headers.get("access-control-allow-origin");
      const allowCredentials = response.headers.get("access-control-allow-credentials");
      assert(allowOrigin === FRONTEND_ORIGIN, `expected access-control-allow-origin=${FRONTEND_ORIGIN}, got ${allowOrigin ?? "missing"}`);
      assert(allowCredentials === "true", `expected access-control-allow-credentials=true, got ${allowCredentials ?? "missing"}`);
      return `origin=${allowOrigin}`;
    });
  }

  await run("public billing checkout info is reachable", async () => {
    const { response, body } = await request("GET", "/billing/checkout-info");
    expectStatus(response, 200, body);
    expectJsonSuccess(body);
    assert(body.data && typeof body.data === "object", "expected checkout info data object");
    return summarizeBody(body);
  });

  if (TEST_ORDER_ID) {
    await run("public billing order status returns test order", async () => {
      const { response, body } = await request("GET", `/billing/public-order-status/${encodeURIComponent(TEST_ORDER_ID)}`);
      expectStatus(response, 200, body);
      expectJsonSuccess(body);
      assert(body.data?.orderId === TEST_ORDER_ID, `expected public order response to match SMOKE_TEST_ORDER_ID (${summarizeBody(body)})`);
      return summarizeBody(body);
    });
  } else {
    await run("public billing order status does not require auth", async () => {
      const { response, body } = await request("GET", `/billing/public-order-status/${DUMMY_ORDER_ID}`);
      expectStatus(response, 404, body);
      assert(body?.errorCode === "order_not_found" || body?.errorCode === "not_found", `expected order_not_found/not_found (${summarizeBody(body)})`);
      return summarizeBody(body);
    });
  }

  await run("protected account export rejects missing auth", async () => {
    const { response, body } = await request("GET", "/account/export");
    expectStatus(response, 401, body);
    return summarizeBody(body);
  });

  await run("protected account delete rejects missing auth", async () => {
    const { response, body } = await request("DELETE", "/account/delete");
    expectStatus(response, 401, body);
    return summarizeBody(body);
  });

  await run("Casso webhook health is reachable", async () => {
    const { response, body } = await request("GET", "/billing/webhook/casso/health");
    expectStatus(response, 200, body);
    expectJsonSuccess(body);
    assert(body.data?.provider === "casso", `expected provider=casso (${summarizeBody(body)})`);
    assert(body.data?.status === "ok", `expected status=ok (${summarizeBody(body)})`);
    return summarizeBody(body);
  });

  await run("invalid Casso webhook signature is rejected", async () => {
    const payload = { error: 0, data: [] };
    const { response, body } = await request("POST", "/billing/webhook/casso", {
      headers: jsonHeaders({ "x-casso-signature": "invalid-smoke-signature" }),
      body: JSON.stringify(payload),
    });
    expectStatus(response, 401, body);
    return summarizeBody(body);
  });

  await run("12-week sync pull rejects missing auth", async () => {
    const { response, body } = await request("GET", "/sync/12-week/pull");
    expectStatus(response, 401, body);
    return summarizeBody(body);
  });

  if (!AUTH_TOKEN) {
    skip("authenticated account export", "SMOKE_AUTH_TOKEN missing", { blocking: false });
    skip("authenticated 12-week sync pull", "SMOKE_AUTH_TOKEN missing", { blocking: false });
  } else {
    await run("authenticated account export returns 200", async () => {
      const { response, body } = await request("GET", "/account/export", {
        headers: authHeaders(),
      });
      expectStatus(response, 200, body);
      expectJsonSuccess(body);
      return "export envelope ok";
    });

    await run("authenticated 12-week sync pull returns 200", async () => {
      const { response, body } = await request("GET", "/sync/12-week/pull", {
        headers: authHeaders(),
      });
      expectStatus(response, 200, body);
      expectJsonSuccess(body);
      return "sync pull envelope ok";
    });
  }

  if (!ALLOW_DESTRUCTIVE) {
    skip("authenticated account delete", "SMOKE_ALLOW_DESTRUCTIVE=true not set", { blocking: false });
  } else if (!AUTH_TOKEN) {
    failed.push({ name: "authenticated account delete", detail: "SMOKE_ALLOW_DESTRUCTIVE=true requires SMOKE_AUTH_TOKEN" });
    console.error("[FAIL] authenticated account delete - SMOKE_ALLOW_DESTRUCTIVE=true requires SMOKE_AUTH_TOKEN");
  } else {
    await run("authenticated account delete deletes test account", async () => {
      const { response, body } = await request("DELETE", "/account/delete", {
        headers: authHeaders(),
      });
      expectStatus(response, 200, body);
      expectJsonSuccess(body);
      assert(body.data?.deleted === true, `expected deleted=true (${summarizeBody(body)})`);
      return "test account deleted";
    });
  }

  if (!ALLOW_WEBHOOK_SIMULATION) {
    skip("valid Casso webhook simulation", "SMOKE_ALLOW_WEBHOOK_SIMULATION=true not set", { blocking: false });
  } else if (!CASSO_SECRET) {
    failed.push({ name: "valid Casso webhook simulation", detail: "SMOKE_ALLOW_WEBHOOK_SIMULATION=true requires SMOKE_CASSO_SECRET" });
    console.error("[FAIL] valid Casso webhook simulation - SMOKE_ALLOW_WEBHOOK_SIMULATION=true requires SMOKE_CASSO_SECRET");
  } else {
    await run("valid Casso webhook simulation is accepted", async () => {
      const payload = { error: 0, data: [] };
      const signature = signCassoPayload(payload, CASSO_SECRET);
      const { response, body } = await request("POST", "/billing/webhook/casso", {
        headers: jsonHeaders({ "x-casso-signature": signature }),
        body: JSON.stringify(payload),
      });
      expectStatus(response, 200, body);
      expectJsonSuccess(body);
      return summarizeBody(body);
    });
  }

  printSummary();
  if (failed.length > 0 || skipped.some((item) => item.blocking)) process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  failed.push({ name: "unhandled smoke error", detail: message });
  console.error(`[FAIL] unhandled smoke error - ${message}`);
  printSummary();
  process.exit(1);
});
