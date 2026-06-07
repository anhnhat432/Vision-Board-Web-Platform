#!/usr/bin/env node
/**
 * Ad-hoc contrast-checking script (task 8.1 — ux-ui-upgrade).
 *
 * Đọc src/styles/tokens.css, phân giải var() trong cả Light (:root) và Dark
 * (html.dark) thành literal cuối cùng, rồi tính WCAG 2.1 contrast cho các cặp
 * (foreground, effective background) trên core-flow. Effective bg được dựng
 * bằng alpha-compositing với overlay/ring trên surface/bg.
 *
 * Đây KHÔNG phải test thường — chỉ là script ad-hoc để tinh chỉnh
 * Token_Value. Có thể xóa sau khi task 8.1 hoàn tất.
 *
 * Chạy:  node scripts/check-token-contrast.mjs
 *
 * Lưu ý: phần đọc/parse CSS được lấy nguyên tắc từ
 * src/test/ux-ui-upgrade/token-parser.ts (kept lock-step) và rút gọn
 * cho Node thuần (không TypeScript).
 */

import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

// ─────────────────────────────────────────────────────────────
// 1. Parser: đọc tokens.css → Map<name, rawValue> theo mode
// ─────────────────────────────────────────────────────────────

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractBlocks(css) {
  const blocks = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    blocks.push({ selector: m[1].trim(), body: m[2] });
  }
  return blocks;
}

function parseDecls(body) {
  const decls = [];
  for (const chunk of body.split(";")) {
    const decl = chunk.trim();
    if (!decl) continue;
    const m = /^(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(decl);
    if (m) decls.push([m[1], m[2].replace(/\s+/g, " ").trim()]);
  }
  return decls;
}

function parseTokens(css, mode /* 'light' | 'dark' */) {
  const cleaned = stripComments(css);
  const set = new Map();
  for (const b of extractBlocks(cleaned)) {
    const sel = b.selector;
    const isTheme = sel.includes("@theme");
    const isDark = /html\.dark|\.dark\b/.test(sel);
    const isRoot = sel.includes(":root");
    if (isTheme) continue;
    if (isDark && mode !== "dark") continue;
    if (!isDark && !isRoot) continue;
    for (const [name, raw] of parseDecls(b.body)) set.set(name, raw);
  }
  return set;
}

const VAR_RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g;

function substVars(rawValue, set, stack = []) {
  return rawValue.replace(VAR_RE, (_match, refName, fallback) => {
    const fb = fallback != null ? fallback.trim() : "";
    if (stack.includes(refName)) return fb;
    const ref = set.get(refName);
    if (!ref) return fb;
    return substVars(ref, set, [...stack, refName]).trim();
  });
}

function resolveToken(name, set) {
  const raw = set.get(name);
  if (!raw) return "";
  return substVars(raw, set, [name]).replace(/\s+/g, " ").trim();
}

// ─────────────────────────────────────────────────────────────
// 2. Color utils — sRGB → linear, contrast, alpha-composite
// ─────────────────────────────────────────────────────────────

function parseColor(s) {
  s = s.trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (s === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (s === "black") return { r: 0, g: 0, b: 0, a: 1 };
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    const hex = m[1];
    let r, g, b, a = 1;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
      a = parseInt(hex.slice(6, 8), 16) / 255;
    } else {
      return null;
    }
    return { r, g, b, a };
  }
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) {
    const parts = m[1].split(",").map((x) => x.trim());
    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);
    const a = parts.length >= 4 ? parseFloat(parts[3]) : 1;
    return { r, g, b, a };
  }
  return null;
}

