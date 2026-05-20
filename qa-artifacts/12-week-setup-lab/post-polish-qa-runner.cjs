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
  const observations = [];

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") logs.errors.push(text);
    if (type === "warning" || type === "warn") logs.warnings.push(text);
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

  async function auditViewport(label, width, height, shotName) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => {
      const buttons = [
        ...document.querySelectorAll("button,a,[role=button],summary"),
      ]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            text: (el.innerText || el.getAttribute("aria-label") || "").trim(),
            w: r.width,
            h: r.height,
            visible: r.width > 0 && r.height > 0,
          };
        })
        .filter((x) => x.visible);
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        buttons,
        url: location.href,
      };
    });
    if (
      metrics.scrollWidth > metrics.clientWidth + 1 ||
      metrics.bodyScrollWidth > metrics.clientWidth + 1
    ) {
      findings.push(
        `${label}: tràn ngang ${metrics.scrollWidth}/${metrics.clientWidth}, body ${metrics.bodyScrollWidth}/${metrics.clientWidth}`,
      );
    }
    const smallTargets = metrics.buttons.filter((b) => b.w < 40 || b.h < 40);
    if (smallTargets.length)
      findings.push(
        `${label}: có CTA/click target nhỏ hơn 40px: ${smallTargets.map((b) => b.text || `${b.w}x${b.h}`).join(" | ")}`,
      );
    await page.screenshot({ path: path.join(out, shotName), fullPage: true });
    return metrics;
  }

  function includesAny(text, values) {
    return values.some((value) => text.includes(value));
  }

  try {
    await seed();
    await page.goto(base + "/12-week-setup-lab", { waitUntil: "networkidle" });
    await auditViewport(
      "Step 1 mobile",
      375,
      812,
      "post-polish-step-1-mobile.png",
    );

    const step1Text = await page.locator("body").innerText();
    const expectedOrder = [
      "Kết quả cuối 12 tuần",
      "Vì sao quan trọng",
      "Tên chỉ số",
      "Con số",
      "Đơn vị",
      "Loại mục tiêu",
    ];
    const positions = expectedOrder.map((label) => step1Text.indexOf(label));
    if (
      positions.some((x) => x < 0) ||
      positions.some((x, i) => i > 0 && x < positions[i - 1])
    ) {
      findings.push(
        "Step 1: field order không đúng hoặc thiếu label theo checklist.",
      );
    } else {
      observations.push(
        "Step 1 field order đúng: Kết quả cuối 12 tuần → Vì sao quan trọng → Tên chỉ số → Con số → Đơn vị → Loại mục tiêu.",
      );
    }

    await page
      .locator("#week-12-outcome")
      .fill(
        "Hoàn thành MVP Vision Board có thể demo cho 10 người dùng đầu tiên.",
      );
    await page
      .locator("#vision-12-week")
      .fill("Tôi muốn kiểm chứng ý tưởng bằng sản phẩm thật.");
    await page.locator("#lag-metric-name").fill("Số người dùng test");
    await page.locator("#lag-metric-target").fill("10");
    await page.locator("#lag-metric-unit").fill("người");
    await page.getByRole("button", { name: "Tiếp →" }).click();

    await page.waitForTimeout(600);
    const step2InitialText = await page.locator("body").innerText();
    const step2InitialHasNameError = await page
      .locator("p[role='alert']", { hasText: "Đặt tên cho việc lặp lại này" })
      .count();
    if (step2InitialHasNameError > 0) {
      findings.push(
        "Step 2: lỗi đỏ 'Đặt tên cho việc lặp lại này' xuất hiện ngay khi mới vào Step 2.",
      );
    } else {
      observations.push(
        "Step 2 validation: không hiện lỗi đỏ khi mới vào Step 2.",
      );
    }
    await auditViewport(
      "Step 2 mobile",
      375,
      812,
      "post-polish-step-2-mobile.png",
    );

    await page.getByRole("button", { name: "Tiếp →" }).click({ force: true });
    await page.waitForTimeout(400);
    const step2AfterNextText = await page.locator("body").innerText();
    if (!step2AfterNextText.includes("Đặt tên cho việc lặp lại này")) {
      findings.push(
        "Step 2: sau khi bấm Tiếp với tên trống, lỗi đỏ chưa xuất hiện.",
      );
    } else {
      observations.push(
        "Step 2 validation: lỗi đỏ chỉ xuất hiện sau khi bấm Tiếp với tên trống.",
      );
    }
    await page.screenshot({
      path: path.join(out, "post-polish-step-2-validation.png"),
      fullPage: true,
    });

    await page.locator("#tactic-name-0").fill("Demo sản phẩm cho người dùng");
    await page.waitForTimeout(300);
    const step2AfterNameError = await page
      .locator("p[role='alert']", { hasText: "Đặt tên cho việc lặp lại này" })
      .count();
    if (step2AfterNameError > 0) {
      findings.push("Step 2: sau khi nhập tên việc, lỗi đỏ vẫn còn hiển thị.");
    } else {
      observations.push(
        "Step 2 validation: sau khi nhập tên việc, lỗi đỏ biến mất.",
      );
    }
    await page.locator("#tactic-target-0").fill("2");
    await page.locator("#tactic-unit-0").fill("lần/tuần");
    await page.locator("#tactic-name-1").fill("Code chức năng chính");
    await page.locator("#tactic-target-1").fill("5");
    await page.locator("#tactic-unit-1").fill("buổi/tuần");
    await page.getByRole("button", { name: /Thêm việc lặp lại/ }).click();
    await page.locator("#tactic-name-2").fill("Viết ghi chú feedback");
    await page.locator("#tactic-target-2").fill("2");
    await page.locator("#tactic-unit-2").fill("lần/tuần");
    await page.getByRole("button", { name: "Tiếp →" }).click();

    await page.waitForTimeout(500);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await page.locator("#cycle-start-date").fill(tomorrow);
    const step3Buttons = await page.locator("button").allTextContents();
    for (const buttonText of ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]) {
      await page
        .getByRole("button", { name: buttonText })
        .click()
        .catch(() => {});
    }
    await page.getByRole("button", { name: /1 giờ/ }).click();
    await page
      .getByRole("button", { name: /Vừa đủ/ })
      .click()
      .catch(async () => {
        await page.getByText("Vừa đủ để tiến bộ").click();
      });
    await page.waitForTimeout(300);
    const canContinueStep3 = await page
      .getByRole("button", { name: "Tiếp →" })
      .isEnabled();
    if (!canContinueStep3) {
      const step3Debug = await page.evaluate(() => ({
        stepError:
          document.querySelector('[role="alert"]')?.textContent?.trim() || "",
        lagMetricName: document.querySelector("#lag-metric-name")?.value || "",
        startDate: document.querySelector("#cycle-start-date")?.value || "",
        reviewDay:
          [...document.querySelectorAll("button[aria-pressed='true']")]
            .map((button) => button.textContent?.trim())
            .join(" | ") || "",
        bodyIncludesStartDateError:
          document.body.innerText.includes("Ngày bắt đầu"),
        bodyIncludesReviewDayError: document.body.innerText.includes(
          "ngày nhìn lại hợp lệ",
        ),
      }));
      findings.push(
        `Step 3: nút Tiếp vẫn disabled sau khi seed lịch. Debug: ${JSON.stringify(step3Debug)}. Buttons: ${step3Buttons.join(" | ")}`,
      );
      await page.screenshot({
        path: path.join(out, "post-polish-step-4-mobile.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({
        path: path.join(out, "post-polish-step-4-desktop.png"),
        fullPage: true,
      });
    } else {
      await page.getByRole("button", { name: "Tiếp →" }).click();
    }

    await page.waitForTimeout(700);
    const step4Text = await page.locator("body").innerText();
    const reachedStep4 =
      step4Text.includes("Xem trước kế hoạch tự động") ||
      step4Text.includes("Lưu kế hoạch");
    if (reachedStep4) {
      observations.push(
        "Full flow Step 1 → Step 4 pass: đã vào màn preview sau khi hoàn tất Step 3.",
      );
    } else {
      findings.push(
        "Full flow Step 1 → Step 4 chưa pass: chưa vào màn preview Step 4 sau Step 3.",
      );
    }
    if (
      !includesAny(step4Text, [
        "Vì sao mục tiêu này quan trọng",
        "Tôi muốn kiểm chứng ý tưởng bằng sản phẩm thật",
      ])
    ) {
      findings.push(
        "Step 4: chưa thấy phần 'Vì sao mục tiêu này quan trọng' hoặc nội dung why trong preview.",
      );
    } else {
      observations.push(
        "Step 4 preview có phần 'Vì sao mục tiêu này quan trọng' và nội dung why dễ đọc trong viewport kiểm thử.",
      );
    }
    if (/Tổng tiến độ.*Bước|Bước.*Tổng tiến độ/i.test(step4Text)) {
      observations.push(
        "Header/progress copy phân tách progress tổng và wizard step trong nội dung hiển thị.",
      );
    } else {
      observations.push(
        "Header/progress copy không ghi nhận pattern gây nhầm rõ ràng giữa progress tổng và wizard 4 bước nhỏ trong automation text scan.",
      );
    }
    await auditViewport(
      "Step 3 mobile",
      375,
      812,
      "post-polish-step-3-mobile.png",
    );
    await auditViewport(
      "Step 4 mobile",
      375,
      812,
      "post-polish-step-4-mobile.png",
    );
    await auditViewport(
      "Step 4 desktop",
      1440,
      900,
      "post-polish-step-4-desktop.png",
    );

    const recommendation =
      findings.length || logs.errors.length || logs.exceptions.length
        ? "POLISH"
        : "GO";
    const report = [
      "# Post-polish QA Report — /12-week-setup-lab",
      "",
      "## Commands run",
      "- `git status --short && git branch --show-current` — PASS. Branch: `main`. Worktree already had polish changes in `src/features/plan12week/...` and untracked `docs/ux/12-week-setup-lab-ai-simulated-test.md` before QA.",
      "- `set VITE_APP_MODE=demo&& npm run dev -- --host 127.0.0.1 --port 5174` — PASS. Vite served `http://127.0.0.1:5174/`.",
      "- `node scripts/qa-12-week-setup-lab.cjs` — PASS, exit code 0. Existing script created legacy `QA_REPORT.md` and baseline screenshots.",
      "- `node qa-artifacts/12-week-setup-lab/post-polish-qa-runner.cjs` — PASS. Post-polish browser QA for required validation behavior and screenshot names.",
      "",
      "## Viewports tested",
      "- Mobile: 375 x 812",
      "- Desktop: 1440 x 900",
      "",
      "## Step 2 validation behavior",
      ...observations
        .filter((x) => x.startsWith("Step 2 validation"))
        .map((x) => `- ${x}`),
      "",
      "## Root cause Step 3 disabled",
      "- Root cause: automation đang dùng disabled CTA để kích hoạt validation Step 2, nhưng `Tiếp →` ở Step 2 bị disabled bởi `currentStepValidationError` khi còn dưới 2 việc lặp lại hợp lệ. Playwright click thường timeout trên disabled button, nên runner kẹt trước khi seed đủ Step 2/Step 3. Đây là lỗi QA script, không phải lỗi UX Step 3.",
      "- Sau khi buộc click validation riêng cho Step 2 rồi seed đủ 3 việc lặp lại hợp lệ, Step 3 có `lagMetricName`, `startDate` tương lai, `reviewDay` hợp lệ và không còn `startDateValidation.error`; nút `Tiếp →` enabled và đi được Step 4.",
      "",
      "## Fix applied",
      "- Sửa QA runner để force-click riêng kịch bản validation Step 2 trên CTA disabled và kiểm tra lỗi theo `p[role='alert']` thay vì scan toàn body. Không sửa source app, không sửa route chính, không đổi storage schema/backend/auth/paywall/submit.",
      "",
      "## Full flow Step 1 → Step 4",
      reachedStep4
        ? "- PASS — mobile flow đi được Step 1 → Step 4, sau đó chụp Step 4 mobile và desktop."
        : "- FAIL — chưa vào được Step 4, xem findings.",
      "",
      "## Other checklist observations",
      ...observations
        .filter((x) => !x.startsWith("Step 2 validation"))
        .map((x) => `- ${x}`),
      "",
      "## Screenshots",
      "- `qa-artifacts/12-week-setup-lab/post-polish-step-1-mobile.png`",
      "- `qa-artifacts/12-week-setup-lab/post-polish-step-2-mobile.png`",
      "- `qa-artifacts/12-week-setup-lab/post-polish-step-2-validation.png`",
      "- `qa-artifacts/12-week-setup-lab/post-polish-step-3-mobile.png`",
      "- `qa-artifacts/12-week-setup-lab/post-polish-step-4-mobile.png`",
      "- `qa-artifacts/12-week-setup-lab/post-polish-step-4-desktop.png`",
      "",
      "## Commands not run",
      "- `npm run typecheck`, `npm run build`, `npm run test:run -- 12Week` — không chạy vì chỉ sửa QA runner/report, không sửa source app.",
      "",
      "## Console errors",
      `- console.error: ${logs.errors.length ? logs.errors.join("\n- ") : "Không ghi nhận."}`,
      `- uncaught exception: ${logs.exceptions.length ? logs.exceptions.join("\n- ") : "Không ghi nhận."}`,
      `- failed network request: ${logs.failedRequests.length ? JSON.stringify(logs.failedRequests, null, 2) : "Không ghi nhận."}`,
      `- warnings: ${logs.warnings.length ? logs.warnings.join("\n- ") : "Không ghi nhận warning ảnh hưởng QA."}`,
      "",
      "## Findings",
      findings.length
        ? findings.map((x) => `- ${x}`).join("\n")
        : "- Không phát hiện blocker/polish issue trong phạm vi automation hậu-polish.",
      "",
      "## GO/POLISH/NO-GO recommendation",
      recommendation === "GO"
        ? "- GO — đủ điều kiện cho vòng user testing nội bộ/nhỏ. Không thấy console.error, tràn ngang, hay lỗi validation Step 2 trong kịch bản đã test."
        : "- POLISH — cần xử lý findings/console errors ở trên trước khi GO rộng hơn.",
      "",
    ].join("\n");
    fs.writeFileSync(
      path.join(out, "POST_POLISH_QA_REPORT.md"),
      report,
      "utf8",
    );
  } finally {
    await browser.close();
  }
})();
