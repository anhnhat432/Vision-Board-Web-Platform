#!/usr/bin/env node

import { spawn } from "node:child_process";

const BASE_URL = (process.env.PROD_SMOKE_URL ?? "https://vision-board-web-platform.vercel.app").replace(/\/$/, "");
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const GENERATED_EMAIL = `codex.qa+smoke-${TIMESTAMP}@example.com`;
const GENERATED_PASSWORD = `CodexSmoke${TIMESTAMP}!`;
const EMAIL = process.env.PROD_SMOKE_EMAIL?.trim() || GENERATED_EMAIL;
const PASSWORD = process.env.PROD_SMOKE_PASSWORD || GENERATED_PASSWORD;
const HAS_PROVIDED_CREDENTIALS = Boolean(process.env.PROD_SMOKE_EMAIL && process.env.PROD_SMOKE_PASSWORD);
const AUTH_MODE_OVERRIDE = process.env.PROD_SMOKE_AUTH_MODE?.trim().toLowerCase();
const AUTH_MODE = AUTH_MODE_OVERRIDE || (HAS_PROVIDED_CREDENTIALS ? "signin" : "signup");
const GOAL_TITLE = `QA smoke production ${TIMESTAMP}`;
const TACTIC_ONE = `Review tuan QA ${TIMESTAMP}`;
const TACTIC_TWO = `Hoan thanh viec QA ${TIMESTAMP}`;

function log(message) {
  console.log(`[prod-smoke] ${message}`);
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

async function runStep(label, task) {
  log(label);
  await task();
}

async function signInOrSignUp() {
  const modeQuery = AUTH_MODE === "signup" ? "mode=signup&" : "";
  await openPage(`/login?${modeQuery}next=%2Fonboarding`);
  await waitFor("login form", 'document.querySelector("#login-email") && document.querySelector("#login-password")');

  log(`${AUTH_MODE === "signup" ? "Creating" : "Signing in with"} QA account ${EMAIL}`);
  await fillSelector("#login-email", EMAIL);
  await fillSelector("#login-password", PASSWORD);
  await clickButton(AUTH_MODE === "signup" ? "Tạo tài khoản" : "Đăng nhập");
  await waitFor("authenticated onboarding route", 'location.pathname === "/onboarding"', { timeoutMs: 70_000 });
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

async function assertSystemLoaded() {
  await waitFor(
    "12-week system with created goal and tasks",
    `
      document.body.innerText.includes(${JSON.stringify(GOAL_TITLE)}) &&
      document.body.innerText.includes(${JSON.stringify(TACTIC_ONE)}) &&
      document.body.innerText.includes(${JSON.stringify(TACTIC_TWO)}) &&
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
  await assertSystemLoaded();
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
    await runStep("Authentication", signInOrSignUp);
    await runStep("Onboarding mobile polish", runOnboardingSmoke);
    await runStep("Life balance assessment", completeOnboarding);
    await runStep("Life insight", completeLifeInsight);
    await runStep("SMART goal setup", completeSmartGoal);
    await runStep("Feasibility check", completeFeasibility);
    await runStep("12-week setup", completeTwelveWeekSetup);
    await runStep("12-week system", assertSystemLoaded);
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
