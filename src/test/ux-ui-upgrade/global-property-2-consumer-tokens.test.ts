// Feature: global-ui-upgrade, Property 2
/**
 * Property-Based Test — Property 2: Tầng tiêu thụ chỉ dùng token, không literal
 * giá trị dùng chung (task 5.3).
 *
 * "For any file thuộc tầng tiêu thụ (`src/app/components/**`, `src/app/pages/**`)
 *  và các khối style component, không tồn tại literal giá trị thị giác dùng
 *  chung TRÙNG với một token đã định nghĩa — bao gồm: không tham chiếu
 *  Primitive_Token trực tiếp (`--green-*`, `--terra-*`, `--neutral-*`), không
 *  màu hex/rgb đơn-mode trùng token, không `font-size`/`line-height` trùng một
 *  bậc thang typography, không `px` radius trùng token radius, không
 *  `box-shadow` literal trùng token elevation, và không `duration`/`easing`
 *  literal trùng token motion; mọi giá trị dùng chung phải tham chiếu
 *  Semantic_Token hoặc Component_Token."
 *
 * Validates: Requirements 2.2, 2.4, 3.4, 4.4, 5.1, 6.4, 8.1, 8.4
 *
 * ── Cách tiếp cận & lý do (đọc kỹ trước khi sửa) ─────────────────────────────
 *
 * Test này encode **bất biến ĐÚNG**: một literal ở tầng tiêu thụ chỉ bị coi là
 * vi phạm khi nó **trùng đúng giá trị của một Design_Token đã định nghĩa**
 * (tức "duplicating a defined token"). Ta KHÔNG chặn mọi hex/px bất kỳ — màu
 * trang trí một-lần không khớp token nào (illustration SVG, sticker, palette
 * confetti) KHÔNG thuộc phạm vi Property 2 (drift thương hiệu là việc của
 * Property 3). Nhờ vậy mọi lần fail đều chỉ ra một literal đáng-lẽ-phải-dùng
 * token — có ý nghĩa, không phải nhiễu.
 *
 * Catalog token được **parse trực tiếp** từ `src/styles/tokens.css` +
 * `src/styles/theme.css` (light + dark) → luôn đồng bộ khi token đổi giá trị.
 *
 * Vì task 5.1 (components) / 5.2 (pages) dọn literal → token, NHƯNG tài liệu
 * task ghi nhận vài nhóm ngoại lệ **cố ý / categorical / trang trí** vẫn giữ
 * literal khớp token:
 *   (a) Palette phân loại lĩnh vực (life-area accents): `--color-*-accent`
 *       trùng các hex như `#2563eb` (career), `#7c5cfc` (education),
 *       `#16a34a` (health)… được dùng làm màu phân biệt lĩnh vực trong
 *       Onboarding / LifeInsight / LifeAtlasWheel — KHÔNG phải accent
 *       hành động/thương hiệu.
 *   (b) Palette confetti/ăn mừng trang trí (SMARTGoalSetup ConfettiCanvas /
 *       CompletionBridge) có vài màu tình cờ trùng `--green-600`/dark
 *       `--app-accent` nhưng là màu lễ hội một-lần, ngoài phạm vi tokenise.
 *
 * → Dùng **ALLOWLIST tường minh** (`KNOWN_INTENTIONAL_TOKEN_LITERALS`) — cùng
 *   pattern stale-entry-hygiene như `global-property-3-no-drift.test.ts`. Test
 *   PASS cho các ngoại lệ đã biết, nhưng FAIL khi có literal-trùng-token MỚI
 *   ngoài allowlist — guard có ý nghĩa, KHÔNG suppress im lặng: in ra file +
 *   dòng + literal + token trùng.
 *
 * Ngữ cảnh trang trí (SVG/canvas): literal nằm ở thuộc tính trình bày SVG
 * (`fill=`, `stroke=`, `stopColor`, `stop-color`) hoặc canvas
 * (`fillStyle`/`strokeStyle`) được coi là illustration art (không tokenise
 * được qua CSS var) và bị loại khỏi phạm vi màu — nhất quán với triết lý
 * "decorative literals" của các task 5.x.
 *
 * ── Reuse ────────────────────────────────────────────────────────────────────
 * - Tái dùng `DEFAULT_REPO_ROOT` từ `token-scan.ts`.
 * - Theo pattern static-scan + signature allowlist + stale-entry hygiene của
 *   `global-property-3-no-drift.test.ts`.
 *
 * Tính chất: pure test — KHÔNG render DOM, KHÔNG import React/product code. Chỉ
 * đọc file nguồn ở module scope. fast-check + Vitest, `numRuns: 100`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_ROOT } from "./token-scan";

const PROPERTY_TAG =
  "Feature: global-ui-upgrade, Property 2: Tầng tiêu thụ chỉ dùng token, không literal giá trị dùng chung";

// ─────────────────────────────────────────────────────────────
// Phạm vi quét tầng tiêu thụ
// ─────────────────────────────────────────────────────────────

const CONSUMER_ROOTS: readonly string[] = ["src/app/components", "src/app/pages"];
const SCANNABLE_EXTENSIONS = new Set([".ts", ".tsx"]);

function isTestLikeFile(filePath: string): boolean {
  return /\.(test|spec|stories|pbt)\.[jt]sx?$/.test(filePath) || /[/\\]__tests__[/\\]/.test(filePath);
}

function isScannableFile(filePath: string): boolean {
  return SCANNABLE_EXTENSIONS.has(path.extname(filePath)) && !isTestLikeFile(filePath);
}

function collectFilesFromDir(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules") continue;
    const full = path.join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) out.push(...collectFilesFromDir(full));
    else if (isScannableFile(full)) out.push(full);
  }
  return out;
}

function resolveConsumerFiles(repoRoot: string = DEFAULT_REPO_ROOT): string[] {
  const files = new Set<string>();
  for (const rel of CONSUMER_ROOTS) {
    const abs = path.resolve(repoRoot, rel);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) for (const f of collectFilesFromDir(abs)) files.add(f);
    else if (isScannableFile(abs)) files.add(abs);
  }
  return [...files].sort();
}

// ─────────────────────────────────────────────────────────────
// Chuẩn hoá giá trị
// ─────────────────────────────────────────────────────────────

/** Chuẩn hoá hex → `#rrggbb` (bỏ alpha 8-digit, mở rộng 3-digit), lowercase. */
function normalizeHex(hex: string): string {
  let h = hex.trim().toLowerCase().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join(""); // #rgba → #rrggbb
  if (h.length === 8) h = h.slice(0, 6); // #rrggbbaa → #rrggbb
  return `#${h}`;
}

