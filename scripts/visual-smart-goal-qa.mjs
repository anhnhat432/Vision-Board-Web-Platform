#!/usr/bin/env node

/**
 * Visual SMART Goal Setup review script
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://localhost:5174";
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const OUTPUT_DIR = path.resolve(`artifacts/visual-ux-ui/smart-goal-setup-${TIMESTAMP}`);
const SESSION = `smart-goal-qa-${TIMESTAMP}`;

const VIEWPORTS = {
  mobile: { name: "mobile", width: 375, height: 812 },
  tablet: { name: "tablet", width: 768, height: 1024 },
  desktop: { name: "desktop", width: 1280, height: 1000 },
};

function log(message) {
  console.log(`[smart-goal-qa] ${message}`);
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

    const timeout = setTimeout(() => {
      killProcessTree(child);
      if (!settled) {
        settled = true;
        reject(new Error(`agent-browser ${args.join(" ")} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });

    child.on("exit", (code) => {
      setTimeout(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          if (code !== 0) {
            reject(new Error(`agent-browser ${args.join(" ")} failed with code ${code}\n${stderr || stdout}`));
          } else {
            resolve({ stdout, stderr });
          }
        }
      }, 50);
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

async function browserEval(source) {
  const result = await runAgentBrowser(["eval", "--stdin"], { input: source, timeoutMs: 30_000 });
  const value = result.stdout.trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function setViewport(viewport) {
  log(`Setting viewport to ${viewport.width}x${viewport.height} (${viewport.name})`);
  await runAgentBrowser(["set", "viewport", String(viewport.width), String(viewport.height)], { timeoutMs: 30_000 });
}

async function openPage(url) {
  log(`Opening ${url}`);
  await runAgentBrowser(["open", url], { timeoutMs: 60_000 });
  await runAgentBrowser(["wait", "--load", "networkidle"], { timeoutMs: 60_000 });
}

async function captureScreenshot(stepName, viewport) {
  const fileName = `${stepName}-${viewport.name}.png`;
  const screenshotPath = path.join(OUTPUT_DIR, fileName);
  log(`Capturing screenshot for ${stepName} in ${viewport.name} -> ${screenshotPath}`);
  await runAgentBrowser(["screenshot", screenshotPath, "--full"], { timeoutMs: 30_000 });
}

async function seedState() {
  log("Seeding localStorage with Life Balance and selected focus area...");
  await browserEval(`
    (() => {
      const data = {
        storageVersion: 5,
        userId: "ux-ui-qa",
        currentWheelOfLife: [
          { name: "Career", score: 7, color: "#8b5cf6" },
          { name: "Finance", score: 6, color: "#10b981" },
          { name: "Health", score: 6, color: "#ef4444" },
          { name: "Education", score: 7, color: "#f59e0b" },
          { name: "Relationships", score: 6, color: "#ec4899" },
          { name: "Family", score: 7, color: "#3b82f6" },
          { name: "Personal Growth", score: 8, color: "#14b8a6" },
          { name: "Leisure", score: 5, color: "#a855f7" },
        ],
        goals: [],
        visionBoards: [],
        achievements: [],
        reflections: [],
        onboardingCompleted: true,
      };
      localStorage.setItem("visionboard_user_data", JSON.stringify(data));
      localStorage.setItem("selected_focus_area", "Career");
      localStorage.removeItem("pending_smart_goal");
      return true;
    })()
  `);
}

async function runStepAction(stepKey) {
  log(`Executing auto-fill action for step: ${stepKey}`);
  if (stepKey === "specific") {
    await browserEval(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Hoàn thành 1 dự án trọng điểm"));
        if (btn) {
          btn.click();
          return "clicked suggestion";
        }
        const textarea = document.querySelector("#smart-specific");
        if (textarea) {
          textarea.value = "Hoàn thành thiết kế hệ thống mới cho sản phẩm công ty để tối ưu hóa hiệu năng vận hành.";
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
          return "filled manual";
        }
        return "not found element";
      })()
    `);
  } else if (stepKey === "measurable") {
    await browserEval(`
      (() => {
        const setNativeValue = (element, value) => {
          if (!element) return;
          const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
          if (descriptor && descriptor.set) {
            descriptor.set.call(element, value);
          } else {
            element.value = value;
          }
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        };
        setNativeValue(document.querySelector("#smart-metric-name"), "Số dự án bàn giao thành công");
        setNativeValue(document.querySelector("#smart-metric-unit"), "dự án");
        setNativeValue(document.querySelector("#smart-target"), "1");
        return "filled measurable";
      })()
    `);
  } else if (stepKey === "achievable") {
    await browserEval(`
      (() => {
        const setNativeValue = (element, value) => {
          if (!element) return;
          const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
          if (descriptor && descriptor.set) {
            descriptor.set.call(element, value);
          } else {
            element.value = value;
          }
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        };
        setNativeValue(document.querySelector("#smart-weekly-hours-slider"), "8");
        setNativeValue(document.querySelector("#smart-required-skills"), "Thiết kế hệ thống, NodeJS nâng cao");
        setNativeValue(document.querySelector("#smart-support-resources"), "Khóa học Udemy, Sách lập trình chuyên ngành");
        return "filled achievable";
      })()
    `);
  } else if (stepKey === "relevant") {
    await browserEval(`
      (() => {
        const setNativeValue = (element, value) => {
          if (!element) return;
          const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
          if (descriptor && descriptor.set) {
            descriptor.set.call(element, value);
          } else {
            element.value = value;
          }
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        };
        setNativeValue(document.querySelector("#smart-relevant-reason"), "Nâng cao năng lực chuyên môn để sẵn sàng cho đợt review thăng tiến tiếp theo.");
        return "filled relevant";
      })()
    `);
  }
  await sleep(500);
}

async function clickNextStep(nextButtonText) {
  log(`Clicking Next: "${nextButtonText}"`);
  const clicked = await browserEval(`
    (() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.innerText.includes("${nextButtonText}"));
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    })()
  `);
  if (!clicked) {
    throw new Error(`Could not click Next button with text containing "${nextButtonText}"`);
  }
  await sleep(800);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  log(`Output Directory: ${OUTPUT_DIR}`);
  
  try {
    // 1. Mở trang và seed state
    await openPage(`${BASE_URL}/smart-goal-setup`);
    await seedState();
    // Reload lại trang để update state
    await openPage(`${BASE_URL}/smart-goal-setup`);
    await sleep(1000);

    const steps = [
      { key: "specific", name: "01-specific", nextBtn: "Tiếp tục" },
      { key: "measurable", name: "02-measurable", nextBtn: "Tiếp tục" },
      { key: "achievable", name: "03-achievable", nextBtn: "Tiếp tục" },
      { key: "relevant", name: "04-relevant", nextBtn: "Tiếp tục" },
      { key: "timeBound", name: "05-timebound", nextBtn: null }, // Step cuối cùng chứa cả Review & QualityFeedback
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      log(`--- Processing Step ${i+1}: ${step.key} ---`);

      // Auto-fill values cho step để nó valid (chỉ điền khi không phải step cuối)
      if (step.key !== "timeBound") {
        await runStepAction(step.key);
      }

      // Chụp ảnh ở 3 viewport
      await setViewport(VIEWPORTS.desktop);
      await captureScreenshot(step.name, VIEWPORTS.desktop);

      await setViewport(VIEWPORTS.tablet);
      await captureScreenshot(step.name, VIEWPORTS.tablet);

      await setViewport(VIEWPORTS.mobile);
      await captureScreenshot(step.name, VIEWPORTS.mobile);

      // Trở lại desktop và click Next
      if (step.nextBtn) {
        await setViewport(VIEWPORTS.desktop);
        await clickNextStep(step.nextBtn);
      }
    }

    log("QA Screen capture finished successfully!");
    console.log(`\nScreenshots saved to: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error("QA Screen capture failed:", error);
    process.exitCode = 1;
  } finally {
    await runAgentBrowser(["close"]).catch(() => undefined);
  }
}

main();
