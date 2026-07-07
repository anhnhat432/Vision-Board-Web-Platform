import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/check-runtime-env.mjs");
const publicSiteUrl = "https://dearourfuture.io.vn/";
const publicShareDescription =
  "Dear Our Future - Lập kế hoạch mục tiêu 12 tuần, theo dõi tiến độ và sống có chủ đích hơn mỗi ngày.";

function readIndexHtml() {
  return readFileSync(path.resolve("index.html"), "utf8");
}

function getMetaContent(html, attributeName, attributeValue) {
  const pattern = new RegExp(
    `<meta\\s+(?=[^>]*\\b${attributeName}="${attributeValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}")(?=[^>]*\\bcontent="([^"]+)")[^>]*>`,
    "i",
  );
  return html.match(pattern)?.[1] ?? null;
}

function getLinkHref(html, rel) {
  const pattern = new RegExp(
    `<link\\s+(?=[^>]*\\brel="${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}")(?=[^>]*\\bhref="([^"]+)")[^>]*>`,
    "i",
  );
  return html.match(pattern)?.[1] ?? null;
}

function getThemeColor(html, media) {
  const pattern = new RegExp(
    `<meta\\s+(?=[^>]*\\bname="theme-color")(?=[^>]*\\bmedia="${media.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}")(?=[^>]*\\bcontent="([^"]+)")[^>]*>`,
    "i",
  );
  return html.match(pattern)?.[1] ?? null;
}

function hasLinkRelHref(html, rel, href) {
  const pattern = new RegExp(
    `<link\\s+(?=[^>]*\\brel="${rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}")(?=[^>]*\\bhref="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}")`,
    "i",
  );
  return pattern.test(html);
}

function runEnvCheck({ files = {}, args = [] } = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "vision-board-env-check-"));

  for (const [fileName, content] of Object.entries(files)) {
    writeFileSync(path.join(cwd, fileName), content);
  }

  return spawnSync(process.execPath, [scriptPath, "--skip-health", ...args], {
    cwd,
    encoding: "utf8",
    env: { PATH: process.env.PATH },
  });
}

describe("check-runtime-env app mode boundary", () => {
  it("treats missing VITE_APP_MODE as real instead of silently downgrading to demo", () => {
    const result = runEnvCheck({ args: ["--mode", "production"] });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Resolved VITE_APP_MODE: real");
    expect(result.stdout).toContain("MISSING VITE_APP_MODE");
    expect(result.stdout).not.toContain("VITE_APP_MODE is demo");
  });

  it("fails full-stack checks when VITE_APP_MODE is malformed", () => {
    const result = runEnvCheck({
      files: {
        ".env.production": [
          "VITE_APP_MODE=staging",
          "VITE_API_BASE_URL=https://api.example.test",
          "VITE_FIREBASE_API_KEY=test",
          "VITE_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com",
          "VITE_FIREBASE_PROJECT_ID=test",
          "VITE_FIREBASE_APP_ID=test",
        ].join("\n"),
      },
      args: ["--mode", "production", "--full-stack"],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('VITE_APP_MODE is invalid ("staging")');
    expect(result.stdout).toContain("frontend:VITE_APP_MODE(invalid:staging)");
    expect(result.stdout).not.toContain("VITE_APP_MODE is demo");
  });
});

describe("vercel CSP analytics boundary", () => {
  it("allows configured GA4 script and collection endpoints", () => {
    const config = JSON.parse(readFileSync(path.resolve("vercel.json"), "utf8"));
    const cspHeader = config.headers
      ?.flatMap((entry) => entry.headers ?? [])
      ?.find((header) => header.key === "Content-Security-Policy")?.value;

    expect(cspHeader).toContain("script-src");
    expect(cspHeader).toContain("https://www.googletagmanager.com");
    expect(cspHeader).toContain("connect-src");
    expect(cspHeader).toContain("https://www.google-analytics.com");
    expect(cspHeader).toContain("https://region1.google-analytics.com");
  });

  it("keeps defensive CSP directives for document injection surfaces", () => {
    const config = JSON.parse(readFileSync(path.resolve("vercel.json"), "utf8"));
    const cspHeader = config.headers
      ?.flatMap((entry) => entry.headers ?? [])
      ?.find((header) => header.key === "Content-Security-Policy")?.value;

    expect(cspHeader).toContain("base-uri 'self'");
    expect(cspHeader).toContain("object-src 'none'");
    expect(cspHeader).toContain("form-action 'self'");
  });
});

describe("public sharing metadata boundary", () => {
  it("declares canonical, Open Graph, and Twitter metadata for the public landing page", () => {
    const html = readIndexHtml();

    expect(getLinkHref(html, "canonical")).toBe(publicSiteUrl);
    expect(getMetaContent(html, "property", "og:type")).toBe("website");
    expect(getMetaContent(html, "property", "og:site_name")).toBe("Dear Our Future");
    expect(getMetaContent(html, "property", "og:title")).toBe("Dear Our Future");
    expect(getMetaContent(html, "property", "og:description")).toBe(publicShareDescription);
    expect(getMetaContent(html, "property", "og:url")).toBe(publicSiteUrl);
    expect(getMetaContent(html, "property", "og:image")).toBe(`${publicSiteUrl}study_desk_hero.webp`);
    expect(getMetaContent(html, "property", "og:image:alt")).toBe(
      "Góc bàn học yên tĩnh đại diện cho hành trình lập kế hoạch 12 tuần của Dear Our Future.",
    );
    expect(getMetaContent(html, "name", "twitter:card")).toBe("summary_large_image");
    expect(getMetaContent(html, "name", "twitter:title")).toBe("Dear Our Future");
    expect(getMetaContent(html, "name", "twitter:description")).toBe(publicShareDescription);
    expect(getMetaContent(html, "name", "twitter:image")).toBe(`${publicSiteUrl}study_desk_hero.webp`);
    expect(getMetaContent(html, "name", "twitter:image:alt")).toBe(
      "Góc bàn học yên tĩnh đại diện cho hành trình lập kế hoạch 12 tuần của Dear Our Future.",
    );
  });

  it("keeps mobile browser chrome aligned with the product canvas instead of legacy purple", () => {
    const html = readIndexHtml();

    expect(getThemeColor(html, "(prefers-color-scheme: light)")).toBe("#FAF8F5");
    expect(getThemeColor(html, "(prefers-color-scheme: dark)")).toBe("#1C1A15");
  });

  it("does not eagerly preconnect public visitors to auth provider origins", () => {
    const html = readIndexHtml();
    const authOrigins = [
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
      "https://firestore.googleapis.com",
      "https://apis.google.com",
    ];

    for (const origin of authOrigins) {
      expect(hasLinkRelHref(html, "preconnect", origin)).toBe(false);
      expect(hasLinkRelHref(html, "dns-prefetch", origin)).toBe(true);
    }
  });
});
