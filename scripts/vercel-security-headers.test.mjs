import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readVercelConfig() {
  return JSON.parse(readFileSync(path.resolve("vercel.json"), "utf8"));
}

function getHeaderValue(config, key, source = "/(.*)") {
  const headers = config.headers?.find((entry) => entry.source === source)?.headers ?? [];
  return headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value ?? "";
}

function getDirective(csp, directiveName) {
  return csp
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${directiveName} `));
}

describe("Vercel security headers", () => {
  it("keeps baseline browser security headers on every static route", () => {
    const config = readVercelConfig();

    expect(getHeaderValue(config, "X-Frame-Options")).toBe("DENY");
    expect(getHeaderValue(config, "X-Content-Type-Options")).toBe("nosniff");
    expect(getHeaderValue(config, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(getHeaderValue(config, "Permissions-Policy")).toBe("camera=(), microphone=(self), geolocation=()");
  });

  it("enforces HTTPS without preloading subdomain policy prematurely", () => {
    const hsts = getHeaderValue(readVercelConfig(), "Strict-Transport-Security");

    expect(hsts).toBe("max-age=31536000");
    expect(hsts).not.toContain("includeSubDomains");
    expect(hsts).not.toContain("preload");
  });

  it("allows Cloudflare Web Analytics without weakening script CSP", () => {
    const csp = getHeaderValue(readVercelConfig(), "Content-Security-Policy");
    const scriptSrc = getDirective(csp, "script-src");

    expect(scriptSrc).toContain("https://static.cloudflareinsights.com");
    expect(scriptSrc).not.toContain("*");
  });

  it("allows explicitly configured GA4 without broad wildcard CSP", () => {
    const csp = getHeaderValue(readVercelConfig(), "Content-Security-Policy");
    const scriptSrc = getDirective(csp, "script-src");
    const connectSrc = getDirective(csp, "connect-src");

    expect(scriptSrc).toContain("https://www.googletagmanager.com");
    expect(connectSrc).toContain("https://www.google-analytics.com");
    expect(scriptSrc).not.toContain("*");
    expect(connectSrc).not.toContain("https://*.google-analytics.com");
  });

  it("caches content-hashed Vite assets without caching the SPA shell", () => {
    const config = readVercelConfig();

    expect(getHeaderValue(config, "Cache-Control", "/assets/(.*)")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(getHeaderValue(config, "Cache-Control", "/sw.js")).toBe("no-cache, no-store, must-revalidate");
    expect(getHeaderValue(config, "Cache-Control")).toBe("");
  });
});
