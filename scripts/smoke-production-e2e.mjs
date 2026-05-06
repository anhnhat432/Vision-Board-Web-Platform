#!/usr/bin/env node

import { spawn } from "node:child_process";

const BASE_URL = (process.env.PROD_SMOKE_URL ?? "https://vision-board-web-platform.vercel.app").replace(/\/$/, "");
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const GENERATED_EMAIL = `codex.qa+smoke-${TIMESTAMP}@example.com`;
const GENERATED_PASSWORD = `CodexSmoke${TIMESTAMP}!`;
const EMAIL = process.env.PROD_SMOKE_EMAIL?.trim() || GENERATED_EMAIL;
const PASSWORD = process.env.PROD_SMOKE_PASSWORD || GENERATED_PASSWORD;
const HAS_PROVIDED_CREDENTIALS = Boolean(process.env.PROD_SMOKE_EMAIL && process.env.PROD_SMOKE_PASSWORD);
const FRESH_EMAIL =
  process.env.PROD_SMOKE_FRESH_EMAIL?.trim() ||
  (HAS_PROVIDED_CREDENTIALS ? deriveTaggedEmail(EMAIL, "fresh") : `codex.qa+fresh-${TIMESTAMP}@example.com`);
const FRESH_PASSWORD = process.env.PROD_SMOKE_FRESH_PASSWORD || PASSWORD;
const AUTH_MODE_OVERRIDE = process.env.PROD_SMOKE_AUTH_MODE?.trim().toLowerCase();
const AUTH_MODE = AUTH_MODE_OVERRIDE || (HAS_PROVIDED_CREDENTIALS ? "signin" : "signup");
const GOAL_TITLE = `QA smoke production ${TIMESTAMP}`;
const TACTIC_ONE = `Review tuan QA ${TIMESTAMP}`;
const TACTIC_TWO = `Hoan thanh viec QA ${TIMESTAMP}`;
const DAILY_CHECKIN_NOTE = `Daily check-in QA ${TIMESTAMP}`;
const WEEKLY_REVIEW_OUTPUT = `Da tick task va luu check-in QA ${TIMESTAMP}`;
const WEEKLY_REVIEW_OBSTACLE = `Can giu smoke ngan gon QA ${TIMESTAMP}`;
const WEEKLY_REVIEW_PRIORITY = `Mo daily execution truoc QA ${TIMESTAMP}`;

function log(message) {
  console.log(`[prod-smoke] ${message}`);
}

