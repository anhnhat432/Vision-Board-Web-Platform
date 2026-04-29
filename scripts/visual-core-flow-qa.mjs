#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = (process.env.VISUAL_QA_URL ?? "https://vision-board-web-platform.vercel.app").replace(/\/$/, "");
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const OUTPUT_DIR = path.resolve(process.env.VISUAL_QA_OUTPUT_DIR ?? `artifacts/visual-core-flow-qa/${TIMESTAMP}`);
const SESSION = process.env.VISUAL_QA_SESSION ?? `visual-core-flow-${TIMESTAMP}`;
const EMAIL = process.env.VISUAL_QA_EMAIL?.trim() || `codex.qa+visual-${TIMESTAMP}@example.com`;
const PASSWORD = process.env.VISUAL_QA_PASSWORD || `CodexVisual${TIMESTAMP}!`;

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];
const ACTION_VIEWPORT = VIEWPORTS[0];

const report = {
  baseUrl: BASE_URL,
  outputDir: OUTPUT_DIR,
  session: SESSION,
  generatedAt: new Date().toISOString(),
  checkpoints: [],
};

function log(message) {
  console.log(`[visual-qa] ${message}`);
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
        ? ["/d", "/s", "/c", ["npx.cmd", "agent-browser", "--session", quoteCmdArg(SESSION), ...args.map(quoteCmdArg)].join(" ")]
        : ["agent-browser", "--session", SESSION, ...args];
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

    if (input) child.stdin.write(input);
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

async function setViewport(viewport) {
  await runAgentBrowser(["set", "viewport", String(viewport.width), String(viewport.height)], { timeoutMs: 45_000 });
}

async function openPage(pathOrUrl) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  log(`Opening ${url}`);
  await runAgentBrowser(["open", url], { timeoutMs: 90_000 });
  await runAgentBrowser(["wait", "--load", "networkidle"], { timeoutMs: 90_000 });
}

async function waitFor(description, source, { timeoutMs = 45_000, intervalMs = 700 } = {}) {
  log(`Waiting for ${description}`);
  const startedAt = Date.now();
  let lastValue = null;

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

  const state = await getPageState();
  throw new Error(
    `Timed out waiting for ${description}. Last value: ${String(lastValue)}\n` +
      `URL: ${state.url}\nText: ${state.text.slice(0, 900)}`,
  );
}

