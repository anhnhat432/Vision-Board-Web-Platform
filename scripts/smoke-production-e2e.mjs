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

async function pageAction(source) {
  const result = await browserEval(`
    (() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim().toLowerCase();
      const setNativeValue = (element, value) => {
        if (!element) throw new Error("Missing input element");
        const prototype = Object.getPrototypeOf(element);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
        if (descriptor?.set) descriptor.set.call(element, value);
        else element.value = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const getInputByLabel = (labelText) => {
        const target = normalize(labelText);
        const label = Array.from(document.querySelectorAll("label")).find((item) =>
          normalize(item.textContent).includes(target),
        );
        if (!label) throw new Error("Could not find label: " + labelText);
        const id = label.getAttribute("for");
        const element = id ? document.getElementById(id) : label.querySelector("input, textarea");
        if (!element) throw new Error("Could not find input for label: " + labelText);
        return element;
      };
      const fillLabel = (labelText, value) => {
        setNativeValue(getInputByLabel(labelText), value);
      };
      const fillSelector = (selector, value) => {
        setNativeValue(document.querySelector(selector), value);
      };
      const clickButton = (text) => {
        const target = normalize(text);
        const button = Array.from(document.querySelectorAll("button")).find((item) =>
          normalize(item.innerText || item.textContent).includes(target),
        );
        if (!button) throw new Error("Could not find button: " + text);
        if (button.disabled) throw new Error("Button is disabled: " + text);
        button.scrollIntoView({ block: "center" });
        button.click();
      };
      const clickLabel = (text) => {
        const target = normalize(text);
        const label = Array.from(document.querySelectorAll("label")).find((item) =>
          normalize(item.textContent).includes(target),
        );
        if (label) {
          label.scrollIntoView({ block: "center" });
          label.click();
          const id = label.getAttribute("for");
          if (id) document.getElementById(id)?.click();
          return;
        }

        const radio = Array.from(document.querySelectorAll('[role="radio"], input[type="radio"]')).find((item) =>
          normalize(item.getAttribute("aria-label") || item.textContent).includes(target),
        );
        if (!radio) throw new Error("Could not find radio label: " + text);
        radio.scrollIntoView({ block: "center" });
        radio.click();
      };
      ${source}
      return true;
    })()
  `);

  if (result !== true) {
    throw new Error(`Page action failed: ${source}`);
  }
}

async function clickButton(text) {
  log(`Clicking button: ${text}`);
  await pageAction(`clickButton(${JSON.stringify(text)});`);
}

async function fillLabel(label, value) {
  log(`Filling label: ${label}`);
  await pageAction(`fillLabel(${JSON.stringify(label)}, ${JSON.stringify(value)});`);
}

async function fillSelector(selector, value) {
  log(`Filling selector: ${selector}`);
  await pageAction(`fillSelector(${JSON.stringify(selector)}, ${JSON.stringify(value)});`);
}

async function clickLabel(text) {
  log(`Clicking label: ${text}`);
  await pageAction(`clickLabel(${JSON.stringify(text)});`);
}