function deriveTaggedEmail(email, tag) {
  const value = email.trim();
  const atIndex = value.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === value.length - 1) {
    return `codex.qa+${tag}@example.com`;
  }

  const local = value.slice(0, atIndex).replace(/\+.*$/, "");
  const domain = value.slice(atIndex + 1);
  return `${local}+${tag}@${domain}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessTree(child) {
  if (!child.pid) return;

  if (process.platform === "win32") {
    spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

function quoteCmdArg(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function runAgentBrowser(args, { input, timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "cmd.exe" : "npx";
    const commandArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", ["npx.cmd", "agent-browser", ...args.map(quoteCmdArg)].join(" ")]
        : ["agent-browser", ...args];
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsVerbatimArguments: process.platform === "win32",
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };
    const timeout = setTimeout(() => {
      killProcessTree(child);
      settle(reject, new Error(`agent-browser ${args.join(" ")} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      settle(reject, error);
    });
    const finish = (code) => {
      if (code !== 0) {
        settle(reject, new Error(`agent-browser ${args.join(" ")} failed with code ${code}\n${stderr || stdout}`));
        return;
      }
      settle(resolve, { stdout, stderr });
    };

    child.on("exit", (code) => {
      setTimeout(() => finish(code), 25);
    });
    child.on("close", (code) => {
      finish(code);
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

function parseEvalResult(output) {
  const value = output.trim();
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function browserEval(source, options) {
  const result = await runAgentBrowser(["eval", "--stdin"], {
    ...options,
    input: source,
  });
  return parseEvalResult(result.stdout);
}

async function clearBrowserStorage() {
  log("Clearing browser storage");
  await browserEval(`
    (async () => {
      localStorage.clear();
      sessionStorage.clear();

      for (const cookie of document.cookie.split(";")) {
        const name = cookie.split("=")[0]?.trim();
        if (name) {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        }
      }

      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases
            .map((database) => database.name)
            .filter(Boolean)
            .map(
              (name) =>
                new Promise((resolve) => {
                  const request = indexedDB.deleteDatabase(name);
                  request.onsuccess = () => resolve(true);
                  request.onerror = () => resolve(false);
                  request.onblocked = () => resolve(false);
                }),
            ),
        );
      }

      return true;
    })()
  `);
}

async function openPage(pathOrUrl) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  log(`Opening ${url}`);
  await runAgentBrowser(["open", url], { timeoutMs: 90_000 });
  log(`Waiting for network idle on ${url}`);
  await runAgentBrowser(["wait", "--load", "networkidle"], { timeoutMs: 90_000 });
}

async function waitFor(description, source, { timeoutMs = 45_000, intervalMs = 700 } = {}) {
  log(`Waiting for ${description}`);
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await browserEval(`
      (() => {
        try {
          return Boolean(${source});
        } catch {
          return false;
        }
      })()
    `);

    if (lastValue) return;
    await sleep(intervalMs);
  }

  const diagnostics = await getPageState();
  throw new Error(
    `Timed out waiting for ${description}. Last value: ${String(lastValue)}\n` +
      `URL: ${diagnostics.url}\nText: ${diagnostics.text.slice(0, 900)}`,
  );
}

async function getPageState() {
  return browserEval(`
    (() => ({
      url: location.href,
      path: location.pathname,
      scrollY: Math.round(window.scrollY),
      text: document.body.innerText,
      apiResources: performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes("/api/"))
        .map((entry) => entry.name),
    }))()
  `);
}

function assertTextIncludes(state, expected, context) {
  if (state.text.includes(expected)) return;
  throw new Error(`${context} is missing expected text: ${expected}\nURL: ${state.url}\nText: ${state.text.slice(0, 900)}`);
}

function assertTextExcludes(state, forbidden, context) {
  if (!state.text.includes(forbidden)) return;
  throw new Error(`${context} includes forbidden text: ${forbidden}\nURL: ${state.url}\nText: ${state.text.slice(0, 900)}`);
}

function assertNoFreshWorkspaceLeaks(state, context) {
  const forbiddenTexts = ["Ra mắt", "Duy trì", "Đi bộ 8", "Bánh xe cuộc sống là bước mở đầu"];
  const leakedText = forbiddenTexts.find((text) => state.text.includes(text));
  if (leakedText) {
    throw new Error(`${context} leaks stale/demo workspace text: ${leakedText}\nURL: ${state.url}\nText: ${state.text.slice(0, 900)}`);
  }
}

async function assertNoBrowserErrors() {
  const { stdout } = await runAgentBrowser(["errors"], { timeoutMs: 30_000 });
  const errors = stdout.trim();
  if (errors) {
    throw new Error(`Browser console/page errors detected:\n${errors}`);
  }
}

async function fillByLabel(labelText, value) {
  log(`Filling label: ${labelText}`);
  const selector = await browserEval(`
    (() => {
      const target = ${JSON.stringify(labelText.toLowerCase())};
      const label = Array.from(document.querySelectorAll("label")).find((item) =>
        item.textContent?.toLowerCase().includes(target),
      );
      if (!label) throw new Error("Label not found: " + ${JSON.stringify(labelText)});
      const id = label.getAttribute("for");
      if (id) return "#" + id;
      const input = label.querySelector("input, textarea");
      if (!input) throw new Error("No input for label: " + ${JSON.stringify(labelText)});
      return null;
    })()
  `);
  if (selector) {
    await runAgentBrowser(["fill", selector, value], { timeoutMs: 30_000 });
  } else {
    await browserEval(`
      (() => {
        const target = ${JSON.stringify(labelText.toLowerCase())};
        const label = Array.from(document.querySelectorAll("label")).find((item) =>
          item.textContent?.toLowerCase().includes(target),
        );
        const el = label?.querySelector("input, textarea");
        if (!el) throw new Error("Input not found for label");
        el.focus();
        el.select?.();
        document.execCommand("insertText", false, ${JSON.stringify(value)});
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
        return el.value;
      })()
    `);
  }
  const debug = await browserEval(`
    (() => {
      const target = ${JSON.stringify(labelText.toLowerCase())};
      const label = Array.from(document.querySelectorAll("label")).find((item) =>
        item.textContent?.toLowerCase().includes(target),
      );
      const input = label?.querySelector("input, textarea");
      const buttons = Array.from(document.querySelectorAll("button"));
      return {
        inputValue: input?.value || "",
        inputLength: input?.value?.length || 0,
        buttonCount: buttons.length,
        buttonTexts: buttons.map(b => b.textContent?.replace(/\\s+/g, " ").trim()),
        buttonDisabled: buttons.map(b => b.disabled),
      };
    })()
  `);
  log(`Debug after fill: inputLength=${debug.inputLength}, buttonCount=${debug.buttonCount}, buttonTexts=${JSON.stringify(debug.buttonTexts)}`);
  if (debug.inputLength === 0) {
    log("WARNING: input appears empty after fill — React state may not have updated");
  }
}

async function fillBySelector(selector, value) {
  log(`Filling selector: ${selector}`);
  await runAgentBrowser(["fill", selector, value], { timeoutMs: 30_000 });
}

async function clickByButton(text) {
  log(`Clicking button: ${text}`);
  await browserEval(`
    (() => {
      const target = ${JSON.stringify(text)};
      const button = Array.from(document.querySelectorAll("button")).find((item) =>
        item.textContent?.replace(/\\s+/g, " ").trim().includes(target),
      );
      if (!button) throw new Error("Button not found: " + target);
      if (button.disabled) throw new Error("Button is disabled: " + target);
      button.scrollIntoView({ block: "center" });
      button.click();
      return true;
    })()
  `);
}

async function clickDialogButton(text) {
  log(`Clicking dialog button: ${text}`);
  await browserEval(`
    (() => {
      const target = ${JSON.stringify(text)};
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) throw new Error("Dialog not found");
      const button = Array.from(dialog.querySelectorAll("button")).find((item) =>
        item.textContent?.replace(/\\s+/g, " ").trim().includes(target),
      );
      if (!button) throw new Error("Dialog button not found: " + target);
      if (button.disabled) throw new Error("Dialog button is disabled: " + target);
      button.scrollIntoView({ block: "center" });
      button.click();
      return true;
    })()
  `);
}

async function clickDialogUpgradeButton() {
  log("Clicking dialog upgrade button");
  await browserEval(`
    (() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) throw new Error("Dialog not found");
      const buttons = Array.from(dialog.querySelectorAll("button")).map((button) => ({
        button,
        text: button.textContent?.replace(/\\s+/g, " ").trim() ?? "",
      }));
      const button =
        buttons.find((item) => !item.button.disabled && item.text.includes("Mở") && item.text.includes("Plus"))
          ?.button ??
        buttons.find((item) => !item.button.disabled && item.text.includes("Plus"))?.button ??
        buttons.find((item) => !item.button.disabled && item.text.toLowerCase().includes("demo"))?.button;
      if (!button) {
        throw new Error("Dialog upgrade button not found. Buttons: " + buttons.map((item) => item.text).join(" | "));
      }
      button.scrollIntoView({ block: "center" });
      button.click();
      return true;
    })()
  `);
}

async function clickByLabel(text) {
  log(`Clicking label: ${text}`);
  await browserEval(`
    (() => {
      const target = ${JSON.stringify(text)};
      const label = Array.from(document.querySelectorAll("label")).find((item) =>
        item.textContent?.replace(/\\s+/g, " ").trim().includes(target),
      );
      if (!label) throw new Error("Label not found: " + target);
      label.scrollIntoView({ block: "center" });
      label.click();
      const id = label.getAttribute("for");
      if (id) document.getElementById(id)?.click();
      return true;
    })()
  `);
}

async function clickTab(text) {
  log(`Clicking tab: ${text}`);
  await browserEval(`
    (() => {
      const target = ${JSON.stringify(text)};
      const tab = Array.from(document.querySelectorAll('[role="tab"], button')).find((item) =>
        item.textContent?.replace(/\\s+/g, " ").trim().includes(target),
      );
      if (!tab) throw new Error("Tab not found: " + target);
      tab.scrollIntoView({ block: "center" });
      tab.click();
      return true;
    })()
  `);
}

async function runStep(label, task) {
  log(label);
  await task();
}

async function waitForAuthOutcome(description, nextPath, { timeoutMs = 70_000, intervalMs = 700 } = {}) {
  log(`Waiting for ${description}`);
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await browserEval(`
      (() => {
        const alert = document.querySelector('[role="alert"]');
        return {
          path: location.pathname,
          ok: location.pathname === ${JSON.stringify(nextPath)},
          errorText: alert?.textContent?.replace(/\\s+/g, " ").trim() || "",
        };
      })()
    `);

    if (lastValue?.ok) return { ok: true, path: lastValue.path, errorText: "" };
    if (lastValue?.errorText) return { ok: false, path: lastValue.path, errorText: lastValue.errorText };
    await sleep(intervalMs);
  }

  const diagnostics = await getPageState();
  throw new Error(
    `Timed out waiting for ${description}. Last value: ${JSON.stringify(lastValue)}\n` +
      `URL: ${diagnostics.url}\nText: ${diagnostics.text.slice(0, 900)}`,
  );
}

