/**
 * Unit test — Token resolution failure & runtime fallback (task 2.5).
 *
 * Bám sát phần "Error Handling → Token resolution failure (Requirement 1.6, 2.8)"
 * trong design.md:
 *
 *   1. Verification harness so token set MỚI với baseline. Nếu một `Token_Name`
 *      baseline bị thiếu / phân giải rỗng / sai kiểu → đợt nâng cấp bị coi là
 *      THẤT BẠI, báo lỗi liệt kê CHÍNH XÁC tên token bị ảnh hưởng, và KHÔNG ghi
 *      đè cấu hình token đang chạy trước đó (Requirement 1.6).
 *   2. Fallback runtime: nếu một phần tử tham chiếu token không phân giải được,
 *      chuỗi `var(--token, <fallback>)` vẫn cho phần tử một màu nền / màu chữ
 *      non-empty (Requirement 2.8).
 *
 * Đây là unit test thuần (KHÔNG phải property-based) nên không dùng `fast-check`.
 * Toàn bộ dữ liệu được dựng từ chuỗi CSS nội tuyến qua `parseTokens` để test
 * tất định, độc lập với trạng thái thực của `tokens.css`. Một check thực tế cuối
 * cùng dùng baseline snapshot + `tokens.css` hiện tại để xác nhận harness đúng
 * trên dữ liệu thật.
 *
 * _Requirements: 1.6, 2.8_
 */

import { describe, expect, it } from "vitest";
import { readBaselineSnapshot } from "./baseline";
import { loadTokenSet, parseTokens, resolveToken, type TokenSet } from "./token-parser";

// ─────────────────────────────────────────────────────────────
// Verification harness (mô hình hóa Error Handling — Requirement 1.6)
//
// Hàm THUẦN: nhận tập tên token baseline + token set ứng viên (sau nâng cấp),
// trả danh sách CHÍNH XÁC tên token vi phạm (thiếu / rỗng / sai kiểu). Không
// side effect, không ghi đè gì.
// ─────────────────────────────────────────────────────────────

interface HarnessResult {
  ok: boolean;
  /** Tên token vi phạm (thiếu / phân giải rỗng / sai kiểu), sort ổn định. */
  missingOrInvalid: string[];
}

function verifyTokenSet(baselineNames: readonly string[], candidate: TokenSet): HarnessResult {
  const failures: string[] = [];
  for (const name of baselineNames) {
    if (!candidate.has(name)) {
      failures.push(name); // bị thiếu / bị xóa
      continue;
    }
    const resolved = resolveToken(name, candidate);
    if (!resolved.isNonEmpty || !resolved.kindValid) {
      failures.push(name); // phân giải rỗng hoặc sai kiểu
    }
  }
  failures.sort();
  return { ok: failures.length === 0, missingOrInvalid: failures };
}

/**
 * Áp cấu hình token MỚI chỉ khi harness pass; nếu thất bại thì GIỮ NGUYÊN cấu
 * hình đang chạy (không ghi đè) và trả về danh sách token lỗi. Mô hình hóa đúng
 * Requirement 1.6: "không ghi đè cấu hình token đang hoạt động trước đó".
 */
function applyTokenSetIfValid(
  running: TokenSet,
  baselineNames: readonly string[],
  candidate: TokenSet,
): { applied: boolean; config: TokenSet; failures: string[] } {
  const result = verifyTokenSet(baselineNames, candidate);
  if (!result.ok) {
    return { applied: false, config: running, failures: result.missingOrInvalid };
  }
  return { applied: true, config: candidate, failures: [] };
}

// ─────────────────────────────────────────────────────────────
// CSS cố định mô phỏng cấu hình token "đang chạy" hợp lệ.
// ─────────────────────────────────────────────────────────────

const RUNNING_CSS = `
:root {
  --green-700: #2A5447;
  --terra-600: #D36A47;
  --neutral-050: #F7F5F0;
  --status-red: #C2453B;
  --app-accent: var(--green-700);
  --app-bg: var(--neutral-050);
  --app-ink: #1A1A1A;
  --app-status-error: var(--status-red);
  --app-radius-card: 14px;
  --app-shadow-md: 0 6px 16px rgba(26, 26, 26, 0.12);
  --btn-primary-bg: var(--app-accent);
  --card-bg: var(--app-bg);
  --card-radius: var(--app-radius-card);
}
`;

const BASELINE_NAMES = [
  "--app-accent",
  "--app-bg",
  "--app-ink",
  "--app-status-error",
  "--app-radius-card",
  "--app-shadow-md",
  "--btn-primary-bg",
  "--card-bg",
  "--card-radius",
] as const;

