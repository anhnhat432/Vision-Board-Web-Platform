#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = (process.env.UX_UI_QA_URL ?? "http://localhost:5175").replace(/\/$/, "");
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const OUTPUT_DIR = path.resolve("artifacts/review-life-insight");
const SESSION = `visual-life-insight-${TIMESTAMP}`;

const VIEWPORTS = {
  desktop: { name: "desktop", width: 1280, height: 1000 },
  tablet: { name: "tablet", width: 768, height: 1000 },
  mobile: { name: "mobile", width: 375, height: 1000 },
};

function log(message) {
  console.log(`[life-insight-qa] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
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
        ? [
            "/d",
            "/s",
            "/c",
            ["npx.cmd", "agent-browser", "--session", quoteCmdArg(SESSION), ...args.map(quoteCmdArg)].join(" "),
          ]
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
    child.on("error", (error) => settle(reject, error));

    const finish = (code) => {
      if (code !== 0) {
        settle(reject, new Error(`agent-browser ${args.join(" ")} failed with code ${code}\n${stderr || stdout}`));
        return;
      }
      settle(resolve, { stdout, stderr });
    };

    child.on("exit", (code) => setTimeout(() => finish(code), 25));
    child.on("close", (code) => finish(code));

    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

async function browserEval(source) {
  const result = await runAgentBrowser(["eval", "--stdin"], { input: source });
  const value = result.stdout.trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function setViewport(viewport) {
  await runAgentBrowser(["set", "viewport", String(viewport.width), String(viewport.height)], { timeoutMs: 45_000 });
}

async function openPage(route) {
  const url = `${BASE_URL}${route}`;
  log(`Opening ${url}`);
  await runAgentBrowser(["open", url], { timeoutMs: 90_000 });
  await runAgentBrowser(["wait", "--load", "networkidle"], { timeoutMs: 90_000 });
}

async function captureViewportScreenshots(stateName) {
  for (const key of ["desktop", "tablet", "mobile"]) {
    const viewport = VIEWPORTS[key];
    log(`Capturing ${stateName} - ${viewport.name} (${viewport.width}px)`);
    await setViewport(viewport);
    await sleep(600); // Đợi layout ổn định và animation chạy xong
    const fileName = `${stateName}-${viewport.name}.png`;
    const screenshotPath = path.join(OUTPUT_DIR, fileName);
    await runAgentBrowser(["screenshot", screenshotPath], { timeoutMs: 60_000 });
  }
}

async function main() {
  log("Starting visual QA for /life-insight");
  await mkdir(OUTPUT_DIR, { recursive: true });

  // TRẠNG THÁI 1: KHÔNG CÓ DỮ LIỆU (Empty state / Gate state)
  log("Step 1: Checking Empty / Core Gate state (no data)");
  await openPage("/life-insight");
  
  // Clear storage để chắc chắn rơi vào Gate State
  await browserEval(`
    (() => {
      localStorage.clear();
      sessionStorage.clear();
      return true;
    })()
  `);
  
  // Reload
  await openPage("/life-insight");
  await captureViewportScreenshots("empty");

  // TRẠNG THÁI 2: CÓ DỮ LIỆU HỢP LỆ (Báo cáo cá nhân)
  log("Step 2: Checking Active Life Insight report (seeded data)");
  await browserEval(`
    (() => {
      const data = {
        onboardingCompleted: true,
        dataVersion: 3,
        currentWheelOfLife: [
          { name: "Career", score: 6 },
          { name: "Finance", score: 5 },
          { name: "Health", score: 4 },
          { name: "Education", score: 8 },
          { name: "Relationships", score: 6 },
          { name: "Family", score: 7 },
          { name: "Personal Growth", score: 6 },
          { name: "Leisure", score: 5 }
        ],
        wheelOfLifeHistory: [
          {
            date: "2026-04-27T00:00:00.000Z",
            areas: [
              { name: "Career", score: 6 },
              { name: "Finance", score: 5 },
              { name: "Health", score: 4 },
              { name: "Education", score: 8 },
              { name: "Relationships", score: 6 },
              { name: "Family", score: 7 },
              { name: "Personal Growth", score: 6 },
              { name: "Leisure", score: 5 }
            ]
          }
        ],
        appPreferences: {
          theme: "light",
          analyticsConsent: "off",
          localEventLog: "off",
          locale: "vi"
        },
        billingState: { planCode: "FREE", entitlements: [], updatedAt: new Date().toISOString() }
      };
      localStorage.setItem("user_data", JSON.stringify(data));
      return true;
    })()
  `);

  // Reload
  await openPage("/life-insight");
  await captureViewportScreenshots("report");

  log(`Done! Screenshots saved to: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Visual QA failed:", err);
  process.exit(1);
});
