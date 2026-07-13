import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Brand preservation guard (dev-time/CI) — Requirement 7.
 *
 * Feature: core-flow-ui-upgrade
 *
 * Nhiệm vụ của guard này là ĐÓNG BĂNG Brand_Identity trong suốt quá trình nâng
 * cấp UI. Nó KHÔNG sửa asset hay tên thương hiệu — nó chỉ so khớp:
 *   1. Chuỗi tên thương hiệu ("Dear Our Future") tại các bề mặt brand chính
 *      (title index.html, manifest name/short_name, aria-label logo).
 *   2. Hash chuẩn hóa (sha256) của các tệp logo/favicon so với baseline đã ghi.
 *
 * Nếu BẤT KỲ khác biệt nào xuất hiện (diff hoặc chưa được phê duyệt), test FAIL
 * với thông báo chỉ rõ thay đổi brand cần chủ sản phẩm phê duyệt trước khi áp
 * dụng (Req 7.3, 7.4). Muốn thay đổi brand có chủ đích: cập nhật asset/tên rồi
 * cập nhật baseline dưới đây kèm phê duyệt của chủ sản phẩm.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */

// Project root: file ở src/app/, root cách 2 cấp lên.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Chuỗi tên thương hiệu chuẩn — baseline ngay trước khi nâng cấp UI. */
const EXPECTED_BRAND_NAME = "Dear Our Future";

/**
 * Baseline hash (sha256, hex) của các tệp thuộc Brand_Identity ngay trước khi
 * nâng cấp UI. Asset văn bản được chuẩn hóa CRLF về LF để guard ổn định giữa
 * Windows và CI; asset nhị phân vẫn được kiểm tra theo byte tuyệt đối.
 * Chỉ được cập nhật khi thay đổi brand đã được phê duyệt.
 */
const BRAND_ASSET_BASELINE: Readonly<Record<string, string>> = {
  "public/icon.svg": "4c3467960f618e63c2973a8e5903f5cf1953d07f72ab4e18a0c3a7a62d9ce2f3",
  "public/favicon-192.png": "0d54e1da4b8b519c62491deb522590cec76eee1a6da330ca17c264299bd9c26f",
  "public/favicon-512.png": "445c9c02944e9259e82de28aae16be7f2db0b10ccf831ed2f6f5b40fa3392068",
};

const APPROVAL_HINT =
  "Nếu đây là thay đổi brand có chủ đích, cần chủ sản phẩm phê duyệt và cập nhật baseline trong file test này. " +
  "Nếu không, hãy hoàn nguyên thay đổi để giữ nguyên Brand_Identity (Req 7.3, 7.4).";

function readText(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function sha256(relativePath: string): string {
  const content = readFileSync(path.join(projectRoot, relativePath));
  const canonicalContent = relativePath.endsWith(".svg")
    ? Buffer.from(content.toString("utf8").replace(/\r\n/g, "\n"), "utf8")
    : content;

  return createHash("sha256").update(canonicalContent).digest("hex");
}

describe("brand preservation guard (Requirement 7)", () => {
  it("giữ nguyên chuỗi tên thương hiệu tại title index.html (Req 7.1, 7.2)", () => {
    const html = readText("index.html");
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    const title = titleMatch?.[1]?.trim();

    expect(
      title,
      `Tên thương hiệu ở <title> index.html đã đổi (nhận: ${JSON.stringify(title)}). ${APPROVAL_HINT}`,
    ).toBe(EXPECTED_BRAND_NAME);
  });

  it("giữ nguyên chuỗi tên thương hiệu trong manifest (Req 7.1, 7.2)", () => {
    const manifest = JSON.parse(readText("public/manifest.json")) as {
      name?: string;
      short_name?: string;
    };

    expect(manifest.name, `manifest.name đã đổi (nhận: ${JSON.stringify(manifest.name)}). ${APPROVAL_HINT}`).toBe(
      EXPECTED_BRAND_NAME,
    );
    expect(
      manifest.short_name,
      `manifest.short_name đã đổi (nhận: ${JSON.stringify(manifest.short_name)}). ${APPROVAL_HINT}`,
    ).toBe(EXPECTED_BRAND_NAME);
  });

  it("giữ nguyên tên thương hiệu trong aria-label của logo icon.svg (Req 7.1, 7.2)", () => {
    const svg = readText("public/icon.svg");
    const labelMatch = svg.match(/aria-label="([^"]*)"/);
    const label = labelMatch?.[1]?.trim();

    expect(label, `aria-label logo icon.svg đã đổi (nhận: ${JSON.stringify(label)}). ${APPROVAL_HINT}`).toBe(
      EXPECTED_BRAND_NAME,
    );
  });

  it("giữ nguyên hash chuẩn hóa của từng tệp logo/favicon so với baseline (Req 7.1, 7.3, 7.4)", () => {
    for (const [assetPath, expectedHash] of Object.entries(BRAND_ASSET_BASELINE)) {
      const actualHash = sha256(assetPath);
      expect(
        actualHash,
        `Tệp logo "${assetPath}" khác baseline (sha256 mong đợi ${expectedHash}, nhận ${actualHash}). ` +
          `Thay đổi asset brand đang chờ phê duyệt và bị chặn áp dụng. ${APPROVAL_HINT}`,
      ).toBe(expectedHash);
    }
  });
});