// ─────────────────────────────────────────────────────────────
// Phần 1 — Harness báo lỗi đúng tên token & không ghi đè cấu hình
// ─────────────────────────────────────────────────────────────

describe("Token resolution failure — verification harness (Req 1.6)", () => {
  it("cấu hình hợp lệ: harness pass, không có token vi phạm", () => {
    const running = parseTokens(RUNNING_CSS);
    const result = verifyTokenSet(BASELINE_NAMES, running);
    expect(result.ok).toBe(true);
    expect(result.missingOrInvalid).toEqual([]);
  });

  it("token baseline bị THIẾU → harness liệt kê đúng tên token bị ảnh hưởng", () => {
    // Bỏ khai báo --btn-primary-bg và --card-radius khỏi candidate.
    const brokenCss = `
      :root {
        --green-700: #2A5447;
        --terra-600: #D36A47;
        --neutral-050: #F7F5F0;
        --status-red: #C2453B;
        --app-accent: var(--green-700);
        --app-bg: var(--neutral-050);
        --app-ink: #1A1A1A;
        --app-status-error: var(--status-red);
        --app-radius-card: 14px;
        --app-shadow-md: 0 6px 16px rgba(26, 26, 26, 0.12);
        --card-bg: var(--app-bg);
      }
    `;
    const candidate = parseTokens(brokenCss);
    const result = verifyTokenSet(BASELINE_NAMES, candidate);

    expect(result.ok).toBe(false);
    // Liệt kê CHÍNH XÁC tên token thiếu, không thừa không thiếu.
    expect(result.missingOrInvalid).toEqual(["--btn-primary-bg", "--card-radius"]);
  });

  it("token baseline phân giải RỖNG (tham chiếu treo, không fallback) → bị gắn cờ theo tên", () => {
    const brokenCss = `
      :root {
        --green-700: #2A5447;
        --neutral-050: #F7F5F0;
        --status-red: #C2453B;
        --app-bg: var(--neutral-050);
        --app-ink: #1A1A1A;
        --app-status-error: var(--status-red);
        --app-radius-card: 14px;
        --app-shadow-md: 0 6px 16px rgba(26, 26, 26, 0.12);
        --card-bg: var(--app-bg);
        --card-radius: var(--app-radius-card);
        /* --app-accent trỏ tới primitive KHÔNG tồn tại, không fallback → rỗng */
        --app-accent: var(--khong-ton-tai);
        --btn-primary-bg: var(--app-accent);
      }
    `;
    const candidate = parseTokens(brokenCss);
    const result = verifyTokenSet(BASELINE_NAMES, candidate);

    expect(result.ok).toBe(false);
    // --app-accent rỗng, và --btn-primary-bg (consumer) cũng rỗng theo.
    expect(result.missingOrInvalid).toContain("--app-accent");
    expect(result.missingOrInvalid).toContain("--btn-primary-bg");
    // resolve trực tiếp xác nhận lý do: rỗng.
    expect(resolveToken("--app-accent", candidate).isNonEmpty).toBe(false);
  });

  it("token baseline phân giải SAI KIỂU → bị gắn cờ theo tên", () => {
    // --app-shadow-md (kind=shadow theo vai trò tên) trỏ tới một literal màu.
    const brokenCss = `
      :root {
        --green-700: #2A5447;
        --neutral-050: #F7F5F0;
        --status-red: #C2453B;
        --app-accent: var(--green-700);
        --app-bg: var(--neutral-050);
        --app-ink: #1A1A1A;
        --app-status-error: var(--status-red);
        --app-radius-card: 14px;
        --app-shadow-md: var(--green-700);
        --btn-primary-bg: var(--app-accent);
        --card-bg: var(--app-bg);
        --card-radius: var(--app-radius-card);
      }
    `;
    const candidate = parseTokens(brokenCss);
    const result = verifyTokenSet(BASELINE_NAMES, candidate);

    expect(result.ok).toBe(false);
    expect(result.missingOrInvalid).toContain("--app-shadow-md");
    const resolved = resolveToken("--app-shadow-md", candidate);
    expect(resolved.isNonEmpty).toBe(true); // có giá trị...
    expect(resolved.kindValid).toBe(false); // ...nhưng sai kiểu (color ≠ shadow)
  });

  it("harness THẤT BẠI → KHÔNG ghi đè cấu hình token đang chạy", () => {
    const running = parseTokens(RUNNING_CSS);
    const runningSnapshotBefore = new Map(running);

    // Candidate hỏng: thiếu --app-accent (và do đó --btn-primary-bg rỗng theo).
    const candidate = parseTokens(`
      :root {
        --neutral-050: #F7F5F0;
        --status-red: #C2453B;
        --app-bg: var(--neutral-050);
        --app-ink: #1A1A1A;
        --app-status-error: var(--status-red);
        --app-radius-card: 14px;
        --app-shadow-md: 0 6px 16px rgba(26, 26, 26, 0.12);
        --card-bg: var(--app-bg);
        --card-radius: var(--app-radius-card);
      }
    `);

    const outcome = applyTokenSetIfValid(running, BASELINE_NAMES, candidate);

    expect(outcome.applied).toBe(false);
    expect(outcome.failures.length).toBeGreaterThan(0);
    expect(outcome.failures).toContain("--app-accent");
    // Cấu hình trả về vẫn LÀ cấu hình đang chạy (không bị thay bằng candidate hỏng).
    expect(outcome.config).toBe(running);
    // Và nội dung cấu hình đang chạy không hề bị thay đổi.
    expect(outcome.config.size).toBe(runningSnapshotBefore.size);
    for (const [name, def] of runningSnapshotBefore) {
      expect(outcome.config.get(name)).toEqual(def);
    }
    // --app-accent trong cấu hình đang chạy vẫn phân giải đúng như trước.
    expect(resolveToken("--app-accent", outcome.config).resolvedValue).toBe("#2A5447");
  });

  it("harness PASS → áp cấu hình mới hợp lệ", () => {
    const running = parseTokens(RUNNING_CSS);
    // Candidate hợp lệ: đổi GIÁ TRỊ nhưng giữ đủ tên (đúng tinh thần "đổi value, giữ tên").
    const candidate = parseTokens(RUNNING_CSS.replace("#2A5447", "#1F4A3D"));
    const outcome = applyTokenSetIfValid(running, BASELINE_NAMES, candidate);

    expect(outcome.applied).toBe(true);
    expect(outcome.failures).toEqual([]);
    expect(outcome.config).toBe(candidate);
    expect(resolveToken("--app-accent", outcome.config).resolvedValue).toBe("#1F4A3D");
  });

  it("trên dữ liệu thật: baseline snapshot + tokens.css hiện tại → harness pass (sanity)", () => {
    const baselineNames = [...readBaselineSnapshot().tokenNames];
    const light = loadTokenSet({ mode: "light" });
    const dark = loadTokenSet({ mode: "dark" });
    expect(verifyTokenSet(baselineNames, light).missingOrInvalid).toEqual([]);
    expect(verifyTokenSet(baselineNames, dark).missingOrInvalid).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// Phần 2 — Fallback runtime giữ phần tử có màu nền / màu chữ (Req 2.8)
// ─────────────────────────────────────────────────────────────

describe("Runtime fallback var(--token, <fallback>) (Req 2.8)", () => {
  it("token nền không phân giải → fallback giữ màu nền non-empty", () => {
    const set = parseTokens(":root { --card-bg: var(--khong-co-bg, #FFFFFF); }");
    const bg = resolveToken("--card-bg", set);
    expect(bg.resolvedValue).toBe("#FFFFFF");
    expect(bg.isNonEmpty).toBe(true);
  });

  it("token chữ không phân giải → fallback giữ màu chữ non-empty", () => {
    const set = parseTokens(":root { --card-ink: var(--khong-co-ink, #111111); }");
    const ink = resolveToken("--card-ink", set);
    expect(ink.resolvedValue).toBe("#111111");
    expect(ink.isNonEmpty).toBe(true);
  });

  it("fallback áp dụng qua nhiều tầng var() lồng nhau", () => {
    // --card-bg → --app-bg → var(--missing, fallback)
    const set = parseTokens(`
      :root {
        --app-bg: var(--missing-primitive, #FAFAFA);
        --card-bg: var(--app-bg);
      }
    `);
    const bg = resolveToken("--card-bg", set);
    expect(bg.resolvedValue).toBe("#FAFAFA");
    expect(bg.isNonEmpty).toBe(true);
  });

  it("không có fallback → phân giải rỗng (chứng minh fallback là yếu tố giữ màu)", () => {
    const set = parseTokens(":root { --card-bg: var(--khong-co-bg); }");
    const bg = resolveToken("--card-bg", set);
    expect(bg.isNonEmpty).toBe(false);
    expect(bg.resolvedValue).toBe("");
  });

  it("fallback chỉ kích hoạt khi token chính treo; token có giá trị vẫn được ưu tiên", () => {
    const set = parseTokens(`
      :root {
        --app-accent: #2A5447;
        --btn-primary-bg: var(--app-accent, #000000);
      }
    `);
    const btn = resolveToken("--btn-primary-bg", set);
    expect(btn.resolvedValue).toBe("#2A5447"); // dùng giá trị thật, KHÔNG dùng fallback
    expect(btn.isNonEmpty).toBe(true);
  });
});
