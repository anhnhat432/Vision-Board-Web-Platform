#!/usr/bin/env node

const baseUrl = process.env.AI_SMOKE_BASE_URL;
const authToken = process.env.AI_SMOKE_AUTH_TOKEN;
const message =
  process.env.AI_SMOKE_MESSAGE || "Hãy gợi ý 1 bước nhỏ cho kế hoạch 12 tuần của tôi hôm nay.";
const timeoutMs = Number(process.env.AI_SMOKE_TIMEOUT_MS || 30_000);
const expectedProvider = process.env.AI_SMOKE_EXPECT_PROVIDER || "groq";

function fail(messageText) {
  console.error(`FAIL: ${messageText}`);
  process.exit(1);
}

if (!baseUrl) fail("Missing AI_SMOKE_BASE_URL.");
if (!authToken) fail("Missing AI_SMOKE_AUTH_TOKEN.");
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) fail("AI_SMOKE_TIMEOUT_MS must be a positive number.");

function normalizeApiBase(input) {
  const trimmed = input.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const apiBase = normalizeApiBase(baseUrl);
const context = {
  currentWeek: 1,
  weeksTotal: 12,
  goals: [{ id: "smoke_goal", title: "Launch quality", progress: 20 }],
  todayTasks: [{ id: "smoke_task", title: "Chọn một việc nhỏ nhất hôm nay", done: false }],
  lastReflectionDate: null,
  route: "/12-week-system",
  feasibility: null,
  latestWeeklyReview: null,
  stuckSignals: {
    latestObstacle: null,
    missedCommitments: [],
    overdueOpenCount: 0,
    overdueTasks: [],
  },
  trend: {
    completionLast4Weeks: [],
    direction: "unknown",
  },
  streak: {
    daysWithCompletedTask: 0,
  },
  upcomingDeadlines: [],
  pageContext: {
    route: "/12-week-system",
    currentStep: null,
    nextSuggestedStep: null,
    formDraft: {},
  },
  authSyncMode: {
    authState: "signed_in",
    syncState: "synced",
  },
};

function buildBody() {
  return {
    message,
    context,
    history: [],
    mode: "real",
  };
}

async function postJson(path, signal) {
  return fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(buildBody()),
    signal,
  });
}

async function readSseText(response) {
  if (!response.body) fail("Stream response has no body.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let assistantText = "";
  let sawDone = false;

  const processEvent = (event) => {
    const dataLines = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""));
    if (dataLines.length === 0) return;

    const data = dataLines.join("\n");
    if (data === "[DONE]") return;

    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }

    if (parsed.type === "delta") {
      assistantText += parsed.text || "";
    } else if (parsed.type === "error") {
      fail(`${parsed.errorCode || "AI_STREAM_ERROR"}: ${parsed.message || "Stream returned an error."}`);
    } else if (parsed.type === "done") {
      sawDone = true;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const event of events) {
      if (event.trim()) processEvent(event);
    }
  }

  const tail = buffer + decoder.decode();
  if (tail.trim()) processEvent(tail);

  if (!sawDone) fail("Stream ended without a done event.");
  return assistantText;
}

async function readJsonFallback(signal) {
  const response = await postJson("/ai/assistant", signal);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    fail(`JSON fallback returned non-JSON response with status ${response.status}.`);
  }

  if (!response.ok || !json.success) {
    fail(`${json.errorCode || response.status}: ${json.message || "JSON assistant request failed."}`);
  }

  const assistantText = json.data?.assistantText;
  if (typeof assistantText !== "string") fail("JSON fallback response is missing data.assistantText.");
  return assistantText;
}

function assertHealthyAssistantText(text) {
  const normalized = text.trim();
  if (normalized.length < 10) fail("Assistant response is too short.");

  const mojibakeMarkers = ["Ã", "Ä", "áº", "á»", "�"];
  const marker = mojibakeMarkers.find((item) => normalized.includes(item));
  if (marker) fail(`Assistant response appears mojibake-corrupted near marker "${marker}".`);

  if (/api[_ -]?key|bearer\s+[a-z0-9._-]+/i.test(normalized)) {
    fail("Assistant response appears to expose a secret or provider credential.");
  }
}

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

try {
  console.log(`AI assistant live smoke (${expectedProvider}) -> ${apiBase}`);
  const streamResponse = await postJson("/ai/assistant/stream", controller.signal);

  let assistantText;
  if (streamResponse.status === 404 || streamResponse.status === 405) {
    console.warn("Structured stream endpoint unavailable; falling back to /ai/assistant JSON.");
    assistantText = await readJsonFallback(controller.signal);
  } else {
    if (!streamResponse.ok) {
      const text = await streamResponse.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        fail(`Stream request failed with status ${streamResponse.status}.`);
      }
      fail(`${json.errorCode || streamResponse.status}: ${json.message || "Stream assistant request failed."}`);
    }
    assistantText = await readSseText(streamResponse);
  }

  assertHealthyAssistantText(assistantText);
  console.log(`PASS: assistant returned ${assistantText.trim().length} chars without encoding or secret leakage.`);
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    fail(`Timed out after ${timeoutMs}ms.`);
  }
  fail(error instanceof Error ? error.message : "Unknown smoke failure.");
} finally {
  clearTimeout(timeoutId);
}
