import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_ROOT } from "./token-scan";

const PUBLIC_LEGAL_SURFACES = [
  "src/app/pages/TermsPage.tsx",
  "src/app/pages/PrivacyPage.tsx",
  "src/app/pages/HelpCenterPage.tsx",
  "src/app/pages/BillingFAQPage.tsx",
  "src/app/pages/RefundPolicyPage.tsx",
] as const;

const BANNED_DEMO_COPY = [
  "bản dùng thử",
  "trên trình duyệt này",
  "không thu tiền thật",
  "không cần đăng nhập",
  "dùng thử",
  "mock",
  "demo",
] as const;

function findDemoOnlyCopy(source: string) {
  const lowerSource = source.toLocaleLowerCase("vi-VN");
  return BANNED_DEMO_COPY.filter((phrase) => lowerSource.includes(phrase));
}

describe("public/legal real-mode copy boundary", () => {
  it("keeps public/legal source free of demo-only wording", () => {
    const violations: Array<{ relativePath: string; hits: string[] }> = [];

    for (const relativePath of PUBLIC_LEGAL_SURFACES) {
      const filePath = path.join(DEFAULT_REPO_ROOT, relativePath);
      expect(existsSync(filePath), `${relativePath} must exist`).toBe(true);

      const source = readFileSync(filePath, "utf8");
      const hits = findDemoOnlyCopy(source);
      if (hits.length > 0) {
        violations.push({ relativePath, hits });
      }
    }

    expect(
      violations,
      `Public/legal pages contain demo-only copy: ${JSON.stringify(violations)}`,
    ).toEqual([]);
  });
});