async function clickTab(text) {
  log(`Clicking tab: ${text}`);
  await pageAction(`
    const target = normalize(${JSON.stringify(text)});
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((item) =>
      normalize(item.innerText || item.textContent).includes(target),
    );
    if (!tab) throw new Error("Could not find tab: " + ${JSON.stringify(text)});
    tab.scrollIntoView({ block: "center" });
    tab.click();
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
  await fillSelector("#login-email", email);
  await fillSelector("#login-password", password);
  await clickButton(mode === "signup" ? "Tạo tài khoản" : "Đăng nhập");
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
  await waitFor("public home", 'document.body.innerText.includes("Bắt đầu miễn phí")');

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
  await waitFor("onboarding welcome", 'document.body.innerText.includes("Bắt đầu đánh giá")');

  const ctaState = await browserEval(`
    (() => {
      const button = Array.from(document.querySelectorAll("button")).find((item) =>
        item.innerText.includes("Bắt đầu đánh giá"),
      );
      return {
        found: Boolean(button),
        className: button?.className ?? "",
      };
    })()
  `);

  if (!ctaState.found) throw new Error("Could not find onboarding start CTA");
  if (!ctaState.className.includes("bg-violet-50") || ctaState.className.includes("bg-slate-950")) {
    throw new Error(`Onboarding CTA class is not the polished light variant: ${ctaState.className}`);
  }

  await browserEval("window.scrollTo(0, document.body.scrollHeight)");
  await clickButton("Bắt đầu đánh giá");
  await waitFor("assessment screen", 'document.body.innerText.includes("Chấm điểm hiện tại")');

  const afterClick = await getPageState();
  if (afterClick.scrollY > 8) {
    throw new Error(`Onboarding assessment did not reset to top on mobile. scrollY=${afterClick.scrollY}`);
  }
}

async function completeOnboarding() {
  await clickButton("Hoàn thành đánh giá");
  await waitFor("life insight route", 'location.pathname === "/life-insight"', { timeoutMs: 45_000 });
  await waitFor("life insight ready", 'document.body.innerText.includes("Tạo mục tiêu với")');
}

async function completeLifeInsight() {
  await clickButton("Tạo mục tiêu với");
  await waitFor("smart goal route", 'location.pathname === "/smart-goal-setup"', { timeoutMs: 45_000 });
}

async function completeSmartGoal() {
  await waitFor("smart goal first step", 'document.body.innerText.includes("Câu trả lời của bạn")');
  await fillLabel("Câu trả lời của bạn", GOAL_TITLE);
  await clickButton("Tiếp theo");

  await waitFor("smart metric step", 'document.body.innerText.includes("Chỉ số đo lường")');
  await fillLabel("Chỉ số đo lường", "So tuan review hoan thanh");
  await fillLabel("Mốc hiện tại", "0");
  await fillLabel("Mốc mục tiêu", "12");
  await clickButton("Tiếp theo");

  await waitFor("smart resources step", 'document.body.innerText.includes("Thời gian mỗi tuần")');
  await fillLabel("Thời gian mỗi tuần", "4");
  await fillLabel("Kỹ năng cần có", "Lap ke hoach tuan va review ngan");
  await fillLabel("Nguồn lực hỗ trợ", "Dashboard production va lich ca nhan");
  await clickButton("Tiếp theo");

  await waitFor("smart reason step", 'document.body.innerText.includes("Lý do bạn thật sự muốn")');
  await fillLabel("Lý do bạn thật sự muốn theo đuổi", "Smoke test production cho core flow that.");
  await fillLabel("Lĩnh vực cuộc sống liên quan", "Su nghiep");
  await clickButton("Tiếp theo");

  await waitFor("smart deadline step", 'document.body.innerText.includes("Số tuần mục tiêu")');
  await clickButton("kiểm tra tính khả thi");
  await waitFor("feasibility route", 'location.pathname === "/feasibility"', { timeoutMs: 45_000 });
}

async function completeFeasibility() {
  const answers = [
    "3-5 giờ mỗi tuần",
    "Rất thực tế",
    "Hiện chưa thấy trở ngại lớn",
    "Rất kỷ luật",
    "Cam kết hoàn toàn",
  ];

  for (const [index, answer] of answers.entries()) {
    await waitFor(`feasibility answer ${index + 1}`, `document.body.innerText.includes(${JSON.stringify(answer)})`);
    await clickLabel(answer);
    await clickButton(index === answers.length - 1 ? "Hoàn thành đánh giá" : "Tiếp theo");
  }

  await waitFor("feasibility result", 'document.body.innerText.includes("Dựng hệ 12 tuần")');
  await clickButton("Dựng hệ 12 tuần");
  await waitFor("12-week setup route", 'location.pathname === "/12-week-setup"', { timeoutMs: 45_000 });
}

async function completeTwelveWeekSetup() {
  await waitFor("12-week goal step", 'document.body.innerText.includes("Mục tiêu 12 tuần")');
  await clickButton("Tiếp tục");

  await waitFor("12-week tactics step", 'document.body.innerText.includes("2-4 tactic")');
  await pageAction(`
    const tacticInputs = Array.from(document.querySelectorAll("input")).filter((input) => {
      const id = input.id;
      const label = id ? document.querySelector(\`label[for="\${id}"]\`) : null;
      return label?.textContent?.includes("Tên tactic");
    });
    if (tacticInputs.length < 2) throw new Error("Expected at least 2 tactic inputs");
    setNativeValue(tacticInputs[0], ${JSON.stringify(TACTIC_ONE)});
    setNativeValue(tacticInputs[1], ${JSON.stringify(TACTIC_TWO)});
  `);
  await clickButton("Tiếp tục");

  await waitFor("12-week schedule step", 'document.body.innerText.includes("Tuần đầu tiên")');
  await fillLabel("Mục tiêu", "12");
  await fillLabel("Đơn vị của chỉ số", "tuan");
  await clickButton("Tiếp tục");

  await waitFor("12-week final step", 'document.body.innerText.includes("Chốt hệ thống")');
  await clickButton("Tạo hệ thống 12 tuần");
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
  await pageAction(`
    const queue =
      document.querySelector('[data-tour-id="system-today-queue"]') ||
      Array.from(document.querySelectorAll('[data-slot="card"], section, div')).find((item) =>
        normalize(item.textContent).includes("hàng việc hôm nay"),
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

  await fillLabel("Note tùy chọn", DAILY_CHECKIN_NOTE);
  await clickButton("Lưu check-in hôm nay");
  await waitForGoalSnapshot(
    "daily check-in persisted",
    (snapshot) =>
      snapshot.dailyCheckInCount >= 1 && snapshot.latestDailyCheckIn?.optionalNote === DAILY_CHECKIN_NOTE,
  );

  await openPage("/12-week-system?tab=week");
  await waitFor(
    "weekly review form ready",
    'document.querySelector("#weekly-best") && document.querySelector("#weekly-obstacle") && document.querySelector("#weekly-priority")',
  );
  await fillLabel("Điều gì chạy tốt nhất", WEEKLY_REVIEW_OUTPUT);
  await fillLabel("Điều gì cản trở", WEEKLY_REVIEW_OBSTACLE);
  await fillLabel("Một ưu tiên duy nhất", WEEKLY_REVIEW_PRIORITY);
  await clickButton("Chốt review tuần này");
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
      snapshot.latestDailyCheckIn?.optionalNote === DAILY_CHECKIN_NOTE &&
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

async function logoutAndLoginAgain() {
  log("Checking cleared session then login restores the same workspace");
  await clearBrowserStorage();
  await openPage("/login?next=%2F12-week-system");
  await waitFor("login route after clearing auth", 'location.pathname === "/login"', { timeoutMs: 45_000 });
  await waitFor("login form after clearing auth", 'document.querySelector("#login-email") && document.querySelector("#login-password")');

  await fillSelector("#login-email", EMAIL);
  await fillSelector("#login-password", PASSWORD);
  await clickButton("Đăng nhập");
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
    await runStep("Logout/login persistence", logoutAndLoginAgain);
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