async function submitEmailAuth({
  mode,
  email,
  password,
  nextPath = "/onboarding",
  accountLabel = "QA account",
  allowAuthError = false,
  timeoutMs = 70_000,
}) {
  const modeQuery = mode === "signup" ? "mode=signup&" : "";
  await openPage(`/login?${modeQuery}next=${encodeURIComponent(nextPath)}`);
  await waitFor("login form", 'document.querySelector("#login-email") && document.querySelector("#login-password")');

  log(`${mode === "signup" ? "Creating" : "Signing in with"} ${accountLabel} ${email}`);
  await fillBySelector("#login-email", email);
  await fillBySelector("#login-password", password);
  await clickByButton(mode === "signup" ? "Tạo tài khoản" : "Đăng nhập");
  await sleep(300);
  const outcome = await waitForAuthOutcome(`authenticated ${nextPath} route`, nextPath, { timeoutMs });

  if (!outcome.ok && !allowAuthError) {
    throw new Error(`Email auth failed for ${accountLabel}: ${outcome.errorText || "unknown auth error"}`);
  }

  return outcome;
}

async function authenticate({ mode, email, password, nextPath = "/onboarding", accountLabel = "QA account" }) {
  const outcome = await submitEmailAuth({ mode, email, password, nextPath, accountLabel });
  if (!outcome.ok) {
    throw new Error(`Email auth failed for ${accountLabel}: ${outcome.errorText || "unknown auth error"}`);
  }
}

function isExistingAccountAuthError(message) {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("đã có tài khoản") ||
    normalized.includes("da co tai khoan") ||
    normalized.includes("already") ||
    normalized.includes("email-already")
  );
}