/** Chuẩn hoá rgb/rgba → `rgb:r,g,b` hoặc `rgba:r,g,b,a` (giữ alpha để chính xác). */
function normalizeRgb(value: string): string | null {
  const m = /^(rgba?)\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value.trim());
  if (!m) return null;
  const [, , r, g, b, a] = m;
  const ri = Math.round(Number(r));
  const gi = Math.round(Number(g));
  const bi = Math.round(Number(b));
  if (a === undefined || Number(a) === 1) return `rgb:${ri},${gi},${bi}`;
  return `rgba:${ri},${gi},${bi},${Number(a)}`;
}

/** Chuẩn hoá 1 chuỗi màu (hex hoặc rgb) → khoá canonical, hoặc null nếu không phải màu thuần. */
function normalizeColor(value: string): string | null {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return normalizeHex(v);
  if (/^rgba?\(/i.test(v)) return normalizeRgb(v);
  return null;
}

/** Màu quá phổ quát để coi là "token dùng chung" → loại khỏi catalog. */
const GENERIC_COLORS = new Set(["#ffffff", "#000000", "rgb:255,255,255", "rgb:0,0,0"]);

function collapseWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function normalizeLength(value: string): string {
  return value.trim().toLowerCase();
}

// ─────────────────────────────────────────────────────────────
// Parse token catalog từ tokens.css + theme.css
// ─────────────────────────────────────────────────────────────

interface TokenCatalog {
  /** color key → tên token đại diện. */
  color: Map<string, string>;
  /** shadow value (collapsed ws) → tên token. */
  shadow: Map<string, string>;
  /** duration value (vd "150ms") → tên token. */
  duration: Map<string, string>;
  /** ease value (cubic-bezier, no-space) → tên token. */
  ease: Map<string, string>;
  /** radius px/rem value → tên token. */
  radius: Map<string, string>;
  /** typography size (rem/px) → tên token. */
  typeSize: Map<string, string>;
  /** line-height value → tên token. */
  lineHeight: Map<string, string>;
}

function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Rút mọi khai báo `--name: value;` (value có thể nhiều dòng). */
function extractDeclarations(css: string): Array<[string, string]> {
  const cleaned = stripCssComments(css);
  const out: Array<[string, string]> = [];
  const re = /(--[\w-]+)\s*:\s*([^;{}]+);/g;
  let m: RegExpExecArray | null = re.exec(cleaned);
  while (m !== null) {
    out.push([m[1], collapseWs(m[2])]);
    m = re.exec(cleaned);
  }
  return out;
}

function isLiteralColor(value: string): boolean {
  const v = value.trim();
  if (/var\(/i.test(v)) return false;
  if (/\dpx/i.test(v)) return false; // loại shadow/length
  return /^#[0-9a-fA-F]{3,8}$/.test(v) || /^(rgb|rgba|hsl|hsla)\([^)]*\)$/i.test(v);
}

function buildCatalog(repoRoot: string = DEFAULT_REPO_ROOT): TokenCatalog {
  const files = ["src/styles/tokens.css", "src/styles/theme.css"];
  const catalog: TokenCatalog = {
    color: new Map(),
    shadow: new Map(),
    duration: new Map(),
    ease: new Map(),
    radius: new Map(),
    typeSize: new Map(),
    lineHeight: new Map(),
  };

  for (const rel of files) {
    let content: string;
    try {
      content = readFileSync(path.resolve(repoRoot, rel), "utf8");
    } catch {
      continue;
    }
    for (const [name, rawValue] of extractDeclarations(content)) {
      const value = rawValue.trim();

      // Colors — literal thuần (hex/rgb), bỏ var/shadow.
      // Loại life-area accent palette (`--color-*-accent`): đây là palette phân
      // loại lĩnh vực (categorical), dùng làm giá trị cụ thể (SVG/canvas wedge,
      // icon lĩnh vực), KHÔNG phải "shared semantic/component value" mà Property 2
      // nhắm tới — xem ghi chú ngoại lệ (a) ở đầu file.
      if (isLiteralColor(value) && !/^--color-[a-z-]+-accent$/.test(name)) {
        const key = normalizeColor(value);
        if (key && !GENERIC_COLORS.has(key) && !catalog.color.has(key)) {
          catalog.color.set(key, name);
        }
      }

      // Motion durations.
      if (/^--duration-/.test(name) && /^[\d.]+m?s$/.test(value)) {
        if (!catalog.duration.has(value)) catalog.duration.set(value, name);
      }

      // Motion easing (cubic-bezier).
      if (/^--ease-/.test(name) && /cubic-bezier/i.test(value)) {
        const key = value.replace(/\s+/g, "");
        if (!catalog.ease.has(key)) catalog.ease.set(key, name);
      }

      // Elevation / shadow — có offset px + màu.
      if (/shadow/.test(name) && !/var\(/.test(value) && /\dpx/i.test(value) && /(rgba?\(|#[0-9a-fA-F]|color-mix)/i.test(value)) {
        const key = collapseWs(value);
        if (!catalog.shadow.has(key)) catalog.shadow.set(key, name);
      }

      // Radius — CHỈ token bo góc app-facing (`--app-radius-*`), có utility
      // Tailwind tương ứng (`rounded-card`/`-control`/`-input`/…). Không tính
      // token radius nội bộ shadcn (`--r-tile`, `--radius`) vì không expose
      // utility sạch → tránh flag literal chỉ "tình cờ" trùng giá trị nội bộ.
      if (/^--app-radius-/.test(name) && /^[\d.]+(px|rem)$/.test(value)) {
        const key = normalizeLength(value);
        if (!catalog.radius.has(key)) catalog.radius.set(key, name);
      }

      // Typography size + line-height.
      if (/^--text-/.test(name)) {
        if (name.endsWith("--line-height")) {
          if (/^[\d.]+$/.test(value) && !catalog.lineHeight.has(value)) catalog.lineHeight.set(value, name);
        } else if (/^[\d.]+(px|rem)$/.test(value)) {
          const key = normalizeLength(value);
          if (!catalog.typeSize.has(key)) catalog.typeSize.set(key, name);
        }
      }
    }
  }

  return catalog;
}

const CATALOG = buildCatalog();

// ─────────────────────────────────────────────────────────────
// Quét literal ở tầng tiêu thụ
// ─────────────────────────────────────────────────────────────

type ViolationKind = "primitive-ref" | "color" | "radius" | "typography" | "duration" | "easing" | "shadow";

interface LiteralViolation {
  relativePath: string;
  line: number;
  kind: ViolationKind;
  /** literal khớp được trong source. */
  matched: string;
  /** tên token bị trùng (để chỉ ra thay thế đúng). */
  token: string;
  /** khoá chuẩn hoá của giá trị (dùng cho signature allowlist). */
  normalizedKey: string;
}

/** Chữ ký allowlist: `relativePath :: kind:normalizedKey`. */
function violationSignature(v: LiteralViolation): string {
  return `${v.relativePath} :: ${v.kind}:${v.normalizedKey}`;
}

/** Ngữ cảnh trang trí SVG/canvas → literal màu không tính (illustration art). */
function isDecorativeColorContext(prefixText: string): boolean {
  return /(fill|stroke|stop-?color|fillStyle|strokeStyle)\s*[=:]\s*[("'`{]*\s*$/i.test(prefixText);
}

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const RGB_RE = /rgba?\([^)]*\)/gi;
const TW_ARBITRARY_RE = /\b([a-z][a-z-]*)-\[([^\]]+)\]/g;
const MS_RE = /\b\d+(?:\.\d+)?ms\b/g;
const CUBIC_RE = /cubic-bezier\([^)]*\)/gi;
const PRIMITIVE_REF_RE = /var\(\s*(--(?:green|terra|neutral|status)-[a-z0-9-]+)/gi;

interface RawViolation {
  line: number;
  kind: ViolationKind;
  matched: string;
  token: string;
  normalizedKey: string;
}

function scanConsumerContent(rawContent: string): RawViolation[] {
  // Strip block comments giữ newline để số dòng đúng.
  const content = rawContent.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const lines = content.split(/\r\n|\r|\n/);
  const out: RawViolation[] = [];

  lines.forEach((lineText, index) => {
    const lineNo = index + 1;

    // 1) Primitive_Token tham chiếu trực tiếp.
    PRIMITIVE_REF_RE.lastIndex = 0;
    let pm: RegExpExecArray | null = PRIMITIVE_REF_RE.exec(lineText);
    while (pm !== null) {
      out.push({ line: lineNo, kind: "primitive-ref", matched: pm[1], token: pm[1], normalizedKey: pm[1] });
      pm = PRIMITIVE_REF_RE.exec(lineText);
    }

    // 2) Màu hex/rgb trùng token (bỏ ngữ cảnh trang trí SVG/canvas).
    for (const re of [HEX_RE, RGB_RE]) {
      re.lastIndex = 0;
      let cm: RegExpExecArray | null = re.exec(lineText);
      while (cm !== null) {
        const matched = cm[0];
        const before = lineText.slice(0, cm.index);
        if (!isDecorativeColorContext(before)) {
          const key = normalizeColor(matched);
          if (key && CATALOG.color.has(key)) {
            out.push({ line: lineNo, kind: "color", matched, token: CATALOG.color.get(key) as string, normalizedKey: key });
          }
        }
        if (cm.index === re.lastIndex) re.lastIndex += 1;
        cm = re.exec(lineText);
      }
    }

    // 3) Tailwind arbitrary values → radius / typography.
    TW_ARBITRARY_RE.lastIndex = 0;
    let am: RegExpExecArray | null = TW_ARBITRARY_RE.exec(lineText);
    while (am !== null) {
      const prefix = am[1];
      const inner = am[2].trim();
      if (/rounded/.test(prefix)) {
        const key = normalizeLength(inner);
        if (CATALOG.radius.has(key)) {
          out.push({ line: lineNo, kind: "radius", matched: am[0], token: CATALOG.radius.get(key) as string, normalizedKey: key });
        }
      } else if (prefix === "text") {
        const key = normalizeLength(inner);
        if (CATALOG.typeSize.has(key)) {
          out.push({ line: lineNo, kind: "typography", matched: am[0], token: CATALOG.typeSize.get(key) as string, normalizedKey: `size:${key}` });
        }
      } else if (prefix === "leading") {
        if (CATALOG.lineHeight.has(inner)) {
          out.push({ line: lineNo, kind: "typography", matched: am[0], token: CATALOG.lineHeight.get(inner) as string, normalizedKey: `lh:${inner}` });
        }
      } else if (prefix === "shadow") {
        const key = collapseWs(inner);
        if (CATALOG.shadow.has(key)) {
          out.push({ line: lineNo, kind: "shadow", matched: am[0], token: CATALOG.shadow.get(key) as string, normalizedKey: key });
        }
      }
      am = TW_ARBITRARY_RE.exec(lineText);
    }

    // 4) Inline style radius / typography.
    const inlineRe = /(borderRadius|border-radius|fontSize|font-size|lineHeight|line-height)\s*[:=]\s*["'`]?\s*([\d.]+(?:px|rem)?)/g;
    let im: RegExpExecArray | null = inlineRe.exec(lineText);
    while (im !== null) {
      const prop = im[1].toLowerCase();
      const val = im[2].trim();
      if (prop.startsWith("border")) {
        const key = normalizeLength(val);
        if (CATALOG.radius.has(key)) {
          out.push({ line: lineNo, kind: "radius", matched: `${im[1]}: ${val}`, token: CATALOG.radius.get(key) as string, normalizedKey: key });
        }
      } else if (prop.startsWith("font")) {
        const key = normalizeLength(val);
        if (CATALOG.typeSize.has(key)) {
          out.push({ line: lineNo, kind: "typography", matched: `${im[1]}: ${val}`, token: CATALOG.typeSize.get(key) as string, normalizedKey: `size:${key}` });
        }
      } else {
        // line-height
        if (CATALOG.lineHeight.has(val)) {
          out.push({ line: lineNo, kind: "typography", matched: `${im[1]}: ${val}`, token: CATALOG.lineHeight.get(val) as string, normalizedKey: `lh:${val}` });
        }
      }
      im = inlineRe.exec(lineText);
    }

    // 5) Duration literal (Nms) trùng token motion (bao gồm arbitrary + inline).
    MS_RE.lastIndex = 0;
    let dm: RegExpExecArray | null = MS_RE.exec(lineText);
    while (dm !== null) {
      const val = dm[0].toLowerCase();
      if (CATALOG.duration.has(val)) {
        out.push({ line: lineNo, kind: "duration", matched: dm[0], token: CATALOG.duration.get(val) as string, normalizedKey: val });
      }
      dm = MS_RE.exec(lineText);
    }

    // 6) Easing cubic-bezier trùng token motion.
    CUBIC_RE.lastIndex = 0;
    let em: RegExpExecArray | null = CUBIC_RE.exec(lineText);
    while (em !== null) {
      const key = em[0].replace(/\s+/g, "").toLowerCase();
      if (CATALOG.ease.has(key)) {
        out.push({ line: lineNo, kind: "easing", matched: em[0], token: CATALOG.ease.get(key) as string, normalizedKey: key });
      }
      em = CUBIC_RE.exec(lineText);
    }
  });

  return out;
}

function scanConsumerFile(filePath: string, repoRoot: string = DEFAULT_REPO_ROOT): LiteralViolation[] {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
  const raws = scanConsumerContent(readFileSync(filePath, "utf8"));
  return raws.map((r) => ({ relativePath, ...r }));
}

function formatViolation(v: LiteralViolation): string {
  return `${v.relativePath}:${v.line} [${v.kind}] "${v.matched}" ≡ ${v.token}`;
}

// ─────────────────────────────────────────────────────────────
// ALLOWLIST — ngoại lệ cố ý / categorical / trang trí (documented)
// ─────────────────────────────────────────────────────────────

/**
 * Chữ ký `relativePath :: kind:normalizedKey`.
 * (a) Life-area accent palette (categorical, không phải accent thương hiệu).
 * (b) Palette confetti/ăn mừng trang trí một-lần.
 * Bổ sung/xoá entry ở đây khi dọn xong vùng tương ứng; hygiene-check bên dưới
 * bắt entry đã "chết".
 */
const KNOWN_INTENTIONAL_TOKEN_LITERALS: readonly string[] = [
  // --- (b) Palette confetti/ăn mừng trang trí một-lần (SMARTGoalSetup) ---
  // Vài màu lễ hội tình cờ trùng --green-600 / --app-accent; là màu vẽ canvas
  // trang trí (không tokenise qua CSS var được), giữ có chủ đích.
  "src/app/pages/SMARTGoalSetup/components/ConfettiCanvas.tsx :: color:#3a7261", // ≡ --green-600
  "src/app/pages/SMARTGoalSetup/components/ConfettiCanvas.tsx :: color:#5ba590", // ≡ --app-accent (dark)
  "src/app/pages/SMARTGoalSetup/components/CompletionBridge.tsx :: color:#3a7261", // ≡ --green-600
  "src/app/pages/SMARTGoalSetup/components/CompletionBridge.tsx :: color:#5ba590", // ≡ --app-accent (dark)

  // --- (b) Palette confetti canvas-confetti (fireCelebration) ---
  // ACCENT_PALETTE/WARM_PALETTE truyền thẳng vào canvas-confetti dưới dạng
  // chuỗi JS; là màu hạt lễ hội trang trí một-lần, không thể tham chiếu CSS
  // var(). Vài màu tình cờ trùng token nhưng ngoài phạm vi tokenise (Prop 2).
  "src/app/components/celebration/fireCelebration.ts :: color:#5ba590", // ≡ --app-accent (dark)
  "src/app/components/celebration/fireCelebration.ts :: color:#e8f0ec", // ≡ --green-100
  "src/app/components/celebration/fireCelebration.ts :: color:#e89878", // ≡ --app-warm (dark)
  "src/app/components/celebration/fireCelebration.ts :: color:#fcede5", // ≡ --terra-100

  // --- (c') Palette icon prompt trang trí (ReflectionJournal) ---
  // 3 cặp tông icon (green/warm/gold) tạo biến thể trực quan cho các thẻ prompt.
  // Cặp green tình cờ trùng --app-accent-subtle/--app-ink-link (--app-accent),
  // nhưng đây là màu icon trang trí categorical — KHÔNG được tokenise sang
  // app-accent-* vì Reflection context cấm token accent (Property 3 zoning).
  "src/app/pages/ReflectionJournal.tsx :: color:#edf7e0", // ≡ --app-accent-subtle
  "src/app/pages/ReflectionJournal.tsx :: color:#0c5e3a", // ≡ --app-ink-link / --app-accent

  // --- (c) Palette hạt lấp lánh trang trí (Onboarding FloatingSparkles) ---
  // Mảng `colors` là particle art (translucent) gán vào inline
  // backgroundColor/boxShadow của motion.div; một màu tình cờ trùng
  // --app-accent-soft (dark) nhưng là màu trang trí một-lần, giữ literal.
  "src/app/pages/Onboarding/components/FloatingSparkles.tsx :: color:rgba:91,165,144,0.16", // ≡ --app-accent-soft (dark)

  // --- (d) Chrome nền tối cố định (fixed dark chrome, KHÔNG đổi theo theme) ---
  // Những bề mặt dưới đây cố ý giữ nền/nhấn tối trong CẢ light & dark mode
  // (rail điều hướng, callout tối, backdrop modal). Nếu thay bằng token semantic
  // (--app-ink/--app-ink-link) chúng sẽ "lật" sang giá trị sáng ở dark mode →
  // phá vỡ thiết kế. Không có token bất biến theo mode khớp các giá trị này nên
  // giữ literal có chủ đích (giá trị thị giác phải giữ nguyên).
  "src/app/components/root-layout/AppSidebar.tsx :: color:#17150f", // nền rail + ring-offset + chữ avatar (dark rail cố định)
  "src/app/components/root-layout/AppSidebar.tsx :: color:#0c5e3a", // nền badge logo "D" (dark rail cố định)
  "src/app/components/visionBoard/VisionBoardSidebar.tsx :: color:#17150f", // callout "Gợi ý bố cục" nền tối cố định
  "src/app/components/visionBoard/VisionBoardStoryWizard.tsx :: color:#17150f", // overlay backdrop modal tối cố định
];

const ALLOWLIST_SET = new Set(KNOWN_INTENTIONAL_TOKEN_LITERALS);

// ─────────────────────────────────────────────────────────────
// Module-scope data
// ─────────────────────────────────────────────────────────────

const SCANNED_FILES: readonly string[] = resolveConsumerFiles();
const SCANNED_RELATIVE: readonly string[] = SCANNED_FILES.map((f) =>
  path.relative(DEFAULT_REPO_ROOT, f).split(path.sep).join("/"),
);

const VIOLATIONS_BY_FILE = new Map<string, LiteralViolation[]>();
const ALL_VIOLATIONS: LiteralViolation[] = [];
for (const filePath of SCANNED_FILES) {
  const vs = scanConsumerFile(filePath);
  const rel = path.relative(DEFAULT_REPO_ROOT, filePath).split(path.sep).join("/");
  VIOLATIONS_BY_FILE.set(rel, vs);
  ALL_VIOLATIONS.push(...vs);
}

function unexpectedForFile(relativePath: string): LiteralViolation[] {
  const vs = VIOLATIONS_BY_FILE.get(relativePath) ?? [];
  return vs.filter((v) => !ALLOWLIST_SET.has(violationSignature(v)));
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe("Property 2 — Tầng tiêu thụ chỉ dùng token (task 5.3)", () => {
  it("catalog token parse được từ tokens.css + theme.css (không no-op)", () => {
    expect(CATALOG.color.size).toBeGreaterThan(0);
    expect(CATALOG.duration.size).toBeGreaterThan(0);
    expect(CATALOG.typeSize.size).toBeGreaterThan(0);
    expect(CATALOG.radius.size).toBeGreaterThan(0);
    // Vài giá trị neo để chắc chắn catalog khớp thực tế. `#0c5e3a` là giá trị
    // dùng chung bởi cả --app-accent và --app-ink-link → catalog giữ token
    // xuất hiện trước (--app-ink-link); chỉ cần chắc là một app-token hợp lệ.
    expect(CATALOG.color.get("#0c5e3a")?.startsWith("--app-")).toBe(true);
    expect(CATALOG.color.get("#faf8f3")).toBe("--app-bg-subtle");
    expect(CATALOG.duration.get("150ms")).toBe("--duration-instant");
    // Life-area accent palette KHÔNG nằm trong catalog màu (ngoại lệ categorical).
    expect(CATALOG.color.has("#2563eb")).toBe(false);
    // Radius chỉ gồm app-facing token, không gồm --r-tile (14px).
    expect(CATALOG.radius.has("14px")).toBe(false);
    expect(CATALOG.radius.get("18px")).toBe("--app-radius-card");
  });

  it("scanner đọc được cây tầng tiêu thụ và phân biệt màu trang trí (self-check)", () => {
    expect(SCANNED_FILES.length).toBeGreaterThan(0);
    // Màu trùng token trong className arbitrary → bắt (token đại diện là một app-token).
    const hit = scanConsumerContent('<div className="bg-[#0C5E3A]" />');
    expect(hit.some((v) => v.kind === "color" && v.token.startsWith("--app-"))).toBe(true);
    // Cùng màu nhưng ở thuộc tính SVG fill → KHÔNG tính (decorative).
    const svg = scanConsumerContent('<path fill="#0C5E3A" />');
    expect(svg.some((v) => v.kind === "color")).toBe(false);
    // Màu decorative không khớp token nào → KHÔNG tính (thuộc Property 3).
    const deco = scanConsumerContent('const c = "#f472b6";');
    expect(deco.length).toBe(0);
    // Primitive ref trực tiếp → bắt.
    const prim = scanConsumerContent("color: var(--green-700);");
    expect(prim.some((v) => v.kind === "primitive-ref")).toBe(true);
  });

  it("allowlist không chứa entry đã 'chết' (hygiene — giữ tối giản)", () => {
    const seen = new Set(ALL_VIOLATIONS.map(violationSignature));
    const stale = [...ALLOWLIST_SET].filter((sig) => !seen.has(sig));
    expect(
      stale,
      stale.length === 0
        ? ""
        : "Allowlist có entry không còn khớp vi phạm nào. Xoá khỏi " +
            `KNOWN_INTENTIONAL_TOKEN_LITERALS để giữ tối giản:\n${stale.join("\n")}`,
    ).toEqual([]);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...SCANNED_RELATIVE), (relativePath) => {
        const unexpected = unexpectedForFile(relativePath);
        if (unexpected.length > 0) {
          throw new Error(
            `Literal giá trị dùng chung TRÙNG token tại "${relativePath}":\n` +
              unexpected.map(formatViolation).join("\n") +
              "\n→ Thay literal bằng Semantic/Component token tương ứng (Req 2.2/2.4/3.4/4.4/5.1/6.4/8.1/8.4), " +
              "hoặc nếu là ngoại lệ categorical/decorative hợp lệ thì thêm signature vào KNOWN_INTENTIONAL_TOKEN_LITERALS.",
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it("liệt kê đầy đủ vi phạm literal-vs-token (deterministic enumeration)", () => {
    const unexpected = ALL_VIOLATIONS.filter((v) => !ALLOWLIST_SET.has(violationSignature(v)));
    expect(
      unexpected,
      unexpected.length === 0
        ? ""
        : `Phát hiện ${unexpected.length} literal trùng token ở tầng tiêu thụ:\n${unexpected.map(formatViolation).join("\n")}`,
    ).toEqual([]);
  });
});