function srgbToLinear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relLum({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrast(fg, bg) {
  const L1 = relLum(fg);
  const L2 = relLum(bg);
  const [a, b] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}

// alpha-composite: front (with alpha) over back (assumed opaque)
function over(front, back) {
  const a = front.a;
  const r = Math.round(front.r * a + back.r * (1 - a));
  const g = Math.round(front.g * a + back.g * (1 - a));
  const b = Math.round(front.b * a + back.b * (1 - a));
  return { r, g, b, a: 1 };
}

function hex({ r, g, b }) {
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

// Trích màu chính từ shadow-like token (lấy rgba/hex đầu tiên).
function extractFirstColor(s) {
  let m = /(rgba?\([^)]+\))/i.exec(s);
  if (m) return parseColor(m[1]);
  m = /(#[0-9a-f]{3,8})\b/i.exec(s);
  if (m) return parseColor(m[1]);
  return null;
}

// ─────────────────────────────────────────────────────────────
// 3. Pairs to check trên core-flow
// ─────────────────────────────────────────────────────────────

/**
 * Mỗi pair: { label, fg, bg, type, threshold }
 *   - fg/bg là tên token (sẽ được resolve theo mode)
 *   - type: 'body' | 'large' | 'icon' | 'border' | 'placeholder' | 'focus'
 *   - threshold: 4.5 hoặc 3
 *   - alphaOver: nếu fg là rgba với alpha, composite trên bg trước khi tính
 */
const PAIRS = [
  // Body text
  { label: "ink → bg", fg: "--app-ink", bg: "--app-bg", type: "body", threshold: 4.5 },
  { label: "ink → surface", fg: "--app-ink", bg: "--app-surface", type: "body", threshold: 4.5 },
  { label: "ink → bg-subtle", fg: "--app-ink", bg: "--app-bg-subtle", type: "body", threshold: 4.5 },
  { label: "ink-soft → bg", fg: "--app-ink-soft", bg: "--app-bg", type: "body", threshold: 4.5 },
  { label: "ink-soft → surface", fg: "--app-ink-soft", bg: "--app-surface", type: "body", threshold: 4.5 },
  { label: "ink-soft → bg-subtle", fg: "--app-ink-soft", bg: "--app-bg-subtle", type: "body", threshold: 4.5 },
  { label: "ink-muted (placeholder) → surface", fg: "--app-ink-muted", bg: "--app-surface", type: "placeholder", threshold: 4.5 },
  { label: "ink-muted (placeholder) → bg", fg: "--app-ink-muted", bg: "--app-bg", type: "placeholder", threshold: 4.5 },
  { label: "ink-muted → bg-subtle", fg: "--app-ink-muted", bg: "--app-bg-subtle", type: "body", threshold: 4.5 },
  { label: "ink-link → surface", fg: "--app-ink-link", bg: "--app-surface", type: "body", threshold: 4.5 },
  { label: "ink-link → bg", fg: "--app-ink-link", bg: "--app-bg", type: "body", threshold: 4.5 },

  // On-accent / On-warm (button text)
  { label: "ink-on-accent → accent (btn primary)", fg: "--app-ink-on-accent", bg: "--app-accent", type: "body", threshold: 4.5 },
  { label: "ink-on-accent → accent-hover", fg: "--app-ink-on-accent", bg: "--app-accent-hover", type: "body", threshold: 4.5 },
  { label: "ink-on-accent → accent-active", fg: "--app-ink-on-accent", bg: "--app-accent-active", type: "body", threshold: 4.5 },
  { label: "ink-on-warm → warm (reflection btn)", fg: "--app-ink-on-warm", bg: "--app-warm", type: "body", threshold: 4.5 },
  { label: "ink-on-warm → warm-hover", fg: "--app-ink-on-warm", bg: "--app-warm-hover", type: "body", threshold: 4.5 },
  { label: "ink-on-warm → warm-active", fg: "--app-ink-on-warm", bg: "--app-warm-active", type: "body", threshold: 4.5 },

  // Tag accent
  { label: "tag-accent-text → tag-accent-bg", fg: "--tag-accent-text", bg: "--tag-accent-bg", type: "body", threshold: 4.5 },
  { label: "tag-neutral-text → tag-neutral-bg", fg: "--tag-neutral-text", bg: "--tag-neutral-bg", type: "body", threshold: 4.5 },

  // Reflection
  { label: "reflection-prompt-text → reflection-bg (large/serif)", fg: "--reflection-prompt-text", bg: "--reflection-bg", type: "large", threshold: 3 },
  { label: "reflection-prompt-text → reflection-accent-bg (large)", fg: "--reflection-prompt-text", bg: "--reflection-accent-bg", type: "large", threshold: 3 },
  { label: "reflection-tag-text → reflection-tag-bg", fg: "--reflection-tag-text", bg: "--reflection-tag-bg", type: "body", threshold: 4.5 },
  { label: "reflection-btn-text → reflection-btn-bg", fg: "--reflection-btn-text", bg: "--reflection-btn-bg", type: "body", threshold: 4.5 },

  // Status icons (3:1) and status text (4.5:1) — we treat as 4.5 to be safe for inline message text
  { label: "status-success → surface", fg: "--app-status-success", bg: "--app-surface", type: "icon", threshold: 4.5 },
  { label: "status-warning → surface", fg: "--app-status-warning", bg: "--app-surface", type: "icon", threshold: 4.5 },
  { label: "status-error → surface", fg: "--app-status-error", bg: "--app-surface", type: "icon", threshold: 4.5 },
  { label: "status-info → surface", fg: "--app-status-info", bg: "--app-surface", type: "icon", threshold: 4.5 },

  // Border / control affordance (3:1)
  { label: "input-border → input-bg", fg: "--input-border", bg: "--input-bg", type: "border", threshold: 3 },
  { label: "input-border-focus → input-bg", fg: "--input-border-focus", bg: "--input-bg", type: "border", threshold: 3 },
  { label: "input-border-error → input-bg", fg: "--input-border-error", bg: "--input-bg", type: "border", threshold: 3 },
  { label: "btn-outline-border → surface", fg: "--btn-outline-border", bg: "--app-surface", type: "border", threshold: 3 },
  { label: "btn-ghost-border → surface", fg: "--btn-ghost-border", bg: "--app-surface", type: "border", threshold: 3 },
  { label: "card-border → bg (decorative; soft target 1.5)", fg: "--card-border", bg: "--app-bg", type: "border-decor", threshold: 1.5 },
  { label: "reflection-border → reflection-bg (decorative; soft target 1.5)", fg: "--reflection-border", bg: "--reflection-bg", type: "border-decor", threshold: 1.5 },

  // Progress
  { label: "progress-fill → progress-track", fg: "--progress-fill", bg: "--progress-track", type: "border", threshold: 3 },

  // Focus rings (alpha → composite over bg / surface)
  { label: "focus-ring (composited over surface)", fg: "--app-focus-ring", bg: "--app-surface", type: "focus", threshold: 3 },
  { label: "focus-ring (composited over bg)", fg: "--app-focus-ring", bg: "--app-bg", type: "focus", threshold: 3 },
  { label: "focus-ring-warm (over reflection-bg)", fg: "--app-focus-ring-warm", bg: "--reflection-bg", type: "focus", threshold: 3 },
  { label: "focus-ring-warm (over bg)", fg: "--app-focus-ring-warm", bg: "--app-bg", type: "focus", threshold: 3 },
];

function evalPair(p, set) {
  const fgRaw = resolveToken(p.fg, set);
  const bgRaw = resolveToken(p.bg, set);
  let fg = parseColor(fgRaw) ?? extractFirstColor(fgRaw);
  let bg = parseColor(bgRaw) ?? extractFirstColor(bgRaw);
  if (!fg || !bg) {
    return { ok: false, ratio: 0, fgRaw, bgRaw, note: "parse-fail" };
  }
  // Composite alpha-fg over opaque bg (overlays/rings/translucent inks)
  let visibleFg = fg;
  if (fg.a !== undefined && fg.a < 1) {
    visibleFg = over(fg, bg);
  }
  const ratio = contrast(visibleFg, bg);
  return {
    ok: ratio >= p.threshold,
    ratio,
    fg: hex(visibleFg),
    bg: hex(bg),
    fgRaw,
    bgRaw,
  };
}

function runMode(mode, css) {
  const set = parseTokens(css, mode);
  const rows = PAIRS.map((p) => ({ p, r: evalPair(p, set) }));
  return rows;
}

function fmtRow({ p, r }) {
  const tag = r.ok ? "✓" : "✗";
  const ratio = r.ratio.toFixed(2).padStart(5);
  const fg = (r.fg || "?").padEnd(8);
  const bg = (r.bg || "?").padEnd(8);
  const lbl = p.label.padEnd(50);
  return ` ${tag}  ${ratio}:1   ${fg} on ${bg}   thr=${p.threshold}   ${lbl}`;
}

function main() {
  const css = readFileSync(resolvePath(process.cwd(), "src/styles/tokens.css"), "utf8");
  for (const mode of ["light", "dark"]) {
    console.log("");
    console.log("════════════════════════════════════════════════════════════");
    console.log(`  Mode: ${mode.toUpperCase()}`);
    console.log("════════════════════════════════════════════════════════════");
    const rows = runMode(mode, css);
    const fails = [];
    for (const row of rows) {
      console.log(fmtRow(row));
      if (!row.r.ok && row.p.type !== "border-decor") fails.push(row);
    }
    console.log("");
    if (fails.length === 0) {
      console.log(`  ✓ All ${rows.length} pairs pass thresholds in ${mode}.`);
    } else {
      console.log(`  ✗ ${fails.length} / ${rows.length} pairs FAIL in ${mode}:`);
      for (const f of fails) {
        console.log(`     - ${f.p.label}: ${f.r.ratio.toFixed(2)}:1 < ${f.p.threshold}:1`);
      }
    }
  }
}

main();