async function authenticateReusableEmailAccount({ email, password, nextPath = "/onboarding", accountLabel }) {
  const signupOutcome = await submitEmailAuth({
    mode: "signup",
    email,
    password,
    nextPath,
    accountLabel,
    allowAuthError: true,
    timeoutMs: 30_000,
  });

  if (signupOutcome.ok) return;

  if (!isExistingAccountAuthError(signupOutcome.errorText)) {
    throw new Error(`Could not create reusable ${accountLabel}: ${signupOutcome.errorText || "unknown auth error"}`);
  }

  log(`${accountLabel} already exists; signing in instead`);
  await authenticate({
    mode: "signin",
    email,
    password,
    nextPath,
    accountLabel,
  });
}

async function signInOrSignUp() {
  await authenticate({
    mode: AUTH_MODE,
    email: EMAIL,
    password: PASSWORD,
    nextPath: "/onboarding",
    accountLabel: "QA account",
  });
}

async function runSignedOutSmoke() {
  log("Checking signed-out public home");
  await openPage("/");
  await clearBrowserStorage();
  await openPage("/");
  await waitFor(
    "public home",
    'document.body.innerText.includes("Trải nghiệm demo miễn phí") || document.body.innerText.includes("Đăng ký miễn phí")',
  );

  const state = await getPageState();
  const forbiddenTexts = ["Ra mắt", "Duy trì", "Đi bộ", "Bánh xe cuộc sống"];
  const leakedText = forbiddenTexts.find((text) => state.text.includes(text));
  if (leakedText) throw new Error(`Signed-out public home leaks personal/demo text: ${leakedText}`);
  if (state.text.includes("MỤC TIÊU") && state.text.includes("HÀNH ĐỘNG")) {
    throw new Error("Signed-out public home renders a personal goal table");
  }
  if (state.apiResources.length > 0) {
    throw new Error(`Signed-out public home called API resources: ${state.apiResources.join(", ")}`);
  }
}

async function seedFreshLocalWorkspace() {
  log("Seeding zero-score fresh workspace state");
  const result = await browserEval(`
    (() => {
      const mainKey = "visionboard_user_data";
      const raw = localStorage.getItem(mainKey);
      if (!raw) return { ok: false, reason: "Missing user data snapshot" };

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return { ok: false, reason: "User data snapshot is not valid JSON" };
      }

      data.isHydratedFromDemo = false;
      data.onboardingCompleted = true;
      data.goals = [];
      data.reflections = [];
      data.visionBoards = [];
      data.wheelOfLifeHistory = [];
      data.eventLog = [];
      data.syncOutbox = [];
      data.inAppReminders = [];
      data.currentWheelOfLife = Array.isArray(data.currentWheelOfLife)
        ? data.currentWheelOfLife.map((area) => ({ ...area, score: 0 }))
        : [];

      const serialized = JSON.stringify(data);
      localStorage.setItem(mainKey, serialized);

      const scopedKeys = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(mainKey + ":auth:")) scopedKeys.push(key);
      }
      scopedKeys.forEach((key) => localStorage.setItem(key, serialized));

      [
        "selected_focus_area",
        "pending_smart_goal",
        "pending_feasibility_result",
        "pending_feasibility_answers",
        "pending_12_week_setup_draft",
        "pending_12_week_plan_draft",
        "latest_12_week_goal_id",
        "latest_12_week_system_goal_id",
        "latest_12_week_plan_goal_id",
        "readiness_level",
        "readiness_score",
        "visionboard_new_user_guide_dismissed",
        "visionboard_new_user_guide_seen_at",
      ].forEach((key) => localStorage.removeItem(key));

      window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));

      return {
        ok: true,
        goals: data.goals.length,
        reflections: data.reflections.length,
        scoredAreas: data.currentWheelOfLife.filter((area) => area.score > 0).length,
      };
    })()
  `);

  if (!result?.ok) {
    throw new Error(`Could not seed fresh local workspace: ${result?.reason ?? "unknown error"}`);
  }
}

async function runFreshAuthenticatedWorkspaceSmoke() {
  try {
    await clearBrowserStorage();
    await authenticateReusableEmailAccount({
      email: FRESH_EMAIL,
      password: FRESH_PASSWORD,
      nextPath: "/onboarding",
      accountLabel: "fresh reusable QA account",
    });
    await seedFreshLocalWorkspace();

    await openPage("/");
    await waitFor("fresh dashboard empty state", 'document.querySelector("[data-testid=\\"fresh-workspace-empty-state\\"]")');
    let state = await getPageState();
    assertTextIncludes(state, "Chưa có dữ liệu thực thi để hiển thị.", "fresh dashboard");
    assertTextIncludes(state, "0/6 bước đã xong", "fresh dashboard guide");
    assertTextIncludes(state, "Đánh giá cân bằng", "fresh dashboard guide");
    assertNoFreshWorkspaceLeaks(state, "fresh dashboard");

    await openPage("/goals");
    await waitFor("fresh goals empty state", 'document.querySelector("[data-testid=\\"goaltracker-fresh-empty-state\\"]")');
    state = await getPageState();
    assertTextIncludes(state, "Chưa có mục tiêu nào trong workspace của bạn", "fresh goals");
    assertTextIncludes(state, "Bắt đầu Life Balance", "fresh goals");
    assertNoFreshWorkspaceLeaks(state, "fresh goals");

    await openPage("/journal");
    await waitFor("fresh journal empty state", 'document.querySelector("[data-testid=\\"journal-fresh-empty-state\\"]")');
    state = await getPageState();
    assertTextIncludes(state, "Chưa có trang nhật ký nào được mở ra", "fresh journal");
    assertTextIncludes(state, "Bắt đầu Life Balance", "fresh journal");
    assertTextExcludes(state, "Tổng số nhật ký", "fresh journal");
    assertTextExcludes(state, "Tổng số bài", "fresh journal");
    assertNoFreshWorkspaceLeaks(state, "fresh journal");
  } finally {
    await clearBrowserStorage().catch(() => undefined);
  }
}

