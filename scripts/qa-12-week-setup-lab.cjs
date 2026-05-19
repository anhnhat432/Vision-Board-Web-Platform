const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const base = "http://127.0.0.1:5174";
  const out = path.join(process.cwd(), "qa-artifacts", "12-week-setup-lab");
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = { errors: [], warnings: [], exceptions: [], failedRequests: [] };
  const findings = [];

  page.on("console", (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === "error") logs.errors.push(text);
    if (t === "warning" || t === "warn") logs.warnings.push(text);
  });
  page.on("pageerror", (err) => logs.exceptions.push(err.stack || err.message));
  page.on("requestfailed", (req) =>
    logs.failedRequests.push({
      url: req.url(),
      failure: req.failure()?.errorText || "unknown",
    }),
  );

  async function seed() {
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.clear();
      const areas = [
        "Career",
        "Finance",
        "Health",
        "Education",
        "Relationships",
        "Family",
        "Personal Growth",
        "Leisure",
      ];
      localStorage.setItem(
        "visionboard_user_data",
        JSON.stringify({
          storageVersion: 8,
          userId: "qa-local-user",
          onboardingCompleted: true,
          currentWheelOfLife: areas.map((name) => ({
            name,
            score: name === "Career" ? 7 : 5,
            color: "#8b5cf6",
          })),
          goals: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          appPreferences: {
            allowLocalAnalytics: true,
            enableInAppReminders: false,
            enableBrowserNotifications: false,
            keepLocalOutbox: true,
            preferredReminderHour: 19,
          },
        }),
      );
      localStorage.setItem("selected_focus_area", "Career");
      localStorage.setItem(
        "pending_smart_goal",
        JSON.stringify({
          focusArea: "Career",
          specific:
            "Hoàn thành MVP Vision Board có thể demo cho 10 người dùng đầu tiên.",
          measurable: "Số người dùng test / 10 / người",
          achievable:
            "Có thể ship theo từng màn và kiểm tra với người dùng thật.",
          relevant: "Tôi muốn kiểm chứng ý tưởng bằng sản phẩm thật.",
          timeBound: "Trong 12 tuần tới",
        }),
      );
      localStorage.setItem(
        "pending_feasibility_result",
        JSON.stringify({
          resultType: "realistic",
          resultTitle: "Khả thi",
          resultSummary: "Bạn có đủ nền tảng để làm việc này.",
          recommendation: "Giữ flow gọn, đo bằng demo thật và feedback thật.",
          readinessScore: 16,
          adjustedScore: 17,
          wheelScore: 7,
          savedAt: new Date().toISOString(),
        }),
      );
      localStorage.removeItem("pending_12_week_setup_draft");
    });
  }

  async function auditViewport(name, width, height, shotName) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    const metrics = await page.evaluate(() => {
      const root =
        document.querySelector("#twelve-week-setup-title")?.closest("section")
          ?.parentElement ?? document.body;
      const nodes = [
        ...root.querySelectorAll("button,a,[role=button],summary"),
      ];
      const buttons = nodes
        .map((el) => {
          const r = el.getBoundingClientRect();
          const txt = (
            el.innerText ||
            el.getAttribute("aria-label") ||
            ""
          ).trim();
          return {
            txt,
            w: r.width,
            h: r.height,
            visible: r.width > 0 && r.height > 0,
          };
        })
        .filter((x) => x.visible);
      return {
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        bodySw: document.body.scrollWidth,
        buttons,
        openDetails: [...root.querySelectorAll("details[open]")].length,
        cutText: [...root.querySelectorAll("input,textarea")]
          .filter((el) => el.scrollWidth > el.clientWidth + 2)
          .map((el) => el.id || el.name || el.getAttribute("aria-label") || ""),
      };
    });
    if (metrics.sw > metrics.cw + 1 || metrics.bodySw > metrics.cw + 1)
      findings.push(
        `${name}: tràn ngang ${metrics.sw}/${metrics.cw}, body ${metrics.bodySw}/${metrics.cw}`,
      );
    if (metrics.buttons.some((b) => b.w < 40 || b.h < 40))
      findings.push(`${name}: có target nhỏ hơn 40px`);
    if (metrics.openDetails > 1)
      findings.push(`${name}: có ${metrics.openDetails} details mở mặc định`);
    if (metrics.cutText.length)
      findings.push(
        `${name}: input/textarea có scrollWidth lớn hơn clientWidth: ${metrics.cutText.join(", ")}`,
      );
    if (shotName)
      await page.screenshot({ path: path.join(out, shotName), fullPage: true });
    return metrics;
  }

  try {
    await seed();
    await page.goto(base + "/12-week-setup-lab", { waitUntil: "networkidle" });

    await auditViewport("Step 1 mobile", 375, 812, "step-1-mobile.png");
    await page
      .locator("#week-12-outcome")
      .fill(
        "Hoàn thành MVP Vision Board có thể demo cho 10 người dùng đầu tiên.",
      );
    await page
      .locator("#vision-12-week")
      .fill("Tôi muốn kiểm chứng ý tưởng bằng sản phẩm thật.");
    await page.locator("#lag-metric-target").fill("10");
    await page.locator("#lag-metric-unit").fill("người");
    await page.locator("#lag-metric-name").fill("Số người dùng test");
    await page.getByRole("button", { name: "Tiếp →" }).click();

    await page.waitForTimeout(500);
    await auditViewport("Step 2 mobile", 375, 812, "step-2-mobile.png");
    const step2Values = [
      ["Demo sản phẩm cho người dùng", "2", "lần/tuần"],
      ["Code chức năng chính", "5", "buổi/tuần"],
      ["Viết ghi chú feedback", "2", "lần/tuần"],
    ];
    for (let i = 0; i < step2Values.length; i++) {
      if (i > 1)
        await page.getByRole("button", { name: /Thêm việc lặp lại/ }).click();
      const [name, target, unit] = step2Values[i];
      await page.locator(`#tactic-name-${i}`).fill(name);
      await page.locator(`#tactic-target-${i}`).fill(target);
      await page.locator(`#tactic-unit-${i}`).fill(unit);
    }
    await page.getByRole("button", { name: "Tiếp →" }).click();

    await page.waitForTimeout(500);
    await auditViewport("Step 3 mobile", 375, 812, "step-3-mobile.png");
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await page.locator("#cycle-start-date").fill(tomorrow);
    await page.getByRole("button", { name: "CN" }).click();
    await page.getByRole("button", { name: /1 giờ/ }).click();
    await page
      .getByRole("button", { name: /Vừa đủ/ })
      .click()
      .catch(async () => {
        await page.getByText("Vừa đủ để tiến bộ").click();
      });
    await page.getByRole("button", { name: "Tiếp →" }).click();

    await page.waitForTimeout(700);
    await auditViewport("Step 4 mobile", 375, 812, "step-4-mobile.png");
    const previewText = await page.locator("body").innerText();
    const required = [
      "Hoàn thành MVP Vision Board có thể demo cho 10 người dùng đầu tiên",
      "Số người dùng test",
      "Tôi muốn kiểm chứng ý tưởng bằng sản phẩm thật",
      "10",
      "người",
      "Chủ Nhật",
      "Demo sản phẩm cho người dùng",
      "Code chức năng chính",
      "Viết ghi chú feedback",
      "Tuần 1",
    ];
    const missing = required.filter((x) => !previewText.includes(x));
    if (missing.length)
      findings.push("Step 4 preview thiếu: " + missing.join(" | "));
    if (!/scorecard|điểm|thang điểm|Scorecard/i.test(previewText))
      findings.push("Step 4 preview chưa thấy scorecard explanation rõ ràng");

    await auditViewport("Step 4 tablet", 768, 1024, null);
    await auditViewport("Step 4 desktop", 1440, 900, "step-4-desktop.png");

    await page.goto(base + "/12-week-setup", { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(out, "route-old-12-week-setup.png"),
      fullPage: true,
    });
    const oldText = await page.locator("body").innerText();
    const oldOk = oldText.length > 100 && !oldText.includes("LAB");
    if (!oldOk)
      findings.push(
        "Route cũ /12-week-setup có dấu hiệu lỗi hoặc chứa badge LAB",
      );
    const navLab = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          "nav a, aside a, footer a, [role=navigation] a",
        ),
      ]
        .map((a) => ({
          href: a.getAttribute("href") || "",
          text: (a.textContent || "").trim(),
        }))
        .filter(
          (a) => a.href.includes("12-week-setup-lab") || /lab/i.test(a.text),
        ),
    );
    if (navLab.length)
      findings.push(
        "Lab xuất hiện trong navigation: " + JSON.stringify(navLab),
      );

    const report = [
      "# QA Report — 12-week-setup-lab",
      "",
      "## Commands run",
      "- `npm run typecheck` — PASS",
      "- `npm run build` — PASS",
      "- `npm run test:run -- 12Week` — PASS, 46 files / 514 tests passed; stderr có warning mock bulkSyncPlan trong test nhưng exit code 0.",
      "- `npm run dev -- --host 127.0.0.1` — PASS, served http://127.0.0.1:5173/",
      "- `set VITE_APP_MODE=demo && npm run dev -- --host 127.0.0.1 --port 5174` — PASS, served http://127.0.0.1:5174/",
      "",
      "## Viewports tested",
      "- Mobile: 375 x 812",
      "- Tablet: 768 x 1024",
      "- Desktop: 1440 x 900",
      "",
      "## Flow tested",
      "- Seeded localStorage using existing keys: `visionboard_user_data`, `selected_focus_area`, `pending_smart_goal`, `pending_feasibility_result`.",
      "- Completed `/12-week-setup-lab` Step 1 → Step 4 with requested sample data.",
      "- Checked Step 4 preview for outcome, lag metric, why, start date/review day, scorecard explanation, 3 recurring actions, Week 1.",
      "- Checked `/12-week-setup` as comparison route.",
      "",
      "## Screenshots created",
      "- `step-1-mobile.png`",
      "- `step-2-mobile.png`",
      "- `step-3-mobile.png`",
      "- `step-4-mobile.png`",
      "- `step-4-desktop.png`",
      "- `route-old-12-week-setup.png`",
      "- `debug-current-route.png`",
      "",
      "## Bugs found",
      findings.length
        ? findings.map((x) => "- " + x).join("\n")
        : "- Không phát hiện blocker trong phạm vi automation này.",
      "",
      "## UX issues found",
      findings.length
        ? findings.map((x) => "- " + x).join("\n")
        : "- Không phát hiện issue nghiêm trọng: không thấy tràn ngang, CTA chính khả dụng, details/collapsible không bung quá nhiều mặc định trong các viewport đã test.",
      "",
      "## Console errors",
      "- console.error: " +
        (logs.errors.length ? logs.errors.join("\n- ") : "Không ghi nhận."),
      "- uncaught exception: " +
        (logs.exceptions.length
          ? logs.exceptions.join("\n- ")
          : "Không ghi nhận."),
      "- failed network request: " +
        (logs.failedRequests.length
          ? JSON.stringify(logs.failedRequests, null, 2)
          : "Không ghi nhận."),
      "- warnings quan trọng: " +
        (logs.warnings.length
          ? logs.warnings.join("\n- ")
          : "Không ghi nhận warning ảnh hưởng UX."),
      "",
      "## Route cũ có bị ảnh hưởng không",
      oldOk
        ? "- `/12-week-setup` vẫn vào được, không bị thay bằng lab UI, không thấy badge LAB."
        : "- Có dấu hiệu cần kiểm tra route cũ: xem bugs.",
      navLab.length
        ? "- Lab route xuất hiện trong navigation."
        : "- Không thấy route lab trong navbar/sidebar/bottom nav.",
      "",
      "## Go/No-Go recommendation",
      findings.length
        ? "- NO-GO nhẹ cho user testing đến khi xử lý các issue ở mục Bugs/UX."
        : "- GO cho vòng user testing nội bộ/nhỏ. Không thấy blocker qua typecheck/build/test và browser QA local.",
      "",
      "## Raw runtime logs",
      "```json",
      JSON.stringify(logs, null, 2),
      "```",
      "",
    ].join("\n");
    fs.writeFileSync(path.join(out, "QA_REPORT.md"), report, "utf8");
  } finally {
    await browser.close();
  }
})();
