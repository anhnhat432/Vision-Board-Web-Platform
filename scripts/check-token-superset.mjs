#!/usr/bin/env node
/**
 * Verify rằng tập Token_Name sau nâng cấp ⊇ baseline.
 * Ad-hoc, sẽ xóa sau khi task 8.1 xong.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, ""); }

function parseNames(css) {
  const cleaned = stripComments(css);
  const names = new Set();
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    const sel = m[1].trim();
    if (sel.includes("@theme")) continue;
    const body = m[2];
    const declRe = /(--[\w-]+)\s*:/g;
    let d;
    while ((d = declRe.exec(body)) !== null) names.add(d[1]);
  }
  return names;
}

const css = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");
const names = parseNames(css);

const baseline = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "src/test/ux-ui-upgrade/__snapshots__/token-names.baseline.json"),
    "utf8",
  ),
);

const baselineNames = new Set(baseline.tokenNames);
const missing = [...baselineNames].filter((n) => !names.has(n));
const added = [...names].filter((n) => !baselineNames.has(n));

console.log(`Tokens hiện tại: ${names.size}`);
console.log(`Baseline:        ${baselineNames.size}`);
console.log("");
if (missing.length === 0) {
  console.log("✓ Superset OK — không có token baseline nào bị thiếu sau khi tinh chỉnh value.");
} else {
  console.log(`✗ ${missing.length} token baseline BỊ MẤT:`);
  for (const n of missing) console.log("   - " + n);
  process.exit(1);
}
if (added.length > 0) {
  console.log("");
  console.log(`(thông tin) ${added.length} token mới được thêm so với baseline (không vi phạm superset):`);
  for (const n of added) console.log("   + " + n);
}