async function runOnboardingSmoke() {
  log("Checking onboarding CTA polish and mobile scroll reset");
  await runAgentBrowser(["set", "viewport", "390", "844"], { timeoutMs: 45_000 });
  await openPage("/onboarding");
  await waitFor(
    "onboarding welcome",
    'document.body.innerText.includes("Khởi động hành trình định hướng cuộc sống") || document.body.innerText.includes("Đánh giá cân bằng") || document.body.innerText.includes("Chấm Life Balance")',
  );

  const ctaState = await browserEval(`
    (() => {
      const button = Array.from(document.querySelectorAll("button")).find((item) =>
        item.innerText.includes("Chấm Life Balance"),
      );
      return {
        found: Boolean(button),
        className: button?.className ?? "",
      };
    })()
  `);

  if (!ctaState.found) throw new Error("Could not find onboarding start CTA");
  if (!ctaState.className.includes("bg-violet-600") || ctaState.className.includes("bg-slate-950")) {
    throw new Error(`Onboarding CTA class is not the primary violet variant: ${ctaState.className}`);
  }

  await browserEval("window.scrollTo(0, document.body.scrollHeight)");
  await clickByButton("Chấm Life Balance");
  await waitFor("assessment screen", 'document.body.innerText.includes("Chấm điểm hiện tại")');
  await waitFor("mobile scroll reset", "window.scrollY <= 8", { timeoutMs: 5_000, intervalMs: 100 });

  const afterClick = await getPageState();
  if (afterClick.scrollY > 8) {
    throw new Error(`Onboarding assessment did not reset to top on mobile. scrollY=${afterClick.scrollY}`);
  }
}

async function completeOnboarding() {
  await clickByButton("Hoàn thành đánh giá");
  await waitFor("life insight route", 'location.pathname === "/life-insight"', { timeoutMs: 45_000 });
  await waitFor("life insight ready", 'document.body.innerText.includes("Tạo mục tiêu với")');
}

async function completeLifeInsight() {
  await clickByButton("Tạo mục tiêu với");
  await waitFor("smart goal route", 'location.pathname === "/smart-goal-setup"', { timeoutMs: 45_000 });
}

async function completeSmartGoal() {
  await waitFor("smart goal first step", 'document.body.innerText.includes("Câu trả lời của bạn")');
  await fillByLabel("Câu trả lời của bạn", GOAL_TITLE);
  await clickByButton("Tiếp theo");

  await waitFor("smart metric step", 'document.body.innerText.includes("Con số hoặc dấu hiệu theo dõi")');
  await fillByLabel("Con số hoặc dấu hiệu theo dõi", "So tuan review hoan thanh");
  await fillByLabel("Mốc hiện tại", "0");
  await fillByLabel("Mốc mục tiêu", "12");
  await clickByButton("Tiếp theo");

  await waitFor("smart resources step", 'document.body.innerText.includes("Thời gian mỗi tuần")');
  await fillByLabel("Thời gian mỗi tuần", "4");
  await fillByLabel("Kỹ năng cần có", "Lap ke hoach tuan va review ngan");
  await fillByLabel("Nguồn lực hỗ trợ", "Dashboard production va lich ca nhan");
  await clickByButton("Tiếp theo");

  await waitFor("smart reason step", 'document.body.innerText.includes("Lý do bạn thật sự muốn")');
  await fillByLabel("Lý do bạn thật sự muốn theo đuổi", "Smoke test production cho core flow that.");
  await fillByLabel("Lĩnh vực cuộc sống liên quan", "Su nghiep");
  await clickByButton("Tiếp theo");

  await waitFor("smart deadline step", 'document.body.innerText.includes("Số tuần mục tiêu")');
  await clickByButton("kiểm tra tính thực tế");
  await waitFor("feasibility route", 'location.pathname === "/feasibility"', { timeoutMs: 45_000 });
}