async function getPageState() {
  return browserEval(`
    (() => ({
      url: location.href,
      path: location.pathname,
      scrollY: Math.round(window.scrollY),
      text: document.body.innerText,
    }))()
  `);
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

async function pageAction(source) {
  const result = await browserEval(`
    (() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim().toLowerCase();
      const setNativeValue = (element, value) => {
        if (!element) throw new Error("Missing form element");
        const prototype =
          element instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : element instanceof HTMLInputElement
              ? HTMLInputElement.prototype
              : Object.getPrototypeOf(element);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
        if (descriptor?.set) descriptor.set.call(element, value);
        else element.value = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const fillSelector = (selector, value) => {
        setNativeValue(document.querySelector(selector), value);
      };
      const clickButton = (text) => {
        const target = normalize(text);
        const button = Array.from(document.querySelectorAll("button, [role='button']")).find((item) =>
          normalize(item.innerText || item.textContent).includes(target),
        );
        if (!button) throw new Error("Could not find button: " + text);
        if (button.disabled || button.getAttribute("aria-disabled") === "true") {
          throw new Error("Button is disabled: " + text);
        }
        button.scrollIntoView({ block: "center" });
        button.click();
      };
      const clickRadio = (value) => {
        const radio = document.getElementById(value) || document.querySelector('[value="' + value + '"]');
        if (!radio) throw new Error("Could not find radio: " + value);
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

async function fill(selector, value) {
  log(`Filling ${selector}`);
  await pageAction(`fillSelector(${JSON.stringify(selector)}, ${JSON.stringify(value)});`);
}

async function clickButton(text) {
  log(`Clicking button containing "${text}"`);
  await pageAction(`clickButton(${JSON.stringify(text)});`);
  await sleep(350);
}

async function clickRadio(value) {
  log(`Choosing radio ${value}`);
  await pageAction(`clickRadio(${JSON.stringify(value)});`);
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function collectLayoutMetrics() {
  return browserEval(`
    (() => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const body = document.body;
      const doc = document.documentElement;
      const scrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth || 0);
      const scrollHeight = Math.max(doc.scrollHeight, body?.scrollHeight || 0);
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0
        );
      };
      const outOfBounds = Array.from(document.querySelectorAll("body *"))
        .filter(isVisible)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            text: (element.innerText || element.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 80),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            className: String(element.className || "").slice(0, 120),
          };
        })
        .filter((item) => item.left < -2 || item.right > viewport.width + 2)
        .slice(0, 12);
      const firstViewportHeadings = Array.from(document.querySelectorAll("h1, h2, h3"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return isVisible(element) && rect.top >= -8 && rect.top <= viewport.height;
        })
        .map((element) => (element.innerText || element.textContent || "").replace(/\\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 12);

      return {
        url: location.href,
        path: location.pathname,
        title: document.title,
        viewport,
        scrollY: Math.round(window.scrollY),
        scrollWidth,
        scrollHeight,
        overflowX: Math.max(0, Math.round(scrollWidth - viewport.width)),
        bodyText: body.innerText,
        bodyTextLength: body.innerText.trim().length,
        errorOverlay: Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")),
        outOfBounds,
        firstViewportHeadings,
      };
    })()
  `);
}

async function assertNoBrowserErrors() {
  const { stdout } = await runAgentBrowser(["errors"], { timeoutMs: 30_000 });
  const errors = stdout.trim();
  if (errors) {
    throw new Error(`Browser console/page errors detected:\n${errors}`);
  }
}

async function saveReport() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(path.join(OUTPUT_DIR, "qa-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function captureCheckpoint(name, { expectedTexts = [], forbiddenTexts = [] } = {}) {
  log(`Capturing checkpoint: ${name}`);

  const checkpoint = {
    name,
    route: null,
    viewports: [],
  };

  for (const viewport of VIEWPORTS) {
    await setViewport(viewport);
    await browserEval("window.scrollTo(0, 0); true");
    await sleep(500);

    const metrics = await collectLayoutMetrics();
    checkpoint.route = metrics.path;

    for (const expected of expectedTexts) {
      if (!metrics.bodyText.includes(expected)) {
        throw new Error(`${name}/${viewport.name} is missing expected text: ${expected}\nURL: ${metrics.url}`);
      }
    }

    for (const forbidden of forbiddenTexts) {
      if (metrics.bodyText.includes(forbidden)) {
        throw new Error(`${name}/${viewport.name} still shows clutter text: ${forbidden}\nURL: ${metrics.url}`);
      }
    }

    if (metrics.errorOverlay) {
      throw new Error(`${name}/${viewport.name} shows a framework error overlay`);
    }
    if (metrics.bodyTextLength < 80) {
      throw new Error(`${name}/${viewport.name} looks blank or under-rendered`);
    }
    if (metrics.overflowX > 2) {
      throw new Error(`${name}/${viewport.name} has horizontal overflow: ${metrics.overflowX}px`);
    }

    const blockingOutOfBounds = metrics.outOfBounds.filter(
      (item) =>
        item.text.trim().length > 0 &&
        !item.className.includes("progress-indicator") &&
        !item.className.includes("absolute"),
    );
    if (blockingOutOfBounds.length > 0) {
      throw new Error(
        `${name}/${viewport.name} has text content clipped outside the viewport:\n${JSON.stringify(
          blockingOutOfBounds,
          null,
          2,
        )}`,
      );
    }

    const fileName = `${String(report.checkpoints.length + 1).padStart(2, "0")}-${slugify(name)}-${viewport.name}.png`;
    const screenshotPath = path.join(OUTPUT_DIR, fileName);
    await runAgentBrowser(["screenshot", screenshotPath, "--full"], { timeoutMs: 60_000 });

    checkpoint.viewports.push({
      viewport,
      screenshot: screenshotPath,
      url: metrics.url,
      scrollHeight: metrics.scrollHeight,
      overflowX: metrics.overflowX,
      outOfBounds: metrics.outOfBounds,
      firstViewportHeadings: metrics.firstViewportHeadings,
    });
  }

  report.checkpoints.push(checkpoint);
  await setViewport(ACTION_VIEWPORT);
  await saveReport();
}

async function signUp() {
  await openPage(`/login?mode=signup&next=${encodeURIComponent("/onboarding")}`);
  await waitFor("signup form", 'document.querySelector("#login-email") && document.querySelector("#login-password")');
  await fill("#login-email", EMAIL);
  await fill("#login-password", PASSWORD);
  await pageAction(`
    const form = document.querySelector("#login-email")?.closest("form");
    if (!form) throw new Error("Could not find email auth form");
    const submit =
      Array.from(form.querySelectorAll("button")).find((button) => button.type === "submit") ||
      Array.from(form.querySelectorAll("button")).find((button) => normalize(button.innerText).includes("tạo tài khoản"));
    if (!submit) throw new Error("Could not find signup submit button");
    submit.click();
  `);
  await waitFor("onboarding route after signup", 'location.pathname === "/onboarding"', { timeoutMs: 75_000 });
}

async function completeOnboarding() {
  await captureCheckpoint("onboarding welcome", {
    expectedTexts: ["Bắt đầu đánh giá"],
    forbiddenTexts: ["Nên làm gì tiếp?"],
  });

  await clickButton("Bắt đầu đánh giá");
  await captureCheckpoint("onboarding assessment", {
    expectedTexts: ["Chấm điểm hiện tại"],
    forbiddenTexts: ["Nên làm gì tiếp?"],
  });

  await clickButton("Hoàn thành đánh giá");
  await waitFor("life insight route", 'location.pathname === "/life-insight"', { timeoutMs: 45_000 });
}

async function completeLifeInsight() {
  await captureCheckpoint("life insight", {
    expectedTexts: ["Life Insight", "Tạo mục tiêu"],
    forbiddenTexts: ["Nên làm gì tiếp?", "Snapshot hiện tại"],
  });

  await clickButton("Tạo mục tiêu với");
  await waitFor("smart goal route", 'location.pathname === "/smart-goal-setup"', { timeoutMs: 45_000 });
}

async function completeSmartGoal() {
  await captureCheckpoint("smart goal setup", {
    expectedTexts: ["Viết mục tiêu rõ"],
    forbiddenTexts: ["Nên làm gì tiếp?"],
  });

  await fill("#smart-specific", `Tạo hệ thống review cá nhân rõ ràng cho QA visual ${TIMESTAMP}.`);
  await clickButton("Tiếp theo");

  await fill("#smart-metric-name", "Số tuần review hoàn chỉnh");
  await fill("#smart-baseline", "0");
  await fill("#smart-target", "12");
  await clickButton("Tiếp theo");

  await fill("#smart-weekly-hours", "5");
  await fill("#smart-required-skills", "Lập kế hoạch tuần\nReview ngắn");
  await fill("#smart-support-resources", "Dashboard production và lịch cá nhân");
  await clickButton("Tiếp theo");

  await fill("#smart-relevant-reason", "Tôi cần một nhịp review đủ rõ để không bỏ dở mục tiêu dài hạn.");
  await fill("#smart-life-alignment", "Sự nghiệp");
  await clickButton("Tiếp theo");

  await waitFor("smart deadline step", 'document.querySelector("#smart-target-weeks")');
  await clickButton("kiểm tra tính thực tế");
  await waitFor("feasibility route", 'location.pathname === "/feasibility"', { timeoutMs: 45_000 });
}

async function completeFeasibility() {
  await captureCheckpoint("feasibility check", {
    expectedTexts: ["Kiểm tra tính thực tế"],
    forbiddenTexts: ["Nên làm gì tiếp?"],
  });

  const answers = ["gt5", "energy_high", "resources_ready", "very_realistic", "none", "always", "committed"];
  for (const [index, answer] of answers.entries()) {
    await clickRadio(answer);
    await clickButton(index === answers.length - 1 ? "Hoàn thành đánh giá" : "Tiếp theo");
  }

  await captureCheckpoint("feasibility result", {
    expectedTexts: ["Tạo kế hoạch 12 tuần"],
    forbiddenTexts: ["Nên làm gì tiếp?"],
  });

  await clickButton("Tạo kế hoạch 12 tuần");
  await waitFor("12-week setup route", 'location.pathname === "/12-week-setup"', { timeoutMs: 45_000 });
}

async function completeTwelveWeekSetup() {
  await captureCheckpoint("12-week setup", {
    expectedTexts: ["Thiết lập 12 tuần", "Mục tiêu 12 tuần"],
    forbiddenTexts: ["Nên làm gì tiếp?", "Các bước thiết lập"],
  });

  await clickButton("Tiếp tục");

  await waitFor("tactics step", 'document.querySelector("#tactic-name-0") && document.querySelector("#tactic-name-1")');
  await fill("#tactic-name-0", `Chốt review tuần QA ${TIMESTAMP}`);
  await fill("#tactic-name-1", `Hoàn thành việc trọng tâm QA ${TIMESTAMP}`);
  await clickButton("Tiếp tục");

  await waitFor("week setup step", 'document.querySelector("#lag-metric-target")');
  await fill("#lag-metric-target", "12");
  await fill("#lag-metric-unit", "tuần");
  await clickButton("Tiếp tục");

  await waitFor("finish step", 'document.body.innerText.includes("Chốt kế hoạch")');
  await clickButton("Tạo kế hoạch 12 tuần");
  await waitFor("12-week system route", 'location.pathname === "/12-week-system"', { timeoutMs: 75_000 });
}

async function checkTwelveWeekSystem() {
  await captureCheckpoint("12-week system", {
    expectedTexts: ["Nhịp 12 tuần"],
    forbiddenTexts: ["Nên làm gì tiếp?"],
  });
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  log(`Target: ${BASE_URL}`);
  log(`Output: ${OUTPUT_DIR}`);
  log(`QA account: ${EMAIL}`);

  try {
    await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
    await openPage("/");
    await setViewport(ACTION_VIEWPORT);
    await clearBrowserStorage();

    await signUp();
    await completeOnboarding();
    await completeLifeInsight();
    await completeSmartGoal();
    await completeFeasibility();
    await completeTwelveWeekSetup();
    await checkTwelveWeekSystem();
    await assertNoBrowserErrors();

    report.completedAt = new Date().toISOString();
    report.status = "passed";
    await saveReport();
    log(`Visual QA passed. Report: ${path.join(OUTPUT_DIR, "qa-report.json")}`);
  } catch (error) {
    report.completedAt = new Date().toISOString();
    report.status = "failed";
    report.error = error instanceof Error ? error.message : String(error);
    await saveReport().catch(() => undefined);
    throw error;
  } finally {
    await clearBrowserStorage().catch(() => undefined);
    await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`[visual-qa] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
