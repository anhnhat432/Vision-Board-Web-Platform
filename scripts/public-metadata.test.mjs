import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(path.resolve("index.html"), "utf8");
const sitemap = readFileSync(path.resolve("public", "sitemap.xml"), "utf8");
const robots = readFileSync(path.resolve("public", "robots.txt"), "utf8");
const serviceWorker = readFileSync(path.resolve("public", "sw.js"), "utf8");
const siteOrigin = "https://dearourfuture.io.vn";
const siteUrl = `${siteOrigin}/`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTag(tagName, attrName, attrValue) {
  const pattern = new RegExp(`<${tagName}(?=[^>]*\\b${attrName}="${escapeRegExp(attrValue)}")[^>]*>`, "i");
  return html.match(pattern)?.[0] ?? "";
}

function getAttribute(tag, attrName) {
  return tag.match(new RegExp(`\\b${attrName}="([^"]*)"`))?.[1] ?? "";
}

function getMetaContent(attrName, attrValue) {
  return getAttribute(getTag("meta", attrName, attrValue), "content");
}

describe("public landing metadata", () => {
  it("keeps canonical, Open Graph, and Twitter sharing metadata aligned", () => {
    const canonical = getAttribute(getTag("link", "rel", "canonical"), "href");
    const ogImage = getMetaContent("property", "og:image");
    const ogImageAlt = getMetaContent("property", "og:image:alt");

    expect(canonical).toBe(siteUrl);
    expect(getMetaContent("name", "description")).toContain("12 tuần");
    expect(getMetaContent("property", "og:site_name")).toBe("Dear Our Future");
    expect(getMetaContent("property", "og:type")).toBe("website");
    expect(getMetaContent("property", "og:url")).toBe(siteUrl);
    expect(getMetaContent("property", "og:title")).toBe("Dear Our Future");
    expect(getMetaContent("property", "og:description")).toContain("12 tuần");
    expect(ogImage).toBe(`${siteOrigin}/study_desk_hero.webp`);
    expect(ogImageAlt).toBe("Dear Our Future - không gian lập kế hoạch 12 tuần");
    expect(getMetaContent("name", "twitter:card")).toBe("summary_large_image");
    expect(getMetaContent("name", "twitter:title")).toBe("Dear Our Future");
    expect(getMetaContent("name", "twitter:description")).toContain("12 tuần");
    expect(getMetaContent("name", "twitter:image")).toBe(ogImage);
    expect(getMetaContent("name", "twitter:image:alt")).toBe(ogImageAlt);
    expect(existsSync(path.resolve("public", `.${new URL(ogImage).pathname}`))).toBe(true);
  });

  it("keeps the public share image lightweight for social crawlers", () => {
    const ogImage = getMetaContent("property", "og:image");
    const imagePath = path.resolve("public", `.${new URL(ogImage).pathname}`);

    expect(statSync(imagePath).size).toBeLessThan(200 * 1024);
  });

  it("declares the local share image dimensions", () => {
    expect(getMetaContent("property", "og:image:width")).toBe("1024");
    expect(getMetaContent("property", "og:image:height")).toBe("1024");
  });

  it("lists public support and help pages in the sitemap", () => {
    expect(sitemap).toContain(`${siteOrigin}/contact`);
    expect(sitemap).toContain(`${siteOrigin}/help`);
  });

  it("lists the public billing plan page in the sitemap", () => {
    expect(sitemap).toContain(`${siteOrigin}/billing/plan`);
  });

  it("keeps private and transactional routes out of public crawlers", () => {
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /billing/checkout");
    expect(robots).toContain("Disallow: /billing/confirm");
    expect(robots).toContain("Disallow: /order");
    expect(robots).toContain("Disallow: /order-status");
    expect(robots).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`);
  });

  it("caches optimized web image formats in the service worker asset policy", () => {
    expect(serviceWorker).toContain("webp");
    expect(serviceWorker).toContain("avif");
  });

  it("does not preconnect auth provider APIs on the public HTML shell", () => {
    expect(html).not.toContain("apis.google.com");
    expect(html).not.toContain("identitytoolkit.googleapis.com");
    expect(html).not.toContain("securetoken.googleapis.com");
    expect(html).not.toContain("firestore.googleapis.com");
  });

  it("uses stale-while-revalidate for unhashed public image and font assets", () => {
    expect(serviceWorker).toContain("Images and fonts: stale-while-revalidate");
  });
});