async function completeFeasibility() {
  const answers = [
    "3-5 giờ mỗi tuần",
    "Còn khá tốt và chủ động được",
    "Đủ để bắt đầu ngay",
    "Rất thực tế",
    "Hiện chưa thấy trở ngại lớn",
    "Đã có khung giờ khá cố định",
    "Cam kết hoàn toàn",
  ];

  for (const [index, answer] of answers.entries()) {
    await waitFor(`feasibility answer ${index + 1}`, `document.body.innerText.includes(${JSON.stringify(answer)})`);
    await clickByLabel(answer);
    await clickByButton(index === answers.length - 1 ? "Hoàn thành đánh giá" : "Tiếp theo");
  }

  await waitFor("feasibility result", 'document.body.innerText.includes("Tạo kế hoạch 12 tuần")');
  await clickByButton("Tạo kế hoạch 12 tuần");
  await waitFor("12-week setup route", 'location.pathname === "/12-week-setup"', { timeoutMs: 45_000 });
}

async function completeTwelveWeekSetup() {
  await waitFor("12-week goal step", 'document.body.innerText.includes("Mục tiêu 12 tuần")');
  await clickByButton("Tiếp tục");

  await waitFor("12-week tactics step", 'document.body.innerText.includes("2-4 việc")');
  await fillBySelector("#tactic-name-0", TACTIC_ONE);
  await fillBySelector("#tactic-name-1", TACTIC_TWO);
  await clickByButton("Tiếp tục");

  await waitFor("12-week schedule step", 'document.body.innerText.includes("Tuần đầu tiên")');
  await fillByLabel("Mục tiêu", "12");
  await fillByLabel("Đơn vị của chỉ số", "tuan");
  await clickByButton("Tiếp tục");

  await waitFor("12-week final step", 'document.body.innerText.includes("Chốt kế hoạch")');
  await clickByButton("Tạo kế hoạch 12 tuần");
  await waitFor("12-week system route", 'location.pathname === "/12-week-system"', { timeoutMs: 75_000 });
}

async function assertSystemLoaded({ requireTactics = true } = {}) {
  await waitFor(
    requireTactics ? "12-week system with created goal and tasks" : "12-week system with persisted goal",
    `
      document.body.innerText.includes(${JSON.stringify(GOAL_TITLE)}) &&
      (${JSON.stringify(!requireTactics)} ||
        (document.body.innerText.includes(${JSON.stringify(TACTIC_ONE)}) &&
          document.body.innerText.includes(${JSON.stringify(TACTIC_TWO)})))
    `,
    { timeoutMs: 75_000 },
  );
}

async function getCreatedGoalSnapshot() {
  return browserEval(`
    (() => {
      const mainKey = "visionboard_user_data";
      const keys = [mainKey];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(mainKey + ":auth:")) keys.push(key);
      }

      const seenKeys = Array.from(new Set(keys));
      const snapshots = seenKeys
        .map((key) => {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          try {
            return { key, data: JSON.parse(raw) };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const matching = snapshots
        .map((snapshot) => {
          const goal = Array.isArray(snapshot.data.goals)
            ? snapshot.data.goals.find((item) => item?.title?.includes(${JSON.stringify(GOAL_TITLE)}))
            : null;
          if (!goal?.twelveWeekSystem) return null;

          const system = goal.twelveWeekSystem;
          const completedTasks = Array.isArray(system.taskInstances)
            ? system.taskInstances.filter((task) => task.completed)
            : [];
          const dailyCheckIns = Array.isArray(system.dailyCheckIns) ? system.dailyCheckIns : [];
          const weeklyReviews = Array.isArray(system.weeklyReviews) ? system.weeklyReviews : [];
          const linkedReflections = Array.isArray(snapshot.data.reflections)
            ? snapshot.data.reflections.filter(
                (item) => item.entryType === "weekly-review" && item.linkedGoalId === goal.id,
              )
            : [];

          return {
            key: snapshot.key,
            goalId: goal.id,
            title: goal.title,
            taskCount: Array.isArray(system.taskInstances) ? system.taskInstances.length : 0,
            completedTaskCount: completedTasks.length,
            completedTaskTitles: completedTasks.map((task) => task.title),
            dailyCheckInCount: dailyCheckIns.length,
            latestDailyCheckIn: dailyCheckIns[0] ?? null,
            weeklyReviewCount: weeklyReviews.length,
            latestWeeklyReview: weeklyReviews[weeklyReviews.length - 1] ?? null,
            linkedWeeklyReviewReflectionCount: linkedReflections.length,
            linkedWeeklyReviewReflectionTitles: linkedReflections.map((item) => item.title),
          };
        })
        .filter(Boolean);

      return matching[0] ?? {
        key: null,
        goalId: null,
        title: null,
        taskCount: 0,
        completedTaskCount: 0,
        completedTaskTitles: [],
        dailyCheckInCount: 0,
        latestDailyCheckIn: null,
        weeklyReviewCount: 0,
        latestWeeklyReview: null,
        linkedWeeklyReviewReflectionCount: 0,
        linkedWeeklyReviewReflectionTitles: [],
      };
    })()
  `);
}

