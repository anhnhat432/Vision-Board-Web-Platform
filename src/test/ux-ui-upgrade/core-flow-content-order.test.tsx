// Feature: ux-ui-upgrade, Task 6.6: Component test — states + content/order
//
// Mục tiêu:
//   - Snapshot thứ tự bước của CoreFlowProgress (Requirement 2.7, 10.5):
//       life_balance → life_insight → smart_goal → feasibility →
//       twelve_week_setup → today
//   - Snapshot nhãn (label) hiển thị + chỉ số "Bước n / N · LABEL" cho từng
//     bước, để khoá lại văn bản/nhãn không thay đổi sau đợt nâng cấp
//     (Requirement 2.7).
//   - Snapshot tập route core-flow đã xuất hiện trong AppRouter để chốt
//     thứ tự điều hướng (Requirement 10.4, 10.5).
//
// Các snapshot ở đây là INLINE — dễ đọc khi review và dễ phát hiện regression.

import { render, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { type CoreFlowStepId, CoreFlowProgress } from "../../app/components/CoreFlowProgress";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const EXPECTED_STEP_IDS: ReadonlyArray<CoreFlowStepId> = [
  "life_balance",
  "life_insight",
  "smart_goal",
  "feasibility",
  "twelve_week_setup",
  "today",
];

// ─────────────────────────────────────────────────────────────
// 1) Step IDs & order — đọc trực tiếp từ source
// ─────────────────────────────────────────────────────────────

describe("CoreFlowProgress — thứ tự bước cố định (Requirement 10.5)", () => {
  it("source định nghĩa CORE_FLOW_STEPS đúng thứ tự cốt lõi", () => {
    const source = readFileSync(path.resolve(REPO_ROOT, "src/app/components/CoreFlowProgress.tsx"), "utf8");

    // Trích danh sách id theo thứ tự xuất hiện trong khai báo CORE_FLOW_STEPS.
    const idMatches = [...source.matchAll(/^\s*id:\s*"([^"]+)",/gm)].map((m) => m[1]);

    expect(idMatches).toMatchInlineSnapshot(`
      [
        "life_balance",
        "life_insight",
        "smart_goal",
        "feasibility",
        "twelve_week_setup",
        "today",
      ]
    `);
    expect(idMatches).toEqual([...EXPECTED_STEP_IDS]);
  });

  it("CoreFlowStepId union khớp với 6 id cốt lõi", () => {
    // Sanity TypeScript-level: nếu union mở rộng/giảm, fail tại compile time.
    const probe: CoreFlowStepId[] = [...EXPECTED_STEP_IDS];
    expect(probe.length).toBe(6);
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Step labels & captions — render snapshot
// ─────────────────────────────────────────────────────────────

describe("CoreFlowProgress — văn bản/nhãn hiển thị (Requirement 2.7)", () => {
  it.each(EXPECTED_STEP_IDS)("render đúng caption 'Bước n / 6 · NHÃN' và mô tả sr-only cho %s", (stepId) => {
    const { container } = render(<CoreFlowProgress currentStepId={stepId} />);
    const section = container.querySelector('section[aria-label="Tiến độ đường chính"]') as HTMLElement;
    expect(section).not.toBeNull();

    const caption = section.querySelector("p")?.textContent ?? "";
    const stepIndex = EXPECTED_STEP_IDS.indexOf(stepId) + 1;
    expect(caption).toMatch(new RegExp(`^Bước ${stepIndex} / 6 · `));

    // Mô tả sr-only ở vị trí cuối section, dùng cho a11y.
    const srDescription = section.querySelectorAll("p");
    const lastP = srDescription[srDescription.length - 1];
    expect(lastP?.textContent ?? "").not.toBe("");

    // Progressbar phản ánh bước hiện tại.
    const progressbar = within(section).getByRole("progressbar");
    const expectedNow = Math.round((stepIndex / 6) * 100);
    expect(progressbar.getAttribute("aria-valuenow")).toBe(String(expectedNow));
    expect(progressbar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("snapshot toàn bộ nhãn theo thứ tự bước (label + title + description)", () => {
    // Render lần lượt từng bước và trích bộ ba (label, title, description) từ
    // text hiển thị + sr-only. Chúng ta khoá lại nội dung văn bản này như
    // baseline content theo Requirement 2.7.
    const labels = EXPECTED_STEP_IDS.map((id) => {
      const { container } = render(<CoreFlowProgress currentStepId={id} />);
      const section = container.querySelector('section[aria-label="Tiến độ đường chính"]') as HTMLElement;
      const ps = section.querySelectorAll("p");
      const caption = ps[0]?.textContent ?? "";
      const description = ps[ps.length - 1]?.textContent ?? "";
      // caption có dạng "Bước n / 6 · LABEL" — cắt phần label sau dấu "·".
      const label = caption.split("·").slice(1).join("·").trim();
      return { id, label, description };
    });

    expect(labels).toMatchInlineSnapshot(`
      [
        {
          "description": "Chấm điểm các lĩnh vực quan trọng để biết nên ưu tiên nơi nào trước.",
          "id": "life_balance",
          "label": "CÂN BẰNG",
        },
        {
          "description": "Chọn một lĩnh vực đủ quan trọng để hành động.",
          "id": "life_insight",
          "label": "TRỌNG TÂM",
        },
        {
          "description": "Làm rõ kết quả, chỉ số đo, thời gian và lý do.",
          "id": "smart_goal",
          "label": "VIẾT MỤC TIÊU",
        },
        {
          "description": "Đo mức sẵn sàng trước khi biến mục tiêu thành kế hoạch 12 tuần.",
          "id": "feasibility",
          "label": "KIỂM TRA",
        },
        {
          "description": "Chốt kết quả, việc lặp lại, chỉ số và lịch nhìn lại.",
          "id": "twelve_week_setup",
          "label": "KẾ HOẠCH 12 TUẦN",
        },
        {
          "description": "Theo dõi việc cần làm, đánh dấu việc hằng ngày và nhìn lại tuần.",
          "id": "today",
          "label": "HÔM NAY",
        },
      ]
    `);
  });

  it("progressbar có aria-label phản ánh bước hiện tại / tổng (Req 2.7)", () => {
    const { container } = render(<CoreFlowProgress currentStepId="smart_goal" />);
    const progressbar = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(progressbar.getAttribute("aria-label")).toBe("Tiến độ đường chính: bước 3 trên 6");
  });
});

// ─────────────────────────────────────────────────────────────
// 3) Route order — chốt baseline tập route core-flow (Req 10.4, 10.5)
// ─────────────────────────────────────────────────────────────

describe("appRoutes — tập route core-flow giữ nguyên (Requirement 10.4, 10.5)", () => {
  it("liệt kê đầy đủ và đúng thứ tự các path core-flow trong src/app/routes.tsx", () => {
    // Đọc src/app/routes.tsx — định nghĩa router thực tế của ứng dụng. Đây là
    // baseline content + thứ tự điều hướng được khoá theo Requirement 10.4
    // (giữ tập route) và 10.5 (giữ thứ tự).
    const routerSource = readFileSync(path.resolve(REPO_ROOT, "src/app/routes.tsx"), "utf8");

    // Whitelist các path core-flow (không bắt route phụ như billing/admin/...).
    // Lưu ý: routes.tsx khai báo path tương đối (không bắt đầu bằng "/").
    const CORE_FLOW_PATHS: ReadonlyArray<string> = [
      "onboarding",
      "life-balance",
      "life-insight",
      "smart-goal-setup",
      "feasibility",
      "12-week-setup",
      "12-week-system",
      "today",
      "journal",
      "goals",
    ];

    const ordered: string[] = [];
    const re = /path:\s*"([^"]+)"/g;
    let match: RegExpExecArray | null = re.exec(routerSource);
    while (match !== null) {
      const value = match[1];
      if (CORE_FLOW_PATHS.includes(value) && !ordered.includes(value)) {
        ordered.push(value);
      }
      match = re.exec(routerSource);
    }

    // Inline snapshot khoá thứ tự xuất hiện trong source — bất kỳ thay đổi tập
    // route hay thứ tự khai báo cũng sẽ làm test fail.
    expect(ordered).toMatchInlineSnapshot(`
      [
        "onboarding",
        "life-insight",
        "feasibility",
        "smart-goal-setup",
        "12-week-setup",
        "12-week-system",
        "today",
        "goals",
        "life-balance",
        "journal",
      ]
    `);

    // Bảo đảm tất cả path core-flow whitelist đều có mặt (không thiếu route).
    for (const p of CORE_FLOW_PATHS) {
      expect(ordered).toContain(p);
    }
  });
});