async function waitForGoalSnapshot(description, predicate, { timeoutMs = 45_000, intervalMs = 700 } = {}) {
  log(`Waiting for ${description}`);
  const startedAt = Date.now();
  let lastSnapshot = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastSnapshot = await getCreatedGoalSnapshot();
    if (predicate(lastSnapshot)) return lastSnapshot;
    await sleep(intervalMs);
  }

  const state = await getPageState();
  throw new Error(
    `Timed out waiting for ${description}.\n` +
      `Last snapshot: ${JSON.stringify(lastSnapshot, null, 2)}\n` +
      `URL: ${state.url}\nText: ${state.text.slice(0, 900)}`,
  );
}

async function clickFirstTodayTaskCheckbox() {
  log("Clicking first open task in Today queue");
  await browserEval(`
    (() => {
      const queue =
        document.querySelector('[data-tour-id="system-today-queue"]') ||
        Array.from(document.querySelectorAll('[data-slot="card"], section, div')).find((item) =>
          item.textContent?.toLowerCase().includes("hàng việc hôm nay")
        );
      if (!queue) throw new Error("Could not find Today task queue");

      const checkbox = Array.from(queue.querySelectorAll('[role="checkbox"], input[type="checkbox"]')).find((item) => {
        if (item.disabled) return false;
        if (item.matches?.('input[type="checkbox"]')) return !item.checked;
        return item.getAttribute("aria-checked") !== "true";
      });
      if (!checkbox) throw new Error("Could not find an open Today task checkbox");
      checkbox.scrollIntoView({ block: "center" });
      checkbox.click();
      return true;
    })()
  `);
}

async function exerciseTwelveWeekDailyExecution() {
  await assertSystemLoaded();

  const initialSnapshot = await waitForGoalSnapshot(
    "created 12-week system storage snapshot",
    (snapshot) => snapshot.goalId && snapshot.taskCount > 0,
  );
  if (initialSnapshot.completedTaskCount > 0) {
    throw new Error(`Expected fresh daily execution state, got completed tasks: ${initialSnapshot.completedTaskCount}`);
  }

  await clickTab("Hôm nay");
  await waitFor("Today queue ready", 'document.body.innerText.includes("Hàng việc hôm nay")');
  await clickFirstTodayTaskCheckbox();
  await waitForGoalSnapshot("completed Today task persisted", (snapshot) => snapshot.completedTaskCount >= 1);

  await fillBySelector("#daily-note", DAILY_CHECKIN_NOTE);
  await clickByButton("Lưu check-in hôm nay");
  await waitForGoalSnapshot(
    "daily check-in persisted",
    (snapshot) => snapshot.dailyCheckInCount >= 1,
  );

  await openPage("/12-week-system?tab=week");
  await waitFor("weekly review form ready", 'document.querySelector("#weekly-best")');
  await clickByButton("Chi tiết review thêm");
  await waitFor(
    "weekly review detail fields ready",
    'document.querySelector("#weekly-obstacle") && document.querySelector("#weekly-priority")',
  );
  await fillBySelector("#weekly-best", WEEKLY_REVIEW_OUTPUT);
  await fillBySelector("#weekly-obstacle", WEEKLY_REVIEW_OBSTACLE);
  await fillBySelector("#weekly-priority", WEEKLY_REVIEW_PRIORITY);
  await clickByButton("Chốt review tuần này");
  await waitFor(
    "weekly review backend sync confirmation",
    'document.body.innerText.includes("Review tuần đã được chốt")',
    { timeoutMs: 90_000 },
  );
  await waitForGoalSnapshot(
    "weekly review and linked journal persisted",
    (snapshot) =>
      snapshot.weeklyReviewCount >= 1 &&
      snapshot.latestWeeklyReview?.biggestOutputThisWeek === WEEKLY_REVIEW_OUTPUT &&
      snapshot.latestWeeklyReview?.mainObstacle === WEEKLY_REVIEW_OBSTACLE &&
      snapshot.latestWeeklyReview?.nextWeekPriority === WEEKLY_REVIEW_PRIORITY &&
      snapshot.linkedWeeklyReviewReflectionCount >= 1,
  );
}

async function assertDailyExecutionPersisted() {
  await waitForGoalSnapshot(
    "daily execution state after reload",
    (snapshot) =>
      snapshot.completedTaskCount >= 1 &&
      snapshot.dailyCheckInCount >= 1 &&
      snapshot.weeklyReviewCount >= 1 &&
      snapshot.latestWeeklyReview?.biggestOutputThisWeek === WEEKLY_REVIEW_OUTPUT &&
      snapshot.linkedWeeklyReviewReflectionCount >= 1,
    { timeoutMs: 75_000 },
  );
}

async function assertDailyExecutionRestoredAfterLogin() {
  await waitForGoalSnapshot(
    "same daily execution state after fresh login",
    (snapshot) =>
      snapshot.title?.includes(GOAL_TITLE) &&
      snapshot.completedTaskCount >= 1 &&
      snapshot.dailyCheckInCount >= 1 &&
      snapshot.latestDailyCheckIn?.didWorkToday === true &&
      snapshot.weeklyReviewCount >= 1 &&
      snapshot.latestWeeklyReview?.biggestOutputThisWeek === WEEKLY_REVIEW_OUTPUT &&
      snapshot.latestWeeklyReview?.nextWeekPriority === WEEKLY_REVIEW_PRIORITY,
    { timeoutMs: 90_000 },
  );
}

async function assertPersistedSystemLoaded() {
  await waitFor(
    "persisted 12-week system after login",
    `
      document.body.innerText.includes("Hệ 12 tuần") &&
      (document.body.innerText.includes("Chu kỳ đang chạy") || document.body.innerText.includes("Nhịp 12 tuần")) &&
      document.body.innerText.includes(${JSON.stringify(GOAL_TITLE)}) &&
      (document.body.innerText.includes("Đã nối") || document.body.innerText.includes("Đã lưu"))
    `,
    { timeoutMs: 75_000 },
  );
}

async function reloadAndAssert() {
  log("Reloading 12-week system and checking persisted data");
  await browserEval("location.reload()");
  await runAgentBrowser(["wait", "--load", "networkidle"], { timeoutMs: 90_000 });
  await waitFor("reloaded 12-week system route", 'location.pathname === "/12-week-system"', { timeoutMs: 75_000 });
  await assertSystemLoaded();
  await assertDailyExecutionPersisted();
}

async function exerciseMockUpgrade() {
  log("Checking mock upgrade flow");
  await openPage("/billing/plan");
  await waitFor("billing plan page", 'document.body.innerText.includes("Gói hiện tại")');
  await clickByButton("Mở Plus demo");
  await waitFor("upgrade dialog", 'document.querySelector("[role=\\"dialog\\"]")');
  await clickDialogUpgradeButton();
  await waitFor(
    "mock checkout page",
    'location.pathname === "/billing/mock-checkout"',
    { timeoutMs: 45_000 },
  );
  await clickByButton("Xác nhận mở gói (demo)");
  await waitFor(
    "mock upgrade local plan active",
    `
      (() => {
        const raw = localStorage.getItem("visionboard_user_data");
        if (!raw) return false;
        try {
          const data = JSON.parse(raw);
          return data.subscription?.planCode === "PLUS" &&
            data.subscription?.status === "active" &&
            Array.isArray(data.entitlements) &&
            data.entitlements.length > 0;
        } catch {
          return false;
        }
      })()
    `,
    { timeoutMs: 45_000 },
  );
}

async function logoutAndLoginAgain() {
  log("Checking cleared session then login restores the same workspace");
  await clearBrowserStorage();
  await openPage("/login?next=%2F12-week-system");
  await waitFor("login route after clearing auth", 'location.pathname === "/login"', { timeoutMs: 45_000 });
  await waitFor("login form after clearing auth", 'document.querySelector("#login-email") && document.querySelector("#login-password")');

  await fillBySelector("#login-email", EMAIL);
  await fillBySelector("#login-password", PASSWORD);
  await clickByButton("Đăng nhập");
  await waitFor("12-week system route after login", 'location.pathname === "/12-week-system"', { timeoutMs: 75_000 });
  await assertPersistedSystemLoaded();
  await assertDailyExecutionRestoredAfterLogin();
}

async function main() {
  if (!["signin", "signup"].includes(AUTH_MODE)) {
    throw new Error('PROD_SMOKE_AUTH_MODE must be either "signin" or "signup" when provided');
  }
  if (AUTH_MODE === "signin" && !HAS_PROVIDED_CREDENTIALS) {
    throw new Error("PROD_SMOKE_EMAIL and PROD_SMOKE_PASSWORD are required when PROD_SMOKE_AUTH_MODE=signin");
  }

  log(`Target: ${BASE_URL}`);
  if (!HAS_PROVIDED_CREDENTIALS) {
    log(`No PROD_SMOKE_EMAIL/PROD_SMOKE_PASSWORD provided; using generated QA account ${EMAIL}`);
  }

  try {
    await runStep("Resetting browser session", async () => {
      await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
    });
    await runStep("Signed-out home", runSignedOutSmoke);
    await runStep("Fresh authenticated workspace", runFreshAuthenticatedWorkspaceSmoke);
    await runStep("Authentication", signInOrSignUp);
    await runStep("Onboarding mobile polish", runOnboardingSmoke);
    await runStep("Life balance assessment", completeOnboarding);
    await runStep("Life insight", completeLifeInsight);
    await runStep("SMART goal setup", completeSmartGoal);
    await runStep("Feasibility check", completeFeasibility);
    await runStep("12-week setup", completeTwelveWeekSetup);
    await runStep("12-week system", assertSystemLoaded);
    await runStep("Daily execution and weekly review", exerciseTwelveWeekDailyExecution);
    await runStep("Persistence after reload", reloadAndAssert);
    await runStep("Mock upgrade", exerciseMockUpgrade);
    if (HAS_PROVIDED_CREDENTIALS) {
      await runStep("Logout/login persistence", logoutAndLoginAgain);
    } else {
      log("Skipping logout/login persistence because PROD_SMOKE_EMAIL/PROD_SMOKE_PASSWORD were not provided");
    }
    await runStep("Browser error scan", assertNoBrowserErrors);
    log("Production smoke passed");
  } finally {
    await clearBrowserStorage().catch(() => undefined);
    await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`[prod-smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
